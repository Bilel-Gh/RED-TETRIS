# 🖥️ RED TETRIS - Serveur

Ce dossier contient l'implémentation du serveur pour le jeu RED TETRIS. Le serveur gère toute la logique de jeu, la synchronisation entre les joueurs et la communication en temps réel via WebSockets.

## 🏗️ Architecture

Le serveur est construit avec une architecture modulaire et extensible :

```
server/
├── src/
│   ├── config/           # Configuration du serveur
│   ├── models/          # Modèles de données et logique métier
│   ├── services/        # Services et gestionnaires
│   └── __tests__/      # Tests unitaires et d'intégration
├── index.js            # Point d'entrée du serveur
└── vitest.config.js    # Configuration des tests
```

### Composants Principaux

#### Models
- **Game** : Gère l'état d'une partie de Tetris
- **Player** : Représente un joueur connecté
- **Piece** : Logique des pièces de Tetris
- **Grid** : Gestion de la grille de jeu

#### Services
- **GameManager** : Orchestration des parties
- **SocketService** : Gestion des connexions WebSocket
- **ScoreService** : Calcul et gestion des scores

## 🚀 Démarrage

### Prérequis
- Node.js (v18 ou supérieur)
- npm ou yarn

### Installation

```bash
# Installation des dépendances
npm install

# Démarrage en mode développement
npm run dev

# Démarrage en production
npm start
```

### Variables d'Environnement

Créez un fichier `.env` à la racine du dossier `server` :

```env
PORT=3000
NODE_ENV=development
```

## 🔌 API WebSocket

### Événements Émis par le Serveur

- `game:start` : Démarrage d'une nouvelle partie
- `game:update` : Mise à jour de l'état du jeu
- `game:over` : Fin de partie
- `player:join` : Un joueur rejoint la partie
- `player:leave` : Un joueur quitte la partie
- `error` : Erreur de communication

### Événements Reçus par le Serveur

- `game:join` : Demande de rejoindre une partie
- `game:move` : Mouvement d'une pièce
- `game:rotate` : Rotation d'une pièce
- `game:drop` : Lâcher une pièce
- `game:chat` : Message de chat

## 🧪 Tests

Le serveur inclut une suite de tests avec Vitest :

```bash
# Exécuter tous les tests
npm test

# Exécuter les tests avec couverture
npm run test:coverage

# Exécuter les tests en mode watch
npm run test:watch
```

### Structure des Tests

- Tests unitaires pour chaque modèle
- Tests d'intégration pour les services
- Tests de bout en bout pour les WebSockets

## 📊 Monitoring

Le serveur inclut des métriques de performance :

- Temps de réponse des WebSockets
- Nombre de connexions actives
- État des parties en cours
- Utilisation des ressources

## 🔒 Sécurité

- Validation des entrées utilisateur
- Protection contre les attaques par déni de service
- Rate limiting sur les connexions WebSocket
- Sanitization des messages de chat

## 🐛 Débogage

Pour activer le mode debug :

```bash
DEBUG=red-tetris:* npm run dev
```

## 📚 Documentation Technique

Pour plus de détails sur l'implémentation :

- [Documentation des Modèles](docs/models.md)
- [Documentation des Services](docs/services.md)

## 🤝 Contribution

Les contributions sont les bienvenues ! Consultez notre [guide de contribution](../CONTRIBUTING.md) pour plus de détails.

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](../LICENSE) pour plus de détails.
