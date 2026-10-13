# Registre des écarts

Gravité : **critique** (résultat non sécuritaire ou faux), **majeur** (non-conformité normative, document inexploitable),
**mineur** (présentation, confort, cas marginal).

Versions auditées : « Aciers-Floor » v2.4 (export Google AI Studio, fichier `App.tsx` de 2 398 lignes) → livraison corrigée v2.5
(audit complet : `AUDIT_V1_AI_STUDIO.md`, écarts A1 à A5 ci-dessous) → **v1.0.0** (mise à jour sur le modèle de l'application POUTRES).

## A. Audit de la v2.4 (corrigé dans la livraison v2.5, résumé)

| N° | Gravité | Constat | Correction | Statut |
|---|---|---|---|---|
| A1 | Critique | VEd > VRd,max (bielle écrasée) affiché « conforme » | Verdict forcé non conforme, bandeau d'alerte | Clos (repris en V-MAX bloquante) |
| A2 | Majeur | Poids des entrevous indépendant de leur hauteur | Poids proportionnel à la hauteur, saisie du poids fabricant | Clos (C1) |
| A3 | Majeur | VRd,c calculé avec l'acier de chapeau en poutrelle isostatique ; plancher artificiel ρl | Acier de travée prolongé en isostatique, plancher supprimé | Clos (T1) |
| A4 | Majeur | Formule L/d (7.16b) avec terme parasite | Formule normative | Clos (remplacée par la flèche calculée, L/d indicatif) |
| A5 | Majeur | Diagrammes M(x)/V(x) incohérents avec les valeurs de calcul (20 % sur V) | Courbes ancrées sur Mt, Ma, VEd | Clos |

## B. Mise à jour v1.0.0 sur le modèle POUTRES

| N° | Gravité | Constat (v2.5 / v1 existante) | Référence | Correction (v1.0.0) | Contrôle | Statut |
|---|---|---|---|---|---|---|
| B01 | Majeur | Moteur et interface dans un fichier unique ; pas de tests ni de références indépendantes | — | Moteur pur `src/plancher/`, 83 tests, cahier de validation (36 cas) avec modèle Python | `npm run verifier` | Clos |
| B02 | Majeur | Section d'acier d'appui (chapeaux) non vérifiée (ni As,min, ni MRd, ni xu/d) ; poutrelle isostatique : aucun contrôle du chapeau de construction | §6.1, §9.2.1.2(1) | Flexion sur appui vérifiée (F-A, RED-A) ; chapeaux de construction As ≥ max(As,min ; 0,15·As travée) | F6, tests isostatique | Clos |
| B03 | Majeur | Poutrelle isostatique : chapeaux de construction métrés pour un seul appui au lieu de deux (même nombre que pour la poutrelle continue) | §9.2.1.2(1) | Isostatique : un jeu de chapeaux à chacun des deux appuis (2 × nombre saisi) ; continue : un jeu sur l'appui intermédiaire (0,25·L de part et d'autre) | tests nomenclature | Clos |
| B04 | Majeur | Flexion en section rectangulaire de largeur bw : dalle de compression ignorée | §5.3.2.1, §6.1 | Largeur participante beff, section en T | F1, F2, F3, F4, F5 | Clos |
| B05 | Majeur | Pas de contraintes ELS ni de maîtrise de la fissuration | §7.2, §7.3.3 | Section fissurée (αe = 15), Φ ≤ Φ*s (tab. 7.2N) en travée et sur appui | E1 à E6 | Clos |
| B06 | Majeur | Flèche limitée à une comparaison L/d, avec ρ rapporté à bw : planchers ordinaires rejetés | §7.4.2, §7.4.3 | Flèche calculée à long terme (ζ, fluage, retrait) et flèche nuisible L/500 ; L/d indicatif (non bloquant) | E7, E8, E9 | Clos (voir R-01) |
| B07 | Majeur | Enrobage par approximation forfaitaire (fck pris comme substitut de la classe structurale), non conforme au tableau 4.4N | §4.4.1 | cnom calculé (tab. 4.3N, 4.4N, Δcdev), ou saisi et contrôlé (D1) | M4 | Clos |
| B08 | Majeur | Verdict global sans périmètre ; données invalides acceptées | — | Verdict conforme / non conforme / non vérifié (saisie hors bornes), périmètre vérifié / non vérifié affiché | tests Validation | Clos |
| B09 | Majeur | Pas de traction d'ancrage à l'appui d'about ni de longueur d'ancrage | §8.4.4, §9.2.1.4 | FE = 0,5·VEd·cot θ ≤ As·fyd ; lbd calculé et métré | D1, D2 | Clos |
| B10 | Mineur | qk de la catégorie A à 1,5 kN/m² (valeur forfaitaire) | EN 1991-1-1 tab. 6.2 | qk recommandé de la catégorie A : 2,0 kN/m² (catégorie « personnalisée » pour une Annexe nationale) | C2, tests Charges | Clos (voir R-03) |
| B11 | Mineur | Δcdev nul par défaut (cnom 20 mm en XC1, C25/30) | §4.4.1.3 | Δcdev = 10 mm par défaut → cnom = 25 mm en XC1, S4 | M4 | Clos |
| B12 | Mineur | Géométrie et longueur développée de l'étrier triangulaire fermé non couvertes par un test | EN ISO 4066 | Géométrie centralisée (A, B, côtés, crochet 135°, queue 10Φ) et contrôlée | D3, tests nomenclature | Clos |
| B13 | Mineur | Données perdues au rechargement, pas de fichier projet | — | Sauvegarde automatique, fichiers `.plancher.json`, multi-planchers, fichiers d'une autre application refusés | e2e projet | Clos |
| B14 | Mineur | Application native dans sel-apps (code dupliqué) | — | Application compilée servie en iframe, comme poutres et poteaux | e2e, build sel-apps | Clos |

## C. Écarts ouverts

| N° | Constat | Décision attendue |
|---|---|---|
| R-01 | L/d (éq. 7.16) : lecture de ρ pour une section en T (As,req rapporté à beff·d ou à l'aire au-dessus des aciers). La flèche calculée fait foi ; L/d est indicatif | Confirmer la lecture sur exemple publié |
| R-02 | As,min d'appui : calculé avec bw (largeur de l'âme comprimée en partie basse) ; la lecture §9.2.1.1 sur nervure peut différer | Confirmer |
| R-03 | qk, ψ et wmax : valeurs recommandées de l'EN ; l'Annexe nationale peut différer (catégorie « personnalisée », option « Annexe France » pour wmax en XD/XS) | À confirmer sur le texte de l'AN |
| R-04 | Poids des entrevous estimé (0,6 kN/m² pour 160 mm) ; hf ≥ 40 mm retenu comme règle d'usage non bloquante | Remplacer par la fiche du fabricant |
| R-05 | Méthode forfaitaire : continuité des inerties et rapport des portées voisines non contrôlés (seul Q ≤ max(2G ; 5) l'est) | Information utilisateur |
| R-06 | Résistance au feu (EN 1992-1-2), planches A3 et DXF, guide PDF | **Levé en v1.1.0** (lot 2) : tableaux 5.5/5.6 de la nervure ; limites résiduelles : entrevous, critères E et I, dalle, tableaux §5.7 non traités (R-08) |
| R-07 | Navigateurs : Chromium testé (4 formats d'écran) ; Firefox et Safari non testés | `PW_TOUS_NAVIGATEURS=1` |
| R-08 | Feu : nervure traitée comme une poutre (tableaux 5.5/5.6) sans protection des entrevous ; tableaux des dalles nervurées (§5.7) non traités ; critères E et I réduits à une ligne indicative (hf comparée à hs du tableau 5.8, v1.1.1) | À valider avec un spécialiste feu si la résistance au feu est déterminante |
