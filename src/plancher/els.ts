/**
 * États limites de service (EN 1992-1-1 §7) : contraintes en section fissurée, maîtrise de la fissuration sans calcul
 * (tableau 7.2N) et flèche par la méthode simplifiée de l'élancement limite L/d (§7.4.2, éq. 7.16). Unités : N, mm, MPa.
 */
import { ES } from './materiaux';

/** Coefficient d'équivalence acier/béton retenu pour les contraintes en section fissurée (usage courant, αe = 15). */
export const ALPHA_E = 15;

export interface ContraintesFissurees { y: number; Icr: number; sigmaC: number; sigmaS: number; axeDansTable: boolean }

/**
 * Section en T fissurée (acier tendu en fibre inférieure) : axe neutre à y de la fibre comprimée.
 * Si y ≤ hf l'axe est dans la table (section rectangulaire de largeur beff) ; sinon la nervure comprimée est prise en compte.
 */
export function contraintesFissureesT(M: number, beff: number, bw: number, hf: number, d: number, As: number, ae = ALPHA_E): ContraintesFissurees {
  if (!(M > 0) || !(As > 0)) return { y: 0, Icr: 0, sigmaC: 0, sigmaS: 0, axeDansTable: true };
  let y = (-ae * As + Math.sqrt((ae * As) ** 2 + 2 * beff * ae * As * d)) / beff;
  let axeDansTable = true;
  let Icr: number;
  if (y <= hf) {
    Icr = beff * y ** 3 / 3 + ae * As * (d - y) ** 2;
  } else {
    axeDansTable = false;
    const a = bw / 2, b = (beff - bw) * hf + ae * As, c = -((beff - bw) * hf * hf / 2 + ae * As * d);
    y = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    Icr = beff * y ** 3 / 3 - (beff - bw) * (y - hf) ** 3 / 3 + ae * As * (d - y) ** 2;
  }
  return { y, Icr, sigmaC: M * y / Icr, sigmaS: ae * M * (d - y) / Icr, axeDansTable };
}

/** Section rectangulaire fissurée b × d (appui : nervure comprimée en fibre inférieure). */
export function contraintesFissureesRect(M: number, b: number, d: number, As: number, ae = ALPHA_E): ContraintesFissurees {
  if (!(M > 0) || !(As > 0)) return { y: 0, Icr: 0, sigmaC: 0, sigmaS: 0, axeDansTable: true };
  const y = (-ae * As + Math.sqrt((ae * As) ** 2 + 2 * b * ae * As * d)) / b;
  const Icr = b * y ** 3 / 3 + ae * As * (d - y) ** 2;
  return { y, Icr, sigmaC: M * y / Icr, sigmaS: ae * M * (d - y) / Icr, axeDansTable: true };
}

/** Tableau 7.2N : diamètre maximal Φ*s (mm) des barres selon la contrainte σs (MPa) et wmax (0,4 ; 0,3 ; 0,2 mm). */
const TAB_72N: [number, number, number, number][] = [
  [160, 40, 32, 25], [200, 32, 25, 16], [240, 20, 16, 12], [280, 16, 12, 8],
  [320, 12, 10, 6], [360, 10, 8, 5], [400, 8, 6, 4], [450, 6, 5, 0],
];
export function phiMaxFissuration(sigmaS: number, wlim: number): number {
  const col = wlim >= 0.4 - 1e-9 ? 1 : wlim >= 0.3 - 1e-9 ? 2 : 3;
  if (sigmaS <= TAB_72N[0][0]) return TAB_72N[0][col];
  for (let i = 1; i < TAB_72N.length; i++) {
    const [s0, ...v0] = TAB_72N[i - 1], [s1, ...v1] = TAB_72N[i];
    if (sigmaS <= s1) return v0[col - 1] + (v1[col - 1] - v0[col - 1]) * (sigmaS - s0) / (s1 - s0);
  }
  return 0;
}

export interface Fleche {
  Ld: number; LdLimite: number; K: number; rho: number; rho0: number;
  /** Facteur des sections en T (tableau 7.4N, note 2) : 1,0 pour beff/bw ≤ 1 ; 0,8 pour beff/bw ≥ 3 ; interpolation entre. */
  F1: number;
  facteurAcier: number; facteurPortee: number; ok: boolean;
}

/** F1 des sections à table : interpolation linéaire entre beff/bw = 1 (1,0) et beff/bw = 3 (0,8). */
export const facteurTable = (beff: number, bw: number) => Math.min(1, Math.max(0.8, 1 - 0.2 * (beff / bw - 1) / 2));

/**
 * Élancement limite (éq. 7.16a/b, A's = 0) : l/d = K·[11 + 1,5·√fck·ρ0/ρ + 3,2·√fck·(ρ0/ρ − 1)^1,5] si ρ ≤ ρ0,
 * K·[11 + 1,5·√fck·ρ0/ρ] sinon, avec ρ0 = √fck·10⁻³ et ρ = As,req / aireBeton.
 * aireBeton : beff·d si l'axe neutre ELU est dans la table ; beff·hf + bw·(d − hf) sinon (aire de béton au-dessus du centre des aciers tendus).
 * K = 1,0 (poutrelle isostatique) ou 1,3 (travée de rive d'une poutrelle continue). F1 : section en T (tableau 7.4N, note 2).
 * Majoration pour l'acier fourni : (500/fyk)·As,prov/As,req ≤ 1,5 (§7.4.2(2)) ; réduction 7/L pour L > 7 m (§7.4.2(2)).
 */
export function flecheLd(p: { L: number; d: number; fck: number; fyk: number; AsReq: number; AsProv: number; aireBeton: number; F1: number; continu: boolean }): Fleche {
  const { L, d, fck, fyk, AsReq, AsProv, aireBeton, F1, continu } = p;
  const K = continu ? 1.3 : 1.0;
  const rho0 = Math.sqrt(fck) * 1e-3;
  if (!Number.isFinite(AsReq) || !(AsReq > 0)) {
    // section insuffisante en flexion : l'élancement limite n'a pas de sens
    return { Ld: L / d, LdLimite: 0, K, rho: Infinity, rho0, F1, facteurAcier: 1, facteurPortee: 1, ok: false };
  }
  const rho = AsReq / aireBeton;
  const sq = Math.sqrt(fck);
  const base = rho <= rho0
    ? K * (11 + 1.5 * sq * (rho0 / rho) + 3.2 * sq * Math.pow(rho0 / rho - 1, 1.5))
    : K * (11 + 1.5 * sq * (rho0 / rho));
  const facteurAcier = Math.min((500 / fyk) * AsProv / AsReq, 1.5);
  const facteurPortee = L > 7000 ? 7000 / L : 1;
  const LdLimite = base * F1 * Math.max(facteurAcier, 1) * facteurPortee;
  const Ld = L / d;
  return { Ld, LdLimite, K, rho, rho0, F1, facteurAcier, facteurPortee, ok: Ld <= LdLimite };
}

export { ES };
