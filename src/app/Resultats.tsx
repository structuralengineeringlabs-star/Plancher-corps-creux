/** Étape 3 : résultats — synthèse dessinée, efforts, flexion, effort tranchant, ELS, vérifications. */
import { useState, type ReactNode } from 'react';
import { fr, type ResultatPlancher } from '../plancher/calcul';
import type { Verification } from '../plancher/types';
import { CoupeTransversale, Diagramme, Elevation } from './dessins';
import { Onglets } from './ui';

const ONGLETS = ['Synthèse', 'Efforts', 'Flexion', 'Effort tranchant', 'ELS', 'Vérifications'] as const;
type Onglet = typeof ONGLETS[number];

export function Tableau({ entetes, lignes }: { entetes: ReactNode[]; lignes: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg my-3">
      <table className="w-full text-[12.5px]">
        <thead className="bg-gray-50"><tr>{entetes.map((h, i) => <th key={i} className="text-left font-semibold text-gray-600 px-2.5 py-1.5 whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{lignes.map((l, i) => <tr key={i} className="border-t border-gray-100">{l.map((c, j) => <td key={j} className="px-2.5 py-1.5 font-mono whitespace-nowrap">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const Etat = ({ ok, bloquant = true }: { ok: boolean; bloquant?: boolean }) =>
  <span className={`font-sans font-semibold ${ok ? 'text-green-700' : bloquant ? 'text-red-600' : 'text-amber-600'}`}>{ok ? '✓' : bloquant ? '✗' : '⚠'}</span>;

export function ListeVerifications({ v }: { v: Verification[] }) {
  return (
    <Tableau entetes={['', 'Vérification', 'Valeur', 'Critère', 'Référence']}
      lignes={v.map(x => [<Etat ok={x.ok} bloquant={x.bloquant} />, <span className="font-sans">{x.libelle}</span>, x.valeur, <span className="whitespace-normal">{x.limite}</span>, <span className="font-sans text-gray-500">{x.ref}</span>])} />
  );
}

const mN = (n: number) => fr(n / 1e6, 2);
const kN = (n: number) => fr(n / 1e3, 1);
const cm2 = (mm2: number) => (Number.isFinite(mm2) ? fr(mm2 / 100, 2) : '∞');

export default function Resultats({ r }: { r: ResultatPlancher }) {
  const [onglet, setOnglet] = useState<Onglet>('Synthèse');
  const e = r.entree, an = r.analyse, cont = e.appui === 'continu';
  return (
    <div>
      <Onglets onglets={ONGLETS} actif={onglet} onChange={setOnglet} label="Résultats" />
      <div className="pt-3">
        {onglet === 'Synthèse' && <>
          <div className="grid gap-3 md:grid-cols-2 justify-items-center">
            <CoupeTransversale r={r} vue="travee" />
            <CoupeTransversale r={r} vue="appui" />
          </div>
          <div className="mt-3"><Elevation r={r} /></div>
          <Tableau entetes={['Repère', 'Désignation', 'Nombre', 'Longueur (m)', 'Masse (kg)']}
            lignes={r.nomenclature.reperes.map(x => [x.rep, <span className="font-sans whitespace-normal">{x.designation}</span>, x.nb, fr(x.longueur, 2), fr(x.masse, 1)])} />
          <p className="text-[12px] text-gray-600">Acier : {fr(r.nomenclature.masseTotale, 1)} kg pour une travée de {fr(e.portee, 2)} m ({fr(r.nomenclature.ratioSurface, 2)} kg/m² de plancher). Béton de la poutrelle et de la dalle : {fr(r.nomenclature.volumeBeton, 3)} m³.</p>
        </>}

        {onglet === 'Efforts' && <>
          <Diagramme r={r} type="M" />
          <Diagramme r={r} type="V" hauteur={170} />
          <p className="text-[12px] text-gray-600">{cont ? `Méthode forfaitaire (${an.coef.travee}·M0 en travée de rive, ${an.coef.appui}·M0 sur appui intermédiaire, ${an.coef.tranchant}·V0). Diagrammes de principe ancrés sur les valeurs de calcul.` : 'Poutrelle isostatique : M0 = pL²/8, V0 = pL/2.'}</p>
          <Tableau entetes={['Grandeur', 'Valeur', 'Détail']}
            lignes={[
              ['pELU', `${fr(r.charges.pELU, 2)} kN/m`, `1,35·g + 1,5·q (g = ${fr(r.charges.g, 2)} ; q = ${fr(r.charges.q, 2)} kN/m)`],
              ['M0', `${mN(an.M0)} kN·m`, 'pELU·L²/8'],
              ['MEd travée', `${mN(an.Mt)} kN·m`, `${an.coef.travee}·M0`],
              ...(cont ? [['MEd appui', `${mN(an.Ma)} kN·m`, `${an.coef.appui}·M0`]] : []),
              ['VEd', `${kN(an.Ved)} kN`, `${an.coef.tranchant}·V0, V0 = ${kN(an.V0)} kN`],
              ['M car. / q-p travée', `${mN(an.MtCar)} / ${mN(an.MtQp)} kN·m`, 'ELS'],
            ]} />
        </>}

        {onglet === 'Flexion' && <>
          <Tableau entetes={['Zone', 'MEd (kN·m)', 'Section', 'd (mm)', 'xu/d', 'As,calc', 'As,min', 'As,req', 'As,prov', 'MRd (kN·m)']}
            lignes={[
              ['Travée', mN(an.Mt), <span className="font-sans">{r.travee.req.mode === 'T' ? `en T (beff ${fr(r.geo.beff, 0)})` : 'rectangulaire (table)'}</span>, fr(r.geo.dT, 0), fr(r.travee.req.xi, 3), cm2(r.travee.AsCalc), cm2(r.travee.AsMin), cm2(r.travee.AsReq), cm2(r.travee.AsProv), mN(r.travee.mrd.MRd)],
              [cont ? 'Appui' : 'Appui (constr.)', cont ? mN(an.Ma) : '—', <span className="font-sans">rectangulaire (bw)</span>, fr(r.geo.dA, 0), cont ? fr(r.appui.req.xi, 3) : '—', cont ? cm2(r.appui.req.As) : '—', cm2(r.appui.AsMin), cm2(r.appui.AsReq), cm2(r.appui.AsProv), mN(r.appui.mrd.MRd)],
            ]} />
          <p className="text-[12px] text-gray-600">Diagramme rectangulaire (λ = {fr(r.mat.lambda, 1)}, η = {fr(r.mat.eta, 1)}), fcd = {fr(r.mat.fcd, 2)} MPa, fyd = {fr(r.mat.fyd, 1)} MPa, ξlim = {fr(r.mat.xiLim, 3)}. As,min = max(0,26·fctm/fyk ; 0,0013)·bw·d, As,max = 0,04·Ac.</p>
        </>}

        {onglet === 'Effort tranchant' && <>
          <Tableau entetes={['Grandeur', 'Valeur', 'Détail']}
            lignes={[
              ['VEd', `${kN(r.tranchant.Ved)} kN`, `${an.coef.tranchant}·V0`],
              ['VRd,c', `${kN(r.tranchant.VRdc)} kN`, 'sans armature d’effort tranchant (§6.2.2)'],
              ['VRd,max', `${kN(r.tranchant.VRdmax)} kN`, `bielles, cot θ = ${fr(e.cotTheta, 2)}`],
              ['Étriers', `${e.nBrins} brins HA${e.phiEtrier}, e = ${fr(r.tranchant.etr.s / 10, 0)} cm`, `Asw/s ≥ ${fr(r.tranchant.etr.AswS * 1000, 3)} mm²/m`],
              ['VRd,s', `${kN(r.tranchant.etr.VRds)} kN`, 'treillis de Mörsch'],
              ['FE', `${kN(r.tranchant.FE)} kN`, `0,5·VEd·cot θ ≤ As·fyd = ${kN(r.tranchant.capaciteAppui)} kN`],
            ]} />
        </>}

        {onglet === 'ELS' && <>
          <Tableau entetes={['Zone', 'σc car. (MPa)', 'σs car. (MPa)', 'σs q-p (MPa)', 'Φ (mm)', 'Φ max (mm)']}
            lignes={[
              ['Travée', fr(r.els.travee.car.sigmaC, 1), fr(r.els.travee.car.sigmaS, 0), fr(r.els.travee.qp.sigmaS, 0), fr(r.els.travee.phi, 0), fr(r.els.travee.phiMax, 1)],
              ...(r.els.appui ? [['Appui', fr(r.els.appui.car.sigmaC, 1), fr(r.els.appui.car.sigmaS, 0), fr(r.els.appui.qp.sigmaS, 0), fr(r.els.appui.phi, 0), fr(r.els.appui.phiMax, 1)]] : []),
            ]} />
          <Tableau entetes={['Flèche', 'Valeur', 'Limite']}
            lignes={[
              ['Long terme (q-p, fluage et retrait)', `${fr(r.els.flecheCalc.delta, 1)} mm`, `L/${fr(e.flecheLimite, 0)} = ${fr(r.els.flecheCalc.limite, 1)} mm`],
              ['Instantanée (poids propre)', `${fr(r.els.flecheCalc.deltaAvant, 1)} mm`, '—'],
              ['Nuisible (après cloisons)', `${fr(r.els.flecheCalc.deltaNuisible, 1)} mm`, e.cloisonsFragiles ? `L/500 = ${fr(r.els.flecheCalc.limiteNuisible, 1)} mm` : 'non demandée'],
              ['Élancement L/d (indicatif)', fr(r.els.fleche.Ld, 1), `≤ ${fr(r.els.fleche.LdLimite, 1)}`],
            ]} />
          <p className="text-[12px] text-gray-600">φ(∞,t0) = {fr(r.els.flecheCalc.phi, 2)} · εcs = {fr(r.els.flecheCalc.epsCs * 1e6, 0)} µm/m · Ec,eff = {fr(r.els.flecheCalc.EcEff / 1000, 1)} GPa · ζ à mi-travée = {fr(r.els.flecheCalc.travee.zeta, 2)} · flèche maximale à x = {fr(r.els.flecheCalc.xMax / 1000, 2)} m.</p>
        </>}

        {onglet === 'Vérifications' && <ListeVerifications v={r.verifications} />}
      </div>
    </div>
  );
}
