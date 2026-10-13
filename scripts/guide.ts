/**
 * Génère le guide d'utilisation PDF : docs/guide/Guide_utilisateur_Plancher_Corps_Creux_EC2.pdf
 * Les valeurs numériques viennent du moteur (aucune valeur recopiée à la main) ; les captures viennent de `npm run manuel`.
 * Usage : CHROME_PATH=/chemin/chromium npm run guide
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { calculerPlancher, fr } from '../src/plancher/calcul';
import { PAR_DEFAUT } from '../src/plancher/validation';
import { libelleBeton } from '../src/plancher/materiaux';
import { planches } from '../src/plans/plan';
import { svgTexte } from '../src/plans/PlanSVG';
import { ID_DEFAUT } from '../src/app/store';
import { selLogoSVG } from '../src/brand/sel';
import { APP_VERSION } from '../src/version';
import { CAS } from '../src/plancher/casValidation';

const SORTIE = 'docs/guide';
mkdirSync(`${SORTIE}/img`, { recursive: true });
const TITRE = "Calculette EC2 Plancher Corps Creux";
const MOIS = 'octobre 2026';

// ---- Valeurs issues du moteur -------------------------------------------------------------------------------------------
const r = calculerPlancher(PAR_DEFAUT);
const iso = calculerPlancher({ ...PAR_DEFAUT, appui: 'simple' });
const feuCont = calculerPlancher({ ...PAR_DEFAUT, feu: true, resistanceFeu: 60 });
const feuIso = calculerPlancher({ ...PAR_DEFAUT, appui: 'simple', feu: true, resistanceFeu: 60 });
const feu90 = calculerPlancher({ ...PAR_DEFAUT, feu: true, resistanceFeu: 90 });
const A = r.analyse, N = r.nomenclature, fc = r.els.flecheCalc;
const nOk = (x: typeof r) => `${x.verifications.filter(v => v.ok).length} / ${x.verifications.length}`;
const kNm = (n: number) => fr(n / 1e6, 1);

const img = (f: string, legende: string, largeur = 100) => `<figure style="width:${largeur}%"><img src="../manuel/img/${f}" alt="${legende}"><figcaption>${legende}</figcaption></figure>`;
const tab = (entetes: string[], lignes: string[][]) => `<table><thead><tr>${entetes.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${lignes.map(l => `<tr>${l.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

const SECTIONS: { titre: string; corps: string }[] = [
  { titre: 'Présentation', corps: `
    <p>La <strong>${TITRE}</strong> dimensionne et vérifie une <strong>poutrelle représentative</strong> d'un plancher à corps creux
    (poutrelles, entrevous, dalle de compression) selon la NF EN 1992-1-1 : sollicitations, flexion en travée et sur appui, effort tranchant,
    états limites de service, dispositions constructives et, en option, résistance au feu (EN 1992-1-2). Elle produit la note de calcul,
    la nomenclature des aciers, le métré et les plans d'exécution A3 (SVG, DXF, impression).</p>
    ${tab(['Domaine', 'Vérifications principales'], [
      ['Sollicitations', 'Descente de charges (EN 1990, EN 1991-1-1), poutrelle isostatique ou continue (coefficients forfaitaires)'],
      ['ELU', 'Flexion en section en T (travée) et rectangulaire (appui), ductilité, effort tranchant (bielles, étriers), traction à l\'appui d\'about'],
      ['ELS', 'Contraintes en section fissurée, fissuration sans calcul (tableau 7.2N), flèche à long terme calculée (fluage, retrait), flèche nuisible L/500'],
      ['Dispositions', 'As,min et As,max, espacement des barres, étriers (espacement, pourcentage), ancrage lbd, enrobage'],
      ['Feu (option)', 'Valeurs tabulées de la nervure : largeur, âme, distance a de l\'axe des armatures au parement, barres d\'angle'],
    ])}
    <p>Le verdict en tête de page (<strong>CONFORME</strong>, <strong>NON CONFORME</strong>, <strong>NON VÉRIFIÉ</strong>) ne vaut que pour les vérifications
    effectuées : l'onglet « Vérifications » liste ce qui est couvert et la note rappelle ce qui ne l'est pas (voir « Limites »).</p>` },
  { titre: 'Prise en main', corps: `
    <p>Le travail se fait en <strong>quatre étapes</strong>, accessibles par les onglets en haut de page :</p>
    <ol><li><strong>Géométrie et charges</strong> : appuis, portée, entraxe, section, charges.</li>
    <li><strong>Matériaux et armatures</strong> : béton, acier, exposition, résistance au feu (option), barres, chapeaux, étriers.</li>
    <li><strong>Résultats</strong> : synthèse dessinée, efforts, flexion, effort tranchant, ELS, liste des vérifications.</li>
    <li><strong>Documents</strong> : note de calcul, plans A3, DXF, nomenclature, métré, récapitulatif du projet.</li></ol>
    <p>Le bandeau sous l'en-tête reste visible : verdict, moments et effort tranchant maximaux, flèche, nombre de vérifications satisfaites, masse d'acier.
    Une valeur hors bornes est signalée en rouge et le verdict devient « non vérifié » tant qu'elle n'est pas corrigée.</p>
    <p><strong>Projet.</strong> Un projet regroupe plusieurs planchers : « + Plancher », « Dupliquer », « Supprimer », liste déroulante pour passer de l'un à l'autre.
    Le bouton « Projet » renseigne le cartouche (projet, client, référence, rédacteur, vérificateur, indice). Le projet est enregistré automatiquement dans le navigateur ;
    « Enregistrer » produit un fichier <code>.plancher.json</code> à conserver, « Ouvrir… » le relit, « Nouveau » repart d'un projet vide.</p>
    ${img('11-projet.png', "Étape 1 avec le panneau « Projet » ouvert", 92)}` },
  { titre: 'Géométrie et charges', corps: `
    ${img('01-geometrie-charges.png', "Étape 1 : géométrie et charges (exemple par défaut)", 92)}
    <p><strong>Appuis.</strong> <em>Isostatique</em> : appuis simples. <em>Continue</em> : moments évalués par la méthode forfaitaire sur la travée de rive, la plus défavorable
    (0,8·M0 en travée ; 0,5·M0 ou 0,6·M0 sur appui intermédiaire selon 3 travées et plus ou 2 travées ; tranchant majoré de 1,10 ou 1,15). La méthode suppose des travées voisines de portées comparables, une
    inertie constante et Q ≤ max(2·G ; 5 kN/m²) ; un avertissement rouge signale le dépassement.</p>
    <p><strong>Section.</strong> Portée L entre axes d'appuis, entraxe b des poutrelles, largeur d'âme bw, hauteur du corps creux, dalle de compression hf (40 mm minimum en usage courant).
    La ligne de synthèse donne h, la largeur participante beff (§5.3.2.1) et la hauteur utile d.</p>
    <p><strong>Charges.</strong> La catégorie d'usage fixe q<sub>k</sub> et ψ<sub>2</sub> (valeurs recommandées de l'EN 1991-1-1 et de l'EN 1990) ; avec « Annexe France » (paramètres nationaux, étape 2), la catégorie A passe à 1,5 kN/m² ; « Personnalisée » permet de saisir les valeurs des autres catégories de l'Annexe nationale.
    Chape, revêtement, faux plafond et cloisons sont en kN/m². Le <strong>poids des entrevous</strong> est estimé si la case reste à 0 (0,6 kN/m² pour 160 mm, proportionnel à la hauteur) :
    saisir la valeur de la fiche du fabricant pour un calcul définitif.</p>
    <p class="ex"><strong>Exemple traité</strong> — poutrelle continue (3 travées et plus), L = ${fr(r.entree.portee, 2)} m, entraxe ${fr(r.entree.entraxe, 2)} m, bw = ${r.entree.bw} mm, entrevous ${r.entree.hCorps} mm, dalle ${r.entree.hf} mm
    (h = ${r.geo.h} mm), catégorie A, ${libelleBeton(r.entree.fck)}, B${r.entree.fyk}. G = ${fr(r.charges.G0 + r.charges.Gp, 2)} kN/m², Q = ${fr(r.charges.qk, 2)} kN/m², pELU = ${fr(r.charges.pELU, 2)} kN/m.</p>` },
  { titre: 'Matériaux et armatures', corps: `
    ${img('02-materiaux-armatures.png', 'Étape 2 : matériaux et armatures', 92)}
    <p><strong>Matériaux.</strong> Béton C20/25 à C50/60, acier B400 ou B500, paramètres nationaux (valeurs recommandées ou Annexe France : q<sub>k</sub> de la catégorie A et w<sub>max</sub> en XD/XS), classe d'exposition.
    L'<strong>enrobage nominal</strong> est calculé (classe structurale du tableau 4.3N, c<sub>min,dur</sub> du tableau 4.4N, Δc<sub>dev</sub> = 10 mm) : ici ${fr(r.mat.cNom, 0)} mm. Les options avancées permettent de
    forcer la classe structurale, de saisir cnom, de régler cot θ, l'humidité relative, l'âge au chargement, la limite de flèche L/… et la prise en compte des cloisons fragiles (flèche nuisible L/500).</p>
    <p><strong>Armatures.</strong> Barres de travée, chapeaux (sur appui en poutrelle continue ; chapeaux de construction à chaque appui en isostatique), étriers. L'indicateur
    « As requis / fourni » signale immédiatement une section insuffisante ; <strong>Proposer des armatures</strong> retient la plus petite section couvrant le besoin avec un espacement libre conforme.</p>
    <p><strong>Étrier triangulaire fermé.</strong> Base A = bw − 2c, hauteur B = h − 2c, côtés inclinés C = √((A/2)² + B²), crochet de fermeture à 135° et queue de 10Φ.
    Longueur développée = A + 2C + 2·10Φ = ${fr(N.etrier.A + 2 * N.etrier.cote + 2 * N.etrier.crochet, 0)} mm dans l'exemple (A = ${fr(N.etrier.A, 0)}, B = ${fr(N.etrier.B, 0)}, C = ${fr(N.etrier.cote, 0)} mm).</p>` },
  { titre: 'Résistance au feu (option)', corps: `
    ${img('09-option-feu.png', "Option « Vérifier la résistance au feu » et durée R", 80)}
    <p>La case <strong>« Vérifier la résistance au feu (EN 1992-1-2) »</strong> de l'étape 2 active la méthode des <strong>valeurs tabulées</strong> (§5.6) : la nervure est assimilée à une poutre exposée sur trois faces,
    tableau 5.5 en poutrelle isostatique, tableau 5.6 en poutrelle continue, pour les durées R30, R60, R90, R120, R180 et R240. Quatre contrôles bloquants entrent dans le verdict :</p>
    ${tab(['Contrôle', 'Exigence', 'Exemple R60, poutrelle continue'], [
      ['Largeur de nervure', 'bw ≥ bmin du tableau', `bw = ${fr(feuCont.feu!.b, 0)} mm ≥ ${fr(feuCont.feu!.bmin, 0)} mm`],
      ['Épaisseur d\'âme, classe WA', 'bw ≥ valeur minimale', `bw = ${fr(feuCont.feu!.b, 0)} mm ≥ ${fr(feuCont.feu!.bwMin, 0)} mm`],
      ['Distance a de l\'axe des barres de travée au parement', 'a ≥ a requis (interpolation sur bw)', `a = cnom + Φétrier + Φ/2 = ${fr(feuCont.feu!.a, 1)} mm ≥ ${fr(feuCont.feu!.aRequis!, 1)} mm`],
      ['Barres d\'angle d\'un lit unique', 'asd ≥ a + 10 mm si bw est inférieure à la colonne retenue', `asd = ${fr(feuCont.feu!.aCoinFourni!, 1)} mm ≥ ${fr(feuCont.feu!.aCoinRequis!, 1)} mm`],
    ])}
    <p class="ex"><strong>Lecture.</strong> Le même plancher en poutrelle <em>isostatique</em> n'est plus conforme à R60 : a requis ${fr(feuIso.feu!.aRequis!, 1)} mm et ${fr(feuIso.feu!.aCoinRequis!, 1)} mm pour les barres d'angle, alors que a = ${fr(feuIso.feu!.a, 1)} mm ;
    l'application indique l'enrobage nominal à retenir (cnom ≥ ${feuIso.feu!.cnomRequis} mm). En R90 avec bw = ${feu90.entree.bw} mm, le tableau n'est pas applicable (bw &lt; bmin = ${fr(feu90.feu!.bmin, 0)} mm) : élargir l'âme.</p>
    <p><strong>Non couvert</strong> (rappelé dans le périmètre du verdict, la note et les observations) : protection éventuelle apportée par les entrevous, tableaux des dalles nervurées (§5.7) ; les critères d'étanchéité (E) et d'isolation (I) ne font l'objet que d'une ligne indicative (hf comparée à l'épaisseur d'une dalle pleine, tableau 5.8, non bloquante) et, en poutrelle continue, armatures sur appui. La note de calcul comporte une section « Résistance au feu » et les plans une ligne dédiée.</p>` },
  { titre: 'Résultats', corps: `
    ${img('03-resultats-synthese.png', 'Étape 3 : synthèse (coupes, élévation, nomenclature)', 92)}
    <p>La <strong>synthèse</strong> montre les coupes en travée et sur appui, l'élévation de la poutrelle (ancrages, chapeaux, étriers à l'espacement retenu) et la nomenclature.
    Les autres onglets détaillent les efforts (diagrammes M et V), la flexion, l'effort tranchant, les ELS et la liste complète des vérifications.</p>
    ${img('06-resultats-verifications.png', 'Onglet « Vérifications »', 92)}
    <p>Une vérification marquée <strong>✗</strong> est bloquante et rend le verdict « non conforme » ; <strong>⚠</strong> signale un critère non bloquant, donné à titre indicatif (par exemple l'élancement L/d) ;
    <strong>✓</strong> indique un critère satisfait. Chaque ligne cite l'article de la norme.</p>
    <p class="ex"><strong>Exemple traité</strong> — ${nOk(r)} vérifications satisfaites, verdict CONFORME. M+ = ${kNm(A.Mt)} kN·m en travée, M− = ${kNm(-A.Ma)} kN·m sur appui, VEd = ${fr(A.Ved / 1e3, 1)} kN.
    Flèche à long terme ${fr(fc.delta, 1)} mm (limite L/250 = ${fr(fc.limite, 1)} mm), flèche nuisible ${fr(fc.deltaNuisible, 1)} mm (limite L/500 = ${fr(fc.limiteNuisible, 1)} mm).
    Acier ${fr(N.masseTotale, 1)} kg pour la poutrelle (${fr(N.ratioSurface, 2)} kg/m²). Le même plancher en isostatique est non conforme : flèche nuisible ${fr(iso.els.flecheCalc.deltaNuisible, 1)} mm &gt; ${fr(iso.els.flecheCalc.limiteNuisible, 1)} mm.</p>
    ${img('05-resultats-els.png', 'Onglet « ELS » : contraintes, fissuration, flèche', 80)}` },
  { titre: 'Documents', corps: `
    ${img('10-documents-plans.png', "Étape 4 : note de calcul, plans d'exécution, nomenclature et métré", 60)}
    <p><strong>Note de calcul.</strong> Complète (toutes les équations avec leurs valeurs) ou de synthèse : page de garde, sommaire, listes des figures et tableaux, périmètre du verdict, annexe des données d'entrée
    et empreinte du calcul. « Imprimer / PDF » produit le document paginé « n / N ».</p>
    <p><strong>Plans d'exécution A3.</strong> Deux planches, rendues à l'identique à l'écran, en SVG, à l'impression et en DXF :</p>
    <ul><li><strong>Feuille 1</strong> — élévation de la poutrelle à l'échelle (échelle choisie selon la portée, ici 1/15) avec aciers de travée (repère 1), chapeaux (repère 2), étriers (repère 3), cotes d'ancrage et de longueur ;
    coupes en travée et sur appui ; détail de l'étrier triangulaire fermé (A, B, C, crochet, développée).</li>
    <li><strong>Feuille 2</strong> — nomenclature des aciers avec croquis de forme, métré, hypothèses et résultats principaux (et résistance au feu si l'option est active), notes.</li></ul>
    <p>Chaque feuille porte le cartouche S.E.L. (projet, repère du plancher, référence et indice, dessinateur, vérificateur, date, « Feuille n / N », version). Le bouton <strong>DXF (CAO)</strong> exporte un fichier DXF R12 ASCII :
    une feuille A3 par bloc de 420 × 297 mm, calques normalisés (CADRE, BETON, AXES, ACIER_INF, ACIER_SUP, CADRES, COTES, TEXTE, CARTOUCHE). Les accents et le symbole Φ sont convertis pour une lecture correcte dans les logiciels de CAO.</p>
    <figure style="width:100%"><img src="img/planche1.png" alt="Planche 1"><figcaption>Planche 1 — élévation, coupes et étrier (exemple par défaut)</figcaption></figure>
    <figure style="width:100%"><img src="img/planche2.png" alt="Planche 2"><figcaption>Planche 2 — nomenclature, métré et hypothèses</figcaption></figure>
    <p><strong>Nomenclature et métré.</strong> Barres de travée, chapeaux, étriers : désignation, forme (00 barre droite, 01 barre à crochet), Φ, nombre, longueur développée, masse. Béton ${fr(N.volumeBeton, 3)} m³ et acier ${fr(N.masseTotale, 1)} kg
    pour une poutrelle de ${fr(r.analyse.L / 1000, 2)} m. Le <strong>récapitulatif du projet</strong> compare tous les planchers (portée, section, verdict, acier).</p>` },
  { titre: 'Limites', corps: `
    <p>L'application est un outil de <strong>pré-dimensionnement</strong> : toute étude d'exécution doit être validée par un ingénieur structure. Le verdict ne vaut que pour le périmètre ci-dessous.</p>
    ${tab(['Vérifié', 'Non couvert'], [[
      '<ul>' + r.perimetre.verifie.map(x => `<li>${x}</li>`).join('') + '</ul>',
      '<ul>' + r.perimetre.nonVerifie.map(x => `<li>${x}</li>`).join('') + '</ul>',
    ]])}
    <p><strong>Points de vigilance</strong> :</p>
    <ul><li>le poids des entrevous est estimé tant qu'il n'est pas saisi (valeur de la fiche du fabricant) ;</li>
    <li>la méthode forfaitaire n'est valable que dans son domaine (travées voisines comparables, Q ≤ max(2G ; 5 kN/m²)) ; l'étude détaillée de la continuité n'est pas faite ;</li>
    <li>la largeur d'appui n'est pas saisie : les ancrages sont dessinés sur la longueur lbd de part et d'autre de l'axe des appuis ;</li>
    <li>les valeurs de l'Annexe nationale (q<sub>k</sub>, ψ, w<sub>max</sub>) sont les valeurs recommandées de l'EN, sauf choix « Annexe France » (catégorie A et w<sub>max</sub> uniquement) ou « Personnalisée » ;</li>
    <li>la résistance au feu repose sur les valeurs tabulées de la nervure, sans prise en compte des entrevous.</li></ul>` },
  { titre: 'Conseils', corps: `
    <ul><li><strong>Verdict « non conforme »</strong> : ouvrir l'encadré « vérification(s) non satisfaite(s) » sous le bandeau, ou l'onglet « Vérifications » ; agir sur la ligne bloquante
    (armatures, étriers, hauteur de plancher, enrobage).</li>
    <li><strong>Flèche trop grande</strong> : augmenter la hauteur du corps creux, passer en poutrelle continue si la structure s'y prête, ajouter des aciers de travée ou réduire l'entraxe. La flèche nuisible L/500 est la plus sévère
    quand des cloisons fragiles sont déclarées.</li>
    <li><strong>Feu non satisfait</strong> : augmenter l'enrobage nominal (valeur indiquée), élargir l'âme ou réduire le diamètre des barres d'angle.</li>
    <li><strong>Plusieurs planchers</strong> : dupliquer un plancher validé puis modifier la portée ; chaque plancher a son verdict et ses plans.</li>
    <li><strong>Plans DXF</strong> : à ouvrir en unités millimètres ; les cotes affichent les valeurs réelles, les dessins sont à l'échelle de la feuille.</li></ul>
    <p>Références : NF EN 1992-1-1 (§3, 4, 5.3.2.1, 6.1, 6.2, 7.2, 7.3, 7.4, 8.2, 8.4, 9.2), NF EN 1992-1-2 (§5.6), NF EN 1990, NF EN 1991-1-1.
    Cahier de validation : ${CAS.length} cas comparés à un calcul indépendant (Python) ou à un calcul manuel, tolérances explicites (<code>docs/audit/CAHIER_VALIDATION.md</code>).</p>` },
];

// ---- Planches (PNG) ------------------------------------------------------------------------------------------------------
const feuilles = planches(r, ID_DEFAUT, 'Plancher P1');
const navigateur = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await navigateur.newPage({ viewport: { width: 1588, height: 1123 } });
for (const f of feuilles) {
  writeFileSync(`${SORTIE}/img/planche${f.numero}.svg`, svgTexte(f));
  await page.goto(`file://${process.cwd()}/${SORTIE}/img/planche${f.numero}.svg`);
  await page.screenshot({ path: `${SORTIE}/img/planche${f.numero}.png` });
}

// ---- HTML et PDF ---------------------------------------------------------------------------------------------------------
const css = `
  @page { size: A4; margin: 18mm 16mm 20mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Inter, 'Segoe UI', Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #111827; margin: 0; }
  h1 { font-size: 14pt; margin: 0 0 6mm; padding-bottom: 2mm; border-bottom: 1px solid #111827; break-before: page; }
  h1.premier { break-before: avoid; } h1 { break-after: avoid; }
  p, li { text-align: justify; } ul, ol { padding-left: 6mm; }
  code { font-family: 'JetBrains Mono', Consolas, monospace; font-size: 9pt; background: #f3f4f6; padding: 0 1mm; }
  table { width: 100%; border-collapse: collapse; margin: 3mm 0 4mm; font-size: 9pt; break-inside: avoid; }
  th, td { border: 1px solid #cbd5e1; padding: 1.5mm 2mm; text-align: left; vertical-align: top; } th { background: #f1f5f9; }
  td ul { margin: 0; padding-left: 4mm; } td li { text-align: left; }
  figure { margin: 4mm auto; text-align: center; break-inside: avoid; } figure img { width: 100%; border: 1px solid #e5e7eb; }
  figcaption { font-size: 8.5pt; color: #6b7280; margin-top: 1.5mm; }
  .ex { background: #eff6ff; border-left: 3px solid #3a9bd5; padding: 2mm 3mm; }
  .couv { min-height: 245mm; position: relative; break-after: page; }
  .couv .logo { width: 70mm; } .couv h1.t { font-size: 28pt; border: 0; line-height: 1.15; margin: 70mm 0 6mm; break-before: avoid; }
  .couv .st { color: #3a9bd5; font-weight: 700; font-size: 12pt; } .couv .pied { position: absolute; bottom: 0; left: 0; right: 0; border-top: 1px solid #111827; padding-top: 3mm; font-size: 9pt; }
  .som { break-after: page; } .som li { list-style: none; margin: 1.5mm 0; font-size: 11pt; text-align: left; } .som ol { padding: 0; }
`;
const corps = SECTIONS.map((s, i) => `<h1>${i + 1}. ${s.titre}</h1>${s.corps}`).join('\n');
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${TITRE} — Guide d'utilisation</title><style>${css}</style></head><body>
<section class="couv">
  <div class="logo">${selLogoSVG()}</div>
  <h1 class="t">${TITRE}</h1>
  <p class="st">Guide d'utilisation — plancher à poutrelles et entrevous, Eurocode 2</p>
  <p>NF EN 1992-1-1 · NF EN 1992-1-2 — poutrelle isostatique ou continue, note de calcul, plans A3 et DXF, nomenclature et métré.</p>
  <div class="pied">Version ${APP_VERSION} — ${MOIS}<br>Structural &amp; Engineering Labs — structuralengineeringlabs@gmail.com — +237 651 135 605</div>
</section>
<section class="som"><h1 class="premier">Sommaire</h1><ol>${SECTIONS.map((s, i) => `<li>${i + 1}. ${s.titre}</li>`).join('')}</ol></section>
${corps}
</body></html>`;
writeFileSync(`${SORTIE}/guide.html`, html);
const pdf = `${SORTIE}/Guide_utilisateur_Plancher_Corps_Creux_EC2.pdf`;
await page.goto(`file://${process.cwd()}/${SORTIE}/guide.html`);
await page.pdf({
  path: pdf, format: 'A4', printBackground: true, displayHeaderFooter: true, margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' },
  headerTemplate: '<span></span>',
  footerTemplate: `<div style="width:100%;font-size:7pt;color:#6b7280;padding:0 16mm;display:flex;justify-content:space-between;font-family:Arial"><span>${TITRE} — guide v${APP_VERSION}</span><span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
});
await navigateur.close();
console.log(`Guide généré : ${pdf} (${(readFileSync(pdf).length / 1024).toFixed(0)} Ko)`);
