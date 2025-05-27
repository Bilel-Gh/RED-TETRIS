# 🎮 RED TETRIS - Client

Ce dossier contient l'application client React pour le jeu RED TETRIS. L'interface utilisateur est construite avec React et utilise Redux pour la gestion d'état, ainsi que Socket.io pour la communication en temps réel avec le serveur.

## 🏗️ Architecture

L'application suit une architecture moderne et modulaire :

```
client/
├── src/
│   ├── assets/          # Images, fonts, et autres ressources statiques
│   ├── components/      # Composants React réutilisables
│   ├── features/        # Fonctionnalités principales du jeu
│   ├── hooks/           # Hooks personnalisés
│   ├── pages/           # Pages de l'application
│   ├── services/        # Services (WebSocket, API)
│   ├── store/           # Configuration Redux
│   └── tests/           # Tests unitaires et d'intégration
├── public/             # Fichiers statiques
└── index.html         # Point d'entrée HTML
```

### Composants Principaux

#### Features
- **Game** : Logique principale du jeu Tetris
- **Multiplayer** : Gestion du mode multijoueur
- **Score** : Système de score et classement
- **Chat** : Système de chat en temps réel

#### Components
- **Board** : Grille de jeu Tetris
- **Piece** : Composant pour les pièces de Tetris
- **ScoreBoard** : Affichage des scores
- **ChatBox** : Interface de chat
- **Controls** : Contrôles du jeu

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

# Build pour production
npm run build

# Preview de la build
npm run preview
```

### Variables d'Environnement

Créez un fichier `.env` à la racine du dossier `client` :

```env
VITE_API_URL=ws://localhost:3000
VITE_APP_ENV=development
```

## 🎮 Fonctionnalités

### Interface de Jeu
- Grille de jeu responsive
- Affichage du score en temps réel
- Indicateur de niveau
- Theme sombre/clair

### Mode Multijoueur
- Création/Rejoindre une partie
- Affichage des grilles des adversaires
- Système de matchmaking via URL

### Contrôles
- Clavier (flèches, espace)
- Support tactile pour mobile
- Personnalisation des contrôles

## 🎨 Styling

L'application utilise :
- CSS Modules pour le styling modulaire
- Animations CSS pour les transitions
- Design responsive

## 🧪 Tests

```bash
# Exécuter tous les tests
npm test

# Exécuter les tests avec couverture
npm run test:coverage

# Exécuter les tests en mode watch
npm run test:watch
```

### Types de Tests
- Tests unitaires des composants
- Tests d'intégration des features

## 📱 Responsive Design

L'interface s'adapte à :
- Desktop (1920px et moins)
- Tablette (768px et moins)
- Mobile (480px et moins)

## 🔧 Développement

### Scripts Disponibles

```bash
# Lancer le linter
npm run lint

# Formater le code
npm run format

# Vérifier les types
npm run type-check
```

### Bonnes Pratiques
- Composants fonctionnels avec hooks
- Gestion d'état avec Redux
- Code splitting pour optimiser le chargement
- Lazy loading des composants lourds
