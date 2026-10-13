/**
 * Effort tranchant (EN 1992-1-1 §6.2) : VRd,c sans armatures d'effort tranchant, VRd,max (bielles) et VRd,s
 * (étriers, treillis de Mörsch), armatures minimales et espacement maximal (§9.2.2). Unités : N, mm, MPa.
 */
import type { Materiaux } from './materiaux';
import { GAMMA_C } from './materiaux';

/** VRd,c (éq. 6.2a/6.2b, σcp = 0) avec AsL la section tendue ancrée au droit de la section. */
export function vrdc(bw: number, d: number, fck: number, AsL: number): number {
  const k = Math.min(1 + Math.sqrt(200 / d), 2);
  const rho = Math.min(Math.max(AsL, 0) / (bw * d), 0.02);
  const vmin = 0.035 * Math.pow(k, 1.5) * Math.sqrt(fck);
  return Math.max((0.18 / GAMMA_C) * k * Math.pow(100 * rho * fck, 1 / 3), vmin) * bw * d;
}

/** VRd,max (éq. 6.9), αcw = 1, z = 0,9·d, ν1 = 0,6·(1 − fck/250). */
export function vrdMax(bw: number, d: number, m: Materiaux, cotTheta: number): number {
  const z = 0.9 * d;
  const v1 = 0.6 * (1 - m.fck / 250);
  return bw * z * v1 * m.fcd / (cotTheta + 1 / cotTheta);
}

export interface Etriers {
  bielleOk: boolean;
  /** Asw/s requis par le calcul, avant minimum (mm²/mm). */
  AswSCalc: number; AswSMin: number; AswS: number;
  /** Section d'un cadre (mm²) : nBrins × π·Φ²/4. */
  Asw: number;
  /** Espacement théorique, maximal (0,75·d) et retenu (arrondi inférieur au cm, 50 à 300 mm). */
  sTheorique: number; sMax: number; s: number;
  VRds: number; VRd: number;
  minimum: boolean;
}

export function etriers(VEd: number, bw: number, d: number, m: Materiaux, phi: number, nBrins: number, cotTheta: number): Etriers {
  const z = 0.9 * d;
  const Asw = nBrins * Math.PI * phi * phi / 4;
  const VRdmax = vrdMax(bw, d, m, cotTheta);
  const AswSCalc = VEd / (z * m.fyd * cotTheta);
  const AswSMin = 0.08 * Math.sqrt(m.fck) / m.fyk * bw;
  const AswS = Math.max(AswSCalc, AswSMin);
  const sTheorique = Asw / AswS;
  const sMax = Math.min(0.75 * d, 300);
  let s = Math.floor(Math.min(sTheorique, sMax) / 10) * 10;
  s = Math.min(300, Math.max(50, s));
  const VRds = Asw / s * z * m.fyd * cotTheta;
  return {
    bielleOk: VEd <= VRdmax, AswSCalc, AswSMin, AswS, Asw, sTheorique, sMax, s,
    VRds, VRd: Math.min(VRds, VRdmax), minimum: AswSCalc < AswSMin,
  };
}
