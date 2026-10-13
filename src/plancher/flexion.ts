/**
 * Flexion ELU (EN 1992-1-1 §6.1) d'une section en T (travée) ou rectangulaire (appui), diagramme rectangulaire
 * simplifié (§3.1.7(3)), sans armatures comprimées. Unités : N, mm, MPa, N·mm.
 */
import type { Materiaux } from './materiaux';

const aire = (nb: number, phi: number) => nb * Math.PI * phi * phi / 4;
export { aire };

/** Largeur participante de la table (§5.3.2.1) : beff = bw + Σ min(0,2·bi + 0,1·l0 ; 0,2·l0 ; bi). */
export function largeurParticipante(entraxeMm: number, bw: number, l0: number): number {
  const bi = (entraxeMm - bw) / 2;
  const beffi = Math.min(0.2 * bi + 0.1 * l0, 0.2 * l0, bi);
  return bw + 2 * Math.max(beffi, 0);
}

/** As,min de non-fragilité (éq. 9.1N) : max(0,26·fctm/fyk ; 0,0013)·bt·d. */
export const asMin = (bt: number, d: number, fctm: number, fyk: number) => Math.max(0.26 * fctm / fyk, 0.0013) * bt * d;
/** As,max = 0,04·Ac (§9.2.1.1(3)). */
export const asMax = (Ac: number) => 0.04 * Ac;

export interface ArmaturesRequises {
  /** Section théorique (mm²), nulle si MEd ≤ 0 ; Infinity si la section est insuffisante sans armatures comprimées. */
  As: number;
  /** Hauteur relative de la zone comprimée xu/d. */
  xi: number;
  insuffisante: boolean;
  mode: 'rectangle-beff' | 'T' | 'rectangle-bw' | 'nul';
}

/** Armatures tendues requises pour MEd (N·mm > 0) dans une section en T (beff, bw, hf) de hauteur utile d. */
export function armaturesRequisesT(MEd: number, beff: number, bw: number, hf: number, d: number, m: Materiaux): ArmaturesRequises {
  if (!(MEd > 0)) return { As: 0, xi: 0, insuffisante: false, mode: 'nul' };
  const f = m.eta * m.fcd;
  const Mtable = beff * hf * f * (d - hf / 2);
  if (MEd <= Mtable) {
    const mu = MEd / (beff * d * d * f);
    if (mu > m.muLim) return { As: Infinity, xi: NaN, insuffisante: true, mode: 'rectangle-beff' };
    const xi = (1 - Math.sqrt(1 - 2 * mu)) / m.lambda;
    return { As: MEd / (m.fyd * d * (1 - m.lambda * xi / 2)), xi, insuffisante: false, mode: 'rectangle-beff' };
  }
  const M1 = (beff - bw) * hf * f * (d - hf / 2);
  const M2 = MEd - M1;
  const muW = M2 / (bw * d * d * f);
  if (muW > m.muLim) return { As: Infinity, xi: NaN, insuffisante: true, mode: 'T' };
  const xi = (1 - Math.sqrt(1 - 2 * muW)) / m.lambda;
  const As = M1 / (m.fyd * (d - hf / 2)) + M2 / (m.fyd * d * (1 - m.lambda * xi / 2));
  return { As, xi, insuffisante: false, mode: 'T' };
}

/** Armatures tendues requises pour MEd dans une section rectangulaire b × d. */
export function armaturesRequisesRect(MEd: number, b: number, d: number, m: Materiaux): ArmaturesRequises {
  if (!(MEd > 0)) return { As: 0, xi: 0, insuffisante: false, mode: 'nul' };
  const mu = MEd / (b * d * d * m.eta * m.fcd);
  if (mu > m.muLim) return { As: Infinity, xi: NaN, insuffisante: true, mode: 'rectangle-bw' };
  const xi = (1 - Math.sqrt(1 - 2 * mu)) / m.lambda;
  return { As: MEd / (m.fyd * d * (1 - m.lambda * xi / 2)), xi, insuffisante: false, mode: 'rectangle-bw' };
}

export interface MomentResistant { MRd: number; xi: number; ductile: boolean }

/** Moment résistant d'une section en T avec As fournie (équilibre des efforts, acier supposé plastifié). */
export function momentResistantT(As: number, beff: number, bw: number, hf: number, d: number, m: Materiaux): MomentResistant {
  const f = m.eta * m.fcd;
  const Fs = As * m.fyd;
  let x = Fs / (m.lambda * f * beff);
  if (m.lambda * x <= hf) return { MRd: Fs * (d - m.lambda * x / 2), xi: x / d, ductile: x / d <= m.xiLim + 1e-9 };
  const Fail = (beff - bw) * hf * f;
  const Fw = Fs - Fail;
  x = Fw / (m.lambda * f * bw);
  return { MRd: Fail * (d - hf / 2) + Fw * (d - m.lambda * x / 2), xi: x / d, ductile: x / d <= m.xiLim + 1e-9 };
}

export function momentResistantRect(As: number, b: number, d: number, m: Materiaux): MomentResistant {
  const x = As * m.fyd / (m.lambda * m.eta * m.fcd * b);
  return { MRd: As * m.fyd * (d - m.lambda * x / 2), xi: x / d, ductile: x / d <= m.xiLim + 1e-9 };
}
