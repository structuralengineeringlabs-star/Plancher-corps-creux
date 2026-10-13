/**
 * Génère docs/audit/CAHIER_VALIDATION.md à partir des cas de src/plancher/casValidation.ts.
 * Usage : npm run validation  (après npm run reference si le modèle Python a changé)
 */
import { writeFileSync, mkdirSync } from 'fs';
import { CAS, conforme, ecart } from '../src/plancher/casValidation';
import { APP_VERSION } from '../src/version';

const f = (v: number) => {
  const a = Math.abs(v);
  const d = a >= 1000 ? 1 : a >= 100 ? 2 : a >= 1 ? 3 : 4;
  return v.toFixed(d).replace('.', ',').replace('-', '−');
};
const date = new Date().toLocaleDateString('fr-FR');
let ok = 0;
const lignes = CAS.map(c => {
  const o = c.obtenu(), conf = conforme(c);
  if (conf) ok++;
  return `| ${c.id} | ${c.domaine} | ${c.article} | ${c.grandeur} (${c.unite}) | ${f(c.reference)} | ${f(o)} | ${f(ecart(c))} | ±${f(c.tolerance)} | ${c.methode} | ${conf ? '✅' : '❌'} |`;
});

const md = `# Cahier de validation du moteur de calcul du plancher à corps creux

Version ${APP_VERSION} — généré automatiquement par \`npm run validation\` le ${date}.

Chaque cas compare la valeur du moteur (\`src/plancher/\`) à une référence indépendante du code :
calcul manuel détaillé, ou modèle Python indépendant (\`scripts/reference/plancher_reference.py\`) :
équilibre des sections par dichotomie (sans formules fermées), section fissurée par intégration en tranches,
flèche par double intégration numérique de la courbure (indépendante du théorème de la charge unité du moteur).
Les exemples publiés (guides d'application de l'Eurocode 2) restent à ajouter (registre des écarts).

| Cas | Domaine | Article | Grandeur | Référence | Obtenu | Écart | Tolérance | Méthode | Statut |
|---|---|---|---|---|---|---|---|---|---|
${lignes.join('\n')}

**Bilan : ${ok} / ${CAS.length} cas conformes.**
`;
mkdirSync('docs/audit', { recursive: true });
writeFileSync('docs/audit/CAHIER_VALIDATION.md', md);
console.log(`Cahier de validation : ${ok} / ${CAS.length} cas conformes.`);
if (ok !== CAS.length) process.exit(1);
