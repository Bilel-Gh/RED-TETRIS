import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  gameList: [],
  currentGame: null,
  gameState: null, // État actuel du jeu (pièces, grille, etc.)
  players: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null
};

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    fetchGamesStart: (state) => {
      state.status = 'loading';
    },
    fetchGamesSuccess: (state, action) => {
      state.status = 'succeeded';
      state.gameList = action.payload;
      state.error = null; // Clear previous errors
    },
    fetchGamesFailure: (state, action) => {
      state.status = 'failed';
      state.error = action.payload;
    },
    createGameStart: (state) => {
      state.status = 'loading';
    },
    createGameSuccess: (state, action) => {
      state.status = 'succeeded';
      state.currentGame = action.payload;
      state.players = action.payload.players || [];

      // Initialiser correctement l'état du jeu lors de la création
      state.gameState = {
        isActive: false,
        startedAt: null,
        isWinner: false,
        winner: null,
        playerStates: {}
      };

      // Initialiser l'état pour chaque joueur
      if (action.payload.players) {
        action.payload.players.forEach(player => {
          if (player && player.id) {
            state.gameState.playerStates[player.id] = {
              ...player,
              isWinner: false,
              gameOver: false
            };
          }
        });
      }
    },
    createGameFailure: (state, action) => {
      state.status = 'failed';
      state.error = action.payload;
    },
    joinGameStart: (state) => {
      state.status = 'loading';
    },
    joinGameSuccess: (state, action) => {
      state.status = 'succeeded';
      state.currentGame = action.payload.game;
      state.players = action.payload.players;
    },
    joinGameFailure: (state, action) => {
      state.status = 'failed';
      state.error = action.payload;
    },
    leaveGame: (state) => {
      state.currentGame = null;
      state.players = [];
      state.gameState = null;
    },
    updateGameState: (state, action) => {
      // Si on reçoit des données sur un joueur spécifique
      if (action.payload.player) {
        const playerId = action.payload.player.id;

        // Initialiser l'état du jeu s'il n'existe pas
        if (!state.gameState) {
          state.gameState = {
            isActive: true,
            playerStates: {}
          };
        }

        // Initialiser ou mettre à jour les états des joueurs
        if (!state.gameState.playerStates) {
          state.gameState.playerStates = {};
        }

        // Mettre à jour l'état du joueur spécifique
        state.gameState.playerStates[playerId] = action.payload.player;

        // Si c'est le joueur courant, mettre à jour également les propriétés principales
        if (action.payload.player.isCurrentPlayer) {
          // Mise à jour directe de l'état principal du jeu actif
          Object.assign(state.gameState, {
            grid: action.payload.player.grid || state.gameState.grid,
            currentPiece: action.payload.player.currentPiece,
            nextPiece: action.payload.player.nextPiece,
            score: action.payload.player.score,
            level: action.payload.player.level,
            lines: action.payload.player.lines
          });
        }
      } else {
        // Mise à jour directe de l'état complet du jeu
        state.gameState = action.payload;
      }
    },
    updatePlayers: (state, action) => {
      state.players = action.payload;
    },
    playerJoined: (state, action) => {
      if (!state.players.some(p => p.id === action.payload.id)) {
        state.players.push(action.payload);
      }
    },
    playerLeft: (state, action) => {
      state.players = state.players.filter(p => p.id !== action.payload.id);

      // Supprimer l'état du joueur de playerStates
      if (state.gameState && state.gameState.playerStates && action.payload.id) {
        delete state.gameState.playerStates[action.payload.id];
      }

      // Vérifier si il reste des joueurs dans la partie et si la partie avait commencé
      if (state.players.length === 1 && state.gameState && state.gameState.playerStates[state.players[0].id]) {
        // Déclarer le joueur restant comme gagnant seulement si la partie avait effectivement commencé
        if (state.gameState.startedAt) {
          state.gameState.playerStates[state.players[0].id].isWinner = true;
          state.gameState.playerStates[state.players[0].id].gameOver = false; // Un gagnant n'est pas game over
          state.gameState.isActive = false;
          state.gameState.endedAt = Date.now();
          state.gameState.winner = state.players[0].id;
          // state.gameState.isWinner = true; // This global flag might be redundant
        }
      }

      if (action.payload.newHost && state.currentGame) {
        state.currentGame.host = action.payload.newHost;
      }
    },
    gameOver: (state, action) => {
      // Mettre à jour les informations de fin de jeu
      if (state.gameState) {
        state.gameState.isActive = false;
        state.gameState.endedAt = action.payload.endedAt;
        state.gameState.isWinner = false;
        state.gameState.winner = action.payload.winner;

        // Stocker les joueurs pour des calculs ultérieurs
        const allPlayers = [];

        // Mettre à jour les états individuels des joueurs
        if (action.payload.players) {
          action.payload.players.forEach(player => {
            if (state.gameState.playerStates && player.id) {
              // Déterminer si ce joueur est le gagnant
              const isWinner = player.id === action.payload.winner;

              // Mettre à jour l'état du joueur
              state.gameState.playerStates[player.id] = {
                ...state.gameState.playerStates[player.id],
                ...player,
                gameOver: !isWinner, // Les perdants sont en game over
                isWinner: isWinner   // Définir explicitement si c'est un gagnant
              };

              allPlayers.push({
                id: player.id,
                isWinner,
                gameOver: !isWinner
              });
            }
          });
        }
      }
    },
    gameWinner: (state, action) => {
      // Mettre à jour les informations de fin de jeu en cas de victoire
      if (state.gameState) {
        state.gameState.isActive = false;
        state.gameState.endedAt = action.payload.endedAt;
        state.gameState.isWinner = true;

        // Stocker les joueurs pour des calculs ultérieurs
        const allPlayers = [];

        // Mettre à jour les états individuels des joueurs
        if (action.payload.players) {
          action.payload.players.forEach(player => {
            if (state.gameState.playerStates && player.id) {
              // Déterminer le statut du joueur basé sur isWinner
              const isPlayerWinner = player.isWinner === true;

              state.gameState.playerStates[player.id] = {
                ...state.gameState.playerStates[player.id],
                ...player,
                gameOver: !isPlayerWinner,  // Seul le gagnant n'est pas en game over
                isWinner: isPlayerWinner    // Conserver la propriété isWinner
              };

              allPlayers.push({
                id: player.id,
                isWinner: isPlayerWinner,
                gameOver: !isPlayerWinner
              });
            }
          });
        }
      }
    },
    penaltyApplied: (state, action) => {
      // Informations sur la pénalité
      const { fromPlayer, linesCleared, penaltyLines } = action.payload;

      // Si on reçoit une pénalité, on affiche une notification visuelle temporaire
      if (state.gameState) {
        state.gameState.lastPenalty = {
          fromPlayer,
          linesCleared,
          penaltyLines,
          timestamp: Date.now()
        };
      }
    },
    playerGameOver: (state, action) => {
      // Mettre à jour l'état du joueur qui a perdu
      if (state.gameState && state.gameState.playerStates && action.payload.player) {
        const playerId = action.payload.player.id;

        // Mettre à jour l'état du joueur spécifique en game over
        state.gameState.playerStates[playerId] = {
          ...state.gameState.playerStates[playerId],
          ...action.payload.player, // Contient l'état final du joueur fourni par la logique de jeu
          gameOver: true,
          isWinner: false  // Un joueur en game over n'est jamais un gagnant
        };

        // Recalculer les joueurs actifs (ceux qui ne sont pas game over)
        const activePlayersList = Object.values(state.gameState.playerStates)
          .filter(pState => pState && !pState.gameOver);

        if (activePlayersList.length === 1) {
          // Exactement un joueur reste actif : il est le gagnant, la partie se termine.
          const winner = activePlayersList[0];
          if (winner && state.gameState.playerStates[winner.id]) { // S'assurer que l'état du gagnant existe
            state.gameState.playerStates[winner.id].isWinner = true;
            state.gameState.playerStates[winner.id].gameOver = false; // Le gagnant n'est pas en game over
            state.gameState.winner = winner.id;
          }
          state.gameState.isActive = false; // La partie est maintenant inactive
          state.gameState.endedAt = Date.now();
        } else if (activePlayersList.length === 0) {
          // Aucun joueur ne reste actif : la partie se termine.
          state.gameState.isActive = false;
          state.gameState.endedAt = Date.now();
          state.gameState.winner = null; // Pas de gagnant si tous sont en game over
        }
        // Si activePlayersList.length > 1, la partie continue (isActive reste true, sauf si déjà false)
      }
    },
    gameStarted: (state, action) => {
      const actualStartedAt = action.payload.startedAt || Date.now();

      state.currentGame = {
        ...state.currentGame,
        isActive: true,
        startedAt: actualStartedAt
      };

      // Initialiser l'état du jeu si des données sont fournies ou créer un état par défaut
      if (action.payload.initialState) {
        state.gameState = {
          ...action.payload.initialState, // Spread initial state first
          isActive: true,
          startedAt: action.payload.initialState.startedAt || actualStartedAt,
          isWinner: false, // Explicitly reset
          winner: null     // Explicitly reset
        };
      } else {
        // Initialiser un état de jeu par défaut si nécessaire
        state.gameState = {
          isActive: true,
          grid: Array(20).fill().map(() => Array(10).fill("0")), // Default grid
          score: 0,
          level: 0,
          lines: 0,
          playerStates: {}, // Initialiser playerStates
          isSoloGame: true, // Sera ajusté ci-dessous si possible
          startedAt: actualStartedAt,
          isWinner: false,
          winner: null
        };
      }

      // S'assurer que playerStates existe
      if (!state.gameState.playerStates) {
        state.gameState.playerStates = {};
      }

      // Initialiser les états des joueurs s'ils sont fournis dans initialState.players
      // et s'assurer que leur statut gameOver/isWinner est réinitialisé.
      if (action.payload.initialState && action.payload.initialState.players) {
        action.payload.initialState.players.forEach(player => {
          if (player && player.id) {
            state.gameState.playerStates[player.id] = {
              ...(state.gameState.playerStates[player.id] || {}), // Conserve l'état existant si fusion
              ...player, // Applique les nouvelles données du joueur
              isWinner: false,
              gameOver: false // Réinitialiser gameOver au démarrage
            };
          }
        });
      } else {
        // Si pas de initialState.players, s'assurer que les playerStates existants sont réinitialisés
         Object.keys(state.gameState.playerStates).forEach(playerId => {
          if (state.gameState.playerStates[playerId]) {
            state.gameState.playerStates[playerId].isWinner = false;
            state.gameState.playerStates[playerId].gameOver = false;
          }
        });
      }

      // Déterminer isSoloGame basé sur le nombre de joueurs dans playerStates
      // Cela doit se faire après que playerStates soit peuplé.
      const numPlayers = Object.keys(state.gameState.playerStates).length;
      state.gameState.isSoloGame = numPlayers <= 1;


      // Marquer le jeu comme actif (déjà fait mais pour être sûr)
      state.gameState.isActive = true;
    },
    // Actions pour le mouvement des pièces
    movePieceLeft: () => {
      // Cette action sera interceptée par un middleware qui enverra une requête au serveur
    },
    movePieceRight: () => {
      // Cette action sera interceptée par un middleware qui enverra une requête au serveur
    },
    movePieceDown: () => {
      // Cette action sera interceptée par un middleware qui enverra une requête au serveur
    },
    rotatePiece: () => {
      // Cette action sera interceptée par un middleware qui enverra une requête au serveur
    },
    dropPiece: () => {
      // Cette action sera interceptée par un middleware qui enverra une requête au serveur
    },
    autoDropPiece: () => {
      // Cette action sera interceptée par un middleware qui enverra une requête au serveur
    },
    // Réinitialiser l'état du jeu
    resetGame: (state) => {
      // Sauvegarder temporairement les résultats de la partie terminée pour utilisation potentielle dans GameOverPage
      if (state.gameState && !state.gameState.isActive) {
        state.gameResults = {
          endedAt: state.gameState.endedAt,
          players: Object.values(state.gameState.playerStates || {}).map(player => ({
            id: player.id,
            username: player.username,
            score: player.score || 0,
            level: player.level || 1,
            lines: player.lines || 0,
            gameOver: true
          }))
        };
      }

      // Réinitialiser l'état complet du jeu
      state.currentGame = null;
      state.gameState = null;
      state.players = [];
      state.status = 'idle';
      state.error = null;
    }
  }
});

export const {
  fetchGamesStart,
  fetchGamesSuccess,
  fetchGamesFailure,
  createGameStart,
  createGameSuccess,
  createGameFailure,
  joinGameStart,
  joinGameSuccess,
  joinGameFailure,
  leaveGame,
  updateGameState,
  updatePlayers,
  playerJoined,
  playerLeft,
  gameOver,
  playerGameOver,
  penaltyApplied,
  gameWinner,
  gameStarted,
  movePieceLeft,
  movePieceRight,
  movePieceDown,
  rotatePiece,
  dropPiece,
  autoDropPiece,
  resetGame
} = gameSlice.actions;

export default gameSlice.reducer;
