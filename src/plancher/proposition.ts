/**
 * Proposition d'armatures : plus petite section de barres identiques (Φ 8 à 20 mm, 1 à 5 barres) couvrant la section requise,
 * avec un espacement libre conforme au §8.2(2). Ne remplace pas le choix de l'ingénieur : les vérifications restent faites
 * sur les armatures effectivement saisies.
 */
import type { ResultatPlancher } from './calcul';
import { aire } from './flexion';
import { espacementLibre } from './dispositions';

export interface Barres { nb: number; phi: number; As: number }
const DIAMETRES = [8, 10, 12, 14, 16, 20];

function choisir(AsReq: number, admissible: (nb: number, phi: number) => boolean): Barres | null {
  if (!Number.isFinite(AsReq)) return null;
  let meilleur: Barres | null = null;
  for (const phi of DIAMETRES) {
    for (let nb = 1; nb <= 5; nb++) {
      const As = aire(nb, phi);
      if (As < AsReq - 1e-9 || !admissible(nb, phi)) continue;
      if (!meilleur || As < meilleur.As - 1e-9 || (Math.abs(As - meilleur.As) < 1e-9 && nb < meilleur.nb)) meilleur = { nb, phi, As };
    }
  }
  return meilleur;
}

/** Armatures de travée (en un lit dans l'âme) et chapeaux proposés pour les sections requises du résultat. */
export function proposerArmatures(r: ResultatPlancher): { travee: Barres | null; appui: Barres | null } {
  const e = r.entree;
  const travee = choisir(r.travee.AsReq, (nb, phi) => espacementLibre(nb, phi, e.bw, r.mat.cNom, e.phiEtrier, e.dg).ok);
  // Chapeaux : hors de l'âme (placés dans la dalle) — pas de contrainte d'espacement dans l'âme, mais au plus 4 barres
  const appui = choisir(r.appui.AsReq, (nb) => nb <= 4);
  return { travee, appui };
}
