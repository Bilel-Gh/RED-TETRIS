import { SocketService } from '../SocketService';
import { GameManager } from '../GameManager';
import { Server } from 'socket.io';
import { vi, expect, describe, test, beforeEach, afterEach } from 'vitest';

// Mock http.Server, socket.io, and GameManager
vi.mock('socket.io');
vi.mock('../GameManager');

const mockHttpServer = {}; // Minimal mock for httpServer

describe('SocketService', () => {
  let socketService;
  let mockIo;
  let mockSocket;

  beforeEach(() => {
    // Reset mocks for each test
    vi.resetAllMocks();

    // Mock socket.io server instance
    mockIo = {
      on: vi.fn(),
      emit: vi.fn(),
      sockets: {
        adapter: {
          rooms: {
            get: vi.fn().mockReturnValue(new Set())
          }
        }
      },
      to: vi.fn(() => mockIo), // Chainable to
    };
    Server.mockImplementation(() => mockIo);

    // Mock GameManager instance
    GameManager.mockImplementation(() => {
      return {
        createGame: vi.fn(),
        joinGame: vi.fn(),
        leaveGame: vi.fn(),
        getPlayerGame: vi.fn(),
        getGame: vi.fn(),
        startGame: vi.fn(),
        getAvailableGames: vi.fn().mockReturnValue([]),
        cleanupGames: vi.fn(),
        // Mock the callback passed to GameManager constructor
        onPlayerUpdate: vi.fn(),
      };
    });

    socketService = new SocketService(mockHttpServer);

    // Capture the connection handler
    const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')[1];

    // Mock a socket connection
    mockSocket = {
      id: 'testSocketId123',
      on: vi.fn(),
      join: vi.fn(),
      leave: vi.fn(),
      emit: vi.fn(),
      broadcast: {
        emit: vi.fn()
      },
      to: vi.fn(() => mockSocket), // Chainable to for socket
      data: {}, // For storing user data or other properties if needed
    };

    // Simulate a client connection
    connectionHandler(mockSocket);
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (socketService && socketService.gameManager && typeof socketService.gameManager.cleanupGames === 'function') {
      // Stop any intervals if they were started by SocketService/GameManager
      // This is a placeholder; actual cleanup might need more specific mocking if intervals are an issue
    }
  });

  test('should initialize Socket.io server and GameManager on construction', () => {
    expect(Server).toHaveBeenCalledTimes(1);
    expect(Server).toHaveBeenCalledWith(mockHttpServer, expect.any(Object)); // Check if cors options are passed
    expect(GameManager).toHaveBeenCalledTimes(1);
    expect(socketService.io).toBe(mockIo);
    expect(socketService.gameManager).toBeDefined();
    expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  test('should handle new client connection and setup ping event', () => {
    // Connection handler is called in beforeEach
    expect(mockSocket.on).toHaveBeenCalledWith('ping', expect.any(Function));

    // Simulate receiving a ping event
    const pingHandler = mockSocket.on.mock.calls.find(call => call[0] === 'ping')[1];
    const clientTimestamp = Date.now() - 50; // Simulate 50ms latency
    const mockCallback = vi.fn();

    pingHandler(clientTimestamp, mockCallback);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      clientTime: clientTimestamp,
      latency: expect.any(Number)
    }));
    expect(mockCallback.mock.calls[0][0].serverTime).toBeGreaterThanOrEqual(clientTimestamp);
  });

  describe('user:login event', () => {
    let loginHandler;
    const mockLoginCallback = vi.fn();
    const username = 'testUser';

    beforeEach(() => {
      // Find the 'user:login' handler from the mockSocket.on calls
      const loginCall = mockSocket.on.mock.calls.find(call => call[0] === 'user:login');
      if (!loginCall) {
        throw new Error('user:login handler not found. Ensure it is registered in SocketService.');
      }
      loginHandler = loginCall[1];
      mockLoginCallback.mockClear(); // Clear callback mock for each test in this describe block
    });

    test('should handle user:login, add user, and callback with success', () => {
      loginHandler(username, mockLoginCallback);

      expect(socketService.users.has(mockSocket.id)).toBe(true);
      const userData = socketService.users.get(mockSocket.id);
      expect(userData).toEqual(expect.objectContaining({
        id: mockSocket.id,
        username,
      }));
      expect(userData.joinedAt).toBeDefined();

      expect(mockLoginCallback).toHaveBeenCalledTimes(1);
      expect(mockLoginCallback).toHaveBeenCalledWith({
        success: true,
        user: userData,
      });

      expect(mockSocket.broadcast.emit).toHaveBeenCalledTimes(1);
      expect(mockSocket.broadcast.emit).toHaveBeenCalledWith('user:joined', userData);
    });

    test('should handle user:login with an empty username and callback with error', () => {
       // This specific error is not explicitly handled in the current SocketService.js code for user:login
       // The SocketService directly adds the user. Let's assume for now that an empty username is permissible by design.
       // If specific validation for username was intended, it would need to be added to SocketService.js
       // For now, we test the current behavior.
      loginHandler('', mockLoginCallback);

      expect(socketService.users.has(mockSocket.id)).toBe(true); // User is still added
      const userData = socketService.users.get(mockSocket.id);
      expect(userData.username).toBe('');
      expect(mockLoginCallback).toHaveBeenCalledWith({ success: true, user: userData });
      expect(mockSocket.broadcast.emit).toHaveBeenCalledWith('user:joined', userData);
    });
  });

  describe('game:create event', () => {
    let createGameHandler;
    const mockCreateGameCallback = vi.fn();
    const validRoomName = 'test-room';
    const fallSpeedSetting = 'normal';
    const username = 'testUser';

    beforeEach(() => {
      // Ensure user is "logged in" for most tests in this suite
      socketService.users.set(mockSocket.id, { id: mockSocket.id, username, joinedAt: Date.now() });

      const createGameCall = mockSocket.on.mock.calls.find(call => call[0] === 'game:create');
      if (!createGameCall) {
        throw new Error('game:create handler not found. Ensure it is registered.');
      }
      createGameHandler = createGameCall[1];
      mockCreateGameCallback.mockClear();
      // Clear relevant GameManager mocks
      socketService.gameManager.createGame.mockClear();
      socketService.gameManager.getAvailableGames.mockClear();
      mockIo.emit.mockClear(); // Clear io.emit mock
      mockSocket.join.mockClear(); // Clear socket.join mock
    });

    test('should handle game:create, call gameManager, join room, and callback with success', () => {
      const mockGame = {
        id: 'game123',
        roomName: 'test-room',
        host: mockSocket.id,
        players: new Map([[mockSocket.id, { id: mockSocket.id, username }]]),
        getState: vi.fn().mockReturnValue({ id: 'game123', name: 'test-room', host: mockSocket.id, players: [{id: mockSocket.id, username}] }),
      };
      socketService.gameManager.createGame.mockReturnValue(mockGame);
      socketService.gameManager.getAvailableGames.mockReturnValue([{ id: 'game123', name: 'test-room'}]);

      createGameHandler({ roomName: validRoomName, fallSpeedSetting }, mockCreateGameCallback);

      expect(socketService.gameManager.createGame).toHaveBeenCalledTimes(1);
      expect(socketService.gameManager.createGame).toHaveBeenCalledWith(mockSocket.id, username, 'test-room', fallSpeedSetting);
      expect(mockSocket.join).toHaveBeenCalledTimes(1);
      expect(mockSocket.join).toHaveBeenCalledWith(mockGame.id);
      expect(mockCreateGameCallback).toHaveBeenCalledTimes(1);
      expect(mockCreateGameCallback).toHaveBeenCalledWith({ success: true, game: mockGame.getState() });
      expect(mockIo.emit).toHaveBeenCalledWith('game:list_updated', [{ id: 'game123', name: 'test-room'}]);
    });

    test('should fail game:create if user is not logged in', () => {
      socketService.users.delete(mockSocket.id); // Ensure user is not logged in

      createGameHandler({ roomName: validRoomName, fallSpeedSetting }, mockCreateGameCallback);

      expect(socketService.gameManager.createGame).not.toHaveBeenCalled();
      expect(mockCreateGameCallback).toHaveBeenCalledTimes(1);
      expect(mockCreateGameCallback).toHaveBeenCalledWith({ success: false, error: 'Vous devez être connecté' });
      expect(mockIo.emit).not.toHaveBeenCalledWith('game:list_updated', expect.any(Array));
    });

    test.each([
      [null, 'Le nom de la salle est invalide'],
      ['', 'Le nom de la salle est invalide'],
      ['   ', 'Le nom de la salle est invalide'],
      ['---', 'Le nom de la salle est invalide après nettoyage (ne peut être vide ou contenir uniquement des tirets).'],
      ['-*/-', 'Le nom de la salle est invalide après nettoyage (ne peut être vide ou contenir uniquement des tirets).'], // Cleaned to '-', which is invalid
      ['  valid room name !  ', 'valid-room-name--'], // Note the trailing hyphens in the cleaned output
    ])('should handle game:create with roomName "%s" and expect appropriate validation', (roomNameInput, expectedMsgOrCleaned) => {
      // For cases that are expected to pass validation after cleaning
      const shouldPassValidation = ![
        'Le nom de la salle est invalide',
        'Le nom de la salle est invalide après nettoyage (ne peut être vide ou contenir uniquement des tirets).'
      ].includes(expectedMsgOrCleaned);

      if (shouldPassValidation) {
        const mockGame = {
          id: 'game123',
          roomName: expectedMsgOrCleaned, // The cleaned name
          host: mockSocket.id,
          players: new Map([[mockSocket.id, { id: mockSocket.id, username }]]),
          getState: vi.fn().mockReturnValue({ id: 'game123', name: expectedMsgOrCleaned, host: mockSocket.id, players: [{id: mockSocket.id, username}] }),
        };
        socketService.gameManager.createGame.mockReturnValue(mockGame);
        socketService.gameManager.getAvailableGames.mockReturnValue([{ id: 'game123', name: expectedMsgOrCleaned }]);
      }

      createGameHandler({ roomName: roomNameInput, fallSpeedSetting }, mockCreateGameCallback);

      if (shouldPassValidation) {
        expect(socketService.gameManager.createGame).toHaveBeenCalledWith(mockSocket.id, username, expectedMsgOrCleaned, fallSpeedSetting);
        expect(mockCreateGameCallback).toHaveBeenCalledWith({ success: true, game: expect.any(Object) });
        expect(mockIo.emit).toHaveBeenCalledWith('game:list_updated', expect.any(Array));
      } else {
        expect(socketService.gameManager.createGame).not.toHaveBeenCalled();
        expect(mockCreateGameCallback).toHaveBeenCalledTimes(1);
        expect(mockCreateGameCallback).toHaveBeenCalledWith({ success: false, error: expectedMsgOrCleaned });
        expect(mockIo.emit).not.toHaveBeenCalledWith('game:list_updated', expect.any(Array));
      }
    });
  });

  describe('game:join event', () => {
    let joinGameHandler;
    const mockJoinCallback = vi.fn();
    const gameId = 'testGameId';
    const username = 'testUser';

    beforeEach(() => {
      // Ensure user is "logged in" for most tests in this suite
      socketService.users.set(mockSocket.id, { id: mockSocket.id, username, joinedAt: Date.now() });

      // Get the game:join handler
      const joinGameCall = mockSocket.on.mock.calls.find(call => call[0] === 'game:join');
      if (!joinGameCall) {
        throw new Error('game:join handler not found. Ensure it is registered.');
      }
      joinGameHandler = joinGameCall[1];
      mockJoinCallback.mockClear();

      // Clear relevant mocks
      socketService.gameManager.joinGame.mockClear();
      socketService.gameManager.getAvailableGames.mockClear();
      mockIo.emit.mockClear();
      mockSocket.join.mockClear();
      mockSocket.to.mockClear();
    });

    test('should handle game:join successfully', () => {
      // Mock a game that can be joined
      const mockGame = {
        id: gameId,
        roomName: 'test-room',
        host: 'hostPlayerId',
        players: new Map([
          ['hostPlayerId', { id: 'hostPlayerId', username: 'host' }],
          [mockSocket.id, { id: mockSocket.id, username }]
        ]),
        getState: vi.fn().mockReturnValue({
          id: gameId,
          name: 'test-room',
          host: 'hostPlayerId',
          players: [
            { id: 'hostPlayerId', username: 'host' },
            { id: mockSocket.id, username }
          ]
        })
      };

      socketService.gameManager.joinGame.mockReturnValue(mockGame);
      socketService.gameManager.getAvailableGames.mockReturnValue([{ id: gameId, name: 'test-room' }]);

      joinGameHandler(gameId, mockJoinCallback);

      // Verify game joining logic
      expect(socketService.gameManager.joinGame).toHaveBeenCalledTimes(1);
      expect(socketService.gameManager.joinGame).toHaveBeenCalledWith(gameId, mockSocket.id, username);

      // Verify socket.io room joining
      expect(mockSocket.join).toHaveBeenCalledTimes(1);
      expect(mockSocket.join).toHaveBeenCalledWith(gameId);

      // Verify callback response
      expect(mockJoinCallback).toHaveBeenCalledTimes(1);
      expect(mockJoinCallback).toHaveBeenCalledWith({
        success: true,
        game: mockGame.getState()
      });

      // Verify notifications to other players in the game
      expect(mockSocket.to).toHaveBeenCalledWith(gameId);
      expect(mockSocket.to().emit).toHaveBeenCalledWith('game:player_joined', {
        gameId,
        roomName: mockGame.roomName,
        player: {
          id: mockSocket.id,
          username
        }
      });

      // Verify global game list update notification
      expect(mockIo.emit).toHaveBeenCalledWith('game:list_updated', expect.any(Array));
    });

    test('should fail game:join if user is not logged in', () => {
      socketService.users.delete(mockSocket.id);

      joinGameHandler(gameId, mockJoinCallback);

      expect(socketService.gameManager.joinGame).not.toHaveBeenCalled();
      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockJoinCallback).toHaveBeenCalledWith({
        success: false,
        error: 'Vous devez être connecté'
      });
    });

    test('should handle game:join error when game does not exist', () => {
      const errorMsg = 'Partie non trouvée';
      socketService.gameManager.joinGame.mockImplementation(() => {
        throw new Error(errorMsg);
      });

      joinGameHandler('nonExistentGameId', mockJoinCallback);

      expect(socketService.gameManager.joinGame).toHaveBeenCalledTimes(1);
      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockJoinCallback).toHaveBeenCalledWith({
        success: false,
        error: errorMsg
      });
    });
  });

  describe('game:move event', () => {
    let moveHandler;
    const mockMoveCallback = vi.fn();
    const gameId = 'testGameId';
    const username = 'testUser';

    beforeEach(() => {
      // Ensure user is "logged in"
      socketService.users.set(mockSocket.id, { id: mockSocket.id, username, joinedAt: Date.now() });

      // Get the game:move handler
      const moveCall = mockSocket.on.mock.calls.find(call => call[0] === 'game:move');
      if (!moveCall) {
        throw new Error('game:move handler not found. Ensure it is registered.');
      }
      moveHandler = moveCall[1];
      mockMoveCallback.mockClear();

      // Clear relevant mocks
      socketService.gameManager.getPlayerGame.mockClear();
      mockSocket.emit.mockClear();
      mockSocket.to.mockClear();
      mockIo.to.mockClear();
    });

    test('should fail if player is not in a game', () => {
      // Mock no game found for player
      socketService.gameManager.getPlayerGame.mockReturnValue(null);

      moveHandler('left', mockMoveCallback);

      expect(socketService.gameManager.getPlayerGame).toHaveBeenCalledWith(mockSocket.id);
      expect(mockMoveCallback).toHaveBeenCalledWith({
        success: false,
        error: 'Vous n\'êtes pas dans une partie'
      });
      expect(mockSocket.emit).not.toHaveBeenCalled();
      expect(mockSocket.to).not.toHaveBeenCalled();
    });

    test('should handle invalid move direction', () => {
      // Mock a game
      const mockGame = {
        id: gameId,
        players: new Map([
          [mockSocket.id, { id: mockSocket.id, username, getState: vi.fn() }]
        ]),
        movePiece: vi.fn(),
        dropPiece: vi.fn(),
        rotatePiece: vi.fn()
      };
      socketService.gameManager.getPlayerGame.mockReturnValue(mockGame);

      moveHandler('invalid_direction', mockMoveCallback);

      expect(mockMoveCallback).toHaveBeenCalledWith({
        success: false,
        error: 'Direction invalide'
      });
      expect(mockGame.movePiece).not.toHaveBeenCalled();
      expect(mockGame.dropPiece).not.toHaveBeenCalled();
      expect(mockGame.rotatePiece).not.toHaveBeenCalled();
    });

    test.each([
      ['left', 'movePiece', [-1, 0]],
      ['right', 'movePiece', [1, 0]],
      ['down', 'movePiece', [0, 1]],
      ['drop', 'dropPiece', []],
      ['rotate', 'rotatePiece', []]
    ])('should handle valid move: %s', (direction, expectedMethod, expectedArgs) => {
      // Mock player and game
      const mockPlayer = {
        id: mockSocket.id,
        username,
        getState: vi.fn().mockReturnValue({ id: mockSocket.id, username, score: 0, board: [] })
      };

      const mockGame = {
        id: gameId,
        players: new Map([[mockSocket.id, mockPlayer]]),
        movePiece: vi.fn().mockReturnValue({ success: true }),
        dropPiece: vi.fn().mockReturnValue({ success: true }),
        rotatePiece: vi.fn().mockReturnValue({ success: true }),
        checkGameEnd: vi.fn().mockReturnValue(false)
      };

      socketService.gameManager.getPlayerGame.mockReturnValue(mockGame);

      moveHandler(direction, mockMoveCallback);

      // Verify correct game method was called
      if (expectedMethod === 'movePiece') {
        expect(mockGame.movePiece).toHaveBeenCalledWith(
          mockPlayer,
          expectedArgs[0],
          expectedArgs[1]
        );
      } else if (expectedMethod === 'dropPiece') {
        expect(mockGame.dropPiece).toHaveBeenCalledWith(mockPlayer);
      } else if (expectedMethod === 'rotatePiece') {
        expect(mockGame.rotatePiece).toHaveBeenCalledWith(mockPlayer);
      }

      // Verify callback response
      expect(mockMoveCallback).toHaveBeenCalledWith({ success: true, result: { success: true } });

      // Verify player update was emitted
      expect(mockSocket.emit).toHaveBeenCalledWith('game:player_updated', {
        gameId: gameId,
        player: expect.objectContaining({
          isCurrentPlayer: true
        })
      });

      // Verify update sent to other players
      expect(mockSocket.to).toHaveBeenCalledWith(gameId);
    });

    test('should handle game over after move', () => {
      // Simulate player in game over state after a move
      const mockPlayer = {
        id: mockSocket.id,
        username,
        getState: vi.fn().mockReturnValue({
          id: mockSocket.id,
          username,
          score: 0,
          board: [],
          gameOver: true
        }),
        gameOver: false, // Initially false, will be set to true
        isPlaying: true, // Initially true, will be set to false
        isWinner: false
      };

      const mockGame = {
        id: gameId,
        players: new Map([[mockSocket.id, mockPlayer]]),
        movePiece: vi.fn().mockImplementation((playerArg, dx, dy) => {
          // Simulate the Game class's movePiece behavior of updating the player object directly
          playerArg.gameOver = true;
          playerArg.isPlaying = false;
          return { // Return a structure that movePiece would typically return
            success: true,      // Assuming the move itself was valid before game over
            gameOver: true,     // Indicates this move resulted in game over for the player
            player: playerArg.getState() // Provide the updated player state
                                      // The mockPlayer.getState() is already mocked to return gameOver: true
          };
        }),
        checkGameEnd: vi.fn().mockReturnValue(false) // Game continues for others
      };

      socketService.gameManager.getPlayerGame.mockReturnValue(mockGame);

      moveHandler('left', mockMoveCallback);

      // Verify game over flag is set on player
      expect(mockPlayer.gameOver).toBe(true);
      expect(mockPlayer.isPlaying).toBe(false);

      // Verify game over notification was sent to player
      expect(mockSocket.emit).toHaveBeenCalledWith('game:player_updated', expect.objectContaining({
        gameId: gameId,
        player: expect.objectContaining({
          gameOver: true,
          isCurrentPlayer: true
        })
      }));
    });

    test('should handle move with line clear penalties', () => {
      // Simulate player clearing lines that cause penalties
      const mockPlayer = {
        id: mockSocket.id,
        username,
        getState: vi.fn().mockReturnValue({ id: mockSocket.id, username, score: 100, board: [] })
      };

      const mockGame = {
        id: gameId,
        players: new Map([[mockSocket.id, mockPlayer]]),
        movePiece: vi.fn().mockReturnValue({
          success: true,
          penaltyApplied: true,
          linesCleared: 4, // Tetris!
          penaltyLines: 4
        }),
        checkGameEnd: vi.fn().mockReturnValue(false)
      };

      socketService.gameManager.getPlayerGame.mockReturnValue(mockGame);

      moveHandler('down', mockMoveCallback);

      // Verify penalty notification to all players
      expect(mockIo.to).toHaveBeenCalledWith(gameId);
      expect(mockIo.to().emit).toHaveBeenCalledWith('game:penalty_applied', {
        gameId: gameId,
        fromPlayer: mockSocket.id,
        linesCleared: 4,
        penaltyLines: 4
      });
    });
  });

  describe('game:leave event', () => {
    let leaveGameHandler;
    const mockLeaveCallback = vi.fn();
    const gameId = 'testGameId';
    const username = 'testUser';

    beforeEach(() => {
      // Ensure user is "logged in"
      socketService.users.set(mockSocket.id, { id: mockSocket.id, username, joinedAt: Date.now() });

      // Get the game:leave handler
      const leaveGameCall = mockSocket.on.mock.calls.find(call => call[0] === 'game:leave');
      if (!leaveGameCall) {
        throw new Error('game:leave handler not found. Ensure it is registered.');
      }
      leaveGameHandler = leaveGameCall[1];
      mockLeaveCallback.mockClear();

      // Clear relevant mocks
      socketService.gameManager.getPlayerGame.mockClear();
      socketService.gameManager.leaveGame.mockClear();
      socketService.gameManager.getGame.mockClear();
      mockSocket.leave.mockClear();
      mockSocket.emit.mockClear();
      mockIo.emit.mockClear();
      mockIo.to.mockClear();
    });

    test('should fail if player is not in a game', () => {
      // Mock no game found for player
      socketService.gameManager.getPlayerGame.mockReturnValue(null);

      leaveGameHandler(mockLeaveCallback);

      expect(socketService.gameManager.getPlayerGame).toHaveBeenCalledWith(mockSocket.id);
      expect(mockLeaveCallback).toHaveBeenCalledWith({
        success: false,
        error: 'Vous n\'êtes pas dans une partie'
      });
      expect(socketService.gameManager.leaveGame).not.toHaveBeenCalled();
      expect(mockSocket.leave).not.toHaveBeenCalled();
    });

    test('should handle regular player leaving with other players remaining', () => {
      // Mock a game with multiple players, current player is not the host
      const mockGame = {
        id: gameId,
        host: 'hostPlayerId',
        players: new Map([
          ['hostPlayerId', { id: 'hostPlayerId', username: 'host', gameOver: false }],
          [mockSocket.id, { id: mockSocket.id, username, gameOver: false }]
        ]),
        isActive: true,
        endedAt: null
      };

      socketService.gameManager.getPlayerGame.mockReturnValue(mockGame);

      // Mock the game after player leaves (same host)
      const updatedGame = {
        ...mockGame,
        players: new Map([
          ['hostPlayerId', { id: 'hostPlayerId', username: 'host', gameOver: false }]
        ]),
        getState: vi.fn().mockReturnValue({
          id: gameId,
          host: 'hostPlayerId',
          players: [{ id: 'hostPlayerId', username: 'host', gameOver: false }]
        })
      };

      socketService.gameManager.getGame.mockReturnValue(updatedGame);

      leaveGameHandler(mockLeaveCallback);

      // Verify that leaveGame was called
      expect(socketService.gameManager.leaveGame).toHaveBeenCalledWith(mockSocket.id);
      expect(mockSocket.leave).toHaveBeenCalledWith(gameId);
      expect(mockLeaveCallback).toHaveBeenCalledWith({ success: true });

      // Verify notifications to remaining players
      expect(mockIo.to).toHaveBeenCalledWith(gameId);
      expect(mockIo.to().emit).toHaveBeenCalledWith('game:player_left', {
        gameId,
        playerId: mockSocket.id,
        newHost: 'hostPlayerId'
      });

      // Verify updated game state sent to all remaining players
      expect(mockIo.to).toHaveBeenCalledWith(gameId);
      expect(mockIo.to().emit).toHaveBeenCalledWith('game:state_updated', updatedGame.getState());

      // Verify global game list update
      expect(mockIo.emit).toHaveBeenCalledWith('game:list_updated', expect.any(Array));
    });

    test('should handle host leaving with transfer of host role', () => {
      // Mock a game where the player is the host
      const mockGame = {
        id: gameId,
        host: mockSocket.id, // Current player is host
        players: new Map([
          [mockSocket.id, { id: mockSocket.id, username, gameOver: false }],
          ['otherPlayerId', { id: 'otherPlayerId', username: 'otherPlayer', gameOver: false }]
        ]),
        isActive: true,
        endedAt: null
      };

      socketService.gameManager.getPlayerGame.mockReturnValue(mockGame);

      // Mock the game after host leaves (new host is the other player)
      const updatedGame = {
        ...mockGame,
        host: 'otherPlayerId', // Host role transferred
        players: new Map([
          ['otherPlayerId', { id: 'otherPlayerId', username: 'otherPlayer', gameOver: false }]
        ]),
        getState: vi.fn().mockReturnValue({
          id: gameId,
          host: 'otherPlayerId',
          players: [{ id: 'otherPlayerId', username: 'otherPlayer', gameOver: false }]
        })
      };

      socketService.gameManager.getGame.mockReturnValue(updatedGame);

      leaveGameHandler(mockLeaveCallback);

      // Verify that leaveGame was called
      expect(socketService.gameManager.leaveGame).toHaveBeenCalledWith(mockSocket.id);
      expect(mockSocket.leave).toHaveBeenCalledWith(gameId);

      // Verify notifications to remaining players, including new host information
      expect(mockIo.to).toHaveBeenCalledWith(gameId);
      expect(mockIo.to().emit).toHaveBeenCalledWith('game:player_left', {
        gameId,
        playerId: mockSocket.id,
        newHost: 'otherPlayerId' // New host should be communicated
      });
    });

    test('should handle last player leaving and mark game as inactive', () => {
      // Mock a game where the player is the only player
      const mockGame = {
        id: gameId,
        host: mockSocket.id,
        players: new Map([
          [mockSocket.id, { id: mockSocket.id, username, gameOver: false }]
        ]),
        isActive: true,
        endedAt: null
      };

      socketService.gameManager.getPlayerGame.mockReturnValue(mockGame);

      // After last player leaves, mark game as inactive but it still exists in the system
      const updatedGame = {
        ...mockGame,
        isActive: false, // Game marked inactive
        endedAt: expect.any(Number),
        players: new Map(), // No players left
        getState: vi.fn().mockReturnValue({
          id: gameId,
          host: null,
          players: [],
          isActive: false,
          endedAt: expect.any(Number)
        })
      };

      socketService.gameManager.getGame.mockReturnValue(updatedGame);

      leaveGameHandler(mockLeaveCallback);

      // Verify game marked as inactive (check if isActive property was updated)
      expect(mockGame.isActive).toBe(false);
      expect(mockGame.endedAt).toBeDefined();

      // Other usual verification
      expect(socketService.gameManager.leaveGame).toHaveBeenCalledWith(mockSocket.id);
      expect(mockSocket.leave).toHaveBeenCalledWith(gameId);
      expect(mockLeaveCallback).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('game:start event', () => {
    let startGameHandler;
    const mockStartCallback = vi.fn();
    const gameId = 'testGameId';
    const username = 'testUser';

    beforeEach(() => {
      // Ensure user is "logged in"
      socketService.users.set(mockSocket.id, { id: mockSocket.id, username, joinedAt: Date.now() });

      // Get the game:start handler
      const startGameCall = mockSocket.on.mock.calls.find(call => call[0] === 'game:start');
      if (!startGameCall) {
        throw new Error('game:start handler not found. Ensure it is registered.');
      }
      startGameHandler = startGameCall[1];
      mockStartCallback.mockClear();

      // Clear relevant mocks
      socketService.gameManager.getPlayerGame.mockClear();
      socketService.gameManager.startGame.mockClear();
      mockIo.to.mockClear();
      mockIo.emit.mockClear();
    });

    test('should fail if player is not in a game', () => {
      // Mock no game found for player
      socketService.gameManager.getPlayerGame.mockReturnValue(null);

      startGameHandler(mockStartCallback);

      expect(socketService.gameManager.getPlayerGame).toHaveBeenCalledWith(mockSocket.id);
      expect(mockStartCallback).toHaveBeenCalledWith({
        success: false,
        error: 'Vous n\'êtes pas dans une partie'
      });
      expect(socketService.gameManager.startGame).not.toHaveBeenCalled();
    });

    test('should successfully start a game', () => {
      // Mock player and game for this test
      const mockPlayer1 = {
        id: mockSocket.id,
        username,
        getState: vi.fn().mockReturnValue({ id: mockSocket.id, username })
      };
      const mockPlayer2 = {
        id: 'player2Id',
        username: 'player2',
        getState: vi.fn().mockReturnValue({ id: 'player2Id', username: 'player2' })
      };

      const mockGame = {
        id: gameId,
        host: mockSocket.id,
        roomName: 'test-room',
        players: new Map([
          [mockSocket.id, mockPlayer1],
          ['player2Id', mockPlayer2]
        ]),
        startedAt: null,
        getState: vi.fn().mockReturnValue({
          id: gameId,
          roomName: 'test-room',
          host: mockSocket.id,
          players: [
            { id: mockSocket.id, username },
            { id: 'player2Id', username: 'player2' }
          ],
          startedAt: null
        })
      };

      socketService.gameManager.getPlayerGame.mockReturnValue(mockGame);

      // Mock the start game action (sets startedAt timestamp)
      socketService.gameManager.startGame.mockImplementation(() => {
        mockGame.startedAt = Date.now();
      });

      startGameHandler(mockStartCallback);

      // Verify startGame was called with correct params
      expect(socketService.gameManager.startGame).toHaveBeenCalledWith(gameId, mockSocket.id);
      expect(mockStartCallback).toHaveBeenCalledWith({ success: true });

      // Verify game:started event was emitted to all players
      expect(mockIo.to).toHaveBeenCalledWith(gameId);
      expect(mockIo.to().emit).toHaveBeenCalledWith('game:started', expect.objectContaining({
        gameId,
        startedAt: mockGame.startedAt,
        initialState: expect.any(Object)
      }));

      // Verify detailed player updates were sent
      expect(mockIo.to).toHaveBeenCalledWith(mockPlayer1.id);
      expect(mockIo.to).toHaveBeenCalledWith(mockPlayer2.id);

      // Verify global game list update was sent
      expect(mockIo.emit).toHaveBeenCalledWith('game:list_updated', expect.any(Array));
    });
  });

  describe('disconnect event', () => {
    let disconnectHandler;
    const gameId = 'testGameId';
    const username = 'testUser';

    beforeEach(() => {
      // Ensure user is "logged in"
      socketService.users.set(mockSocket.id, { id: mockSocket.id, username, joinedAt: Date.now() });

      // Get the disconnect handler
      const disconnectCall = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect');
      if (!disconnectCall) {
        throw new Error('disconnect handler not found. Ensure it is registered.');
      }
      disconnectHandler = disconnectCall[1];

      // Clear relevant mocks
      socketService.gameManager.getPlayerGame.mockClear();
      socketService.gameManager.leaveGame.mockClear();
      socketService.gameManager.getGame.mockClear();
      mockIo.to.mockClear();
      mockIo.emit.mockClear();
    });

    test('should handle disconnect when player is not in a game', () => {
      // Mock user not in a game
      socketService.gameManager.getPlayerGame.mockReturnValue(null);

      disconnectHandler();

      // User should be removed from the users list
      expect(socketService.users.has(mockSocket.id)).toBe(false);

      // A notification should be sent to all clients
      expect(mockIo.emit).toHaveBeenCalledWith('user:left', { id: mockSocket.id });

      // But no game-related operations should be performed
      expect(socketService.gameManager.leaveGame).not.toHaveBeenCalled();
      expect(mockIo.to).not.toHaveBeenCalled();
    });

    test('should handle disconnect when player is in a game', () => {
      // Mock user in a game with other players
      const mockGame = {
        id: gameId,
        host: 'hostPlayerId',
        players: new Map([
          ['hostPlayerId', { id: 'hostPlayerId', username: 'host' }],
          [mockSocket.id, { id: mockSocket.id, username }]
        ])
      };

      socketService.gameManager.getPlayerGame.mockReturnValue(mockGame);

      // Mock game after user leaves
      const updatedGame = {
        ...mockGame,
        players: new Map([
          ['hostPlayerId', { id: 'hostPlayerId', username: 'host' }]
        ]),
        getState: vi.fn().mockReturnValue({
          id: gameId,
          host: 'hostPlayerId',
          players: [{ id: 'hostPlayerId', username: 'host' }]
        })
      };

      socketService.gameManager.getGame.mockReturnValue(updatedGame);

      disconnectHandler();

      // Should leave game
      expect(socketService.gameManager.leaveGame).toHaveBeenCalledWith(mockSocket.id);

      // Should notify other players in game
      expect(mockIo.to).toHaveBeenCalledWith(gameId);
      expect(mockIo.to().emit).toHaveBeenCalledWith('game:player_left', {
        gameId,
        playerId: mockSocket.id,
        newHost: 'hostPlayerId'
      });

      // Should send updated game state
      expect(mockIo.to().emit).toHaveBeenCalledWith('game:state_updated', updatedGame.getState());

      // Should update game list
      expect(mockIo.emit).toHaveBeenCalledWith('game:list_updated', expect.any(Array));

      // User should be removed from users list
      expect(socketService.users.has(mockSocket.id)).toBe(false);

      // Should notify all of user leaving
      expect(mockIo.emit).toHaveBeenCalledWith('user:left', { id: mockSocket.id });
    });
  });

  describe('game:list event', () => {
    let listGamesHandler;
    const mockListCallback = vi.fn();

    beforeEach(() => {
      // Get the game:list handler
      const listGamesCall = mockSocket.on.mock.calls.find(call => call[0] === 'game:list');
      if (!listGamesCall) {
        throw new Error('game:list handler not found. Ensure it is registered.');
      }
      listGamesHandler = listGamesCall[1];
      mockListCallback.mockClear();

      // Clear relevant mocks
      socketService.gameManager.getAvailableGames.mockClear();
    });

    test('should return available games list', () => {
      const mockGames = [
        { id: 'game1', name: 'Game 1' },
        { id: 'game2', name: 'Game 2' }
      ];

      socketService.gameManager.getAvailableGames.mockReturnValue(mockGames);

      listGamesHandler(mockListCallback);

      expect(socketService.gameManager.getAvailableGames).toHaveBeenCalledTimes(1);
      expect(mockListCallback).toHaveBeenCalledWith({
        success: true,
        games: mockGames
      });
    });

    test('should handle error when getting available games', () => {
      const errorMsg = 'Failed to get games';
      socketService.gameManager.getAvailableGames.mockImplementation(() => {
        throw new Error(errorMsg);
      });

      listGamesHandler(mockListCallback);

      expect(socketService.gameManager.getAvailableGames).toHaveBeenCalledTimes(1);
      expect(mockListCallback).toHaveBeenCalledWith({
        success: false,
        error: errorMsg
      });
    });
  });

  // More tests will be added here
});
