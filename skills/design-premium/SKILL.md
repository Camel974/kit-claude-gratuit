---
name: design-premium
description: La checklist du design premium. Règles concrètes (typo, couleurs, espacements, grille, boutons, photos, animations, mobile) pour qu'un site fasse haut de gamme et pas « template » ni « fait par IA », plus 3 directions artistiques à proposer quand la marque n'en a pas. À appliquer pendant la construction et avant chaque livraison. Use when "rends-le premium", "ça fait amateur", "ça fait template", "améliore le design", "direction artistique du site", "quelles couleurs", "quelle police", "design-premium".
---

# Design premium : la checklist

Va avec le skill `frontend-design` (principes) : ici ce sont les règles chiffrées à vérifier.

## Si la marque n'a pas de DA : 3 directions
Propose 3 mini-planches (hero seul) et fais choisir au visuel :
1. **Sombre premium** : fond quasi noir (#0B0B0F), texte #F5F5F7, 1 accent vif, typo titre géométrique ou serif élégante, beaucoup de vide.
2. **Clair éditorial** : fond cassé (#FAF8F5), texte #111, serif pour les titres + sans-serif pour le texte, photos en grand.
3. **Énergique** : fond blanc, 1 couleur forte en aplats, titres très gras, formes, rythme serré mais aéré.
Ensuite, une seule DA du début à la fin.

## Typographie
- 2 polices maximum (1 titres, 1 texte). Google Fonts. Pas d'Inter/Roboto/Arial par défaut sans raison.
- Texte courant : 17-19 px ordi, 16-17 px mobile, interligne 1,5-1,65, 60-75 caractères par ligne max.
- Titres : échelle nette (ex. 64 / 40 / 28 / 20 px ordi ; 40 / 30 / 22 / 18 mobile), interligne 1,05-1,2, lettrage légèrement resserré sur les gros titres.
- Graisse : 2 ou 3 graisses en tout. Pas de texte entièrement en gras.

## Couleurs
- 1 fond, 1 texte, 1 accent (réservé aux CTA et aux points clés), 1-2 gris. C'est tout.
- Contraste texte/fond ≥ 4,5:1 (≥ 3:1 pour les gros titres). Vérifie.
- L'accent n'apparaît jamais sur un élément non cliquable important (sinon on ne sait plus où cliquer).

## Espacement et grille
- Une échelle unique : 4, 8, 16, 24, 32, 48, 64, 96, 128 px. Rien d'autre.
- Sections : 96-128 px de marge verticale ordi, 64-80 px mobile.
- Largeur de contenu 1100-1200 px max, texte long 680-720 px max.
- Tout aligné sur la même grille. Marges latérales mobile ≥ 20 px.

## Boutons et éléments
- Bouton principal : hauteur ≥ 48 px, texte d'action précis, même style partout, un état au survol et au focus.
- Un seul style d'arrondi pour tout le site (ex. 12 px, ou tout carré, ou tout en pilule).
- Ombres douces et rares. Bordures fines (1 px) en gris clair.
- Icônes : un seul jeu, même épaisseur.

## Photos et preuves
- Vraies photos de la personne, nettes, cohérentes en lumière. Pas de banque d'images génériques.
- Témoignages : visage + prénom + résultat chiffré + contexte. Captures recadrées et lisibles.
- Vidéo : vignette personnalisée, pas d'autoplay avec son.

## Animations
- Apparition douce au scroll (opacité + 16-24 px de déplacement, 0,4-0,6 s), une seule fois.
- Respecter `prefers-reduced-motion`. Rien qui bouge en boucle à côté du texte.

## Ce qui fait « IA / template » (à chasser)
Dégradés violet-bleu partout, emojis dans les titres, cartes toutes identiques en grille de 3 sans hiérarchie, titres vagues (« Transformez votre vie »), icônes génériques à chaque ligne, sections toutes de la même hauteur, textes centrés partout, ombres lourdes, faux compteurs.

## Contrôle final (avant livraison)
Capture desktop + mobile (`capture.mjs`) et coche : 2 polices max · échelle d'espacement respectée · contraste OK · un seul accent · CTA identique partout · mobile sans débordement · photos réelles · aucune trace « template ».
