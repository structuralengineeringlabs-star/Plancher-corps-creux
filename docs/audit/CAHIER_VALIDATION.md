# Cahier de validation du moteur de calcul du plancher à corps creux

Version 1.0.0 — généré automatiquement par `npm run validation` le 13/10/2026.

Chaque cas compare la valeur du moteur (`src/plancher/`) à une référence indépendante du code :
calcul manuel détaillé, ou modèle Python indépendant (`scripts/reference/plancher_reference.py`) :
équilibre des sections par dichotomie (sans formules fermées), section fissurée par intégration en tranches,
flèche par double intégration numérique de la courbure (indépendante du théorème de la charge unité du moteur).
Les exemples publiés (guides d'application de l'Eurocode 2) restent à ajouter (registre des écarts).

| Cas | Domaine | Article | Grandeur | Référence | Obtenu | Écart | Tolérance | Méthode | Statut |
|---|---|---|---|---|---|---|---|---|---|
| M1 | Matériaux | §3.1.6 | fcd, C25/30, αcc = 1,0, γc = 1,5 (MPa) | 16,667 | 16,667 | 0,0000 | ±0,0000 | Manuel : 1,0 × 25 / 1,5 | ✅ |
| M2 | Matériaux | §2.4.2.4 | fyd, B500, γs = 1,15 (MPa) | 434,78 | 434,78 | 0,0000 | ±0,0000 | Manuel : 500 / 1,15 | ✅ |
| M3 | Matériaux | Tab. 3.1 | Ecm, C25/30 (fcm = 33 MPa) (MPa) | 31475,8 | 31475,8 | 0,0062 | ±0,5000 | Manuel : 22 000 × (33/10)^0,3 | ✅ |
| M4 | Durabilité | Tab. 4.3N, 4.4N | cnom, XC1, S4 (cmin,dur = 15), Δcdev = 10 (mm) | 25,000 | 25,000 | 0,0000 | ±0,0000 | Manuel : max(cmin,b ; 15 ; 10) + 10 | ✅ |
| M5 | Fluage | Annexe B | φ(∞,t0), C30/37, RH 50 %, h0 200 mm, 28 j, 20 °C (—) | 2,367 | 2,367 | 0,0003 | ±0,0020 | Manuel (B.1 à B.10), cas commun aux applications | ✅ |
| M6 | Retrait | §3.1.4, B.11 | εcs(∞), C25/30, RH 70 %, h0 200 mm (µm/m) | 364,30 | 364,31 | 0,0122 | ±0,2000 | Manuel : kh = 0,85 ; εcd,0 = 384,5 ; εca = 37,5 | ✅ |
| C1 | Charges | EN 1991-1-1 | G0 : dalle 1,0 + nervure 1,0 + entrevous 0,6 (kN/m²) | 2,600 | 2,600 | 0,0000 | ±0,0000 | Manuel : 0,04×25 ; 0,12×0,2×25/0,6 ; 0,75×0,48/0,6 | ✅ |
| C2 | Charges | EN 1990 §6.4.3.2 | pELU = 1,35 g + 1,5 q (g = 3,30 ; q = 1,20 kN/m) (kN/m) | 6,255 | 6,255 | 0,0000 | ±0,0000 | Manuel : 4,455 + 1,8 | ✅ |
| C3 | Charges | EN 1990 §6.5.3 | pQP = g + ψ2·q (ψ2 = 0,3) (kN/m) | 3,660 | 3,660 | −0,0000 | ±0,0000 | Manuel : 3,30 + 0,3 × 1,20 | ✅ |
| A1 | Analyse | méthode forfaitaire | Mt = 0,8·M0, 3 travées, M0 = 12,51 kN·m (kN·m) | 10,008 | 10,008 | 0,0000 | ±0,0000 | Manuel : 0,8 × 6,255 × 4² / 8 | ✅ |
| A2 | Analyse | méthode forfaitaire | Ma = 0,5·M0, appui intermédiaire, 3 travées (kN·m) | 6,255 | 6,255 | 0,0000 | ±0,0000 | Manuel : 0,5 × 12,51 | ✅ |
| A3 | Analyse | méthode forfaitaire | VEd = 1,1·V0, appui intermédiaire, 3 travées (kN) | 13,761 | 13,761 | 0,0000 | ±0,0000 | Manuel : 1,1 × 6,255 × 4 / 2 | ✅ |
| A4 | Analyse | méthode forfaitaire | Ma = 0,6·M0 et VEd = 1,15·V0, 2 travées (Ma) (kN·m) | 7,506 | 7,506 | 0,0000 | ±0,0000 | Manuel : 0,6 × 12,51 | ✅ |
| A5 | Analyse | poutre isostatique | Mt = M0 = pL²/8 (kN·m) | 12,510 | 12,510 | 0,0000 | ±0,0000 | Manuel : 6,255 × 16 / 8 | ✅ |
| F1 | Flexion | §5.3.2.1 | beff, entraxe 600, bw 120, l0 = 0,85 L = 3400 (mm) | 600,00 | 600,00 | 0,0000 | ±0,0000 | Manuel : bi = 240 ; min(388 ; 680 ; 240) → beff = bw + 2 × 240 = 600 | ✅ |
| F2 | Flexion | §6.1 | As requis en travée, MEd = 10,008 kN·m (axe neutre dans la table) (mm²) | 114,80 | 114,80 | −0,0000 | ±0,0500 | Python : dichotomie sur l’équilibre des moments | ✅ |
| F3 | Flexion | §6.1 | As requis, MEd = 60 kN·m, d = 159 (axe neutre dans l’âme, section en T vraie) (mm²) | 1012,9 | 1012,9 | −0,0000 | ±0,5000 | Python : dichotomie sur l’équilibre des moments | ✅ |
| F4 | Flexion | §6.1 | MRd, 2 HA12, d = 203 (kN·m) | 19,481 | 19,481 | 0,0000 | ±0,0010 | Python : dichotomie sur l’équilibre des efforts | ✅ |
| F5 | Flexion | §6.1 | MRd, 8 HA12, d = 159 (axe neutre dans l’âme) (kN·m) | 54,810 | 54,810 | 0,0000 | ±0,0050 | Python : dichotomie sur l’équilibre des efforts | ✅ |
| F6 | Flexion | §6.1 | As requis sur appui, Ma = 6,255 kN·m, section rectangulaire bw = 120, d = 204 (mm²) | 73,392 | 73,392 | 0,0000 | ±0,0500 | Python : dichotomie sur l’équilibre des moments | ✅ |
| F7 | Flexion | §9.2.1.1(1) | As,min, bw 120, d 203, fctm 2,565, fyk 500 (mm²) | 32,491 | 32,491 | 0,0000 | ±0,0010 | Manuel : max(0,26·fctm/fyk ; 0,0013)·bw·d | ✅ |
| T1 | Tranchant | §6.2.2 | VRd,c, bw 120, d 203, 2HA12, C25 (kN) | 16,616 | 16,616 | 0,0000 | ±0,0010 | Manuel : (0,18/1,5)·k·(100 ρ fck)^(1/3)·bw·d | ✅ |
| T2 | Tranchant | §6.2.3 | VRd,max, bw 120, d 204, cot θ = 2,5, C25 (kN) | 68,375 | 68,375 | 0,0000 | ±0,0010 | Manuel : bw·z·ν1·fcd / (cot θ + tan θ), ν1 = 0,6(1 − 25/250) = 0,54 | ✅ |
| T3 | Tranchant | §6.2.3 | VRd,s, 2 brins HA6 à e = 150, d 203, cot θ = 2,5 (kN) | 74,866 | 74,866 | 0,0000 | ±0,1000 | Manuel : Asw/s·z·fyd·cot θ  | ✅ |
| E1 | ELS | §7.2 | Axe neutre fissuré y, Mser = 8 kN·m, 2HA12 (nervure partiellement comprimée) (mm) | 42,651 | 42,651 | −0,0002 | ±0,0100 | Python : dichotomie sur le moment statique, tranches de 0,05 mm | ✅ |
| E2 | ELS | §7.2 | σs fissuré, Mser = 8 kN·m, 2HA12 (MPa) | 187,26 | 187,26 | 0,0002 | ±0,0500 | Python : αe·M·(d − y)/Icr | ✅ |
| E3 | ELS | §7.2 | σc fissuré, Mser = 8 kN·m, 2HA12 (MPa) | 3,321 | 3,321 | −0,0000 | ±0,0100 | Python : M·y/Icr | ✅ |
| E4 | ELS | §7.2 | σs fissuré, section en T à axe neutre profond (4HA16, d 159, Mser 12 kN·m) (MPa) | 105,93 | 105,93 | −0,0007 | ±0,0500 | Python : dichotomie, tranches | ✅ |
| E5 | ELS | §7.2 | σs fissuré, appui rectangulaire (Mser = 4,5 kN·m, 2HA10, bw 120, d 204) (MPa) | 159,15 | 159,15 | 0,0000 | ±0,0500 | Python : dichotomie sur le moment statique | ✅ |
| E6 | ELS | Tab. 7.2N | Φ*s à σs = 260 MPa, wmax = 0,3 mm (mm) | 14,000 | 14,000 | 0,0000 | ±0,0000 | Manuel : interpolation 240 MPa → 16 mm, 280 MPa → 12 mm | ✅ |
| E7 | Flèche | §7.4.3 | Flèche à long terme, isostatique 4 m, 2HA12, φ = 2,0, εcs = 350 µm/m (mm) | 9,454 | 9,457 | 0,0035 | ±0,0500 | Python : double intégration de la courbure (ζ, tranches) | ✅ |
| E8 | Flèche | §7.4.3 | Flèche instantanée sous permanentes (avant cloisons), isostatique 4 m (mm) | 5,100 | 5,095 | −0,0048 | ±0,0200 | Python : double intégration de la courbure | ✅ |
| E9 | Flèche | §7.4.3 | Flèche à long terme, travée de rive continue (Ma = 0,5 M0, chapeaux 2HA10) (mm) | 5,034 | 5,011 | −0,0228 | ±0,0500 | Python : double intégration, M(x) = M0·4x(L−x)/L² − Ma·x/L | ✅ |
| D1 | Dispositions | §8.4.4 | lbd, HA12, C25, B500, bonne adhérence (mm) | 484,31 | 484,31 | −0,0000 | ±0,0500 | Manuel : Φ/4·σsd/fbd, fbd = 2,25·fctk,0,05/γc | ✅ |
| D2 | Dispositions | §9.2.1.4 | FE = 0,5·VEd·cot θ (kN) | 17,201 | 17,201 | 0,0000 | ±0,0000 | Manuel | ✅ |
| D3 | Dispositions | §8.2 | Étrier triangulaire : longueur développée (bw 120, h 240, c 25, Φ6) (mm) | 576,39 | 576,39 | 0,0000 | ±0,0000 | Manuel : A + 2·√((A/2)² + B²) + 2·10Φ | ✅ |

**Bilan : 36 / 36 cas conformes.**
