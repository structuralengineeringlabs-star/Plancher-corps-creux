# Registre des anomalies fonctionnelles

Constats d'interface relevés pendant la mise à jour v1.0.0 (application compilée, 4 formats d'écran).

| N° | Constat | Correction | Version | Test |
|---|---|---|---|---|
| AF-01 | Application native dans sel-apps (composants dupliqués, impression dépendant de la page hôte) | Application compilée dans une iframe | 1.0.0 | build sel-apps |
| AF-02 | Aide par infobulle `title`, inaccessible au toucher | Bouton « ? » dépliant | 1.0.0 | e2e aide |
| AF-03 | `confirm()` natif | Dialogue intégré accessible (Échap, focus) | 1.0.0 | e2e multi-planchers |
| AF-04 | Projet enregistré corrompu | Projet vierge, message, contenu d'origine conservé | 1.0.0 | e2e robustesse |
| AF-05 | Débordement horizontal sur mobile | Parcours des 4 étapes vérifié à 390 px | 1.0.0 | e2e débordement |
| AF-06 | Fichier d'une autre application ouvert sans contrôle | Refusé avec message | 1.0.0 | e2e import |
| AF-07 | Légendes des coupes superposées | Légendes espacées, coupes à l'échelle | 1.0.0 | revue visuelle |
