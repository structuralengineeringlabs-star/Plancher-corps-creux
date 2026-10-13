/**
 * Liste des vérifications, verdict et périmètre couvert : le verdict ne vaut que pour les vérifications effectuées.
 */
import type { ResultatPlancher } from './calcul';
import type { Verdict, Verification } from './types';
import { TAB_5_5, TAB_5_6, HS_MIN_DALLE_PLEINE } from '../eurocodes/feu';

type Partiel = Omit<ResultatPlancher, 'verifications' | 'verdict' | 'perimetre'>;

const fr = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',').replace('-', '−') : '—');
const cm2 = (mm2: number) => (Number.isFinite(mm2) ? `${fr(mm2 / 100)} cm²` : 'section insuffisante');
const kNm = (n: number) => `${fr(n / 1e6, 2)} kN·m`;
const kN = (n: number) => `${fr(n / 1e3, 1)} kN`;

export function construireVerifications(r: Partiel): { verifications: Verification[]; verdict: Verdict; perimetre: { verifie: string[]; nonVerifie: string[] } } {
  const e = r.entree, m = r.mat, an = r.analyse, t = r.travee, a = r.appui, tr = r.tranchant, el = r.els, ds = r.disp;
  const cont = e.appui === 'continu';
  const v: Verification[] = [];
  const V = (x: Verification) => v.push(x);
  const xdxfxs = /^X[DFS]/.test(e.exposition);

  // --- Données ------------------------------------------------------------------------------------------------------
  V({ id: 'D1', groupe: 'Données', libelle: 'Enrobage nominal', valeur: `${fr(m.cNom, 0)} mm`, limite: `≥ cmin + Δcdev = ${fr(m.cNomRequis, 0)} mm (${e.exposition}, S${m.classeS})`, ok: !m.enrobageInsuffisant, bloquant: true, ref: '§4.4.1' });
  if (m.noteEnrobage) r.avertissements.push(m.noteEnrobage);
  V({ id: 'D2', groupe: 'Données', libelle: 'Dalle de compression', valeur: `hf = ${fr(e.hf, 0)} mm`, limite: '≥ 40 mm (usage courant des planchers à poutrelles)', ok: e.hf >= 40, bloquant: false, ref: 'usage' });
  if (cont) V({ id: 'D3', groupe: 'Données', libelle: 'Domaine des coefficients forfaitaires', valeur: `Q = ${fr(an.Qsurf)} kN/m² (G = ${fr(an.Gsurf)} kN/m²)`, limite: `Q ≤ max(2·G ; 5 kN/m²) = ${fr(an.limiteQ)} kN/m²`, ok: an.forfaitaireApplicable, bloquant: true, ref: 'méthode forfaitaire (I)' });

  // --- ELU : flexion --------------------------------------------------------------------------------------------------
  V({ id: 'F-T', groupe: 'ELU', libelle: 'Flexion en travée (aciers inférieurs)', valeur: `As = ${cm2(t.AsProv)} (${e.nbTravee} HA${e.phiTravee})`, limite: `≥ ${cm2(t.AsReq)} ; MEd = ${kNm(an.Mt)} ≤ MRd = ${kNm(t.mrd.MRd)}`, ok: t.flexionOk, bloquant: true, ref: '§6.1' });
  V({ id: 'DUC-T', groupe: 'ELU', libelle: 'Ductilité en travée', valeur: `xu/d = ${fr(t.mrd.xi, 3)}`, limite: `≤ ξlim = ${fr(m.xiLim, 3)}`, ok: t.mrd.ductile, bloquant: true, ref: '§6.1(2)' });
  if (cont) {
    V({ id: 'F-A', groupe: 'ELU', libelle: 'Flexion sur appui (chapeaux)', valeur: `As = ${cm2(a.AsProv)} (${e.nbAppui} HA${e.phiAppui})`, limite: `≥ ${cm2(a.AsReq)} ; MEd = ${kNm(an.Ma)} ≤ MRd = ${kNm(a.mrd.MRd)}`, ok: a.flexionOk, bloquant: true, ref: '§6.1' });
    V({ id: 'RED-A', groupe: 'ELU', libelle: 'Hauteur de la zone comprimée sur appui (moments forfaitaires)', valeur: `xu/d = ${fr(a.mrd.xi, 3)}`, limite: '≤ 0,45 (redistribution implicite, fck ≤ 50 MPa)', ok: a.mrd.xi <= 0.45 + 1e-9, bloquant: false, ref: '§5.5(4)' });
  } else {
    V({ id: 'F-A', groupe: 'ELU', libelle: "Chapeaux de construction aux appuis (encastrement partiel)", valeur: `As = ${cm2(a.AsProv)} (${e.nbAppui} HA${e.phiAppui} par appui)`, limite: `≥ max(As,min ; 0,15·As travée) = ${cm2(a.AsReq)}`, ok: a.flexionOk, bloquant: true, ref: '§9.2.1.2(1)' });
  }
  // --- ELU : effort tranchant ---------------------------------------------------------------------------------------
  V({ id: 'V-MAX', groupe: 'ELU', libelle: 'Bielles de béton', valeur: `VEd = ${kN(tr.Ved)}`, limite: `≤ VRd,max = ${kN(tr.VRdmax)} (cot θ = ${fr(e.cotTheta, 2)})`, ok: tr.etr.bielleOk, bloquant: true, ref: '§6.2.3, éq. 6.9' });
  V({ id: 'V-S', groupe: 'ELU', libelle: 'Étriers', valeur: `${e.nBrins} brins HA${e.phiEtrier}, e = ${fr(tr.etr.s / 10, 0)} cm`, limite: `VEd ≤ VRd,s = ${kN(tr.etr.VRds)}${tr.etr.minimum ? ' (armature minimale)' : ''} ; VRd,c = ${kN(tr.VRdc)}`, ok: tr.etr.bielleOk && tr.Ved <= tr.etr.VRds + 1e-6, bloquant: true, ref: '§6.2.3, éq. 6.8' });
  V({ id: 'V-FE', groupe: 'ELU', libelle: "Traction à ancrer à l'appui d'about", valeur: `FE = 0,5·VEd·cot θ = ${kN(tr.FE)}`, limite: `≤ As·fyd = ${kN(tr.capaciteAppui)} (barres de travée prolongées)`, ok: tr.FE <= tr.capaciteAppui + 1e-6, bloquant: true, ref: '§9.2.1.4(2)' });

  // --- Dispositions --------------------------------------------------------------------------------------------------
  V({ id: 'AMAX-T', groupe: 'Dispositions', libelle: 'As,max en travée', valeur: cm2(t.AsProv), limite: `≤ 0,04·Ac = ${cm2(t.AsMax)}`, ok: t.AsProv <= t.AsMax, bloquant: true, ref: '§9.2.1.1(3)' });
  V({ id: 'AMAX-A', groupe: 'Dispositions', libelle: 'As,max sur appui', valeur: cm2(a.AsProv), limite: `≤ 0,04·Ac = ${cm2(a.AsMax)}`, ok: a.AsProv <= a.AsMax, bloquant: true, ref: '§9.2.1.1(3)' });
  V({ id: 'ESP', groupe: 'Dispositions', libelle: 'Espacement libre des barres de travée', valeur: ds.espacement.sLibre === null ? `1 barre, largeur utile ${fr(ds.espacement.largeurUtile, 0)} mm` : `${fr(ds.espacement.sLibre, 0)} mm (largeur utile ${fr(ds.espacement.largeurUtile, 0)} mm)`, limite: `≥ max(Φ ; dg + 5 ; 20) = ${fr(ds.espacement.sMin, 0)} mm`, ok: ds.espacement.ok, bloquant: true, ref: '§8.2(2)' });
  V({ id: 'S-MAX', groupe: 'Dispositions', libelle: 'Espacement maximal des étriers', valeur: `${fr(tr.etr.s, 0)} mm`, limite: `≤ 0,75·d = ${fr(tr.etr.sMax, 0)} mm`, ok: tr.etr.s <= tr.etr.sMax + 1e-9, bloquant: true, ref: '§9.2.2(6)' });
  V({ id: 'RHO-W', groupe: 'Dispositions', libelle: "Pourcentage d'étriers", valeur: `ρw = ${fr(tr.rhoW * 1000, 2)} ‰`, limite: `≥ ρw,min = 0,08·√fck/fyk = ${fr(tr.rhoWmin * 1000, 2)} ‰`, ok: tr.rhoW >= tr.rhoWmin - 1e-12, bloquant: true, ref: '§9.2.2(5)' });
  V({ id: 'ANC', groupe: 'Dispositions', libelle: "Ancrage des barres de travée à chaque about", valeur: `lbd = ${fr(ds.lbdTravee, 0)} mm (${fr(ds.lbdTravee / e.phiTravee, 1)}Φ)`, limite: `longueur prolongée à l'appui, reprise en nomenclature (forfait 40Φ = ${fr(40 * e.phiTravee, 0)} mm)`, ok: true, bloquant: false, ref: '§8.4.4' });

  // --- ELS ----------------------------------------------------------------------------------------------------------
  const zones: [string, string, typeof el.travee, number][] = [['T', 'travée', el.travee, t.AsProv]];
  if (el.appui) zones.push(['A', 'appui', el.appui, a.AsProv]);
  for (const [k, lab, z] of zones) {
    V({ id: `SC-${k}`, groupe: 'ELS', libelle: `σc caractéristique, ${lab}`, valeur: `${fr(z.car.sigmaC, 1)} MPa`, limite: `≤ 0,6·fck = ${fr(0.6 * e.fck, 1)} MPa`, ok: z.car.sigmaC <= 0.6 * e.fck, bloquant: xdxfxs, ref: '§7.2(2)' });
    V({ id: `SCQ-${k}`, groupe: 'ELS', libelle: `σc quasi-permanente, ${lab}`, valeur: `${fr(z.qp.sigmaC, 1)} MPa`, limite: `≤ 0,45·fck = ${fr(0.45 * e.fck, 1)} MPa (fluage linéaire)`, ok: z.qp.sigmaC <= 0.45 * e.fck, bloquant: false, ref: '§7.2(3)' });
    V({ id: `SS-${k}`, groupe: 'ELS', libelle: `σs caractéristique, ${lab}`, valeur: `${fr(z.car.sigmaS, 0)} MPa`, limite: `≤ 0,8·fyk = ${fr(0.8 * e.fyk, 0)} MPa`, ok: z.car.sigmaS <= 0.8 * e.fyk, bloquant: true, ref: '§7.2(5)' });
    V({ id: `FISS-${k}`, groupe: 'ELS', libelle: `Maîtrise de la fissuration sans calcul, ${lab}`, valeur: `Φ = ${fr(z.phi, 0)} mm, σs,qp = ${fr(z.qp.sigmaS, 0)} MPa`, limite: z.wlim === null ? 'wmax à fixer par le marché' : `Φ ≤ ${fr(z.phiMax, 1)} mm (wmax = ${fr(z.wlim, 1)} mm)`, ok: z.wlim === null || z.ok, bloquant: true, ref: '§7.3.3, tab. 7.2N' });
  }
  const fc = el.flecheCalc;
  V({ id: 'FL', groupe: 'ELS', libelle: 'Flèche à long terme (quasi-permanente, fluage et retrait)', valeur: `${fr(fc.delta, 1)} mm (φ = ${fr(fc.phi, 2)})`, limite: `≤ L/${fr(e.flecheLimite, 0)} = ${fr(fc.limite, 1)} mm`, ok: fc.ok, bloquant: true, ref: '§7.4.1(4), §7.4.3' });
  if (e.cloisonsFragiles) V({ id: 'FN', groupe: 'ELS', libelle: 'Flèche nuisible (après pose des cloisons)', valeur: `${fr(fc.deltaNuisible, 1)} mm`, limite: `≤ L/500 = ${fr(fc.limiteNuisible, 1)} mm`, ok: fc.okNuisible, bloquant: true, ref: '§7.4.1(5)' });
  V({ id: 'LD', groupe: 'ELS', libelle: 'Élancement L/d (méthode simplifiée, indicative)', valeur: `L/d = ${fr(el.fleche.Ld, 1)}`, limite: `≤ ${fr(el.fleche.LdLimite, 1)} (K = ${fr(el.fleche.K, 1)}, F1 = ${fr(el.fleche.F1, 2)})`, ok: el.fleche.ok, bloquant: false, ref: '§7.4.2, éq. 7.16' });

  // --- Résistance au feu (option) ---------------------------------------------------------------------------------------
  if (r.feu) {
    const f = r.feu, tab = `tableau ${f.tableau}`;
    const R = `R${f.R}`;
    V({ id: 'FEU-B', groupe: 'Feu', libelle: `Largeur de la nervure (${R})`, valeur: `bw = ${fr(f.b, 0)} mm`, limite: `≥ bmin = ${fr(f.bmin, 0)} mm (${tab})`, ok: f.aRequis !== null, bloquant: true, ref: `EN 1992-1-2 §5.6.3, ${tab}` });
    V({ id: 'FEU-BW', groupe: 'Feu', libelle: `Épaisseur minimale de l'âme, classe WA (${R})`, valeur: `bw = ${fr(f.b, 0)} mm`, limite: `≥ ${fr(f.bwMin, 0)} mm`, ok: f.b >= f.bwMin, bloquant: true, ref: `EN 1992-1-2 §5.6.3, ${tab}` });
    V({ id: 'FEU-A', groupe: 'Feu', libelle: `Distance de l'axe des armatures de travée au parement (${R})`, valeur: `a = ${fr(f.a, 1)} mm`, limite: f.aRequis === null ? 'non définie (bw < bmin)' : `≥ ${fr(f.aRequis, 1)} mm${f.cnomRequis !== null ? ` (cnom ≥ ${f.cnomRequis} mm)` : ''}`, ok: f.aRequis !== null && f.a >= f.aRequis - 1e-9, bloquant: true, ref: `EN 1992-1-2 §5.6.3, ${tab}` });
    if (f.aCoinRequis !== null) V({ id: 'FEU-C', groupe: 'Feu', libelle: `Barres d'angle d'un lit unique (${R})`, valeur: `asd = ${fr(f.aCoinFourni ?? 0, 1)} mm`, limite: `≥ a + 10 = ${fr(f.aCoinRequis, 1)} mm (bw < ${fr(f.tableau === '5.5' ? TAB_5_5[f.R][2][0] : TAB_5_6[f.R][1][0], 0)} mm)`, ok: (f.aCoinFourni ?? 0) >= f.aCoinRequis - 1e-9, bloquant: true, ref: `EN 1992-1-2 §5.6.3(2), ${tab}` });
    const hsMin = HS_MIN_DALLE_PLEINE[f.R];
    V({ id: 'FEU-I', groupe: 'Feu', libelle: `Dalle de compression : isolation et étanchéité, à titre indicatif (${R})`, valeur: `hf = ${fr(e.hf, 0)} mm`, limite: `≥ hs = ${fr(hsMin, 0)} mm d'une dalle pleine (entrevous non pris en compte)`, ok: e.hf >= hsMin, bloquant: false, ref: 'EN 1992-1-2 §5.7.2, tableau 5.8' });
    r.avertissements.push(`Résistance au feu ${R} : nervure assimilée à une poutre exposée sur trois faces (${tab}), sans prise en compte de la protection des entrevous ; critères d'étanchéité (E) et d'isolation (I) de la dalle de compression : comparaison indicative à l'épaisseur d'une dalle pleine (tableau 5.8), la tenue réelle dépendant des entrevous (évaluation du fabricant)${cont ? " ; armatures sur appui (répartition sur 0,3·leff) non vérifiées" : ''}.`);
  }

  // --- Avertissements -------------------------------------------------------------------------------------------------
  if (r.charges.poidsEntrevousAuto) r.avertissements.push("Poids des entrevous estimé (0,6 kN/m² pour 160 mm, proportionnel à la hauteur) : saisir la valeur de la fiche du fabricant pour un calcul définitif.");
  if (cont) r.avertissements.push(`Poutrelle continue : coefficients forfaitaires (travée ${fr(an.coef.travee, 1)}·M0, appui ${fr(an.coef.appui, 1)}·M0, tranchant ${fr(an.coef.tranchant, 2)}·V0). Les chapeaux des appuis de rive (0,15 de As travée, §9.2.1.2(1)) ne sont pas métrés.`);
  if (!el.travee.car.axeDansTable) r.avertissements.push("Axe neutre ELS dans la nervure : la section en T fissurée est calculée avec la nervure comprimée.");
  r.avertissements.push("Flèche calculée sur la poutrelle isolée (courbures I et II, fluage, retrait) ; poutrelle continue : moments d'équilibre d'une travée de rive. L'élancement L/d est donné à titre indicatif.");
  if (r.erreurs.length === 0 && r.mat.classeAuto) r.avertissements.push(`Classe structurale S${m.classeS} déterminée par le tableau 4.3N (exposition ${e.exposition}).`);

  const blocage = v.some(x => x.bloquant && !x.ok);
  const verdict: Verdict = r.erreurs.length ? 'NV' : blocage ? 'KO' : 'OK';
  if (!blocage && v.some(x => !x.ok)) r.avertissements.push('Des vérifications non bloquantes ne sont pas satisfaites (voir la liste).');

  const verifie = [
    'Descente de charges et sollicitations (isostatique, ou continue par coefficients forfaitaires)',
    'Flexion ELU en travée et sur appui (§6.1)', 'Effort tranchant : bielles et étriers (§6.2)',
    'Dispositions constructives (§8.2, §8.4, §9.2)', 'Contraintes, fissuration sans calcul, flèche calculée et flèche nuisible (§7)',
    ...(r.feu ? [`Résistance au feu R${r.feu.R} de la nervure par valeurs tabulées (EN 1992-1-2 §5.6)`] : []),
  ];
  const nonVerifie = [
    'Dalle de compression : treillis soudé de répartition et flexion transversale',
    'Charges concentrées, cloisons linéaires isolées, poinçonnement',
    'Étude détaillée de la continuité (travées inégales, appuis de rive)',
    ...(r.feu ? ['Feu : protection des entrevous, critères E et I au-delà de la comparaison indicative de hf, tableaux des dalles nervurées (§5.7) ; séisme (EN 1998)'] : ['Résistance au feu (EN 1992-1-2), séisme (EN 1998)']),
    'Appuis (poutres, murs) et vérification des entrevous',
  ];
  return { verifications: v, verdict, perimetre: { verifie, nonVerifie } };
}
