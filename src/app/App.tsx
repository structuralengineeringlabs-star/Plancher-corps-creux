import { useMemo, useRef, useState } from 'react';
import { calculerPlancher, fr } from '../plancher/calcul';
import { libelleBeton } from '../plancher/materiaux';
import { selLogoSVG } from '../brand/sel';
import { APP_VERSION } from '../version';
import ErrorBoundary from '../ErrorBoundary';
import { EtapeArmatures, EtapeDonnees } from './Formulaire';
import Resultats from './Resultats';
import Note from './Note';
import Documents from './Documents';
import { useProjet, type Identification } from './store';
import { Dialogue, Onglets } from './ui';

const ETAPES = ['1. Géométrie et charges', '2. Matériaux et armatures', '3. Résultats', '4. Documents'] as const;
type Etape = typeof ETAPES[number];
const VERDICT = { OK: { t: 'CONFORME', c: 'bg-green-600' }, KO: { t: 'NON CONFORME', c: 'bg-red-600' }, NV: { t: 'NON VÉRIFIÉ', c: 'bg-gray-500' } };
const CHAMPS_ID: [keyof Identification, string][] = [['projet', 'Projet'], ['client', 'Client'], ['reference', 'Référence'], ['auteur', 'Rédacteur'], ['verificateur', 'Vérificateur'], ['indice', 'Indice']];

export default function App() {
  const p = useProjet();
  const r = useMemo(() => calculerPlancher(p.entree), [p.entree]);
  const [etape, setEtape] = useState<Etape>(ETAPES[0]);
  const [note, setNote] = useState<null | 'complet' | 'synthese'>(null);
  const [projetOuvert, setProjetOuvert] = useState(false);
  const [dialogue, setDialogue] = useState<null | 'nouveau' | 'supprimer'>(null);
  const fichier = useRef<HTMLInputElement>(null);
  const v = VERDICT[r.verdict];
  const bloquants = r.verifications.filter(x => x.bloquant && !x.ok);

  if (note) return <Note r={r} id={p.identification} niveau={note} onFermer={() => setNote(null)} />;

  const bouton = 'border border-white/25 rounded px-2.5 h-8 hover:bg-white/10';
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#0b111e] text-white px-4 py-2 flex items-center gap-3 flex-wrap">
        <div className="h-8 w-40 shrink-0" dangerouslySetInnerHTML={{ __html: selLogoSVG({ texte: '#ffffff', fondIcone: 'rgba(58,155,213,0.15)' }) }} />
        <div className="flex-1 min-w-[180px]">
          <h1 className="text-[14px] font-bold leading-tight">Plancher à corps creux EC2</h1>
          <p className="text-[11px] text-[#6b8aaa]">{p.identification.projet} · {p.projet.planchers.length} plancher(s) · v{APP_VERSION}</p>
        </div>
        <nav aria-label="Projet" className="flex flex-wrap gap-2 text-[12.5px]">
          <button onClick={() => setProjetOuvert(o => !o)} aria-expanded={projetOuvert} className={bouton}>Projet</button>
          <button onClick={p.exporter} className={bouton}>Enregistrer</button>
          <button onClick={() => fichier.current?.click()} className={bouton}>Ouvrir…</button>
          <input ref={fichier} type="file" accept=".json,application/json" className="hidden" aria-label="Fichier projet" onChange={ev => { const f = ev.target.files?.[0]; if (f) p.importer(f); ev.target.value = ''; }} />
          <button onClick={() => setDialogue('nouveau')} className={bouton}>Nouveau</button>
        </nav>
      </header>
      {p.message && <div role="status" className="bg-amber-50 border-b border-amber-200 text-[12.5px] px-4 py-1.5 flex justify-between"><span>{p.message}</span><button onClick={() => p.setMessage(null)} className="font-semibold">Fermer</button></div>}
      {projetOuvert && (
        <div className="bg-white border-b border-gray-200 px-4 py-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {CHAMPS_ID.map(([k, l]) => <label key={k} className="text-[11px] text-gray-500">{l}<input value={p.identification[k]} onChange={ev => p.majId(k, ev.target.value)} className="block w-full h-8 border border-gray-200 rounded px-2 text-[12.5px] text-gray-800" /></label>)}
        </div>
      )}
      {/* Planchers du projet */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex flex-wrap items-center gap-2">
        <label className="text-[11px] text-gray-500" htmlFor="plancher-actif">Plancher</label>
        <select id="plancher-actif" value={p.plancher.id} onChange={ev => p.choisir(ev.target.value)} className="h-8 border border-gray-200 rounded px-2 text-[12.5px] font-semibold">
          {p.projet.planchers.map(x => <option key={x.id} value={x.id}>{x.repere}</option>)}
        </select>
        <input aria-label="Repère du plancher" value={p.plancher.repere} onChange={ev => p.renommer(ev.target.value)} className="h-8 border border-gray-200 rounded px-2 text-[12.5px] w-40" />
        <button onClick={p.ajouter} className="h-8 px-2.5 rounded border border-gray-300 text-[12.5px]">+ Plancher</button>
        <button onClick={p.dupliquer} className="h-8 px-2.5 rounded border border-gray-300 text-[12.5px]">Dupliquer</button>
        <button onClick={() => setDialogue('supprimer')} disabled={p.projet.planchers.length < 2} className="h-8 px-2.5 rounded border border-gray-300 text-[12.5px] disabled:opacity-40">Supprimer</button>
        <span className="text-[11.5px] text-gray-500 ml-auto">{p.entree.appui === 'continu' ? 'continu' : 'isostatique'} · L = {fr(p.entree.portee, 2)} m · {r.geo.h} mm · {libelleBeton(p.entree.fck)}</span>
      </div>
      <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur border-b border-gray-200 px-4 pt-2">
        <div className="flex flex-wrap items-center gap-3 mb-1.5">
          <span className={`text-white text-[12px] font-bold rounded px-2.5 py-1 ${v.c}`} title="Verdict pour les vérifications effectuées">{v.t}</span>
          <span className="text-[12px] font-mono">M+ {fr(r.analyse.Mt / 1e6, 1)} · M− {fr(-r.analyse.Ma / 1e6, 1)} kNm · V {fr(r.analyse.Ved / 1e3, 1)} kN · f {fr(r.els.flecheCalc.delta, 1)} mm</span>
          <span className="text-[12px] text-gray-500">{r.verifications.filter(x => x.ok).length} / {r.verifications.length} vérifications · acier {fr(r.nomenclature.masseTotale, 1)} kg ({fr(r.nomenclature.ratioSurface, 2)} kg/m²)</span>
        </div>
        <Onglets onglets={ETAPES} actif={etape} onChange={setEtape} label="Étapes" />
      </div>
      <main className="flex-1 p-4 min-w-0">
        {r.erreurs.length > 0 && (
          <div role="alert" className="mb-3 border border-red-200 bg-red-50 rounded-lg px-3 py-2 text-[12.5px] text-red-700">
            <strong>Données à corriger</strong> (calcul effectué sur des valeurs ramenées dans leurs bornes) :
            <ul className="list-disc pl-5">{r.erreurs.map((x, i) => <li key={i}>{x.message}</li>)}</ul>
          </div>
        )}
        {bloquants.length > 0 && etape !== ETAPES[3] && (
          <details className="mb-3 border border-red-200 bg-white rounded-lg px-3 py-2 text-[12.5px]">
            <summary className="cursor-pointer font-semibold text-red-700">{bloquants.length} vérification(s) non satisfaite(s)</summary>
            <ul className="list-disc pl-5">{bloquants.map(x => <li key={x.id}>{x.libelle} : {x.valeur} ({x.limite}, {x.ref})</li>)}</ul>
          </details>
        )}
        {r.avertissements.length > 0 && etape === ETAPES[2] && (
          <details className="mb-3 border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 text-[12.5px]">
            <summary className="cursor-pointer font-semibold text-amber-800">{r.avertissements.length} observation(s)</summary>
            <ul className="list-disc pl-5">{r.avertissements.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </details>
        )}
        <ErrorBoundary scope="étape" compact>
          {etape === ETAPES[0] && <EtapeDonnees e={p.entree} maj={p.maj} erreurs={r.erreurs} r={r} />}
          {etape === ETAPES[1] && <EtapeArmatures e={p.entree} maj={p.maj} erreurs={r.erreurs} r={r} appliquer={p.majPlusieurs} />}
          {etape === ETAPES[2] && <div className="bg-white border border-gray-200 rounded-lg p-3"><Resultats r={r} /></div>}
          {etape === ETAPES[3] && <Documents r={r} id={p.identification} projet={p.projet} ouvrirNote={setNote} />}
        </ErrorBoundary>
        {etape !== ETAPES[3] && (
          <div className="flex justify-between mt-3">
            <button disabled={etape === ETAPES[0]} onClick={() => setEtape(ETAPES[ETAPES.indexOf(etape) - 1])} className="h-9 px-4 rounded border border-gray-300 text-[13px] disabled:opacity-40">← Précédent</button>
            <button onClick={() => setEtape(ETAPES[ETAPES.indexOf(etape) + 1])} className="h-9 px-4 rounded bg-primary text-white font-semibold text-[13px]">Suivant →</button>
          </div>
        )}
        <p className="text-[11px] text-gray-500 mt-3">Pré-dimensionnement selon la NF EN 1992-1-1 : toute étude d'exécution doit être validée par un ingénieur structure.</p>
      </main>
      <Dialogue ouvert={dialogue === 'nouveau'} titre="Nouveau projet" texte="Le projet en cours sera remplacé. Pensez à l'enregistrer s'il doit être conservé." libelle="Remplacer"
        confirmer={() => { p.reinitialiser(); setDialogue(null); }} annuler={() => setDialogue(null)} />
      <Dialogue ouvert={dialogue === 'supprimer'} titre="Supprimer le plancher" texte={`Le plancher « ${p.plancher.repere} » sera supprimé du projet.`} libelle="Supprimer"
        confirmer={() => { p.supprimer(); setDialogue(null); }} annuler={() => setDialogue(null)} />
    </div>
  );
}
