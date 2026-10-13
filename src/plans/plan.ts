/**
 * Planches A3 d'exécution d'une poutrelle de plancher à corps creux.
 *  Feuille 1 : élévation à l'échelle (aciers de travée, chapeaux, étriers), coupes en travée et sur appui, détail de l'étrier.
 *  Feuille 2 : nomenclature des aciers, métré, hypothèses et résultats principaux.
 * Le générateur produit des primitives en millimètres de feuille (origine en haut à gauche, y vers le bas), rendues à
 * l'identique en SVG (écran, impression) et en DXF (export CAO).
 */
import type { ResultatPlancher } from '../plancher/calcul';
import { fr } from '../plancher/calcul';
import { libelleAcier, libelleBeton } from '../plancher/materiaux';
import type { Identification } from '../app/store';
import { A3, MARGE, Dessin, cadreEtCartouche, type Feuille } from './base';

export { A3, Dessin, cadreEtCartouche, type Feuille, type Prim, type Calque } from './base';

const ECHELLES_ELEVATION = [10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200];

/** Plus petite échelle 1/e (parmi `liste`) pour laquelle la dimension tient dans l'espace disponible. */
export function choisirEchelle(dimension: number, disponible: number, liste = ECHELLES_ELEVATION): number {
  return liste.find(e => dimension / e <= disponible) ?? liste[liste.length - 1];
}

/** Élévation de la poutrelle à l'échelle 1/e. (X0, Y0) : début de l'about gauche, fibre supérieure de la dalle. */
function elevation(D: Dessin, r: ResultatPlancher, e: number, X0: number, Y0: number) {
  const E = r.entree, N = r.nomenclature, g = r.geo;
  const L = r.analyse.L, lbd = r.disp.lbdTravee, h = g.h, c = r.mat.cNom;
  const cont = E.appui === 'continu';
  const X = (x: number) => X0 + (x + lbd) / e;      // x : abscisse depuis l'axe de l'appui gauche (mm)
  const Y = (y: number) => Y0 + y / e;              // y : profondeur depuis la fibre supérieure (mm)
  // Béton : dalle de compression + âme, appuis
  D.line(X(-lbd), Y(0), X(L + lbd), Y(0), 'BETON', 0.5);
  D.line(X(0), Y(h), X(L), Y(h), 'BETON', 0.5);
  D.line(X(-lbd), Y(0), X(-lbd), Y(h), 'BETON', 0.5);
  D.line(X(L + lbd), Y(0), X(L + lbd), Y(h), 'BETON', 0.5);
  D.line(X(-lbd), Y(h), X(0), Y(h), 'BETON', 0.18, true);
  D.line(X(L), Y(h), X(L + lbd), Y(h), 'BETON', 0.18, true);
  D.line(X(-lbd), Y(E.hf), X(L + lbd), Y(E.hf), 'BETON', 0.18, true); // sous-face de la dalle
  for (const x of [0, L]) {
    D.rect(X(x === 0 ? -lbd : L), Y(h), lbd / e, 3, 'BETON');
    D.line(X(x), Y(0) - 14, X(x), Y(h) + 22, 'AXES', 0.18, true);
    D.circle(X(x), Y(h) + 26, 3, 'AXES');
    D.text(X(x), Y(h) + 27.2, x === 0 ? 'A' : 'B', 3, 'AXES', 'middle', true);
  }
  // Étriers
  const s = r.tranchant.etr.s;
  for (let i = 0; i < N.nombreEtriers; i++) D.line(X(i * s), Y(c), X(i * s), Y(h - c), 'CADRES', 0.18);
  // Aciers de travée (repère 1)
  const yInf = h - (c + E.phiEtrier + E.phiTravee / 2);
  D.line(X(-lbd), Y(yInf), X(L + lbd), Y(yInf), 'ACIER_INF', 0.6);
  // Chapeaux (repère 2) : continu = 0,25·L de part et d'autre de l'appui intermédiaire (à droite) ; isostatique = L/5 + crochet
  const ySup = c + E.phiEtrier + E.phiAppui / 2 + 1.2 * e;
  const Lch = cont ? L / 4 : L / 5;
  const ret = Math.max(h - c - E.phiAppui, 100);
  if (cont) {
    D.line(X(L - Lch), Y(ySup), X(L + lbd), Y(ySup), 'ACIER_SUP', 0.6);
    D.cote(X(L - Lch), X(L), Y(0) - 8, `L/4 = ${fr(Lch / 1000)} m`);
    D.line(X(0), Y(ySup), X(Lch), Y(ySup), 'ACIER_SUP', 0.35, true);
    D.text(X(Lch / 2), Y(0) - 3.5, 'chapeau de rive (non métré)', 2, 'ACIER_SUP', 'middle');
  } else {
    for (const sgn of [1, -1]) {
      const x0 = sgn === 1 ? 0 : L;
      D.line(X(x0), Y(ySup), X(x0 + sgn * Lch), Y(ySup), 'ACIER_SUP', 0.6);
      D.line(X(x0), Y(ySup), X(x0), Y(Math.min(ySup + ret, h - c)), 'ACIER_SUP', 0.6);
    }
    D.cote(X(0), X(Lch), Y(0) - 8, `L/5 = ${fr(Lch / 1000)} m`);
    D.cote(X(L - Lch), X(L), Y(0) - 8, `L/5 = ${fr(Lch / 1000)} m`);
  }
  // Repères et désignations
  const rep = (k: string) => N.reperes.find(x => x.rep === k);
  const r1 = rep('1'), r2 = rep('2'), r3 = rep('3');
  if (r1) { D.bulle(X(L / 2) - 40, Y(h) + 8, 1); D.text(X(L / 2) - 35, Y(h) + 9, `${E.nbTravee} HA${E.phiTravee} — l = ${fr(r1.longueur)} m (ancrage lbd = ${fr(lbd, 0)} mm)`, 2.6, 'ACIER_INF'); }
  if (r2) { D.bulle(X(cont ? L - Lch / 2 : Lch / 2), Y(0) - 14, 2); D.text(X(cont ? L - Lch / 2 : Lch / 2) + 4, Y(0) - 13, `${E.nbAppui} HA${E.phiAppui} — l = ${fr(r2.longueur)} m`, 2.4, 'ACIER_SUP'); }
  if (r3) { D.bulle(X(L / 4), Y(h) + 17, 3); D.text(X(L / 4) + 4, Y(h) + 18, `${N.nombreEtriers} étriers HA${E.phiEtrier} (${E.nBrins} brins), e = ${fr(s / 10, 0)} cm`, 2.4, 'CADRES'); }
  D.cote(X(0), X(L), Y(h) + 34, `L = ${fr(L / 1000)} m (entre axes d'appuis)`);
  D.cote(X(-lbd), X(0), Y(h) + 34, `${fr(lbd, 0)}`);
  D.cote(X(L), X(L + lbd), Y(h) + 34, `${fr(lbd, 0)}`);
  D.line(X(L / 2), Y(0) - 3, X(L / 2), Y(h) + 3, 'TEXTE', 0.35, true);
  D.text(X0, Y0 - 24, `Élévation de la poutrelle — éch. 1/${e}`, 3.4, 'TEXTE', 'start', true);
  D.text(X0, Y0 - 19.5, cont ? 'Poutrelle continue : travée de rive représentée (chapeaux calculés sur l\'appui B)' : 'Poutrelle isostatique : chapeaux de construction à chaque appui (EN 1992-1-1 §9.2.1.2)', 2.2, 'TEXTE');
}

/** Coupe transversale à l'échelle 1/e. cx : axe de l'âme ; y0 : haut de la dalle. */
function coupe(D: Dessin, r: ResultatPlancher, vue: 'travee' | 'appui', cx: number, y0: number, e: number) {
  const E = r.entree, g = r.geo, N = r.nomenclature;
  const c = r.mat.cNom, w = E.phiEtrier, b = g.b, bw = g.bw, h = g.h, hf = g.hf;
  const x0 = cx - b / e / 2, xa = cx - bw / e / 2;
  // entrevous (contours) et béton
  D.rect(x0, y0 + hf / e, (b - bw) / 2 / e, E.hCorps / e, 'BETON');
  D.rect(xa + bw / e, y0 + hf / e, (b - bw) / 2 / e, E.hCorps / e, 'BETON');
  D.text(x0 + (b - bw) / 4 / e, y0 + hf / e + E.hCorps / e / 2, 'entrevous', 1.8, 'COTES', 'middle');
  D.rect(x0, y0, b / e, hf / e, 'BETON');
  D.rect(xa, y0 + hf / e, bw / e, E.hCorps / e, 'BETON');
  D.line(xa, y0 + hf / e, xa + bw / e, y0 + hf / e, 'BETON', 0.1);
  // étrier triangulaire fermé
  const et = N.etrier;
  const demi = et.A / 2 / e;
  const yb = y0 + (h - c) / e, yh = y0 + c / e;
  D.line(cx - demi, yb, cx + demi, yb, 'CADRES', 0.35);
  D.line(cx - demi, yb, cx, yh, 'CADRES', 0.35);
  D.line(cx + demi, yb, cx, yh, 'CADRES', 0.35);
  const cr = Math.min(et.crochet / e, 6);
  D.line(cx, yh, cx - cr * 0.7, yh + cr * 0.7, 'CADRES', 0.35);
  D.line(cx, yh, cx + cr * 0.7, yh + cr * 0.7, 'CADRES', 0.35);
  // barres inférieures
  const yT = y0 + (h - c - w - E.phiTravee / 2) / e;
  const nT = E.nbTravee, largeurUtile = 2 * demi - 2 * (w + E.phiTravee / 2) / e;
  for (let k = 0; k < nT; k++) D.circle(nT === 1 ? cx : cx - largeurUtile / 2 + largeurUtile * k / (nT - 1), yT, Math.max(0.6, E.phiTravee / 2 / e), 'ACIER_INF', true);
  // chapeaux (vue sur appui)
  if (vue === 'appui') {
    const yA = y0 + (c + w + E.phiAppui / 2) / e, nA = E.nbAppui;
    const pas = Math.min(2.2 * E.phiAppui / e, (bw / e - 2 * (c + w) / e) / Math.max(nA - 1, 1));
    for (let k = 0; k < nA; k++) D.circle(cx + (nA === 1 ? 0 : (k - (nA - 1) / 2) * pas), yA, Math.max(0.6, E.phiAppui / 2 / e), 'ACIER_SUP', true);
  }
  // cotes
  D.cote(x0, x0 + b / e, y0 + h / e + 6, `entraxe ${fr(b, 0)}`);
  D.cote(xa, xa + bw / e, y0 + h / e + 13, `bw = ${fr(bw, 0)}`);
  D.line(x0 - 4, y0, x0 - 4, y0 + h / e, 'COTES', 0.18); D.text(x0 - 5, y0 + h / e / 2, `h = ${fr(h, 0)}`, 2.2, 'COTES', 'end');
  D.line(x0 + b / e + 4, y0, x0 + b / e + 4, y0 + hf / e, 'COTES', 0.18); D.text(x0 + b / e + 5, y0 + hf / e / 2 + 0.8, `hf = ${fr(hf, 0)}`, 2.2, 'COTES');
  D.text(cx, y0 - 3, vue === 'travee' ? `Coupe en travée — éch. 1/${e}` : `Coupe sur appui — éch. 1/${e}`, 2.8, 'TEXTE', 'middle', true);
  D.text(cx, y0 + h / e + 20, `cnom = ${fr(c, 0)} mm`, 2.1, 'COTES', 'middle');
  D.bulle(x0 + b / e + 9, y0 + (h - c - w - E.phiTravee / 2) / e, 1);
  if (vue === 'appui') D.bulle(x0 + b / e + 9, y0 + hf / e + 6, 2);
}

/** Détail de l'étrier triangulaire fermé à l'échelle 1/e : base A, hauteur B, côtés C, crochets à 135°. */
function detailEtrier(D: Dessin, r: ResultatPlancher, cx: number, y0: number, e: number) {
  const E = r.entree, et = r.nomenclature.etrier;
  const A = et.A / e, B = et.B / e, cr = et.crochet / e;
  const yb = y0 + B, yh = y0;
  D.line(cx - A / 2, yb, cx + A / 2, yb, 'CADRES', 0.5);
  D.line(cx - A / 2, yb, cx, yh, 'CADRES', 0.5);
  D.line(cx + A / 2, yb, cx, yh, 'CADRES', 0.5);
  D.line(cx, yh, cx - cr * 0.7, yh + cr * 0.7, 'CADRES', 0.5);
  D.line(cx, yh, cx + cr * 0.7, yh + cr * 0.7, 'CADRES', 0.5);
  D.cote(cx - A / 2, cx + A / 2, yb + 7, `A = ${fr(et.A, 0)}`);
  D.line(cx + A / 2 + 6, yh, cx + A / 2 + 6, yb, 'COTES', 0.18);
  D.text(cx + A / 2 + 7.5, (yh + yb) / 2, `B = ${fr(et.B, 0)}`, 2.2, 'COTES');
  D.text(cx - A / 2 - 2, (yh + yb) / 2 - 4, `C = ${fr(et.cote, 0)}`, 2.2, 'COTES', 'end');
  D.text(cx + cr * 0.7 + 3, yh + cr * 0.7 + 2, `crochet 135° — queue 10Φ = ${fr(et.crochet, 0)}`, 1.9, 'COTES');
  D.text(cx, yb + 14, `Développée = A + 2C + 2·10Φ = ${fr(et.A + 2 * et.cote + 2 * et.crochet, 0)} mm`, 2.2, 'COTES', 'middle');
  D.bulle(cx - A / 2 - 8, yb - 4, 3);
  D.text(cx, y0 - 5, `Étrier HA${E.phiEtrier} — éch. 1/${e}`, 2.8, 'TEXTE', 'middle', true);
}

export function planches(r: ResultatPlancher, id: Identification, repere?: string): Feuille[] {
  const E = r.entree, N = r.nomenclature, g = r.geo;
  const L = r.analyse.L, lbd = r.disp.lbdTravee;
  const brutes: { titre: string; echelles: string; D: Dessin }[] = [];

  // ----- Feuille 1 : élévation, coupes, détail étrier -------------------------------------------------------------
  const D1 = new Dessin();
  const largeurUtile = A3.w - 2 * MARGE - 40;
  const e = choisirEchelle(L + 2 * lbd, largeurUtile);
  elevation(D1, r, e, MARGE + 20, MARGE + 38);
  const yCoupes = MARGE + 38 + g.h / e + 64;
  const et = N.etrier;
  const ced = [1, 2, 5, 10].find(s => et.A / s <= 70 && et.B / s <= 85) ?? 10;
  const largeurDetail = Math.max(et.A / ced + 70, 90);
  // Échelle des coupes : la plus grande qui laisse la place aux deux coupes et à l'étrier, au-dessus du cartouche.
  const ec = [5, 10, 20, 25].find(s => {
    const w = g.b / s;
    return 20 + 30 + 2 * w + 40 + largeurDetail <= A3.w - MARGE - 8 && yCoupes + g.h / s + 24 <= A3.h - MARGE - 36 - 4;
  }) ?? 25;
  const w = g.b / ec;
  const cx1 = MARGE + 38 + w / 2, cx2 = cx1 + w + 42, cx3 = cx2 + w / 2 + 28 + largeurDetail / 2;
  coupe(D1, r, 'travee', cx1, yCoupes, ec);
  coupe(D1, r, 'appui', cx2, yCoupes, ec);
  detailEtrier(D1, r, cx3, yCoupes + 4, ced);
  brutes.push({ titre: 'Élévation, coupes et étrier', echelles: `élév. 1/${e}, coupes 1/${ec}, étrier 1/${ced}`, D: D1 });

  // ----- Feuille 2 : nomenclature, métré, hypothèses --------------------------------------------------------------
  const D2 = new Dessin();
  const y0 = MARGE + 22;
  const cols = [MARGE + 5, MARGE + 17, MARGE + 145, MARGE + 190, MARGE + 202, MARGE + 214, MARGE + 238, MARGE + 266];
  D2.text(MARGE + 5, y0 - 4, 'Nomenclature des aciers (une poutrelle)', 3.4, 'TEXTE', 'start', true);
  ['Rep.', 'Désignation', 'Forme', 'Φ', 'Nb', 'L (m)', 'Masse (kg)'].forEach((s, k) => D2.text(cols[k] + 1, y0 + 4.3, s, 2.4, 'TEXTE', 'start', true));
  const hL = 7;
  const lignes = N.reperes;
  D2.rect(cols[0], y0, cols[7] - cols[0], hL * (lignes.length + 1), 'TEXTE');
  cols.slice(1, 7).forEach(x => D2.line(x, y0, x, y0 + hL * (lignes.length + 1), 'TEXTE', 0.18));
  lignes.forEach((x, k) => {
    const yy = y0 + hL * (k + 1);
    D2.line(cols[0], yy, cols[7], yy, 'TEXTE', 0.18);
    const ty = yy + 4.6;
    D2.text(cols[0] + 1, ty, x.rep, 2.4, 'TEXTE', 'start', true);
    D2.text(cols[1] + 1, ty, x.designation.slice(0, 70), 2.2);
    const fx = cols[2] + 6, fy = yy + 3.5;
    if (x.rep === '3') { D2.line(fx, yy + 5.6, fx + 14, yy + 5.6, 'TEXTE', 0.4); D2.line(fx, yy + 5.6, fx + 7, yy + 1.2, 'TEXTE', 0.4); D2.line(fx + 14, yy + 5.6, fx + 7, yy + 1.2, 'TEXTE', 0.4); }
    else {
      D2.line(fx, fy, fx + 28, fy, 'TEXTE', 0.4);
      if (x.forme.startsWith('01')) D2.line(fx, fy, fx, fy + 2.4, 'TEXTE', 0.4);
      if (x.forme.startsWith('01')) D2.line(fx + 28, fy, fx + 28, fy + 2.4, 'TEXTE', 0.4);
    }
    D2.text(cols[3] + 1, ty, String(x.phi), 2.4); D2.text(cols[4] + 1, ty, String(x.nb), 2.4);
    D2.text(cols[5] + 1, ty, fr(x.longueur), 2.4); D2.text(cols[6] + 1, ty, fr(x.masse, 1), 2.4);
  });
  const yAvalTable = y0 + hL * (lignes.length + 1);
  D2.text(MARGE + 5, yAvalTable + 8, `Total : ${fr(N.masseTotale, 1)} kg d'acier pour une poutrelle de ${fr(L / 1000)} m`, 2.6, 'TEXTE', 'start', true);

  const ym = yAvalTable + 22;
  D2.text(MARGE + 5, ym, 'Métré', 3.4, 'TEXTE', 'start', true);
  [
    `Béton : ${fr(N.volumeBeton, 3)} m³ (poutrelle et dalle, sur ${fr(L / 1000)} m × entraxe ${fr(g.b / 1000)} m)`,
    `Acier : ${fr(N.masseTotale, 1)} kg — ${fr(N.ratioSurface, 2)} kg/m² de plancher`,
    ...N.masseParPhi.map(p => `   HA${p.phi} : ${fr(p.masse, 1)} kg`),
  ].forEach((s, k) => D2.text(MARGE + 5, ym + 7 + k * 5, s, 2.4, 'TEXTE', 'start', k < 2));

  const xh = MARGE + 175;
  D2.text(xh, ym, 'Hypothèses et résultats', 3.4, 'TEXTE', 'start', true);
  const A = r.analyse;
  [
    `Béton ${libelleBeton(E.fck)} — acier ${libelleAcier(E.fyk)} — exposition ${E.exposition} — cnom ${fr(r.mat.cNom, 0)} mm`,
    `${E.appui === 'continu' ? `Poutrelle continue (${E.nbTravees === 2 ? '2 travées' : '3 travées et plus'}, coefficients forfaitaires)` : 'Poutrelle isostatique (appuis simples)'} — L = ${fr(L / 1000)} m — entraxe ${fr(g.b / 1000)} m`,
    `Section : dalle hf = ${E.hf} mm, entrevous ${E.hCorps} mm, âme bw = ${E.bw} mm (h = ${g.h} mm)`,
    `Moments ELU : M+ = ${fr(A.Mt / 1e6, 1)} kN·m en travée${E.appui === 'continu' ? `, M− = ${fr(-A.Ma / 1e6, 1)} kN·m sur appui` : ''} — VEd = ${fr(A.Ved / 1e3, 1)} kN`,
    `Flèche à long terme : ${fr(r.els.flecheCalc.delta, 1)} mm — ${r.verifications.filter(v => v.ok).length} / ${r.verifications.length} vérifications satisfaites`,
    ...(r.feu ? [`Résistance au feu R${r.feu.R} : a = ${fr(r.feu.a, 1)} mm ${r.feu.aRequis === null ? '(bw < bmin)' : `≥ ${fr(r.feu.aCoinRequis ?? r.feu.aRequis, 1)} mm`} — ${r.feu.ok ? 'satisfait' : 'NON satisfait'}`] : []),
    `Verdict : ${r.verdict === 'OK' ? 'CONFORME' : r.verdict === 'KO' ? 'NON CONFORME' : 'NON VÉRIFIÉ'} (pré-dimensionnement, à valider par un ingénieur structure)`,
  ].forEach((s, k, t) => D2.text(xh, ym + 7 + k * 5, s, 2.3, 'TEXTE', 'start', k === t.length - 1));

  const yn = ym + 48;
  D2.text(MARGE + 5, yn, 'Notes', 3.4, 'TEXTE', 'start', true);
  [
    `Enrobage nominal ${fr(r.mat.cNom, 0)} mm au nu des étriers (${E.exposition}, Δcdev = ${E.deltaCdev} mm).`,
    `Ancrage des aciers de travée : lbd = ${fr(lbd, 0)} mm de part et d'autre de l'axe de chaque appui (barres droites).`,
    'Étriers triangulaires fermés : crochet de fermeture à 135°, queue de 10Φ (EN ISO 3766 / NF A 35-027).',
    "Les chapeaux de rive d'une poutrelle continue sont des aciers de construction, non métrés.",
    'Cotes en millimètres, sauf mention contraire. Plan issu du pré-dimensionnement : à adapter aux plans de repérage du chantier.',
  ].forEach((s, k) => D2.text(MARGE + 5, yn + 7 + k * 5, s, 2.3, 'TEXTE'));
  brutes.push({ titre: 'Nomenclature, métré et hypothèses', echelles: 'sans échelle', D: D2 });

  const total = brutes.length;
  const ident = { ...id, repere: repere ?? id.repere };
  return brutes.map((b, k) => {
    cadreEtCartouche(b.D, `Béton ${libelleBeton(E.fck)} · ${libelleAcier(E.fyk)} · cnom ${fr(r.mat.cNom, 0)} mm · ${E.exposition}`, ident, b.titre, b.echelles, k + 1, total);
    return { titre: b.titre, echelles: b.echelles, prims: b.D.prims, numero: k + 1, total };
  });
}
