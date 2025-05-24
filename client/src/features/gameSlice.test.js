import { describe, it, expect, vi } from 'vitest';
import gameReducer, {
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
  resetGame
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

const mockPlayer = (id, overrides = {}) => ({
  id,
  username: `Player ${id}`,
  grid: Array(20).fill(0).map(() => Array(10).fill('0')),
  currentPiece: { shape: 'T', position: { x: 4, y: 0 } },
  nextPiece: { shape: 'L', position: { x: 4, y: 0 } },
  score: 0,
  level: 1,
  lines: 0,
  gameOver: false,
  isWinner: false,
  isCurrentPlayer: false,
  ...overrides
});

const mockGame = (id, players = [], overrides = {}) => ({
  id,
  name: `Game ${id}`,
  players,
  host: players.length > 0 ? players[0].id : null,
  maxPlayers: 4,
  status: 'pending',
  ...overrides
});

describe('gameSlice', () => {
  describe('reducer', () => {
    it('should return the initial state when state is undefined', () => {
      expect(gameReducer(undefined, { type: 'unknown' })).toEqual(baseInitialState);
    });

    // Fetch Games
    describe('fetchGames', () => {
      it('should handle fetchGamesStart', () => {
        const previousState = { ...baseInitialState };
        const expectedState = { ...baseInitialState, status: 'loading' };
        expect(gameReducer(previousState, fetchGamesStart())).toEqual(expectedState);
      });

      it('should handle fetchGamesSuccess', () => {
        const games = [{ id: '1', name: 'Game 1' }];
        const previousState = { ...baseInitialState, status: 'loading', error: 'old error' };
        const expectedState = { ...baseInitialState, status: 'succeeded', gameList: games, error: null };
        expect(gameReducer(previousState, fetchGamesSuccess(games))).toEqual(expectedState);
      });

      it('should handle fetchGamesFailure', () => {
        const error = 'Failed to fetch games';
        const previousState = { ...baseInitialState, status: 'loading' };
        const expectedState = { ...baseInitialState, status: 'failed', error: error };
        expect(gameReducer(previousState, fetchGamesFailure(error))).toEqual(expectedState);
      });
    });

    // Create Game
    describe('createGame', () => {
      it('should handle createGameStart', () => {
        const previousState = { ...baseInitialState };
        const expectedState = { ...baseInitialState, status: 'loading' };
        expect(gameReducer(previousState, createGameStart())).toEqual(expectedState);
      });

      it('should handle createGameSuccess', () => {
        const player1 = { id: 'player1', username: 'HostUser' };
        const gameData = { id: 'game1', name: 'Test Game', players: [player1] };
        const previousState = { ...baseInitialState, status: 'loading' };
        const expectedState = {
          ...baseInitialState,
          status: 'succeeded',
          currentGame: gameData,
          players: [player1],
          gameState: {
            isActive: false,
            startedAt: null,
            isWinner: false,
            winner: null,
            playerStates: {
              [player1.id]: {
                ...player1,
                isWinner: false,
                gameOver: false,
              },
            },
          },
        };
        expect(gameReducer(previousState, createGameSuccess(gameData))).toEqual(expectedState);
      });

      it('should handle createGameSuccess with multiple players', () => {
        const player1 = { id: 'player1', username: 'HostUser' };
        const player2 = { id: 'player2', username: 'GuestUser' };
        const gameData = { id: 'game1', name: 'Test Game', players: [player1, player2] };
        const previousState = { ...baseInitialState, status: 'loading' };
        const expectedState = {
          ...baseInitialState,
          status: 'succeeded',
          currentGame: gameData,
          players: [player1, player2],
          gameState: {
            isActive: false,
            startedAt: null,
            isWinner: false,
            winner: null,
            playerStates: {
              [player1.id]: { ...player1, isWinner: false, gameOver: false },
              [player2.id]: { ...player2, isWinner: false, gameOver: false },
            },
          },
        };
        expect(gameReducer(previousState, createGameSuccess(gameData))).toEqual(expectedState);
      });

      it('should handle createGameFailure', () => {
        const error = 'Failed to create game';
        const previousState = { ...baseInitialState, status: 'loading' };
        const expectedState = { ...baseInitialState, status: 'failed', error: error };
        expect(gameReducer(previousState, createGameFailure(error))).toEqual(expectedState);
      });
    });

    // Join Game
    describe('joinGame', () => {
      it('should handle joinGameStart', () => {
        const previousState = { ...baseInitialState };
        const expectedState = { ...baseInitialState, status: 'loading' };
        expect(gameReducer(previousState, joinGameStart())).toEqual(expectedState);
      });

      it('should handle joinGameSuccess', () => {
        const gameData = { id: 'game1', name: 'Test Game' };
        const playersData = [{ id: 'player1' }];
        const previousState = { ...baseInitialState, status: 'loading' };
        const expectedState = {
          ...baseInitialState,
          status: 'succeeded',
          currentGame: gameData,
          players: playersData,
        };
        expect(gameReducer(previousState, joinGameSuccess({ game: gameData, players: playersData }))).toEqual(expectedState);
      });

      it('should handle joinGameFailure', () => {
        const error = 'Failed to join game';
        const previousState = { ...baseInitialState, status: 'loading' };
        const expectedState = { ...baseInitialState, status: 'failed', error: error };
        expect(gameReducer(previousState, joinGameFailure(error))).toEqual(expectedState);
      });
    });

    // Leave Game
    describe('leaveGame', () => {
      it('should handle leaveGame', () => {
        const previousState = {
          ...baseInitialState,
          currentGame: { id: 'game1', name: 'Test Game' },
          players: [{ id: 'player1' }],
          gameState: { isActive: true },
          status: 'succeeded', // Status from a previous successful operation
        };
        // leaveGame resets currentGame, players, gameState. Other parts of state like gameList, status, error remain.
        const expectedState = {
          ...baseInitialState, // This brings gameList: [], error: null
          status: 'succeeded',   // Status should be preserved from previousState
        };
        expect(gameReducer(previousState, leaveGame())).toEqual(expectedState);
      });
    });
  });
});
