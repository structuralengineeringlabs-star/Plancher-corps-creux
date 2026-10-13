/**
 * Cas du cahier de validation : chaque cas compare une valeur du moteur à une référence indépendante
 * (calcul manuel détaillé, formule exacte, ou modèle Python indépendant scripts/reference/plancher_reference.py).
 * Utilisés par les tests (src/plancher/plancher.test.ts) et par le générateur du cahier (npm run validation).
 */
import refs from '../../scripts/reference/references.json';
import { materiaux } from './materiaux';
import { coefficientFluage, retraitFinal } from '../eurocodes/fluageRetrait';
import { PAR_DEFAUT } from './validation';
import { calculerPlancher } from './calcul';
import { largeurParticipante, asMin, armaturesRequisesT, armaturesRequisesRect, momentResistantT } from './flexion';
import { vrdc, vrdMax, etriers } from './tranchant';
import { contraintesFissureesRect, contraintesFissureesT, phiMaxFissuration } from './els';
import { flecheCalculee } from './fleche';
import { longueurAncrage } from './dispositions';
import type { PlancherInput } from './types';
import { resistanceFeu } from './feu';

export interface CasValidation {
  id: string; domaine: string; article: string; grandeur: string; unite: string;
  reference: number; tolerance: number; methode: string; obtenu: () => number;
}

const m25 = materiaux(PAR_DEFAUT);
const cas = (p: Partial<PlancherInput>) => calculerPlancher({ ...PAR_DEFAUT, ...p });
const defaut = calculerPlancher(PAR_DEFAUT);
const iso = cas({ appui: 'simple' });
const deuxTravees = cas({ nbTravees: 2 });
const AsT = 2 * Math.PI * 36; // 2 HA12
const AsA = 2 * Math.PI * 25; // 2 HA10
const fleche = (continu: boolean, M0qp: number, M0g: number) => flecheCalculee({
  L: 4000, sec: { bw: 120, h: 240, beff: 600, hf: 40 }, AsT, dT: 203, AsA, dA: 204, continu, coefAppui: 0.5,
  fck: 25, fctm: m25.fctm, Ecm: m25.Ecm, M0qp, M0g, RH: 70, t0: 28, limiteDiv: 250, cloisons: true, phi: 2.0, epsCs: 3.5e-4,
});

export const CAS: CasValidation[] = [
  // Matériaux et enrobage
  { id: 'M1', domaine: 'Matériaux', article: '§3.1.6', grandeur: 'fcd, C25/30, αcc = 1,0, γc = 1,5', unite: 'MPa', reference: 25 / 1.5, tolerance: 1e-9, methode: 'Manuel : 1,0 × 25 / 1,5', obtenu: () => m25.fcd },
  { id: 'M2', domaine: 'Matériaux', article: '§2.4.2.4', grandeur: 'fyd, B500, γs = 1,15', unite: 'MPa', reference: 500 / 1.15, tolerance: 1e-9, methode: 'Manuel : 500 / 1,15', obtenu: () => m25.fyd },
  { id: 'M3', domaine: 'Matériaux', article: 'Tab. 3.1', grandeur: 'Ecm, C25/30 (fcm = 33 MPa)', unite: 'MPa', reference: 31475.8, tolerance: 0.5, methode: 'Manuel : 22 000 × (33/10)^0,3', obtenu: () => m25.Ecm },
  { id: 'M4', domaine: 'Durabilité', article: 'Tab. 4.3N, 4.4N', grandeur: 'cnom, XC1, S4 (cmin,dur = 15), Δcdev = 10', unite: 'mm', reference: 25, tolerance: 0, methode: 'Manuel : max(cmin,b ; 15 ; 10) + 10', obtenu: () => m25.cNom },
  { id: 'M5', domaine: 'Fluage', article: 'Annexe B', grandeur: 'φ(∞,t0), C30/37, RH 50 %, h0 200 mm, 28 j, 20 °C', unite: '—', reference: 2.367, tolerance: 0.002, methode: 'Manuel (B.1 à B.10), cas commun aux applications', obtenu: () => coefficientFluage(30, 50, 200, 28, 'N', 20) },
  { id: 'M6', domaine: 'Retrait', article: '§3.1.4, B.11', grandeur: 'εcs(∞), C25/30, RH 70 %, h0 200 mm', unite: 'µm/m', reference: 364.3, tolerance: 0.2, methode: 'Manuel : kh = 0,85 ; εcd,0 = 384,5 ; εca = 37,5', obtenu: () => retraitFinal(25, 70, 200, 'N').epsCs * 1e6 },
  // Charges
  { id: 'C1', domaine: 'Charges', article: 'EN 1991-1-1', grandeur: 'G0 : dalle 1,0 + nervure 1,0 + entrevous 0,6', unite: 'kN/m²', reference: 2.6, tolerance: 1e-9, methode: 'Manuel : 0,04×25 ; 0,12×0,2×25/0,6 ; 0,75×0,48/0,6', obtenu: () => defaut.charges.G0 },
  { id: 'C2', domaine: 'Charges', article: 'EN 1990 §6.4.3.2', grandeur: 'pELU = 1,35 g + 1,5 q (g = 3,30 ; q = 1,20 kN/m)', unite: 'kN/m', reference: 6.255, tolerance: 1e-9, methode: 'Manuel : 4,455 + 1,8', obtenu: () => defaut.charges.pELU },
  { id: 'C3', domaine: 'Charges', article: 'EN 1990 §6.5.3', grandeur: 'pQP = g + ψ2·q (ψ2 = 0,3)', unite: 'kN/m', reference: 3.66, tolerance: 1e-9, methode: 'Manuel : 3,30 + 0,3 × 1,20', obtenu: () => defaut.charges.pQP },
  // Analyse
  { id: 'A1', domaine: 'Analyse', article: 'méthode forfaitaire', grandeur: 'Mt = 0,8·M0, 3 travées, M0 = 12,51 kN·m', unite: 'kN·m', reference: 10.008, tolerance: 1e-6, methode: 'Manuel : 0,8 × 6,255 × 4² / 8', obtenu: () => defaut.analyse.Mt / 1e6 },
  { id: 'A2', domaine: 'Analyse', article: 'méthode forfaitaire', grandeur: 'Ma = 0,5·M0, appui intermédiaire, 3 travées', unite: 'kN·m', reference: 6.255, tolerance: 1e-6, methode: 'Manuel : 0,5 × 12,51', obtenu: () => defaut.analyse.Ma / 1e6 },
  { id: 'A3', domaine: 'Analyse', article: 'méthode forfaitaire', grandeur: 'VEd = 1,1·V0, appui intermédiaire, 3 travées', unite: 'kN', reference: 13.761, tolerance: 1e-6, methode: 'Manuel : 1,1 × 6,255 × 4 / 2', obtenu: () => defaut.analyse.Ved / 1e3 },
  { id: 'A4', domaine: 'Analyse', article: 'méthode forfaitaire', grandeur: 'Ma = 0,6·M0 et VEd = 1,15·V0, 2 travées (Ma)', unite: 'kN·m', reference: 7.506, tolerance: 1e-6, methode: 'Manuel : 0,6 × 12,51', obtenu: () => deuxTravees.analyse.Ma / 1e6 },
  { id: 'A5', domaine: 'Analyse', article: 'poutre isostatique', grandeur: 'Mt = M0 = pL²/8', unite: 'kN·m', reference: 12.51, tolerance: 1e-6, methode: 'Manuel : 6,255 × 16 / 8', obtenu: () => iso.analyse.Mt / 1e6 },
  // Flexion
  { id: 'F1', domaine: 'Flexion', article: '§5.3.2.1', grandeur: 'beff, entraxe 600, bw 120, l0 = 0,85 L = 3400', unite: 'mm', reference: 600, tolerance: 1e-9, methode: 'Manuel : bi = 240 ; min(388 ; 680 ; 240) → beff = bw + 2 × 240 = 600', obtenu: () => largeurParticipante(600, 120, 3400) },
  { id: 'F2', domaine: 'Flexion', article: '§6.1', grandeur: 'As requis en travée, MEd = 10,008 kN·m (axe neutre dans la table)', unite: 'mm²', reference: refs.F2_AsT, tolerance: 0.05, methode: 'Python : dichotomie sur l’équilibre des moments', obtenu: () => armaturesRequisesT(10.008e6, 600, 120, 40, 203, m25).As },
  { id: 'F3', domaine: 'Flexion', article: '§6.1', grandeur: 'As requis, MEd = 60 kN·m, d = 159 (axe neutre dans l’âme, section en T vraie)', unite: 'mm²', reference: refs.F3_AsT_nervure, tolerance: 0.5, methode: 'Python : dichotomie sur l’équilibre des moments', obtenu: () => armaturesRequisesT(60e6, 600, 120, 40, 159, m25).As },
  { id: 'F4', domaine: 'Flexion', article: '§6.1', grandeur: 'MRd, 2 HA12, d = 203', unite: 'kN·m', reference: refs.F4_MRd / 1e6, tolerance: 0.001, methode: 'Python : dichotomie sur l’équilibre des efforts', obtenu: () => momentResistantT(AsT, 600, 120, 40, 203, m25).MRd / 1e6 },
  { id: 'F5', domaine: 'Flexion', article: '§6.1', grandeur: 'MRd, 8 HA12, d = 159 (axe neutre dans l’âme)', unite: 'kN·m', reference: refs.F5_MRd_nervure / 1e6, tolerance: 0.005, methode: 'Python : dichotomie sur l’équilibre des efforts', obtenu: () => momentResistantT(8 * Math.PI * 36, 600, 120, 40, 159, m25).MRd / 1e6 },
  { id: 'F6', domaine: 'Flexion', article: '§6.1', grandeur: 'As requis sur appui, Ma = 6,255 kN·m, section rectangulaire bw = 120, d = 204', unite: 'mm²', reference: refs.F6_AsA, tolerance: 0.05, methode: 'Python : dichotomie sur l’équilibre des moments', obtenu: () => armaturesRequisesRect(6.255e6, 120, 204, m25).As },
  { id: 'F7', domaine: 'Flexion', article: '§9.2.1.1(1)', grandeur: 'As,min, bw 120, d 203, fctm 2,565, fyk 500', unite: 'mm²', reference: Math.max(0.26 * 2.5649639 / 500, 0.0013) * 120 * 203, tolerance: 0.001, methode: 'Manuel : max(0,26·fctm/fyk ; 0,0013)·bw·d', obtenu: () => asMin(120, 203, m25.fctm, 500) },
  // Effort tranchant
  { id: 'T1', domaine: 'Tranchant', article: '§6.2.2', grandeur: 'VRd,c, bw 120, d 203, 2HA12, C25', unite: 'kN', reference: (() => { const k = 1 + Math.sqrt(200 / 203), rho = AsT / (120 * 203); return Math.max(0.12 * k * Math.cbrt(100 * rho * 25), 0.035 * k ** 1.5 * 5) * 120 * 203 / 1e3; })(), tolerance: 0.001, methode: 'Manuel : (0,18/1,5)·k·(100 ρ fck)^(1/3)·bw·d', obtenu: () => vrdc(120, 203, 25, AsT) / 1e3 },
  { id: 'T2', domaine: 'Tranchant', article: '§6.2.3', grandeur: 'VRd,max, bw 120, d 204, cot θ = 2,5, C25', unite: 'kN', reference: 120 * 0.9 * 204 * 0.54 * (25 / 1.5) / (2.5 + 0.4) / 1e3, tolerance: 0.001, methode: 'Manuel : bw·z·ν1·fcd / (cot θ + tan θ), ν1 = 0,6(1 − 25/250) = 0,54', obtenu: () => vrdMax(120, 204, m25, 2.5) / 1e3 },
  { id: 'T3', domaine: 'Tranchant', article: '§6.2.3', grandeur: 'VRd,s, 2 brins HA6 à e = 150, d 203, cot θ = 2,5', unite: 'kN', reference: 2 * Math.PI * 9 / 150 * 0.9 * 203 * (500 / 1.15) * 2.5 / 1e3, tolerance: 0.1, methode: 'Manuel : Asw/s·z·fyd·cot θ ', obtenu: () => etriers(13761, 120, 203, m25, 6, 2, 2.5).VRds / 1e3 },
  // ELS
  { id: 'E1', domaine: 'ELS', article: '§7.2', grandeur: 'Axe neutre fissuré y, Mser = 8 kN·m, 2HA12 (nervure partiellement comprimée)', unite: 'mm', reference: refs.E1_y, tolerance: 0.01, methode: 'Python : dichotomie sur le moment statique, tranches de 0,05 mm', obtenu: () => contraintesFissureesT(8e6, 600, 120, 40, 203, AsT).y },
  { id: 'E2', domaine: 'ELS', article: '§7.2', grandeur: 'σs fissuré, Mser = 8 kN·m, 2HA12', unite: 'MPa', reference: refs.E1_sigs, tolerance: 0.05, methode: 'Python : αe·M·(d − y)/Icr', obtenu: () => contraintesFissureesT(8e6, 600, 120, 40, 203, AsT).sigmaS },
  { id: 'E3', domaine: 'ELS', article: '§7.2', grandeur: 'σc fissuré, Mser = 8 kN·m, 2HA12', unite: 'MPa', reference: refs.E1_sigc, tolerance: 0.01, methode: 'Python : M·y/Icr', obtenu: () => contraintesFissureesT(8e6, 600, 120, 40, 203, AsT).sigmaC },
  { id: 'E4', domaine: 'ELS', article: '§7.2', grandeur: 'σs fissuré, section en T à axe neutre profond (4HA16, d 159, Mser 12 kN·m)', unite: 'MPa', reference: refs.E2_sigs, tolerance: 0.05, methode: 'Python : dichotomie, tranches', obtenu: () => contraintesFissureesT(12e6, 600, 120, 40, 159, 4 * Math.PI * 64).sigmaS },
  { id: 'E5', domaine: 'ELS', article: '§7.2', grandeur: 'σs fissuré, appui rectangulaire (Mser = 4,5 kN·m, 2HA10, bw 120, d 204)', unite: 'MPa', reference: refs.E3_sigs, tolerance: 0.05, methode: 'Python : dichotomie sur le moment statique', obtenu: () => contraintesFissureesRect(4.5e6, 120, 204, AsA).sigmaS },
  { id: 'E6', domaine: 'ELS', article: 'Tab. 7.2N', grandeur: 'Φ*s à σs = 260 MPa, wmax = 0,3 mm', unite: 'mm', reference: 14, tolerance: 1e-9, methode: 'Manuel : interpolation 240 MPa → 16 mm, 280 MPa → 12 mm', obtenu: () => phiMaxFissuration(260, 0.3) },
  { id: 'E7', domaine: 'Flèche', article: '§7.4.3', grandeur: 'Flèche à long terme, isostatique 4 m, 2HA12, φ = 2,0, εcs = 350 µm/m', unite: 'mm', reference: refs.W1_fleche_iso, tolerance: 0.05, methode: 'Python : double intégration de la courbure (ζ, tranches)', obtenu: () => fleche(false, 3.66 * 16e6 / 8, 3.3 * 16e6 / 8).delta },
  { id: 'E8', domaine: 'Flèche', article: '§7.4.3', grandeur: 'Flèche instantanée sous permanentes (avant cloisons), isostatique 4 m', unite: 'mm', reference: refs.W2_fleche_inst, tolerance: 0.02, methode: 'Python : double intégration de la courbure', obtenu: () => fleche(false, 3.66 * 16e6 / 8, 3.3 * 16e6 / 8).deltaAvant },
  { id: 'E9', domaine: 'Flèche', article: '§7.4.3', grandeur: 'Flèche à long terme, travée de rive continue (Ma = 0,5 M0, chapeaux 2HA10)', unite: 'mm', reference: refs.W3_fleche_continu, tolerance: 0.05, methode: 'Python : double intégration, M(x) = M0·4x(L−x)/L² − Ma·x/L', obtenu: () => fleche(true, 3.66 * 16e6 / 8, 3.3 * 16e6 / 8).delta },
  // Dispositions
  { id: 'D1', domaine: 'Dispositions', article: '§8.4.4', grandeur: 'lbd, HA12, C25, B500, bonne adhérence', unite: 'mm', reference: (12 / 4) * (500 / 1.15) / (2.25 * 0.7 * 2.5649639 / 1.5), tolerance: 0.05, methode: 'Manuel : Φ/4·σsd/fbd, fbd = 2,25·fctk,0,05/γc', obtenu: () => longueurAncrage(12, 25, 500, true).lbd },
  { id: 'D2', domaine: 'Dispositions', article: '§9.2.1.4', grandeur: 'FE = 0,5·VEd·cot θ', unite: 'kN', reference: 0.5 * 13.761 * 2.5, tolerance: 1e-6, methode: 'Manuel', obtenu: () => defaut.tranchant.FE / 1e3 },
  { id: 'D3', domaine: 'Dispositions', article: '§8.2', grandeur: 'Étrier triangulaire : longueur développée (bw 120, h 240, c 25, Φ6)', unite: 'mm', reference: 70 + 2 * Math.sqrt(35 ** 2 + 190 ** 2) + 2 * 60, tolerance: 1e-6, methode: 'Manuel : A + 2·√((A/2)² + B²) + 2·10Φ', obtenu: () => defaut.nomenclature.reperes[2].longueur * 1000 },
  // Résistance au feu (valeurs tabulées)
  { id: 'R1', domaine: 'Feu', article: 'EN 1992-1-2 tab. 5.5', grandeur: 'a requis, appuis simples, R60, bw = 140 mm', unite: 'mm', reference: 37.5, tolerance: 1e-9, methode: 'Manuel : interpolation (120 ; 40) → (160 ; 35)', obtenu: () => resistanceFeu({ ...PAR_DEFAUT, bw: 140, appui: 'simple', feu: true, resistanceFeu: 60 }, 25)!.aRequis! },
  { id: 'R2', domaine: 'Feu', article: 'EN 1992-1-2 tab. 5.6', grandeur: 'a requis, poutre continue, R60, bw = 120 mm', unite: 'mm', reference: 25, tolerance: 1e-9, methode: 'Manuel : première colonne (120 ; 25)', obtenu: () => resistanceFeu({ ...PAR_DEFAUT, feu: true, resistanceFeu: 60 }, 25)!.aRequis! },
  { id: 'R3', domaine: 'Feu', article: 'EN 1992-1-2 §5.6.3', grandeur: 'a fourni, cnom 25, étrier Φ6, barres Φ12', unite: 'mm', reference: 25 + 6 + 6, tolerance: 1e-9, methode: 'Manuel : cnom + Φétrier + Φ/2', obtenu: () => resistanceFeu({ ...PAR_DEFAUT, feu: true }, 25)!.a },
  { id: 'R4', domaine: 'Feu', article: 'EN 1992-1-2 §5.6.3(2)', grandeur: 'asd requis des barres d\'angle, appuis simples, R60, bw = 120 mm', unite: 'mm', reference: 50, tolerance: 1e-9, methode: 'Manuel : a + 10 = 40 + 10 (bw < 200 mm)', obtenu: () => resistanceFeu({ ...PAR_DEFAUT, appui: 'simple', feu: true, resistanceFeu: 60 }, 25)!.aCoinRequis! },
];

export const ecart = (c: CasValidation) => c.obtenu() - c.reference;
export const conforme = (c: CasValidation) => Math.abs(ecart(c)) <= c.tolerance + 1e-9;
