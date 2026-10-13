#!/usr/bin/env python3
"""
Modèle de référence indépendant du moteur TypeScript « plancher à corps creux » (audit, lot 1).

- Flexion : l'équilibre de la section en T (diagramme rectangulaire, EN 1992-1-1 §3.1.7) est résolu par dichotomie sur la
  hauteur comprimée x, sans les formules fermées en μ du moteur.
- Section fissurée : la position de l'axe neutre est obtenue par dichotomie sur l'équilibre des moments statiques, les
  inerties et contraintes par intégration numérique en tranches horizontales.
- Flèche : la courbure κ(x) est calculée section par section (ζ, section homogène intégrée par tranches), puis la flèche
  s'obtient par DOUBLE intégration numérique w'' = κ avec conditions w(0) = w(L) = 0 — indépendante du théorème de la charge
  unité utilisé par le moteur.

Usage : python3 scripts/reference/plancher_reference.py  (affiche les valeurs de référence au format JSON)
"""
import json, math

ES = 200000.0

# ---------------------------------------------------------------------------------------------------- béton / flexion
def tranches_T(beff, bw, hf, h, n=4000):
    """Largeur de la section par tranche horizontale (profondeur depuis la fibre supérieure)."""
    dy = h / n
    return [(((k + 0.5) * dy), (beff if (k + 0.5) * dy <= hf else bw), dy) for k in range(n)]

def compression_T(a, f, beff, bw, hf, d):
    """Compression C et moment M/acier d'un bloc de hauteur a (table en beff, âme en bw)."""
    if a <= hf:
        return beff * a * f, beff * a * f * (d - a / 2)
    C1 = beff * hf * f
    C2 = bw * (a - hf) * f
    return C1 + C2, C1 * (d - hf / 2) + C2 * (d - hf - (a - hf) / 2)

def dichotomie(g, lo, hi, n=200):
    for _ in range(n):
        mid = (lo + hi) / 2
        if g(mid) > 0: hi = mid
        else: lo = mid
    return (lo + hi) / 2

def as_requis_T(MEd, beff, bw, hf, d, fcd, fyd, lam=0.8):
    """As tel que le moment des forces internes égale MEd (dichotomie sur a = λx)."""
    g = lambda a: compression_T(a, fcd, beff, bw, hf, d)[1] - MEd
    a = dichotomie(g, 0.0, d)
    C = compression_T(a, fcd, beff, bw, hf, d)[0]
    return C / fyd, a / lam / d

def mrd_T(As, beff, bw, hf, d, fcd, fyd, lam=0.8):
    F = As * fyd
    g = lambda a: compression_T(a, fcd, beff, bw, hf, d)[0] - F
    a = dichotomie(g, 0.0, d)
    return compression_T(a, fcd, beff, bw, hf, d)[1], a / lam / d

# ------------------------------------------------------------------------------------------------------ section fissurée
def fissuree_T(M, beff, bw, hf, h, d, As, ae=15.0, n=4000):
    """Axe neutre y par dichotomie (moment statique nul), puis σc, σs par intégration en tranches."""
    def stat(y):
        s = 0.0
        dy = y / n
        for k in range(n):
            z = (k + 0.5) * dy
            s += (beff if z <= hf else bw) * dy * (y - z) * (1.0)  # moment statique du béton comprimé / axe neutre
        return s - ae * As * (d - y)
    y = dichotomie(stat, 1e-6, h)
    dy = y / n
    Icr = 0.0
    for k in range(n):
        z = (k + 0.5) * dy
        Icr += (beff if z <= hf else bw) * dy * (y - z) ** 2
    Icr += ae * As * (d - y) ** 2
    return y, Icr, M * y / Icr, ae * M * (d - y) / Icr

def fissuree_rect(M, b, d, As, ae=15.0):
    y = dichotomie(lambda y: b * y * y / 2 - ae * As * (d - y), 1e-6, d)
    Icr = b * y**3 / 3 + ae * As * (d - y) ** 2
    return y, Icr, M * y / Icr, ae * M * (d - y) / Icr

# ----------------------------------------------------------------------------------------------------- flèche (double int.)
def section_homogene(beff, bw, hf, h, aE, aciers, n=4000):
    tr = tranches_T(beff, bw, hf, h, n)
    A = sum(w * dy for _, w, dy in tr) + sum((aE - 1) * a for a, _ in aciers)
    S = sum(w * dy * y for y, w, dy in tr) + sum((aE - 1) * a * y for a, y in aciers)
    yc = S / A
    I = sum(w * dy * ((y - yc) ** 2 + dy * dy / 12) for y, w, dy in tr) + sum((aE - 1) * a * (y - yc) ** 2 for a, y in aciers)
    return A, yc, I

def courbure(M, beff, bw, hf, h, As, d, fctm, EcEff, epsCs, beta=0.5):
    if M == 0:
        return 0.0
    aE = ES / EcEff
    pos = M > 0
    yA = d if pos else h - d
    A, yc, I = section_homogene(beff, bw, hf, h, aE, [(As, yA)])
    Mcr = fctm * I / ((h - yc) if pos else yc)
    Ma = abs(M)
    zeta = 1 - beta * (Mcr / Ma) ** 2 if Ma > Mcr else 0.0
    sgn = 1 if pos else -1
    kI = sgn * Ma / (EcEff * I) + epsCs * aE * As * (yA - yc) / I
    if zeta == 0:
        return kI
    if pos:
        y, Icr, _, _ = fissuree_T(1.0, beff, bw, hf, h, d, As, aE)
    else:
        y, Icr, _, _ = fissuree_rect(1.0, bw, d, As, aE)
    kII = sgn * (Ma / (EcEff * Icr) + epsCs * aE * As * (d - y) / Icr)
    return zeta * kII + (1 - zeta) * kI

def fleche_double_integration(L, M_of_x, kappa_of_M, n=800):
    """w'' = κ(x) intégrée deux fois (trapèzes), w(0) = 0, puis correction linéaire pour w(L) = 0 ; flèche positive vers le bas."""
    xs = [L * i / n for i in range(n + 1)]
    k = [kappa_of_M(M_of_x(x)) for x in xs]
    dx = L / n
    th = [0.0]
    for i in range(n):
        th.append(th[-1] + (k[i] + k[i + 1]) / 2 * dx)
    w = [0.0]
    for i in range(n):
        w.append(w[-1] + (th[i] + th[i + 1]) / 2 * dx)
    c = w[-1] / L
    w = [wi - c * x for wi, x in zip(w, xs)]
    # κ > 0 (fibre inférieure tendue) correspond à une flèche vers le bas ; w'' = −κ avec axe z vers le haut -> |max|
    return max(abs(v) for v in w)

def plancher_defaut():
    """Plancher par défaut : poutrelle continue 3 travées, L = 4,0 m, C25/30, B500, 20+4 cm, 2HA12 / 2HA10 (travée de rive)."""
    fck, fyk = 25.0, 500.0
    fcd, fyd = fck / 1.5, fyk / 1.15
    fctm = 0.3 * fck ** (2 / 3)
    Ecm = 22000 * ((fck + 8) / 10) ** 0.3
    return fck, fyk, fcd, fyd, fctm, Ecm

def main():
    fck, fyk, fcd, fyd, fctm, Ecm = plancher_defaut()
    r = {}
    # Flexion T : section par défaut (beff 600, bw 120, hf 40, d = 240 − 25 − 6 − 6 = 203)
    d = 240 - 25 - 6 - 6
    beff, bw, hf, h = 600.0, 120.0, 40.0, 240.0
    r['F2_AsT'] = as_requis_T(10.008e6, beff, bw, hf, d, fcd, fyd)[0]
    r['F3_AsT_nervure'], r['F3_xi'] = as_requis_T(60e6, 600.0, 120.0, 40.0, 159.0, fcd, fyd)
    r['F4_MRd'], r['F4_xi'] = mrd_T(2 * math.pi * 36, beff, bw, hf, d, fcd, fyd)
    r['F5_MRd_nervure'], _ = mrd_T(8 * math.pi * 36, 600.0, 120.0, 40.0, 159.0, fcd, fyd)
    # Rectangle (appui) : bw 120, d = 240 − 25 − 6 − 5 = 204
    dA = 240 - 25 - 6 - 5
    r['F6_AsA'] = as_requis_T(6.255e6, 120.0, 120.0, 40.0, dA, fcd, fyd)[0]
    # Section fissurée en T (Mser = 8,0 kN·m, 2HA12)
    y, Icr, sc, ss = fissuree_T(8.0e6, beff, bw, hf, h, d, 2 * math.pi * 36)
    r['E1_y'], r['E1_Icr'], r['E1_sigc'], r['E1_sigs'] = y, Icr, sc, ss
    # Section fissurée en T, axe dans la nervure (As forte, Mser = 12 kN·m, 4HA16, d = 159)
    y, Icr, sc, ss = fissuree_T(12e6, 600.0, 120.0, 40.0, 200.0, 159.0, 4 * math.pi * 64)
    r['E2_y'], r['E2_sigc'], r['E2_sigs'] = y, sc, ss
    # Section fissurée rectangulaire (appui, Mser = 4,5 kN·m, 2HA10)
    y, Icr, sc, ss = fissuree_rect(4.5e6, 120.0, dA, 2 * math.pi * 25)
    r['E3_y'], r['E3_sigc'], r['E3_sigs'] = y, sc, ss
    # Flèche : isostatique L = 4 m, p_qp = g + ψ2·q = 3,3 + 0,3·1,2 = 3,66 N/mm, φ = 2,0, εcs = 3,5e-4, fluage Ec,eff = Ecm/(1+φ)
    L = 4000.0
    phi, eps = 2.0, 3.5e-4
    M0 = 3.66 * L * L / 8
    EcEff = Ecm / (1 + phi)
    AsT = 2 * math.pi * 36
    kap = lambda M: courbure(M, beff, bw, hf, h, AsT, d, fctm, EcEff, eps)
    r['W1_fleche_iso'] = fleche_double_integration(L, lambda x: M0 * 4 * x * (L - x) / L**2, kap)
    # Flèche instantanée sous charges permanentes, sans retrait
    M0g = 3.3 * L * L / 8
    kap0 = lambda M: courbure(M, beff, bw, hf, h, AsT, d, fctm, Ecm, 0.0)
    r['W2_fleche_inst'] = fleche_double_integration(L, lambda x: M0g * 4 * x * (L - x) / L**2, kap0)
    # Flèche, travée de rive continue (appui 0,5·M0, chapeaux 2HA10)
    AsA = 2 * math.pi * 25
    Ma = 0.5 * M0
    def kapC(M):
        if abs(M) < 1e-6: return 0.0
        if M > 0: return courbure(M, beff, bw, hf, h, AsT, d, fctm, EcEff, eps)
        return courbure(M, beff, bw, hf, h, AsA, dA, fctm, EcEff, eps)
    r['W3_fleche_continu'] = fleche_double_integration(L, lambda x: M0 * 4 * x * (L - x) / L**2 - Ma * x / L, kapC)
    print(json.dumps(r, indent=2, sort_keys=True))

if __name__ == '__main__':
    main()
