/**
 * Valeurs par défaut et contrôle des saisies. Une saisie invalide est signalée (verdict « non vérifié ») ;
 * le calcul se poursuit sur une valeur ramenée dans ses bornes afin que l'interface reste utilisable.
 */
import type { ErreurSaisie, PlancherInput } from './types';
import { CLASSES_BETON, EXPOSITIONS, CATEGORIES } from './materiaux';
import { DUREES_FEU } from './feu';

export const PAR_DEFAUT: PlancherInput = {
  appui: 'continu', nbTravees: 3, portee: 4.0, entraxe: 0.6, bw: 120, hCorps: 200, hf: 40,
  categorie: 'A', qkPerso: 2.0, psi2Perso: 0.3,
  chape: 1.2, revetement: 0.5, fauxPlafond: 0.2, cloisons: 1.0, poidsEntrevous: 0,
  fck: 25, fyk: 500, annexe: 'EC2', exposition: 'XC1', classeStructurale: 0, dureeVie100: false, controleProductionSpecial: false,
  deltaCdev: 10, enrobageMode: 'calcule', cnomSaisi: 25, dg: 16,
  RH: 70, t0: 28, flecheLimite: 250, cloisonsFragiles: true, feu: false, resistanceFeu: 60,
  nbTravee: 2, phiTravee: 12, nbAppui: 2, phiAppui: 10, phiEtrier: 6, nBrins: 2, cotTheta: 2.5,
};

interface Borne { champ: keyof PlancherInput; min: number; max: number; libelle: string; unite?: string }
const BORNES: Borne[] = [
  { champ: 'portee', min: 1, max: 12, libelle: 'Portée L', unite: 'm' },
  { champ: 'entraxe', min: 0.3, max: 1.2, libelle: 'Entraxe des poutrelles', unite: 'm' },
  { champ: 'bw', min: 50, max: 400, libelle: "Largeur de l'âme bw", unite: 'mm' },
  { champ: 'hCorps', min: 80, max: 500, libelle: 'Hauteur du corps creux', unite: 'mm' },
  { champ: 'hf', min: 30, max: 200, libelle: 'Dalle de compression hf', unite: 'mm' },
  { champ: 'qkPerso', min: 0, max: 50, libelle: 'qk', unite: 'kN/m²' },
  { champ: 'psi2Perso', min: 0, max: 1, libelle: 'ψ2' },
  { champ: 'chape', min: 0, max: 20, libelle: 'Chape', unite: 'kN/m²' },
  { champ: 'revetement', min: 0, max: 20, libelle: 'Revêtement', unite: 'kN/m²' },
  { champ: 'fauxPlafond', min: 0, max: 20, libelle: 'Faux plafond', unite: 'kN/m²' },
  { champ: 'cloisons', min: 0, max: 20, libelle: 'Cloisons', unite: 'kN/m²' },
  { champ: 'poidsEntrevous', min: 0, max: 5, libelle: 'Poids des entrevous', unite: 'kN/m²' },
  { champ: 'deltaCdev', min: 0, max: 20, libelle: 'Δcdev', unite: 'mm' },
  { champ: 'cnomSaisi', min: 10, max: 100, libelle: 'cnom', unite: 'mm' },
  { champ: 'dg', min: 8, max: 40, libelle: 'Granulat dg', unite: 'mm' },
  { champ: 'nbTravee', min: 1, max: 8, libelle: 'Nombre de barres de travée' },
  { champ: 'phiTravee', min: 6, max: 32, libelle: 'Φ barres de travée', unite: 'mm' },
  { champ: 'nbAppui', min: 1, max: 8, libelle: "Nombre de barres d'appui (chapeaux)" },
  { champ: 'phiAppui', min: 6, max: 32, libelle: "Φ chapeaux", unite: 'mm' },
  { champ: 'phiEtrier', min: 5, max: 12, libelle: 'Φ étriers', unite: 'mm' },
  { champ: 'cotTheta', min: 1, max: 2.5, libelle: 'cot θ' },
  { champ: 'RH', min: 20, max: 100, libelle: 'Humidité relative', unite: '%' },
  { champ: 't0', min: 1, max: 365, libelle: 'Âge au chargement t0', unite: 'j' },
  { champ: 'flecheLimite', min: 100, max: 1000, libelle: 'Limite de flèche L/…' },
];

const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const virgule = (n: number) => String(n).replace('.', ',');

/** Contrôle complet ; renvoie les erreurs et une copie de l'entrée ramenée dans les bornes. */
export function valider(p: PlancherInput): { erreurs: ErreurSaisie[]; entree: PlancherInput } {
  const erreurs: ErreurSaisie[] = [];
  const e: PlancherInput = { ...PAR_DEFAUT, ...p };
  for (const bo of BORNES) {
    const v = e[bo.champ] as unknown;
    if (!fin(v) || v < bo.min || v > bo.max) {
      erreurs.push({ champ: bo.champ, message: `${bo.libelle} : entre ${virgule(bo.min)} et ${virgule(bo.max)}${bo.unite ? ' ' + bo.unite : ''}.` });
      (e as unknown as Record<string, number>)[bo.champ] = fin(v) ? Math.min(bo.max, Math.max(bo.min, v)) : (PAR_DEFAUT[bo.champ] as number);
    }
  }
  e.nbTravee = Math.round(e.nbTravee); e.nbAppui = Math.round(e.nbAppui);
  e.nBrins = Math.round(e.nBrins);
  if (e.nBrins !== 2 && e.nBrins !== 4) { erreurs.push({ champ: 'nBrins', message: "Nombre de brins d'étrier : 2 ou 4." }); e.nBrins = 2; }
  if (e.appui !== 'simple' && e.appui !== 'continu') { erreurs.push({ champ: 'appui', message: 'Poutrelle isostatique ou continue.' }); e.appui = 'continu'; }
  if (e.nbTravees !== 2 && e.nbTravees !== 3) { erreurs.push({ champ: 'nbTravees', message: 'Continuité : 2 travées, ou 3 travées et plus.' }); e.nbTravees = 3; }
  if (!CLASSES_BETON.some(c => c.fck === e.fck)) { erreurs.push({ champ: 'fck', message: 'Classe de béton non prise en charge (C20/25 à C50/60).' }); e.fck = 25; }
  if (e.fyk !== 400 && e.fyk !== 500) { erreurs.push({ champ: 'fyk', message: 'Acier : B400 ou B500.' }); e.fyk = 500; }
  if (!EXPOSITIONS.includes(e.exposition)) { erreurs.push({ champ: 'exposition', message: "Classe d'exposition inconnue." }); e.exposition = 'XC1'; }
  if (!CATEGORIES.some(c => c.code === e.categorie)) { erreurs.push({ champ: 'categorie', message: "Catégorie d'usage inconnue." }); e.categorie = 'A'; }
  if (e.annexe !== 'EC2' && e.annexe !== 'FR') e.annexe = 'EC2';
  e.feu = e.feu === true;
  if (!DUREES_FEU.includes(e.resistanceFeu)) { erreurs.push({ champ: 'resistanceFeu', message: 'Durée de résistance au feu : R30, R60, R90, R120, R180 ou R240.' }); e.resistanceFeu = 60; }
  if (e.enrobageMode !== 'calcule' && e.enrobageMode !== 'saisi') e.enrobageMode = 'calcule';
  if (!(e.classeStructurale === 0 || (Number.isInteger(e.classeStructurale) && e.classeStructurale >= 1 && e.classeStructurale <= 6))) {
    erreurs.push({ champ: 'classeStructurale', message: 'Classe structurale : automatique ou S1 à S6.' }); e.classeStructurale = 0;
  }
  // Cohérence géométrique
  const h = e.hf + e.hCorps;
  if (e.bw >= e.entraxe * 1000) erreurs.push({ champ: 'bw', message: "L'âme doit être plus étroite que l'entraxe des poutrelles." });
  const cApprox = e.enrobageMode === 'saisi' ? e.cnomSaisi : 30;
  if (h <= cApprox + e.phiEtrier + Math.max(e.phiTravee, e.phiAppui) * 1.5) erreurs.push({ champ: 'hCorps', message: "Hauteur totale insuffisante pour loger l'enrobage et les armatures." });
  return { erreurs, entree: e };
}
