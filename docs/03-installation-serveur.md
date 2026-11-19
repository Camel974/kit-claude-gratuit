# 03 · Installation sur un serveur (VPS ou NAS) : le meilleur choix

**Pourquoi le serveur en priorité ?** OmniRoute et Claude Code tournent 24 h/24, tu y accèdes depuis n'importe quel ordi (même un vieux PC, une tablette, ton téléphone), ton ordi reste léger, et les sites que Claude construit sont déjà sur une machine en ligne.

## Le serveur qu'il te faut
| | Minimum | Confortable |
|---|---|---|
| RAM | 2 Go (le kit ajoute 2 Go de swap automatiquement) | 4 Go |
| Disque | 10 Go libres (le kit en utilise ~4 : OmniRoute 3 Go, mesuré) | 20 Go |
| Système | Ubuntu 22.04/24.04 ou Debian 12 (x64 ou ARM) | idem |

Mesuré : OmniRoute utilise **~550 Mo de RAM au repos**. N'importe quel petit VPS Linux convient (Hetzner, OVHcloud, Hostinger, Contabo...). Un NAS Synology/Unraid marche aussi s'il a un accès SSH et 2 Go de RAM libres. **D'autres services tournent déjà (n8n, une base...) ?** Vise 4 Go de RAM : le kit t'avertit s'il reste moins de 1,2 Go disponible.

## Installation (10 minutes)
1. **Connecte-toi en SSH** depuis ton PC :
   - Windows : touche Windows → « PowerShell » → `ssh root@ADRESSE-IP` (SSH est inclus dans Windows 10/11).
   - Mac : app Terminal → `ssh root@ADRESSE-IP`.
   Premier contact : tape `yes` puis ton mot de passe (rien ne s'affiche quand tu tapes, c'est normal).
2. **Colle cette ligne** et Entrée :
   ```bash
   curl -fsSL https://raw.githubusercontent.com/Camel974/kit-claude-gratuit/main/installer.sh | bash -s -- --serveur
   ```
3. **Réponds aux questions** (Entrée = recommandé). Colle tes clés gratuites (clic droit sous Windows, Cmd+V sur Mac) : elles s'affichent en étoiles.
4. À la fin : `OK Claude Code répond en X s : « OK »`. **Note le mot de passe** du tableau de bord.

Ce que le script fait sur un serveur : Node.js dans ton dossier perso (pas de sudo), swap de 2 Go si moins de 3 Go de RAM (en root, avant les installations), tmux, Claude Code officiel, OmniRoute, démarrage automatique au reboot (service systemd `omniroute`, vérifié), OmniRoute verrouillé sur `127.0.0.1` + clé obligatoire. **Aucun port n'est ouvert sur Internet.**

## Travailler avec Claude sur le serveur
```bash
ssh root@ADRESSE-IP
tmux new -A -s claude
cd Projets-Claude
claude
```
**tmux** garde Claude en vie si ta connexion coupe ou si tu fermes ton PC : reconnecte-toi et retape `tmux new -A -s claude`, tu retrouves Claude là où il en était. Pour te détacher volontairement : `Ctrl+B` puis `D`.

⚠️ **Serveur partagé avec d'autres services (n8n, base de données...)** : quand Claude demande « Do you want to proceed? » pour une commande, réponds **1** (une fois), pas **2** (« ne plus demander »). Un modèle gratuit peut se tromper de commande, et en root il peut tout effacer. Les règles du kit lui interdisent les commandes destructrices sans ton OK, mais garde la main.
Astuce confort : **VS Code** (gratuit) + extension **Remote - SSH** → tu vois les fichiers du serveur comme sur ton PC, et le terminal intégré lance `claude`.

## Ouvrir le tableau de bord OmniRoute du serveur
OmniRoute n'écoute que le serveur lui-même (sécurité). Pour l'afficher sur ton PC, ouvre un **tunnel SSH** :
```bash
ssh -L 20128:127.0.0.1:20128 root@ADRESSE-IP
```
Laisse cette fenêtre ouverte, puis ouvre http://127.0.0.1:20128 dans ton navigateur.

## Utiliser l'OmniRoute du serveur depuis Claude Code sur ton PC (option)
Si tu préfères garder tes fichiers sur ton PC mais utiliser les quotas du serveur :
1. Sur ton PC, installe d'abord le kit normalement (Windows / Mac), même sans clé : ça installe Node.js, Claude Code et la commande `kit-claude`.
2. Sur le serveur, tape `kit-claude cle` et copie la clé affichée.
3. Sur ton PC : `kit-claude connecter-serveur` → adresse (`root@ADRESSE-IP`) → colle la clé (elle s'affiche en étoiles, elle ne reste pas dans l'historique).
4. Ensuite, dans un dossier de projet : `claude-serveur` (ouvre le tunnel SSH s'il n'est pas déjà ouvert, puis lance Claude Code dessus ; message clair si le tunnel échoue).
Conseil : une clé SSH (`ssh-keygen` puis `ssh-copy-id root@ADRESSE-IP`) évite de retaper le mot de passe. Sous Windows, une fenêtre « Tunnel OmniRoute » s'ouvre : laisse-la ouverte.

## Alternative Docker (serveur de 4 Go ou plus, si tu connais déjà Docker)
```bash
docker run -d --name omniroute --restart unless-stopped \
  -e OMNIROUTE_MEMORY_MB=2048 -e REQUIRE_API_KEY=true \
  -p 127.0.0.1:20128:20128 -v omniroute-data:/app/data cheaperinference/omniroute:latest
```
`cheaperinference/omniroute` est l'image indiquée par le README officiel d'OmniRoute (novembre 2026, le projet a déménagé chez `cheaper-inference`) : vérifie-le sur la page GitHub du projet avant de lui confier tes clés. L'image limite la mémoire à 1 Go par défaut ; la doc officielle conseille bien plus pour un agent de code avec de longs contextes. Sur un serveur de 2 Go, prends le script du kit (sans Docker).

## Brancher n8n (dans Docker) sur OmniRoute (avancé)
Un conteneur ne voit pas le `127.0.0.1` du serveur. Fais écouter OmniRoute sur l'adresse du pont Docker (privée, invisible depuis Internet) :
1. Dans `~/.omniroute/.env`, mets `OMNIROUTE_SERVER_HOST=172.17.0.1` (l'adresse de `docker0`, vérifie avec `ip addr show docker0`).
2. Relance l'installeur (`curl ... | bash -s -- --serveur`, 10 secondes) : il redémarre OmniRoute et rebranche Claude Code et `kit-claude` sur cette adresse. Il garde une adresse privée comme celle-ci à chaque relance (jamais `0.0.0.0`).
3. Crée une clé dédiée à n8n : tableau de bord → Gestionnaire d'API → Créer une clé.
4. Dans n8n : nœud « OpenAI » / « OpenAI Chat Model » → URL de base `http://172.17.0.1:20128/v1`, clé = celle de l'étape 3, modèle `gratuit`.
Le tunnel SSH vers le tableau de bord devient alors : `ssh -L 20128:172.17.0.1:20128 root@ADRESSE-IP`.

## Sécurité serveur (à faire une fois)
- Mot de passe root solide ou, mieux, connexion par clé SSH uniquement.
- Mises à jour : `apt update && apt upgrade -y` de temps en temps.
- N'ouvre **jamais** le port 20128 sur Internet. Pour un accès depuis plusieurs appareils sans tunnel, utilise un réseau privé type Tailscale (gratuit pour un usage perso) plutôt qu'un port public.

## Dépannage serveur
| Problème | Solution |
|---|---|
| `curl: command not found` | `apt install -y curl` (Debian/Ubuntu) puis relance |
| « Lance ce script SANS sudo » | tape la commande sans `sudo` (ou connecte-toi directement en root) |
| OmniRoute ne redémarre pas après un reboot | en root : `systemctl status omniroute` ; sinon `systemctl --user status omniroute` (+ `sudo loginctl enable-linger $USER`) ; sinon relance l'installeur |
| `claude` ou `kit-claude` : « command not found » après reconnexion | reconnecte-toi (le kit ajoute `~/.local/bin` au PATH) ; sinon `export PATH="$HOME/.local/bin:$PATH"` |
| Claude s'est arrêté quand la connexion a coupé | utilise `tmux new -A -s claude` avant `claude` |
| Le serveur rame | `free -h` : si la RAM est pleine, prends 4 Go ou ferme d'autres services |
| Tout le reste | `kit-claude diagnostic` et [07-depannage.md](07-depannage.md) |
