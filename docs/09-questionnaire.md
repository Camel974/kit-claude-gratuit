# 09 · Le questionnaire (qualitatif + quantitatif)

Le kit pose ces questions à 3 moments : **l'installeur** (ce qu'il faut pour installer), le skill **`/bienvenue-gratuit`** (ce qu'il faut pour bien t'accompagner), et **Claude.ai gratuit** si tu passes par [PROMPT-POUR-CLAUDE-GRATUIT.txt](../PROMPT-POUR-CLAUDE-GRATUIT.txt). Chaque question change une décision : sinon, on ne la pose pas.

## Installeur (3 minutes)
| Question | Type | Ce que ça décide |
|---|---|---|
| Où installes-tu ? (PC / serveur) | qualitatif | mode PC ou serveur (swap, service au démarrage, accès SSH) |
| As-tu un abonnement Claude Pro/Max ? | qualitatif | `claude` reste sur l'abonnement (+ `claude-gratuit`) ou passe par le gratuit |
| Mot de passe du tableau de bord | | sécurité du tableau de bord |
| Tes clés Mistral, NVIDIA, Gemini, Groq, OpenRouter | quantitatif (nombre de fournisseurs) | contenu et ordre de la bascule automatique |
| Pack de skills ? Élève SYSTEM ? Stories à la une ? | qualitatif | skills installés (et leur coût en tokens) |
Détectés tout seuls (pas de question) : système, processeur, RAM, disque libre, version de Node, Claude Code déjà là, OmniRoute déjà là, session SSH.

## `/bienvenue-gratuit` (5 minutes, boutons)
| Question | Type | Ce que ça décide |
|---|---|---|
| Ce que tu veux créer en premier (site, appli, jeu, business, automatiser, apprendre) | qualitatif | premier projet + skill à lancer |
| Ton niveau (jamais codé, un peu, je code) | qualitatif | niveau d'explication |
| Ton style (ultra court, normal, pédagogique) | qualitatif | longueur des réponses |
| Ton projet en 1 phrase | qualitatif (libre) | dossier et plan du premier projet |
| Heures par semaine avec Claude | **quantitatif** | nombre de clés gratuites à avoir (1 à 5) ou conseil Claude Pro |
| Budget IA par mois (0 €, < 10 €, ~20 €, plus) | **quantitatif** | 100 % gratuit ou Claude Pro + secours gratuit |
| Échéance du premier projet | **quantitatif** | découpage et rythme |
| Comptes disponibles (Google, téléphone, GitHub) | qualitatif | quelles clés sont faisables tout de suite |
Les réponses sont résumées en 5 à 8 lignes dans `~/.claude/CLAUDE.md` (section « Qui je suis ») : Claude s'en sert à chaque conversation.

## Pour Brennan : mesurer le kit (à mettre dans un formulaire, Tally par exemple)
1. Système : Windows / Mac / Linux / serveur.
2. Temps total d'installation (minutes).
3. Bloqué à quelle étape ? (1 à 9, ou aucune)
4. Nombre de clés gratuites créées.
5. Premier projet réalisé ? (oui / non / en cours) et lequel.
6. Note de facilité de 1 à 10.
7. Le message d'erreur exact si ça a bloqué (copier-coller).
8. Ce qui manquait dans le guide (texte libre).
Avec 20 réponses, tu sais quelle étape du guide améliorer en premier.
