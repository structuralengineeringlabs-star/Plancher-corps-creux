# Audit et mise à jour de « Plancher à corps creux EC2 » sur le modèle POUTRES

Versions : « Aciers-Floor » v2.4 (export Google AI Studio) → v2.5 (livraison corrigée, `audit/AUDIT_V1_AI_STUDIO.md`) → **v1.0.0**
(mise à jour sur le modèle de l'application « Poutres continues EC2 », décisions du 13/10/2026).

## 0. Décisions

| N° | Décision |
|---|---|
| D1 | Numéro de version : **v1.0.0** |
| D2 | Parcours en 4 étapes de POUTRES (« 1. Géométrie et charges », « 2. Matériaux et armatures », « 3. Résultats », « 4. Documents ») |
| D3 | Application compilée servie en iframe par sel-apps, comme les autres applications (`public/tools/plancher-corps-creux/`) |
| D4 | Deux lots : **lot 1** (P0 à P4, P6 à P8 : moteur, validation, interface, documents, intégration, déploiement) ; **lot 2** (planches A3 et DXF, option feu EN 1992-1-2, guide PDF) |
| D5 | Dépôt `Plancher-corps-creux` passé en privé |

## 1. Avancement du lot 1

| Phase | Contenu | État | Livrables |
|---|---|---|---|
| P0 | Base de référence : le moteur du catalogue égale la livraison v2.5 ; état de sel-apps et de Vercel relevé | Fait | — |
| P1–P2 | Moteur extrait et audité (section en T, appui vérifié, ELS, flèche calculée, enrobage normatif) | Fait | `src/plancher/`, `audit/MATRICE_NORMATIVE.md`, `audit/REGISTRE_FORMULES.md`, `audit/REGISTRE_ECARTS.md` |
| P3 | Tests unitaires, cahier de validation (36 cas), tests de bout en bout | Fait | `plancher.test.ts`, `casValidation.ts`, `scripts/reference/plancher_reference.py`, `audit/CAHIER_VALIDATION.md`, `tests/e2e/` |
| P4 | Interface en 4 étapes, projet multi-planchers, dessins, note de calcul | Fait | `src/app/` |
| P6 | Intégration continue, audit des dépendances, documents | Fait | `.github/workflows/ci.yml`, `README.md`, `CHANGELOG.md`, `MANUAL.md`, `manuel/MANUEL.md` |
| P7–P8 | Intégration dans sel-apps, aperçu Vercel, production | Voir `CHANGELOG.md` de sel-apps et `DEPLOIEMENT.md` | — |

## 2. Synthèse

- 14 écarts relevés et clos (B01 à B14), dont 2 majeurs de calcul propres à la v2.5 : section d'appui non vérifiée (B02) et
  dalle de compression ignorée en flexion (B04) ; 7 écarts ouverts (R-01 à R-07), tous documentés dans le registre.
- Le moteur est validé par 36 cas comparés à des références indépendantes (calcul manuel, modèle Python avec dichotomie
  pour la flexion et la section fissurée, double intégration numérique pour la flèche : écart ≤ 0,03 mm sur 5 à 9 mm).
- Effets visibles sur l'exemple par défaut (poutrelle continue 3 travées, L = 4,0 m, entraxe 0,60 m, 20 + 4 cm, C25/30, B500,
  habitation) : verdict conforme, MEd = 10,0 kN·m (travée) et 6,3 kN·m (appui), VEd = 13,8 kN, flèche à long terme 5,1 mm
  (limite 16 mm), flèche nuisible 4,7 mm (limite 8 mm) ; 27 vérifications.
- Même exemple en poutrelle isostatique : non conforme (flèche nuisible 9,5 mm > 8 mm) — le calcul détecte ce que le simple
  rapport L/d de la v2.5 ne signalait pas.

## 3. Architecture

| Élément | Rôle |
|---|---|
| `src/plancher/` | Moteur : types, matériaux, charges, analyse, flexion, tranchant, ELS, flèche, dispositions, nomenclature, vérifications, orchestration |
| `src/plancher/casValidation.ts` | Cas du cahier de validation, partagés par les tests et par le générateur du cahier |
| `scripts/reference/plancher_reference.py` | Modèle indépendant ; `references.json` |
| `src/app/` | Interface : saisie, résultats, dessins SVG, note imprimable, projet |
| `src/eurocodes/` | Bibliothèque commune aux applications S.E.L. (1.6.0) |
| `src/brand/sel.ts`, `ErrorBoundary.tsx`, `diagnostics.ts` | Identité, interception des erreurs, journal |

## 4. Écarts ouverts et prochaine étape

Voir `audit/REGISTRE_ECARTS.md` (section C). Lot 2 : planches A3 cotées et DXF, option feu (EN 1992-1-2), guide PDF.
