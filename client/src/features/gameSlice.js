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
      console.log('Mise à jour de l\'état du jeu:', action.payload);

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

          // Afficher les informations de débogage pour les pièces
          if (action.payload.player.currentPiece) {
            console.log('Pièce courante actualisée:', action.payload.player.currentPiece);
          }

          if (action.payload.player.nextPiece) {
            console.log('Prochaine pièce actualisée:', action.payload.player.nextPiece);
          }
        }
      } else {
        // Mise à jour directe de l'état complet du jeu
        state.gameState = action.payload;

        // Afficher les informations de débogage pour l'état du jeu
        console.log('État complet du jeu mis à jour:', state.gameState);
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

      if (action.payload.newHost && state.currentGame) {
        state.currentGame.host = action.payload.newHost;
      }
    },
    gameStarted: (state, action) => {
      state.currentGame = {
        ...state.currentGame,
        isActive: true,
        startedAt: action.payload.startedAt
      };

      // Initialiser l'état du jeu si des données sont fournies
      if (action.payload.initialState) {
        console.log('Initialisation du jeu avec état initial:', action.payload.initialState);
        state.gameState = action.payload.initialState;

        // S'assurer que l'état du jeu contient toutes les propriétés nécessaires
        if (!state.gameState.playerStates) {
          state.gameState.playerStates = {};
        }

        // Marquer le jeu comme actif
        state.gameState.isActive = true;
      } else {
        // Initialiser un état de jeu par défaut si nécessaire
        state.gameState = {
          isActive: true,
          grid: Array(20).fill().map(() => Array(10).fill("0")),
          score: 0,
          level: 1,
          lines: 0,
          playerStates: {}
        };
      }
    },
    // Actions pour le mouvement des pièces
    movePieceLeft: (state) => {
      // Cette action sera interceptée par un middleware qui enverra une requête au serveur
    },
    movePieceRight: (state) => {
      // Cette action sera interceptée par un middleware qui enverra une requête au serveur
    },
    movePieceDown: (state) => {
      // Cette action sera interceptée par un middleware qui enverra une requête au serveur
    },
    rotatePiece: (state) => {
      // Cette action sera interceptée par un middleware qui enverra une requête au serveur
    },
    dropPiece: (state) => {
      // Cette action sera interceptée par un middleware qui enverra une requête au serveur
    },
    // Réinitialiser l'état du jeu
    resetGame: (state) => {
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
  gameStarted,
  movePieceLeft,
  movePieceRight,
  movePieceDown,
  rotatePiece,
  dropPiece,
  resetGame
} = gameSlice.actions;

export default gameSlice.reducer;
