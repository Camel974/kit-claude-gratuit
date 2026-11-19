# 08 · Astuces et stratégies (aller plus vite, plus loin, toujours gratuit)

## 1. Le combo gagnant si tu as 20 €/mois
**Claude Pro en principal + le kit en secours.** À l'installation, réponds « oui » à la question de l'abonnement :
- `claude` → ton abonnement (vrais modèles Claude, la meilleure qualité),
- `claude-gratuit` → OmniRoute et les modèles gratuits, quand tu atteins la limite de ton abonnement ou pour les tâches simples (renommer, traduire, petites pages).
Résultat : tu ne paies jamais plus de 20 € et tu n'es jamais bloqué.

## 2. Claude.ai gratuit comme coach (sans rien installer)
La version gratuite de claude.ai ne peut pas travailler dans tes fichiers, mais elle peut te guider. Envoie-lui le fichier [GUIDE-POUR-CLAUDE.md](../GUIDE-POUR-CLAUDE.md) avec le texte de [PROMPT-POUR-CLAUDE-GRATUIT.txt](../PROMPT-POUR-CLAUDE-GRATUIT.txt) : elle te pose les bonnes questions et te donne une étape à la fois, adaptée à ton ordi.

## 3. Un serveur pour toute la famille de tes appareils
OmniRoute + Claude Code sur un petit VPS ([03](03-installation-serveur.md)) : tu travailles depuis ton PC fixe, ton portable, ou même ton téléphone (app SSH type Termius) sur les mêmes projets. Les agents continuent pendant que ton PC est éteint.

## 4. Travailler depuis le téléphone
- App SSH (Termius, Blink) → `ssh root@ton-serveur` → `cd Projets-Claude && claude`.
- Avancé : OmniRoute tourne même sur Android (Termux) d'après sa doc officielle, mais un serveur est bien plus simple.

## 5. VS Code (plus confortable que le terminal)
Installe VS Code (gratuit) + l'extension officielle **Claude Code**. Elle utilise les mêmes réglages (`~/.claude/settings.json`) : en mode global, elle passe normalement aussi par OmniRoute. Si elle te demande de te connecter, ouvre le terminal intégré de VS Code (Ctrl+ù) et tape `claude`. Sur un serveur : extension **Remote - SSH**.

## 6. Doubler la durée de tes quotas
- Applique le skill `econome` (Claude le fait seul) : `/clear` entre deux sujets, `/compact` quand ça s'allonge.
- 2 fournisseurs minimum : la bascule évite les pauses forcées.
- Les tâches mécaniques (renommer, convertir, trier) : demande un **script** plutôt que de faire faire le travail à Claude ligne par ligne. Un script = quelques requêtes, puis gratuit à l'infini.

## 7. Choisir le bon modèle pour la bonne tâche
| Tâche | Modèle conseillé (commande) |
|---|---|
| Code, site, appli | la combinaison par défaut `gratuit` (Mistral d'abord) |
| Lire un très gros document / un gros projet | `claude --model gemini/gemini-2.5-flash` (contexte d'un million de tokens) |
| Réponses instantanées, petites tâches | `claude --model groq/openai/gpt-oss-120b` |
Les identifiants exacts sont dans le tableau de bord (Fournisseurs → ton fournisseur → modèles).

## 8. Créer tes propres skills
Tu refais souvent la même chose ? Dis : « crée-moi un skill qui fait [X] » (skill `skill-creator`). Il sera disponible dans toutes tes conversations.

## 9. Tes autres kits
- **Kit Sites** de Brennan : déjà inclus dans ce kit (site-express, clone-site, audit...).
- **Kit Stories à la une** : réponds « oui » à la question de l'installeur.
- **Kit SYSTEM** (élèves SYSTEM) : réponds « oui », puis dans Claude : « Installe le kit SYSTEM : suis le fichier INSTALL-CLAUDE.md de ~/kit-system ». Attention : ses 256 skills ajoutent ~6 000 tokens à chaque message (mesuré), garde-le pour les tâches business.

## 10. Ce qu'il ne faut PAS faire
- Utiliser Kiro ou Antigravity pour avoir Claude Opus « gratuit » : interdit par leurs conditions, OmniRoute les marque « à éviter », risque de bannissement.
- Créer 10 comptes pour cumuler les quotas, ou partager ton OmniRoute avec d'autres : interdit par la plupart des fournisseurs.
- Ouvrir le port 20128 sur Internet : n'importe qui utiliserait tes quotas.
- Coller une clé API dans un chat, un fichier de projet ou une capture d'écran publique.
