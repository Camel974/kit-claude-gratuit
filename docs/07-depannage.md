# 07 · Dépannage (problème → solution)

**Réflexe n°1** : dans un terminal, tape `kit-claude diagnostic`. Chaque ligne en MAJUSCULES dit quoi faire. Le rapport est aussi enregistré dans `~/.kit-claude-gratuit/diagnostic.txt` (Windows : `%LOCALAPPDATA%\kit-claude-gratuit\diagnostic.txt`).

**Réflexe n°2** : copie ce rapport + le message d'erreur exact sur https://claude.ai (la version gratuite suffit) avec la phrase de [PROMPT-POUR-CLAUDE-GRATUIT.txt](../PROMPT-POUR-CLAUDE-GRATUIT.txt).

Exemple de rapport (installation réelle, 18/11/2026) :
```
  Node.js                v26.13.1 OK
  Claude Code            2.1.327 (Claude Code)
  OmniRoute installe     oui (3.8.54)
  OmniRoute en marche    oui (http://127.0.0.1:20128)
  Donnees OmniRoute      /home/eleve/.omniroute (prive 127.0.0.1)
  Mode Claude            global (claude → http://127.0.0.1:20128, modele gratuit)
  Cle d'acces            valide (sk-af4...04f3), 391 modeles visibles
  Fournisseurs           groq, mistral
  Bascule « gratuit »    mistral/mistral-medium-3-5 → mistral/mistral-large-latest → groq/openai/gpt-oss-120b → ...
```

## Pendant l'installation
| Symptôme | Cause | Solution |
|---|---|---|
| Windows : « Windows a protégé votre ordinateur » | fichier téléchargé d'Internet | Informations complémentaires → Exécuter quand même |
| Windows : « l'exécution de scripts est désactivée » | règle PowerShell | passe par `DEMARRER-WINDOWS.bat` (il contourne la règle pour ce script seulement) |
| Mac : « impossible d'ouvrir car le développeur ne peut pas être vérifié » | Gatekeeper | Réglages Système → Confidentialité et sécurité → « Ouvrir quand même » (avant macOS 15 : clic droit → Ouvrir) ; ou la ligne `curl ... \| bash` dans le Terminal (jamais bloquée) |
| Lignes jaunes `npm warn ERESOLVE ...` | avertissements de dépendances | **normal**, attends la fin (doc officielle OmniRoute) |
| « Lance ce script SANS sudo » | `sudo bash installer.sh` | relance sans `sudo` |
| `curl: (23) Failure writing output` | ancienne version du script | télécharge la dernière version du kit (corrigé le 18/11/2026) |
| « Node.js ... ne convient pas » | version de Node trop vieille | le script installe sa propre version : relance-le |
| Bloqué sur « Installation d'OmniRoute » plus de 10 minutes | connexion lente | attends ; sinon Ctrl+C et relance (le script reprend) |
| « Mistral enregistré, mais le test a échoué : Invalid API key » | clé mal copiée ou compte non activé | recopie la clé (sans espace), vérifie le plan Experiment, puis `kit-claude ajouter-cle` |
| « Création automatique de la clé impossible » | OmniRoute pas encore prêt | relance l'installeur ; sinon crée la clé dans le tableau de bord (Gestionnaire d'API) et colle-la |

## Au lancement de Claude
| Symptôme | Cause | Solution |
|---|---|---|
| `claude` / `kit-claude` « n'est pas reconnu » | terminal ouvert avant l'installation | ferme et rouvre le terminal |
| Claude demande de te connecter (« Select login method ») | réglages pas chargés, ou mode abonnement | nouveau terminal ; mode abonnement : tape `claude-gratuit` |
| « Do you trust the files in this folder? » | nouveau dossier | flèche ↓ puis Entrée sur « Yes, I trust this folder » (Entrée seule = « No, exit ») |
| « Claude Code doesn't recognize the model "gratuit" » | normal avec un modèle gratuit | rien à faire |
| « gratuit · API Usage Billing » en haut | libellé standard de Claude Code | rien à faire : tu ne paies rien |
| « Auto mode can't check actions in this session » | le mode auto a été activé (option 3 ou Maj+Tab) : sa vérification passe par les serveurs d'Anthropic | **Maj+Tab** pour quitter le mode auto ; aux questions « Do you want to proceed? », réponds 1 ou 2 |

## Pendant le travail
| Symptôme | Cause | Solution |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:20128`, « Unable to connect » | OmniRoute arrêté | `kit-claude demarrer` (serveur root : `systemctl restart omniroute`) |
| Windows : `omniroute` → « l'exécution de scripts est désactivée » | PowerShell bloque les scripts `.ps1` créés par npm | utilise les commandes `kit-claude ...` (elles passent par Node, pas par PowerShell) |
| `401` / « invalid api key » | clé Claude ↔ OmniRoute changée | relance l'installeur (il recrée la clé). La clé de Claude Code se voit dans le tableau de bord → Gestionnaire d'API ([capture](images/09-cle-api.png)) |
| Une connexion affiche « Invalid API Key » en rouge dans le tableau de bord | clé du fournisseur mal copiée | recopie-la : `kit-claude ajouter-cle` ([capture](images/10-cle-invalide.png)) |
| `429` / « rate limit » / « quota » | quota du moment épuisé | attends 1 minute ; ajoute un 2e fournisseur pour la bascule |
| « no eligible route » / « all targets failed » | aucun fournisseur valide | `kit-claude ajouter-cle` |
| Réponses très lentes | modèle gratuit chargé | `/compact`, ou `claude --model groq/openai/gpt-oss-120b` |
| « prompt is too long » | contexte trop gros pour le modèle | `/compact` ; si ça revient : `"CLAUDE_CODE_MAX_CONTEXT_TOKENS": "64000"` dans `~/.claude/settings.json` |
| Claude rate ses modifications, tourne en rond | modèle trop faible pour la tâche | découpe la tâche, mets Mistral Large en premier (tableau de bord → Combinaisons) |
| Mot de passe du tableau de bord oublié | | `kit-claude mot-de-passe` |
| `claude-gratuit` parle d'authentification ou propose `/logout` | abonnement Claude + mode gratuit | **ne fais jamais `/logout`** : ignore le message |
| Je ne trouve pas mon dossier Projets-Claude | Documents redirigé vers OneDrive | double-clic sur « Claude Gratuit » (Bureau) ; `kit-claude diagnostic` affiche le chemin |
| Serveur : Claude s'arrête quand la connexion SSH coupe | session fermée | `tmux new -A -s claude` avant `claude` ; après une coupure, retape-le |
| Serveur : `claude` ou `kit-claude` « command not found » après reconnexion | PATH | reconnecte-toi ; sinon `export PATH="$HOME/.local/bin:$PATH"` puis relance l'installeur |

## Remettre à zéro proprement
```bash
kit-claude desinstaller     # retire la config du kit (tes projets restent)
```
Puis relance l'installeur. Les sauvegardes sont dans `~/.claude/backups/kit-claude-gratuit-<date>/`.
