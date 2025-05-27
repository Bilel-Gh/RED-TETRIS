# 🎮 RED TETRIS - Tetris Multijoueur en Temps Réel

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"/>
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io"/>
  <img src="https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify"/>
</div>

## 🚀 Aperçu du Projet

RED TETRIS est une implémentation moderne et multijoueur du célèbre jeu Tetris, développée avec une stack JavaScript full-stack. Ce projet démontre l'utilisation avancée des WebSockets pour créer une expérience de jeu en temps réel fluide et compétitive.

### 🌟 Points Forts

- **Architecture Full-Stack** : Développement complet avec Node.js et React
- **Communication Temps Réel** : Implémentation robuste des WebSockets avec Socket.io
- **Performance** : Utilisation de Fastify pour des performances optimales
- **Scalabilité** : Architecture conçue pour gérer plusieurs parties simultanées
- **Tests Automatisés** : Couverture de tests avec Vitest

## 🛠️ Stack Technique

### Frontend
- **Framework** : React avec Vite
- **State Management** : Redux pour la gestion d'état globale
- **Styling** : CSS Modules avec animations fluides
- **WebSockets** : Socket.io-client pour la communication temps réel

### Backend
- **Runtime** : Node.js
- **Framework** : Fastify pour des performances optimales
- **WebSockets** : Socket.io pour la gestion des connexions temps réel
- **Tests** : Vitest pour les tests unitaires et d'intégration

## 🎯 Fonctionnalités Principales

### Mode Multijoueur
- Parties en temps réel avec plusieurs joueurs
- Synchronisation instantanée des grilles
- Système de matchmaking via URL
- Chat en temps réel entre joueurs

### Mécaniques de Jeu
- Système de score avancé
- Gestion des malus entre joueurs
- Prévisualisation des pièces
- Système de niveaux dynamique

### Interface Utilisateur
- Design responsive et moderne
- Animations fluides
- Interface intuitive et accessible
- Support multi-plateformes

## 📦 Installation

```bash
# Cloner le repository
git clone https://github.com/votre-username/RED-TETRIS.git
cd RED-TETRIS

# Installer les dépendances
npm install

# Lancer le projet (client + serveur)
./start.sh
```

## 🎮 Comment Jouer

1. Lancez le jeu via `./start.sh`
2. Accédez à `http://localhost:5173`
3. Créez une partie ou rejoignez une partie existante
4. Utilisez les contrôles classiques de Tetris :
   - ⬅️ ➡️ : Déplacement horizontal
   - ⬆️ : Rotation
   - ⬇️ : Descente rapide
   - Espace : Chute instantanée

## 🏗️ Architecture du Projet

```
RED-TETRIS/
├── client/                 # Application React
│   ├── src/
│   │   ├── components/    # Composants UI
│   │   ├── features/      # Logique métier
│   │   ├── hooks/         # Hooks personnalisés
│   │   ├── pages/         # Pages de l'application
│   │   ├── services/      # Services (Socket.io)
│   │   └── store/         # Configuration Redux
│   └── tests/             # Tests frontend
├── server/                # Serveur Node.js
│   ├── src/
│   │   ├── models/       # Modèles de données
│   │   ├── services/     # Services métier
│   │   └── config/       # Configuration
│   └── tests/            # Tests backend
└── start.sh              # Script de démarrage
```

## 🧪 Tests

Le projet inclut une suite de tests complète :
- Tests unitaires avec Vitest
- Tests d'intégration
- Couverture de code

## 📚 Documentation

Pour plus de détails sur chaque partie du projet :
- [Documentation Client](client/README.md)
- [Documentation Serveur](server/README.md)

## 🤝 Contribution

Les contributions sont les bienvenues ! Consultez nos guides détaillés dans les README spécifiques du client et du serveur.

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

<div align="center">
  <sub>Built with ❤️ by [Votre Nom]</sub>
</div>
