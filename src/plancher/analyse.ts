/**
 * Sollicitations de la poutrelle : isostatique (M0, V0) ou continue par coefficients forfaitaires.
 * Coefficients forfaitaires (hypothèse de l'outil, statut I de la matrice normative) :
 *   moment en travée 0,8·M0 ; moment sur appui intermédiaire 0,5·M0 (≥ 3 travées) ou 0,6·M0 (2 travées) ;
 *   effort tranchant à l'appui intermédiaire 1,1·V0 (≥ 3 travées) ou 1,15·V0 (2 travées).
 * Domaine d'application (méthode forfaitaire) : Q ≤ max(2·G ; 5 kN/m²), travées voisines de portées comparables, inertie constante.
 * Unités : N, mm, N·mm.
 */
import type { PlancherInput } from './types';
import type { Charges } from './charges';

export interface Analyse {
  L: number;
  coef: { travee: number; appui: number; tranchant: number };
  M0: number; M0car: number; M0qp: number; V0: number;
  /** Moments de calcul (N·mm). */
  Mt: number; Ma: number; Ved: number;
  /** Moments ELS (N·mm) : combinaison caractéristique et quasi-permanente. */
  MtCar: number; MaCar: number; MtQp: number; MaQp: number;
  /** Domaine d'application des coefficients forfaitaires respecté ? (poutrelle continue uniquement) */
  forfaitaireApplicable: boolean;
  limiteQ: number; Qsurf: number; Gsurf: number;
}

export function analyse(e: PlancherInput, ch: Charges): Analyse {
  const L = e.portee * 1000;
  const cont = e.appui === 'continu';
  const coef = cont
    ? { travee: 0.8, appui: e.nbTravees === 2 ? 0.6 : 0.5, tranchant: e.nbTravees === 2 ? 1.15 : 1.1 }
    : { travee: 1, appui: 0, tranchant: 1 };
  const M0 = ch.pELU * L * L / 8, M0car = ch.pELS * L * L / 8, M0qp = ch.pQP * L * L / 8, V0 = ch.pELU * L / 2;
  const Gsurf = ch.G0 + ch.Gp, Qsurf = ch.qk;
  const limiteQ = Math.max(2 * Gsurf, 5);
  return {
    L, coef, M0, M0car, M0qp, V0,
    Mt: coef.travee * M0, Ma: coef.appui * M0, Ved: coef.tranchant * V0,
    MtCar: coef.travee * M0car, MaCar: coef.appui * M0car, MtQp: coef.travee * M0qp, MaQp: coef.appui * M0qp,
    forfaitaireApplicable: !cont || Qsurf <= limiteQ + 1e-9,
    limiteQ, Qsurf, Gsurf,
  };
}

/** Courbes de principe M(x) et V(x) (enveloppe forfaitaire, ancrée sur les valeurs de calcul) en kN·m et kN. */
export function courbes(e: PlancherInput, a: Analyse, n = 50) {
  const L = a.L;
  const cont = e.appui === 'continu';
  const M: number[] = [], V: number[] = [], X: number[] = [];
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * L;
    const p = (4 * x * (L - x)) / (L * L);
    M.push((cont ? -a.Ma + (a.Mt + a.Ma) * p : a.Mt * p) / 1e6);
    V.push((a.Ved * (1 - (2 * x) / L)) / 1e3);
    X.push(x / 1000);
  }
  return { X, M, V };
}
