---
name: depannage-gratuit
description: Dépanner Claude Code + OmniRoute (kit Claude Gratuit). Diagnostic automatique, tableau symptôme → cause → solution testée, ajout de clé, mise à jour du kit, mot de passe oublié. Use when "ça marche pas", "erreur", "bug", "429", "401", "quota", "ECONNREFUSED", "no eligible route", "connection refused", "OmniRoute", "mets à jour mon kit", "ajoute une clé", "mot de passe oublié", "diagnostic", "depannage".
---

# Dépannage (kit Claude Gratuit)

## Toujours commencer par
1. `kit-claude diagnostic` dans un terminal (rapport aussi dans `~/.kit-claude-gratuit/diagnostic.txt`, Windows : `%LOCALAPPDATA%\kit-claude-gratuit\diagnostic.txt`).
2. Lis les lignes en MAJUSCULES : chacune dit quoi faire. Corrige une chose à la fois, relance le diagnostic.

## Symptôme → solution
| Ce que tu vois | Cause | Solution |
|---|---|---|
| `claude` / `omniroute` / `kit-claude` « introuvable » | terminal ouvert avant l'installation | ferme et rouvre le terminal ; sinon relance l'installeur |
| `ECONNREFUSED 127.0.0.1:20128`, « Unable to connect » | OmniRoute est arrêté | `omniroute serve --no-open` (laisse la fenêtre ouverte) ou redémarre l'ordi (démarrage auto) |
| `401`, « invalid api key », « Authentication required » | clé d'accès Claude ↔ OmniRoute changée | relance l'installeur : il recrée la clé et la remet dans Claude Code |
| `429`, « rate limit », « quota exceeded » | quota gratuit du moment épuisé | attends 1 minute ; ajoute un 2e fournisseur (`kit-claude ajouter-cle`) pour que la bascule prenne le relais |
| « no eligible route », « all targets failed » | aucun fournisseur valide dans la combinaison | `kit-claude ajouter-cle` (recrée la combinaison `gratuit`) |
| Claude demande de te connecter à Anthropic | réglages non chargés | nouveau terminal ; mode abonnement : tape `claude-gratuit` au lieu de `claude` |
| « Claude Code doesn't recognize the model » | normal avec un modèle gratuit | rien à faire (le kit fixe la fenêtre de contexte à 120 000) |
| « API Usage Billing » sous le nom du modèle | libellé standard | rien à faire, aucun paiement |
| « Auto mode can't check actions in this session » | mode auto activé : sa vérification passe par Anthropic, pas par OmniRoute | Maj+Tab pour sortir du mode auto ; ensuite réponds 1 ou 2 aux demandes de permission (jamais 3) |
| « prompt is too long », réponses coupées | contexte trop gros pour le modèle | `/compact` ; si ça revient, mets `"CLAUDE_CODE_MAX_CONTEXT_TOKENS": "64000"` dans `~/.claude/settings.json` (section env) |
| Claude se ferme au démarrage (« folder isn't trusted ») | « No, exit » choisi | relance, flèche ↓ puis Entrée sur « Yes, I trust this folder » |
| Très lent | modèle gratuit chargé | `/compact`, ou `claude --model` avec un modèle Groq/NVIDIA |
| Outils ratés, boucles, fichiers mal modifiés | modèle trop faible pour la tâche | découpe la tâche ; mets Mistral Large en premier dans la combinaison |
| Windows : « l'exécution de scripts est désactivée » | règle PowerShell | lance `DEMARRER-WINDOWS.bat` (il contourne la règle sans rien changer sur l'ordi) |
| Mac : « impossible d'ouvrir DEMARRER-MAC.command » | sécurité macOS | clic droit → Ouvrir → Ouvrir ; ou colle la ligne du guide dans le Terminal |
| Mot de passe du tableau de bord oublié | | `omniroute-reset-password` dans un terminal |

## Commandes utiles
- Ajouter une clé gratuite : `kit-claude ajouter-cle` (à taper dans un terminal à part : la clé ne passe jamais par le chat).
- Tout mettre à jour (kit, OmniRoute, Claude Code) : `kit-claude mise-a-jour`.
- Vérifier que Claude répond : `kit-claude test`.
- Clé ajoutée dans le tableau de bord : `kit-claude bascule` (reconstruit la combinaison `gratuit`).
- Revenir à Claude Code normal : `kit-claude desinstaller` (tes projets restent).
- Tableau de bord : `http://127.0.0.1:20128` (serveur : `ssh -L 20128:127.0.0.1:20128 utilisateur@ip` puis la même adresse sur ton PC).

## Si rien ne marche
Copie le rapport du diagnostic + le message d'erreur exact (20 lignes max) dans Claude (même la version gratuite de claude.ai) avec : « Je suis le guide du kit Claude Gratuit, voici mon diagnostic, dis-moi la prochaine action ».
