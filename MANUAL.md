# Méthodes de calcul et hypothèses

Unités internes : N, mm, MPa, N·mm (1 kN/m = 1 N/mm). Saisie : m (portée, entraxe), mm (sections), kN/m² (charges).

## 1. Géométrie et charges
- Poutrelle représentative de largeur tributaire b = entraxe ; section en T : dalle hf, âme bw, hauteur totale h = hf + hauteur du corps creux.
- Poids propre : G0 = hf·25 + bw·hc·25/b + p_entrevous·(b − bw)/b (kN/m²). p_entrevous estimé à 0,6 kN/m² pour 160 mm,
  proportionnel à la hauteur, sauf saisie du fabricant (**hypothèse I**).
- Charges permanentes rapportées : chape, revêtement, faux plafond, cloisons. Charge d'exploitation qk et ψ2 : EN 1991-1-1 tab. 6.2 / EN 1990 tab. A1.1 (valeurs recommandées ; « personnalisée » pour une Annexe nationale).
- ELU : pELU = 1,35·g + 1,5·q ; ELS : caractéristique g + q ; quasi-permanente g + ψ2·q.

## 2. Sollicitations
- Poutrelle isostatique : M0 = pL²/8, V0 = pL/2.
- Poutrelle continue (travée de rive, méthode forfaitaire) : Mt = 0,8·M0 ; appui intermédiaire Ma = 0,5·M0 (≥ 3 travées) ou 0,6·M0 (2 travées) ; VEd = 1,1·V0 ou 1,15·V0.
  Domaine d'application : Q ≤ max(2·G ; 5 kN/m²) (vérification D3, bloquante) ; travées voisines de portées comparables et inertie constante (non contrôlées, signalées).

## 3. Flexion ELU (§6.1)
- Diagramme rectangulaire λ = 0,8, η = 1, fcd = fck/1,5, fyd = fyk/1,15, ξlim = εcu3/(εcu3 + εyd).
- Travée : section en T de table beff = bw + 2·min(0,2·bi + 0,1·l0 ; 0,2·l0 ; bi), bi = (b − bw)/2, l0 = L (isostatique) ou 0,85·L (continue). Axe neutre dans la table (section rectangulaire beff × d) ou dans l'âme (T vraie).
- Appui : section rectangulaire bw × d (nervure comprimée en partie basse).
- As,min = max(0,26·fctm/fyk ; 0,0013)·bw·d (§9.2.1.1) ; As,max = 0,04·Ac. MRd de la section fournie par équilibre ; ductilité xu/d ≤ ξlim (travée) ; xu/d ≤ 0,45 sur appui (redistribution implicite des moments forfaitaires, non bloquant).
- Poutrelle isostatique : chapeaux de construction As ≥ max(As,min ; 0,15·As travée) (§9.2.1.2(1)).

## 4. Effort tranchant (§6.2)
- VRd,c = max[(0,18/γc)·k·(100ρl·fck)^(1/3) ; 0,035·k^1,5·√fck]·bw·d, ρl ≤ 2 %, As,L = aciers ancrés à l'appui.
- VRd,max = bw·z·ν1·fcd/(cot θ + tan θ), z = 0,9·d, ν1 = 0,6·(1 − fck/250), αcw = 1.
- Étriers : Asw/s = VEd/(z·fyd·cot θ) ≥ ρw,min·bw, ρw,min = 0,08·√fck/fyk ; espacement arrondi au cm inférieur, entre 50 mm et min(0,75·d ; 300 mm).
- Traction à ancrer à l'appui d'about : FE = 0,5·VEd·cot θ ≤ As·fyd des barres de travée prolongées (§9.2.1.4).
- Étrier triangulaire fermé : base A = bw − 2c, hauteur B = h − 2c, côtés √((A/2)² + B²), crochet 135°, queue 10Φ ; développée A + 2·côté + 2·10Φ.

## 5. États limites de service (§7)
- Section fissurée (αe = 15, axe neutre dans la table ou dans l'âme) : σc caractéristique ≤ 0,6·fck ; σs caractéristique ≤ 0,8·fyk ; σc quasi-permanente ≤ 0,45·fck (non bloquant).
- Fissuration sans calcul : diamètre ≤ Φ*s du tableau 7.2N en fonction de σs quasi-permanente et de wmax (0,4 ; 0,3 ; 0,2 mm selon l'exposition), multiplié par fctm/2,9 (le rapport hcr/(2(h − d)) de l'éq. 7.122 est ignoré, ce qui est sécuritaire).
- Flèche calculée (§7.4.3) : courbures 1/r_I (non fissurée, section homogène) et 1/r_II (fissurée) interpolées par ζ = 1 − β·(Mcr/M)² (β = 0,5), fluage par Ec,eff = Ecm/(1 + φ), retrait par εcs·αe·S/I ; intégration le long de la travée (théorème de la charge unité, 48 divisions). Isostatique : M(x) = M0·4x(L − x)/L² ; travée de rive continue : M(x) = M0·4x(L − x)/L² − Ma·x/L.
  Limites : L/250 (§7.4.1(4)) ; flèche nuisible (après pose des cloisons, seul le poids propre étant appliqué avant) ≤ L/500 (§7.4.1(5)).
- L/d (§7.4.2, éq. 7.16) : donné **à titre indicatif**, non bloquant ; ρ = As,req/(aire de béton au-dessus du centre de gravité des aciers), F1 pour les sections en T (tab. 7.4N note 2), K = 1,3 en travée de rive continue (**hypothèse I**).

## 6. Durabilité et dispositions
- cnom = cmin + Δcdev, cmin = max(cmin,b ; cmin,dur ; 10 mm), cmin,dur selon l'exposition et la classe structurale (tab. 4.3N, 4.4N). cmin,b = max(Φ étrier ; Φ barre − Φ étrier) avec Φ barre = plus grand diamètre longitudinal (travée ou chapeaux) ; cnom mesuré au nu des étriers.
- Espacement libre des barres de travée (un lit dans l'âme, à l'intérieur des étriers) ≥ max(Φ ; dg + 5 ; 20 mm).
- Ancrage lbd = α·lb,rqd (α = 1, sans réduction pour crochet ni confinement), lb,min = max(0,3·lb,rqd ; 10Φ ; 100 mm).

## 7. Limites du périmètre
Non vérifiés (signalés dans la note et sous le verdict) : treillis de la dalle de compression et flexion transversale ; charges concentrées, cloisons linéaires isolées, poinçonnement ; étude détaillée de la continuité (travées inégales, appuis de rive) ; résistance au feu (lot 2) ; séisme ; appuis et entrevous.
