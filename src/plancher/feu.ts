/**
 * Résistance au feu de la nervure d'une poutrelle par valeurs tabulées (NF EN 1992-1-2 §5.6).
 * La nervure est assimilée à une poutre exposée sur trois faces : tableau 5.5 (appuis simples) ou 5.6 (continue).
 * Un seul lit d'armatures de travée : distance à l'axe a = cnom + Φétrier + Φ/2, mesurée au parement inférieur ;
 * les barres d'angle sont à la même distance du parement latéral (l'étrier triangulaire a sa base à cnom du nu).
 * Non couvert : protection apportée par les entrevous, tableaux des dalles nervurées (§5.7), critères E et I.
 */
import { DUREES_FEU, verifierFeuPoutre, type VerifFeu } from '../eurocodes/feu';
import type { PlancherInput } from './types';

export { DUREES_FEU };

export interface ResultatFeu extends VerifFeu {
  /** Distance a (mm) entre l'axe des barres de travée et le parement exposé. */
  a: number;
  /** Enrobage nominal minimal qui satisfait le tableau pour les diamètres retenus (mm), null si la largeur est insuffisante. */
  cnomRequis: number | null;
}

export function resistanceFeu(e: PlancherInput, cNom: number): ResultatFeu | null {
  if (!e.feu) return null;
  const a = cNom + e.phiEtrier + e.phiTravee / 2;
  const v = verifierFeuPoutre(e.resistanceFeu, e.appui === 'continu', e.bw, a, a, true);
  const aEff = v.aCoinRequis ?? v.aRequis;
  const cnomRequis = aEff === null ? null : Math.max(0, Math.ceil(aEff - e.phiEtrier - e.phiTravee / 2));
  return { ...v, a, cnomRequis };
}
