// src/__tests__/services/socketService.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Socket.io
const mockSocket = {
  connected: false,
  auth: false,
  id: 'mock-socket-id',
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  once: vi.fn(),
  removeAllListeners: vi.fn()
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket)
}));

// Mock Redux actions
vi.mock('../features/authSlice', () => ({
  loginSuccess: vi.fn(() => ({ type: 'auth/loginSuccess' })),
  loginFailure: vi.fn(() => ({ type: 'auth/loginFailure' }))
}));

vi.mock('../features/gameSlice', () => ({
  fetchGamesSuccess: vi.fn(() => ({ type: 'game/fetchGamesSuccess' })),
  fetchGamesFailure: vi.fn(() => ({ type: 'game/fetchGamesFailure' })),
  createGameSuccess: vi.fn(() => ({ type: 'game/createGameSuccess' })),
  createGameFailure: vi.fn(() => ({ type: 'game/createGameFailure' })),
  joinGameSuccess: vi.fn(() => ({ type: 'game/joinGameSuccess' })),
  joinGameFailure: vi.fn(() => ({ type: 'game/joinGameFailure' })),
  playerJoined: vi.fn(() => ({ type: 'game/playerJoined' })),
  playerLeft: vi.fn(() => ({ type: 'game/playerLeft' })),
  updateGameState: vi.fn(() => ({ type: 'game/updateGameState' })),
  gameStarted: vi.fn(() => ({ type: 'game/gameStarted' })),
  gameOver: vi.fn(() => ({ type: 'game/gameOver' })),
  playerGameOver: vi.fn(() => ({ type: 'game/playerGameOver' })),
  penaltyApplied: vi.fn(() => ({ type: 'game/penaltyApplied' })),
  gameWinner: vi.fn(() => ({ type: 'game/gameWinner' })),
  gameRestarted: vi.fn(() => ({ type: 'game/gameRestarted' }))
}));

// Import après mocking
import * as socketService from '../services/socketService';
import { io } from 'socket.io-client';

// Mock store
const mockStore = {
  dispatch: vi.fn(),
  getState: vi.fn(() => ({
    auth: { isAuthenticated: false, user: null },
    game: { players: [] }
  }))
};

describe('Socket Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketService.resetSocketState();

    // Reset mock socket
    mockSocket.connected = false;
    mockSocket.auth = false;
    mockSocket.emit.mockClear();
    mockSocket.on.mockClear();
    mockSocket.once.mockClear();
    mockSocket.connect.mockClear();

    // Connecter le store au début de chaque test
    socketService.connect(mockStore);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('should reset socket state', () => {
      expect(socketService.socketService.isConnected).toBe(false);
      expect(socketService.socketService.isAuth).toBe(false);
      expect(socketService.socketService.getUserId()).toBe(null);
    });

    it('should establish socket connection', () => {
      expect(io).toHaveBeenCalledWith('http://localhost:3001', expect.objectContaining({
        reconnectionDelayMax: 5000,
        reconnection: true,
        reconnectionAttempts: 3,
        timeout: 10000,
        transports: ['websocket', 'polling']
      }));
    });

    it('should setup event listeners', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('game:started', expect.any(Function));
    });

    it('should prevent duplicate connections', () => {
      const initialCallCount = io.mock.calls.length;
      socketService.connect(mockStore);
      socketService.connect(mockStore);

      // Should not increase call count
      expect(io.mock.calls.length).toBe(initialCallCount);
    });
  });

  describe('Authentication - Success Cases', () => {
    beforeEach(() => {
      mockSocket.connected = true;
    });

    it('should handle successful login', async () => {
      const username = 'testuser';
      const mockResponse = { success: true, user: { id: 'user123', username } };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'user:login' && typeof callback === 'function') {
          setTimeout(() => callback(mockResponse), 0);
        }
      });

      const result = await socketService.login(username);
      expect(result).toEqual(mockResponse);
    });

    it('should handle login failure', async () => {
      const username = 'testuser';
      const mockResponse = { success: false, error: 'Username taken' };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'user:login' && typeof callback === 'function') {
          setTimeout(() => callback(mockResponse), 0);
        }
      });

      await expect(socketService.login(username)).rejects.toEqual(mockResponse);
    });
  });

  describe('Game Operations - Success Cases', () => {
    beforeEach(() => {
      mockSocket.connected = true;
    });

    it('should fetch games successfully', async () => {
      const mockResponse = { success: true, games: [{ id: 'game1' }] };

      mockSocket.emit.mockImplementation((event, callback) => {
        if (event === 'game:list' && typeof callback === 'function') {
          setTimeout(() => callback(mockResponse), 0);
        }
      });

      const result = await socketService.getGames();
      expect(result).toEqual(mockResponse);
    });

    it('should leave game successfully', async () => {
      const mockResponse = { success: true };

      mockSocket.emit.mockImplementation((event, callback) => {
        if (event === 'game:leave' && typeof callback === 'function') {
          setTimeout(() => callback(mockResponse), 0);
        }
      });

      const result = await socketService.leaveGame();
      expect(result).toEqual(mockResponse);
    });

    it('should start game when authenticated', async () => {
      mockSocket.auth = true;
      const mockResponse = { success: true };

      mockSocket.emit.mockImplementation((event, callback) => {
        if (event === 'game:start' && typeof callback === 'function') {
          setTimeout(() => callback(mockResponse), 0);
        }
      });

      const result = await socketService.startGame();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Game Operations - Error Cases', () => {
    it('should reject start game if not connected', async () => {
      vi.useFakeTimers();
      mockSocket.connected = false;

      const startGamePromise = socketService.startGame();
      vi.advanceTimersByTime(6000);

      await expect(startGamePromise).rejects.toEqual({
        success: false,
        error: 'Délai de connexion dépassé'
      });
    });

    it('should reject start game if not authenticated', async () => {
      mockSocket.connected = true;
      mockSocket.auth = false;

      await expect(socketService.startGame()).rejects.toEqual({
        success: false,
        error: 'Vous n\'êtes pas authentifié. Veuillez vous reconnecter.'
      });
    });

    it('should handle getGames failure', async () => {
      mockSocket.connected = true;
      const mockResponse = { success: false, error: 'Server error' };

      mockSocket.emit.mockImplementation((event, callback) => {
        if (event === 'game:list' && typeof callback === 'function') {
          setTimeout(() => callback(mockResponse), 0);
        }
      });

      await expect(socketService.getGames()).rejects.toEqual(mockResponse);
    });
  });

  describe('Piece Movement', () => {
    beforeEach(() => {
      mockSocket.connected = true;
      mockSocket.auth = true;
    });

    it('should move piece successfully', async () => {
      const mockResponse = { success: true, result: { moved: true } };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'game:move' && typeof callback === 'function') {
          setTimeout(() => callback(mockResponse), 0);
        }
      });

      const result = await socketService.movePiece('left');
      expect(result).toEqual(mockResponse);
    });

    it('should handle move failure', async () => {
      const mockResponse = { success: false, error: 'Invalid move' };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'game:move' && typeof callback === 'function') {
          setTimeout(() => callback(mockResponse), 0);
        }
      });

      const result = await socketService.movePiece('left');
      expect(result).toEqual(mockResponse);
    });

    it('should reject if not authenticated', async () => {
      mockSocket.auth = false;

      const result = await socketService.movePiece('left');
      expect(result.success).toBe(false);
      expect(result.error).toContain('connecté');
    });

    it('should handle game over message', async () => {
      const mockResponse = {
        success: true,
        result: { moved: false },
        message: 'Game Over'
      };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'game:move' && typeof callback === 'function') {
          setTimeout(() => callback(mockResponse), 0);
        }
      });

      const result = await socketService.movePiece('left');
      expect(result.success).toBe(true);
      expect(result.result).toEqual({ moved: false });
      expect(result.message).toBe('Game Over');
    });
  });

  describe('Connection Management', () => {
    it('should test connection when connected', () => {
      mockSocket.connected = true;

      socketService.testConnection();

      expect(mockSocket.emit).toHaveBeenCalledWith('ping', expect.any(Number), expect.any(Function));
    });

    it('should not test connection when disconnected', () => {
      mockSocket.connected = false;
      mockSocket.emit.mockClear();

      socketService.testConnection();

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should handle disconnection', () => {
      expect(() => socketService.disconnect()).not.toThrow();
    });

    it('should handle null socket disconnection', () => {
      socketService.resetSocketState();
      expect(() => socketService.disconnect()).not.toThrow();
    });
  });

  describe('Event Handlers', () => {
    it('should register game event handlers', () => {
      const gameEvents = [
        'game:list_updated',
        'game:player_joined',
        'game:player_left',
        'game:state_updated',
        'game:started',
        'game:over',
        'game:winner'
      ];

      gameEvents.forEach(event => {
        expect(mockSocket.on).toHaveBeenCalledWith(event, expect.any(Function));
      });
    });

    it('should register connection event handlers', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should handle game list update event', () => {
      const mockGames = [{ id: 'game1' }];
      const handler = mockSocket.on.mock.calls.find(call => call[0] === 'game:list_updated')[1];

      expect(() => handler(mockGames)).not.toThrow();
    });

    it('should handle player joined event', () => {
      const mockData = { player: { id: 'player1', username: 'newplayer' } };
      const handler = mockSocket.on.mock.calls.find(call => call[0] === 'game:player_joined')[1];

      expect(() => handler(mockData)).not.toThrow();
    });

    it('should handle disconnect event', () => {
      const handler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];

      expect(() => handler('server disconnect')).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle connection with null store', () => {
      expect(() => socketService.connect(null)).not.toThrow();
    });

    it('should handle emit without callback', () => {
      mockSocket.emit.mockImplementation(() => {});
      expect(() => socketService.testConnection()).not.toThrow();
    });

    it('should handle malformed response in getGames', async () => {
      mockSocket.connected = true;

      mockSocket.emit.mockImplementation((event, callback) => {
        if (event === 'game:list' && typeof callback === 'function') {
          setTimeout(() => callback(null), 0);
        }
      });

      await expect(socketService.getGames()).rejects.toBeTruthy();
    });

    it('should handle connection errors gracefully', () => {
      const mockError = new Error('Connection failed');
      const handler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')[1];

      expect(() => handler(mockError)).not.toThrow();
    });
  });

  describe('Service State and Utilities', () => {
    it('should return initial user ID as null', () => {
      expect(socketService.socketService.getUserId()).toBe(null);
    });

    it('should expose service methods', () => {
      const service = socketService.socketService;

      expect(typeof service.connect).toBe('function');
      expect(typeof service.login).toBe('function');
      expect(typeof service.getGames).toBe('function');
      expect(typeof service.createGame).toBe('function');
      expect(typeof service.joinGame).toBe('function');
      expect(typeof service.leaveGame).toBe('function');
      expect(typeof service.startGame).toBe('function');
      expect(typeof service.movePiece).toBe('function');
      expect(typeof service.disconnect).toBe('function');
    });

    it('should handle ensureConnection when connected', async () => {
      mockSocket.connected = true;
      await expect(socketService.ensureConnection()).resolves.toBeUndefined();
    });
  });

  describe('Advanced Game Operations', () => {
    beforeEach(() => {
      mockSocket.connected = true;
    });

    it('should create game successfully', async () => {
      const mockGame = { id: 'game123', name: 'Test Room', players: [] };
      const mockResponse = { success: true, game: mockGame };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'game:create' && typeof callback === 'function') {
          setTimeout(() => callback(mockResponse), 0);
        }
      });

      const result = await socketService.createGame('Test Room', 'normal');
      expect(result.success).toBe(true);
      expect(result.game).toEqual(mockGame);
    });

    it('should join game successfully', async () => {
      const mockGame = { id: 'game123', players: [] };
      const mockResponse = { success: true, game: mockGame };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'game:join' && typeof callback === 'function') {
          setTimeout(() => callback(mockResponse), 0);
        }
      });

      const result = await socketService.joinGame('game123');
      expect(result.success).toBe(true);
    });

    it('should handle create game failure', async () => {
      const mockResponse = { success: false, error: 'Room exists' };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'game:create' && typeof callback === 'function') {
          setTimeout(() => callback(mockResponse), 0);
        }
      });

      await expect(socketService.createGame('Test', 'normal')).rejects.toEqual(mockResponse);
    });

    it('should handle join game failure', async () => {
      const mockResponse = { success: false, error: 'Game full' };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'game:join' && typeof callback === 'function') {
          setTimeout(() => callback(mockResponse), 0);
        }
      });

      await expect(socketService.joinGame('game123')).rejects.toEqual(mockResponse);
    });
  });

  describe('Timeout Handling', () => {
    beforeEach(() => {
      mockSocket.connected = true;
      mockSocket.auth = true;
    });

    it('should handle move piece immediate response', async () => {
      const mockResponse = { success: true, result: { moved: true } };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'game:move' && typeof callback === 'function') {
          setTimeout(() => callback(mockResponse), 0);
        }
      });

      const result = await socketService.movePiece('left');
      expect(result.success).toBe(true);
      expect(result.result).toEqual({ moved: true });
    });

    it('should handle auto move immediate response', async () => {
      const mockResponse = { success: true, result: { moved: true } };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'game:move' && typeof callback === 'function') {
          setTimeout(() => callback(mockResponse), 0);
        }
      });

      const result = await socketService.movePiece('down', true);
      expect(result.success).toBe(true);
      expect(result.result).toEqual({ moved: true });
    });
  });

  describe('leaveGame Scenarios', () => {
    beforeEach(() => {
      mockSocket.connected = true;
    });

    it('should handle leaveGame failing with error', async () => {
      mockSocket.emit.mockImplementation((event, callback) => {
        if (event === 'game:leave' && typeof callback === 'function') {
          setTimeout(() => callback({ success: false, error: 'Server forced error' }), 0);
        }
      });

      await expect(socketService.leaveGame()).rejects.toEqual({
        success: false,
        error: 'Server forced error'
      });
    });

    it('should handle leaveGame immediate response', async () => {
      const mockResponse = { success: true };

      mockSocket.emit.mockImplementation((event, callback) => {
        if (event === 'game:leave' && typeof callback === 'function') {
          setTimeout(() => callback(mockResponse), 0);
        }
      });

      const result = await socketService.leaveGame();
      expect(result.success).toBe(true);
    });
  });

  describe('startGame Retries and Edge Cases', () => {
    beforeEach(() => {
      mockSocket.connected = true;
      mockSocket.auth = true;
    });

    it('should handle startGame failing with a server error response (no retry)', async () => {
      mockSocket.emit.mockImplementation((event, callback) => {
        if (event === 'game:start' && typeof callback === 'function') {
          setTimeout(() => callback({ success: false, error: 'Game already started' }), 0);
        }
      });

      await expect(socketService.startGame()).rejects.toEqual({
        success: false,
        error: 'Game already started'
      });
    });

    it('should handle movePiece throwing during ensureConnection', async () => {
      vi.useFakeTimers();
      mockSocket.connected = false;

      const movePiecePromise = socketService.movePiece('left');
      vi.advanceTimersByTime(6000);

      const result = await movePiecePromise;
      expect(result.success).toBe(false);
      expect(result.error).toContain('Délai de connexion dépassé');
    });
  });

  describe('Disconnect Logic', () => {
    it('should handle disconnect when socket is connected', () => {
      mockSocket.connected = true;

      mockSocket.emit.mockImplementation((event, callback) => {
        if (event === 'explicit:disconnect' && typeof callback === 'function') {
          setTimeout(() => {
            callback();
            mockSocket.disconnect();
          }, 0);
        }
      });

      socketService.disconnect();

      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('explicit:disconnect', expect.any(Function));
      expect(mockSocket.auth).toBe(false);
    });

    it('should handle disconnect when socket is not connected', () => {
      mockSocket.connected = false;

      socketService.disconnect();

      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.auth).toBe(false);
    });
  });

  describe('Test Connection Logic', () => {
    it('should handle ping timeout in testConnection', () => {
      vi.useFakeTimers();
      mockSocket.connected = true;

      mockSocket.emit.mockImplementation((event, data, callback) => {
        // Don't call callback to simulate timeout
      });

      socketService.testConnection();

      expect(mockSocket.emit).toHaveBeenCalledWith('ping', expect.any(Number), expect.any(Function));
      vi.advanceTimersByTime(4000);
    });

    it('should handle no response to ping (null response)', () => {
      mockSocket.connected = true;

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'ping' && typeof callback === 'function') {
          setTimeout(() => callback(null), 0);
        }
      });

      socketService.testConnection();
      expect(mockSocket.emit).toHaveBeenCalledWith('ping', expect.any(Number), expect.any(Function));
    });
  });

  describe('ensureConnection Edge Cases', () => {
    it('should reject with timeout if connect event never fires', async () => {
      vi.useFakeTimers();

      mockSocket.connected = false;
      mockSocket.once.mockImplementation((event, callback) => {
        // Don't fire 'connect' or 'connect_error'
      });

      const promise = socketService.ensureConnection();
      vi.advanceTimersByTime(6000);

      await expect(promise).rejects.toEqual(new Error('Délai de connexion dépassé'));
    });
  });
});








