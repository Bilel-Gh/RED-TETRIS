import { io } from 'socket.io-client';
import {
  loginSuccess,
  loginFailure
} from '../features/authSlice';
import {
  fetchGamesSuccess,
  fetchGamesFailure,
  createGameSuccess,
  createGameFailure,
  joinGameSuccess,
  joinGameFailure,
  playerJoined,
  playerLeft,
  updateGameState,
  gameStarted
} from '../features/gameSlice';

// Socket instance
let socket = null;
let store = null;

// Initialiser la connexion Socket
const connect = (reduxStore) => {
  store = reduxStore;

  // Connexion au serveur Socket.io
  socket = io('http://localhost:3001', {
    reconnectionDelayMax: 10000,
  });

  // Gestion des événements de base
  socket.on('connect', () => {
    console.log('Connecté au serveur Socket.io avec ID:', socket.id);
    // Tester immédiatement la connexion
    testConnection();
  });

  socket.on('connect_error', (error) => {
    console.error('Erreur de connexion Socket.io:', error);
  });

  socket.on('disconnect', () => {
    console.log('Déconnecté du serveur Socket.io');
  });

  // Événements spécifiques au jeu
  setupGameEvents();
};

// Configurer les événements spécifiques au jeu
const setupGameEvents = () => {
  // Mise à jour de la liste des parties
  socket.on('game:list_updated', (games) => {
    store.dispatch(fetchGamesSuccess(games));
  });

  // Un joueur a rejoint la partie
  socket.on('game:player_joined', (data) => {
    store.dispatch(playerJoined(data.player));
  });

  // Un joueur a quitté la partie
  socket.on('game:player_left', (data) => {
    store.dispatch(playerLeft({
      id: data.playerId,
      newHost: data.newHost // Transmettre l'information sur le nouvel hôte
    }));
  });

  // Mise à jour complète de l'état du jeu (après qu'un joueur soit parti par exemple)
  socket.on('game:state_updated', (gameState) => {
    console.log('Événement game:state_updated reçu:', gameState);
    store.dispatch(updateGameState(gameState));
  });

  // Mise à jour de l'état d'un joueur (pièce, grille, etc.)
  socket.on('game:player_updated', (data) => {
    console.log('Événement game:player_updated reçu:', data);
    store.dispatch(updateGameState(data));
  });

  // La partie a démarré
  socket.on('game:started', (data) => {
    console.log('Événement game:started reçu:', data);
    store.dispatch(gameStarted(data));
  });

  // Un utilisateur s'est connecté
  socket.on('user:joined', (userData) => {
    console.log('Nouvel utilisateur connecté:', userData);
  });

  // Un utilisateur s'est déconnecté
  socket.on('user:left', (userData) => {
    console.log('Utilisateur déconnecté:', userData);
  });
};

// Authentification d'un utilisateur
const login = (username) => {
  return new Promise((resolve, reject) => {
    socket.emit('user:login', username, (response) => {
      if (response.success) {
        store.dispatch(loginSuccess(response.user));
        resolve(response.user);
      } else {
        store.dispatch(loginFailure(response.error));
        reject(response.error);
      }
    });
  });
};

// Récupérer la liste des parties disponibles
const getGames = () => {
  return new Promise((resolve, reject) => {
    socket.emit('game:list', (response) => {
      if (response.success) {
        resolve(response);
      } else {
        store.dispatch(fetchGamesFailure(response.error));
        reject(response.error);
      }
    });
  });
};

// Créer une nouvelle partie
const createGame = (roomName) => {
  return new Promise((resolve, reject) => {
    socket.emit('game:create', roomName, (response) => {
      if (response.success) {
        store.dispatch(createGameSuccess(response.game));
        // Ajouter l'hôte à la liste des joueurs
        store.dispatch(joinGameSuccess({
          game: response.game,
          players: response.game.players
        }));
        resolve({ success: true, game: response.game });
      } else {
        store.dispatch(createGameFailure(response.error));
        reject({ success: false, error: response.error });
      }
    });
  });
};

// Rejoindre une partie existante
const joinGame = (gameId) => {
  return new Promise((resolve, reject) => {
    socket.emit('game:join', gameId, (response) => {
      if (response.success) {
        store.dispatch(joinGameSuccess({
          game: response.game,
          players: response.game.players
        }));
        resolve({ success: true, game: response.game });
      } else {
        store.dispatch(joinGameFailure(response.error));
        reject({ success: false, error: response.error });
      }
    });
  });
};

// Quitter une partie
const leaveGame = () => {
  return new Promise((resolve, reject) => {
    socket.emit('game:leave', (response) => {
      if (response.success) {
        resolve();
      } else {
        reject(response.error);
      }
    });
  });
};

// Démarrer une partie
const startGame = () => {
  return new Promise((resolve, reject) => {
    console.log("Émission de l'événement game:start");
    socket.emit('game:start', (response) => {
      console.log("Réponse de game:start reçue:", response);
      if (response && response.success) {
        resolve({ success: true });
      } else {
        reject({ success: false, error: response?.error || "Erreur inconnue lors du démarrage" });
      }
    });
  });
};

// Déplacer une pièce
const movePiece = (direction) => {
  return new Promise((resolve, reject) => {
    socket.emit('game:move', direction, (response) => {
      if (response.success) {
        resolve(response.result);
      } else {
        reject(response.error);
      }
    });
  });
};

// Déconnecter le socket
const disconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Méthode de test de connexion
const testConnection = () => {
  console.log("Test de connexion Socket.io...");
  socket.emit('ping', Date.now(), (response) => {
    if (response) {
      console.log('Connexion Socket.io confirmée, réponse:', response);
    } else {
      console.error('Pas de réponse du serveur au ping');
    }
  });
};

// Exporter toutes les fonctions
const socketService = {
  connect,
  login,
  getGames,
  createGame,
  joinGame,
  leaveGame,
  startGame,
  movePiece,
  disconnect,
  testConnection
};

export default socketService;
