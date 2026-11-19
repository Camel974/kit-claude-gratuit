<div align="center">

# 🆓 Kit Claude Gratuit

**Claude Code, l'agent qui crée des sites, des applis et des jeux, gratuitement, grâce à OmniRoute.**
Installation en 1 double-clic · Windows, Mac, Linux, serveur · 0 € · par **Brennan SONNET**

[📥 Télécharger le kit (.zip)](https://github.com/Camel974/kit-claude-gratuit/archive/refs/heads/main.zip) · [📝 Guide Bloc-notes](00-LIS-MOI-EN-PREMIER.txt) · [🛟 Dépannage](docs/07-depannage.md) · [🤖 Me faire guider par Claude](PROMPT-POUR-CLAUDE-GRATUIT.txt)

<img src="docs/images/07-claude-code.png" width="780" alt="Claude Code qui démarre directement, branché sur OmniRoute et des modèles gratuits">

</div>

> 🎬 La vidéo arrive bientôt. En attendant, tout est ici, **testé en vrai le 18/11/2026** sur 4 comptes Linux vierges (Claude Code 2.1.327, OmniRoute 3.8.54, Node.js 26). Windows et Mac : scripts vérifiés (analyse PowerShell 5.1, shellcheck), premier vrai test à faire : dis-nous si ça bloque.

---

## ⚡ En 3 étapes

| | Étape | Temps |
|---|---|---|
| **1** | **Crée 1 clé gratuite** : [Mistral](https://console.mistral.ai/api-keys) (recommandé), puis [NVIDIA](https://build.nvidia.com/settings/api-keys) et [Gemini](https://aistudio.google.com/apikey) en secours. [Pas à pas avec captures →](docs/04-cles-gratuites.md) | 2 min par clé |
| **2** | **Installe** selon ton cas (tableau ci-dessous) et réponds aux questions | 10 à 15 min |
| **3** | **Utilise** : double-clic sur **« Claude Gratuit »** (raccourci créé sur ton Bureau) → tape `/bienvenue-gratuit`. Abonné Claude Pro/Max : `claude` reste ton abonnement, `claude-gratuit` = le gratuit | 1 min |

## 📥 Étape 2 : installe selon ton cas

| Ton cas | Fais ça |
|---|---|
| 🖥️ **Tu as un serveur** (VPS, NAS) : *le meilleur choix* | `ssh root@IP-DU-SERVEUR` puis colle :<br>`curl -fsSL https://raw.githubusercontent.com/Camel974/kit-claude-gratuit/main/installer.sh \| bash -s -- --serveur`<br>[Guide serveur →](docs/03-installation-serveur.md) |
| 🪟 **Windows 10 / 11** | [Télécharge le zip](https://github.com/Camel974/kit-claude-gratuit/archive/refs/heads/main.zip), dézippe, double-clic sur **`DEMARRER-WINDOWS.bat`**. « Installer Git ? » → Entrée puis Oui. |
| 🍎 **Mac** | App **Terminal** → colle `curl -fsSL https://raw.githubusercontent.com/Camel974/kit-claude-gratuit/main/installer.sh \| bash`<br>(ou double-clic sur `DEMARRER-MAC.command` ; si macOS bloque : Réglages Système → Confidentialité et sécurité → « Ouvrir quand même ») |
| 🐧 **Linux** | `bash installer.sh` dans le dossier du kit |
| ⚡ **Windows en une ligne, sans zip** | PowerShell : `irm https://raw.githubusercontent.com/Camel974/kit-claude-gratuit/main/scripts/installer-windows.ps1 \| iex` |
| 🤖 **Tu veux qu'une IA te guide** | Sur [claude.ai](https://claude.ai) (gratuit) : joins [`GUIDE-POUR-CLAUDE.md`](GUIDE-POUR-CLAUDE.md) et colle le texte de [`PROMPT-POUR-CLAUDE-GRATUIT.txt`](PROMPT-POUR-CLAUDE-GRATUIT.txt) |
| 💳 **Tu as déjà Claude Pro / Max** | Installe pareil et réponds **« o »** à la question de l'abonnement (proposé par défaut si tu es déjà connecté) : `claude` = ton abonnement **intact**, `claude-gratuit` = le secours gratuit dans un profil séparé (`~/.claude-gratuit`). Limite atteinte : `/exit` puis `claude-gratuit -c` |

Guide détaillé PC : [docs/02-installation-pc.md](docs/02-installation-pc.md). Il faut **5 Go libres** (OmniRoute pèse 3 Go, mesuré). Le script n'a **pas besoin des droits administrateur** (sauf Git pour Windows, optionnel) et ne supprime rien (sauvegarde automatique).

## 🔧 Comment ça marche

```mermaid
flowchart LR
  A[Toi] -->|en français| B[Claude Code<br/>agent officiel d'Anthropic]
  B --> C[OmniRoute<br/>sur ton ordi ou serveur]
  C -->|1er choix| D[Mistral]
  C -.->|si épuisé ou en panne| E[NVIDIA NIM]
  C -.->|sinon| F[Gemini]
  C -.->|sinon| G[Groq · OpenRouter]
```

**Claude Code** travaille dans tes dossiers (crée les fichiers, lance les commandes, teste). **OmniRoute** (logiciel libre, licence MIT) se fait passer pour l'API de Claude et envoie chaque requête à un modèle gratuit. Si le premier est épuisé ou en panne, il passe **tout seul** au suivant. [Explication complète →](docs/01-comment-ca-marche.md)

## 📸 En images

| Installation (vraie sortie : relance avec une clé Mistral fausse exprès, la bascule passe au suivant) | Tableau de bord OmniRoute (en français) |
|---|---|
| <img src="docs/images/06-installation-terminal.png" alt="Installation dans le terminal"> | <img src="docs/images/02-accueil.png" alt="Accueil du tableau de bord OmniRoute"> |
| **Tes fournisseurs gratuits** | **La bascule automatique « gratuit »** |
| <img src="docs/images/03-fournisseurs.png" alt="Page Fournisseurs, filtre Niveau gratuit"> | <img src="docs/images/08-combinaison-gratuit.png" alt="Combinaison gratuit"> |
| **Ajouter une clé (ex. Mistral)** | **Budget gratuit en direct** |
| <img src="docs/images/04-ajouter-cle.png" alt="Ajouter une clé Mistral"> | <img src="docs/images/05-budget-gratuit.png" alt="Budget de l'offre gratuite"> |

## ✅ Testé pour de vrai (18/11/2026)

| Test | Résultat |
|---|---|
| Installation complète sur un compte vierge (sans Node, sans Claude) | ✅ Node 26.13.1 + Claude Code 2.1.327 + OmniRoute 3.8.54 + config, en 159 secondes (4 comptes Linux vierges testés) |
| Relance de l'installeur, désinstallation, réinstallation | ✅ 8 à 10 secondes, rien de cassé, sauvegardes gardées |
| Mauvaise clé | ✅ détectée en 8 secondes avec la raison exacte (« 401 ») et la commande pour corriger |
| Claude Code → OmniRoute → fournisseur | ✅ réponse reçue, aucun écran de connexion Anthropic |
| 1er fournisseur refusé (clé invalide) | ✅ bascule automatique sur le suivant, réponse en 2 s |
| Sécurité : requête sans clé / écoute réseau | ✅ refusée (401) / OmniRoute écoute seulement 127.0.0.1 |
| Windows et Mac sur un vrai PC | ⏳ scripts vérifiés (PowerShell 5.1, shellcheck), pas encore lancés sur un vrai PC : retours bienvenus |
| Fournisseurs « sans clé » (Pollinations, UncloseAI) | ❌ ils exigent une clé aujourd'hui : **1 clé gratuite minimum** |
| Coût fixe d'un message Claude Code | ~14 000 tokens (d'où le skill `econome`) |
| 6 bugs trouvés par les simulations | ✅ corrigés (téléchargement de Node, lecture du CLI, catalogue pas prêt, PATH de npm à la mise à jour, démarrage auto non vérifié, affichage) |
| 3 relectures par des élèves simulés | Windows débutante (4/10), serveur VPS root + n8n (5/10), Mac + Claude Pro (4/10) → plus de 30 corrections intégrées (raccourci Bureau, profil séparé pour les abonnés, tmux, OneDrive, commandes `kit-claude`...) |
| Abonné Claude Pro : `claude` payant | ✅ intact : le mode gratuit vit dans un profil séparé (`CLAUDE_CONFIG_DIR`, testé) |

## 🧰 Ce que le kit installe

- **Claude Code** (installeur officiel d'Anthropic) et **OmniRoute** (open source), **Node.js** dans ton dossier perso.
- **La bascule `gratuit`** : Mistral → NVIDIA → Gemini → Groq → OpenRouter (selon tes clés).
- **18 skills** : `site-express`, `clone-site`, `fusion-sites`, `audit-site`, `design-premium`, `simulation-visiteurs`, `app-web`, `supabase` (kit Sites de Brennan) · `jeu-express` (jeux vidéo) · `bienvenue-gratuit`, `econome`, `depannage-gratuit` · `frontend-design`, `webapp-testing`, `skill-creator` (Anthropic) · `cro`, `copywriting`, `web-quality-audit` (libres).
- **Des règles « mode gratuit »** dans `~/.claude/CLAUDE.md` : français, réponses courtes, vérifications, économie de tokens.
- **Un raccourci « Claude Gratuit » sur le Bureau** (Windows, Mac) : double-clic = Claude ouvert dans ton dossier de projets.
- **2 commandes** : `claude-gratuit` (Claude via OmniRoute) et `kit-claude` (`diagnostic`, `ajouter-cle`, `bascule`, `demarrer`, `mot-de-passe`, `cle`, `connecter-serveur`, `mise-a-jour`, `test`, `desinstaller`).
- **Sécurité par défaut** : OmniRoute n'écoute que ton ordi (127.0.0.1) et exige une clé.
- En option : le kit **Stories à la une** et le kit **SYSTEM** (élèves SYSTEM).

## 🛟 Dépannage express

| Tu vois | Fais |
|---|---|
| `claude` n'est pas reconnu | ferme et rouvre le terminal |
| `ECONNREFUSED 127.0.0.1:20128` | `kit-claude demarrer` |
| `429` / quota | attends 1 min, ou `kit-claude ajouter-cle` |
| Claude se ferme au démarrage | flèche ↓ puis Entrée sur « Yes, I trust this folder » |
| « Do you want to proceed? » | `1` ou `2` (jamais `3`, le mode auto ne marche pas avec OmniRoute) |
| Autre chose | `kit-claude diagnostic` puis [docs/07-depannage.md](docs/07-depannage.md) |

## ⚖️ En toute honnêteté

- Ce ne sont **pas** les modèles Claude d'Anthropic : c'est l'outil Claude Code avec des modèles gratuits. Très bien pour des sites, applis et jeux ; en dessous de Claude Opus/Sonnet sur les très gros projets. Le combo idéal avec 20 €/mois : Claude Pro + `claude-gratuit` en secours.
- Les routes « Claude Opus gratuit » via **Kiro** ou **Antigravity** violent leurs conditions d'utilisation (OmniRoute les marque `avoid`) : risque de compte banni. **Le kit ne les utilise pas.**
- Offres gratuites = tes requêtes peuvent servir à entraîner les modèles (Mistral Experiment, Gemini gratuit). Pas de données clients sensibles.
- Un compte par personne, usage perso : ne partage pas ton OmniRoute.

## 📚 Toute la doc

1. [Comment ça marche](docs/01-comment-ca-marche.md) · 2. [Installation PC](docs/02-installation-pc.md) · 3. [Installation serveur](docs/03-installation-serveur.md) · 4. [Clés gratuites](docs/04-cles-gratuites.md) · 5. [Premiers pas](docs/05-premiers-pas.md) · 6. [Économiser les quotas](docs/06-economiser-les-quotas.md) · 7. [Dépannage](docs/07-depannage.md) · 8. [Astuces et stratégies](docs/08-astuces-et-strategies.md) · 9. [Questionnaire](docs/09-questionnaire.md)

---

<div align="center">

Kit créé par **Brennan SONNET** · Instagram [@brennansonnet_974](https://www.instagram.com/brennansonnet_974/) · Gratuit, interdit à la revente.
Composants tiers sous leur licence : [THIRD_PARTY.md](THIRD_PARTY.md). OmniRoute : [diegosouzapw/OmniRoute](https://github.com/diegosouzapw/OmniRoute) (MIT). Claude Code : © Anthropic.

</div>
