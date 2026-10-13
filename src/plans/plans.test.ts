import { describe, expect, it } from 'vitest';
import { calculerPlancher } from '../plancher/calcul';
import { PAR_DEFAUT } from '../plancher/validation';
import type { PlancherInput } from '../plancher/types';
import { ID_DEFAUT } from '../app/store';
import { A3, choisirEchelle, planches } from './plan';
import { exporterDXF } from './dxf';
import { svgTexte } from './PlanSVG';

const variantes: [string, Partial<PlancherInput>][] = [
  ['continu (défaut)', {}],
  ['isostatique', { appui: 'simple', portee: 3.6 }],
  ['grande portée, grosse section', { portee: 9.5, bw: 300, hCorps: 400, hf: 80, entraxe: 1.0, nbTravee: 5, phiTravee: 20, nbAppui: 4, phiAppui: 16, phiEtrier: 10 }],
  ['petite portée', { portee: 1.5, hCorps: 120 }],
  ['4 brins, Φ12', { nBrins: 4, phiEtrier: 8, phiTravee: 16, nbTravee: 3 }],
];

describe('Planches A3', () => {
  for (const [nom, v] of variantes) {
    const r = calculerPlancher({ ...PAR_DEFAUT, ...v });
    const f = planches(r, ID_DEFAUT, 'P1');
    it(`${nom} : deux feuilles, numérotées, cartouche présent`, () => {
      expect(f).toHaveLength(2);
      expect(f.map(x => x.numero)).toEqual([1, 2]);
      expect(f.every(x => x.total === 2)).toBe(true);
      for (const x of f) expect(x.prims.some(q => q.t === 'text' && q.s.startsWith('Feuille'))).toBe(true);
    });
    it(`${nom} : toutes les primitives sont finies et dans la feuille A3`, () => {
      for (const x of f) for (const q of x.prims) {
        const pts = q.t === 'line' ? [[q.x1, q.y1], [q.x2, q.y2]] : q.t === 'rect' ? [[q.x, q.y], [q.x + q.w, q.y + q.h]] : [[q.x, q.y]];
        for (const [px, py] of pts) {
          expect(Number.isFinite(px) && Number.isFinite(py)).toBe(true);
          expect(px).toBeGreaterThanOrEqual(-0.01); expect(px).toBeLessThanOrEqual(A3.w + 0.01);
          expect(py).toBeGreaterThanOrEqual(-0.01); expect(py).toBeLessThanOrEqual(A3.h + 0.01);
        }
      }
    });
    it(`${nom} : la nomenclature de la feuille 2 reprend tous les repères et la masse totale`, () => {
      const textes = f[1].prims.filter(q => q.t === 'text').map(q => (q as { s: string }).s);
      for (const rep of r.nomenclature.reperes) expect(textes).toContain(rep.rep);
      expect(textes.some(t => t.includes(r.nomenclature.masseTotale.toFixed(1).replace('.', ',')))).toBe(true);
    });
  }

  it("l'élévation tient dans la largeur utile à l'échelle choisie", () => {
    expect(choisirEchelle(5000, 380)).toBe(15);
    expect(choisirEchelle(380, 380)).toBe(10);
    expect(choisirEchelle(1e9, 380)).toBe(200);
  });

  it('SVG : un document par feuille, valide et sans caractère de contrôle', () => {
    const f = planches(calculerPlancher(PAR_DEFAUT), ID_DEFAUT);
    for (const x of f) {
      const s = svgTexte(x);
      expect(s.startsWith('<?xml')).toBe(true);
      expect(s).toContain('viewBox="0 0 420 297"');
      expect(s).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});

describe('Export DXF', () => {
  const f = planches(calculerPlancher(PAR_DEFAUT), ID_DEFAUT, 'P1');
  const dxf = exporterDXF(f);
  const lignes = dxf.split('\r\n');
  const paires: [string, string][] = [];
  for (let i = 0; i + 1 < lignes.length; i += 2) paires.push([lignes[i], lignes[i + 1]]);
  const entites = paires.filter(([c]) => c.trim() === '0').map(([, v]) => v);

  it('structure : sections HEADER, TABLES, ENTITIES et fin de fichier', () => {
    expect(entites).toContain('SECTION'); expect(entites).toContain('ENDSEC'); expect(entites[entites.length - 1]).toBe('EOF');
    expect(paires.some(([c, v]) => c.trim() === '2' && v === 'ENTITIES')).toBe(true);
  });
  it('paires code/valeur alignées (nombre de lignes pair)', () => {
    expect(lignes.filter(l => l !== '').length % 2).toBe(0);
  });
  it('ASCII pur (les accents, Φ et ² sont convertis)', () => {
    expect(/^[\x20-\x7E\r\n]*$/.test(dxf)).toBe(true);
  });
  it('contient lignes, cercles et textes pour les deux feuilles', () => {
    const n = (t: string) => entites.filter(e => e === t).length;
    expect(n('LINE')).toBeGreaterThan(50); expect(n('CIRCLE')).toBeGreaterThan(5); expect(n('TEXT')).toBeGreaterThan(40);
    const xs = paires.filter(([c]) => c.trim() === '10').map(([, v]) => Number(v));
    expect(Math.max(...xs)).toBeGreaterThan(A3.w); // seconde feuille posée à droite de la première
  });
  it('les calques déclarés couvrent ceux des entités', () => {
    const declares = new Set<string>(); let table = '';
    for (let i = 0; i < paires.length; i++) { const [c, v] = paires[i]; if (c.trim() === '2' && ['LTYPE', 'LAYER', 'ENTITIES', 'HEADER', 'TABLES'].includes(v)) table = v; if (table === 'LAYER' && c.trim() === '2' && v !== 'LAYER') declares.add(v); }
    const utilises = new Set(paires.filter(([c]) => c.trim() === '8').map(([, v]) => v));
    for (const u of utilises) expect(declares.has(u), `calque ${u}`).toBe(true);
  });
});
