# Audit — Dimensionnement Plancher Corps Creux (Aciers-Floor v2.4 → v2.5)

**Portée de l'audit :** relecture complète du code source (`src/App.tsx`,
2398 lignes), vérification de la compilation TypeScript, exécution de
l'application, et vérification numérique indépendante de chaque formule du
moteur de calcul EC2 par rapport à l'EN 1992-1-1.

**Résultat global :** l'application compilait et s'exécutait sans erreur,
mais contenait **un bug de sécurité structurelle** (un dépassement de
capacité pouvait être affiché comme "conforme"), **trois bugs de calcul**
faussant silencieusement les résultats dans des cas d'usage courants, et un
ensemble de défauts de qualité de code (duplication, dépendances mortes,
absence de types React, fonctionnalités documentées mais inaccessibles
depuis l'interface). Tout est corrigé dans la version livrée ; le détail et
le raisonnement suivent.

---

## 1. Anomalie critique (sécurité structurelle)

### 1.1 Un dépassement de la bielle de béton (VEd > VRd,max) pouvait être affiché comme "conforme"

- **Fichier / fonction d'origine :** `calculerEtriers` + `actualiserCalcul`.
- **Constat :** quand l'effort tranchant dépasse la capacité de la bielle de
  compression inclinée (`VEd > VRd,max`, écrasement du béton), la fonction
  renvoyait correctement `erreur: true`, mais :
  1. Ce champ `erreur` n'était **jamais lu ni affiché nulle part dans
     l'interface** — aucun bandeau, aucune icône, aucun texte ne le
     signalait à l'ingénieur.
  2. Le taux de travail à l'effort tranchant était calculé par
     `V_rd_val > 0 ? Ved / V_rd_val : 1` — or en cas d'erreur, `V_Rds` vaut
     la chaîne `"0"`, donc ce ratio tombait sur la branche `else` et valait
     **exactement 1**, c'est-à-dire "tout juste conforme" (`ratio <= 1`).
  3. En conséquence, `est_valide` (qui pilote le bandeau "Structure
     Conforme / Non Conforme") pouvait rester `true` alors que la bielle de
     béton était réellement écrasée.
- **Vérification :** reproduit numériquement (portée 9 m, âme 8 cm, béton
  C20/25, charges élevées) : `VEd = 61.5 kN` pour `VRd,max = 22.3 kN`. Avec
  l'ancien code, ce cas passait comme "conforme" ; avec le correctif,
  `est_valide` vaut bien `false` et un bandeau rouge explicite apparaît
  dans l'onglet Synthèse, l'onglet Schémas et la Note de calcul.
- **Correctif :** le ratio est désormais forcé à une valeur non conforme
  (`Infinity`) dès que `etriers.erreur` est vrai, ce champ est intégré au
  calcul de `est_valide`, et un message d'alerte dédié est affiché aux
  trois endroits pertinents de l'interface.

---

## 2. Anomalies faussant les résultats (à corriger avant tout usage)

### 2.1 Le poids des entrevous ne dépendait pas de leur hauteur

- **Constat :** le poids propre du plancher intégrait un forfait de
  **0.6 kN/m² codé en dur**, quelle que soit la valeur du champ "Corps
  (cm)" (hauteur du bloc d'entrevous), pourtant librement modifiable dans
  l'interface. Passer de 12 cm à 25 cm de corps creux ne changeait donc
  jamais la descente de charges — une sous-estimation ou surestimation
  silencieuse du poids propre, qui se propage à tous les résultats en
  aval (moments, tranchant, ferraillage).
- **Correctif :** le poids forfaitaire est désormais mis à l'échelle de la
  hauteur réelle du corps creux (calibré sur 0.6 kN/m² à 16 cm), avec un
  nouveau champ **"Poids entrevous (kN/m², 0 = auto)"** pour saisir la
  valeur exacte du fabricant si elle est connue.
- **Vérification :** à 16 cm → 0.600 kN/m² (valeur historique inchangée) ;
  à 20 cm → 0.750 kN/m² (proportionnel, au lieu de rester bloqué à 0.6).

### 2.2 Vérification au cisaillement : mauvaise section d'acier utilisée en poutrelle isostatique

- **Constat :** `verifierCisaillement` (calcul de VRd,c, résistance du
  béton seul) recevait systématiquement la section d'acier de **chapeau
  d'appui** (`choix_appui`). Or en poutrelle **isostatique**, il n'existe
  pas d'acier de chapeau (`choix_appui` vaut `null`, donc section = 0) :
  c'est l'acier de **travée prolongé/ancré sur appui** qui reprend l'effort
  selon l'EN 1992-1-1 §6.2.2. Le calcul sous-estimait donc systématiquement
  ρl (et VRd,c) pour toute poutrelle isostatique, pouvant déclencher un
  besoin d'étriers non représentatif du dimensionnement réel.
- **Correctif :** la section d'acier tendu utilisée pour VRd,c dépend
  maintenant du système statique : acier de travée en isostatique, acier
  de chapeau en continu.
- **Bug associé corrigé dans la même fonction :** un plancher artificiel de
  `Math.max(As, 0.0001)` (soit 1 cm² m², une valeur loin d'être négligeable)
  était appliqué même quand aucune armature n'est réellement présente à la
  section. Il gonflait ρl et donc VRd,c d'environ **+10 %** dans ce cas —
  un biais **non sécuritaire**. La formule EC2 est pourtant valide avec
  ρl = 0 (le minimum réglementaire `vmin·bw·d` prend le relais via le
  `Math.max` déjà présent) : le plancher artificiel a été supprimé.

### 2.3 Formule de flèche (L/d limite) : terme erroné pour les sections fortement armées

- **Constat :** pour ρ > ρ0 (section relativement armée), la formule
  utilisée était :
  `K·(11 + 1.5·√fck·(ρ0/ρ) − 1.5·√fck·(ρ0/0.02))`
  Le second terme (`− 1.5·√fck·ρ0/0.02`) **n'existe dans aucune version**
  de la formule 7.16.b de l'EN 1992-1-1. Avec ρ' = 0 (pas d'armature
  comprimée modélisée par ailleurs dans l'outil), la formule correcte est
  simplement `K·(11 + 1.5·√fck·ρ0/ρ)`.
- **Impact mesuré :** le ratio L/d limite autorisé était réduit d'environ
  **12 %** par rapport à la valeur réglementaire dans ce cas — un
  dimensionnement plus sévère que nécessaire (flèches signalées non
  conformes alors qu'elles étaient en réalité acceptables). Sens de
  l'erreur : conservateur, mais non conforme à la formule normative.
- **Vérification :** cas test (fck = 25, ρ = 0.0333, ρ0 = 0.005) → formule
  corrigée : L/d limite = 12.1, valeur reproduite exactement par le code
  corrigé (contre une valeur artificiellement plus basse auparavant).
- **Correctif :** suppression du terme parasite.

### 2.4 Diagrammes M(x) / V(x) incohérents avec les valeurs de calcul (poutrelle continue)

- **Constat :** le tracé des diagrammes des moments et des efforts
  tranchants recalculait M(x)/V(x) à partir d'un modèle physique
  **différent** de celui utilisé pour le ferraillage (coefficients
  forfaitaires 0.8·M0 / 0.5·M0 / 1.1·V0). Conséquences visibles à l'écran :
  - le moment à l'appui B (extrémité du graphique) ne revenait pas à la
    valeur affichée par ailleurs comme "moment d'appui" ;
  - le repère visuel du "moment maximal" était positionné à mi-portée,
    alors que le maximum réel de la courbe tracée se situait ailleurs
    (à 7L/16 et non L/2) ;
  - la valeur de l'effort tranchant à l'appui affichée **sur le graphique**
    différait d'environ **20 %** de la valeur VEd affichée juste à côté
    dans les cartes de résultats et utilisée pour le calcul des étriers
    (exemple avec les paramètres par défaut : 10.9 kN sur le graphique
    contre 13.7 kN dans les résultats).
- **Correctif :** les courbes sont reconstruites pour être garanties
  cohérentes *par construction* avec Mtravée/Mappui/VEd (parabole/rampe
  ancrées exactement sur ces valeurs). Vérifié numériquement : la valeur
  au centre de la courbe des moments égale Mtravée à 0.01 kN.m près, les
  valeurs aux extrémités égalent Mappui, et V(0) égale VEd exactement.

### 2.5 Étiquette de classe de béton incorrecte (C30/35 et C35/40 n'existent pas)

- **Constat :** l'étiquette affichée était construite par
  `C{fck}/{fck+5}`. Cette règle n'est vraie que pour C20/25 et C25/30 ; les
  classes normalisées réelles de l'EN 1992-1-1 Tableau 3.1 sont
  **C30/37** et **C35/45** (écarts de 7 et 10, pas 5). L'application
  affichait donc "C30/35" et "C35/40", qui ne sont pas des classes de béton
  normalisées — une erreur qui peut se retrouver telle quelle sur une
  commande de béton.
- **Correctif :** table de correspondance correcte (`classeBeton()`),
  appliquée à la fois dans le formulaire de saisie et dans la note de
  calcul (les deux occurrences du bug).

---

## 3. Fonctionnalités documentées mais inaccessibles

Le manuel utilisateur (`MANUEL_UTILISATION.md`) décrivait des réglages que
l'interface ne permettait pas réellement d'actionner :

| Paramètre | Constat | Correctif |
|---|---|---|
| **cot θ** (inclinaison des bielles) | Le manuel affirme *"cot θ est réglable (par défaut 2.5)"* ; en réalité, aucun contrôle n'existait et la valeur était figée à 2.5 dans le code (`setEtriersParams` n'était jamais appelé). | Sélecteur ajouté (1.0 à 2.5), section "Aciers Transversaux". |
| **Classe structurale** (S3–S6) | Le moteur de calcul gérait déjà des majorations d'enrobage pour S5/S6, mais le champ n'était accessible nulle part dans l'IHM (toujours "S4"). | Sélecteur ajouté à côté de la classe d'exposition. |
| **Classes d'exposition XD1 / XS1** | Gérées par le moteur de calcul d'enrobage, absentes du menu déroulant. | Ajoutées au menu. |
| **Catégories d'usage C3 / D1** | Présentes dans la table des charges d'exploitation, absentes du menu déroulant. | Ajoutées au menu. |
| **Enrobage manuel** | Champ d'état déjà supporté par le moteur de calcul, sans aucun champ de saisie associé. | Champ de saisie ajouté ("Forcer (mm), 0 = auto"). |

---

## 4. Robustesse / cas limites

- **Section théorique "999 cm²" :** en cas de moment ultime dépassant la
  capacité de la section (µ > µlim), l'ancien code renvoyait la valeur
  littérale `999`, qui pouvait ressembler à un vrai résultat de calcul pour
  un utilisateur pressé. Remplacée par `Infinity`, affiché explicitement
  comme **"Section insuffisante"** dans toute l'interface.
- **Division par zéro dans la nomenclature :** quand la bielle de béton est
  écrasée (§1.1), l'espacement des étriers `s_cm` vaut 0 ; l'ancien code
  divisait quand même par `s_cm` pour compter le nombre d'étriers, ce qui
  produisait `Infinity` puis la chaîne littérale **"Infinity"** dans le
  tableau de nomenclature et le poids total d'acier. Corrigé (0 étrier
  comptabilisé dans ce cas, cohérent avec le statut "non conforme" déjà
  signalé par ailleurs).
- **Anti-pattern React (donnée dérivée en état + `useEffect`) :** les
  résultats étaient stockés dans un `useState` recalculé par un
  `useEffect`. Ce schéma peut afficher transitoirement d'anciens résultats
  incohérents avec les champs déjà modifiés, et surtout : quand la
  géométrie devenait invalide (ex. portée vidée en cours de frappe), les
  **anciens résultats restaient affichés tels quels** au lieu de
  disparaître, alors que d'autres éléments de l'écran (dimensions du
  schéma) réagissaient déjà à la nouvelle valeur invalide. Remplacé par un
  calcul dérivé (`useMemo`), toujours synchrone et cohérent avec le rendu
  en cours.
- **Hauteur utile négative :** une combinaison extrême de paramètres
  (enrobage + diamètres d'armatures supérieurs à l'épaisseur totale)
  pouvait donner une hauteur utile `d ≤ 0`, propageant silencieusement des
  `NaN` dans toute la suite des calculs. Un garde-fou renvoie désormais
  `null` (aucun résultat affiché) plutôt que des valeurs aberrantes.

---

## 5. Qualité de code / nettoyage

- **Fichier unique de 2398 lignes → modules dédiés.** Le moteur de calcul
  (fonctions pures, sans React) est désormais dans `src/lib/eurocode2.ts`
  (testable indépendamment de l'interface — voir les scénarios de
  vérification cités plus haut, exécutables tels quels). Les schémas
  transversaux et le manuel d'utilisation sont des composants séparés.
- **Duplication de ~150 lignes de SVG supprimée.** La coupe transversale de
  la poutrelle était copiée-collée quasiment à l'identique dans l'onglet
  "Schémas" et dans la "Note de calcul" (deux jeux de couleurs, deux ids de
  marqueur). Elle est désormais un composant unique (`CoupeTransversale`),
  paramétré par une prop `isPrint`. Toute correction future ne se fait
  qu'à un seul endroit.
- **Fenêtre d'aide réduite de ~450 à ~150 lignes.** L'ancienne fenêtre
  "Manuel" reproduisait pixel pour pixel l'interface avec des valeurs
  d'exemple figées en dur (ex. "Cat. A : Habitation (1.5 kN/m²)" affiché
  quelle que soit la sélection réelle de l'utilisateur), pour un contenu
  informatif équivalent. Remplacée par un contenu structuré, réutilisant
  le composant réel de schéma pour l'illustration.
- **`as any` éliminés.** Trois échappatoires au typage (`as any`) ont été
  remplacées par des types précis (`AppuiType`, unions de littéraux pour
  les classes d'exposition/structurale/usage, clés typées pour les champs
  de charges).
- **`@types/react` / `@types/react-dom` absents du projet.** Le projet
  utilisait TypeScript mais **sans aucune définition de type React**
  installée. Conséquence concrète : la vérification de types sur les
  props et le JSX était quasiment inopérante (`tsc --noEmit` passait sans
  erreur même avec des props manifestement incompatibles). Ajoutées ; le
  projet passe désormais `tsc --noEmit --strict` sans aucune erreur, ce qui
  n'était pas vérifiable auparavant.
- **`tsconfig.json` passé en mode strict** (`strict`, `noUnusedLocals`,
  `noUnusedParameters`), pour empêcher que ce type de régression ne revienne
  silencieusement.
- **Dépendances mortes supprimées du `package.json` :** `@google/genai`,
  `express`, `dotenv`, `@types/express`, `tsx`. Aucune n'était utilisée
  dans le code (aucun appel IA, aucun serveur) — c'était un reliquat du
  gabarit "AI Studio" d'origine. `vite.config.ts` ne référence plus de
  `GEMINI_API_KEY` inexistant, et `.env.example`/`README.md` ne demandent
  plus une clé d'API dont l'application n'a jamais eu besoin.
- **Variables et paramètres morts supprimés** : un paramètre `h_m` (hauteur
  totale) était passé à `calculerSectionAcierTheorique` sans jamais être
  utilisé dans son corps ; une variable `h` équivalente, elle aussi
  inutilisée, dans l'orchestrateur principal.

---

## 6. Limite connue, non corrigée (nécessite un arbitrage métier)

- **Table d'enrobage minimal (c_min,dur) approximative.** L'EN 1992-1-1
  Tableau 4.4N donne des valeurs discrètes croisant classe d'exposition et
  classe structurale (S1 à S6). Le logiciel utilise une approximation
  (le c_min,dur "de base" varie avec fck comme proxy indirect de la classe
  structurale, puis un correctif forfaitaire +10 %/+20 % pour S5/S6) plutôt
  que la vraie table croisée. C'est une simplification déjà présente dans
  la version d'origine, cohérente pour un outil d'avant-projet, mais qui
  doit être vérifiée/complétée par l'ingénieur pour un dossier
  d'exécution — elle n'a pas été réécrite ici pour rester dans le
  périmètre "audit et correction de bugs" plutôt que "refonte du moteur
  réglementaire". Un commentaire explicite le signale directement dans
  `src/lib/eurocode2.ts`.
- De même, α_cc = 1.0 est utilisé implicitement (fcd = fck/1.5) ; certaines
  pratiques nationales retiennent 0.85. Non modifié (choix de l'origine),
  mais documenté.

---

## 7. Récapitulatif des fichiers modifiés/ajoutés

```
src/types.ts                       + champs/typages plus précis (unions, InfosProjet, poids_entrevous_manuel)
src/lib/eurocode2.ts        (new)  moteur de calcul pur, tous les correctifs §1-2
src/lib/format.ts           (new)  affichage sûr des sections/ratios non finis
src/components/CoupeTransversale.tsx (new)  schéma partagé (fin de la duplication)
src/components/ManuelModal.tsx       (new)  manuel condensé
src/App.tsx                        réécrit : useMemo au lieu de useEffect/useState,
                                    nouveaux contrôles (§3), suppression des `as any`
package.json / vite.config.ts / README.md / .env.example
                                    dépendances mortes retirées, config nettoyée
tsconfig.json                      strict: true, noUnusedLocals/Parameters
```

Vérifications effectuées avant livraison : `tsc --noEmit --strict` (0
erreur), `vite build` (succès), et une série de scénarios numériques
reproduisant chacun des bugs ci-dessus avant/après correctif.

---

## 8. Évolutions demandées après la livraison initiale (session 2)

Cinq demandes complémentaires ont été traitées après la première livraison,
avec les mêmes exigences de vérification (compilation stricte + scénarios
numériques rejoués avant/après).

### 8.1 Panneau de gauche flottant
Le panneau de saisie (Dimensions/Matériaux/Charges/Armatures) est
maintenant collant (`position: sticky`) sur grand écran : il reste visible
pendant le défilement des résultats, au lieu de défiler avec le reste de
la page. Comportement inchangé sur mobile (empilement normal).

### 8.2 Aciers de construction (chapeau) même en poutrelle isostatique
Auparavant, `choix_appui` valait `null` dès que la poutrelle était
isostatique, masquant complètement la carte correspondante. Le moteur de
calcul (`calculerResultats`) calcule désormais toujours un acier
supérieur :
- **Continue** : inchangé, calculé à partir du moment sur appui (Mapp = 0.5·M0).
- **Isostatique** : un chapeau de construction forfaitaire, égal au plus
  grand de la section minimale de non-fragilité (EC2 §9.2.1.1) et de 15 %
  de l'acier de travée — cette règle des 15 % est une convention usuelle,
  clairement documentée en commentaire (`appui_calcule: false` dans les
  résultats) pour qu'elle soit ajustable si le bureau d'études applique un
  autre ratio.

Un nouveau champ `appui_calcule` distingue les deux cas partout dans
l'interface (libellés, avertissement contextuel, forme du façonnage dans
la nomenclature) et la longueur développée du chapeau (`longueur_chapeau`)
est calculée différemment : L/2 de part et d'autre de l'appui si calculé
(inchangé), ou L/5 + retombée verticale + crochet si forfaitaire (forme en
L avec crochet plongeant, cohérente avec le croquis fourni — voir 8.3).

### 8.3 Schéma de ferraillage de l'étrier
Deux séries de croquis manuscrits ont permis de préciser la forme exacte
attendue. L'étrier n'est ni un cadre rectangulaire fermé classique
(première hypothèse, corrigée), ni une boucle arrondie (version d'origine,
buggée) : c'est **une polyligne unique** qui longe le lit inférieur en
crochetant chaque extrémité, et qui ne remonte jusqu'au lit de chapeau que
pour les brins intermédiaires (ajoutés au-delà de 2 branches) :
- **2 branches** : deux crochets courts (jusqu'à mi-hauteur de l'âme) aux
  deux extrémités, reliés par une seule barre filante en fond de moule.
- **3 branches** : un brin intermédiaire supplémentaire, qui remonte du
  fond de moule jusqu'au lit de chapeau, fait un court crochet, puis
  redescend, avant de poursuivre le lit inférieur.
- **4 branches** : deux brins intermédiaires symétriques (à 1/3 et 2/3 de
  la largeur), même logique.

Ce tracé est reconstruit dans `CoupeTransversale.tsx` comme un unique
`<path>` (plus deux petits crochets semi-circulaires aux extrémités
libres), remplaçant l'ancien mélange de rectangle/arcs + lignes
indépendantes pour les brins additionnels.
**Limite connue** : la position horizontale des brins intermédiaires est
répartie uniformément (1/2, ou 1/3–2/3 de la largeur de l'âme) plutôt que
calée exactement sur la position réelle d'une barre de chapeau centrale —
simplification schématique assumée, à corriger si un calage pixel-parfait
est nécessaire.

**Ajustement (retour utilisateur sur l'illustration)** : les crochets
d'about s'arrêtent désormais exactement au niveau des barres de travée
extrêmes (rouge), au lieu de remonter jusqu'à mi-hauteur de l'âme comme
dans la première version.

**Résolution de la question de cohérence (tranchée par l'utilisateur)** :
le tracé vert (crochets d'about + lit inférieur + détour central vers le
chapeau) est désormais **fixe et inconditionnel** — il ne dépend plus du
nombre de barres inférieures ni de `nb_branches_etrier`. Le cas nommé
« 2 barres inférieures » et celui nommé « 3 barres inférieures » utilisent
rigoureusement le même tracé vert ; seul le point rouge central (lit
inférieur) apparaît ou disparaît selon `nb_travee`. Le sens des deux
crochets d'about a également été inversé sur retour utilisateur.
`nb_branches_etrier` reste utilisé tel quel pour le calcul de la section
d'acier transversal (Asw/s) ; il n'influence plus le tracé du schéma.

### 8.4 Vérifications d'usage Eurocode dans l'onglet Synthèse
Le bloc "États limites & conformité" (ferraillage, flexion, cisaillement,
flèche, contraintes ELS — 5 vérifications) n'apparaissait que dans l'onglet
"Plans & Schémas". Il a été extrait en un composant partagé
(`VerificationsBoard`) et ajouté également à l'onglet "Synthèse", juste
après le détail du ferraillage. La note de calcul reçoit en plus une
nouvelle section **"5. Synthèse des vérifications réglementaires"** : un
tableau unique conforme/non conforme rassemblant les 5 vérifications et la
conclusion générale, là où elles étaient auparavant dispersées entre les
sections 3 et 4 sans récapitulatif consolidé.

### 8.5 Nomenclature des aciers "aux Eurocodes"
Nouveau module `src/lib/nomenclature.ts` centralisant des codes de forme
simplifiés (inspirés d'EN ISO 3766 / usage des bordereaux d'armatures) :
- Aciers de travée : forme "00 – Droit, ancrage 40Ø à chaque about".
- Chapeau : forme "00 – Droit" (calculé, continu) ou "01 – L avec crochet
  plongeant" (construction, isostatique — cohérent avec 8.2/8.3).
- Étriers : forme "51 – Cadre fermé, crochets 135°", avec les dimensions
  hors-tout A (largeur intérieure) × B (hauteur intérieure) calculées à
  partir de la largeur d'âme, de la hauteur totale et de l'enrobage.

Une colonne "Forme" a été ajoutée aux deux tableaux de nomenclature
(Synthèse et Note de calcul), qui utilisent désormais les mêmes fonctions
partagées pour rester cohérents entre eux.


### 8.6 Vérifications d'usage complètes + longueur d'ancrage réglementaire
Trois vérifications usuelles manquaient encore à l'appel :

- **Pourcentage d'armature maximal** (EN 1992-1-1 §9.2.1.1(3)) : As ≤
  As,max = 0.04·Ac (Ac = section brute en T, dalle + âme). Rien ne
  l'empêchait auparavant : un choix de barres surdimensionné pouvait
  dépasser cette limite sans le moindre avertissement. Testé et vérifié :
  déclenche bien "NON CONFORME" avec une âme étroite et de grosses barres.
- **Espacement maximal des étriers** (EN 1992-1-1 §9.2.2(6)) : la valeur
  smax = min(0.75d, 30 cm) était déjà utilisée en interne pour brider
  l'espacement calculé, mais jamais affichée — impossible de vérifier
  a posteriori que le choix retenu la respecte. Elle est maintenant exposée
  explicitement (`s_max_cm`).
- **Longueur d'ancrage (lbd)** — et un correctif au passage : la longueur
  développée des aciers de travée utilisait un forfait **"40Ø" fixe**,
  quel que soit le béton. Recalculée selon EN 1992-1-1 §8.4
  (lb,rqd = (Ø/4)·(fyd/fbd), avec fbd = 2.25·fctd), la longueur réelle
  varie significativement avec fck : ≈ 46.8Ø pour C20/25, ≈ 40.4Ø pour
  C25/30 (donc le forfait "40Ø" était déjà tout juste insuffisant pour la
  classe de référence de l'outil), ≈ 35.7Ø pour C30/37. Le forfait "40Ø"
  était donc **non sécuritaire pour C20/25 et C25/30** — corrigé : la
  longueur des barres de travée (nomenclature comprise) utilise désormais
  lbd calculé, et une carte dédiée indique si le forfait usuel "40Ø" aurait
  suffi (à titre informatif, l'ouvrage utilise toujours la valeur exacte).

Ces trois vérifications sont intégrées au bloc `VerificationsBoard`
(Synthèse + Schémas) et à la synthèse consolidée de la note de calcul ; la
non-conformité au pourcentage d'armature maximal est désormais prise en
compte dans `est_valide`.

## 9. Trois passages d'audit supplémentaires (session 3) — nettoyage et réorganisation

Demande explicite : trois passages d'audit, suppression des bugs et du code
mort, réorganisation professionnelle des trois onglets, re-vérification de
conformité Eurocode. Résultat par passage :

### Passage 1 — code mort
- `genererCatalogue`, `choisirFerraillage`, `estSectionInsuffisante` et la
  constante `DIAMETRES_CATALOGUE` (`eurocode2.ts`) : un sous-système entier
  de sélection automatique par catalogue, jamais appelé nulle part depuis
  que le ferraillage est 100 % manuel (`choixManuel`). Supprimé.
- `EtriersResult.choix_optimal_nom` et `.Asw_opt_cm2` (`types.ts`) :
  déclarés, jamais assignés ni lus. Supprimés.
- `EtriersResult.V_Rds` était typé optionnel (`?`) alors que les deux
  branches de `calculerEtriers` le renseignent systématiquement — typage
  corrigé (non optionnel), qui a permis de retirer un `|| '0'` de secours
  devenu inutile.
- Import `Activity` (lucide-react) devenu orphelin après la fusion des
  en-têtes (§9.3). Supprimé.

### Passage 2 — bugs et incohérences
- **Bug réel** : la note de calcul recalculait `As,min` directement en JSX
  avec une formule **incomplète** (le plancher `0.0013·bw·d` manquait),
  affichant une valeur trop basse pour les bétons courants/faibles. Corrigé
  en exposant la valeur exacte (`ferraillage.As_travee_min`) depuis le
  moteur de calcul, garantissant que la note de calcul affiche exactement
  la valeur utilisée pour le dimensionnement.
- **Bug visuel** : dans le tableau ELS (§4.1 de la note de calcul), la
  cellule de vérification affichait toujours `text-emerald-700` (vert),
  y compris quand le texte affiché était "HORS LIMITE" — un dépassement de
  contrainte réel serait passé inaperçu visuellement sur un document
  formel. Couleur désormais pilotée par le résultat réel.
- **Incohérence schéma / nomenclature** : le libellé de forme de l'étrier
  décrivait encore un « cadre fermé, crochets 135° » — la forme d'origine,
  abandonnée depuis les révisions successives du schéma (voir §8.3). Il
  décrit maintenant fidèlement la forme réellement tracée (ligature filante
  + détour central), sans faux numéro de code EN ISO 3766, et les libellés
  "A/B" ont été reformulés en conséquence (portée du lit inférieur / hauteur
  du détour central, plutôt que largeur/hauteur d'un cadre qui n'existe
  plus).
- `formeEtrier(geometrie, enrobage_nominal)` était appelé 2 à 3 fois de
  suite dans le même bloc JSX (Synthèse et Note de calcul) au lieu d'être
  calculé une seule fois. Corrigé dans les deux onglets.
- Manuel d'utilisation : la section "Géométrie & système statique"
  affirmait encore qu'aucun acier de chapeau n'est prévu en poutrelle
  isostatique — obsolète depuis l'ajout du chapeau de construction
  forfaitaire (§8.2). Corrigé, et les trois vérifications d'usage
  complémentaires (§8.6) ont été ajoutées à la section "Moteur de calcul".
- Une ligne vide en double dans la note de calcul.

### Passage 3 — réorganisation professionnelle des onglets
- **En-têtes redondants fusionnés** : la page affichait un bandeau
  "Structural & Engineering Labs" en haut de page et, juste en dessous
  dans le panneau de gauche, une seconde carte "Aciers-Floor v2.5" — deux
  titres d'application empilés. Fusionnés en un seul en-tête (logo société
  + nom produit/version + accroche), et les champs Affaire/Réf. rejoignent
  le panneau de gauche comme simple section "Informations Projet",
  cohérente avec les sections Dimensions/Matériaux/Charges/Armatures qui
  suivent, au lieu d'une carte dédiée avec icône et titre en double.
- **Bloc de vérifications dédupliqué entre onglets** : "États limites &
  conformité" apparaissait à l'identique dans Synthèse *et* Schémas.
  Retiré de Schémas, qui se recentre sur les plans/diagrammes ; conservé
  dans Synthèse où il complète naturellement le détail du ferraillage.

### Vérification de conformité Eurocode (re-audit dédié)
Relecture intégrale de `eurocode2.ts` fonction par fonction et re-exécution
de l'ensemble des scénarios numériques des sessions précédentes (poids des
entrevous, cohérence des courbes M/V, chapeau isostatique, écrasement de
bielle, longueur d'ancrage par classe de béton, dépassement de As,max) :
tous les résultats restent identiques aux valeurs attendues, confirmant
qu'aucune régression n'a été introduite par ce nettoyage. `tsc --noEmit
--strict` et `vite build` passent sans erreur.

## 10. Étrier triangulaire (session 4)

Sur retour utilisateur, le tracé de l'étrier passe d'une "ligature filante
+ détour central" (comb) à un **étrier triangulaire** : deux brins inclinés
partant des crochets d'about (au niveau des barres de travée extrêmes) et
convergeant vers un sommet unique au niveau du lit de chapeau, sans
troisième côté horizontal séparé. C'est une forme réelle et courante pour
les poutrelles à âme étroite (façonnage à 2 plis au lieu de 4). Confirmé
avec l'utilisateur : le dimensionnement de l'effort tranchant (Asw/s,
cotθ, VRd,max, espacement) reste strictement inchangé, la formule EC2
comptant le nombre de brins traversant la fissure de cisaillement
(`nb_branches_etrier`), pas la forme exacte du façonnage.

**Bug réel découvert à cette occasion** : la longueur développée unitaire
de l'étrier (`longueur_etrier_unitaire`, utilisée dans la nomenclature et
le poids total d'acier) calculait encore le **périmètre d'un cadre
rectangulaire fermé** (2×largeur + 2×hauteur) — une formule héritée d'une
version bien antérieure du schéma, jamais mise à jour au fil des
révisions successives du tracé (ni pour la "ligature filante", ni
maintenant pour le triangle). Pour des dimensions courantes (âme 12 cm,
hauteur totale 20 cm, enrobage 20 mm), l'ancienne formule surestimait la
longueur réelle d'environ **37 %**, gonflant d'autant le métré d'acier des
étriers dans les devis. Corrigée : nouvelle fonction partagée
`lib/nomenclature.ts::longueurEtrier`, calculant deux fois la longueur
réelle d'un brin incliné (hypoténuse base/hauteur du triangle) plus une
allocation forfaitaire pour les crochets d'about, réutilisée à la fois
pour le calcul du poids total et pour l'affichage de la forme (A/B)
dans la nomenclature — une seule source de vérité pour la géométrie de
l'étrier.

Vérifié : `tsc --noEmit`, `vite build`, et calcul numérique direct
confirmant l'écart de ~37 % entre les deux formules pour un cas type.

## 11. Aide utilisateur implémentée (session 4, suite)

Contenu complet de l'aide rédigé, soumis à relecture (`AIDE_BROUILLON.md`),
approuvé, puis implémenté dans `src/components/ManuelModal.tsx` — 5
sections couvrant la philosophie de l'outil, le détail de chaque champ du
panneau de gauche, le moteur de calcul complet (y compris l'étrier
triangulaire et les vérifications d'usage ajoutées en session 3), les
trois onglets de résultats, et la nomenclature. Le schéma d'exemple
(coupe transversale) reflète automatiquement la forme d'étrier actuelle
puisqu'il réutilise le composant `CoupeTransversale` partagé.

## 12. Méplat sommital et crochets de l'étrier triangulaire (session 4, suite)

Sur retour utilisateur, le sommet du triangle n'est plus un point unique où
les deux brins inclinés se rejoignent : c'est désormais un court **méplat
horizontal** (barre de tête, largeur forfaitaire de 5 cm — constante
`LARGEUR_SOMMET_CM` partagée entre le schéma et le calcul de longueur),
fermé par deux crochets repliés **vers l'intérieur et vers le bas**,
représentant plus fidèlement le façonnage réel et la fermeture du
façonnage autour du lit de chapeau.

La longueur développée (`lib/nomenclature.ts::longueurEtrier`) est mise à
jour en conséquence : chaque brin incliné va désormais du crochet d'about
jusqu'à son coin du méplat (et non plus jusqu'à l'axe central), plus la
longueur du méplat lui-même, plus une allocation forfaitaire couvrant les
4 crochets (2 en pied, 2 en tête, contre 2 seulement avant). Pour le cas
type déjà utilisé dans l'audit (âme 12 cm, hauteur totale 20 cm, enrobage
20 mm), la longueur passe de 0.43 m (triangle à pointe) à 0.52 m (avec
méplat et crochets de tête) — une variation cohérente avec l'ajout de
matière réel, et toujours nettement inférieure à l'ancienne formule de
périmètre rectangulaire (0.68 m, voir §10).

Le texte du manuel d'utilisation (`ManuelModal.tsx`) a été mis à jour en
conséquence (« sommet unique » → « méplat horizontal fermé par deux
crochets »). Vérifié : `tsc --noEmit`, `vite build`, calcul numérique de
la nouvelle longueur, et suite de régression complète rejouée sans écart.

## 13. Étrier triangulaire fermé, crochet normé 135°/10d (session 4, suite)

Sur fourniture d'une référence normative (EN ISO 4066 / NF A 35-027), le
tracé de l'étrier est corrigé une nouvelle fois : ce n'est ni un méplat
ouvert avec deux crochets aux coins (version précédente), ni un simple
triangle à sommet ponctuel, mais un façonnage **fermé** — une base (le
long des barres de travée extrêmes) et deux côtés montant jusqu'à un
sommet commun, les trois angles étant de simples pliures, le tout fermé
au **sommet** par un crochet normé à 135° avec une queue de 10 diamètres
(« 10d »).

**Longueur développée** (`lib/nomenclature.ts::longueurEtrier`) recalculée
en conséquence — désormais le périmètre exact du triangle fermé (base +
2 côtés) plus la longueur réelle des deux crochets de fermeture (2×10Ø,
dépendant du diamètre d'étrier réellement choisi, et non plus une
allocation forfaitaire fixe). La fonction prend donc maintenant en
paramètre le diamètre de l'étrier ; vérifié numériquement que la longueur
croît correctement avec le diamètre choisi (HA6 → 0.53 m, HA8 → 0.57 m,
HA10 → 0.61 m, sur le cas type de l'audit) — un forfait fixe aurait
masqué cette dépendance légitime.

Schéma (`CoupeTransversale.tsx`) et texte d'aide (`ManuelModal.tsx`) mis à
jour en cohérence. Vérifié : `tsc --noEmit`, `vite build`, et suite de
régression complète rejouée sans écart.

## 14. Restructuration de l'application (session 5)

Quatre demandes traitées :

### 14.1 Suppression de l'onglet "Plans & Schémas"
L'onglet est retiré (bouton, état `activeTab`, composant `SchemasTab`
supprimé en totalité — pas seulement masqué). L'application ne compte
plus que deux onglets : Synthèse et Note de calcul. Le contenu explicatif
qu'il portait (coupe transversale, diagrammes M/V) n'est pas perdu : la
coupe transversale reste visible dans la Note de calcul (§1.1) et les
deux sont désormais richement expliqués, avec formules, dans le manuel
(§14.2). Import `Layout` (lucide-react), devenu orphelin, supprimé.

### 14.2 Manuel enrichi — illustrations et formules complètes
Le manuel passe de 5 sections condensées à 9 sections détaillées, chacune
associée à une ou plusieurs illustrations reproduisant fidèlement le
style réel de l'application (classes `win-card`/`win-input`/`win-inset`
existantes, plutôt que des captures d'écran statiques impossibles à
générer dans cet environnement) et, systématiquement, aux formules de
calcul sous-jacentes dans un encadré dédié : enrobage et hauteur utile,
descente de charges et combinaisons, sollicitations forfaitaires, flexion
en Té (µ, α, As, As,min), chapeau de construction forfaitaire, VRd,c,
VRd,s, VRd,max, espacement des étriers, longueur développée de l'étrier
triangulaire (avec le crochet 10d), contraintes ELS en section fissurée,
les deux branches de la formule de flèche (7.16a/7.16b), pourcentage
d'armature maximal et longueur d'ancrage réglementaire. C'est désormais
la référence complète pour comprendre chaque écran et chaque calcul.

### 14.3 Renommage de l'application
« Aciers-Floor v2.5 » devient **Plancher Corps Creux Designer Pro v1.0**
— en-tête de l'application, `index.html` (dont le `<title>` affichait
encore le placeholder d'origine du gabarit « My Google AI Studio App »,
jamais corrigé lors des audits précédents), `metadata.json`, `README.md`,
`MANUEL_UTILISATION.md`, `package.json` (nom du paquet npm et version
`1.0.0`) et le texte du manuel d'aide.

### 14.4 Suppression du bandeau de progression des cartes de synthèse
Les trois cartes "Moment Travée", "Tranchant VEd" et "Masse Acier" de
l'onglet Synthèse affichaient chacune une barre de progression colorée en
pied de carte. Retirées sur demande explicite (la barre "Masse Acier"
était d'ailleurs toujours figée à 100 % quelle que soit la valeur réelle,
sans rapport avec une limite — un signal visuel dénué de sens qu'il était
légitime de retirer).

Vérifié : `tsc --noEmit`, `vite build`.

## 15. Mode compact "calculette" (session 6)

Sur demande explicite ("rendre l'application très compacte, à l'image
d'une calculette"), l'onglet Synthèse — qui reposait sur un tableau de
bord large deux colonnes (panneau de saisie à gauche, grandes cartes de
résultats à droite) — est remplacé par un panneau unique, dense, centré
(largeur max. ~672px), où entrées et résultats cohabitent dans la même
colonne :

- **Quatre groupes d'entrées** (Géométrie, Matériaux & Durabilité,
  Charges, Armatures) en grille compacte, chaque champ affiché comme une
  ligne légende-fixe + valeur-alignée-à-droite — jamais de libellé en
  `placeholder` qui disparaîtrait à la saisie (défaut identifié et corrigé
  dès la phase de maquette, avant tout code).
- **Options avancées repliées par défaut** (enrobage manuel, poids
  entrevous manuel, nombre/diamètre du chapeau, brins d'étrier) — des
  réglages exceptionnels, presque toujours laissés en automatique, qui
  n'ont pas besoin d'occuper une ligne en permanence. Repliage, pas
  suppression : tout reste accessible en un clic, rien n'est perdu.
- **Bandeau de statut, résultats clés, ferraillage retenu (éditable),
  8 vérifications réglementaires et nomenclature** — tous affichés
  simultanément, sans pagination ni carte verrouillée en lecture seule,
  conformément à l'exigence explicite de pouvoir tout voir et tout
  modifier sans étape cachée.
- **Bouton "Voir le rapport complet"** en bas de panneau, qui bascule vers
  l'onglet Note de calcul existant (cartouche, hypothèses, sollicitations,
  diagrammes M/V, vérifications détaillées, nomenclature avec
  récapitulatif par diamètre) — inchangé, toujours exportable en PDF.

Aucune fonction du moteur de calcul (`eurocode2.ts`, `nomenclature.ts`)
n'a été modifiée : seule la présentation change. L'ancien composant
`ResultatsTab` (tableau de bord large) et `VerificationsBoard` (bloc de
vérifications en grandes cartes) sont supprimés, remplacés par
`SyntheseCompacte` et de petits composants partagés (`LigneChamp`,
`EntreeNombre`, `EntreeSelect`, `GroupeCompact`, `StatutIcone`). Le grand
bandeau société (logo complet + accroche) disparaît de l'en-tête
courante, au profit d'un bandeau fin ; il reste utilisé tel quel dans le
cartouche de la note de calcul, où sa présence formelle garde son sens.

Vérifié : `tsc --noEmit`, `vite build`.

## 16. Renommage final : Calculette EC2 Plancher Corps Creux

Sur choix de l'utilisateur (parmi plusieurs propositions intégrant
"Calculette"), l'application est renommée une dernière fois :
**Calculette EC2 Plancher Corps Creux** (v1.0), remplaçant "Plancher
Corps Creux Designer Pro". Mis à jour partout : en-tête de l'application
(`App.tsx`), manuel d'aide (`ManuelModal.tsx`), `index.html`,
`metadata.json`, `package.json` (nom du paquet npm), `README.md` et
`MANUEL_UTILISATION.md`. Les entrées précédentes de ce journal d'audit,
qui font référence aux noms antérieurs de l'application, sont laissées
telles quelles : elles décrivent fidèlement l'état du projet au moment
où chaque changement a été fait.

Vérifié : `tsc --noEmit`, `vite build`.

## 17. Cartouche compact + paramétrage dédié (session 7)

Sur fourniture d'un modèle de référence (`Cartouche_SEL.html`), le
cartouche de la note de calcul est repris intégralement :

- **Nouveau composant `Cartouche.tsx`** — trois colonnes égales (logo /
  projet / rédacteur+titre), padding réduit (16px), typographie fine,
  fidèle au modèle fourni. Remplace l'ancien cartouche "premium" (colonnes
  inégales 0.35/1, gros padding, titre en text-xl), jugé trop encombrant.
- **Bouton de paramétrage dédié** — les champs du cartouche (projet,
  référence, rédacteur, bureau d'études, date, sous-titre) étaient
  auparavant du texte directement éditable en survol (astuce peu visible,
  incompatible avec la mise en page compacte du nouveau modèle, qui montre
  du texte simple). Un bouton "Paramétrer le cartouche" ouvre désormais
  une fenêtre dédiée (`CartoucheSettingsModal.tsx`) à côté du bouton
  d'export PDF.
- **Affichage sombre à l'écran, clair à l'impression** — comme dans le
  modèle fourni : fond `#0b111e` et texte blanc par défaut, bascule vers
  fond blanc et texte noir en impression (`@media print`, classe
  `.cartouche-sel` dans `index.css`), à l'exception de la touche de
  couleur de marque (bleu du logo, `#3a9bd5`) qui reste visible sur le
  tirage papier — reprend exactement le comportement du modèle fourni.
  L'ancien CSS d'impression, qui forçait au contraire le cartouche à
  rester sombre sur le papier et ciblait la structure de l'ancien
  cartouche (`.cartouche > div`, `flex flex-row`), est remplacé.
- **Nettoyage** : `SEL_Logo`, devenu mort dans `App.tsx` (son unique usage
  était l'ancien cartouche), est supprimé — le logo vit désormais
  uniquement dans `Cartouche.tsx`, son seul point d'utilisation.

Un choix d'interprétation à signaler : le modèle fourni affiche "Structural
& Engineering Labs" dans la cellule "Rédacteur", ce qui fait doublon avec
le nom déjà visible sur le logo. Le nouveau cartouche y affiche à la place
`infosProjet.redacteur` (le nom de la personne, ex. "J. DOE"), plus
cohérent avec le libellé "Rédacteur" — à corriger si une autre valeur
était attendue.

Vérifié : `tsc --noEmit`, `vite build`, rendu visuel comparé au modèle fourni.

## 18. Audit final avant publication (session 8)

Relecture complète et systématique de l'ensemble du code, fichier par
fichier, avant mise en production. Dix points corrigés :

1. **Champs `email`/`telephone` supprimés** (`InfosProjet`) — jamais
   affichés nulle part dans l'interface, ils contenaient des coordonnées à
   l'apparence réelle (adresse mail, numéro de téléphone) codées en dur
   comme valeurs par défaut depuis la toute première version de
   l'application. Code mort, et prudence légitime avant publication : un
   champ non affiché mais présent dans le code source reste visible à qui
   l'inspecte.
2. **Police du cartouche corrigée** — `Cartouche.tsx` héritait
   silencieusement de la police serif imposée par `.note-de-calcul`
   (le conteneur parent), alors que le modèle fourni spécifie explicitement
   une police sans-serif pour le cartouche. `font-sans` ajouté explicitement
   sur le composant pour le rendre robuste au contexte où il est inséré.
3. **Résidu d'édition en survol supprimé** — le bloc de signature "Visa de
   l'Ingénieur" en fin de note de calcul avait gardé l'ancien champ
   `auteur` éditable au survol (`cursor-edit`), le même défaut corrigé pour
   le cartouche en session 7 mais oublié à cet autre endroit du document.
   Toutes les éditions de `infosProjet` passent désormais uniformément par
   la fenêtre "Paramétrer le cartouche".
4. **Vérification "40Ø" restaurée** — `conforme_40phi` (l'information
   utile "le forfait usuel 40Ø aurait-il suffi ?") était calculée mais
   n'était plus affichée nulle part depuis le passage au mode compact, qui
   a remplacé l'ancien tableau de vérifications sans reprendre cette carte.
   Réintégrée sous forme de note contextuelle dans la légende des formes de
   façonnage, sans la présenter à tort comme une non-conformité (le
   dimensionnement reste toujours conforme, puisque lbd calculé est
   toujours utilisé quel que soit le résultat de cette comparaison
   informative).
5. Une ligne vide en double supprimée.
6. **Manuel d'utilisation mis à jour** — resté rédigé pour l'ancienne
   interface (bandeau large + panneau de gauche fixe) malgré le passage au
   mode compact et au nouveau cartouche : références au "panneau de
   gauche" corrigées, illustration "Informations Projet" retirée de la
   section Géométrie (ces champs vivent désormais dans le cartouche et sa
   fenêtre de paramétrage, pas dans la Synthèse), libellés d'illustration
   alignés sur les noms réels des groupes compacts, mention ajoutée des
   "Options avancées", du bouton "Paramétrer le cartouche" et du bouton
   "Voir le rapport complet", et la maquette du cartouche dans le manuel
   remplacée par une version fidèle au nouveau cartouche à 3 colonnes
   (l'ancienne montrait encore le cartouche "premium" abandonné en
   session 7).
7. **`lang="en"` → `lang="fr"`** dans `index.html` — l'attribut de langue
   du document ne correspondait pas au contenu (100 % en français),
   pénalisant les lecteurs d'écran et le référencement. Un oubli du gabarit
   d'origine, jamais corrigé lors des audits précédents.
8. **`README.md` corrigé** — mentionnait encore un onglet "Schémas"
   supprimé depuis la session 6, et la description de l'arborescence
   n'incluait pas `nomenclature.ts`, `Cartouche.tsx` ni
   `CartoucheSettingsModal.tsx`, ajoutés depuis sa dernière mise à jour.
9. **`AIDE_BROUILLON.md` supprimé** — brouillon de travail utilisé pour
   soumettre le contenu du manuel à validation avant implémentation ; son
   contenu a été entièrement repris dans `ManuelModal.tsx`, le fichier
   n'avait plus lieu d'être conservé à la racine du projet.
10. **`.gitignore` nettoyé** — référençait encore `.env.example`, un
    fichier supprimé lors du tout premier audit (l'application n'utilise
    aucune variable d'environnement, aucune clé d'API).

Vérifié : `tsc --noEmit --strict` (0 erreur), `vite build` (succès), et
l'intégralité de la suite de scénarios numériques accumulée depuis le
premier audit rejouée sans le moindre écart — aucune régression
introduite par ce dernier passage.
