/**
 * Flèche calculée de la poutrelle (EN 1992-1-1 §7.4.3) : courbures en section non fissurée (I) et fissurée (II), interpolées par
 * le coefficient de répartition ζ = 1 − β·(Mcr/M)² (éq. 7.19), fluage par le module effectif Ec,eff = Ecm/(1 + φ) et retrait par la
 * courbure εcs·αe·S/I (éq. 7.21). La flèche s'obtient en intégrant la courbure le long de la travée (théorème de la charge unité).
 * Unités : N, mm, MPa, N·mm ; courbures en 1/mm ; flèche en mm, positive vers le bas.
 */
import { ES } from './materiaux';
import { contraintesFissureesRect, contraintesFissureesT } from './els';

export interface SectionNervuree { bw: number; h: number; beff: number; hf: number }
interface Acier { A: number; y: number } // y : profondeur depuis la fibre supérieure

/** Section non fissurée homogénéisée (béton + aciers (αe − 1)·A) : aire, centre de gravité depuis la fibre supérieure, inertie. */
export function sectionHomogene(s: SectionNervuree, aE: number, aciers: Acier[]) {
  const db = s.beff - s.bw;
  const sa = aciers.reduce((t, a) => t + (aE - 1) * a.A, 0);
  const A = s.bw * s.h + db * s.hf + sa;
  const yc = (s.bw * s.h ** 2 / 2 + db * s.hf ** 2 / 2 + aciers.reduce((t, a) => t + (aE - 1) * a.A * a.y, 0)) / A;
  const I = s.bw * s.h ** 3 / 12 + s.bw * s.h * (s.h / 2 - yc) ** 2 + db * s.hf ** 3 / 12 + db * s.hf * (yc - s.hf / 2) ** 2
    + aciers.reduce((t, a) => t + (aE - 1) * a.A * (a.y - yc) ** 2, 0);
  return { A, yc, I };
}

export interface Courbure { kappa: number; zeta: number; Mcr: number; kappaI: number; kappaII: number; fissuree: boolean }

/**
 * Courbure sous le moment M (N·mm, positif en flexion positive : fibre inférieure tendue).
 * Flexion positive : acier tendu As à la profondeur d (bas), table comprimée. Flexion négative : acier tendu As à h − d depuis la fibre
 * supérieure (chapeaux), nervure comprimée en partie basse.
 */
export function courbure(M: number, s: SectionNervuree, As: number, d: number, fctm: number, EcEff: number, epsCs: number, beta = 0.5): Courbure {
  if (M === 0 || !(As > 0)) return { kappa: 0, zeta: 0, Mcr: Infinity, kappaI: 0, kappaII: 0, fissuree: false };
  const aE = ES / EcEff;
  const pos = M > 0;
  const yAcier = pos ? d : s.h - d;
  const g = sectionHomogene(s, aE, [{ A: As, y: yAcier }]);
  const Mcr = fctm * g.I / (pos ? s.h - g.yc : g.yc);
  const Ma = Math.abs(M);
  const zeta = Ma > Mcr ? 1 - beta * (Mcr / Ma) ** 2 : 0;
  const sgn = pos ? 1 : -1;
  const S1 = As * (yAcier - g.yc);
  const kappaI = sgn * Ma / (EcEff * g.I) + epsCs * aE * S1 / g.I;
  let kappaII = 0;
  if (zeta > 0) {
    const c = pos ? contraintesFissureesT(1, s.beff, s.bw, s.hf, d, As, aE) : contraintesFissureesRect(1, s.bw, d, As, aE);
    kappaII = sgn * (Ma / (EcEff * c.Icr) + epsCs * aE * As * (d - c.y) / c.Icr);
  }
  return { kappa: zeta * kappaII + (1 - zeta) * kappaI, zeta, Mcr, kappaI, kappaII, fissuree: zeta > 0 };
}

/**
 * Flèche maximale d'une travée sur appuis fixes à partir de la distribution de courbure : w(xm) = ∫ κ(s)·m̄(s) ds,
 * m̄ moment de la travée isostatique sous une charge unité en xm.
 */
export function flecheMax(L: number, kappa: (x: number) => number, nDiv = 48): { fMax: number; xMax: number } {
  const xs = Array.from({ length: nDiv + 1 }, (_, k) => k * L / nDiv);
  const ks = xs.map(kappa);
  let fMax = -Infinity, xMax = L / 2;
  for (let m = 1; m < nDiv; m++) {
    const xm = xs[m];
    let w = 0;
    for (let k = 0; k < nDiv; k++) {
      const f = (sx: number, kap: number) => kap * (sx <= xm ? sx * (L - xm) / L : xm * (L - sx) / L);
      w += (f(xs[k], ks[k]) + f(xs[k + 1], ks[k + 1])) / 2 * (L / nDiv);
    }
    if (w > fMax) { fMax = w; xMax = xm; }
  }
  return { fMax, xMax };
}

export interface FlecheCalculee {
  phi: number; epsCs: number; EcEff: number; h0: number;
  /** Flèche à long terme sous combinaison quasi-permanente, fluage et retrait compris (mm). */
  delta: number;
  /** Flèche instantanée due au poids propre seul, avant pose des cloisons (mm). */
  deltaAvant: number;
  /** Flèche nuisible : part survenant après la pose des cloisons (mm). */
  deltaNuisible: number;
  limite: number; limiteNuisible: number;
  ok: boolean; okNuisible: boolean;
  /** Position de la flèche maximale (mm depuis l'appui de rive) et détail à mi-travée sous la combinaison quasi-permanente. */
  xMax: number; travee: Courbure; appui: Courbure | null;
}

/**
 * Flèche calculée d'une poutrelle. Poutrelle isostatique : M(x) = M0·4x(L − x)/L². Travée de rive d'une poutrelle continue :
 * M(x) = p·x(L − x)/2 − Ma·x/L, avec Ma = coefficient forfaitaire d'appui × M0 (moment de mi-travée M0 − Ma/2).
 */
export function flecheCalculee(p: {
  L: number; sec: SectionNervuree; AsT: number; dT: number; AsA: number; dA: number; continu: boolean; coefAppui: number;
  fck: number; fctm: number; Ecm: number; M0qp: number; M0g: number; RH: number; t0: number; limiteDiv: number; cloisons: boolean;
  phi: number; epsCs: number;
}): FlecheCalculee {
  const { L, sec, AsT, dT, AsA, dA, continu, coefAppui, fctm, Ecm, M0qp, M0g } = p;
  const EcEff = Ecm / (1 + p.phi);
  const calc = (M0: number, Ec: number, eps: number) => {
    const Ma = continu ? coefAppui * M0 : 0;
    const M = (x: number) => M0 * 4 * x * (L - x) / (L * L) - Ma * x / L;
    const kap = (x: number) => {
      const m = M(x);
      if (Math.abs(m) < 1e-6) return 0;
      return m > 0 ? courbure(m, sec, AsT, dT, fctm, Ec, eps).kappa : courbure(m, sec, AsA, dA, fctm, Ec, eps).kappa;
    };
    const { fMax, xMax } = flecheMax(L, kap);
    return {
      f: fMax, xMax,
      t: courbure(M0 - Ma / 2, sec, AsT, dT, fctm, Ec, eps),
      a: continu && Ma > 0 ? courbure(-Ma, sec, AsA, dA, fctm, Ec, eps) : null,
    };
  };
  const lt = calc(M0qp, EcEff, p.epsCs);
  const avant = calc(M0g, Ecm, 0);
  const delta = lt.f, deltaNuisible = lt.f - avant.f;
  const limite = L / p.limiteDiv, limiteNuisible = L / 500;
  return {
    phi: p.phi, epsCs: p.epsCs, EcEff, h0: sec.h, delta, deltaAvant: avant.f, deltaNuisible, limite, limiteNuisible,
    ok: delta <= limite, okNuisible: !p.cloisons || deltaNuisible <= limiteNuisible, xMax: lt.xMax, travee: lt.t, appui: lt.a,
  };
}
