/** Étapes de saisie : 1. Géométrie et charges ; 2. Matériaux et armatures (options avancées repliables). */
import { useEffect, useState } from 'react';
import type { ErreurSaisie, PlancherInput } from '../plancher/types';
import { CATEGORIES, CLASSES_BETON, EXPOSITIONS, categorie } from '../plancher/materiaux';
import { fr, type ResultatPlancher } from '../plancher/calcul';
import { proposerArmatures } from '../plancher/proposition';
import { DUREES_FEU } from '../plancher/feu';
import { ChampNombre, Liste, Case, Groupe } from './ui';

type Maj = <K extends keyof PlancherInput>(k: K, v: PlancherInput[K]) => void;
interface Props { e: PlancherInput; maj: Maj; erreurs: ErreurSaisie[]; r: ResultatPlancher }
const diametres = (l: number[]) => l.map(v => ({ v, l: `Φ${v}` }));
const cm2 = (mm2: number) => (Number.isFinite(mm2) ? fr(mm2 / 100, 2) : '∞');

export function EtapeDonnees({ e, maj, erreurs, r }: Props) {
  const err = (c: string) => erreurs.find(x => x.champ === c)?.message;
  const cat = categorie(e.categorie, e.annexe);
  return (
    <div className="grid gap-3 lg:grid-cols-2 items-start">
      <div>
        <Groupe titre="Poutrelle et entrevous">
          <Liste label="Appuis de la poutrelle" valeur={e.appui} options={[{ v: 'simple', l: 'isostatique (appuis simples)' }, { v: 'continu', l: 'continue (coefficients forfaitaires)' }]} onChange={v => maj('appui', v)}
            aide="Poutrelle continue : moments évalués par la méthode forfaitaire (0,8·M0 en travée de rive, 0,5·M0 ou 0,6·M0 sur appui intermédiaire). Elle suppose des travées voisines de portées comparables, une inertie constante et Q ≤ max(2G ; 5 kN/m²)." />
          {e.appui === 'continu' && <Liste label="Nombre de travées" valeur={e.nbTravees} options={[{ v: 2, l: '2 travées' }, { v: 3, l: '3 travées et plus' }]} onChange={v => maj('nbTravees', v)}
            aide="Le calcul porte sur la travée de rive, la plus défavorable. 2 travées : appui à 0,6·M0 et V à 1,15·V0 ; 3 travées et plus : 0,5·M0 et 1,1·V0." />}
          <ChampNombre label="Portée L (entre axes d'appuis)" unite="m" valeur={e.portee} onChange={v => maj('portee', v)} erreur={err('portee')} />
          <ChampNombre label="Entraxe des poutrelles b" unite="m" valeur={e.entraxe} onChange={v => maj('entraxe', v)} erreur={err('entraxe')} aide="Distance entre axes de deux poutrelles voisines (largeur de plancher reprise par une poutrelle)." />
          <ChampNombre label="Largeur de l'âme (talon) bw" unite="mm" valeur={e.bw} onChange={v => maj('bw', v)} erreur={err('bw')} />
          <ChampNombre label="Hauteur du corps creux" unite="mm" valeur={e.hCorps} onChange={v => maj('hCorps', v)} erreur={err('hCorps')} />
          <ChampNombre label="Dalle de compression hf" unite="mm" valeur={e.hf} onChange={v => maj('hf', v)} erreur={err('hf')} aide="40 mm minimum en usage courant." />
          <p className="text-[11.5px] text-gray-600 font-mono">h = {fr(r.geo.h, 0)} mm · beff = {fr(r.geo.beff, 0)} mm · d = {fr(r.geo.dT, 0)} mm</p>
        </Groupe>
      </div>
      <div>
        <Groupe titre="Charges">
          <Liste label="Catégorie d'usage" valeur={e.categorie} options={CATEGORIES.map(c => ({ v: c.code, l: c.code === 'perso' ? 'Personnalisée' : `${c.code} (${fr(categorie(c.code, e.annexe).qk ?? 0, 1)} kN/m²)` }))} onChange={v => maj('categorie', v)}
            aide="Valeurs recommandées de l'EN 1991-1-1 (tableau 6.2) et coefficients ψ de l'EN 1990. Avec « Annexe France » (paramètres nationaux, étape 2), la catégorie A passe à 1,5 kN/m² ; pour les autres catégories de l'Annexe nationale, choisir « Personnalisée »." />
          {cat.code === 'perso'
            ? <>
              <ChampNombre label={<>q<sub>k</sub></>} unite="kN/m²" valeur={e.qkPerso} onChange={v => maj('qkPerso', v)} erreur={err('qkPerso')} />
              <ChampNombre label={<>ψ<sub>2</sub></>} valeur={e.psi2Perso} onChange={v => maj('psi2Perso', v)} erreur={err('psi2Perso')} />
            </>
            : <p className="text-[11.5px] text-gray-500">{cat.libelle} : q<sub>k</sub> = {fr(cat.qk ?? 0, 2)} kN/m² · ψ<sub>2</sub> = {fr(cat.psi2, 1)}</p>}
          <ChampNombre label="Chape" unite="kN/m²" valeur={e.chape} onChange={v => maj('chape', v)} erreur={err('chape')} />
          <ChampNombre label="Revêtement de sol" unite="kN/m²" valeur={e.revetement} onChange={v => maj('revetement', v)} erreur={err('revetement')} />
          <ChampNombre label="Faux plafond" unite="kN/m²" valeur={e.fauxPlafond} onChange={v => maj('fauxPlafond', v)} erreur={err('fauxPlafond')} />
          <ChampNombre label="Cloisons (charge répartie équivalente)" unite="kN/m²" valeur={e.cloisons} onChange={v => maj('cloisons', v)} erreur={err('cloisons')} />
          <ChampNombre label="Poids des entrevous (0 = estimation)" unite="kN/m²" valeur={e.poidsEntrevous} onChange={v => maj('poidsEntrevous', v)} erreur={err('poidsEntrevous')}
            aide="Poids des entrevous par m² de plancher hors nervures. 0 : estimation de 0,6 kN/m² pour 160 mm (proportionnelle à la hauteur) ; saisir la valeur de la fiche du fabricant pour un calcul définitif." />
          <p className="text-[11.5px] text-gray-600 font-mono">G = {fr(r.charges.G0 + r.charges.Gp, 2)} kN/m² (poids propre {fr(r.charges.G0, 2)}{r.charges.poidsEntrevousAuto ? ', entrevous estimés' : ''}) · Q = {fr(r.charges.qk, 2)} kN/m² · pELU = {fr(r.charges.pELU, 2)} kN/m</p>
          {r.analyse.Qsurf > r.analyse.limiteQ && e.appui === 'continu' && <p role="alert" className="text-[11.5px] text-red-600">Q dépasse max(2·G ; 5 kN/m²) : méthode forfaitaire non applicable.</p>}
        </Groupe>
      </div>
    </div>
  );
}

function Besoin({ requis, fourni, ok }: { requis: number; fourni: number; ok: boolean }) {
  return <p className={`text-[11.5px] font-mono ${ok ? 'text-green-700' : 'text-red-600'}`}>As requis {cm2(requis)} cm² · fourni {cm2(fourni)} cm² {ok ? '✓' : '✗'}</p>;
}

export function EtapeArmatures({ e, maj, erreurs, r, appliquer }: Props & { appliquer: (x: Partial<PlancherInput>) => void }) {
  const err = (c: string) => erreurs.find(x => x.champ === c)?.message;
  const [avance, setAvance] = useState(false);
  const signale = erreurs.some(x => ['exposition', 'classeStructurale', 'deltaCdev', 'cnomSaisi', 'dg', 'RH', 't0', 'flecheLimite', 'nBrins', 'cotTheta'].includes(x.champ));
  useEffect(() => { if (signale) setAvance(true); }, [signale]);
  const proposition = proposerArmatures(r);
  const proposer = () => appliquer({
    ...(proposition.travee ? { nbTravee: proposition.travee.nb, phiTravee: proposition.travee.phi } : {}),
    ...(proposition.appui ? { nbAppui: proposition.appui.nb, phiAppui: proposition.appui.phi } : {}),
  });
  const cont = e.appui === 'continu';
  return (
    <div className="grid gap-3 lg:grid-cols-2 items-start">
      <div>
        <Groupe titre="Matériaux">
          <Liste label="Béton" valeur={e.fck} options={CLASSES_BETON.map(c => ({ v: c.fck, l: c.label }))} onChange={v => maj('fck', v)} />
          <Liste label="Acier" valeur={e.fyk} options={[{ v: 500, l: 'B500' }, { v: 400, l: 'B400' }]} onChange={v => maj('fyk', v)} />
          <Liste label="Paramètres nationaux" valeur={e.annexe} options={[{ v: 'EC2', l: 'Valeurs recommandées' }, { v: 'FR', l: 'Annexe France' }]} onChange={v => maj('annexe', v)}
            aide="Annexe France : qk de la catégorie A = 1,5 kN/m² (NF EN 1991-1-1/NA, tableau 6.2) et wmax en XD/XS (tableau 7.1NF). Les autres paramètres restent ceux de l'EN." />
          <Liste label="Exposition" valeur={e.exposition} options={EXPOSITIONS.map(v => ({ v, l: v }))} onChange={v => maj('exposition', v)} />
          <p className="text-[11.5px] text-gray-600">Enrobage nominal : <strong>{fr(r.mat.cNom, 0)} mm</strong> ({e.enrobageMode === 'calcule' ? `calculé, ${e.exposition} S${r.mat.classeS}` : 'saisi'})</p>
          <Case label="Vérifier la résistance au feu (EN 1992-1-2)" valeur={e.feu} onChange={v => maj('feu', v)} aide="Valeurs tabulées de la nervure assimilée à une poutre (tableaux 5.5 et 5.6) : largeur, distance de l'axe des armatures au parement. Protection des entrevous, critères E et I et dalle de compression non vérifiés." />
          {e.feu && <Liste label="Durée de résistance au feu" valeur={e.resistanceFeu} options={DUREES_FEU.map(d => ({ v: d, l: `R${d}` }))} onChange={v => maj('resistanceFeu', v)} />}
          {e.feu && r.feu && <p className={`text-[11.5px] font-mono ${r.feu.ok ? 'text-green-700' : 'text-red-600'}`}>a = {fr(r.feu.a, 1)} mm · requis {r.feu.aRequis === null ? 'bw < bmin' : `${fr(r.feu.aCoinRequis ?? r.feu.aRequis, 1)} mm`} {r.feu.ok ? '✓' : '✗'}</p>}
        </Groupe>
        <Groupe titre="Armatures"
          action={<button type="button" onClick={proposer} disabled={!proposition.travee} className="text-[12px] font-semibold text-primary disabled:opacity-40" title="Plus petite section de barres couvrant la section requise">Proposer des armatures</button>}>
          <ChampNombre label="Barres de travée : nombre" valeur={e.nbTravee} onChange={v => maj('nbTravee', v)} erreur={err('nbTravee')} />
          <Liste label="Barres de travée : diamètre" valeur={e.phiTravee} options={diametres([8, 10, 12, 14, 16, 20, 25])} onChange={v => maj('phiTravee', v)} />
          <Besoin requis={r.travee.AsReq} fourni={r.travee.AsProv} ok={r.travee.flexionOk} />
          <ChampNombre label={cont ? 'Chapeaux sur appui : nombre' : "Chapeaux de construction : nombre par appui"} valeur={e.nbAppui} onChange={v => maj('nbAppui', v)} erreur={err('nbAppui')} />
          <Liste label="Chapeaux : diamètre" valeur={e.phiAppui} options={diametres([8, 10, 12, 14, 16, 20])} onChange={v => maj('phiAppui', v)} />
          <Besoin requis={r.appui.AsReq} fourni={r.appui.AsProv} ok={r.appui.flexionOk} />
          <Liste label="Étriers : diamètre" valeur={e.phiEtrier} options={diametres([5, 6, 8, 10])} onChange={v => maj('phiEtrier', v)} />
          <Liste label="Étriers : brins" valeur={e.nBrins} options={[{ v: 2, l: '2 brins (étrier triangulaire)' }, { v: 4, l: '4 brins' }]} onChange={v => maj('nBrins', v)} />
          <p className="text-[11.5px] text-gray-600 font-mono">Espacement retenu e = {fr(r.tranchant.etr.s / 10, 0)} cm (VRd,s = {fr(r.tranchant.etr.VRds / 1e3, 1)} kN ≥ VEd = {fr(r.tranchant.Ved / 1e3, 1)} kN)</p>
        </Groupe>
      </div>
      <div>
        <section className={`rounded-lg border bg-white mb-3 ${signale ? 'border-red-300' : 'border-gray-200'}`}>
          <button type="button" aria-expanded={avance} aria-controls="options-avancees" onClick={() => setAvance(!avance)} className="w-full flex items-center justify-between px-3 py-2 text-left">
            <span><span className="text-[12.5px] font-semibold text-gray-800">Options avancées</span>
              {signale && <span className="ml-2 text-[10.5px] font-bold text-red-600 bg-red-50 rounded px-1.5 py-0.5">À corriger</span>}
              <span className="block text-[11px] text-gray-500">S{r.mat.classeS} · Δcdev {e.deltaCdev} · cot θ {fr(e.cotTheta, 1)} · RH {e.RH} % · t0 {e.t0} j · L/{e.flecheLimite}</span></span>
            <span className="text-[11.5px] font-semibold text-primary">{avance ? 'Masquer ▴' : 'Afficher ▾'}</span>
          </button>
          {avance && (
            <div id="options-avancees" role="region" aria-label="Options avancées" className="px-3 pb-3 space-y-1">
              <p className="text-[11px] font-bold uppercase text-gray-500 pt-1">Durabilité et enrobage (§4.4.1)</p>
              <Liste label="Classe structurale" valeur={e.classeStructurale} options={[{ v: 0, l: 'automatique (tab. 4.3N)' }, ...[1, 2, 3, 4, 5, 6].map(v => ({ v, l: `S${v}` }))]} onChange={v => maj('classeStructurale', v)} />
              <Case label="Durée d'utilisation de projet de 100 ans" valeur={e.dureeVie100} onChange={v => maj('dureeVie100', v)} aide="Tableau 4.3N : classe structurale majorée de 2." />
              <Case label="Contrôle spécial de la production du béton" valeur={e.controleProductionSpecial} onChange={v => maj('controleProductionSpecial', v)} aide="Tableau 4.3N : classe structurale minorée de 1." />
              <ChampNombre label="Δcdev" unite="mm" valeur={e.deltaCdev} onChange={v => maj('deltaCdev', v)} erreur={err('deltaCdev')} aide="10 mm recommandé (§4.4.1.3)." />
              <Liste label="Enrobage" valeur={e.enrobageMode} options={[{ v: 'calcule', l: 'calculé' }, { v: 'saisi', l: 'saisi' }]} onChange={v => maj('enrobageMode', v)} />
              {e.enrobageMode === 'saisi' && <ChampNombre label="cnom (au nu des étriers)" unite="mm" valeur={e.cnomSaisi} onChange={v => maj('cnomSaisi', v)} erreur={err('cnomSaisi')} />}
              <ChampNombre label="Granulat dg" unite="mm" valeur={e.dg} onChange={v => maj('dg', v)} erreur={err('dg')} />
              <p className="text-[11px] font-bold uppercase text-gray-500 pt-2">Effort tranchant</p>
              <ChampNombre label="cot θ" valeur={e.cotTheta} onChange={v => maj('cotTheta', v)} erreur={err('cotTheta')} aide="1 ≤ cot θ ≤ 2,5 (§6.2.3(2))." />
              <p className="text-[11px] font-bold uppercase text-gray-500 pt-2">Fluage, retrait, flèche (annexe B, §7.4)</p>
              <ChampNombre label="Humidité relative" unite="%" valeur={e.RH} onChange={v => maj('RH', v)} erreur={err('RH')} />
              <ChampNombre label="Âge au chargement t0" unite="j" valeur={e.t0} onChange={v => maj('t0', v)} erreur={err('t0')} />
              <ChampNombre label="Flèche limite L/…" valeur={e.flecheLimite} onChange={v => maj('flecheLimite', v)} erreur={err('flecheLimite')} aide="L/250 (§7.4.1(4))." />
              <Case label="Cloisons ou revêtements fragiles (flèche L/500)" valeur={e.cloisonsFragiles} onChange={v => maj('cloisonsFragiles', v)} aide="§7.4.1(5) : flèche après la pose des éléments fragiles ≤ L/500 (seul le poids propre est supposé appliqué avant la pose)." />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
