#!/bin/bash

# Définir les chemins
CLIENT_DIR="./client"
SERVER_DIR="./server"

# Fonction pour vérifier si un processus est en cours d'exécution
is_running() {
  pgrep -f "$1" >/dev/null
}

# Fonction pour tuer un processus par son nom
kill_process() {
  pkill -f "$1"
}

# Arrêter les processus existants si nécessaire
if is_running "vite"; then
  echo "Arrêt du client existant..."
  kill_process "vite"
fi

if is_running "node.*server/index.js"; then
  echo "Arrêt du serveur existant..."
  kill_process "node.*server/index.js"
fi

# Démarrer le serveur en arrière-plan
echo "Démarrage du serveur..."
cd "$SERVER_DIR" && npm run dev &
SERVER_PID=$!

# Attendre que le serveur soit prêt
sleep 3

# Démarrer le client en arrière-plan
echo "Démarrage du client..."
cd "$CLIENT_DIR" && npm run dev &
CLIENT_PID=$!

# Fonction d'arrêt à l'interruption
cleanup() {
  echo "Arrêt des processus..."
  kill $SERVER_PID
  kill $CLIENT_PID
  exit 0
}

# Capturer Ctrl+C pour nettoyer proprement
trap cleanup INT

# Garder le script en cours d'exécution
echo "RED TETRIS est en cours d'exécution! Appuyez sur Ctrl+C pour quitter."
wait
