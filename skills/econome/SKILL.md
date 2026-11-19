---
name: econome
description: Économiser les tokens et les quotas gratuits avec Claude Code + OmniRoute. Chiffres mesurés, réflexes qui divisent la consommation, choix du modèle, compression OmniRoute, lecture des quotas. Use when "économise", "tokens", "quota", "trop cher", "limite atteinte", "ça consomme", "changer de modèle", "modèle plus rapide", "econome", "/compact", "contexte plein".
---

# Économe : faire durer les quotas gratuits

## Les chiffres (mesurés le 18/11/2026, Claude Code 2.1.327 + OmniRoute 3.8.54)
- **~14 000 tokens fixes par message** (instructions + outils de Claude Code), avant même ta question.
- **1 action = 1 aller-retour** : lire un fichier, lancer une commande, chercher = une requête de plus, qui renvoie tout l'historique.
- **Skills** : 12 skills ajoutent ~1 600 tokens par message, 256 skills ~6 000 (et au-delà, Claude ne voit plus toutes les descriptions).
- **Grosses sorties de commande** : Claude Code les coupe déjà (848 Ko de listing → aperçu de ~2 400 caractères).
- Les fournisseurs gratuits ne mettent pas toujours en cache : l'historique est recompté à chaque message.

## Les 8 réflexes (du plus rentable au moins rentable)
1. **Un sujet = une conversation.** Fini ? `/clear`. La conversation s'allonge ? `/compact` (résumé, repart léger).
2. **Une demande complète en 1 message** plutôt que 5 petits messages (chaque message repaie les 14 000 tokens).
3. **Plan d'abord** (Maj+Tab pour le mode plan) : Claude explore une fois, tu valides, puis il code sans tâtonner.
4. **Cible les fichiers** : « modifie le bouton dans `src/hero.html` » plutôt que « regarde mon projet ».
5. **Pas de gros copier-coller** : donne le chemin du fichier ou les 20 lignes utiles d'une erreur.
6. **`/context`** montre ce qui remplit la mémoire. **CLAUDE.md court** : il est envoyé à chaque message.
7. **Skills inutiles hors ligne** : déplace un dossier de `~/.claude/skills/` (abonnés Claude : `~/.claude-gratuit/skills/`) vers un dossier `skills-off/` à côté (réversible).
8. **Pas de sous-agents pour des petites tâches** : chacun repaie le contexte de départ.

## Choisir le modèle
- Par défaut : `gratuit` (la combinaison OmniRoute qui bascule toute seule d'un fournisseur à l'autre).
- Forcer un modèle pour une session : `claude --model mistral/mistral-large-latest` (abonnés Claude : `claude-gratuit --model ...`), ou un id vu dans le tableau de bord, page Fournisseurs.
- Rapide : un modèle Groq ou NVIDIA. Gros contexte (gros fichiers, longs documents) : Gemini. Qualité de code : Mistral Large / Medium.
- Changer l'ordre de la bascule : tableau de bord `http://127.0.0.1:20128` → Combinaisons → `gratuit`.

## Compression OmniRoute (option)
Désactivée par défaut. Mesuré sur l'aperçu de compression d'OmniRoute (sorties de commandes `ls` + `npm install`) : **-55 % avec RTK**, **-64 % avec RTK + Caveman**, 0 % sur du texte normal. Pour l'activer : tableau de bord → Compression du contexte → mode `rtk`. Contrôle l'effet réel dans Analytique ; si Claude se trompe plus souvent, remets `off`.

## Voir où tu en es
- Quotas restants : tableau de bord → Quota du fournisseur, et Coûts → Budget de l'offre gratuite.
- Requêtes et erreurs : Journaux des requêtes.
- Quota épuisé partout : attends la remise à zéro (souvent minuit, heure du Pacifique pour Google), ajoute une clé (`kit-claude ajouter-cle`), ou passe sur Claude Pro pour les grosses semaines.
