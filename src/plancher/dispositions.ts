/**
 * Dispositions constructives : espacement des barres (§8.2), ancrage (§8.4), effort de traction à l'appui (§9.2.1.4).
 * Unités : N, mm, MPa.
 */
import { fbd, lbRqd } from '../eurocodes/ancrage';
import { GAMMA_C, GAMMA_S } from './materiaux';

/**
 * Longueur d'ancrage de calcul lbd d'une barre droite à pleine contrainte fyd (§8.4.4) : α1…α5 = 1 (hypothèse sécuritaire,
 * sans réduction pour crochet ni confinement), lb,min = max(0,3·lb,rqd ; 10Φ ; 100 mm).
 */
export function longueurAncrage(phi: number, fck: number, fyk: number, bonneAdherence: boolean): { lbRqd: number; lbMin: number; lbd: number } {
  const lb = lbRqd(phi, fyk / GAMMA_S, fbd(fck, GAMMA_C, phi, bonneAdherence));
  const lbMin = Math.max(0.3 * lb, 10 * phi, 100);
  return { lbRqd: lb, lbMin, lbd: Math.max(lb, lbMin) };
}

export interface Espacement {
  /** Largeur intérieure disponible entre les cadres (mm). */
  largeurUtile: number;
  /** Espacement libre entre barres (mm), null s'il n'y a qu'une barre. */
  sLibre: number | null;
  /** Minimum de §8.2(2) : max(Φ ; dg + 5 mm ; 20 mm). */
  sMin: number;
  ok: boolean;
}

/** Barres de travée disposées en un lit dans l'âme, à l'intérieur des cadres. */
export function espacementLibre(nb: number, phi: number, bw: number, cNom: number, phiEtrier: number, dg: number): Espacement {
  const largeurUtile = bw - 2 * (cNom + phiEtrier);
  const sMin = Math.max(phi, dg + 5, 20);
  const sLibre = nb > 1 ? (largeurUtile - nb * phi) / (nb - 1) : null;
  return { largeurUtile, sLibre, sMin, ok: largeurUtile >= phi && (sLibre === null || sLibre >= sMin - 1e-9) };
}

/** Effort de traction à ancrer à l'appui d'extrémité : FE = 0,5·VEd·cotθ (§9.2.1.4(2), aℓ = z·cotθ/2). */
export const effortTractionAppui = (VEd: number, cotTheta: number) => 0.5 * VEd * cotTheta;
