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
let isConnectionInProgress = false;
// Variable pour suivre si le processus de connexion est en cours
// pour éviter les connexions multiples simultanées
let reconnectionTimer = null;

// Initialiser la connexion Socket
const connect = (reduxStore) => {
  store = reduxStore;

  // Si une connexion est déjà établie, on l'utilise
  if (socket && socket.connected) {
    console.log('Socket déjà connecté avec ID:', socket.id);
    return;
  }

  // Si une connexion est en cours, on ne fait rien
  if (isConnectionInProgress) {
    console.log('Connexion socket déjà en cours, ignoré');
    return;
  }

  isConnectionInProgress = true;

  // Si un socket existe déjà mais n'est pas connecté, le nettoyer
  cleanupSocket();

  // Connexion au serveur Socket.io
  socket = io('http://localhost:3001', {
    reconnectionDelayMax: 5000,
    reconnection: true,
    reconnectionAttempts: 3,
    timeout: 10000, // 10 secondes de timeout
    transports: ['websocket', 'polling'] // Essayer d'abord WebSocket, puis polling
  });

  // Gestion des événements de base
  socket.on('connect', () => {
    console.log('Connecté au serveur Socket.io avec ID:', socket.id);
    isConnectionInProgress = false;

    // Annuler tout timer de reconnexion en cours
    if (reconnectionTimer) {
      clearTimeout(reconnectionTimer);
      reconnectionTimer = null;
    }

    // Si un utilisateur était connecté avant une déconnexion, le reconnecter automatiquement
    const authState = store.getState().auth;
    if (authState.isAuthenticated && authState.user && authState.user.username && !socket.auth) {
      console.log('Reconnexion automatique de l\'utilisateur:', authState.user.username);
      login(authState.user.username).catch(err => {
        console.error('Échec de la reconnexion automatique:', err);
      });
    } else {
      // Tester la connexion uniquement si aucune reconnexion n'est nécessaire
      testConnection();
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Erreur de connexion Socket.io:', error);
    isConnectionInProgress = false;
  });

  socket.on('disconnect', (reason) => {
    console.log('Déconnecté du serveur Socket.io, raison:', reason);
    isConnectionInProgress = false;

    // Réinitialiser l'état d'authentification du socket
    if (socket) {
      socket.auth = false;
    }
  });

  // Événements spécifiques au jeu
  setupGameEvents();
};

// Nettoyer proprement un socket existant
const cleanupSocket = () => {
  if (socket) {
    try {
      // Supprimer tous les écouteurs d'événements
      socket.removeAllListeners();

      // Fermer la connexion si elle est encore ouverte
      if (socket.connected) {
        socket.disconnect();
      }

      // Libérer le socket
      socket = null;

      console.log('Socket précédent nettoyé');
    } catch (error) {
      console.error('Erreur lors du nettoyage du socket:', error);
    }
  }
};

// Configurer les événements spécifiques au jeu
const setupGameEvents = () => {
  if (!socket) return;

  // Supprimer les écouteurs existants pour éviter les doublons
  socket.off('game:list_updated');
  socket.off('game:player_joined');
  socket.off('game:player_left');
  socket.off('game:state_updated');
  socket.off('game:player_updated');
  socket.off('game:started');
  socket.off('user:joined');
  socket.off('user:left');

  // Mise à jour de la liste des parties
  socket.on('game:list_updated', (games) => {
    console.log('Réception de la liste des parties mise à jour:', games);
    store.dispatch(fetchGamesSuccess(games));
  });

  // Un joueur a rejoint la partie
  socket.on('game:player_joined', (data) => {
    console.log('Un joueur a rejoint la partie:', data);
    store.dispatch(playerJoined(data.player));
  });

  // Un joueur a quitté la partie
  socket.on('game:player_left', (data) => {
    console.log('Un joueur a quitté la partie:', data);
    store.dispatch(playerLeft({
      id: data.playerId,
      newHost: data.newHost // Transmettre l'information sur le nouvel hôte
    }));
  });

  // Mise à jour complète de l'état du jeu (après qu'un joueur soit parti par exemple)
  socket.on('game:state_updated', (gameState) => {
    console.log('Mise à jour de l\'état du jeu reçue:', gameState);
    store.dispatch(updateGameState(gameState));
  });

  // Mise à jour de l'état d'un joueur (pièce, grille, etc.)
  socket.on('game:player_updated', (data) => {
    console.log('Mise à jour de l\'état du joueur reçue:', data.player?.id);
    store.dispatch(updateGameState(data));
  });

  // La partie a démarré
  socket.on('game:started', (data) => {
    console.log('La partie a démarré, données initiales:', data);
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

// S'assurer que le socket est connecté
const ensureConnection = () => {
  return new Promise((resolve, reject) => {
    if (!socket) {
      try {
        connect(store);
      } catch (error) {
        console.error('Erreur lors de l\'initialisation du socket:', error);
        return reject(new Error('Impossible d\'initialiser le socket'));
      }
    }

    if (!socket.connected) {
      console.log('Socket non connecté, tentative de reconnexion...');

      // Définir un délai maximum pour la connexion
      const timeout = setTimeout(() => {
        socket.off('connect');
        reject(new Error('Délai de connexion dépassé'));
      }, 5000);

      // Attendre que la connexion soit établie
      socket.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      // Écouter les erreurs de connexion
      socket.once('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Essayer de se connecter
      socket.connect();
    } else {
      resolve();
    }
  });
};

// Authentification d'un utilisateur
const login = async (username) => {
  if (!username || username.trim() === '') {
    return Promise.reject('Le nom d\'utilisateur ne peut pas être vide');
  }

  try {
    await ensureConnection();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Délai d\'authentification dépassé'));
      }, 5000);

      socket.emit('user:login', username, (response) => {
        clearTimeout(timeout);

        if (response && response.success) {
          // Marquer le socket comme authentifié
          socket.auth = true;
          store.dispatch(loginSuccess(response.user));
          resolve(response.user);
        } else {
          store.dispatch(loginFailure(response?.error || 'Erreur d\'authentification'));
          reject(response?.error || 'Erreur d\'authentification');
        }
      });
    });
  } catch (error) {
    store.dispatch(loginFailure(error.message || 'Erreur de connexion'));
    return Promise.reject(error);
  }
};

// Récupérer la liste des parties disponibles
const getGames = async () => {
  try {
    await ensureConnection();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Délai de récupération des parties dépassé'));
      }, 5000);

      socket.emit('game:list', (response) => {
        clearTimeout(timeout);

        if (response && response.success) {
          resolve(response);
        } else {
          store.dispatch(fetchGamesFailure(response?.error || 'Erreur de récupération des parties'));
          reject(response?.error || 'Erreur de récupération des parties');
        }
      });
    });
  } catch (error) {
    store.dispatch(fetchGamesFailure(error.message || 'Erreur de connexion'));
    return Promise.reject(error);
  }
};

// Créer une nouvelle partie
const createGame = async (roomName) => {
  try {
    await ensureConnection();

    console.log('Création d\'une nouvelle partie:', roomName);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Délai de création de partie dépassé'));
      }, 5000);

      socket.emit('game:create', roomName, (response) => {
        clearTimeout(timeout);

        console.log('Réponse de la création de partie:', response);
        if (response && response.success) {
          store.dispatch(createGameSuccess(response.game));
          // Ajouter l'hôte à la liste des joueurs
          store.dispatch(joinGameSuccess({
            game: response.game,
            players: response.game.players
          }));
          resolve({ success: true, game: response.game });
        } else {
          store.dispatch(createGameFailure(response?.error || 'Erreur de création de partie'));
          reject({ success: false, error: response?.error || 'Erreur de création de partie' });
        }
      });
    });
  } catch (error) {
    store.dispatch(createGameFailure(error.message || 'Erreur de connexion'));
    return Promise.reject({ success: false, error: error.message || 'Erreur de connexion' });
  }
};

// Rejoindre une partie existante
const joinGame = async (gameId) => {
  try {
    await ensureConnection();

    console.log('Tentative de rejoindre la partie:', gameId);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Délai pour rejoindre la partie dépassé'));
      }, 5000);

      socket.emit('game:join', gameId, (response) => {
        clearTimeout(timeout);

        console.log('Réponse de joinGame:', response);
        if (response && response.success) {
          store.dispatch(joinGameSuccess({
            game: response.game,
            players: response.game.players
          }));
          resolve({ success: true, game: response.game });
        } else {
          store.dispatch(joinGameFailure(response?.error || 'Erreur pour rejoindre la partie'));
          reject({ success: false, error: response?.error || 'Erreur pour rejoindre la partie' });
        }
      });
    });
  } catch (error) {
    store.dispatch(joinGameFailure(error.message || 'Erreur de connexion'));
    return Promise.reject({ success: false, error: error.message || 'Erreur de connexion' });
  }
};

// Quitter une partie
const leaveGame = async () => {
  try {
    await ensureConnection();

    console.log('Quitter la partie');
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve({ success: true, warning: 'Le serveur n\'a pas répondu mais la partie a été quittée localement' });
      }, 3000);

      socket.emit('game:leave', (response) => {
        clearTimeout(timeout);

        console.log('Réponse de leaveGame:', response);
        if (response && response.success) {
          resolve({ success: true });
        } else {
          reject({ success: false, error: response?.error || 'Erreur en quittant la partie' });
        }
      });
    });
  } catch (error) {
    return Promise.reject({ success: false, error: error.message || 'Erreur de connexion' });
  }
};

// Démarrer une partie
const startGame = async () => {
  try {
    await ensureConnection();

    console.log("Demande de démarrage du jeu");
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Délai de démarrage du jeu dépassé'));
      }, 5000);

      socket.emit('game:start', (response) => {
        clearTimeout(timeout);

        console.log("Réponse du démarrage du jeu:", response);
        if (response && response.success) {
          resolve({ success: true });
        } else {
          reject({ success: false, error: response?.error || "Erreur inconnue lors du démarrage" });
        }
      });
    });
  } catch (error) {
    return Promise.reject({ success: false, error: error.message || 'Erreur de connexion' });
  }
};

// Déplacer une pièce
const movePiece = async (direction) => {
  try {
    await ensureConnection();

    if (!socket.auth) {
      console.error("Le joueur n'est pas connecté");
      return { success: false, error: "Vous devez être connecté" };
    }

    console.log(`Déplacement de la pièce: ${direction}`);

    // Traitement local immédiat pour un retour plus réactif
    let didMove = false;

    return new Promise((resolve) => {
      // Définir un timeout court pour éviter de bloquer l'interface
      const timeout = setTimeout(() => {
        // Résoudre avec une réponse locale si le serveur ne répond pas assez vite
        console.warn('Le serveur ne répond pas assez vite, utilisation du retour local');
        resolve({
          success: true,
          result: { moved: didMove },
          warning: 'Réponse locale - le serveur ne répond pas assez vite'
        });
      }, 100); // Timeout plus court pour une meilleure réactivité

      socket.emit('game:move', direction, (response) => {
        clearTimeout(timeout);

        if (response && response.success) {
          didMove = true; // Marquer que le mouvement a été effectué
          resolve({ success: true, result: response.result });
        } else {
          console.error('Erreur lors du déplacement:', response?.error || 'Pas de réponse');
          resolve({ success: false, error: response?.error || 'Erreur inconnue' });
        }
      });
    });
  } catch (error) {
    console.error('Exception lors du déplacement:', error);
    return Promise.resolve({ success: false, error: error.message || 'Erreur de connexion' });
  }
};

// Déconnecter le socket
const disconnect = () => {
  console.log("Déconnexion du socket en cours...");

  // Annuler tout timer de reconnexion
  if (reconnectionTimer) {
    clearTimeout(reconnectionTimer);
    reconnectionTimer = null;
  }

  if (socket) {
    // Marquer le socket comme non authentifié
    socket.auth = false;

    try {
      // Désinscrire de tous les événements pour éviter les fuites mémoire
      socket.removeAllListeners();

      // Émettre un événement de déconnexion explicite au serveur si le socket est connecté
      if (socket.connected) {
        socket.emit('explicit:disconnect', () => {
          socket.disconnect();
        });
      } else {
        socket.disconnect();
      }

      console.log("Socket déconnecté avec succès");
    } catch (error) {
      console.error("Erreur lors de la déconnexion du socket:", error);
    }
  }
};

// Méthode de test de connexion
const testConnection = () => {
  if (!socket || !socket.connected) return;

  console.log("Test de connexion Socket.io...");

  // Ajouter un timeout pour éviter de bloquer si le serveur ne répond pas
  const pingTimeout = setTimeout(() => {
    console.error('Pas de réponse du serveur au ping (timeout)');
  }, 3000);

  socket.emit('ping', Date.now(), (response) => {
    clearTimeout(pingTimeout);
    if (response) {
      console.log('Connexion Socket.io confirmée, réponse:', response);
    } else {
      console.error('Pas de réponse du serveur au ping');
    }
  });
};

// Réessayer la connexion après un délai
const scheduleReconnection = (delay = 2000) => {
  if (reconnectionTimer) {
    clearTimeout(reconnectionTimer);
  }

  reconnectionTimer = setTimeout(() => {
    console.log("Tentative de reconnexion automatique...");
    connect(store);
    reconnectionTimer = null;
  }, delay);
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
  testConnection,
  scheduleReconnection,
  get isAuth() {
    return socket && socket.auth;
  },
  get isConnected() {
    return socket && socket.connected;
  }
};

export default socketService;
