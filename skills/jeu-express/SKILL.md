---
name: jeu-express
description: Créer un jeu vidéo jouable dans le navigateur (ordi + mobile) sans savoir coder, de l'idée à la page itch.io. Cadrage en questions, prototype jouable en 1 session, test automatique (Playwright), juice (sons, particules), score, contrôles tactiles, export prêt à publier. Jeux originaux uniquement. Use when "jeu", "jeu vidéo", "game", "crée-moi un jeu", "platformer", "jeu de voiture", "shooter", "puzzle", "itch.io", "jeu mobile", "jeu-express".
---

# Jeu express : un jeu original, jouable, publiable

## Règles
- Jeux **originaux** : jamais le nom, les personnages, les graphismes, la musique ou les niveaux d'un jeu existant. « Dans le style de » une mécanique (plateformes, runner, puzzle) : oui.
- Assets libres seulement : Kenney.nl (CC0), sons générés (jsfxr), polices Google Fonts. Note chaque source dans `CREDITS.md`.
- C'est la personne qui publie (itch.io, son site). Rien n'est mis en ligne par toi.

## Étape 1 : cadrer (boutons, 5 questions max)
1. Genre : plateforme · runner sans fin · casse-tête · tir vu de dessus · course · autre.
2. Où on joue : ordi · téléphone · les deux (recommandé).
3. Style visuel : pixel art · formes simples colorées · dessin.
4. Durée d'une partie : 1 min · 5 min · plus.
5. La règle unique en 1 phrase (« sauter de toit en toit sans tomber »).
Écris un mini document de jeu de 10 lignes dans `JEU.md` (dans le dossier courant s'il est vide ou déjà dédié au jeu, sinon dans un nouveau dossier `Projets-Claude/<jeu>/`) : but, contrôles, victoire, défaite, score. Montre-le, attends l'OK.

## Étape 2 : prototype jouable (même session)
- Dossier simple, sans outil de compilation : `index.html`, `src/` (un fichier par scène), `assets/`.
- Petit jeu : canvas pur. Jeu avec physique ou beaucoup de sprites : Phaser 3 téléchargé dans `lib/` (pas de lien externe, le jeu doit marcher hors ligne et sur itch.io).
- Formes de couleur d'abord (greybox). Seulement la boucle centrale : bouger, l'obstacle, perdre, recommencer.
- Lance un serveur local **en arrière-plan** (`npx --yes http-server -p 8080 -c-1`, sans bloquer la conversation) et donne le lien http://localhost:8080 à ouvrir.

## Étape 3 : test automatique (avant de dire « ça marche »)
Avec l'outil de capture du kit (Node + le Chrome ou Edge déjà installé, pas besoin de Python) :
- `node <skills>/clone-site/scripts/capture.mjs http://localhost:8080 ./tests --nom jeu` où `<skills>` = `~/.claude/skills` (abonnés Claude : `~/.claude-gratuit/skills`). Ça produit `jeu-desktop.png`, `jeu-mobile.png` et `jeu-console.txt`.
- `jeu-console.txt` doit être vide d'erreurs. Montre les 2 captures.
- Pour simuler des touches (10 secondes de jeu, vérifier que le score bouge et que « rejouer » remet à zéro) : petit script `tests/jouer.mjs` avec `playwright-core` (déjà installé dans `<skills>/clone-site/scripts/node_modules`), navigateur `channel: 'chrome'` ou `'msedge'`.
- Sur un serveur sans navigateur : saute les captures et teste la logique du jeu avec Node.
Corrige jusqu'à 0 erreur. (Le skill `webapp-testing` marche aussi si Python et Playwright sont installés.)

## Étape 4 : le rendre bon (juice)
Sons (saut, impact, score), particules, petit tremblement d'écran à l'impact, transitions, écran titre, pause, meilleur score sauvegardé (`localStorage`), difficulté qui monte doucement. Un ajout à la fois, test entre chaque.

## Étape 5 : mobile et finition
Boutons tactiles ou glisser, mise à l'échelle sans déformation, 60 images par seconde (pas de création d'objets à chaque image), son seulement après le premier toucher (règle des navigateurs).

## Étape 6 : prêt à publier
- `zip` du dossier avec `index.html` à la racine → itch.io : « Upload new project » → type HTML → cocher « This file will be played in the browser ».
- Liste ce qui reste à faire (vraie musique, plus de niveaux) et les 3 retours à demander aux premiers joueurs.

## Économie de tokens
Un fichier par scène (moins de 300 lignes), ne relis pas les assets, décris les sprites au lieu de les ouvrir, `/compact` entre deux étapes.
