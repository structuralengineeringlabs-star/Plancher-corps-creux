# Matrice de traçabilité normative

Version 1.0.0. Chaque règle du moteur (`src/plancher/`) est rattachée à son article, à la fonction qui la code et au contrôle
qui la vérifie (cas du cahier de validation `src/plancher/casValidation.ts` ou test de `src/plancher/plancher.test.ts`).

Statut : **V** vérifiée pendant l'audit sur une source consultée ; **R** valeur recommandée de l'EN, à confirmer pour
l'Annexe nationale retenue (registre, R-03) ; **I** hypothèse ou valeur indicative, signalée à l'utilisateur.

| ID | Domaine | Règle | Article | Fonction | Contrôle | Statut |
|---|---|---|---|---|---|---|
| N01 | Matériaux | fcd = αcc·fck/γc, αcc = 1,0, γc = 1,5 | §3.1.6(1) | `materiaux` | M1 | R |
| N02 | Matériaux | fyd = fyk/γs, γs = 1,15 ; acier à palier horizontal, Es = 200 GPa | §3.2.7, §2.4.2.4 | `materiaux` | M2 | R |
| N03 | Matériaux | fcm, fctm, Ecm = 22 000·(fcm/10)^0,3 ; diagramme rectangulaire λ, η, εcu3 | tab. 3.1, §3.1.7(3) | `proprietesBeton` | M3 | R |
| N04 | Durabilité | cnom = cmin + Δcdev ; cmin = max(cmin,b ; cmin,dur ; 10) | §4.4.1 | `materiaux` | M4, test enrobage | R |
| N05 | Durabilité | Classe structurale (tab. 4.3N) et cmin,dur (tab. 4.4N) | tab. 4.3N, 4.4N | `classeStructuraleDeterminee`, `cMinDur` | M4 | V |
| N06 | Fluage | φ(∞,t0), h0 = h, température et ciment | annexe B | `coefficientFluage` | M5 | R |
| N07 | Retrait | εcs = εcd + εca ; kh ; βRH | §3.1.4, B.11 | `retraitFinal` | M6 | R |
| N08 | Actions | G0 = poids de la dalle, de la nervure et des entrevous (25 kN/m³) | EN 1991-1-1 | `charges` | C1 | I (entrevous) |
| N09 | Actions | qk et ψ par catégorie | EN 1991-1-1 tab. 6.2 ; EN 1990 tab. A1.1 | `CATEGORIES` | tests Charges | R |
| N10 | Combinaisons | pELU = 1,35·g + 1,5·q ; ELS caractéristique, quasi-permanente g + ψ2·q | EN 1990 §6.4.3.2, §6.5.3 | `charges` | C2, C3 | R |
| N11 | Analyse | Isostatique : M0 = pL²/8, V0 = pL/2 | statique | `analyse` | A5 | V |
| N12 | Analyse | Continue (travée de rive), coefficients forfaitaires 0,8 ; 0,5 / 0,6 ; 1,1 / 1,15 | méthode forfaitaire | `analyse` | A1 à A4 | I |
| N13 | Analyse | Domaine : Q ≤ max(2·G ; 5 kN/m²) | méthode forfaitaire | `analyse`, vérification D3 | tests Domaine | I |
| N14 | Section | Largeur participante beff, l0 = L (isostatique) ou 0,85·L | §5.3.2.1, fig. 5.2 | `largeurParticipante` | F1 | V |
| N15 | Flexion | Section en T : As requis, axe neutre dans la table ou dans l'âme | §6.1 | `armaturesRequisesT` | F2, F3 | V |
| N16 | Flexion | MRd de la section fournie ; ductilité xu/d ≤ ξlim | §6.1(2) | `momentResistantT` | F4, F5 | V |
| N17 | Flexion | Appui : section rectangulaire bw × d | §6.1 | `armaturesRequisesRect` | F6 | V |
| N18 | Flexion | As,min = max(0,26·fctm/fyk ; 0,0013)·bw·d ; As,max = 0,04·Ac | §9.2.1.1 | `asMin`, `asMax` | F7, vérifications AMAX | V |
| N19 | Flexion | xu/d ≤ 0,45 sur appui (moments forfaitaires), non bloquant | §5.5(4) | vérification RED-A | tests | I |
| N20 | Dispositions | Poutrelle isostatique : chapeaux de construction ≥ max(As,min ; 0,15·As travée) | §9.2.1.2(1) | `calculerPlancher` | tests isostatique | V |
| N21 | Tranchant | VRd,c = max[(0,18/γc)·k·(100ρl·fck)^1/3 ; vmin]·bw·d | §6.2.2, éq. 6.2 | `vrdc` | T1 | V |
| N22 | Tranchant | VRd,max = bw·z·ν1·fcd/(cot θ + tan θ), z = 0,9·d | §6.2.3, éq. 6.9 | `vrdMax` | T2 | V |
| N23 | Tranchant | VRd,s = Asw/s·z·fyd·cot θ ; Asw/s ≥ ρw,min·bw ; s ≤ min(0,75·d ; 300) | §6.2.3, §9.2.2 | `etriers` | T3, tests Tranchant | V |
| N24 | Tranchant | Traction à ancrer à l'appui d'about FE = 0,5·VEd·cot θ | §9.2.1.4(2) | `effortTractionAppui` | D2 | V |
| N25 | ELS | Section fissurée (αe = 15), σc ≤ 0,6·fck (car.), 0,45·fck (q-p), σs ≤ 0,8·fyk | §7.2 | `contraintesFissureesT/Rect` | E1 à E5 | V |
| N26 | ELS | Fissuration sans calcul : Φ ≤ Φ*s (tab. 7.2N)·fctm/2,9, wmax selon exposition | §7.3.3 | `phiMaxFissuration` | E6, tests Fissuration | V |
| N27 | ELS | Flèche : courbures I et II, ζ = 1 − β(Mcr/M)², fluage Ec,eff, retrait | §7.4.3 | `flecheCalculee`, `courbure` | E7 à E9 | V |
| N28 | ELS | Limites L/250 (totale) et L/500 (nuisible) | §7.4.1(4)(5) | vérifications FL, FN | tests Flèche | R |
| N29 | ELS | L/d indicatif, F1 des sections en T, K = 1,3 (rive continue) | §7.4.2, éq. 7.16 | `flecheLd` | tests L/d | I (R-01) |
| N30 | Dispositions | Ancrage lbd, lb,min, bonne adhérence (h ≤ 250 mm pour les chapeaux) | §8.4.2 à §8.4.4 | `longueurAncrage` | D1 | V |
| N31 | Dispositions | Espacement libre ≥ max(Φ ; dg + 5 ; 20) | §8.2(2) | `espacementLibre` | tests Proposition | V |
| N32 | Nomenclature | Étrier triangulaire fermé : A + 2·√((A/2)² + B²) + 2·10Φ | EN ISO 4066 | `geometrieEtrier` | D3 | I |
