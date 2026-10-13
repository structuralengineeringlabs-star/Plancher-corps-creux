/**
 * Nomenclature des aciers et métré d'une poutrelle (une travée) : repères, formes, longueurs développées, masses.
 * Désignations : HA (barres à haute adhérence), forme 00 = barre droite, 01 = barre à crochet (EN ISO 3766).
 */
import type { PlancherInput } from './types';
import { aire } from './flexion';

export const MASSE_VOLUMIQUE_ACIER = 7850; // kg/m³
export const masseLineique = (phi: number) => aire(1, phi) * 1e-6 * MASSE_VOLUMIQUE_ACIER; // kg/m

export interface Repere {
  rep: string; designation: string; forme: string;
  phi: number; nb: number; longueur: number; // m
  masse: number; // kg
}
export interface Nomenclature {
  reperes: Repere[];
  masseTotale: number;
  masseParPhi: { phi: number; masse: number }[];
  /** Masse d'acier par m² de plancher (kg/m²) et volume de béton (nervure + dalle) en m³ pour la travée. */
  ratioSurface: number;
  volumeBeton: number;
  etrier: { A: number; B: number; cote: number; crochet: number };
  nombreEtriers: number;
  longueurBarre: number; longueurChapeau: number; nbChapeaux: number;
}

/**
 * Étrier triangulaire fermé : base A = bw − 2c, hauteur B = h − 2c, deux côtés inclinés de √((A/2)² + B²),
 * crochet de fermeture à 135° et queue de 10Φ à chaque extrémité (EN ISO 4066 / NF A 35-027).
 */
export function geometrieEtrier(e: PlancherInput, cNom: number) {
  const A = Math.max(e.bw - 2 * cNom, 0);
  const B = Math.max(e.hf + e.hCorps - 2 * cNom, 0);
  const cote = Math.sqrt((A / 2) ** 2 + B ** 2);
  const crochet = 10 * e.phiEtrier;
  return { A, B, cote, crochet, developpee: A + 2 * cote + 2 * crochet };
}

export function nomenclature(e: PlancherInput, p: { cNom: number; lbdTravee: number; appuiCalcule: boolean; s: number }): Nomenclature {
  const L = e.portee * 1000;
  const et = geometrieEtrier(e, p.cNom);
  const longueurBarre = L + 2 * p.lbdTravee;
  // Chapeaux : poutrelle continue = 0,25·L de part et d'autre de l'appui (0,5·L par travée) ;
  // poutrelle isostatique = un chapeau de construction à chaque appui : L/5 + retombée + 0,1 m (crochet plongeant).
  const retombee = Math.max(e.hf + e.hCorps - p.cNom - e.phiAppui, 100);
  const longueurChapeau = p.appuiCalcule ? 0.5 * L : L / 5 + retombee + 100;
  const nbChapeaux = p.appuiCalcule ? e.nbAppui : 2 * e.nbAppui;
  const nombreEtriers = Math.floor(L / p.s) + 1;
  const reperes: Repere[] = [
    { rep: '1', designation: `HA${e.phiTravee} – aciers de travée`, forme: `00 – barre droite, ancrage lbd = ${Math.round(p.lbdTravee)} mm à chaque about`, phi: e.phiTravee, nb: e.nbTravee, longueur: longueurBarre / 1000, masse: 0 },
    { rep: '2', designation: `HA${e.phiAppui} – ${p.appuiCalcule ? 'chapeaux sur appui' : "chapeaux de construction (un par appui)"}`, forme: p.appuiCalcule ? '00 – barre droite, L/4 de part et d’autre de l’appui' : '01 – L avec crochet plongeant', phi: e.phiAppui, nb: nbChapeaux, longueur: longueurChapeau / 1000, masse: 0 },
    { rep: '3', designation: `HA${e.phiEtrier} – étriers triangulaires fermés (${e.nBrins} brins), e = ${p.s / 10} cm`, forme: 'étrier triangulaire : base A, côtés B/C, crochet de fermeture 135° / 10Φ', phi: e.phiEtrier, nb: nombreEtriers, longueur: et.developpee / 1000, masse: 0 },
  ];
  for (const r of reperes) r.masse = r.nb * r.longueur * masseLineique(r.phi);
  const phis = [...new Set(reperes.map(r => r.phi))].sort((a, b) => a - b);
  const masseParPhi = phis.map(phi => ({ phi, masse: reperes.filter(r => r.phi === phi).reduce((s, r) => s + r.masse, 0) }));
  const masseTotale = reperes.reduce((s, r) => s + r.masse, 0);
  const volumeBeton = ((e.entraxe * 1000 * e.hf + e.bw * e.hCorps) * L) / 1e9;
  return {
    reperes, masseTotale, masseParPhi, ratioSurface: masseTotale / (e.portee * e.entraxe), volumeBeton,
    etrier: { A: et.A, B: et.B, cote: et.cote, crochet: et.crochet }, nombreEtriers,
    longueurBarre, longueurChapeau, nbChapeaux,
  };
}
