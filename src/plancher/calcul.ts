/**
 * Orchestration du calcul d'une poutrelle de plancher à corps creux (EN 1992-1-1).
 * Fonction pure : mêmes entrées, mêmes sorties, aucune dépendance à l'interface.
 * Les vérifications et le verdict sont établis dans verifications.ts.
 */
import type { ErreurSaisie, PlancherInput, Verdict, Verification } from './types';
import { valider } from './validation';
import { materiaux, wmax, type Materiaux } from './materiaux';
import { charges, type Charges } from './charges';
import { analyse, courbes, type Analyse } from './analyse';
import {
  aire, armaturesRequisesRect, armaturesRequisesT, asMax, asMin, largeurParticipante,
  momentResistantRect, momentResistantT, type ArmaturesRequises, type MomentResistant,
} from './flexion';
import { etriers, vrdMax, vrdc, type Etriers } from './tranchant';
import {
  contraintesFissureesRect, contraintesFissureesT, facteurTable, flecheLd, phiMaxFissuration, type ContraintesFissurees, type Fleche,
} from './els';
import { effortTractionAppui, espacementLibre, longueurAncrage, type Espacement } from './dispositions';
import { nomenclature, type Nomenclature } from './nomenclature';
import { flecheCalculee, type FlecheCalculee } from './fleche';
import { coefficientFluage, retraitFinal } from '../eurocodes/fluageRetrait';
import { resistanceFeu, type ResultatFeu } from './feu';
import { construireVerifications } from './verifications';

export const fr = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',').replace('-', '−') : '—');

export interface ZoneELS {
  car: ContraintesFissurees; qp: ContraintesFissurees;
  /** Contrainte de l'acier sous combinaison quasi-permanente utilisée pour le tableau 7.2N, et Φ maximal admis. */
  phiMax: number; phi: number; wlim: number | null; ok: boolean;
}

export interface ResultatPlancher {
  entree: PlancherInput; erreurs: ErreurSaisie[]; avertissements: string[];
  mat: Materiaux;
  geo: { h: number; hf: number; hw: number; bw: number; b: number; beff: number; l0: number; Ac: number; dT: number; dA: number };
  charges: Charges; analyse: Analyse;
  travee: {
    req: ArmaturesRequises; AsCalc: number; AsMin: number; AsReq: number; AsMax: number; AsProv: number;
    mrd: MomentResistant; flexionOk: boolean;
  };
  appui: {
    /** true : moment sur appui calculé (poutrelle continue) ; false : chapeau de construction (§9.2.1.2(1)). */
    calcule: boolean;
    req: ArmaturesRequises; AsMin: number; AsConstruction: number; AsReq: number; AsMax: number; AsProv: number;
    mrd: MomentResistant; flexionOk: boolean;
  };
  tranchant: { Ved: number; AsL: number; VRdc: number; VRdmax: number; etr: Etriers; FE: number; capaciteAppui: number; rhoW: number; rhoWmin: number };
  els: { travee: ZoneELS; appui: ZoneELS | null; fleche: Fleche; flecheCalc: FlecheCalculee };
  disp: { espacement: Espacement; lbdTravee: number; lbdAppui: number; ancrageForfait40: boolean };
  courbes: { X: number[]; M: number[]; V: number[] };
  nomenclature: Nomenclature;
  /** Résistance au feu de la nervure (null si l'option n'est pas activée). */
  feu: ResultatFeu | null;
  verifications: Verification[]; verdict: Verdict;
  perimetre: { verifie: string[]; nonVerifie: string[] };
}

export function calculerPlancher(brut: PlancherInput): ResultatPlancher {
  const { erreurs, entree: e } = valider(brut);
  const avertissements: string[] = [];
  const mat = materiaux(e);
  const ch = charges(e);
  const an = analyse(e, ch);
  const cont = e.appui === 'continu';

  const h = e.hf + e.hCorps, b = e.entraxe * 1000;
  const l0 = cont ? 0.85 * an.L : an.L; // distance entre points de moment nul (§5.3.2.1, fig. 5.2)
  const beff = largeurParticipante(b, e.bw, l0);
  const Ac = beff * e.hf + e.bw * e.hCorps;
  const dT = h - mat.cNom - e.phiEtrier - e.phiTravee / 2;
  const dA = h - mat.cNom - e.phiEtrier - e.phiAppui / 2;
  if (!(dT > 0 && dA > 0)) erreurs.push({ champ: 'hCorps', message: 'Hauteur utile nulle ou négative : enrobage et diamètres trop grands pour la hauteur du plancher.' });
  const geo = { h, hf: e.hf, hw: e.hCorps, bw: e.bw, b, beff, l0, Ac, dT: Math.max(dT, 1), dA: Math.max(dA, 1) };

  // --- Travée -----------------------------------------------------------------------------------------------------------
  const reqT = armaturesRequisesT(an.Mt, beff, e.bw, e.hf, geo.dT, mat);
  const AsMinT = asMin(e.bw, geo.dT, mat.fctm, e.fyk);
  const AsReqT = Math.max(reqT.As, AsMinT);
  const AsProvT = aire(e.nbTravee, e.phiTravee);
  const mrdT = momentResistantT(AsProvT, beff, e.bw, e.hf, geo.dT, mat);
  const travee = {
    req: reqT, AsCalc: reqT.As, AsMin: AsMinT, AsReq: AsReqT, AsMax: asMax(Ac), AsProv: AsProvT, mrd: mrdT,
    flexionOk: !reqT.insuffisante && AsProvT >= AsReqT - 1e-9 && mrdT.MRd >= an.Mt - 1e-6 && mrdT.ductile,
  };

  // --- Appui ------------------------------------------------------------------------------------------------------------
  const reqA = cont ? armaturesRequisesRect(an.Ma, e.bw, geo.dA, mat) : { As: 0, xi: 0, insuffisante: false, mode: 'nul' as const };
  const AsMinA = asMin(e.bw, geo.dA, mat.fctm, e.fyk);
  // Poutrelle isostatique : section d'appui dimensionnée pour un moment de 15 % du moment de travée (§9.2.1.2(1), β1 = 0,15).
  const AsConstruction = Number.isFinite(AsReqT) ? Math.max(AsMinA, 0.15 * reqT.As) : Infinity;
  const AsReqA = cont ? Math.max(reqA.As, AsMinA) : AsConstruction;
  const AsProvA = aire(e.nbAppui, e.phiAppui);
  const mrdA = momentResistantRect(AsProvA, e.bw, geo.dA, mat);
  const appui = {
    calcule: cont, req: reqA, AsMin: AsMinA, AsConstruction, AsReq: AsReqA, AsMax: asMax(Ac), AsProv: AsProvA, mrd: mrdA,
    flexionOk: cont
      ? !reqA.insuffisante && AsProvA >= AsReqA - 1e-9 && mrdA.MRd >= an.Ma - 1e-6 && mrdA.ductile
      : AsProvA >= AsReqA - 1e-9,
  };

  // --- Effort tranchant -------------------------------------------------------------------------------------------------
  const dTr = Math.min(geo.dT, geo.dA);
  const etr = etriers(an.Ved, e.bw, dTr, mat, e.phiEtrier, e.nBrins, e.cotTheta);
  // Armature tendue ancrée au droit de la section d'appui : chapeaux (appui intermédiaire) ou barres de travée (appui de rive).
  const AsL = cont ? AsProvA : AsProvT;
  const FE = effortTractionAppui(an.Ved, e.cotTheta);
  const rhoW = etr.Asw / (etr.s * e.bw);
  const tranchant = {
    Ved: an.Ved, AsL, VRdc: vrdc(e.bw, dTr, e.fck, AsL), VRdmax: vrdMax(e.bw, dTr, mat, e.cotTheta), etr, FE,
    capaciteAppui: AsProvT * mat.fyd, rhoW, rhoWmin: 0.08 * Math.sqrt(e.fck) / e.fyk,
  };

  // --- ELS ------------------------------------------------------------------------------------------------------------
  const wlim = wmax(e.exposition, e.annexe);
  const phiMaxT = (s: number) => (wlim === null ? Infinity : phiMaxFissuration(s, wlim) * (mat.fctm / 2.9));
  const carT = contraintesFissureesT(an.MtCar, beff, e.bw, e.hf, geo.dT, AsProvT);
  const qpT = contraintesFissureesT(an.MtQp, beff, e.bw, e.hf, geo.dT, AsProvT);
  const zoneT: ZoneELS = { car: carT, qp: qpT, phiMax: phiMaxT(qpT.sigmaS), phi: e.phiTravee, wlim, ok: e.phiTravee <= phiMaxT(qpT.sigmaS) + 1e-9 };
  let zoneA: ZoneELS | null = null;
  if (cont) {
    const carA = contraintesFissureesRect(an.MaCar, e.bw, geo.dA, AsProvA);
    const qpA = contraintesFissureesRect(an.MaQp, e.bw, geo.dA, AsProvA);
    zoneA = { car: carA, qp: qpA, phiMax: phiMaxT(qpA.sigmaS), phi: e.phiAppui, wlim, ok: e.phiAppui <= phiMaxT(qpA.sigmaS) + 1e-9 };
  }
  const aireBeton = reqT.mode === 'T' ? beff * e.hf + e.bw * (geo.dT - e.hf) : beff * geo.dT;
  const fleche = flecheLd({ L: an.L, d: geo.dT, fck: e.fck, fyk: e.fyk, AsReq: AsReqT, AsProv: AsProvT, aireBeton, F1: facteurTable(beff, e.bw), continu: cont });

  const h0 = h; // rayon moyen fictif h0 = 2Ac/u ≈ épaisseur totale du plancher (dalle exposée sur une face, nervure sur l'autre)
  const flecheCalc = flecheCalculee({
    L: an.L, sec: { bw: e.bw, h, beff, hf: e.hf }, AsT: AsProvT, dT: geo.dT, AsA: AsProvA, dA: geo.dA, continu: cont, coefAppui: an.coef.appui,
    fck: e.fck, fctm: mat.fctm, Ecm: mat.Ecm, M0qp: an.M0qp, M0g: ch.G0 * e.entraxe * an.L * an.L / 8, RH: e.RH, t0: e.t0,
    limiteDiv: e.flecheLimite, cloisons: e.cloisonsFragiles,
    phi: coefficientFluage(e.fck, e.RH, h0, e.t0, 'N', 20), epsCs: retraitFinal(e.fck, e.RH, h0, 'N').epsCs,
  });

  // --- Dispositions -----------------------------------------------------------------------------------------------------
  const espacement = espacementLibre(e.nbTravee, e.phiTravee, e.bw, mat.cNom, e.phiEtrier, e.dg);
  const bonneAdherenceAppui = h <= 250; // §8.4.2, fig. 8.2 : barres supérieures en bonne adhérence si h ≤ 250 mm
  const ancT = longueurAncrage(e.phiTravee, e.fck, e.fyk, true);
  const ancA = longueurAncrage(e.phiAppui, e.fck, e.fyk, bonneAdherenceAppui);
  const disp = { espacement, lbdTravee: ancT.lbd, lbdAppui: ancA.lbd, ancrageForfait40: 40 * e.phiTravee >= ancT.lbd };

  const nom = nomenclature(e, { cNom: mat.cNom, lbdTravee: ancT.lbd, appuiCalcule: cont, s: etr.s });

  const partiel = {
    entree: e, erreurs, avertissements, mat, geo, charges: ch, analyse: an, travee, appui, tranchant,
    els: { travee: zoneT, appui: zoneA, fleche, flecheCalc }, disp, courbes: courbes(e, an), nomenclature: nom,
    feu: resistanceFeu(e, mat.cNom),
  };
  const { verifications, verdict, perimetre } = construireVerifications(partiel);
  return { ...partiel, verifications, verdict, perimetre };
}
