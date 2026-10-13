# Journal des modifications

## v1.0.0 — Mise à jour sur le modèle POUTRES

Refonte complète de l'application « Calculette EC2 Plancher Corps Creux » (v1.x issue de Google AI Studio, archivée).

**Architecture**
- Moteur pur `src/plancher/` (types, matériaux, charges, analyse, flexion, tranchant, ELS, flèche, dispositions,
  nomenclature, vérifications, orchestration), sans dépendance à l'interface ; bibliothèque commune `src/eurocodes/` 1.6.0.
- Application compilée (Vite, React 19, TypeScript strict, Tailwind 4) servie dans une iframe par sel-apps.

**Calcul**
- Largeur participante beff de la dalle de compression (§5.3.2.1) et flexion en section en T.
- Armatures de travée, et armatures d'appui (chapeaux) désormais **vérifiées** : As,min, MRd, xu/d (écart v1 : section d'appui non contrôlée).
- Contraintes en section fissurée (αe = 15), maîtrise de la fissuration sans calcul (tableau 7.2N), flèche calculée
  à long terme par intégration des courbures (ζ, fluage, retrait) et flèche nuisible L/500 ; L/d à titre indicatif.
- Enrobage nominal calculé (durabilité, classe structurale S1 à S6, Δcdev = 10 mm : 25 mm en XC1 au lieu de 20 mm) ; qk et ψ de l'EN 1991-1-1 / EN 1990 (catégorie A : 2,0 kN/m² au lieu de 1,5).
- Poutrelle isostatique : chapeaux de construction métrés aux deux appuis (un seul auparavant).
- Effort tranchant : VRd,c, VRd,max, étriers (Mörsch), minimum, espacement ; traction à ancrer à l'appui d'about.
- Étrier triangulaire fermé (crochet 135°, queue 10Φ) : géométrie, développée, métré.
- Verdict calculé (conforme / non conforme / non vérifié) avec le périmètre de ce qui est vérifié et de ce qui ne l'est pas.

**Interface**
- Parcours en 4 étapes (« 1. Géométrie et charges », « 2. Matériaux et armatures », « 3. Résultats », « 4. Documents »).
- Projet multi-planchers, sauvegarde automatique, fichiers `.plancher.json` (format 1), proposition d'armatures.
- Note de calcul paginée (garde, sommaire, listes, annexe, empreinte), nomenclature et métré.

**Validation**
- Cahier de validation : 36 cas comparés à des références indépendantes (calcul manuel, modèle Python).
- 83 tests unitaires, 48 tests de bout en bout (bureau, portable, tablette, mobile).

**Reporté au lot 2** : planches A3 cotées et DXF, résistance au feu (EN 1992-1-2), guide PDF.
