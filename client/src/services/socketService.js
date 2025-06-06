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
  gameStarted,
  gameOver,
  playerGameOver,
  penaltyApplied,
  gameWinner,
  gameRestarted
} from '../features/gameSlice';

// Socket instance
let socket = null;
let store = null;
let isConnectionInProgress = false;
// Variable pour suivre si le processus de connexion est en cours
// pour éviter les connexions multiples simultanées
let reconnectionTimer = null;

// Variables pour stocker l'identifiant de l'utilisateur connecté
let currentUserId = null;

// List of game-specific and user-specific events handled by setupGameEvents
const gameAndUserEventNames = [
  'game:list_updated', 'game:player_joined', 'game:player_left',
  'game:state_updated', 'game:player_updated', 'game:penalty_applied',
  'game:started', 'game:over', 'game:winner', 'game:player_gameover',
  'user:joined', 'user:left', 'game:restarted'
];

// Exported for testing purposes to reset internal state
export const resetSocketState = () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
  socket = null;
  store = null;
  isConnectionInProgress = false;
  reconnectionTimer = null;
  currentUserId = null;
  // If io.mockClear is available (from Vitest auto-mock or manual mock setup), uncomment:
  // if (io && io.mockClear) io.mockClear();
};

// Initialiser la connexion Socket
export const connect = (reduxStore) => {
  store = reduxStore;

  // Si une connexion est déjà établie, on l'utilise
  if (socket && socket.connected) {
    return;
  }

  // Si une connexion est en cours, on ne fait rien
  if (isConnectionInProgress) {
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
    } catch (error) {
      console.error('Erreur lors du nettoyage du socket:', error);
    }
  }
};

// Configurer les événements spécifiques au jeu
const setupGameEvents = () => {
  if (!socket) return;

  // Supprimer les écouteurs existants UNIQUEMENT pour les événements gérés ici
  gameAndUserEventNames.forEach(eventName => {
    socket.off(eventName);
  });

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
      newHost: data.newHost
    }));
  });

  // Mise à jour complète de l'état du jeu (après qu'un joueur soit parti par exemple)
  socket.on('game:state_updated', (gameState) => {
    store.dispatch(updateGameState(gameState));
  });

  // Mise à jour de l'état d'un joueur (pièce, grille, etc.)
  socket.on('game:player_updated', (data) => {
    store.dispatch(updateGameState(data));
  });

  // Des pénalités ont été appliquées
  socket.on('game:penalty_applied', (data) => {
    store.dispatch(penaltyApplied(data));
  });

  // La partie a démarré
  socket.on('game:started', (data) => {
    store.dispatch(gameStarted(data));
  });

  // La partie est terminée (défaite)
  socket.on('game:over', (data) => {
    console.log('****************** Received game:over event:', data);
    store.dispatch(gameOver({
      ...data,
      isWinner: false
    }));
  });

  // La partie est gagnée
  socket.on('game:winner', (data) => {
    console.log('****************** Received game:winner event:', data);
    store.dispatch(gameWinner({
      ...data,
      isWinner: true
    }));
  });

  // Un joueur spécifique a perdu (game over individuel)
  socket.on('game:player_gameover', (data) => {
    console.log('****************** Received game:player_gameover event:', data);
    store.dispatch(playerGameOver(data));
  });

  // Un utilisateur s'est connecté
  socket.on('user:joined', () => {
  });

  // Un utilisateur s'est déconnecté
  socket.on('user:left', () => {
  });

  socket.on('game:restarted', (data) => {
    console.log('Partie redémarrée:', data);
    store.dispatch(gameRestarted({
      gameId: data.gameId,
      roomName: data.roomName,
      host: data.host,
      restartedAt: data.restartedAt,
      gameState: data.gameState
    }));
  });
};

// Fonction pour s'assurer que la connexion est active
export const ensureConnection = () => {
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

// Fonction de connexion de l'utilisateur
export const login = async (username) => {
  try {
    await ensureConnection();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Le serveur ne répond pas à la demande de connexion'));
      }, 5000);

      socket.emit('user:login', username, (response) => {
        clearTimeout(timeout);

        if (response && response.success) {
          socket.auth = true;
          // Stocker l'ID de l'utilisateur pour un accès ultérieur
          currentUserId = response.user.id;

          // Mise à jour du state Redux
          store.dispatch(loginSuccess(response.user));

          setupGameEvents();

          resolve(response);
        } else {
          console.error("Échec de la connexion:", response?.error || "Erreur inconnue");
          reject({
            success: false,
            error: response?.error || "Échec de la connexion pour une raison inconnue"
          });
        }
      });
    });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    store.dispatch(loginFailure(error.message || "Impossible de se connecter au serveur"));
    return Promise.reject(error);
  }
};

// Récupérer la liste des parties disponibles
export const getGames = async () => {
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
          reject({ success: false, error: response?.error || 'Erreur de récupération des parties' });
        }
      });
    });
  } catch (error) {
    store.dispatch(fetchGamesFailure(error.message || 'Erreur de connexion'));
    return Promise.reject(error);
  }
};

// Créer une nouvelle partie
export const createGame = async (roomName, fallSpeedSetting) => {
  try {
    await ensureConnection();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Délai de création de partie dépassé'));
      }, 5000);

      socket.emit('game:create', { roomName, fallSpeedSetting }, (response) => {
        clearTimeout(timeout);

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
export const joinGame = async (gameId) => {
  try {
    await ensureConnection();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Délai pour rejoindre la partie dépassé'));
      }, 5000);

      socket.emit('game:join', gameId, (response) => {
        clearTimeout(timeout);

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

// Quitter la partie actuelle
export const leaveGame = async () => {
  try {
    await ensureConnection();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve({ success: true, warning: 'Le serveur n\'a pas répondu mais la partie a été quittée localement' });
      }, 3000);

      socket.emit('game:leave', (response) => {
        clearTimeout(timeout);

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

// Démarrer la partie (pour l'hôte)
export const startGame = async () => {
  try {
    await ensureConnection();

    // Vérifier que le socket est bien connecté
    if (!socket || !socket.connected) {
      console.error("Impossible de démarrer la partie: socket non connecté");
      return Promise.reject({
        success: false,
        error: "Connexion au serveur perdue. Veuillez rafraîchir la page."
      });
    }

    // Vérifier que l'utilisateur est bien authentifié
    if (!socket.auth) {
      console.error("Impossible de démarrer la partie: utilisateur non authentifié");
      return Promise.reject({
        success: false,
        error: "Vous n'êtes pas authentifié. Veuillez vous reconnecter."
      });
    }

    // Nombre maximum de tentatives
    const maxRetries = 2;
    let retryCount = 0;

    const attemptStartGame = () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (retryCount < maxRetries) {
            retryCount++;
            clearTimeout(timeout);
            resolve(attemptStartGame()); // Réessayer
          } else {
            reject(new Error('Le serveur ne répond pas après plusieurs tentatives. Veuillez réessayer plus tard.'));
          }
        }, 3000); // Timeout plus court pour chaque tentative

        socket.emit('game:start', (response) => {
          clearTimeout(timeout);

          if (response && response.success) {
            resolve({ success: true });
          } else {
            // Si le serveur répond avec une erreur, ne pas réessayer
            reject({
              success: false,
              error: response?.error || "Erreur inconnue lors du démarrage"
            });
          }
        });
      });
    };

    return attemptStartGame();
  } catch (error) {
    console.error("Erreur critique lors du démarrage du jeu:", error);
    return Promise.reject({
      success: false,
      error: error.message || 'Problème de connexion au serveur'
    });
  }
};

// Envoyer un mouvement au serveur
export const movePiece = async (direction) => {
  try {
    await ensureConnection();

    if (!socket.auth) {
      console.error("Le joueur n'est pas connecté");
      return { success: false, error: "Vous devez être connecté" };
    }

    return new Promise((resolve) => {
      socket.emit('game:move', direction, (response) => {
        if (response && response.success) {
          resolve({ success: true, result: response.result });
        } else {
          // Ne pas polluer la console d'erreurs si c'est juste la fin de partie.
          if (response?.error && !response.error.includes('Partie non active')) {
            console.error('Erreur lors du déplacement:', response.error);
          }
          resolve({ success: false, error: response?.error || 'Erreur inconnue' });
        }
      });
    });
  } catch (error) {
    console.error('Exception lors du déplacement:', error);
    return Promise.resolve({ success: false, error: error.message || 'Erreur de connexion' });
  }
};

// Se déconnecter du serveur Socket.io
export const disconnect = () => {
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

// Fonction pour tester la connexion
export const testConnection = () => {
  if (!socket || !socket.connected) return;

  // Ajouter un timeout pour éviter de bloquer si le serveur ne répond pas
  const pingTimeout = setTimeout(() => {
    console.error('Pas de réponse du serveur au ping (timeout)');
  }, 3000);

  socket.emit('ping', Date.now(), (response) => {
    clearTimeout(pingTimeout);
    if (!response) {
      console.error('Pas de réponse du serveur au ping');
    }
  });
};

// Planifier une tentative de reconnexion
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

export const restartGame = async () => {
  try {
    await ensureConnection();

    // Vérifier que le socket est bien connecté
    if (!socket || !socket.connected) {
      console.error("Impossible de redémarrer la partie: socket non connecté");
      return Promise.reject({
        success: false,
        error: "Connexion au serveur perdue. Veuillez rafraîchir la page."
      });
    }

    // Vérifier que l'utilisateur est bien authentifié
    if (!socket.auth) {
      console.error("Impossible de redémarrer la partie: utilisateur non authentifié");
      return Promise.reject({
        success: false,
        error: "Vous n'êtes pas authentifié. Veuillez vous reconnecter."
      });
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Le serveur ne répond pas à la demande de redémarrage'));
      }, 5000);

      socket.emit('game:restart', (response) => {
        clearTimeout(timeout);

        if (response && response.success) {
          resolve({ success: true });
        } else {
          reject({
            success: false,
            error: response?.error || "Erreur inconnue lors du redémarrage"
          });
        }
      });
    });
  } catch (error) {
    console.error("Erreur critique lors du redémarrage du jeu:", error);
    return Promise.reject({
      success: false,
      error: error.message || 'Problème de connexion au serveur'
    });
  }
};

// Getters pour l'état de l'authentification et de la connexion
export const socketService = {
  connect,
  login,
  getGames,
  createGame,
  joinGame,
  leaveGame,
  startGame,
  movePiece,
  restartGame,
  disconnect,
  testConnection,
  scheduleReconnection,
  getUserId: () => currentUserId,
  get isAuth() {
    return !!(socket && socket.auth);
  },
  get isConnected() {
    return !!(socket && socket.connected);
  }
};
