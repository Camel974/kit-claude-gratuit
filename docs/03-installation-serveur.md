# 03 · Installation sur un serveur (VPS ou NAS) : le meilleur choix

**Pourquoi le serveur en priorité ?** OmniRoute et Claude Code tournent 24 h/24, tu y accèdes depuis n'importe quel ordi (même un vieux PC, une tablette, ton téléphone), ton ordi reste léger, et les sites que Claude construit sont déjà sur une machine en ligne.

## Le serveur qu'il te faut
| | Minimum | Confortable |
|---|---|---|
| RAM | 2 Go (le kit ajoute 2 Go de swap automatiquement) | 4 Go |
| Disque | 10 Go libres | 20 Go |
| Système | Ubuntu 22.04/24.04 ou Debian 12 (x64 ou ARM) | idem |

Mesuré : OmniRoute utilise **~550 Mo de RAM au repos**. N'importe quel petit VPS Linux convient (Hetzner, OVHcloud, Hostinger, Contabo...). Un NAS Synology/Unraid marche aussi s'il a un accès SSH et 2 Go de RAM libres.

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

Ce que le script fait sur un serveur : Node.js dans ton dossier perso (pas de sudo), Claude Code officiel, OmniRoute, swap de 2 Go si moins de 3 Go de RAM (seulement en root), démarrage automatique au reboot (service systemd), OmniRoute verrouillé sur `127.0.0.1` + clé obligatoire. **Aucun port n'est ouvert sur Internet.**

## Travailler avec Claude sur le serveur
```bash
ssh root@ADRESSE-IP
cd Projets-Claude
claude
```
Astuce confort : **VS Code** (gratuit) + extension **Remote - SSH** → tu vois les fichiers du serveur comme sur ton PC, et le terminal intégré lance `claude`.

## Ouvrir le tableau de bord OmniRoute du serveur
OmniRoute n'écoute que le serveur lui-même (sécurité). Pour l'afficher sur ton PC, ouvre un **tunnel SSH** :
```bash
ssh -L 20128:127.0.0.1:20128 root@ADRESSE-IP
```
Laisse cette fenêtre ouverte, puis ouvre http://127.0.0.1:20128 dans ton navigateur.

## Utiliser l'OmniRoute du serveur depuis Claude Code sur ton PC (option)
Si tu préfères garder tes fichiers sur ton PC mais utiliser les quotas du serveur :
1. Sur le serveur, récupère la clé d'accès : `grep cleApi ~/.kit-claude-gratuit/etat.json`
2. Sur ton PC (avec le kit téléchargé) :
   ```bash
   node scripts/kit.mjs connecter-serveur --hote root@ADRESSE-IP --cle sk-...
   ```
3. Ensuite, dans un dossier de projet : `claude-serveur` (ouvre le tunnel SSH et lance Claude Code dessus).
Conseil : une clé SSH (`ssh-keygen` puis `ssh-copy-id root@ADRESSE-IP`) évite de retaper le mot de passe.

## Alternative Docker (si tu connais déjà Docker)
```bash
docker run -d --name omniroute --restart unless-stopped \
  -e OMNIROUTE_MEMORY_MB=4096 -e REQUIRE_API_KEY=true \
  -p 127.0.0.1:20128:20128 -v omniroute-data:/app/data cheaperinference/omniroute:latest
```
D'après la doc officielle d'OmniRoute, l'image limite la mémoire à 1 Go par défaut : un agent de code a besoin de plus (ils conseillent 8 Go pour un agent avec de longs contextes, 4 Go suffit pour démarrer). Le script du kit (sans Docker) est plus simple pour débuter.

## Sécurité serveur (à faire une fois)
- Mot de passe root solide ou, mieux, connexion par clé SSH uniquement.
- Mises à jour : `apt update && apt upgrade -y` de temps en temps.
- N'ouvre **jamais** le port 20128 sur Internet. Pour un accès depuis plusieurs appareils sans tunnel, utilise un réseau privé type Tailscale (gratuit pour un usage perso) plutôt qu'un port public.

## Dépannage serveur
| Problème | Solution |
|---|---|
| `curl: command not found` | `apt install -y curl` (Debian/Ubuntu) puis relance |
| « Lance ce script SANS sudo » | tape la commande sans `sudo` (ou connecte-toi directement en root) |
| OmniRoute ne redémarre pas après un reboot | `systemctl --user status omniroute` (ou `systemctl status omniroute` si root), sinon relance l'installeur |
| Le serveur rame | `free -h` : si la RAM est pleine, prends 4 Go ou ferme d'autres services |
| Tout le reste | `kit-claude diagnostic` et [07-depannage.md](07-depannage.md) |
