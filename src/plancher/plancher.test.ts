import { describe, expect, it } from 'vitest';
import { CAS, conforme, ecart } from './casValidation';
import { calculerPlancher } from './calcul';
import { PAR_DEFAUT, valider } from './validation';
import { charges, poidsEntrevousAuto } from './charges';
import { geometrieEtrier } from './nomenclature';
import { facteurTable, flecheLd, phiMaxFissuration } from './els';
import { flecheMax, courbure } from './fleche';
import { largeurParticipante } from './flexion';
import { materiaux } from './materiaux';
import type { PlancherInput } from './types';

const cas = (p: Partial<PlancherInput>) => calculerPlancher({ ...PAR_DEFAUT, ...p });

describe('Cahier de validation', () => {
  for (const c of CAS) {
    it(`${c.id} — ${c.grandeur}`, () => {
      expect(Math.abs(ecart(c)), `obtenu ${c.obtenu()} / référence ${c.reference}`).toBeLessThanOrEqual(c.tolerance + 1e-9);
      expect(conforme(c)).toBe(true);
    });
  }
});

describe('Exemple par défaut', () => {
  const r = cas({});
  it('est conforme', () => {
    expect(r.erreurs).toEqual([]);
    expect(r.verdict).toBe('OK');
    expect(r.verifications.filter(v => v.bloquant && !v.ok)).toEqual([]);
  });
  it('contient toutes les vérifications attendues', () => {
    const ids = r.verifications.map(v => v.id);
    for (const id of ['D1', 'D3', 'F-T', 'DUC-T', 'F-A', 'V-MAX', 'V-S', 'V-FE', 'ESP', 'S-MAX', 'RHO-W', 'ANC', 'SS-T', 'SS-A', 'FISS-T', 'FISS-A', 'FL', 'FN', 'LD']) expect(ids).toContain(id);
  });
  it('est déterministe', () => {
    expect(JSON.stringify(cas({}))).toBe(JSON.stringify(r));
  });
});

describe('Poutrelle isostatique', () => {
  it('pas de vérification sur appui calculée, chapeaux de construction (2 par appui)', () => {
    const r = cas({ appui: 'simple' });
    expect(r.appui.calcule).toBe(false);
    expect(r.nomenclature.nbChapeaux).toBe(2 * PAR_DEFAUT.nbAppui);
    expect(r.verifications.find(v => v.id === 'D3')).toBeUndefined();
    expect(r.analyse.Ma).toBe(0);
  });
  it('la flèche est supérieure à celle de la poutrelle continue (même section)', () => {
    expect(cas({ appui: 'simple' }).els.flecheCalc.delta).toBeGreaterThan(cas({}).els.flecheCalc.delta);
  });
  it('portée de 4 m avec 2HA12 : flèche nuisible non vérifiée (cloisons fragiles)', () => {
    const r = cas({ appui: 'simple' });
    expect(r.verifications.find(v => v.id === 'FN')!.ok).toBe(false);
    expect(r.verdict).toBe('KO');
  });
});

describe('Domaine de la méthode forfaitaire', () => {
  it('Q > max(2G ; 5) → KO bloquant', () => {
    const r = cas({ categorie: 'perso', qkPerso: 12 });
    expect(r.verifications.find(v => v.id === 'D3')!.ok).toBe(false);
    expect(r.verdict).toBe('KO');
  });
  it('2 travées : coefficients 0,6 et 1,15', () => {
    const r = cas({ nbTravees: 2 });
    expect(r.analyse.coef).toEqual({ travee: 0.8, appui: 0.6, tranchant: 1.15 });
  });
});

describe('Monotonie et sensibilité', () => {
  it('la section d\'acier de travée requise croît avec la portée', () => {
    let prec = 0;
    for (const L of [3, 3.5, 4, 4.5, 5]) {
      const a = cas({ portee: L }).travee.AsCalc;
      expect(a).toBeGreaterThan(prec);
      prec = a;
    }
  });
  it('la flèche croît avec la portée et décroît avec la hauteur du corps creux', () => {
    expect(cas({ portee: 5 }).els.flecheCalc.delta).toBeGreaterThan(cas({ portee: 4 }).els.flecheCalc.delta);
    expect(cas({ hCorps: 250 }).els.flecheCalc.delta).toBeLessThan(cas({ hCorps: 200 }).els.flecheCalc.delta);
  });
  it('plus d\'acier de travée → moment résistant plus grand, flèche plus petite', () => {
    const a = cas({ nbTravee: 2, phiTravee: 12 }), b = cas({ nbTravee: 3, phiTravee: 12 });
    expect(b.travee.mrd.MRd).toBeGreaterThan(a.travee.mrd.MRd);
    expect(b.els.flecheCalc.delta).toBeLessThan(a.els.flecheCalc.delta);
  });
  it('section d\'acier insuffisante → KO sur la flexion', () => {
    const r = cas({ portee: 6, nbTravee: 1, phiTravee: 8 });
    expect(r.travee.flexionOk).toBe(false);
    expect(r.verdict).toBe('KO');
  });
  it('flexion très forte : section insuffisante sans armatures comprimées', () => {
    const r = cas({ portee: 12, categorie: 'perso', qkPerso: 10, bw: 60, hCorps: 80, hf: 30 });
    expect(r.travee.req.insuffisante).toBe(true);
    expect(r.travee.AsReq).toBe(Infinity);
    expect(r.verdict).toBe('KO');
  });
});

describe('Charges', () => {
  it('poids des entrevous estimé proportionnel à la hauteur', () => {
    expect(poidsEntrevousAuto(160)).toBeCloseTo(0.6, 12);
    expect(poidsEntrevousAuto(200)).toBeCloseTo(0.75, 12);
  });
  it('poids saisi prioritaire', () => {
    expect(charges({ ...PAR_DEFAUT, poidsEntrevous: 1 }).poidsEntrevousAuto).toBe(false);
    expect(charges({ ...PAR_DEFAUT, poidsEntrevous: 1 }).poidsEntrevous).toBe(1);
  });
  it('catégorie personnalisée', () => {
    const c = charges({ ...PAR_DEFAUT, categorie: 'perso', qkPerso: 3.5, psi2Perso: 0.6 });
    expect(c.qk).toBe(3.5);
    expect(c.psi2).toBe(0.6);
  });
});

describe('Validation des saisies', () => {
  it('une valeur hors bornes est signalée et ramenée dans les bornes → verdict NV', () => {
    const r = cas({ portee: 50 });
    expect(r.erreurs.some(e => e.champ === 'portee')).toBe(true);
    expect(r.entree.portee).toBe(12);
    expect(r.verdict).toBe('NV');
  });
  it('NaN → valeur par défaut, pas de NaN dans le résultat', () => {
    const r = cas({ portee: NaN });
    expect(r.entree.portee).toBe(PAR_DEFAUT.portee);
    expect(JSON.stringify(r.analyse)).not.toContain('null');
  });
  it('âme plus large que l\'entraxe signalée', () => {
    expect(valider({ ...PAR_DEFAUT, entraxe: 0.3, bw: 300 }).erreurs.some(e => e.champ === 'bw')).toBe(true);
  });
  it('classe de béton / acier inconnus', () => {
    expect(valider({ ...PAR_DEFAUT, fck: 99 }).erreurs.some(e => e.champ === 'fck')).toBe(true);
    expect(valider({ ...PAR_DEFAUT, fyk: 460 }).erreurs.some(e => e.champ === 'fyk')).toBe(true);
  });
});

describe('Enrobage', () => {
  it('saisi inférieur au minimum → D1 en défaut', () => {
    const r = cas({ enrobageMode: 'saisi', cnomSaisi: 15 });
    expect(r.verifications.find(v => v.id === 'D1')!.ok).toBe(false);
  });
  it('XC3 (S4) : enrobage plus grand que XC1', () => {
    expect(materiaux({ ...PAR_DEFAUT, exposition: 'XC3' }).cNom).toBeGreaterThanOrEqual(materiaux(PAR_DEFAUT).cNom);
  });
});

describe('Tranchant', () => {
  it('étriers : espacement arrondi au cm inférieur, entre 5 et 30 cm', () => {
    const r = cas({});
    expect(r.tranchant.etr.s % 10).toBe(0);
    expect(r.tranchant.etr.s).toBeGreaterThanOrEqual(50);
    expect(r.tranchant.etr.s).toBeLessThanOrEqual(300);
  });
  it('VRd,s ≥ VEd avec l\'espacement retenu (cas courant)', () => {
    const r = cas({});
    expect(r.tranchant.etr.VRds).toBeGreaterThanOrEqual(r.tranchant.Ved);
  });
});

describe('Fissuration', () => {
  it('Φ*s décroît avec σs et avec wmax', () => {
    expect(phiMaxFissuration(200, 0.4)).toBeGreaterThan(phiMaxFissuration(300, 0.4));
    expect(phiMaxFissuration(250, 0.4)).toBeGreaterThan(phiMaxFissuration(250, 0.3));
    expect(phiMaxFissuration(250, 0.3)).toBeGreaterThan(phiMaxFissuration(250, 0.2));
  });
  it('au-delà de 450 MPa, plus de diamètre admissible', () => {
    expect(phiMaxFissuration(500, 0.4)).toBe(0);
  });
});

describe('Largeur participante et élancement', () => {
  it('beff plafonnée par l\'entraxe', () => {
    expect(largeurParticipante(600, 120, 10000)).toBe(600);
  });
  it('beff réduite quand la portée est petite', () => {
    expect(largeurParticipante(1200, 120, 1000)).toBeLessThan(1200);
  });
  it('F1 : 1,0 pour beff/bw ≤ 1, 0,8 pour beff/bw ≥ 3, linéaire entre', () => {
    expect(facteurTable(100, 100)).toBe(1);
    expect(facteurTable(300, 100)).toBeCloseTo(0.8, 12);
    expect(facteurTable(200, 100)).toBeCloseTo(0.9, 12);
    expect(facteurTable(900, 100)).toBe(0.8);
  });
  it('flecheLd : section insuffisante → non vérifié', () => {
    expect(flecheLd({ L: 4000, d: 200, fck: 25, fyk: 500, AsReq: Infinity, AsProv: 300, aireBeton: 1e5, F1: 1, continu: false }).ok).toBe(false);
  });
});

describe('Flèche : intégration de la courbure', () => {
  it('courbure constante → flèche κ·L²/8 à mi-travée', () => {
    const L = 5000, k = 1e-6;
    const { fMax } = flecheMax(L, () => k, 48);
    expect(fMax).toBeCloseTo(k * L * L / 8, 4);
  });
  it('section non fissurée sous faible moment : κ = M/(Ec·I) + retrait', () => {
    const s = { bw: 120, h: 240, beff: 600, hf: 40 };
    const c = courbure(1e5, s, 226, 203, 2.56, 31000, 0);
    expect(c.zeta).toBe(0);
    expect(c.kappa).toBeCloseTo(c.kappaI, 15);
    expect(c.kappa).toBeGreaterThan(0);
  });
  it('moment négatif → courbure négative', () => {
    const s = { bw: 120, h: 240, beff: 600, hf: 40 };
    expect(courbure(-5e6, s, 157, 204, 2.56, 31000, 0).kappa).toBeLessThan(0);
  });
});

describe('Nomenclature', () => {
  it('étrier triangulaire : développée = A + 2·côté + 2 × 10Φ', () => {
    const g = geometrieEtrier(PAR_DEFAUT, 25);
    expect(g.A).toBe(70);
    expect(g.B).toBe(190);
    expect(g.developpee).toBeCloseTo(70 + 2 * Math.hypot(35, 190) + 120, 9);
  });
  it('nombre d\'étriers = ⌊L/e⌋ + 1 et masse totale = somme des repères', () => {
    const r = cas({});
    expect(r.nomenclature.nombreEtriers).toBe(Math.floor(4000 / r.tranchant.etr.s) + 1);
    expect(r.nomenclature.masseTotale).toBeCloseTo(r.nomenclature.reperes.reduce((s, x) => s + x.masse, 0), 9);
  });
  it('masse d\'une barre HA12 de 1 m : 0,888 kg', () => {
    const r = cas({ nbTravee: 1, portee: 4 });
    const barre = r.nomenclature.reperes[0];
    expect(barre.masse / (barre.nb * barre.longueur)).toBeCloseTo(0.888, 3);
  });
  it('ratio kg/m² = masse / (L × entraxe)', () => {
    const r = cas({});
    expect(r.nomenclature.ratioSurface).toBeCloseTo(r.nomenclature.masseTotale / (4 * 0.6), 9);
  });
});

describe('Périmètre', () => {
  it('le verdict annonce ce qui n\'est pas vérifié', () => {
    const r = cas({});
    expect(r.perimetre.nonVerifie.length).toBeGreaterThan(0);
    expect(r.perimetre.verifie.length).toBeGreaterThan(0);
  });
});

describe('Proposition d\'armatures', () => {
  it('propose une section suffisante, conforme à l\'espacement, et minimale', async () => {
    const { proposerArmatures } = await import('./proposition');
    const r = cas({ portee: 4.5 });
    const p = proposerArmatures(r);
    expect(p.travee).not.toBeNull();
    expect(p.travee!.As).toBeGreaterThanOrEqual(r.travee.AsReq);
    const r2 = cas({ portee: 4.5, nbTravee: p.travee!.nb, phiTravee: p.travee!.phi, nbAppui: p.appui!.nb, phiAppui: p.appui!.phi });
    expect(r2.travee.flexionOk).toBe(true);
    expect(r2.appui.flexionOk).toBe(true);
    expect(r2.verifications.find(v => v.id === 'ESP')!.ok).toBe(true);
  });
  it('section requise infinie → pas de proposition', async () => {
    const { proposerArmatures } = await import('./proposition');
    const r = cas({ portee: 12, categorie: 'perso', qkPerso: 10, bw: 60, hCorps: 80, hf: 30 });
    expect(proposerArmatures(r).travee).toBeNull();
  });
});

describe('Résistance au feu (option, EN 1992-1-2)', () => {
  it("désactivée par défaut : aucune vérification « Feu » et périmètre inchangé", () => {
    const r = cas({});
    expect(r.feu).toBeNull();
    expect(r.verifications.some(v => v.groupe === 'Feu')).toBe(false);
    expect(r.perimetre.nonVerifie.some(x => x.startsWith('Résistance au feu'))).toBe(true);
  });
  it('poutrelle continue R60 (bw 120, a = 37 mm) : conforme, vérifications bloquantes présentes', () => {
    const r = cas({ feu: true, resistanceFeu: 60 });
    const f = r.verifications.filter(v => v.groupe === 'Feu');
    expect(f.map(v => v.id)).toEqual(['FEU-B', 'FEU-BW', 'FEU-A', 'FEU-C']);
    expect(f.every(v => v.ok && v.bloquant)).toBe(true);
    expect(r.verdict).toBe('OK');
    expect(r.perimetre.verifie.some(x => x.includes('R60'))).toBe(true);
  });
  it('poutrelle isostatique R60 : a = 37 < 40 mm → non conforme, enrobage requis indiqué', () => {
    const r = cas({ appui: 'simple', portee: 3.2, feu: true, resistanceFeu: 60 });
    expect(r.feu!.ok).toBe(false);
    expect(r.feu!.cnomRequis).toBe(38);
    expect(r.verifications.find(v => v.id === 'FEU-A')!.ok).toBe(false);
    expect(r.verifications.find(v => v.id === 'FEU-C')!.ok).toBe(false);
    expect(r.verdict).toBe('KO');
  });
  it('largeur d\'âme inférieure à bmin (R90, bw 120) : tableau non applicable, KO', () => {
    const r = cas({ feu: true, resistanceFeu: 90 });
    expect(r.feu!.aRequis).toBeNull();
    expect(r.verifications.find(v => v.id === 'FEU-B')!.ok).toBe(false);
    expect(r.verdict).toBe('KO');
  });
  it("augmenter l'enrobage corrige le cas isostatique R60", () => {
    const r = cas({ appui: 'simple', portee: 3.2, feu: true, resistanceFeu: 60, enrobageMode: 'saisi', cnomSaisi: 40, bw: 160 });
    expect(r.feu!.ok).toBe(true);
  });
  it('durée de résistance inconnue : erreur de saisie et valeur de repli', () => {
    const v = valider({ ...PAR_DEFAUT, feu: true, resistanceFeu: 45 });
    expect(v.erreurs.some(x => x.champ === 'resistanceFeu')).toBe(true);
    expect(v.entree.resistanceFeu).toBe(60);
  });
});
