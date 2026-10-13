/**
 * Dessins calculés (SVG) : diagrammes M et V, coupes transversales (travée et appui) avec l'étrier triangulaire fermé,
 * élévation de la poutrelle (aciers de travée, chapeaux, étriers). Fond blanc et traits sombres : même rendu à l'écran
 * et à l'impression.
 */
import type { ResultatPlancher } from '../plancher/calcul';
import { fr } from '../plancher/calcul';

const C = { trait: '#0b111e', grille: '#e5e7eb', bleu: '#1d6fb8', rouge: '#c0392b', vert: '#2e7d32', gris: '#6b7280', accent: '#3a9bd5', beton: '#f3f5f8', entrevous: '#e8dcc8' };

/** Diagramme de moment (kN·m, fibre inférieure tendue sous l'axe) ou d'effort tranchant (kN). */
export function Diagramme({ r, type, hauteur = 190 }: { r: ResultatPlancher; type: 'M' | 'V'; hauteur?: number }) {
  const W = 820, H = hauteur, PL = 58, PR = 16, PT = 24, PB = 30;
  const { X, M, V } = r.courbes;
  const v = type === 'M' ? M : V;
  const L = X[X.length - 1];
  const vmax = Math.max(1e-6, ...v.map(Math.abs));
  const sx = (x: number) => PL + x / L * (W - PL - PR);
  const y0 = PT + (H - PT - PB) / 2;
  const k = (H - PT - PB) / 2 / vmax * 0.9;
  const sy = (val: number) => (type === 'M' ? y0 + val * k : y0 - val * k);
  const pts = X.map((x, i) => `${sx(x).toFixed(1)},${sy(v[i]).toFixed(1)}`).join(' ');
  const couleur = type === 'M' ? C.bleu : C.vert;
  const iMax = v.indexOf(Math.max(...v)), iMin = v.indexOf(Math.min(...v));
  const notes = type === 'M'
    ? [{ i: iMax, v: v[iMax] }, ...(v[iMin] < -1e-6 ? [{ i: 0, v: v[0] }, { i: X.length - 1, v: v[X.length - 1] }] : [])]
    : [{ i: 0, v: v[0] }, { i: X.length - 1, v: v[X.length - 1] }];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-white" role="img" aria-label={type === 'M' ? 'Diagramme du moment fléchissant' : "Diagramme de l'effort tranchant"}>
      {[-1, -0.5, 0.5, 1].map(t => <line key={t} x1={PL} x2={W - PR} y1={y0 + t * vmax * k} y2={y0 + t * vmax * k} stroke={C.grille} strokeWidth={0.6} />)}
      {[-vmax, 0, vmax].map(val => <text key={`t${val}`} x={PL - 6} y={sy(val) + 3} fontSize={9} textAnchor="end" fill={C.gris}>{fr(val, 1)}</text>)}
      <polygon points={`${sx(0)},${y0} ${pts} ${sx(L)},${y0}`} fill={couleur} opacity={0.14} />
      <polyline points={pts} fill="none" stroke={couleur} strokeWidth={1.7} />
      <line x1={sx(0)} x2={sx(L)} y1={y0} y2={y0} stroke={C.trait} strokeWidth={1.2} />
      {[0, L].map((x, a) => <polygon key={a} points={`${sx(x)},${y0} ${sx(x) - 6},${y0 + 11} ${sx(x) + 6},${y0 + 11}`} fill="#fff" stroke={C.trait} strokeWidth={0.9} />)}
      {notes.map((n, i) => <text key={i} x={sx(X[n.i])} y={sy(n.v) + (((type === 'M' ? 1 : -1) * n.v) >= 0 ? 12 : -5)} fontSize={9.5} fontWeight={600} textAnchor={n.i === 0 ? 'start' : n.i === X.length - 1 ? 'end' : 'middle'} fill={C.trait}>{fr(n.v, 1)}</text>)}
      <text x={PL} y={12} fontSize={10} fill={C.gris}>{type === 'M' ? "MEd (kN·m) — valeurs de calcul ELU, M > 0 sous l'axe (fibre inférieure tendue)" : 'VEd (kN) — valeurs de calcul ELU'}</text>
      <text x={W - PR} y={H - 8} fontSize={9.5} textAnchor="end" fill={C.gris}>x (m) — portée {fr(L, 2)} m</text>
    </svg>
  );
}

/**
 * Coupe transversale à l'échelle : dalle de compression, entrevous (hachurés), âme, barres et étrier triangulaire fermé.
 * 'travee' : aciers inférieurs ; 'appui' : chapeaux en partie haute, aciers de travée prolongés en partie basse.
 */
export function CoupeTransversale({ r, vue, taille = 380 }: { r: ResultatPlancher; vue: 'travee' | 'appui'; taille?: number }) {
  const e = r.entree, g = r.geo;
  const c = r.mat.cNom, phiW = e.phiEtrier;
  const b = g.b, bw = g.bw, h = g.h, hf = g.hf;
  const s = taille / b;
  const W = b * s + 20, H = h * s + 70, x0 = 10, y0 = 24;
  const xAme = x0 + (b - bw) / 2 * s;
  // Étrier triangulaire : base A = bw − 2c en bas, sommet à B = h − 2c
  const et = r.nomenclature.etrier;
  const xc = x0 + b * s / 2;
  const yBas = y0 + (h - c) * s, yHaut = y0 + c * s;
  const demi = et.A / 2 * s;
  const triangle = `${xc - demi},${yBas} ${xc + demi},${yBas} ${xc},${yHaut}`;
  const nbT = e.nbTravee, nbA = e.nbAppui;
  const rT = Math.max(2.2, e.phiTravee / 2 * s), rA = Math.max(2.2, e.phiAppui / 2 * s);
  const yT = y0 + (h - c - phiW - e.phiTravee / 2) * s;
  const barresBas = Array.from({ length: nbT }, (_, i) => xc - demi + phiW * s + e.phiTravee / 2 * s + (nbT === 1 ? (2 * demi - 2 * phiW * s - e.phiTravee * s) / 2 : (2 * demi - 2 * phiW * s - e.phiTravee * s) * i / (nbT - 1)));
  const yA = y0 + (c + phiW + e.phiAppui / 2) * s;
  const barresHaut = Array.from({ length: nbA }, (_, i) => xc + (nbA === 1 ? 0 : (i - (nbA - 1) / 2) * Math.min(2.2 * e.phiAppui * s, (bw * s) / nbA)));
  const crochet = Math.max(7, et.crochet * s);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="bg-white max-w-full h-auto" role="img" aria-label={`Coupe transversale ${vue === 'travee' ? 'en travée' : 'sur appui'}`}>
      <defs>
        <pattern id={`hach-${vue}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#b9a98a" strokeWidth="1" /></pattern>
      </defs>
      {/* entrevous */}
      <rect x={x0} y={y0 + hf * s} width={(b - bw) / 2 * s} height={e.hCorps * s} fill={C.entrevous} stroke={C.gris} strokeWidth={0.8} />
      <rect x={x0} y={y0 + hf * s} width={(b - bw) / 2 * s} height={e.hCorps * s} fill={`url(#hach-${vue})`} />
      <rect x={xAme + bw * s} y={y0 + hf * s} width={(b - bw) / 2 * s} height={e.hCorps * s} fill={C.entrevous} stroke={C.gris} strokeWidth={0.8} />
      <rect x={xAme + bw * s} y={y0 + hf * s} width={(b - bw) / 2 * s} height={e.hCorps * s} fill={`url(#hach-${vue})`} />
      {/* béton : dalle et âme */}
      <rect x={x0} y={y0} width={b * s} height={hf * s} fill={C.beton} stroke={C.trait} strokeWidth={1.3} />
      <rect x={xAme} y={y0 + hf * s} width={bw * s} height={e.hCorps * s} fill={C.beton} stroke={C.trait} strokeWidth={1.3} />
      {/* étrier triangulaire fermé, crochets à 135° */}
      <polygon points={triangle} fill="none" stroke={C.accent} strokeWidth={Math.max(1.4, phiW * s)} strokeLinejoin="round" />
      <path d={`M ${xc} ${yHaut} l ${-crochet * 0.7} ${crochet * 0.7} M ${xc} ${yHaut} l ${crochet * 0.7} ${crochet * 0.7}`} stroke={C.accent} strokeWidth={Math.max(1.4, phiW * s)} strokeLinecap="round" />
      {/* aciers */}
      {barresBas.map((x, i) => <circle key={`b${i}`} cx={x} cy={yT} r={rT} fill={C.trait} />)}
      {vue === 'appui' && barresHaut.map((x, i) => <circle key={`h${i}`} cx={x} cy={yA} r={rA} fill={C.rouge} />)}
      {/* cotes */}
      <text x={xc} y={y0 + h * s + 16} fontSize={10} textAnchor="middle" fill={C.gris}>entraxe b = {fr(b, 0)} — âme bw = {fr(bw, 0)} mm</text>
      <text x={x0 + 4} y={y0 + hf * s / 2 + 3} fontSize={9} fill={C.gris}>dalle hf = {fr(hf, 0)}</text>
      <text x={x0 + 4} y={y0 + hf * s + e.hCorps * s / 2} fontSize={9} fill={C.gris}>entrevous {fr(e.hCorps, 0)}</text>
      <text x={xc} y={H - 14} fontSize={9.5} textAnchor="middle" fill={C.accent}>étrier triangulaire fermé HA{e.phiEtrier}, crochet 135°</text>
      <text x={xc} y={12} fontSize={10.5} fontWeight={700} textAnchor="middle" fill={C.trait}>{vue === 'travee' ? `Coupe en travée — ${nbT} HA${e.phiTravee}` : `Coupe sur appui — ${nbA} HA${e.phiAppui} (chapeaux) + ${nbT} HA${e.phiTravee}`}</text>
    </svg>
  );
}

/** Élévation de la poutrelle : aciers de travée ancrés, chapeaux, étriers à l'espacement retenu. */
export function Elevation({ r }: { r: ResultatPlancher }) {
  const e = r.entree, N = r.nomenclature;
  const W = 900, PL = 24, PR = 24, yT = 60, hB = 80, yB = yT + hB, H = 236;
  const L = r.analyse.L;
  const lbd = r.disp.lbdTravee;
  const sx = (x: number) => PL + (x + lbd) / (L + 2 * lbd) * (W - PL - PR);
  const cont = e.appui === 'continu';
  const nEt = N.nombreEtriers, s = r.tranchant.etr.s;
  const yInf = yB - 12, ySup = yT + 12;
  const Lch = cont ? L / 4 : L / 5;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-white" role="img" aria-label="Élévation de la poutrelle">
      <rect x={sx(0)} y={yT} width={sx(L) - sx(0)} height={hB} fill={C.beton} stroke={C.trait} strokeWidth={1.4} />
      {[[-lbd, 0], [L, L + lbd]].map(([a, b2], k) => (
        <g key={k}>
          <rect x={sx(a)} y={yT} width={sx(b2) - sx(a)} height={hB + 22} fill="#e5e7eb" stroke={C.trait} strokeWidth={0.9} />
          <text x={(sx(a) + sx(b2)) / 2} y={yB + 16} fontSize={9.5} textAnchor="middle" fill={C.gris}>appui</text>
          <line x1={sx(k === 0 ? 0 : L)} x2={sx(k === 0 ? 0 : L)} y1={yT - 22} y2={yB + 34} stroke={C.gris} strokeDasharray="6 3 1 3" strokeWidth={0.6} />
        </g>
      ))}
      {Array.from({ length: nEt }, (_, i) => <line key={i} x1={sx(i * s)} x2={sx(i * s)} y1={yT + 4} y2={yB - 4} stroke={C.accent} strokeWidth={0.8} />)}
      <line x1={sx(-lbd)} x2={sx(L + lbd)} y1={yInf} y2={yInf} stroke={C.bleu} strokeWidth={2.6} />
      <text x={sx(L / 2)} y={yB + 20} fontSize={11} fontWeight={700} textAnchor="middle" fill={C.bleu}>{e.nbTravee} HA{e.phiTravee} — L = {fr(N.longueurBarre / 1000, 2)} m (ancrage lbd = {fr(lbd, 0)} mm au-delà de l'axe de chaque appui)</text>
      {[0, L].map((x, k) => {
        const intermediaire = cont && k === 1; // appui intermédiaire d'une travée de rive : chapeau calculé
        const a = k === 0 ? 0 : -Lch, b2 = k === 0 ? Lch : 0;
        return (
          <g key={`c${k}`}>
            <line x1={sx(x + a)} x2={sx(x + b2)} y1={ySup} y2={ySup} stroke={C.rouge} strokeWidth={2.4} strokeDasharray={intermediaire || !cont ? undefined : '8 3'} />
            <text x={sx(x + (a + b2) / 2)} y={yT - 8} fontSize={10.5} fontWeight={700} textAnchor="middle" fill={C.rouge}>{intermediaire ? `chapeaux ${e.nbAppui} HA${e.phiAppui}` : cont ? 'chapeau de rive (non métré)' : `chapeau ${e.nbAppui} HA${e.phiAppui}`} — {fr(Lch / 1000, 2)} m</text>
          </g>
        );
      })}
      <text x={sx(L / 2)} y={yB + 38} fontSize={9.5} textAnchor="middle" fill={C.accent}>{nEt} étriers HA{e.phiEtrier} ({e.nBrins} brins), e = {fr(s / 10, 0)} cm</text>
      <line x1={sx(0)} x2={sx(L)} y1={H - 26} y2={H - 26} stroke={C.trait} strokeWidth={0.7} />
      <text x={sx(L / 2)} y={H - 30} fontSize={10} textAnchor="middle">L = {fr(L / 1000, 2)} m</text>
      <text x={W - PR} y={H - 6} fontSize={8.5} textAnchor="end" fill={C.gris}>{cont ? "Travée de rive : chapeaux calculés sur l'appui intermédiaire (à droite), chapeau de construction à l'about." : 'Chapeaux de construction aux appuis (§9.2.1.2).'} Échelle horizontale ; hauteur dilatée.</text>
    </svg>
  );
}
