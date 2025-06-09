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
    // Actions interceptées par le middleware pour déclencher des appels socket
    getGames: (state) => {
      state.status = 'loading';
    },
    createGame: (state) => {
      state.status = 'loading';
    },
    joinGame: (state) => {
      state.status = 'loading';
    },
    startGame: (state) => {
      state.status = 'loading';
    },
    restartGame: (state) => {
      state.status = 'loading';
      state.error = null;
    },
    // L'action `leaveGame` est conservée mais le reducer est modifié pour ne plus être qu'une transition d'état client
    leaveGame: (state) => {
      state.currentGame = null;
      state.players = [];
      state.gameState = null;
      state.status = 'idle';
    },
    // Les actions de mouvement n'ont pas besoin de changer l'état ici,
    // car la réponse du serveur via 'game:player_updated' le fera.
    // Le middleware les intercepte sans que le reducer ait à faire quoi que ce soit.
    movePieceLeft: () => {},
    movePieceRight: () => {},
    movePieceDown: () => {},
    rotatePiece: () => {},
    dropPiece: () => {},
    autoDropPiece: () => {},

    // Reducers pour les réponses du serveur (inchangés)
    fetchGamesSuccess: (state, action) => {
      state.status = 'succeeded';
      state.gameList = action.payload;
      state.error = null; // Clear previous errors
    },
    fetchGamesFailure: (state, action) => {
      state.status = 'failed';
      state.error = action.payload;
    },
    createGameSuccess: (state, action) => {
      state.status = 'succeeded';
      state.currentGame = action.payload;
      state.players = action.payload.players || [];
      state.gameState = {
        isActive: false,
        startedAt: null,
        isWinner: false,
        winner: null,
        playerStates: {}
      };
      if (action.payload.players) {
        action.payload.players.forEach(player => {
          if (player && player.id) {
            state.gameState.playerStates[player.id] = { ...player, isWinner: false, gameOver: false };
          }
        });
      }
    },
    createGameFailure: (state, action) => {
      state.status = 'failed';
      state.error = action.payload;
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
        const newGameState = action.payload;

    // Synchroniser isActive avec currentGame
    state.gameState = newGameState;

    if (state.currentGame) {
        if (typeof newGameState.isActive !== 'undefined') {
          state.currentGame.isActive = newGameState.isActive;
        }
        if (newGameState.host && newGameState.host !== state.currentGame.host) {
          state.currentGame.host = newGameState.host;
        }
      }
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

        if (state.currentGame) {
          state.currentGame.isActive = false;
          if (action.payload.host) {
            state.currentGame.host = action.payload.host;
          }
        }

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

        if (state.currentGame) {
          state.currentGame.isActive = false;
          if (action.payload.host) {
            state.currentGame.host = action.payload.host;
          }
        }

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

        // Mettre à jour l'état du joueur spécifique en game over.
        // Ne pas modifier gameState.isActive ou déterminer un gagnant ici.
        // Cela sera géré par des événements serveur (game:over, game:winner) ou des game:state_updated.
        state.gameState.playerStates[playerId] = {
          ...state.gameState.playerStates[playerId],
          ...action.payload.player, // Contient l'état final du joueur
          gameOver: true,
          isWinner: false
        };

        // La logique précédente qui déterminait un gagnant et modifiait gameState.isActive ici est supprimée.
        // Le serveur est responsable de déterminer la fin de la partie et le gagnant.
      }
    },
    gameStarted: (state, action) => {
      state.status = 'succeeded'; // Game has started, so status is succeeded
      state.error = null;

      const actualStartedAt = action.payload.startedAt || Date.now();

      // Update currentGame details
      if (state.currentGame) {
        state.currentGame.isActive = true;
        state.currentGame.startedAt = actualStartedAt;
      } else {
        // This case should ideally not happen if join/create game sets currentGame,
        // but as a fallback:
        state.currentGame = {
          id: action.payload.gameId || null, // or some other identifier if available
          isActive: true,
          startedAt: actualStartedAt,
          // other currentGame fields might be unknown here
        };
      }

      if (action.payload.initialState) {
        state.gameState = {
          ...action.payload.initialState,
          isActive: true,
          startedAt: actualStartedAt,
          isSoloGame: action.payload.initialState.players?.length === 1,
          playerStates: action.payload.initialState.playerStates || {},
        };
        // Ensure playerStates are initialized if only players array was in initialState
        if (action.payload.initialState.players && !action.payload.initialState.playerStates) {
          state.gameState.playerStates = {};
          action.payload.initialState.players.forEach(player => {
            state.gameState.playerStates[player.id] = {
              ...player,
              gameOver: false,
              isWinner: false,
              // other per-player state defaults
            };
          });
        }
      } else {
        // Initialize a default gameState if no initialState is provided
        state.gameState = {
          isActive: true,
          grid: Array(20).fill(null).map(() => Array(10).fill("0")),
          currentPiece: null,     // Ensuring this is present
          nextPiece: null,      // Ensuring this is present
          score: 0,
          level: 0,
          lines: 0,
          playerStates: {},       // Default to empty if no players info
          isSoloGame: true,       // Default assumption if no player info
          startedAt: actualStartedAt,
          endedAt: null,        // Ensuring this is present
          isWinner: false,
          winner: null,
          lastPenalty: null,    // Ensuring this is present
        };
      }
    },
    restartGameSuccess: (state) => {
      state.status = 'succeeded';
      state.error = null;
    },
    restartGameFailure: (state, action) => {
      state.status = 'failed';
      state.error = action.payload;
    },
    gameRestarted: (state, action) => {
      // Réinitialiser l'état du jeu pour le restart
      if (state.currentGame) {
        state.currentGame.isActive = false;
        state.currentGame.startedAt = null;
        state.currentGame.endedAt = null;
      }

      // Réinitialiser l'état du jeu complet
      state.gameState = {
        isActive: false,
        startedAt: null,
        endedAt: null,
        isWinner: false,
        winner: null,
        playerStates: {}
      };

      // Réinitialiser les états des joueurs si fournis
      if (action.payload.gameState && action.payload.gameState.players) {
        action.payload.gameState.players.forEach(player => {
          if (player && player.id) {
            state.gameState.playerStates[player.id] = {
              ...player,
              gameOver: false,
              isWinner: false,
              isPlaying: false
            };
          }
        });
      }

      // Mettre à jour avec le nouvel état du jeu
      if (action.payload.gameState) {
        state.gameState = {
          ...state.gameState,
          ...action.payload.gameState,
          isActive: false,
          playerStates: state.gameState.playerStates // Garder les playerStates qu'on vient de créer
        };
      }

      state.status = 'succeeded';
      state.error = null;
    },
  }
});

export const {
  getGames,
  createGame,
  joinGame,
  startGame,
  restartGame,
  leaveGame,
  fetchGamesSuccess,
  fetchGamesFailure,
  createGameSuccess,
  createGameFailure,
  joinGameSuccess,
  joinGameFailure,
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
  resetGame,
  restartGameSuccess,
  restartGameFailure,
  gameRestarted
} = gameSlice.actions;

export default gameSlice.reducer;
