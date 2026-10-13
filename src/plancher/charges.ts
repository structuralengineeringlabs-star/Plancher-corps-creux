/**
 * Descente de charges d'une poutrelle (largeur tributaire = entraxe).
 * G0 = poids de la dalle + de la nervure + des entrevous (EN 1991-1-1, béton armé 25 kN/m³).
 * Les charges linéiques sont en kN/m (= N/mm).
 */
import type { PlancherInput } from './types';
import { categorie } from './materiaux';

export const POIDS_VOLUMIQUE_BA = 25; // kN/m³
/** Estimation du poids des entrevous : 0,6 kN/m² pour 160 mm, proportionnelle à la hauteur (hypothèse, à remplacer par la fiche du fabricant). */
export const POIDS_ENTREVOUS_REF = { hauteur: 160, poids: 0.6 };

export interface Charges {
  qk: number; psi2: number; categorieLibelle: string;
  poidsEntrevous: number; poidsEntrevousAuto: boolean;
  /** Poids propre (dalle + nervure + entrevous) en kN/m² de plancher. */
  G0: number;
  /** Charges permanentes rapportées en kN/m². */
  Gp: number;
  g: number; q: number;
  pELU: number; pELS: number; pQP: number;
}

export function poidsEntrevousAuto(hCorps: number): number {
  return POIDS_ENTREVOUS_REF.poids / POIDS_ENTREVOUS_REF.hauteur * hCorps;
}

export function charges(e: PlancherInput): Charges {
  const cat = categorie(e.categorie, e.annexe);
  const qk = cat.qk === null ? e.qkPerso : cat.qk;
  const psi2 = cat.qk === null ? e.psi2Perso : cat.psi2;
  const b = e.entraxe, bw = e.bw / 1000, hf = e.hf / 1000, hw = e.hCorps / 1000;
  const auto = !(e.poidsEntrevous > 0);
  const pEnt = auto ? poidsEntrevousAuto(e.hCorps) : e.poidsEntrevous;
  const G0 = hf * POIDS_VOLUMIQUE_BA + (bw * hw * POIDS_VOLUMIQUE_BA) / b + (pEnt * (b - bw)) / b;
  const Gp = e.chape + e.revetement + e.fauxPlafond + e.cloisons;
  const g = (G0 + Gp) * b, q = qk * b;
  return {
    qk, psi2, categorieLibelle: cat.libelle, poidsEntrevous: pEnt, poidsEntrevousAuto: auto,
    G0, Gp, g, q, pELU: 1.35 * g + 1.5 * q, pELS: g + q, pQP: g + psi2 * q,
  };
}
