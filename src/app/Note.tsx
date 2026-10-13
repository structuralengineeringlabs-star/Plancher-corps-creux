/**
 * Note de calcul du plancher à corps creux : sections numérotées, équations avec leurs valeurs, dessins, vérifications,
 * conclusion et annexe des données (mise en page commune : NoteStructuree).
 */
import type { ResultatPlancher } from '../plancher/calcul';
import { fr } from '../plancher/calcul';
import { libelleAcier, libelleBeton } from '../plancher/materiaux';
import type { Identification } from './store';
import { CoupeTransversale, Diagramme, Elevation } from './dessins';
import { ListeVerifications } from './Resultats';
import NoteStructuree, { type SectionNote } from './NoteStructuree';

/** Empreinte FNV-1a 32 bits des données d'entrée (identifie le calcul). */
export function empreinte(o: unknown): string {
  let h = 0x811c9dc5;
  for (const ch of JSON.stringify(o)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).toUpperCase().padStart(8, '0');
}

const mN = (n: number, d = 2) => fr(n / 1e6, d);
const cm2 = (mm2: number) => (Number.isFinite(mm2) ? fr(mm2 / 100, 2) : '∞');

export default function Note({ r, id, niveau, onFermer }: { r: ResultatPlancher; id: Identification; niveau: 'complet' | 'synthese'; onFermer: () => void }) {
  const e = r.entree, m = r.mat, an = r.analyse, g = r.geo, ch = r.charges, tr = r.tranchant;
  const complet = niveau === 'complet';
  const cont = e.appui === 'continu';
  const sections: SectionNote[] = [
    { titre: 'Hypothèses et références', contenu: () => <>
      <p>NF EN 1990 (combinaison fondamentale 1,35·G + 1,5·Q), NF EN 1991-1-1, NF EN 1992-1-1:2005 et amendements ; paramètres {e.annexe === 'FR' ? "de l'Annexe nationale française (wmax)" : 'recommandés'}.
        Une poutrelle représentative est étudiée, avec sa largeur tributaire (entraxe) ; section en T (dalle de compression participante, §5.3.2.1) ; {cont ? `poutrelle continue : méthode forfaitaire (travée de rive), applicable sous réserve de Q ≤ max(2·G ; 5 kN/m²), de travées voisines de portées comparables et d'une inertie constante` : 'poutrelle isostatique sur appuis simples'}.</p>
      <p><strong>Périmètre du verdict.</strong> Vérifié : {r.perimetre.verifie.join(' ; ')}. Non couvert : {r.perimetre.nonVerifie.join(' ; ')}.</p>
    </> },
    { titre: 'Données', contenu: o => <>
      {o.tab('Géométrie et matériaux', <table className="note-t"><tbody>
        <tr><td>Poutrelle</td><td>{cont ? `continue (${e.nbTravees === 2 ? '2 travées' : '3 travées et plus'})` : 'isostatique'} ; portée L = {fr(e.portee, 2)} m ; entraxe b = {fr(g.b, 0)} mm</td></tr>
        <tr><td>Section</td><td>bw = {e.bw} mm, entrevous {e.hCorps} mm, dalle hf = {e.hf} mm, h = {g.h} mm ; beff = {fr(g.beff, 0)} mm (l0 = {fr(g.l0, 0)} mm, §5.3.2.1)</td></tr>
        <tr><td>Béton</td><td>{libelleBeton(e.fck)} : fcd = {e.fck} / 1,5 = {fr(m.fcd, 2)} MPa ; fctm = {fr(m.fctm, 2)} MPa ; Ecm = {fr(m.Ecm / 1000, 1)} GPa</td></tr>
        <tr><td>Acier</td><td>{libelleAcier(e.fyk)} : fyd = {e.fyk} / 1,15 = {fr(m.fyd, 1)} MPa</td></tr>
        <tr><td>Enrobage</td><td>{e.exposition}, S{m.classeS} : cmin = max({m.cMinB} ; {m.cMinDur} ; 10) = {m.cMin} mm ; cnom = {fr(m.cNom, 0)} mm</td></tr>
        <tr><td>Armatures</td><td>{e.nbTravee} HA{e.phiTravee} en travée ; {e.nbAppui} HA{e.phiAppui} {cont ? 'sur appui' : 'de construction par appui'} ; étriers {e.nBrins} brins HA{e.phiEtrier}</td></tr>
      </tbody></table>)}
    </> },
    { titre: 'Charges et combinaisons', contenu: o => <>
      {o.tab('Descente de charges', <table className="note-t"><thead><tr><th>Poste</th><th>kN/m²</th></tr></thead><tbody>
        <tr><td>Poids propre (dalle + nervure + entrevous{ch.poidsEntrevousAuto ? ', estimés' : ''})</td><td>{fr(ch.G0, 2)}</td></tr>
        <tr><td>Chape / revêtement / faux plafond / cloisons</td><td>{fr(e.chape, 2)} / {fr(e.revetement, 2)} / {fr(e.fauxPlafond, 2)} / {fr(e.cloisons, 2)}</td></tr>
        <tr><td><strong>G</strong></td><td><strong>{fr(ch.G0 + ch.Gp, 2)}</strong></td></tr>
        <tr><td><strong>Q</strong> ({ch.categorieLibelle})</td><td><strong>{fr(ch.qk, 2)}</strong></td></tr>
      </tbody></table>)}
      {o.eq('EN 1990 §6.4.3.2', <>pELU = 1,35·g + 1,5·q = 1,35 × {fr(ch.g, 2)} + 1,5 × {fr(ch.q, 2)} = {fr(ch.pELU, 3)} kN/m</>)}
      {o.eq('EN 1990 §6.5.3', <>pELS = {fr(ch.pELS, 3)} kN/m ; p quasi-permanente = g + ψ2·q = {fr(ch.pQP, 3)} kN/m (ψ2 = {fr(ch.psi2, 1)})</>)}
    </> },
    { titre: 'Sollicitations', contenu: o => <>
      {complet && o.eq('méthode forfaitaire', <>M0 = pELU·L²/8 = {fr(ch.pELU, 3)} × {fr(an.L / 1000, 2)}² / 8 = {mN(an.M0)} kN·m ; V0 = pELU·L/2 = {fr(an.V0 / 1e3, 2)} kN</>)}
      {o.eq(cont ? 'méthode forfaitaire' : 'statique', <>MEd,travée = {an.coef.travee}·M0 = {mN(an.Mt)} kN·m{cont ? <> ; MEd,appui = {an.coef.appui}·M0 = {mN(an.Ma)} kN·m ; VEd = {an.coef.tranchant}·V0 = {fr(an.Ved / 1e3, 2)} kN</> : <> ; VEd = V0 = {fr(an.Ved / 1e3, 2)} kN</>}</>)}
      {o.fig('Diagramme du moment fléchissant', <Diagramme r={r} type="M" />)}
      {o.fig("Diagramme de l'effort tranchant", <Diagramme r={r} type="V" hauteur={170} />)}
    </> },
    { titre: 'Flexion', contenu: o => <>
      {complet && o.eq('§6.1', <>Travée : MEd = {mN(an.Mt)} kN·m ; d = {fr(g.dT, 0)} mm ; section {r.travee.req.mode === 'T' ? 'en T (axe neutre dans la nervure)' : 'rectangulaire de largeur beff (axe neutre dans la dalle)'} ; xu/d = {fr(r.travee.req.xi, 3)} ≤ ξlim = {fr(m.xiLim, 3)}</>)}
      {o.eq('§9.2.1.1', <>As,calc = {cm2(r.travee.AsCalc)} cm² ; As,min = {cm2(r.travee.AsMin)} cm² → As,req = {cm2(r.travee.AsReq)} cm² ; retenu {e.nbTravee} HA{e.phiTravee} = {cm2(r.travee.AsProv)} cm² ; MRd = {mN(r.travee.mrd.MRd)} kN·m ≥ MEd</>)}
      {cont
        ? o.eq('§6.1', <>Appui : MEd = {mN(an.Ma)} kN·m ; d = {fr(g.dA, 0)} mm ; As,req = {cm2(r.appui.AsReq)} cm² ; retenu {e.nbAppui} HA{e.phiAppui} = {cm2(r.appui.AsProv)} cm² ; MRd = {mN(r.appui.mrd.MRd)} kN·m</>)
        : o.eq('§9.2.1.2(1)', <>Chapeaux de construction : As ≥ max(As,min ; 0,15·As travée) = {cm2(r.appui.AsReq)} cm² ; retenu {e.nbAppui} HA{e.phiAppui} = {cm2(r.appui.AsProv)} cm²</>)}
    </> },
    { titre: 'Effort tranchant', contenu: o => <>
      {complet && o.eq('éq. 6.2, 6.9, 6.8', <>VRd,c = [CRd,c·k·(100ρl·fck)^1/3]·bw·d ≥ vmin·bw·d ; VRd,max = bw·z·ν1·fcd/(cot θ + tan θ) ; Asw/s = VEd/(z·fywd·cot θ)</>)}
      {o.tab('Effort tranchant et étriers', <table className="note-t"><thead><tr><th>VEd (kN)</th><th>VRd,c (kN)</th><th>VRd,max (kN)</th><th>cot θ</th><th>Étriers</th><th>VRd,s (kN)</th><th>FE (kN)</th></tr></thead><tbody>
        <tr><td>{fr(tr.Ved / 1e3, 1)}</td><td>{fr(tr.VRdc / 1e3, 1)}</td><td>{fr(tr.VRdmax / 1e3, 1)}</td><td>{fr(e.cotTheta, 2)}</td><td>{e.nBrins} brins HA{e.phiEtrier}, e = {fr(tr.etr.s / 10, 0)} cm</td><td>{fr(tr.etr.VRds / 1e3, 1)}</td><td>{fr(tr.FE / 1e3, 1)}</td></tr>
      </tbody></table>)}
    </> },
    { titre: 'Dispositions constructives', contenu: o => <>
      {o.fig('Coupes transversales avec étrier triangulaire fermé', <div className="flex flex-wrap gap-4 justify-center"><CoupeTransversale r={r} vue="travee" taille={250} /><CoupeTransversale r={r} vue="appui" taille={250} /></div>)}
      {o.fig('Élévation de la poutrelle (hauteur dilatée)', <Elevation r={r} />)}
      <ul>
        <li>Ancrage des barres de travée : lbd = {fr(r.disp.lbdTravee, 0)} mm à chaque about (§8.4.4).</li>
        <li>Espacement libre des barres de travée : {r.disp.espacement.sLibre === null ? 'une seule barre' : `${fr(r.disp.espacement.sLibre, 0)} mm`} ≥ {fr(r.disp.espacement.sMin, 0)} mm (§8.2(2)).</li>
        <li>Étriers : e = {fr(tr.etr.s, 0)} mm ≤ 0,75·d = {fr(tr.etr.sMax, 0)} mm ; ρw = {fr(tr.rhoW * 1000, 2)} ‰ ≥ {fr(tr.rhoWmin * 1000, 2)} ‰ (§9.2.2).</li>
        <li>Traction à l'appui d'about : FE = 0,5·VEd·cot θ = {fr(tr.FE / 1e3, 1)} kN ≤ As·fyd = {fr(tr.capaciteAppui / 1e3, 1)} kN (§9.2.1.4).</li>
      </ul>
      {o.tab('Nomenclature et métré', <table className="note-t"><thead><tr><th>Rep.</th><th>Désignation</th><th>Nb</th><th>L (m)</th><th>Masse (kg)</th></tr></thead><tbody>
        {r.nomenclature.reperes.map(x => <tr key={x.rep}><td>{x.rep}</td><td>{x.designation}</td><td>{x.nb}</td><td>{fr(x.longueur, 2)}</td><td>{fr(x.masse, 1)}</td></tr>)}
        <tr><td colSpan={4}><strong>Total</strong> ({fr(r.nomenclature.ratioSurface, 2)} kg/m²)</td><td><strong>{fr(r.nomenclature.masseTotale, 1)}</strong></td></tr>
      </tbody></table>)}
    </> },
    { titre: 'États limites de service', contenu: o => <>
      {o.tab('Contraintes et fissuration', <table className="note-t"><thead><tr><th>Zone</th><th>σc car. (MPa)</th><th>σs car. (MPa)</th><th>σs q-p (MPa)</th><th>Φ / Φmax (mm)</th></tr></thead><tbody>
        <tr><td>Travée</td><td>{fr(r.els.travee.car.sigmaC, 1)}</td><td>{fr(r.els.travee.car.sigmaS, 0)}</td><td>{fr(r.els.travee.qp.sigmaS, 0)}</td><td>{fr(r.els.travee.phi, 0)} / {fr(r.els.travee.phiMax, 1)}</td></tr>
        {r.els.appui && <tr><td>Appui</td><td>{fr(r.els.appui.car.sigmaC, 1)}</td><td>{fr(r.els.appui.car.sigmaS, 0)}</td><td>{fr(r.els.appui.qp.sigmaS, 0)}</td><td>{fr(r.els.appui.phi, 0)} / {fr(r.els.appui.phiMax, 1)}</td></tr>}
      </tbody></table>)}
      {complet && o.eq('§7.4.3, éq. 7.18', <>1/r = ζ/r_II + (1 − ζ)/r_I, ζ = 1 − β·(Mcr/M)² ; φ = {fr(r.els.flecheCalc.phi, 2)}, Ec,eff = {fr(r.els.flecheCalc.EcEff / 1000, 1)} GPa, εcs = {fr(r.els.flecheCalc.epsCs * 1e6, 0)} µm/m</>)}
      {o.tab('Flèches', <table className="note-t"><thead><tr><th>Flèche</th><th>Valeur (mm)</th><th>Limite (mm)</th></tr></thead><tbody>
        <tr><td>Long terme (quasi-permanente)</td><td>{fr(r.els.flecheCalc.delta, 1)}</td><td>L/{e.flecheLimite} = {fr(r.els.flecheCalc.limite, 1)}</td></tr>
        {e.cloisonsFragiles && <tr><td>Nuisible (après cloisons)</td><td>{fr(r.els.flecheCalc.deltaNuisible, 1)}</td><td>L/500 = {fr(r.els.flecheCalc.limiteNuisible, 1)}</td></tr>}
        <tr><td>Élancement L/d (indicatif)</td><td>{fr(r.els.fleche.Ld, 1)}</td><td>{fr(r.els.fleche.LdLimite, 1)}</td></tr>
      </tbody></table>)}
    </> },
    { titre: 'Récapitulatif des vérifications', contenu: () => <>
      <ListeVerifications v={r.verifications} />
      {r.avertissements.length > 0 && <><h3>Observations</h3><ul>{r.avertissements.map((a, i) => <li key={i}>{a}</li>)}</ul></>}
    </> },
  ];
  return <NoteStructuree id={id} typeElement="plancher à corps creux" verdict={r.verdict} perimetre={r.perimetre} sections={sections} annexe={e} onFermer={onFermer}
    sousTitre={`Plancher à corps creux EC2 — ${cont ? 'poutrelle continue' : 'poutrelle isostatique'}, L = ${fr(e.portee, 2)} m, ${g.h} mm, ${libelleBeton(e.fck)}`} />;
}
