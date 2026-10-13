# Plancher à corps creux EC2

Pré-dimensionnement d'un plancher à poutrelles et entrevous (corps creux) en béton armé selon la NF EN 1992-1-1 :
poutrelle isostatique ou continue (méthode forfaitaire), section en T avec dalle de compression, flexion ELU en travée et
sur appui, effort tranchant (étriers triangulaires fermés), ELS (contraintes, fissuration, flèche calculée avec fluage et
retrait), dispositions constructives, nomenclature et métré, note de calcul paginée. Application sœur de
« Poutres continues EC2 » et de « Dimensionnement des poteaux aux Eurocodes » (même base technique `src/eurocodes/`).

Version **1.0.0** : refonte sur le modèle de l'application poutres (moteur pur testé, parcours en 4 étapes, projet
multi-planchers, cahier de validation indépendant). La version précédente (Google AI Studio) est conservée dans `archive/`.

## Lancer l'application

Prérequis : Node.js 18 ou plus récent.

```
npm install
npm run dev          # http://localhost:3002
npm test             # tests du moteur (Vitest)
npm run validation   # régénère docs/audit/CAHIER_VALIDATION.md
npm run reference    # exporte les valeurs du moteur et recalcule les références Python (numpy requis)
npm run lint         # types (strict) et ESLint
npm run e2e          # tests de bout en bout (CHROME_PATH=… ou npx playwright install chromium)
npm run manuel       # régénère les captures de docs/manuel/img/
npm run verifier     # tout : lint, tests, validation, e2e
npm run build        # version de production dans dist/
npm run site         # construction pour sel-apps : dist-sel/ (base /tools/plancher-corps-creux/)
```

## Organisation

- `src/eurocodes/` : bibliothèque Eurocode commune aux applications S.E.L. (version 1.6.0, identique dans toutes les applications).
- `src/plancher/` : moteur de calcul (aucune dépendance à l'interface) et cas du cahier de validation.
- `src/app/` : interface en 4 étapes (géométrie et charges, matériaux et armatures, résultats, documents), dessins SVG, note.
- `scripts/reference/` : modèle Python indépendant servant de référence au cahier de validation.
- `docs/AUDIT.md` et `docs/audit/` : audit, matrice normative, registre des formules, cahier de validation, registre des écarts.
- `MANUAL.md` : méthodes de calcul et hypothèses ; `docs/manuel/MANUEL.md` : manuel d'utilisation illustré.
- `tests/e2e/` : tests de bout en bout (4 formats d'écran) et captures du manuel.

Les résultats sont des éléments de pré-dimensionnement. Toute étude d'exécution doit être validée par un ingénieur structure.
