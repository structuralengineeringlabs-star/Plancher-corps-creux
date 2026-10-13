/**
 * Matériaux, catégories d'usage, classe structurale (tableau 4.3N) et enrobage (§4.4.1, tableau 4.4N).
 * S'appuie sur la bibliothèque commune src/eurocodes/ (identique à celle des applications poutres et poteaux).
 */
import type { CategorieUsage, PlancherInput } from './types';
import { cMinDur as tabCMinDur, wmax, EXPOSITIONS } from '../eurocodes/durabilite';
import { proprietesBeton, ES } from '../eurocodes/beton';
export { wmax, EXPOSITIONS, ES };

export const CLASSES_BETON: { fck: number; label: string }[] = [
  { fck: 20, label: 'C20/25' }, { fck: 25, label: 'C25/30' }, { fck: 30, label: 'C30/37' },
  { fck: 35, label: 'C35/45' }, { fck: 40, label: 'C40/50' }, { fck: 45, label: 'C45/55' },
  { fck: 50, label: 'C50/60' },
];
export const libelleBeton = (fck: number) => CLASSES_BETON.find(c => c.fck === fck)?.label ?? `C${fck}`;
export const ACIERS = [{ fyk: 400, label: 'B400' }, { fyk: 500, label: 'B500' }];
export const libelleAcier = (fyk: number) => ACIERS.find(a => a.fyk === fyk)?.label ?? `B${fyk}`;

/**
 * Catégories d'usage : valeurs recommandées de qk (EN 1991-1-1, tableau 6.2) et ψ (EN 1990, tableau A1.1).
 * Une Annexe nationale peut retenir d'autres valeurs : catégorie « perso ».
 */
export const CATEGORIES: CategorieUsage[] = [
  { code: 'A', libelle: 'A – Habitation, planchers', qk: 2.0, psi0: 0.7, psi1: 0.5, psi2: 0.3 },
  { code: 'B', libelle: 'B – Bureaux', qk: 3.0, psi0: 0.7, psi1: 0.5, psi2: 0.3 },
  { code: 'C1', libelle: 'C1 – Réunion, avec tables', qk: 3.0, psi0: 0.7, psi1: 0.7, psi2: 0.6 },
  { code: 'C2', libelle: 'C2 – Réunion, sièges fixes', qk: 4.0, psi0: 0.7, psi1: 0.7, psi2: 0.6 },
  { code: 'C3', libelle: 'C3 – Circulation sans obstacle', qk: 5.0, psi0: 0.7, psi1: 0.7, psi2: 0.6 },
  { code: 'D1', libelle: 'D1 – Commerces de détail', qk: 4.0, psi0: 0.7, psi1: 0.7, psi2: 0.6 },
  { code: 'D2', libelle: 'D2 – Grands magasins', qk: 5.0, psi0: 0.7, psi1: 0.7, psi2: 0.6 },
  { code: 'E1', libelle: 'E1 – Stockage', qk: 7.5, psi0: 1.0, psi1: 0.9, psi2: 0.8 },
  { code: 'perso', libelle: 'Valeurs personnalisées', qk: null, psi0: 0.7, psi1: 0.5, psi2: 0.3 },
];
/**
 * Annexe nationale française (NF EN 1991-1-1/NA, tableau 6.2) : seule la catégorie A est modifiée ici (planchers : qk = 1,5 kN/m²,
 * ψ inchangés). Les autres catégories gardent les valeurs recommandées : pour leurs valeurs nationales, utiliser « Personnalisée ».
 */
export const QK_FR_CATEGORIE_A = 1.5;
export const categorie = (code: string, annexe: 'EC2' | 'FR' = 'EC2'): CategorieUsage => {
  const c = CATEGORIES.find(x => x.code === code) ?? CATEGORIES[0];
  return annexe === 'FR' && c.code === 'A' ? { ...c, qk: QK_FR_CATEGORIE_A } : c;
};

/** Seuils de résistance du tableau 4.3N (réduction de 1 de la classe structurale), par ligne d'exposition. */
function seuilResistance(exposition: string): number {
  if (exposition === 'X0' || exposition === 'XC1') return 30;
  if (exposition === 'XC2' || exposition === 'XC3') return 35;
  if (exposition === 'XC4' || exposition === 'XD1' || exposition === 'XD2' || exposition === 'XS1') return 40;
  if (exposition === 'XD3' || exposition === 'XS2' || exposition === 'XS3') return 45;
  return 40; // XF, XA : valeur de XC4 retenue à titre indicatif (voir cMinDur)
}

/**
 * Classe structurale recommandée (tableau 4.3N) : S4 pour 50 ans ; +2 pour 100 ans ; −1 si la classe de résistance
 * atteint le seuil de l'exposition ; −1 si contrôle de production spécial ; mini S1, maxi S6. Le critère « géométrie de dalle »
 * (position des armatures non affectée par la construction) n'est pas appliqué aux poutrelles : leur cage est mise en place en usine
 * mais la hauteur utile dépend du calage — décision prudente, documentée dans la matrice normative (N05).
 */
export function classeStructuraleDeterminee(p: Pick<PlancherInput, 'fck' | 'exposition' | 'dureeVie100' | 'controleProductionSpecial'>): number {
  let s = 4;
  if (p.dureeVie100) s += 2;
  if (p.fck >= seuilResistance(p.exposition)) s -= 1;
  if (p.controleProductionSpecial) s -= 1;
  return Math.min(6, Math.max(1, s));
}

export interface Materiaux {
  fck: number; fcm: number; fctm: number; Ecm: number;
  fcd: number; fyk: number; fyd: number;
  lambda: number; eta: number; epsCu3: number; epsYd: number;
  /** Hauteur relative limite de la zone comprimée : εcu3/(εcu3 + εyd). */
  xiLim: number;
  /** Moment réduit limite μlim = λ·ξlim·(1 − λ·ξlim/2) pour η = 1. */
  muLim: number;
  classeS: number; classeAuto: boolean;
  cMinDur: number; cMinB: number; cMin: number; cNomRequis: number; cNom: number;
  noteEnrobage: string | null;
  enrobageInsuffisant: boolean;
}

export const GAMMA_C = 1.5;
export const GAMMA_S = 1.15;
export const ALPHA_CC = 1.0;

export function materiaux(p: PlancherInput): Materiaux {
  const { fcm, fctm, Ecm, lambda, eta, epsCu3 } = proprietesBeton(p.fck);
  const fcd = ALPHA_CC * p.fck / GAMMA_C;
  const fyd = p.fyk / GAMMA_S;
  const epsYd = fyd / ES;
  const xiLim = epsCu3 / (epsCu3 + epsYd);
  const muLim = lambda * xiLim * (1 - lambda * xiLim / 2); // μ = MEd/(b·d²·η·fcd)

  const classeAuto = !(p.classeStructurale >= 1 && p.classeStructurale <= 6);
  const classeS = classeAuto ? classeStructuraleDeterminee(p) : Math.round(p.classeStructurale);
  const { valeur: cMinDur, note } = tabCMinDur(p.exposition, `S${classeS}`);
  // cmin,b (tab. 4.2) : ≥ Φ du cadre pour le cadre ; ≥ Φ de la barre pour la barre (c + Φw ≥ Φl)
  const phiL = Math.max(p.phiTravee, p.phiAppui);
  const cMinB = Math.max(p.phiEtrier, phiL - p.phiEtrier);
  const cMin = Math.max(cMinB, cMinDur, 10);
  const cNomRequis = cMin + p.deltaCdev;
  const cNom = p.enrobageMode === 'saisi' ? p.cnomSaisi : cNomRequis;
  return {
    fck: p.fck, fcm, fctm, Ecm, fcd, fyk: p.fyk, fyd, lambda, eta, epsCu3, epsYd, xiLim, muLim,
    classeS, classeAuto, cMinDur, cMinB, cMin, cNomRequis, cNom,
    noteEnrobage: note, enrobageInsuffisant: cNom < cNomRequis - 1e-9,
  };
}
