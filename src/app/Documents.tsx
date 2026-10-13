/** Étape 4 : documents — note de calcul, nomenclature, métré, récapitulatif du projet. */
import { useMemo, useState } from 'react';
import { calculerPlancher, fr, type ResultatPlancher } from '../plancher/calcul';
import type { FichierProjet, Identification } from './store';
import { Groupe, Liste } from './ui';
import { CoupeTransversale, Elevation } from './dessins';
import { planches, type Feuille } from '../plans/plan';
import { PlanSVG, svgTexte } from '../plans/PlanSVG';
import { exporterDXF } from '../plans/dxf';

export const telecharger = (nom: string, contenu: string, type: string) => {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement('a'); a.href = url; a.download = nom; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const nomFichier = (id: Identification, repere: string) => `${id.reference}_${repere}`.replace(/[^\w.-]+/g, '_');
const libelleVerdict = (v: string) => (v === 'OK' ? 'conforme' : v === 'KO' ? 'non conforme' : 'non vérifié');
const couleurVerdict = (v: string) => (v === 'OK' ? 'text-green-700' : v === 'KO' ? 'text-red-600' : 'text-gray-500');

export default function Documents({ r, id, projet, ouvrirNote, imprimerPlans }: { r: ResultatPlancher; id: Identification; projet: FichierProjet; ouvrirNote: (n: 'complet' | 'synthese') => void; imprimerPlans: () => void }) {
  const [niveau, setNiveau] = useState<'complet' | 'synthese'>('complet');
  const recap = useMemo(() => projet.planchers.map(p => ({ p, r: calculerPlancher(p.entree) })), [projet]);
  const N = r.nomenclature;
  const repere = projet.planchers.find(p => p.id === projet.active)?.repere ?? id.repere;
  const feuilles = useMemo(() => planches(r, id, repere), [r, id, repere]);
  return (
    <div className="grid gap-3 xl:grid-cols-[360px_1fr] items-start">
      <div>
        <Groupe titre="Note de calcul">
          <Liste label="Niveau de détail" valeur={niveau} options={[{ v: 'complet', l: 'complète' }, { v: 'synthese', l: 'synthèse' }]} onChange={setNiveau} aide="Complète : toutes les équations avec leurs valeurs. Synthèse : résultats et vérifications." />
          <button onClick={() => ouvrirNote(niveau)} className="w-full h-9 rounded bg-primary text-white font-semibold text-[13px] mt-1">Ouvrir la note (imprimer / PDF)</button>
          <p className="text-[11.5px] text-gray-500">Page de garde, sommaire, listes, pagination « n / N », annexe des données et empreinte du calcul.</p>
        </Groupe>
        <Groupe titre="Plans d'exécution (A3)">
          <p className="text-[12px] text-gray-600">{feuilles.length} planches : élévation à l'échelle, coupes, étrier, nomenclature, métré, cartouche.</p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button onClick={() => telecharger(`${nomFichier(id, repere)}.dxf`, exporterDXF(feuilles), 'application/dxf')} className="h-9 rounded border border-primary text-primary font-semibold text-[13px]">DXF (CAO)</button>
            <button onClick={imprimerPlans} className="h-9 rounded border border-primary text-primary font-semibold text-[13px]">Imprimer / PDF</button>
          </div>
          {feuilles.map(f => <button key={f.numero} onClick={() => telecharger(`${nomFichier(id, repere)}_F${f.numero}.svg`, svgTexte(f), 'image/svg+xml')} className="block text-[12px] text-primary mt-1">SVG feuille {f.numero} — {f.titre}</button>)}
        </Groupe>
        <Groupe titre="Métré">
          <p className="text-[12.5px] font-mono">Béton : {fr(N.volumeBeton, 3)} m³ (poutrelle et dalle, une travée)</p>
          <p className="text-[12.5px] font-mono">Acier : {fr(N.masseTotale, 1)} kg ({fr(N.ratioSurface, 2)} kg/m²)</p>
          {N.masseParPhi.map(p => <p key={p.phi} className="text-[12px] font-mono text-gray-600">HA{p.phi} : {fr(p.masse, 1)} kg</p>)}
        </Groupe>
      </div>
      <div className="min-w-0">
        <div className="bg-white border border-gray-200 rounded-lg p-2 mb-3 overflow-x-auto">
          <div className="flex flex-wrap gap-4 justify-center"><CoupeTransversale r={r} vue="travee" taille={240} /><CoupeTransversale r={r} vue="appui" taille={240} /></div>
          <div className="min-w-[640px]"><Elevation r={r} /></div>
        </div>
        <Groupe titre="Aperçu des planches A3">
          <div className="overflow-x-auto">{feuilles.map(f => <PlanSVG key={f.numero} f={f} className="w-full min-w-[720px] h-auto border border-gray-100 mb-2" />)}</div>
        </Groupe>
        <Groupe titre="Nomenclature des aciers">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]"><thead className="bg-gray-50"><tr>{['Rep.', 'Désignation', 'Forme', 'Φ', 'Nb', 'L (m)', 'Masse (kg)'].map(h => <th key={h} className="text-left px-2 py-1">{h}</th>)}</tr></thead>
              <tbody>{N.reperes.map(x => <tr key={x.rep} className="border-t border-gray-100 font-mono"><td className="px-2 py-1">{x.rep}</td><td className="px-2 py-1 font-sans">{x.designation}</td><td className="px-2 font-sans text-gray-600">{x.forme}</td><td className="px-2">{x.phi}</td><td className="px-2">{x.nb}</td><td className="px-2">{fr(x.longueur)}</td><td className="px-2">{fr(x.masse, 1)}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="text-[11.5px] text-gray-600 mt-1">Étrier triangulaire fermé : base A = {fr(N.etrier.A, 0)} mm, hauteur B = {fr(N.etrier.B, 0)} mm, côtés inclinés C = {fr(N.etrier.cote, 0)} mm, crochet 135° et queue de 10Φ = {fr(N.etrier.crochet, 0)} mm à chaque extrémité.</p>
        </Groupe>
        <Groupe titre={`Récapitulatif du projet (${projet.planchers.length} plancher${projet.planchers.length > 1 ? 's' : ''})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]"><thead className="bg-gray-50"><tr>{['Repère', 'Portée (m)', 'Section', 'Verdict', 'Acier (kg)', 'kg/m²'].map(h => <th key={h} className="text-left px-2 py-1">{h}</th>)}</tr></thead>
              <tbody>{recap.map(({ p, r: rr }) => <tr key={p.id} className="border-t border-gray-100"><td className="px-2 py-1 font-semibold">{p.repere}</td><td className="px-2 font-mono">{fr(p.entree.portee, 2)}</td><td className="px-2 font-mono">{p.entree.hCorps}+{p.entree.hf}</td>
                <td className={`px-2 font-semibold ${couleurVerdict(rr.verdict)}`}>{libelleVerdict(rr.verdict)}</td>
                <td className="px-2 font-mono">{fr(rr.nomenclature.masseTotale, 1)}</td><td className="px-2 font-mono">{fr(rr.nomenclature.ratioSurface, 2)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </Groupe>
      </div>
    </div>
  );
}

/** Mode impression des plans : planches A3 paysage, une par page. */
export function ImpressionPlans({ feuilles, onFermer }: { feuilles: Feuille[]; onFermer: () => void }) {
  return (
    <div className="note-fond">
      <style>{'@page { size: A3 landscape; margin: 0; } @media print { .plan-feuille { width: 420mm; height: 297mm; } }'}</style>
      <div className="note-barre no-print">
        <span className="font-semibold">Plans A3 — aperçu</span>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="bg-white text-gray-900 rounded px-3 h-8 text-[13px] font-semibold">Imprimer / PDF</button>
          <button onClick={onFermer} className="border border-white/40 rounded px-3 h-8 text-[13px]">Fermer</button>
        </div>
      </div>
      {feuilles.map(f => <div key={f.numero} className="plan-feuille bg-white mx-auto my-4 max-w-[1400px]"><PlanSVG f={f} className="w-full h-full" /></div>)}
    </div>
  );
}
