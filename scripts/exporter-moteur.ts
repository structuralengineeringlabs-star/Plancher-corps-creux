/** Exporte les valeurs du moteur que le modèle Python doit contre-vérifier (évite toute recopie manuelle). */
import { writeFileSync } from 'fs';
import { materiaux } from '../src/plancher/materiaux';
import { PAR_DEFAUT } from '../src/plancher/validation';
const m = materiaux(PAR_DEFAUT);
writeFileSync('scripts/reference/moteur.json', JSON.stringify({ fcd: m.fcd, fyd: m.fyd, fctm: m.fctm, Ecm: m.Ecm, cNom: m.cNom }, null, 2));
console.log('scripts/reference/moteur.json écrit');
