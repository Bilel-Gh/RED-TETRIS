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
  resetGame,
  movePieceLeft,
  movePieceRight,
  movePieceDown,
  rotatePiece,
  dropPiece,
  autoDropPiece
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

    // updateGameState
    describe('updateGameState', () => {
      it('should update the entire gameState if no specific player is provided', () => {
        const previousState = { ...baseInitialState };
        const newGameState = {
          isActive: true,
          grid: [['T']],
          currentPiece: { shape: 'I' },
          nextPiece: { shape: 'O' },
          score: 100,
          level: 2,
          lines: 5,
          playerStates: { 'p1': { id: 'p1', score: 100 } }
        };
        const expectedState = { ...baseInitialState, gameState: newGameState };
        expect(gameReducer(previousState, updateGameState(newGameState))).toEqual(expectedState);
      });

      it('should initialize gameState if null when updating a specific player', () => {
        const previousState = { ...baseInitialState, gameState: null };
        const playerData = { id: 'p1', score: 50, isCurrentPlayer: true, grid: [['0']], currentPiece: {shape: 'L'}, nextPiece: {shape: 'J'}, level: 1, lines: 0 };
        const expectedPlayerState = { ...playerData };
        const expectedGameState = {
          isActive: true,
          playerStates: { 'p1': expectedPlayerState },
          grid: [['0']],
          currentPiece: {shape: 'L'},
          nextPiece: {shape: 'J'},
          score: 50,
          level: 1,
          lines: 0,
        };
        const result = gameReducer(previousState, updateGameState({ player: playerData }));
        expect(result.gameState).toEqual(expectedGameState);
      });

      it('should initialize playerStates if null within gameState when updating a specific player', () => {
        const previousState = { ...baseInitialState, gameState: { isActive: true, playerStates: null } };
        const playerData = { id: 'p1', score: 50, isCurrentPlayer: true, grid: [['0']], currentPiece: {shape: 'L'}, nextPiece: {shape: 'J'}, level: 1, lines: 0 };
        const expectedPlayerState = { ...playerData };
        const expectedGameState = {
          isActive: true,
          playerStates: { 'p1': expectedPlayerState },
          grid: [['0']],
          currentPiece: {shape: 'L'},
          nextPiece: {shape: 'J'},
          score: 50,
          level: 1,
          lines: 0,
        };
        const result = gameReducer(previousState, updateGameState({ player: playerData }));
        expect(result.gameState).toEqual(expectedGameState);
      });


      it('should update a specific player and root gameState for currentPlayer', () => {
        const initialPlayerState = { id: 'p1', score: 0, isCurrentPlayer: true, grid: [], currentPiece: {}, nextPiece: {}, level: 0, lines: 0 };
        const previousState = {
          ...baseInitialState,
          gameState: {
            isActive: true,
            playerStates: { 'p1': initialPlayerState },
            grid: [], currentPiece: {}, nextPiece: {}, score: 0, level: 0, lines: 0,
          }
        };
        const updatedPlayerData = {
          id: 'p1',
          grid: [['L']],
          currentPiece: { shape: 'J' },
          nextPiece: { shape: 'S' },
          score: 150,
          level: 3,
          lines: 10,
          isCurrentPlayer: true,
        };
        const expectedState = {
          ...baseInitialState,
          gameState: {
            isActive: true,
            playerStates: { 'p1': updatedPlayerData },
            grid: updatedPlayerData.grid,
            currentPiece: updatedPlayerData.currentPiece,
            nextPiece: updatedPlayerData.nextPiece,
            score: updatedPlayerData.score,
            level: updatedPlayerData.level,
            lines: updatedPlayerData.lines,
          },
        };
        expect(gameReducer(previousState, updateGameState({ player: updatedPlayerData }))).toEqual(expectedState);
      });

      it('should update only specific player state if not currentPlayer (root gameState not affected)', () => {
        const currentPlayerInitialGrid = [['C']];
        const p1InitialState = { id: 'p1', score: 0, isCurrentPlayer: false };
        const p2InitialState = { id: 'p2', score: 100, isCurrentPlayer: true, grid: currentPlayerInitialGrid, currentPiece: {shape: 'I'}, nextPiece: {shape: 'O'}, level: 1, lines: 2 };

        const previousState = {
          ...baseInitialState,
          gameState: {
            isActive: true,
            playerStates: { 'p1': p1InitialState, 'p2': p2InitialState },
            grid: p2InitialState.grid,
            currentPiece: p2InitialState.currentPiece,
            nextPiece: p2InitialState.nextPiece,
            score: p2InitialState.score,
            level: p2InitialState.level,
            lines: p2InitialState.lines,
          }
        };
        const updatedP1Data = { id: 'p1', score: 200, lines: 15, isCurrentPlayer: false }; // p1 is not current player

        const result = gameReducer(previousState, updateGameState({ player: updatedP1Data }));

        // Check P1's state is updated
        expect(result.gameState.playerStates['p1']).toEqual(updatedP1Data);
        // Check P2's state (and root game state mirroring P2) is NOT changed by P1's update
        expect(result.gameState.playerStates['p2']).toEqual(p2InitialState);
        expect(result.gameState.grid).toEqual(currentPlayerInitialGrid);
        expect(result.gameState.score).toEqual(p2InitialState.score);
      });

      it('should use existing grid if player.grid is not provided for currentPlayer', () => {
        const existingGrid = [['E']];
        const p1Data = { id: 'p1', isCurrentPlayer: true, score: 10, currentPiece: {shape: 'T'}, nextPiece: {shape: 'Z'}, level: 1, lines: 0 }; // No grid here
        const previousState = {
           ...baseInitialState,
           gameState: {
             isActive: true,
             playerStates: { 'p1': { ...p1Data, grid: existingGrid } }, // p1 already has a grid
             grid: existingGrid, // root grid
             score: 0, currentPiece: {}, nextPiece: {}, level: 0, lines: 0,
           }
        };
        const result = gameReducer(previousState, updateGameState({ player: p1Data }));
        expect(result.gameState.grid).toEqual(existingGrid); // Should preserve existing grid
        expect(result.gameState.playerStates['p1'].grid).toBeUndefined(); // player specific grid is not part of this update payload
        expect(result.gameState.score).toBe(10); // Other fields update
      });
    });

    // updatePlayers
    describe('updatePlayers', () => {
      it('should update the players list', () => {
        const previousState = { ...baseInitialState, players: [{ id: 'old' }] };
        const newPlayers = [{ id: 'p1' }, { id: 'p2' }];
        const expectedState = { ...baseInitialState, players: newPlayers };
        expect(gameReducer(previousState, updatePlayers(newPlayers))).toEqual(expectedState);
      });
    });

    // playerJoined
    describe('playerJoined', () => {
      it('should add a player to the list if not already present', () => {
        const p1 = { id: 'p1' };
        const previousState = { ...baseInitialState, players: [p1] };
        const newPlayer = { id: 'p2' };
        const expectedState = { ...baseInitialState, players: [p1, newPlayer] };
        expect(gameReducer(previousState, playerJoined(newPlayer))).toEqual(expectedState);
      });

      it('should not add a player if already present (by id)', () => {
        const p1 = { id: 'p1', name: 'Player One' };
        const p1Similar = { id: 'p1', name: 'Player One Updated' }; // Same ID
        const previousState = { ...baseInitialState, players: [p1] };
        const expectedState = { ...baseInitialState, players: [p1] }; // Should not change
        expect(gameReducer(previousState, playerJoined(p1Similar))).toEqual(expectedState);
      });
    });

    // playerLeft
    describe('playerLeft', () => {
      let consoleLogSpy;

      beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.useFakeTimers();
      });

      afterEach(() => {
        consoleLogSpy.mockRestore();
        vi.useRealTimers();
      });

      it('should remove a player and their state, new host assigned', () => {
        const p1 = { id: 'p1', name: 'Host' };
        const p2 = { id: 'p2', name: 'Player 2' };
        const p3 = { id: 'p3', name: 'Player 3' };
        const previousState = {
          ...baseInitialState,
          currentGame: { id: 'g1', name: 'Test Game', host: p1.id },
          players: [p1, p2, p3],
          gameState: {
            isActive: true,
            playerStates: {
              [p1.id]: { ...p1, score: 10 },
              [p2.id]: { ...p2, score: 20 },
              [p3.id]: { ...p3, score: 30 },
            },
          },
        };
        const expectedPlayers = [p2, p3];
        const expectedPlayerStates = {
          [p2.id]: { ...p2, score: 20 },
          [p3.id]: { ...p3, score: 30 },
        };
        const action = playerLeft({ id: p1.id, newHost: p2.id });
        const result = gameReducer(previousState, action);

        expect(result.players).toEqual(expectedPlayers);
        expect(result.gameState.playerStates).toEqual(expectedPlayerStates);
        expect(result.currentGame.host).toEqual(p2.id);
        expect(result.gameState.isActive).toBe(true); // Game continues
      });

      it('should remove a player, no new host if not provided', () => {
        const p1 = { id: 'p1', name: 'Host' };
        const p2 = { id: 'p2', name: 'Player 2' };
        const previousState = {
          ...baseInitialState,
          currentGame: { id: 'g1', name: 'Test Game', host: p1.id },
          players: [p1, p2],
          gameState: {
            isActive: true,
            playerStates: { [p1.id]: { ...p1 }, [p2.id]: { ...p2 } },
          },
        };
        const action = playerLeft({ id: p2.id }); // p2 leaves, no newHost explicitly set
        const result = gameReducer(previousState, action);

        expect(result.players).toEqual([p1]);
        expect(result.gameState.playerStates[p2.id]).toBeUndefined();
        expect(result.currentGame.host).toEqual(p1.id); // Host remains p1
      });


      it('should end game and declare winner if only one player remains after another leaves', () => {
        const p1 = { id: 'p1', name: 'Winner' };
        const p2 = { id: 'p2', name: 'Leaver' };
        const mockDate = new Date(2023, 10, 10, 12, 0, 0);
        vi.setSystemTime(mockDate);

        const previousState = {
          ...baseInitialState,
          currentGame: { id: 'g1', name: 'Test Game', host: p1.id },
          players: [p1, p2],
          gameState: {
            isActive: true,
            playerStates: {
              [p1.id]: { ...p1, isWinner: false, gameOver: false },
              [p2.id]: { ...p2, isWinner: false, gameOver: false },
            },
            isWinner: false,
            winner: null,
          },
        };
        const action = playerLeft({ id: p2.id }); // p2 leaves
        const result = gameReducer(previousState, action);

        expect(result.players).toEqual([p1]);
        expect(result.gameState.isActive).toBe(false);
        expect(result.gameState.winner).toBe(p1.id);
        expect(result.gameState.isWinner).toBe(true);
        expect(result.gameState.playerStates[p1.id].isWinner).toBe(true);
        expect(result.gameState.endedAt).toBe(mockDate.getTime());
        expect(result.gameState.playerStates[p2.id]).toBeUndefined(); // p2's state removed
      });

      it('should not change host if non-host player left and no newHost in payload', () => {
        const p1 = { id: 'p1', name: 'Host' };
        const p2 = { id: 'p2', name: 'Player 2' };
        const p3 = { id: 'p3', name: 'Player 3' };
         const previousState = {
          ...baseInitialState,
          currentGame: { id: 'g1', name: 'Test Game', host: p1.id },
          players: [p1, p2, p3],
          gameState: { /* ... */ }
        };
        const action = playerLeft({ id: p2.id }); // p2 (non-host) leaves
        const result = gameReducer(previousState, action);
        expect(result.currentGame.host).toBe(p1.id); // Host should remain p1
      });

       it('should handle playerLeft when gameState or playerStates is null', () => {
        const p1 = { id: 'p1' };
        const previousStateNullGameState = {
          ...baseInitialState,
          players: [p1],
          currentGame: { id: 'g1', host: p1.id },
          gameState: null,
        };
        const action = playerLeft({ id: p1.id });

        let result = gameReducer(previousStateNullGameState, action);
        expect(result.players).toEqual([]); // Player removed
        expect(result.gameState).toBeNull(); // gameState remains null

        const previousStateNullPlayerStates = {
            ...baseInitialState,
            players: [p1],
            currentGame: { id: 'g1', host: p1.id },
            gameState: { isActive: true, playerStates: null }
        };
        result = gameReducer(previousStateNullPlayerStates, action);
        expect(result.players).toEqual([]);
        expect(result.gameState.playerStates).toBeNull(); // playerStates remains null
      });
    });

    // gameOver
    describe('gameOver', () => {
      let consoleLogSpy;

      beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      });

      afterEach(() => {
        consoleLogSpy.mockRestore();
      });

      it('should mark game inactive, set winner, and update player states', () => {
        const p1 = { id: 'p1', username: 'Loser' };
        const p2 = { id: 'p2', username: 'Winner' };
        const endedAtTime = Date.now();
        const previousState = {
          ...baseInitialState,
          gameState: {
            isActive: true,
            playerStates: {
              [p1.id]: { ...p1, score: 100, lines: 5, gameOver: false, isWinner: false },
              [p2.id]: { ...p2, score: 200, lines: 10, gameOver: false, isWinner: false },
            },
            endedAt: null, isWinner: false, winner: null,
          },
        };
        const payload = {
          endedAt: endedAtTime,
          winner: p2.id,
          players: [ // This is typically the final state of players from server
            { id: p1.id, score: 100, lines: 5 },
            { id: p2.id, score: 200, lines: 10 },
          ],
        };
        const result = gameReducer(previousState, gameOver(payload));

        expect(result.gameState.isActive).toBe(false);
        expect(result.gameState.endedAt).toBe(endedAtTime);
        expect(result.gameState.isWinner).toBe(false); // In this specific gameOver, it means a definitive end, winner is by ID
        expect(result.gameState.winner).toBe(p2.id);

        expect(result.gameState.playerStates[p1.id]).toEqual({
          ...p1, score: 100, lines: 5, gameOver: true, isWinner: false,
        });
        expect(result.gameState.playerStates[p2.id]).toEqual({
          ...p2, score: 200, lines: 10, gameOver: false, isWinner: true,
        });
      });

      it('should handle scenario with no winner (all players lose/draw)', () => {
        const p1 = { id: 'p1', username: 'Player1' };
        const p2 = { id: 'p2', username: 'Player2' };
        const endedAtTime = Date.now();
        const previousState = {
          ...baseInitialState,
          gameState: {
            isActive: true,
            playerStates: {
              [p1.id]: { ...p1, score: 100, gameOver: false, isWinner: false },
              [p2.id]: { ...p2, score: 150, gameOver: false, isWinner: false },
            },
            endedAt: null, isWinner: false, winner: null,
          },
        };
        const payload = {
          endedAt: endedAtTime,
          winner: null, // No winner
          players: [
            { id: p1.id, score: 100 },
            { id: p2.id, score: 150 },
          ],
        };
        const result = gameReducer(previousState, gameOver(payload));

        expect(result.gameState.isActive).toBe(false);
        expect(result.gameState.winner).toBeNull();
        expect(result.gameState.isWinner).toBe(false);
        expect(result.gameState.playerStates[p1.id].gameOver).toBe(true);
        expect(result.gameState.playerStates[p1.id].isWinner).toBe(false);
        expect(result.gameState.playerStates[p2.id].gameOver).toBe(true);
        expect(result.gameState.playerStates[p2.id].isWinner).toBe(false);
      });

      it('should handle gameOver when gameState or playerStates is null initially', () => {
        const p1 = { id: 'p1' };
        const endedAtTime = Date.now();
        const payload = { endedAt: endedAtTime, winner: p1.id, players: [{ id: p1.id, score: 100 }] };

        const previousStateNullGameState = { ...baseInitialState, gameState: null };
        let result = gameReducer(previousStateNullGameState, gameOver(payload));
        // The reducer bails if gameState is null
        expect(result.gameState).toBeNull();

        // If gameState.playerStates is null, but gameState exists
         const previousStateNullPlayerStates = { ...baseInitialState, gameState: { isActive: true, playerStates: null } };
         result = gameReducer(previousStateNullPlayerStates, gameOver(payload));
         // This scenario will also effectively not update playerStates because it can't find player.id in a null object.
         // The main gameState flags like isActive, endedAt, winner should still be set.
         expect(result.gameState.isActive).toBe(false);
         expect(result.gameState.endedAt).toBe(endedAtTime);
         expect(result.gameState.winner).toBe(p1.id);
         expect(result.gameState.playerStates).toBeNull(); // Remains null
      });
    });

    // gameWinner
    describe('gameWinner', () => {
       let consoleLogSpy;

      beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      });

      afterEach(() => {
        consoleLogSpy.mockRestore();
      });

      it('should mark game inactive, set isWinner, and update player states based on player.isWinner flag', () => {
        const p1 = { id: 'p1', username: 'Player 1' };
        const p2 = { id: 'p2', username: 'Player 2 The Winner' }; // This player will have isWinner: true in payload
        const endedAtTime = Date.now();

        const previousState = {
          ...baseInitialState,
          gameState: {
            isActive: true,
            playerStates: {
              // Initial setup before gameWinner action
              [p1.id]: { ...p1, score: 100, lines: 5, gameOver: false, isWinner: false },
              [p2.id]: { ...p2, score: 200, lines: 10, gameOver: false, isWinner: false },
            },
            endedAt: null,
            isWinner: false, // Game was not yet won
            winner: null,
          },
        };

        const payload = {
          endedAt: endedAtTime,
          // Note: gameWinner action doesn't directly take a top-level 'winner' ID in its payload structure
          // It relies on the 'isWinner' flag within each player object in the 'players' array.
          players: [
            { ...p1, score: 100, lines: 5, isWinner: false }, // p1 is not the winner
            { ...p2, score: 200, lines: 10, isWinner: true },  // p2 is the winner
          ],
        };

        const result = gameReducer(previousState, gameWinner(payload));

        expect(result.gameState.isActive).toBe(false);
        expect(result.gameState.endedAt).toBe(endedAtTime);
        expect(result.gameState.isWinner).toBe(true); // Top-level flag indicates game has a winner

        // Check player 1 (loser)
        expect(result.gameState.playerStates[p1.id]).toEqual(
          expect.objectContaining({
            ...p1,
            score: 100,
            lines: 5,
            gameOver: true, // Loser is game over
            isWinner: false,
          })
        );

        // Check player 2 (winner)
        expect(result.gameState.playerStates[p2.id]).toEqual(
          expect.objectContaining({
            ...p2,
            score: 200,
            lines: 10,
            gameOver: false, // Winner is not game over
            isWinner: true,
          })
        );

        // Winner ID at the root gameState is not set by gameWinner reducer directly
        // This seems to be an oversight in the reducer or a deliberate choice that 'winner' ID is handled by 'gameOver'
        expect(result.gameState.winner).toBeNull();
      });

      it('should handle gameWinner when gameState or playerStates is null', () => {
        const p1 = { id: 'p1', isWinner: true };
        const endedAtTime = Date.now();
        const payload = { endedAt: endedAtTime, players: [{ ...p1, score: 100 }] };

        const previousStateNullGameState = { ...baseInitialState, gameState: null };
        let result = gameReducer(previousStateNullGameState, gameWinner(payload));
        expect(result.gameState).toBeNull(); // Bails if gameState is null

        const previousStateNullPlayerStates = { ...baseInitialState, gameState: { isActive: true, playerStates: null } };
        result = gameReducer(previousStateNullPlayerStates, gameWinner(payload));
        expect(result.gameState.isActive).toBe(false);
        expect(result.gameState.endedAt).toBe(endedAtTime);
        expect(result.gameState.isWinner).toBe(true);
        expect(result.gameState.playerStates).toBeNull(); // Remains null
      });
    });

    // penaltyApplied
    describe('penaltyApplied', () => {
      let consoleLogSpy;
      beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.useFakeTimers();
      });

      afterEach(() => {
        consoleLogSpy.mockRestore();
        vi.useRealTimers();
      });

      it('should add lastPenalty to gameState', () => {
        const mockDate = new Date(2023, 10, 10, 12, 30, 0);
        vi.setSystemTime(mockDate);
        const previousState = {
          ...baseInitialState,
          gameState: { isActive: true, playerStates: {} },
        };
        const penaltyPayload = { fromPlayer: 'p2', linesCleared: 4, penaltyLines: 2 };
        const result = gameReducer(previousState, penaltyApplied(penaltyPayload));

        expect(result.gameState.lastPenalty).toEqual({
          ...penaltyPayload,
          timestamp: mockDate.getTime(),
        });
      });

      it('should do nothing if gameState is null', () => {
        const previousState = { ...baseInitialState, gameState: null };
        const penaltyPayload = { fromPlayer: 'p2', linesCleared: 4, penaltyLines: 2 };
        const result = gameReducer(previousState, penaltyApplied(penaltyPayload));
        expect(result.gameState).toBeNull();
      });
    });

    // playerGameOver
    describe('playerGameOver', () => {
      let consoleLogSpy;
      const p1 = { id: 'p1', username: 'Player1' };
      const p2 = { id: 'p2', username: 'Player2' };
      const p3 = { id: 'p3', username: 'Player3' };

      beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.useFakeTimers();
      });

      afterEach(() => {
        consoleLogSpy.mockRestore();
        vi.useRealTimers();
      });

      it('should mark player as gameOver and isWinner false', () => {
        const previousState = {
          ...baseInitialState,
          gameState: {
            isActive: true,
            playerStates: {
              [p1.id]: { ...p1, score: 100, gameOver: false, isWinner: false },
              [p2.id]: { ...p2, score: 200, gameOver: false, isWinner: false },
            },
            winner: null,
          },
        };
        const payload = { player: { id: p1.id, score: 100 } }; // p1 is out
        const result = gameReducer(previousState, playerGameOver(payload));

        expect(result.gameState.playerStates[p1.id].gameOver).toBe(true);
        expect(result.gameState.playerStates[p1.id].isWinner).toBe(false);
        expect(result.gameState.playerStates[p1.id].score).toBe(100);
        expect(result.gameState.playerStates[p2.id].gameOver).toBe(false); // p2 still active
        expect(result.gameState.isActive).toBe(true); // Game still active
      });

      it('should declare a winner if only one player remains active', () => {
        const previousState = {
          ...baseInitialState,
          gameState: {
            isActive: true,
            playerStates: {
              [p1.id]: { ...p1, score: 100, gameOver: true, isWinner: false }, // p1 already out
              [p2.id]: { ...p2, score: 200, gameOver: false, isWinner: false }, // p2 active
              [p3.id]: { ...p3, score: 150, gameOver: false, isWinner: false }, // p3 active
            },
            winner: null,
          },
        };
        // p2 now goes game over, p3 should be winner
        const payload = { player: { id: p2.id, score: 200 } };
        const result = gameReducer(previousState, playerGameOver(payload));

        expect(result.gameState.playerStates[p1.id].gameOver).toBe(true);
        expect(result.gameState.playerStates[p2.id].gameOver).toBe(true);
        expect(result.gameState.playerStates[p2.id].isWinner).toBe(false);

        expect(result.gameState.playerStates[p3.id].gameOver).toBe(false);
        expect(result.gameState.playerStates[p3.id].isWinner).toBe(true); // p3 is the winner
        expect(result.gameState.winner).toBe(p3.id);
        expect(result.gameState.isActive).toBe(true); // Game remains active until winner is declared by server or another event
      });

      it('should mark game inactive if all players are game over', () => {
        const mockDate = new Date(2023, 10, 10, 13, 0, 0);
        vi.setSystemTime(mockDate);
        const previousState = {
          ...baseInitialState,
          gameState: {
            isActive: true,
            playerStates: {
              [p1.id]: { ...p1, score: 100, gameOver: true, isWinner: false },  // p1 already out
              [p2.id]: { ...p2, score: 200, gameOver: false, isWinner: false }, // p2 active, about to be out
            },
            winner: null,
          },
        };
        const payload = { player: { id: p2.id, score: 200 } }; // p2 is now out
        const result = gameReducer(previousState, playerGameOver(payload));

        expect(result.gameState.playerStates[p1.id].gameOver).toBe(true);
        expect(result.gameState.playerStates[p2.id].gameOver).toBe(true);
        expect(result.gameState.playerStates[p2.id].isWinner).toBe(false);
        expect(result.gameState.isActive).toBe(false); // All players out, game inactive
        expect(result.gameState.endedAt).toBe(mockDate.getTime());
        expect(result.gameState.winner).toBeNull(); // No specific winner if all lose this way
      });

      it('should do nothing if gameState, playerStates, or payload.player is missing', () => {
        const p = { id: 'p1' };
        const stateWithNullGameState = { ...baseInitialState, gameState: null };
        const stateWithNullPlayerStates = { ...baseInitialState, gameState: { isActive: true, playerStates: null } };
        const stateWithValidPlayerStates = { ...baseInitialState, gameState: { isActive: true, playerStates: { [p.id]: p } } };

        // Null gameState
        let result = gameReducer(stateWithNullGameState, playerGameOver({ player: p }));
        expect(result.gameState).toBeNull();

        // Null playerStates
        result = gameReducer(stateWithNullPlayerStates, playerGameOver({ player: p }));
        expect(result.gameState.playerStates).toBeNull();

        // Null payload.player
        result = gameReducer(stateWithValidPlayerStates, playerGameOver({ player: null }));
        expect(result.gameState.playerStates[p.id]).toEqual(p); // No change

        result = gameReducer(stateWithValidPlayerStates, playerGameOver({})); // Empty payload
        expect(result.gameState.playerStates[p.id]).toEqual(p); // No change
      });
    });

    // gameStarted
    describe('gameStarted', () => {
      it('should set game active and use initialState if provided (solo)', () => {
        const p1 = { id: 'p1', username: 'SoloPlayer' };
        const initialGamePayloadState = {
          grid: [['S']], score: 0, level: 1, lines: 0,
          playerStates: { [p1.id]: { ...p1, isWinner: false } },
          players: [p1], // Important for isSoloGame logic
          isActive: true, isWinner: false, winner: null,
        };
        const startedAtTime = Date.now();
        const previousState = {
          ...baseInitialState,
          currentGame: { id: 'g1', name: 'Test Game', isActive: false, startedAt: null },
        };
        const payload = { startedAt: startedAtTime, initialState: initialGamePayloadState };
        const result = gameReducer(previousState, gameStarted(payload));

        expect(result.currentGame.isActive).toBe(true);
        expect(result.currentGame.startedAt).toBe(startedAtTime);
        expect(result.gameState).toEqual({
          ...initialGamePayloadState,
          isSoloGame: true, // because players.length === 1
          isWinner: false, // ensure these are reset
          winner: null,
        });
        expect(result.gameState.playerStates[p1.id].isWinner).toBe(false);
      });

      it('should set isSoloGame to false if multiple players in initialState', () => {
        const p1 = { id: 'p1' };
        const p2 = { id: 'p2' };
        const initialGamePayloadState = {
          playerStates: { [p1.id]: { ...p1, isWinner: false }, [p2.id]: { ...p2, isWinner: false } },
          players: [p1, p2], // Multiple players
          isActive: true, isWinner: false, winner: null,
        };
        const startedAtTime = Date.now();
        const previousState = { ...baseInitialState, currentGame: { id: 'g1' } };
        const payload = { startedAt: startedAtTime, initialState: initialGamePayloadState };
        const result = gameReducer(previousState, gameStarted(payload));

        expect(result.gameState.isSoloGame).toBe(false);
        expect(result.gameState.playerStates[p1.id].isWinner).toBe(false);
        expect(result.gameState.playerStates[p2.id].isWinner).toBe(false);
      });

      it('should initialize playerStates if missing in provided initialState', () => {
        const initialGamePayloadState = { players: [{id: 'p1'}], isActive: true }; // No playerStates
        const payload = { startedAt: Date.now(), initialState: initialGamePayloadState };
        const result = gameReducer(baseInitialState, gameStarted(payload));
        expect(result.gameState.playerStates).toEqual({});
      });

      it('should initialize a default gameState if no initialState is provided in payload', () => {
        const previousState = { ...baseInitialState, currentGame: { id: 'g1' } };
        const payload = { startedAt: Date.now() }; // No initialState in payload
        const result = gameReducer(previousState, gameStarted(payload));

        expect(result.currentGame.isActive).toBe(true);
        expect(result.gameState).toEqual({
          isActive: true,
          grid: Array(20).fill(null).map(() => Array(10).fill("0")),
          score: 0,
          level: 0,
          lines: 0,
          playerStates: {},
          isSoloGame: true,
        });
      });
    });

    // resetGame
    describe('resetGame', () => {
      it('should reset state and save gameResults if game was over', () => {
        const p1Data = { id: 'p1', username: 'Player1', score: 100, level: 2, lines: 10, gameOver: true };
        const endedAtTime = Date.now();
        const previousState = {
          ...baseInitialState,
          currentGame: { id: 'g1', name: 'Game Over Test' },
          gameState: {
            isActive: false, // Game is over
            endedAt: endedAtTime,
            playerStates: { [p1Data.id]: p1Data },
            winner: null,
            isWinner: false,
          },
          players: [p1Data],
          status: 'succeeded', // Arbitrary previous status
          error: 'some error',  // Arbitrary previous error
        };

        const result = gameReducer(previousState, resetGame());

        expect(result.currentGame).toBeNull();
        expect(result.gameState).toBeNull();
        expect(result.players).toEqual([]);
        expect(result.status).toBe('idle');
        expect(result.error).toBeNull();
        expect(result.gameResults).toEqual({
          endedAt: endedAtTime,
          players: [
            { id: p1Data.id, username: p1Data.username, score: 100, level: 2, lines: 10, gameOver: true }
          ]
        });
      });

      it('should reset state without gameResults if game was active or gameState null', () => {
        const activeState = {
          ...baseInitialState,
          currentGame: { id: 'g1' },
          gameState: { isActive: true, playerStates: {} }, // Active game
          players: [{id: 'p1'}]
        };
        let result = gameReducer(activeState, resetGame());
        expect(result.gameResults).toBeUndefined();
        expect(result.currentGame).toBeNull();
        expect(result.gameState).toBeNull();
        expect(result.status).toBe('idle');

        const nullGameState = {
            ...baseInitialState,
            currentGame: { id: 'g1' },
            gameState: null, // Game state is null
        };
        result = gameReducer(nullGameState, resetGame());
        expect(result.gameResults).toBeUndefined();
      });

       it('should handle empty or null playerStates in gameState for gameResults', () => {
        const endedAtTime = Date.now();
        const previousState = {
          ...baseInitialState,
          currentGame: { id: 'g1' },
          gameState: { isActive: false, endedAt: endedAtTime, playerStates: null }, // playerStates is null
        };
        let result = gameReducer(previousState, resetGame());
        expect(result.gameResults.players).toEqual([]);

        const previousStateEmpty = {
            ...baseInitialState,
            currentGame: { id: 'g1' },
            gameState: { isActive: false, endedAt: endedAtTime, playerStates: {} }, // playerStates is empty
        };
        result = gameReducer(previousStateEmpty, resetGame());
        expect(result.gameResults.players).toEqual([]);
      });
    });

    // Movement Action Reducers (no-op tests)
    describe('Movement Action Reducers', () => {
      const actions = [
        movePieceLeft(),
        movePieceRight(),
        movePieceDown(),
        rotatePiece(),
        dropPiece(),
        autoDropPiece()
      ];

      actions.forEach(action => {
        it(`should not change state for ${action.type}`, () => {
          const previousState = { ...baseInitialState, status: 'playing' }; // Ensure a non-initial state
          Object.freeze(previousState); // Prevent accidental mutation of previousState
          const result = gameReducer(previousState, action);
          expect(result).toEqual(previousState); // State should be unchanged
        });
      });
    });

  });
});
