import { describe, it, expect } from 'vitest';
import gameReducer, {
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
  gameWinner,
  penaltyApplied,
  playerGameOver,
  gameStarted,
  startGame,
  restartGame,
  leaveGame,
  movePieceLeft,
  movePieceRight,
  movePieceDown,
  rotatePiece,
  dropPiece,
  autoDropPiece,
  getGames,
  createGame,
  joinGame,
} from './gameSlice';

// This is the canonical initial state for this slice, as defined in gameSlice.js
const baseInitialState = Object.freeze({
  gameList: [],
  currentGame: null,
  gameState: null,
  players: [],
  status: 'idle',
  error: null,
});

describe('gameSlice', () => {
  describe('reducer', () => {
    it('should return the initial state when state is undefined', () => {
      expect(gameReducer(undefined, { type: 'unknown' })).toEqual(baseInitialState);
    });

    describe('fetchGamesSuccess', () => {
      it('should handle fetchGamesSuccess', () => {
        const games = [{ id: '1', name: 'Game 1' }];
        const previousState = { ...baseInitialState, status: 'loading' };
        const expectedState = { ...baseInitialState, status: 'succeeded', gameList: games, error: null };
        expect(gameReducer(previousState, fetchGamesSuccess(games))).toEqual(expectedState);
      });
    });

    describe('fetchGamesFailure', () => {
      it('should handle fetchGamesFailure', () => {
        const error = 'Failed to fetch games';
        const previousState = { ...baseInitialState, status: 'loading' };
        const expectedState = { ...baseInitialState, status: 'failed', error };
        expect(gameReducer(previousState, fetchGamesFailure(error))).toEqual(expectedState);
      });
    });

    describe('createGameSuccess', () => {
      it('should handle createGameSuccess', () => {
        const game = { id: '1', name: 'Game 1', players: [{ id: 'player1', name: 'Player 1' }] };
        const previousState = { ...baseInitialState, status: 'loading' };
        const expectedState = {
          ...baseInitialState,
          status: 'succeeded',
          currentGame: game,
          players: game.players,
          gameState: {
            isActive: false,
            startedAt: null,
            isWinner: false,
            winner: null,
            playerStates: {
              'player1': { id: 'player1', name: 'Player 1', isWinner: false, gameOver: false }
            }
          }
        };
        expect(gameReducer(previousState, createGameSuccess(game))).toEqual(expectedState);
      });

      it('should handle createGameSuccess with no players', () => {
        const game = { id: '1', name: 'Game 1' };
        const previousState = { ...baseInitialState, status: 'loading' };
        const result = gameReducer(previousState, createGameSuccess(game));
        expect(result.currentGame).toEqual(game);
        expect(result.players).toEqual([]);
      });
    });

    describe('createGameFailure', () => {
      it('should handle createGameFailure', () => {
        const error = 'Failed to create game';
        const previousState = { ...baseInitialState, status: 'loading' };
        const expectedState = { ...baseInitialState, status: 'failed', error };
        expect(gameReducer(previousState, createGameFailure(error))).toEqual(expectedState);
      });
    });

    describe('joinGameSuccess', () => {
      it('should handle joinGameSuccess', () => {
        const game = { id: '1', name: 'Game 1' };
        const players = [{ id: 'player1', name: 'Player 1' }];
        const previousState = { ...baseInitialState, status: 'loading' };
        const expectedState = { ...baseInitialState, status: 'succeeded', currentGame: game, players };
        expect(gameReducer(previousState, joinGameSuccess({ game, players }))).toEqual(expectedState);
      });
    });

    describe('joinGameFailure', () => {
      it('should handle joinGameFailure', () => {
        const error = 'Failed to join game';
        const previousState = { ...baseInitialState, status: 'loading' };
        const expectedState = { ...baseInitialState, status: 'failed', error };
        expect(gameReducer(previousState, joinGameFailure(error))).toEqual(expectedState);
      });
    });

    describe('updateGameState', () => {
      it('should handle updateGameState with player data', () => {
        const player = {
          id: 'player1',
          grid: [[1, 0], [0, 1]],
          currentPiece: { type: 'T' },
          nextPiece: { type: 'I' },
          score: 100,
          level: 2,
          lines: 5,
          isCurrentPlayer: true
        };
        const previousState = { ...baseInitialState };
        const result = gameReducer(previousState, updateGameState({ player }));

        expect(result.gameState.isActive).toBe(true);
        expect(result.gameState.playerStates.player1).toEqual(player);
        expect(result.gameState.grid).toEqual(player.grid);
        expect(result.gameState.currentPiece).toEqual(player.currentPiece);
        expect(result.gameState.score).toBe(player.score);
      });

      it('should handle updateGameState with global game data', () => {
        const gameState = {
          isActive: true,
          grid: [[1, 1], [0, 0]],
          score: 200
        };
        const previousState = { ...baseInitialState, currentGame: { id: '1', isActive: false } };
        const result = gameReducer(previousState, updateGameState(gameState));

        expect(result.gameState).toEqual(gameState);
        expect(result.currentGame.isActive).toBe(true);
      });

      it('should handle updateGameState with host change', () => {
        const gameState = {
          isActive: true,
          host: 'newHost'
        };
        const previousState = { ...baseInitialState, currentGame: { id: '1', host: 'oldHost' } };
        const result = gameReducer(previousState, updateGameState(gameState));

        expect(result.currentGame.host).toBe('newHost');
      });
    });

    describe('updatePlayers', () => {
      it('should handle updatePlayers', () => {
        const players = [{ id: 'player1', name: 'Player 1' }, { id: 'player2', name: 'Player 2' }];
        const previousState = { ...baseInitialState };
        const expectedState = { ...baseInitialState, players };
        expect(gameReducer(previousState, updatePlayers(players))).toEqual(expectedState);
      });
    });

    describe('playerJoined', () => {
      it('should add a player to the list if not already present', () => {
        const player = { id: '1', name: 'Player 1' };
        const previousState = { ...baseInitialState };
        const expectedState = { ...baseInitialState, players: [player] };
        expect(gameReducer(previousState, playerJoined(player))).toEqual(expectedState);
      });

      it('should not add duplicate players', () => {
        const player = { id: '1', name: 'Player 1' };
        const previousState = { ...baseInitialState, players: [player] };
        const result = gameReducer(previousState, playerJoined(player));
        expect(result.players).toHaveLength(1);
      });
    });

    describe('playerLeft', () => {
      it('should remove a player from the list', () => {
        const player1 = { id: '1', name: 'Player 1' };
        const player2 = { id: '2', name: 'Player 2' };
        const previousState = {
          ...baseInitialState,
          players: [player1, player2],
          gameState: {
            playerStates: {
              '1': { id: '1', gameOver: false },
              '2': { id: '2', gameOver: false }
            }
          }
        };
        const result = gameReducer(previousState, playerLeft({ id: '1' }));
        expect(result.players).toEqual([player2]);
        expect(result.gameState.playerStates['1']).toBeUndefined();
      });

      it('should declare winner when only one player remains in started game', () => {
        const player1 = { id: '1', name: 'Player 1' };
        const player2 = { id: '2', name: 'Player 2' };
        const previousState = {
          ...baseInitialState,
          players: [player1, player2],
          gameState: {
            startedAt: Date.now(),
            playerStates: {
              '1': { id: '1', gameOver: false },
              '2': { id: '2', gameOver: false }
            }
          }
        };
        const result = gameReducer(previousState, playerLeft({ id: '2' }));
        expect(result.gameState.playerStates['1'].isWinner).toBe(true);
        expect(result.gameState.isActive).toBe(false);
        expect(result.gameState.winner).toBe('1');
      });

      it('should update host when player with newHost leaves', () => {
        const previousState = {
          ...baseInitialState,
          currentGame: { id: '1', host: 'oldHost' }
        };
        const result = gameReducer(previousState, playerLeft({ id: '1', newHost: 'newHost' }));
        expect(result.currentGame.host).toBe('newHost');
      });
    });

    describe('gameOver', () => {
      it('should handle gameOver action', () => {
        const endedAt = Date.now();
        const winner = 'player1';
        const players = [
          { id: 'player1', score: 100 },
          { id: 'player2', score: 50 }
        ];
        const previousState = {
          ...baseInitialState,
          currentGame: { id: '1', isActive: true, host: 'oldHost' },
          gameState: {
            isActive: true,
            playerStates: {
              'player1': { id: 'player1', gameOver: false },
              'player2': { id: 'player2', gameOver: false }
            }
          }
        };

        const result = gameReducer(previousState, gameOver({
          endedAt,
          winner,
          players,
          host: 'newHost'
        }));

        expect(result.gameState.isActive).toBe(false);
        expect(result.gameState.endedAt).toBe(endedAt);
        expect(result.gameState.winner).toBe(winner);
        expect(result.gameState.isWinner).toBe(false);
        expect(result.currentGame.isActive).toBe(false);
        expect(result.currentGame.host).toBe('newHost');
        expect(result.gameState.playerStates['player1'].isWinner).toBe(true);
        expect(result.gameState.playerStates['player1'].gameOver).toBe(false);
        expect(result.gameState.playerStates['player2'].isWinner).toBe(false);
        expect(result.gameState.playerStates['player2'].gameOver).toBe(true);
      });
    });

    describe('gameWinner', () => {
      it('should handle gameWinner action', () => {
        const endedAt = Date.now();
        const winner = 'player1';
        const previousState = {
          ...baseInitialState,
          gameState: {
            isActive: true,
            playerStates: {
              'player1': { id: 'player1', gameOver: false }
            }
          }
        };

        const result = gameReducer(previousState, gameWinner({
          endedAt,
          winner
        }));

        expect(result.gameState.isActive).toBe(false);
        expect(result.gameState.endedAt).toBe(endedAt);
        expect(result.gameState.isWinner).toBe(true);
      });
    });

    describe('penaltyApplied', () => {
      it('should handle penaltyApplied action', () => {
        const penaltyData = {
          targetPlayerId: 'player1',
          linesCount: 2,
          fromPlayerId: 'player2'
        };
        const previousState = { ...baseInitialState };
        const result = gameReducer(previousState, penaltyApplied(penaltyData));
        // This action doesn't change state in current implementation
        expect(result).toEqual(previousState);
      });
    });

    describe('playerGameOver', () => {
      it('should handle playerGameOver action', () => {
        const playerData = {
          player: {
            id: 'player1',
            gameOver: true
          }
        };
        const previousState = {
          ...baseInitialState,
          gameState: {
            isActive: true,
            playerStates: {
              'player1': { id: 'player1', gameOver: false }
            }
          }
        };

        const result = gameReducer(previousState, playerGameOver(playerData));
        expect(result.gameState.playerStates['player1'].gameOver).toBe(true);
      });
    });

    describe('gameStarted', () => {
      it('should handle gameStarted with initialState', () => {
        const initialState = {
          isActive: true,
          grid: [],
          players: [{ id: 'player1' }],
          isSoloGame: true
        };
        const previousState = { ...baseInitialState };
        const result = gameReducer(previousState, gameStarted({ initialState }));

        expect(result.gameState.isActive).toBe(true);
        expect(result.gameState.playerStates['player1']).toBeDefined();
        expect(result.gameState.playerStates['player1'].isWinner).toBe(false);
        expect(result.gameState.playerStates['player1'].gameOver).toBe(false);
      });
    });

    describe('async actions', () => {
      it('should handle startGame action', () => {
        const previousState = { ...baseInitialState };
        const result = gameReducer(previousState, startGame());
        expect(result.status).toBe('loading');
      });

      it('should handle restartGame action', () => {
        const previousState = { ...baseInitialState, error: 'Some error' };
        const result = gameReducer(previousState, restartGame());
        expect(result.status).toBe('loading');
        expect(result.error).toBe(null);
      });

      it('should handle leaveGame action', () => {
        const previousState = {
          ...baseInitialState,
          currentGame: { id: '1' },
          players: [{ id: 'player1' }],
          gameState: { isActive: true },
          status: 'succeeded'
        };
        const result = gameReducer(previousState, leaveGame());
        expect(result.currentGame).toBe(null);
        expect(result.players).toEqual([]);
        expect(result.gameState).toBe(null);
        expect(result.status).toBe('idle');
      });
    });

    describe('movement actions', () => {
      it('should handle movement actions without changing state', () => {
        const previousState = { ...baseInitialState };

        expect(gameReducer(previousState, movePieceLeft())).toEqual(previousState);
        expect(gameReducer(previousState, movePieceRight())).toEqual(previousState);
        expect(gameReducer(previousState, movePieceDown())).toEqual(previousState);
        expect(gameReducer(previousState, rotatePiece())).toEqual(previousState);
        expect(gameReducer(previousState, dropPiece())).toEqual(previousState);
        expect(gameReducer(previousState, autoDropPiece())).toEqual(previousState);
      });
    });
  });

  describe('async thunks', () => {
    it('should test thunks exist', () => {
      // Just test that the thunks are defined
      expect(getGames).toBeDefined();
      expect(createGame).toBeDefined();
      expect(joinGame).toBeDefined();
    });
  });
});
