# Journal des modifications

## v1.1.2 — Annexe nationale française et navigateurs

- Option « Annexe France » étendue aux charges : catégorie A à qk = 1,5 kN/m² (NF EN 1991-1-1/NA, tableau 6.2) au lieu de 2,0 kN/m² ; ψ inchangés.
  Les autres catégories gardent les valeurs recommandées (« Personnalisée » pour celles de l'Annexe nationale). Défaut inchangé : valeurs recommandées.
- Intégration continue GitHub Actions : tests unitaires, validation et e2e sur Chromium, Firefox et WebKit (`PW_TOUS_NAVIGATEURS=1`). 117 tests unitaires.

## v1.1.1 — Feu : ligne indicative pour la dalle de compression

- Option feu : nouvelle vérification **FEU-I**, non bloquante, qui compare l'épaisseur hf de la dalle de compression à l'épaisseur minimale
  d'une dalle pleine (EN 1992-1-2 §5.7.2, tableau 5.8 : 60 / 80 / 100 / 120 / 150 / 175 mm pour R30 à R240). Les entrevous n'étant pas pris en compte,
  un écart n'est pas un défaut en soi : la tenue du plancher relève alors de l'évaluation du fabricant d'entrevous.
- Mention dans les observations, la note de calcul, le périmètre du verdict, le manuel et le guide ; registre R-08 mis à jour. 117 tests unitaires.
- Les tableaux des dalles nervurées (§5.7) ne sont pas intégrés (texte de la norme non disponible, dalles coulées en place).

## v1.1.0 — Lot 2 : plans A3 et DXF, résistance au feu, guide PDF

**Plans d'exécution (étape 4)**
- Deux planches A3 : élévation de la poutrelle à l'échelle (aciers de travée, chapeaux, étriers, cotes, repères), coupes en travée et sur appui,
  détail de l'étrier triangulaire fermé, nomenclature, métré, hypothèses et résultats, cartouche S.E.L.
- Export **DXF** (R12, calques normalisés, une feuille A3 par bloc), SVG par feuille et impression A3 paysage / PDF ; même rendu que les poutres.

**Résistance au feu (option, EN 1992-1-2)**
- Valeurs tabulées de la nervure assimilée à une poutre : tableau 5.5 (isostatique) ou 5.6 (continue), durées R30 à R240 :
  largeur bmin, épaisseur d'âme (classe WA), distance a de l'axe des barres au parement, barres d'angle d'un lit unique (a + 10 mm).
- Vérifications bloquantes dans le verdict, enrobage requis indiqué, section dédiée dans la note de calcul, ligne dans les plans.
- Non couvert (signalé dans le périmètre) : protection des entrevous, critères E et I, dalle de compression, tableaux des dalles nervurées (§5.7).
- Cahier de validation : 4 cas (R1 à R4) ; 117 tests unitaires et 40 cas de validation.

**Documentation**
- Guide d'utilisation PDF (`docs/guide/`), généré par `npm run guide` à partir du moteur et de captures de l'application.

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
