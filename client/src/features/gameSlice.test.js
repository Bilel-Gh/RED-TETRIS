import gameReducer, {
  initialState,
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

describe('gameSlice reducer', () => {
  let currentState;

  beforeEach(() => {
    currentState = { ...initialState };
  });

  it('should handle initial state', () => {
    expect(gameReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('fetchGames actions', () => {
    it('should handle fetchGamesStart', () => {
      const action = fetchGamesStart();
      const newState = gameReducer(currentState, action);
      expect(newState.status).toEqual('loading');
    });

    it('should update gameList and status on fetchGamesSuccess', () => {
      const games = [mockGame('1'), mockGame('2')];
      const action = fetchGamesSuccess(games);
      const newState = gameReducer(currentState, action);
      expect(newState.status).toEqual('succeeded');
      expect(newState.gameList).toEqual(games);
      expect(newState.error).toBeNull();
    });

    it('should handle empty game list on fetchGamesSuccess', () => {
      const games = [];
      const action = fetchGamesSuccess(games);
      const newState = gameReducer(currentState, action);
      expect(newState.status).toEqual('succeeded');
      expect(newState.gameList).toEqual(games);
    });

    it('should handle fetchGamesFailure', () => {
      const error = 'Failed to fetch games';
      const action = fetchGamesFailure(error);
      const newState = gameReducer(currentState, action);
      expect(newState.status).toEqual('failed');
      expect(newState.error).toEqual(error);
    });
  });

  describe('createGame actions', () => {
    it('should handle createGameStart', () => {
      const action = createGameStart();
      const newState = gameReducer(currentState, action);
      expect(newState.status).toEqual('loading');
    });

    it('should update currentGame and players on createGameSuccess', () => {
      const player1 = mockPlayer('p1');
      const newGame = mockGame('g1', [player1]);
      const action = createGameSuccess(newGame);
      const newState = gameReducer(currentState, action);

      expect(newState.status).toEqual('succeeded');
      expect(newState.currentGame).toEqual(newGame);
      expect(newState.players).toEqual(newGame.players);
      expect(newState.gameState).toEqual({
        isActive: false,
        startedAt: null,
        isWinner: false,
        winner: null,
        playerStates: {
          [player1.id]: {
            ...player1,
            isWinner: false,
            gameOver: false,
          }
        }
      });
    });

    it('should handle createGameFailure', () => {
      const error = 'Failed to create game';
      const action = createGameFailure(error);
      const newState = gameReducer(currentState, action);
      expect(newState.status).toEqual('failed');
      expect(newState.error).toEqual(error);
    });
  });

  describe('joinGame actions', () => {
    it('should handle joinGameStart', () => {
      const action = joinGameStart();
      const newState = gameReducer(currentState, action);
      expect(newState.status).toEqual('loading');
    });

    it('should update currentGame and players on joinGameSuccess', () => {
      const player1 = mockPlayer('p1');
      const player2 = mockPlayer('p2');
      const gameToJoin = mockGame('g1', [player1, player2]);
      const action = joinGameSuccess({ game: gameToJoin, players: gameToJoin.players });
      const newState = gameReducer(currentState, action);

      expect(newState.status).toEqual('succeeded');
      expect(newState.currentGame).toEqual(gameToJoin);
      expect(newState.players).toEqual(gameToJoin.players);
    });

    it('should handle joinGameFailure', () => {
      const error = 'Failed to join game';
      const action = joinGameFailure(error);
      const newState = gameReducer(currentState, action);
      expect(newState.status).toEqual('failed');
      expect(newState.error).toEqual(error);
    });
  });

  describe('leaveGame action', () => {
    it('should reset currentGame, players, and gameState', () => {
      currentState.currentGame = mockGame('g1');
      currentState.players = [mockPlayer('p1')];
      currentState.gameState = { isActive: true, playerStates: {} };

      const action = leaveGame();
      const newState = gameReducer(currentState, action);

      expect(newState.currentGame).toBeNull();
      expect(newState.players).toEqual([]);
      expect(newState.gameState).toBeNull();
    });
  });

  describe('updateGameState action', () => {
    it('should update the entire gameState if no specific player is provided', () => {
      const newGameState = {
        isActive: true,
        grid: Array(20).fill(0).map(() => Array(10).fill('T')),
        currentPiece: { shape: 'I', position: { x: 3, y: 0 } },
        nextPiece: { shape: 'O', position: { x: 4, y: 0 } },
        score: 100,
        level: 2,
        lines: 5,
        playerStates: { 'p1': mockPlayer('p1', { score: 100 }) }
      };
      const action = updateGameState(newGameState);
      const newState = gameReducer(currentState, action);
      expect(newState.gameState).toEqual(newGameState);
    });

    it('should initialize gameState if it is null when updating a specific player', () => {
      const player1Update = mockPlayer('p1', { score: 50, isCurrentPlayer: true });
      const action = updateGameState({ player: player1Update });
      currentState.gameState = null; // Ensure gameState is null initially
      const newState = gameReducer(currentState, action);

      expect(newState.gameState).toBeDefined();
      expect(newState.gameState.isActive).toBe(true);
      expect(newState.gameState.playerStates).toBeDefined();
      expect(newState.gameState.playerStates['p1']).toEqual(player1Update);
    });

    it('should update a specific player and root gameState for currentPlayer', () => {
      const player1 = mockPlayer('p1');
      currentState.gameState = {
        isActive: true,
        playerStates: { [player1.id]: player1 },
        grid: player1.grid, // initial grid
        currentPiece: player1.currentPiece,
        nextPiece: player1.nextPiece,
        score: player1.score,
        level: player1.level,
        lines: player1.lines
      };

      const updatedPlayerData = {
        id: 'p1',
        grid: Array(20).fill(0).map(() => Array(10).fill('L')), // new grid
        currentPiece: { shape: 'J', position: { x: 5, y: 1 } },
        nextPiece: { shape: 'S', position: { x: 5, y: 1 } },
        score: 150,
        level: 3,
        lines: 10,
        isCurrentPlayer: true
      };

      const action = updateGameState({ player: updatedPlayerData });
      const newState = gameReducer(currentState, action);

      // Check player-specific state
      expect(newState.gameState.playerStates['p1']).toEqual(updatedPlayerData);

      // Check root gameState updates for current player
      expect(newState.gameState.grid).toEqual(updatedPlayerData.grid);
      expect(newState.gameState.currentPiece).toEqual(updatedPlayerData.currentPiece);
      expect(newState.gameState.nextPiece).toEqual(updatedPlayerData.nextPiece);
      expect(newState.gameState.score).toEqual(updatedPlayerData.score);
      expect(newState.gameState.level).toEqual(updatedPlayerData.level);
      expect(newState.gameState.lines).toEqual(updatedPlayerData.lines);
    });

    it('should update only specific player state if not currentPlayer', () => {
      const player1 = mockPlayer('p1');
      const player2 = mockPlayer('p2', { isCurrentPlayer: true }); // p2 is the current player
      currentState.gameState = {
        isActive: true,
        playerStates: {
          [player1.id]: player1,
          [player2.id]: player2
        },
        grid: player2.grid, // root grid from p2
        currentPiece: player2.currentPiece,
        nextPiece: player2.nextPiece,
        score: player2.score,
        level: player2.level,
        lines: player2.lines
      };

      const updatedPlayer1Data = {
        id: 'p1',
        score: 200,
        lines: 15,
        isCurrentPlayer: false // p1 is not the current player
      };

      const action = updateGameState({ player: updatedPlayer1Data });
      const newState = gameReducer(currentState, action);

      // Check player1-specific state is updated
      expect(newState.gameState.playerStates['p1']).toEqual(updatedPlayer1Data);
      // Check root gameState remains unchanged (reflects player2's state)
      expect(newState.gameState.grid).toEqual(player2.grid);
      expect(newState.gameState.score).toEqual(player2.score);
    });
  });

  describe('updatePlayers action', () => {
    it('should update the players list', () => {
      const newPlayers = [mockPlayer('p1'), mockPlayer('p2')];
      const action = updatePlayers(newPlayers);
      const newState = gameReducer(currentState, action);
      expect(newState.players).toEqual(newPlayers);
    });
  });

  describe('playerJoined action', () => {
    it('should add a player to the list if not already present', () => {
      const player1 = mockPlayer('p1');
      currentState.players = [player1];
      const newPlayer = mockPlayer('p2');
      const action = playerJoined(newPlayer);
      const newState = gameReducer(currentState, action);
      expect(newState.players).toEqual([player1, newPlayer]);
    });

    it('should not add a player if already present', () => {
      const player1 = mockPlayer('p1');
      currentState.players = [player1];
      const action = playerJoined(player1); // Adding the same player
      const newState = gameReducer(currentState, action);
      expect(newState.players).toEqual([player1]);
    });
  });

  describe('playerLeft action', () => {
    beforeEach(() => {
      const player1 = mockPlayer('p1');
      const player2 = mockPlayer('p2');
      const player3 = mockPlayer('p3');
      currentState.players = [player1, player2, player3];
      currentState.currentGame = mockGame('g1', currentState.players, { host: player1.id });
      currentState.gameState = {
        isActive: true,
        playerStates: {
          [player1.id]: { ...player1, isWinner: false, gameOver: false },
          [player2.id]: { ...player2, isWinner: false, gameOver: false },
          [player3.id]: { ...player3, isWinner: false, gameOver: false },
        },
        isWinner: false,
        winner: null,
      };
    });

    it('should remove a player from the list and playerStates', () => {
      const playerToRemove = currentState.players[1]; // player2
      const action = playerLeft({ id: playerToRemove.id });
      const newState = gameReducer(currentState, action);

      expect(newState.players.find(p => p.id === playerToRemove.id)).toBeUndefined();
      expect(newState.gameState.playerStates[playerToRemove.id]).toBeUndefined();
      expect(newState.players.length).toBe(2);
    });

    it('should update host if the host left and newHost is provided', () => {
      const hostPlayer = currentState.players[0]; // player1 (current host)
      const newHostPlayer = currentState.players[1]; // player2 (new host)
      const action = playerLeft({ id: hostPlayer.id, newHost: newHostPlayer.id });
      const newState = gameReducer(currentState, action);

      expect(newState.currentGame.host).toBe(newHostPlayer.id);
    });

    it('should not change host if non-host player left', () => {
      const playerToRemove = currentState.players[1]; // player2 (not host)
      const originalHostId = currentState.currentGame.host;
      const action = playerLeft({ id: playerToRemove.id });
      const newState = gameReducer(currentState, action);

      expect(newState.currentGame.host).toBe(originalHostId);
    });

    it('should end the game and declare winner if only one player remains', () => {
      const player1 = mockPlayer('p1');
      const player2 = mockPlayer('p2');
      currentState.players = [player1, player2];
      currentState.currentGame = mockGame('g1', currentState.players, { host: player1.id });
      currentState.gameState = {
        isActive: true,
        playerStates: {
          [player1.id]: { ...player1, isWinner: false, gameOver: false },
          [player2.id]: { ...player2, isWinner: false, gameOver: false },
        },
        isWinner: false,
        winner: null,
      };

      const action = playerLeft({ id: player2.id }); // player2 leaves
      const newState = gameReducer(currentState, action);

      expect(newState.players.length).toBe(1);
      expect(newState.players[0].id).toBe(player1.id);
      expect(newState.gameState.isActive).toBe(false);
      expect(newState.gameState.winner).toBe(player1.id);
      expect(newState.gameState.isWinner).toBe(true);
      expect(newState.gameState.playerStates[player1.id].isWinner).toBe(true);
      expect(newState.gameState.endedAt).toBeDefined();
    });

    it('should not end the game if more than one player remains', () => {
        const playerToRemove = currentState.players[2]; // player3
        const action = playerLeft({ id: playerToRemove.id });
        const newState = gameReducer(currentState, action);

        expect(newState.players.length).toBe(2);
        expect(newState.gameState.isActive).toBe(true);
        expect(newState.gameState.winner).toBeNull();
    });
  });

  describe('gameStarted action', () => {
    it('should set game to active and use initialState if provided', () => {
      const player1 = mockPlayer('p1');
      const initialGameData = {
        startedAt: Date.now(),
        initialState: {
          grid: Array(20).fill(0).map(() => Array(10).fill('S')),
          score: 0,
          level: 1,
          lines: 0,
          playerStates: { [player1.id]: { ...player1, isWinner: false } },
          players: [player1],
          isActive: true,
          isWinner: false,
          winner: null,
        }
      };
      currentState.currentGame = mockGame('g1');
      const action = gameStarted(initialGameData);
      const newState = gameReducer(currentState, action);

      expect(newState.currentGame.isActive).toBe(true);
      expect(newState.currentGame.startedAt).toBe(initialGameData.startedAt);
      expect(newState.gameState).toEqual({
        ...initialGameData.initialState,
        isSoloGame: true, // Since only one player
      });
      expect(newState.gameState.playerStates[player1.id].isWinner).toBe(false);
    });

    it('should set isSoloGame to false if multiple players', () => {
        const player1 = mockPlayer('p1');
        const player2 = mockPlayer('p2');
        const initialGameData = {
          startedAt: Date.now(),
          initialState: {
            grid: Array(20).fill(0).map(() => Array(10).fill('S')),
            score: 0, level: 1, lines: 0,
            playerStates: {
                 [player1.id]: { ...player1, isWinner: false },
                 [player2.id]: { ...player2, isWinner: false }
            },
            players: [player1, player2],
            isActive: true, isWinner: false, winner: null,
          }
        };
        currentState.currentGame = mockGame('g1');
        const action = gameStarted(initialGameData);
        const newState = gameReducer(currentState, action);

        expect(newState.gameState.isSoloGame).toBe(false);
    });

    it('should initialize a default gameState if no initialState is provided', () => {
      currentState.currentGame = mockGame('g1');
      const action = gameStarted({ startedAt: Date.now() });
      const newState = gameReducer(currentState, action);

      expect(newState.currentGame.isActive).toBe(true);
      expect(newState.gameState).toEqual({
        isActive: true,
        grid: Array(20).fill(null).map(() => Array(10).fill("0")),
        score: 0,
        level: 0,
        lines: 0,
        playerStates: {},
        isSoloGame: true // Default for no initial state
      });
    });
  });

  describe('gameOver action', () => {
    const player1 = mockPlayer('p1');
    const player2 = mockPlayer('p2');
    const endedAtTime = Date.now();

    beforeEach(() => {
      currentState.gameState = {
        isActive: true,
        playerStates: {
          [player1.id]: { ...player1, score: 100, lines: 5, gameOver: false, isWinner: false },
          [player2.id]: { ...player2, score: 200, lines: 10, gameOver: false, isWinner: false }
        },
        endedAt: null,
        isWinner: false,
        winner: null
      };
    });

    it('should mark game as inactive, set winner, and update player states for multi-player', () => {
      const payload = {
        endedAt: endedAtTime,
        winner: player2.id, // player2 wins
        players: [
          { id: player1.id, score: 100, lines: 5 },
          { id: player2.id, score: 200, lines: 10 }
        ]
      };
      const action = gameOver(payload);
      const newState = gameReducer(currentState, action);

      expect(newState.gameState.isActive).toBe(false);
      expect(newState.gameState.endedAt).toBe(endedAtTime);
      expect(newState.gameState.isWinner).toBe(false); // Game over, not necessarily a single winner scenario like gameWinner
      expect(newState.gameState.winner).toBe(player2.id);

      expect(newState.gameState.playerStates[player1.id]).toEqual(expect.objectContaining({
        id: player1.id, score: 100, lines: 5, gameOver: true, isWinner: false
      }));
      expect(newState.gameState.playerStates[player2.id]).toEqual(expect.objectContaining({
        id: player2.id, score: 200, lines: 10, gameOver: false, isWinner: true
      }));
    });

    it('should handle scenario with no winner (e.g., all players lose or draw)', () => {
        const payload = {
            endedAt: endedAtTime,
            winner: null, // No winner
            players: [
              { id: player1.id, score: 100, lines: 5 },
              { id: player2.id, score: 150, lines: 8 }
            ]
          };
          const action = gameOver(payload);
          const newState = gameReducer(currentState, action);

          expect(newState.gameState.isActive).toBe(false);
          expect(newState.gameState.winner).toBeNull();
          expect(newState.gameState.isWinner).toBe(false);
          expect(newState.gameState.playerStates[player1.id].gameOver).toBe(true);
          expect(newState.gameState.playerStates[player1.id].isWinner).toBe(false);
          expect(newState.gameState.playerStates[player2.id].gameOver).toBe(true);
          expect(newState.gameState.playerStates[player2.id].isWinner).toBe(false);
    });
  });

  describe('playerGameOver action', () => {
    const player1 = mockPlayer('p1');
    const player2 = mockPlayer('p2');
    const player3 = mockPlayer('p3');

    beforeEach(() => {
      currentState.gameState = {
        isActive: true,
        playerStates: {
          [player1.id]: { ...player1, score: 100, gameOver: false, isWinner: false },
          [player2.id]: { ...player2, score: 200, gameOver: false, isWinner: false },
          [player3.id]: { ...player3, score: 150, gameOver: false, isWinner: false }
        },
        winner: null
      };
    });

    it('should mark a specific player as game over', () => {
      const payload = { player: { id: player1.id, score: 100 } }; // Player1 is game over
      const action = playerGameOver(payload);
      const newState = gameReducer(currentState, action);

      expect(newState.gameState.playerStates[player1.id].gameOver).toBe(true);
      expect(newState.gameState.playerStates[player1.id].isWinner).toBe(false);
      expect(newState.gameState.playerStates[player2.id].gameOver).toBe(false);
      expect(newState.gameState.playerStates[player3.id].gameOver).toBe(false);
      expect(newState.gameState.isActive).toBe(true); // Game might still be active
    });

    it('should declare a winner if only one player remains active', () => {
      // p1 and p2 are already game over, p3 is the last one
      currentState.gameState.playerStates[player1.id].gameOver = true;
      currentState.gameState.playerStates[player2.id].gameOver = true;

      const payload = { player: { id: player1.id } }; // Irrelevant which player triggered this, already set up state
      // Let's simulate player2 just got game over, leaving player3 as winner
      // To do this properly, playerGameOver should be called for player2
      const actionForP2 = playerGameOver({ player: { id: player2.id, score: player2.score } });
      let intermediateState = gameReducer(currentState, actionForP2);
      // Now if player1 also gets game over (or was already)
      // This test is a bit tricky as playerGameOver is for one player at a time.
      // Let's simplify: assume p1 is already out, p2 now gets game over. p3 should win.
      currentState.gameState.playerStates[player1.id] = { ...player1, gameOver: true, isWinner: false };
      // player2 now gets game over
      const action = playerGameOver({ player: { id: player2.id, score: player2.score } });
      const newState = gameReducer(currentState, action);

      expect(newState.gameState.playerStates[player2.id].gameOver).toBe(true);
      expect(newState.gameState.playerStates[player2.id].isWinner).toBe(false);

      expect(newState.gameState.playerStates[player3.id].gameOver).toBe(false);
      expect(newState.gameState.playerStates[player3.id].isWinner).toBe(true);
      expect(newState.gameState.winner).toBe(player3.id);
      // Game doesn't necessarily become inactive here, depends on server logic for overall game end.
    });

    it('should mark game as inactive if all players are game over', () => {
      currentState.gameState.playerStates[player1.id].gameOver = true;
      currentState.gameState.playerStates[player2.id].gameOver = true;
      // player3 now gets game over
      const payload = { player: { id: player3.id, score: player3.score } };
      const action = playerGameOver(payload);
      const newState = gameReducer(currentState, action);

      expect(newState.gameState.playerStates[player3.id].gameOver).toBe(true);
      expect(newState.gameState.playerStates[player3.id].isWinner).toBe(false);
      expect(newState.gameState.isActive).toBe(false);
      expect(newState.gameState.endedAt).toBeDefined();
      expect(newState.gameState.winner).toBeNull(); // No winner if all lost
    });
  });

  describe('gameWinner action', () => {
    const player1 = mockPlayer('p1');
    const player2 = mockPlayer('p2');
    const endedAtTime = Date.now();

    beforeEach(() => {
      currentState.gameState = {
        isActive: true,
        playerStates: {
          [player1.id]: { ...player1, score: 100, lines: 5, gameOver: false, isWinner: false },
          [player2.id]: { ...player2, score: 200, lines: 10, gameOver: false, isWinner: false }
        },
        endedAt: null,
        isWinner: false,
        winner: null
      };
    });

    it('should mark game as inactive and set the winner details', () => {
      const payload = {
        endedAt: endedAtTime,
        players: [
          { ...player1, isWinner: false },
          { ...player2, isWinner: true } // player2 is the winner
        ]
      };
      const action = gameWinner(payload);
      const newState = gameReducer(currentState, action);

      expect(newState.gameState.isActive).toBe(false);
      expect(newState.gameState.endedAt).toBe(endedATTime);
      expect(newState.gameState.isWinner).toBe(true);
      // Note: gameSlice.gameWinner doesn't explicitly set state.gameState.winner ID
      // It relies on the player object having isWinner: true

      expect(newState.gameState.playerStates[player1.id]).toEqual(expect.objectContaining({
        ...player1, gameOver: true, isWinner: false
      }));
      expect(newState.gameState.playerStates[player2.id]).toEqual(expect.objectContaining({
        ...player2, gameOver: false, isWinner: true
      }));
    });
  });

  describe('penaltyApplied action', () => {
    it('should record the last penalty details', () => {
      currentState.gameState = { isActive: true, playerStates: {} }; // Ensure gameState exists
      const penaltyPayload = {
        fromPlayer: 'p2',
        linesCleared: 4,
        penaltyLines: 2
      };
      const action = penaltyApplied(penaltyPayload);
      const newState = gameReducer(currentState, action);

      expect(newState.gameState.lastPenalty).toBeDefined();
      expect(newState.gameState.lastPenalty.fromPlayer).toBe('p2');
      expect(newState.gameState.lastPenalty.linesCleared).toBe(4);
      expect(newState.gameState.lastPenalty.penaltyLines).toBe(2);
      expect(newState.gameState.lastPenalty.timestamp).toBeDefined();
    });
  });

  describe('resetGame action', () => {
    it('should reset game state to initial values and store gameResults if game was over', () => {
      const p1Data = { ...mockPlayer('p1'), score: 100, level: 2, lines: 10, gameOver: true };
      currentState.currentGame = mockGame('g1');
      currentState.gameState = {
        isActive: false, // Game is over
        endedAt: Date.now(),
        playerStates: { [p1Data.id]: p1Data },
        winner: null,
        isWinner: false,
      };
      currentState.players = [p1Data];
      currentState.status = 'succeeded';
      currentState.error = 'some error';

      const action = resetGame();
      const newState = gameReducer(currentState, action);

      expect(newState.currentGame).toBeNull();
      expect(newState.gameState).toBeNull();
      expect(newState.players).toEqual([]);
      expect(newState.status).toEqual('idle');
      expect(newState.error).toBeNull();
      expect(newState.gameResults).toEqual({
        endedAt: currentState.gameState.endedAt,
        players: [{
          id: p1Data.id,
          username: p1Data.username,
          score: p1Data.score,
          level: p1Data.level,
          lines: p1Data.lines,
          gameOver: true
        }]
      });
    });

    it('should reset game state to initial values without gameResults if game was active', () => {
        currentState.currentGame = mockGame('g1');
        currentState.gameState = { isActive: true, playerStates: {} }; // Game is active
        currentState.players = [mockPlayer('p1')];

        const action = resetGame();
        const newState = gameReducer(currentState, action);

        expect(newState.gameResults).toBeUndefined(); // Or null, depending on how you want to handle it if not set
        expect(newState.currentGame).toBeNull();
        expect(newState.gameState).toBeNull();
      });
  });

  // TODO: Tests for movePieceLeft, movePieceRight, movePieceDown, rotatePiece, dropPiece, autoDropPiece
  // These actions are likely handled by middleware/socket events, so their reducers might be no-op or simple state changes.
  // If they modify client-side state directly BEFORE sending to server (optimistic update), test that.
});
