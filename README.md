# RED-TETRIS

RED-TETRIS est un jeu Tetris multijoueur en réseau, développé avec une stack JavaScript full-stack.

## Technologies utilisées

### Côté serveur
- Node.js
- Fastify
- Socket.io

### Côté client
- React
- Redux
- TailwindCSS
- Socket.io-client

## Installation

1. Clonez ce dépôt :
```bash
git clone <url-du-repo>
cd RED-TETRIS
```

2. Installez les dépendances côté serveur :
```bash
cd server
npm install
```

3. Installez les dépendances côté client :
```bash
cd ../client
npm install
```

## Exécution

### Méthode simple (script automatique)

Utilisez le script pour démarrer à la fois le client et le serveur :
```bash
./start.sh
```

### Méthode manuelle

1. Démarrez le serveur :
```bash
cd server
npm run dev
```

2. Dans un autre terminal, démarrez le client :
```bash
cd client
npm run dev
```

## Utilisation

1. Ouvrez votre navigateur à l'adresse http://localhost:5173
2. Entrez un nom d'utilisateur pour vous connecter
3. Créez une nouvelle partie ou rejoignez une partie existante
4. Partagez l'URL avec des amis pour qu'ils puissent rejoindre votre partie
5. Jouez à Tetris !

## Commandes de jeu

- Flèches gauche/droite : Déplacer la pièce horizontalement
- Flèche bas : Accélérer la descente
- Flèche haut : Faire pivoter la pièce
- Espace : Faire chuter la pièce instantanément

## Navigation par URL

Vous pouvez accéder directement à une partie en utilisant le format d'URL suivant :
```
http://localhost:5173/partieName/pseudo
```

## Fonctionnalités

- Création et gestion de parties multijoueurs
- Visualisation des grilles des adversaires
- Système de score et de niveaux
- Interface utilisateur moderne et responsive
- Partage facile des parties via URL

## Structure du projet

```
RED-TETRIS/
├── client/             # Application frontend React
│   ├── src/
│   │   ├── components/ # Composants UI
│   │   ├── features/   # Slices Redux
│   │   ├── hooks/      # Hooks personnalisés
│   │   ├── pages/      # Pages de l'application
│   │   ├── services/   # Services (Socket.io)
│   │   └── store/      # Configuration Redux
│   └── ...
├── server/             # Serveur backend Node.js
│   ├── src/
│   │   ├── models/     # Modèles (Game, Piece, Player)
│   │   ├── services/   # Services (SocketService, GameManager)
│   │   └── utils/      # Utilitaires
│   └── ...
└── start.sh           # Script de démarrage
```
