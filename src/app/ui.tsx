/** Composants d'interface communs : champs, listes, aide contextuelle accessible au toucher, onglets au clavier, dialogue. */
import { useEffect, useId, useRef, useState, type ReactNode, type KeyboardEvent } from 'react';

const versTexte = (v: number) => (Number.isFinite(v) ? String(v).replace('.', ',') : '');
const versNombre = (t: string) => (t.trim() === '' ? NaN : Number(t.replace(',', '.').replace(/\s/g, '')));

/** Bouton « ? » qui déplie un texte d'aide (fonctionne au toucher et au clavier, contrairement à l'attribut title). */
export function Aide({ texte }: { texte?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  if (!texte) return null;
  return (
    <>
      <button type="button" aria-expanded={ouvert} aria-controls={id} aria-label="Aide" onClick={() => setOuvert(o => !o)}
        className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-300 text-[10px] text-gray-500 hover:border-primary hover:text-primary align-middle">?</button>
      {ouvert && <span id={id} role="note" className="block mt-1 text-[11.5px] text-gray-600 bg-primary-light/50 rounded px-2 py-1 col-span-3">{texte}</span>}
    </>
  );
}

export function ChampNombre({ label, unite, valeur, onChange, erreur, aide }: { label: ReactNode; unite?: string; valeur: number; onChange: (v: number) => void; erreur?: string; aide?: string }) {
  const id = useId();
  const [texte, setTexte] = useState(versTexte(valeur));
  useEffect(() => { if (versNombre(texte) !== valeur && !(Number.isNaN(valeur) && Number.isNaN(versNombre(texte)))) setTexte(versTexte(valeur)); }, [valeur]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="grid grid-cols-[1fr_92px_42px] items-center gap-x-2 min-h-8">
      <span className="text-[12.5px] text-gray-700 leading-tight"><label htmlFor={id}>{label}</label><Aide texte={aide} /></span>
      <input id={id} inputMode="decimal" value={texte}
        onChange={ev => { setTexte(ev.target.value); onChange(versNombre(ev.target.value)); }}
        aria-invalid={!!erreur} aria-describedby={erreur ? `${id}-e` : undefined}
        className={`h-8 rounded-md border px-2 text-right font-mono text-[12.5px] bg-white outline-none ${erreur ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-primary'}`} />
      <span className="text-[11px] text-gray-500">{unite}</span>
      {erreur && <p id={`${id}-e`} className="col-span-3 text-[11.5px] text-red-600">{erreur}</p>}
    </div>
  );
}

export function Liste<T extends string | number>({ label, valeur, options, onChange, aide }: { label: ReactNode; valeur: T; options: { v: T; l: string }[]; onChange: (v: T) => void; aide?: string }) {
  const id = useId();
  return (
    <div className="grid grid-cols-[1fr_140px] items-center gap-x-2 min-h-8">
      <span className="text-[12.5px] text-gray-700 leading-tight"><label htmlFor={id}>{label}</label><Aide texte={aide} /></span>
      <select id={id} value={String(valeur)} onChange={ev => { const o = options.find(x => String(x.v) === ev.target.value); if (o) onChange(o.v); }}
        className="h-8 rounded-md border border-gray-200 px-1.5 text-[12.5px] bg-white">
        {options.map(o => <option key={String(o.v)} value={String(o.v)}>{o.l}</option>)}
      </select>
    </div>
  );
}

export function Case({ label, valeur, onChange, aide }: { label: ReactNode; valeur: boolean; onChange: (v: boolean) => void; aide?: string }) {
  return (
    <div className="min-h-8 flex items-center flex-wrap">
      <label className="flex items-center gap-2 text-[12.5px] text-gray-700">
        <input type="checkbox" checked={valeur} onChange={ev => onChange(ev.target.checked)} className="accent-[#3a9bd5] w-4 h-4" />{label}
      </label>
      <Aide texte={aide} />
    </div>
  );
}

export function Groupe({ titre, children, action }: { titre: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">{titre}</h3>{action}
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

/** Onglets accessibles (rôles ARIA, flèches gauche/droite, Début/Fin). */
export function Onglets<T extends string>({ onglets, actif, onChange, label }: { onglets: readonly T[]; actif: T; onChange: (o: T) => void; label: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const clavier = (ev: KeyboardEvent, i: number) => {
    const k = ev.key === 'ArrowRight' ? i + 1 : ev.key === 'ArrowLeft' ? i - 1 : ev.key === 'Home' ? 0 : ev.key === 'End' ? onglets.length - 1 : null;
    if (k === null) return;
    ev.preventDefault();
    const j = (k + onglets.length) % onglets.length;
    onChange(onglets[j]); refs.current[j]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 border-b border-gray-200 overflow-x-auto">
      {onglets.map((o, i) => (
        <button key={o} ref={el => { refs.current[i] = el; }} role="tab" aria-selected={actif === o} tabIndex={actif === o ? 0 : -1}
          onClick={() => onChange(o)} onKeyDown={ev => clavier(ev, i)}
          className={`px-3 py-2 text-[13px] font-semibold whitespace-nowrap border-b-2 -mb-px ${actif === o ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{o}</button>
      ))}
    </div>
  );
}

/** Dialogue de confirmation intégré (remplace window.confirm). */
export function Dialogue({ ouvert, titre, texte, confirmer, annuler, libelle = 'Confirmer' }: { ouvert: boolean; titre: string; texte: string; confirmer: () => void; annuler: () => void; libelle?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (ouvert) ref.current?.focus(); }, [ouvert]);
  if (!ouvert) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onKeyDown={ev => { if (ev.key === 'Escape') annuler(); }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-d" className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4">
        <h2 id="dlg-t" className="font-bold text-[15px] mb-1">{titre}</h2>
        <p id="dlg-d" className="text-[13px] text-gray-600 mb-4">{texte}</p>
        <div className="flex justify-end gap-2">
          <button onClick={annuler} className="h-8 px-3 rounded border border-gray-300 text-[13px]">Annuler</button>
          <button ref={ref} onClick={confirmer} className="h-8 px-3 rounded bg-red-600 text-white text-[13px] font-semibold">{libelle}</button>
        </div>
      </div>
    </div>
  );
}
