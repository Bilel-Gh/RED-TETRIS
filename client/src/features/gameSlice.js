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
      // console.log('Mise à jour de l\'état du jeu:', action.payload);

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

          // // Afficher les informations de débogage pour les pièces
          // if (action.payload.player.currentPiece) {
          //   console.log('Pièce courante actualisée:', action.payload.player.currentPiece);
          // }

          // if (action.payload.player.nextPiece) {
          //   console.log('Prochaine pièce actualisée:', action.payload.player.nextPiece);
          // }
        }
      } else {
        // Mise à jour directe de l'état complet du jeu
        state.gameState = action.payload;

        // // Afficher les informations de débogage pour l'état du jeu
        // console.log('État complet du jeu mis à jour:', state.gameState);
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
      console.log('REDUCER: playerLeft reçu', action.payload);
      console.log('state.players :', state.players);
      state.players = state.players.filter(p => p.id !== action.payload.id);
      console.log('state.players après filtrage :', state.players);

      // vérifier si il reste des joueurs dans la partie
      if (state.players.length === 1) {
        console.log('il reste un seul joueur dans la partie, la partie est terminée');
        // mettre ce joueur en winner
        state.gameState.playerStates[state.players[0].id].isWinner = true;
        state.gameState.isActive = false;
        state.gameState.endedAt = Date.now();
        state.gameState.winner = state.players[0].id;
        state.gameState.isWinner = true;
        // console log les joueurs et tout leurs etats
        console.log('state.gameState.playerStates dans playerLeft:', state.gameState.playerStates);
      } else {
        console.log('il reste des joueurs dans la partie, la partie continue');
      }

      if (action.payload.newHost && state.currentGame) {
        state.currentGame.host = action.payload.newHost;
      }
    },
    gameOver: (state, action) => {
      console.log('REDUCER: gameOver reçu', action.payload);

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

        console.log('État des joueurs après gameOver:', allPlayers);
      }
    },
    gameWinner: (state, action) => {
      console.log('REDUCER: gameWinner reçu', action.payload);

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

        console.log('État des joueurs après gameWinner:', allPlayers);
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
      console.log('REDUCER: playerGameOver reçu', action.payload);

      // Mettre à jour l'état du joueur qui a perdu
      if (state.gameState && state.gameState.playerStates && action.payload.player) {
        const playerId = action.payload.player.id;

        // Mettre à jour l'état du joueur spécifique en game over
        state.gameState.playerStates[playerId] = {
          ...state.gameState.playerStates[playerId],
          ...action.payload.player,
          gameOver: true,
          isWinner: false  // Un joueur en game over n'est jamais un gagnant
        };

        console.log(`Joueur ${playerId} a perdu la partie. Mise à jour de l'état.`);

        // Vérifier s'il reste un seul joueur actif (non game over), qui serait le gagnant
        const activePlayers = Object.entries(state.gameState.playerStates)
          .filter(([, playerState]) => !playerState.gameOver);

        console.log('activePlayers dans le reducer playerGameOver:', activePlayers);

        // S'il reste exactement un joueur actif, c'est le gagnant
        if (activePlayers.length === 1) {
          const winnerId = activePlayers[0][0];
          console.log(`Un seul joueur actif: ${winnerId} est le gagnant`);

          // Marquer ce joueur comme gagnant
          state.gameState.playerStates[winnerId].isWinner = true;
          state.gameState.winner = winnerId;
        } else {
          console.log('il reste des joueurs actifs, la partie continue');
        }

        // Vérifier si tous les joueurs sont en game over
        const allPlayersGameOver = Object.values(state.gameState.playerStates)
          .every(player => player.gameOver);

        // Si tous les joueurs sont en game over, marquer la partie comme terminée
        if (allPlayersGameOver) {
          console.log('Tous les joueurs sont en game over, la partie est terminée');
          state.gameState.isActive = false;
          state.gameState.endedAt = Date.now();
        }
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
        // console.log('Initialisation du jeu avec état initial:', action.payload.initialState);
        state.gameState = action.payload.initialState;

        // S'assurer que l'état du jeu contient toutes les propriétés nécessaires
        if (!state.gameState.playerStates) {
          state.gameState.playerStates = {};
        }

        // S'assurer qu'aucun joueur n'est marqué comme gagnant au démarrage
        state.gameState.isWinner = false;
        state.gameState.winner = null;

        // Réinitialiser le statut de gagnant pour chaque joueur
        Object.keys(state.gameState.playerStates).forEach(playerId => {
          if (state.gameState.playerStates[playerId]) {
            state.gameState.playerStates[playerId].isWinner = false;
          }
        });

        // si le joueur est seul, on met à jour l'état du jeu
        if (action.payload.initialState.players.length === 1) {
          state.gameState.isSoloGame = true;
        } else {
          state.gameState.isSoloGame = false;
        }

        // Marquer le jeu comme actif
        state.gameState.isActive = true;
      } else {
        // Initialiser un état de jeu par défaut si nécessaire
        state.gameState = {
          isActive: true,
          grid: Array(20).fill().map(() => Array(10).fill("0")),
          score: 0,
          level: 0,
          lines: 0,
          playerStates: {},
          isSoloGame: true
        };
      }
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
