/**
 * Types du moteur « plancher à corps creux » (poutrelles + entrevous + dalle de compression).
 * Unités de saisie : portée et entraxe en m ; dimensions de section en mm ; charges en kN/m² ; armatures en mm.
 * Unités internes du moteur : N, mm, MPa, N·mm (1 kN/m = 1 N/mm).
 */
export type Verdict = 'OK' | 'KO' | 'NV';
export type TypeAppui = 'simple' | 'continu';

export interface PlancherInput {
  /** Poutrelle isostatique (appuis simples) ou continue (coefficients forfaitaires). */
  appui: TypeAppui;
  /** Poutrelle continue : 2 travées, ou 3 travées et plus (coefficients forfaitaires différents). */
  nbTravees: 2 | 3;
  /** Portée de calcul entre axes d'appuis (m). */
  portee: number;
  /** Entraxe des poutrelles (m). */
  entraxe: number;
  /** Largeur de l'âme (talon) de la poutrelle (mm). */
  bw: number;
  /** Hauteur des entrevous / corps creux (mm). */
  hCorps: number;
  /** Épaisseur de la dalle de compression (mm). */
  hf: number;

  /** Catégorie d'usage (EN 1991-1-1, tableau 6.2) ou « perso ». */
  categorie: string;
  /** qk (kN/m²) lorsque la catégorie est « perso » ; sinon ignoré. */
  qkPerso: number;
  psi2Perso: number;
  chape: number; revetement: number; fauxPlafond: number; cloisons: number;
  /** Poids des entrevous (kN/m² de plancher hors nervures) ; 0 = estimation automatique. */
  poidsEntrevous: number;

  fck: number; fyk: number;
  annexe: 'EC2' | 'FR';
  exposition: string;
  /** 0 = classe structurale déterminée par le tableau 4.3N ; 1 à 6 = imposée. */
  classeStructurale: number;
  dureeVie100: boolean;
  controleProductionSpecial: boolean;
  deltaCdev: number;
  enrobageMode: 'calcule' | 'saisi';
  cnomSaisi: number;
  /** Diamètre maximal du granulat (mm). */
  dg: number;

  /** Humidité relative moyenne (%) et âge du béton au chargement (jours) : fluage et retrait. */
  RH: number; t0: number;
  /** Limite de flèche totale L/… (EN 1992-1-1 §7.4.1(4) : 250) et vérification de la flèche nuisible L/500 (§7.4.1(5)). */
  flecheLimite: number; cloisonsFragiles: boolean;

  /** Résistance au feu de la nervure (EN 1992-1-2, valeurs tabulées) : vérification demandée et durée R (min). */
  feu: boolean; resistanceFeu: number;

  nbTravee: number; phiTravee: number;
  nbAppui: number; phiAppui: number;
  phiEtrier: number; nBrins: number;
  cotTheta: number;
}

export interface ErreurSaisie { champ: string; message: string }

export interface Verification {
  id: string;
  groupe: 'Données' | 'ELU' | 'ELS' | 'Dispositions' | 'Feu';
  libelle: string; valeur: string; limite: string;
  ok: boolean; bloquant: boolean; ref: string;
}

export interface CategorieUsage { code: string; libelle: string; qk: number | null; psi0: number; psi1: number; psi2: number }
