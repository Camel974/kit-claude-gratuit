---
name: bienvenue-gratuit
description: Premier lancement du Kit Claude Gratuit. Interview de 5 minutes (questions qualitatives et quantitatives a boutons) pour regler Claude sur la personne, verifier l'installation, choisir les bons fournisseurs gratuits selon son temps d'utilisation, et proposer un premier projet. Use when "bienvenue", "premier lancement", "configure-moi", "regle Claude sur moi", "je commence", "bienvenue-gratuit", ou quand le profil du CLAUDE.md contient « À REMPLIR ».
---

# Bienvenue : régler Claude sur toi (5 minutes)

Annonce : « 5 minutes de questions à boutons, ensuite je vérifie ton installation et je te propose ton premier projet. »
Pose les questions avec l'outil de questions à boutons (option recommandée en premier), 4 maximum par écran.

## Écran 1 : ton but (qualitatif)
1. **Ce que tu veux créer en premier** : un site qui vend · une application · un jeu vidéo · du contenu / mon business · automatiser des tâches · apprendre à coder.
2. **Ton niveau** : jamais codé · un peu (HTML, no-code) · je code déjà.
3. **Comment je te parle** : ultra court · normal · pédagogique (j'explique chaque étape).
4. **Ton projet en 1 phrase** (réponse libre, « Other »).

## Écran 2 : tes chiffres (quantitatif)
5. **Temps avec Claude par semaine** : moins de 2 h · 2 à 5 h · 5 à 15 h · plus de 15 h.
6. **Budget IA par mois** : 0 € · moins de 10 € · environ 20 € (abonnement Claude Pro) · plus.
7. **Échéance du premier projet** : cette semaine · ce mois-ci · pas pressé.
8. **Comptes disponibles pour les clés gratuites** (choix multiples) : compte Google · numéro de téléphone (Mistral) · compte GitHub · aucun pour l'instant.

## Étape 3 : vérifier l'installation
Lance `kit-claude diagnostic` et lis le résultat.
Une ligne en MAJUSCULES = un problème : applique le skill `depannage-gratuit` avant de continuer.

## Étape 4 : le plan de fournisseurs (selon la question 5)
Base de calcul (mesurée sur Claude Code 2.1.327) : ~14 000 tokens fixes par message, une action (lire un fichier, lancer une commande) = 1 aller-retour. Une heure de travail actif ≈ 60 à 120 requêtes ≈ 2 à 4 millions de tokens (estimation).
| Temps / semaine | Clés à avoir | Pourquoi |
|---|---|---|
| < 2 h | Mistral | ~1 milliard de tokens/mois suffit largement |
| 2 à 5 h | Mistral + NVIDIA | 2 fournisseurs = la bascule automatique marche |
| 5 à 15 h | Mistral + NVIDIA + Gemini | Gemini en secours (quota quotidien bas, contexte géant) |
| > 15 h | + Groq + OpenRouter, ou Claude Pro (20 €/mois) | les quotas gratuits deviennent justes |
Budget de 20 €/mois et besoin de qualité maximale : conseille l'abonnement Claude Pro en principal (commande `claude`) et `claude-gratuit` quand la limite est atteinte.
Pour chaque clé manquante : donne le lien (docs/04-cles-gratuites.md du kit) et la commande `kit-claude ajouter-cle` (à taper dans un terminal à part, la clé ne doit pas passer par le chat).

## Étape 5 : écrire le profil
Remplace le contenu entre `<!-- KCG-PROFIL:DEBUT -->` et `<!-- KCG-PROFIL:FIN -->` dans `~/.claude/CLAUDE.md` par 5 à 8 lignes maximum (chaque ligne coûte des tokens à chaque message) :
```
### Qui je suis
- Objectif : <q1> · Projet : <q4> · Échéance : <q7>
- Niveau : <q2> → <adapte : explique / va droit au but>
- Style : <q3>
- Temps : <q5>/semaine · Budget IA : <q6> · Fournisseurs : <liste>
```
Ne touche à rien d'autre dans le fichier.

## Étape 6 : premier projet (sur le but de la question 1)
- Site → skill `site-express` · Application → `app-web` · Jeu → `jeu-express` · Contenu / business → propose un premier livrable concret (page de vente, script, offre) et signale le kit SYSTEM de Brennan si la personne est élève.
- Crée le dossier `~/Documents/Projets-Claude/<nom-du-projet>/` et propose : « On commence maintenant ? » (boutons : Oui, on y va · Plus tard).

Fin : 3 lignes maximum. Ce qui est réglé, la prochaine action, la commande de dépannage.
