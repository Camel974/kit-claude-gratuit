#!/usr/bin/env bash
# Kit Claude Gratuit (Brennan SONNET) : installe Claude Code + OmniRoute sur Mac, Linux, ou un serveur (VPS / NAS).
#
#   Depuis le dossier du kit :   bash installer.sh
#   Sans telecharger le zip :    curl -fsSL https://raw.githubusercontent.com/Camel974/kit-claude-gratuit/main/installer.sh | bash
#   Forcer le mode serveur :     bash installer.sh --serveur
#
# Ce script installe seulement ce qui manque (Node.js dans ton dossier perso, Claude Code officiel),
# puis passe la main a scripts/kit.mjs (questions, OmniRoute, cles, skills, test).
# Aucun mot de passe administrateur n'est demande. Relancable sans risque : c'est aussi la mise a jour.
set -euo pipefail

KIT_REPO="Camel974/kit-claude-gratuit"
ETAT="$HOME/.kit-claude-gratuit"
NODE_DIR="$ETAT/node"

bleu() { printf '\033[36m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32mOK\033[0m  %s\n' "$*"; }
info() { printf '  \033[36m>>\033[0m  %s\n' "$*"; }
stop() { printf '  \033[31mXX\033[0m  %s\n' "$*"; exit 1; }

bleu "KIT CLAUDE GRATUIT · installation (Mac / Linux / serveur)"

if [ "$(id -u)" = 0 ] && [ -n "${SUDO_USER:-}" ]; then
  stop "Lance ce script SANS sudo (tape juste : bash installer.sh). Rien ne demande les droits administrateur."
fi
command -v curl >/dev/null 2>&1 || stop "curl manque. Linux : sudo apt install -y curl (ou dnf install curl), puis relance."
command -v tar >/dev/null 2>&1 || stop "tar manque. Linux : sudo apt install -y tar, puis relance."
mkdir -p "$ETAT"

# ---------- 1. Le dossier du kit (le zip dezippe, ou telechargement si lance via curl | bash)
SRC=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "$(dirname "${BASH_SOURCE[0]}")/scripts/kit.mjs" ]; then
  SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
  info "Telechargement du kit depuis GitHub..."
  rm -rf "$ETAT/kit.tmp" && mkdir -p "$ETAT/kit.tmp"
  curl -fsSL "https://codeload.github.com/$KIT_REPO/tar.gz/refs/heads/main" | tar -xz -C "$ETAT/kit.tmp" --strip-components=1 \
    || stop "Telechargement impossible. Verifie ta connexion internet, ou telecharge le zip : https://github.com/$KIT_REPO"
  rm -rf "$ETAT/kit" && mv "$ETAT/kit.tmp" "$ETAT/kit"
  SRC="$ETAT/kit"
fi
ok "Kit : $SRC"

# ---------- 2. Node.js (OmniRoute veut 22.22.2+ ou 24 a 26)
node_ok() {
  local v maj rest min pat
  v="$("$1" -p 'process.versions.node' 2>/dev/null)" || return 1
  maj="${v%%.*}"; rest="${v#*.}"; min="${rest%%.*}"; pat="${rest#*.}"
  if [ "$maj" -ge 24 ] && [ "$maj" -lt 27 ]; then return 0; fi
  if [ "$maj" -eq 22 ] && { [ "$min" -gt 22 ] || { [ "$min" -eq 22 ] && [ "${pat%%[!0-9]*}" -ge 2 ]; }; }; then return 0; fi
  return 1
}
NODE=""
for cand in "$NODE_DIR/bin/node" "$(command -v node 2>/dev/null || true)"; do
  if [ -n "$cand" ] && [ -x "$cand" ] && node_ok "$cand"; then NODE="$cand"; break; fi
done

if [ -z "$NODE" ]; then
  case "$(uname -s)" in Darwin) os=darwin ;; Linux) os=linux ;; *) stop "Systeme non reconnu : $(uname -s)" ;; esac
  case "$(uname -m)" in x86_64|amd64) arch=x64 ;; arm64|aarch64) arch=arm64 ;; armv7l) arch=armv7l ;; *) stop "Processeur non reconnu : $(uname -m)" ;; esac
  info "Installation de Node.js dans ton dossier perso (sans mot de passe, ~1 minute)..."
  # Pas de « head » ici : avec pipefail, il couperait le telechargement (erreur 141, vue en test).
  idx="$(curl -fsSL https://nodejs.org/dist/index.json)" || stop "nodejs.org injoignable : verifie ta connexion."
  ver="$(printf '%s' "$idx" | tr '{' '\n' | grep -E '"version":"v2(2|4|6)\.' | grep -v '"lts":false' | sed -n '1s/.*"version":"v\([0-9.]*\)".*/\1/p')"
  [ -n "$ver" ] || stop "Impossible de trouver la version de Node.js."
  rm -rf "$NODE_DIR" && mkdir -p "$NODE_DIR"
  curl -fsSL "https://nodejs.org/dist/v$ver/node-v$ver-$os-$arch.tar.gz" | tar -xz -C "$NODE_DIR" --strip-components=1 \
    || stop "Telechargement de Node.js echoue."
  NODE="$NODE_DIR/bin/node"
  node_ok "$NODE" || stop "Node.js $ver ne convient pas."
  ligne="export PATH=\"$NODE_DIR/bin:\$PATH\" # kit-claude-gratuit"
  for rc in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile"; do
    if [ "$rc" = "$HOME/.profile" ] || [ -f "$rc" ] || { [ "$os" = darwin ] && [ "$rc" = "$HOME/.zshrc" ]; }; then
      grep -qF "$ligne" "$rc" 2>/dev/null || printf '\n%s\n' "$ligne" >> "$rc"
    fi
  done
  ok "Node.js $ver installe dans $NODE_DIR"
else
  ok "Node.js $("$NODE" -v) : $NODE"
fi
NODE_BIN="$(dirname "$NODE")"
export PATH="$NODE_BIN:$HOME/.local/bin:$PATH"

# ---------- 3. Petit serveur : memoire d'echange AVANT les installations (seulement si root, Linux, < 3 Go, pas de swap)
if [ "$(uname -s)" = Linux ] && [ "$(id -u)" = 0 ] && [ -r /proc/meminfo ]; then
  ram_mo=$(( $(grep MemTotal /proc/meminfo | tr -s ' ' | cut -d' ' -f2) / 1024 ))
  swap_mo=$(( $(grep SwapTotal /proc/meminfo | tr -s ' ' | cut -d' ' -f2) / 1024 ))
  if [ "$ram_mo" -lt 3000 ] && [ "$swap_mo" -lt 512 ] && [ ! -e /swapfile ]; then
    info "Serveur a ${ram_mo} Mo de RAM : ajout de 2 Go de memoire d'echange (evite les plantages d'OmniRoute)..."
    if fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none; then
      if chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile; then
        grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
        ok "Swap de 2 Go active"
      else
        rm -f /swapfile; info "Swap impossible sur ce serveur (pas grave si tu as 2 Go de RAM libres)."
      fi
    fi
  fi
fi

# Serveur : tmux garde Claude en vie si la connexion SSH coupe.
case " $* " in *" --serveur "*)
  if [ "$(id -u)" = 0 ] && ! command -v tmux >/dev/null 2>&1 && command -v apt-get >/dev/null 2>&1; then
    info "Installation de tmux (garde Claude ouvert si ta connexion SSH coupe)..."
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq tmux >/dev/null 2>&1 && ok "tmux installe" || info "tmux non installe (optionnel)."
  fi ;;
esac

# ---------- 4. Claude Code (installeur officiel d'Anthropic, dans ~/.local/bin)
if command -v claude >/dev/null 2>&1 || [ -x "$HOME/.local/bin/claude" ]; then
  ok "Claude Code deja installe"
else
  info "Installation de Claude Code (officiel, ~1 minute)..."
  curl -fsSL https://claude.ai/install.sh | bash || stop "Installation de Claude Code echouee. Relance ce script dans 5 minutes."
fi

# ---------- 5. La suite : questions, OmniRoute, cles, skills, test
if [ -t 0 ]; then
  exec "$NODE" "$SRC/scripts/kit.mjs" installer "$@"
elif [ -r /dev/tty ] && (exec </dev/tty) 2>/dev/null; then
  exec "$NODE" "$SRC/scripts/kit.mjs" installer "$@" </dev/tty
else
  exec "$NODE" "$SRC/scripts/kit.mjs" installer "$@"
fi
