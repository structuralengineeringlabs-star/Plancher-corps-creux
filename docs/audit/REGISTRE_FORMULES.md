# Registre des formules

Unités internes du moteur : **N, mm, MPa, N·mm** (1 kN/m = 1 N/mm). Saisie : m (portée, entraxe), mm, kN/m².
Convention : M > 0 tend la fibre inférieure. Les renvois N.. pointent vers la matrice normative.

| Formule | Unités | Article | Fonction | Matrice | Contrôle |
|---|---|---|---|---|---|
| G0 = hf·25 + bw·hc·25/b + p_ent·(b − bw)/b | kN/m² | EN 1991-1-1 | `charges` | N08 | C1 |
| pELU = 1,35·g + 1,5·q ; g = (G0 + Gp)·b ; q = qk·b | kN/m | EN 1990 §6.4.3.2 | `charges` | N10 | C2 |
| M0 = pL²/8 ; Mt = c_t·M0 ; Ma = c_a·M0 ; VEd = c_v·V0 | N·mm ; N | méthode forfaitaire | `analyse` | N11, N12 | A1 à A5 |
| beff = bw + 2·max(0 ; min(0,2·bi + 0,1·l0 ; 0,2·l0 ; bi)) | mm | §5.3.2.1 | `largeurParticipante` | N14 | F1 |
| μ = MEd/(beff·d²·η·fcd) ; ξ = (1 − √(1 − 2μ))/λ ; As = MEd/(fyd·d·(1 − λξ/2)) | mm² | §6.1 | `armaturesRequisesT` | N15 | F2 |
| Section en T vraie : M1 = (beff − bw)·hf·η·fcd·(d − hf/2) ; M2 = MEd − M1 ; As = M1/(fyd·(d − hf/2)) + M2/(fyd·z) | mm² | §6.1 | `armaturesRequisesT` | N15 | F3 |
| MRd : x = As·fyd/(λ·η·fcd·beff) ; si λx > hf, ailes (beff − bw)·hf puis âme | N·mm | §6.1 | `momentResistantT` | N16 | F4, F5 |
| As,min = max(0,26·fctm/fyk ; 0,0013)·bw·d | mm² | §9.2.1.1 | `asMin` | N18 | F7 |
| VRd,c = max[(0,18/γc)·k·(100ρl·fck)^1/3 ; 0,035·k^1,5·√fck]·bw·d ; k = min(1 + √(200/d) ; 2) | N | §6.2.2 | `vrdc` | N21 | T1 |
| VRd,max = bw·0,9d·0,6(1 − fck/250)·fcd/(cot θ + tan θ) | N | §6.2.3 | `vrdMax` | N22 | T2 |
| VRd,s = Asw/s·0,9d·fyd·cot θ ; s = ⌊min(Asw/(Asw/s)req ; 0,75d ; 300)/10⌋·10 | N ; mm | §6.2.3, §9.2.2 | `etriers` | N23 | T3 |
| FE = 0,5·VEd·cot θ | N | §9.2.1.4 | `effortTractionAppui` | N24 | D2 |
| Section fissurée : y tel que beff·y²/2 = αe·As·(d − y) (axe dans la table) ; σc = M·y/Icr ; σs = αe·M·(d − y)/Icr | MPa | §7.2 | `contraintesFissureesT` | N25 | E1 à E4 |
| Φ*s(σs, wmax) interpolé linéairement (tab. 7.2N) ; Φmax = Φ*s·fctm/2,9 | mm | §7.3.3 | `phiMaxFissuration` | N26 | E6 |
| κ = ζ·κII + (1 − ζ)·κI ; ζ = 1 − β(Mcr/M)² ; κI = M/(Ec,eff·I) + εcs·αe·S/I | 1/mm | §7.4.3 | `courbure` | N27 | E7 à E9 |
| w(xm) = ∫ κ(s)·m̄(s) ds (charge unité en xm) | mm | §7.4.3 | `flecheMax` | N27 | E7 à E9 |
| l/d lim = K·F1·[11 + 1,5·√fck·ρ0/ρ + 3,2·√fck·(ρ0/ρ − 1)^1,5] (ρ ≤ ρ0) | — | §7.4.2 | `flecheLd` | N29 | tests L/d |
| lbd = max(lb,rqd ; 0,3·lb,rqd ; 10Φ ; 100) ; lb,rqd = (Φ/4)·σsd/fbd ; fbd = 2,25·η1·η2·fctd | mm | §8.4.4 | `longueurAncrage` | N30 | D1 |
| Étrier : développée = A + 2·√((A/2)² + B²) + 2·10Φ ; A = bw − 2c ; B = h − 2c | mm | EN ISO 4066 | `geometrieEtrier` | N32 | D3 |
