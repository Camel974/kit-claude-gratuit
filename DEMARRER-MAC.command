#!/bin/bash
# Double-clique sur ce fichier (Mac). Si macOS bloque : clic droit > Ouvrir > Ouvrir.
cd "$(dirname "$0")" || exit 1
bash ./installer.sh "$@"
echo
read -n 1 -s -r -p "Termine. Appuie sur une touche pour fermer cette fenetre..."
echo
