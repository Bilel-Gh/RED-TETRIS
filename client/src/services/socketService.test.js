// src/__tests__/services/socketService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  gameWinner: vi.fn(() => ({ type: 'game/gameWinner' }))
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

    // Toujours connecter le store au début de chaque test
    socketService.connect(mockStore);
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
        if (event === 'user:login') callback(mockResponse);
      });

      const result = await socketService.login(username);
      expect(result).toEqual(mockResponse);
    });

    it('should handle login failure', async () => {
      const username = 'testuser';
      const mockResponse = { success: false, error: 'Username taken' };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'user:login') callback(mockResponse);
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
        if (event === 'game:list') callback(mockResponse);
      });

      const result = await socketService.getGames();
      expect(result).toEqual(mockResponse);
    });

    it('should leave game successfully', async () => {
      const mockResponse = { success: true };

      mockSocket.emit.mockImplementation((event, callback) => {
        if (event === 'game:leave') callback(mockResponse);
      });

      const result = await socketService.leaveGame();
      expect(result).toEqual(mockResponse);
    });

    it('should start game when authenticated', async () => {
      mockSocket.auth = true;
      const mockResponse = { success: true };

      mockSocket.emit.mockImplementation((event, callback) => {
        if (event === 'game:start') callback(mockResponse);
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
      // Advance timers to trigger the timeout within ensureConnection
      vi.advanceTimersByTime(5000);

      await expect(startGamePromise).rejects.toEqual({
        success: false,
        error: 'Délai de connexion dépassé'
      });
      vi.useRealTimers();
    });

    it('should reject start game if not authenticated', async () => {
      mockSocket.connected = true;
      mockSocket.auth = false;

      try {
        const result = await socketService.startGame();
        expect(result.success).toBe(false);
        expect(result.error).toContain('pas authentifié');
      } catch (error) {
        // Si ça rejette avec une erreur, c'est aussi valide
        expect(error.success).toBe(false);
        expect(error.error).toContain('pas authentifié');
      }
    });

    it('should handle getGames failure', async () => {
      mockSocket.connected = true;
      const mockResponse = { success: false, error: 'Server error' };

      mockSocket.emit.mockImplementation((event, callback) => {
        if (event === 'game:list') callback(mockResponse);
      });

      // Attendre l'objet d'erreur complet
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
        if (event === 'game:move') callback(mockResponse);
      });

      const result = await socketService.movePiece('left');
      expect(result).toEqual(mockResponse);
    });

    it('should handle move failure', async () => {
      const mockResponse = { success: false, error: 'Invalid move' };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'game:move') callback(mockResponse);
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
        if (event === 'game:move') callback(mockResponse);
      });

      const result = await socketService.movePiece('left');
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
        if (event === 'game:list') callback(null);
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
        if (event === 'game:create') callback(mockResponse);
      });

      const result = await socketService.createGame('Test Room', 'normal');
      expect(result.success).toBe(true);
      expect(result.game).toEqual(mockGame);
    });

    it('should join game successfully', async () => {
      const mockGame = { id: 'game123', players: [] };
      const mockResponse = { success: true, game: mockGame };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'game:join') callback(mockResponse);
      });

      const result = await socketService.joinGame('game123');
      expect(result.success).toBe(true);
    });

    it('should handle create game failure', async () => {
      const mockResponse = { success: false, error: 'Room exists' };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'game:create') callback(mockResponse);
      });

      await expect(socketService.createGame('Test', 'normal')).rejects.toEqual(mockResponse);
    });

    it('should handle join game failure', async () => {
      const mockResponse = { success: false, error: 'Game full' };

      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'game:join') callback(mockResponse);
      });

      await expect(socketService.joinGame('game123')).rejects.toEqual(mockResponse);
    });
  });

  describe('Timeout Handling (Simplified)', () => {
    beforeEach(() => {
      mockSocket.connected = true;
      mockSocket.auth = true;
    });

    it('should handle move piece timeout with local response', async () => {
      // Mock setTimeout to trigger immediately
      vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback) => {
        callback();
        return 1; // Return a mock timer ID
      });

      mockSocket.emit.mockImplementation(() => {}); // No callback

      const result = await socketService.movePiece('left');
      expect(result.warning).toBeTruthy();

      vi.restoreAllMocks(); // Restore mocks, including setTimeout
    });

    it('should use different timeout for auto moves', async () => {
      vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback) => {
        callback();
        return 1; // Return a mock timer ID
      });

      mockSocket.emit.mockImplementation(() => {});

      const result = await socketService.movePiece('down', true);
      expect(result.warning).toBeTruthy();

      vi.restoreAllMocks(); // Restore mocks
    });
  });

  describe('Socket Service Getters', () => {
    it('should return isAuth correctly', () => {
      expect(socketService.socketService.isAuth).toBe(false);
      mockSocket.auth = true;
      expect(socketService.socketService.isAuth).toBe(true);
    });

    it('should return isConnected correctly', () => {
      expect(socketService.socketService.isConnected).toBe(false);
      mockSocket.connected = true;
      expect(socketService.socketService.isConnected).toBe(true);
    });
  });

  describe('Reconnection Logic', () => {
    it('should schedule reconnection', () => {
      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      socketService.socketService.scheduleReconnection(1000);
      // Check if setTimeout was called with the connect function and the specified delay
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
      // Fast-forward time
      vi.advanceTimersByTime(1000);
      // connect should have been called by now by the timer
      // No direct way to check if connect was called by setTimeout callback without more complex mocking or spies on connect itself
      // For now, we at least confirm the timer was set up.
      setTimeoutSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should clear existing reconnection timer if scheduleReconnection is called again', () => {
      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

      socketService.socketService.scheduleReconnection(1000);
      const firstTimerId = setTimeoutSpy.mock.results[0].value;
      socketService.socketService.scheduleReconnection(2000);
      expect(clearTimeoutSpy).toHaveBeenCalledWith(firstTimerId);
      expect(setTimeoutSpy).toHaveBeenCalledTimes(2); // Called once, then cleared and called again
      vi.advanceTimersByTime(2000);

      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  describe('createGame Error Handling', () => {
    it('should handle createGame throwing an error during ensureConnection', async () => {
      vi.useFakeTimers();
      mockSocket.connected = false; // ensure ensureConnection tries to connect
      const connectionError = new Error('Simulated Connection Failed');

      // Mock io to simulate a connection error
      io.mockImplementationOnce(() => ({
        ...mockSocket,
        connected: false,
        id: 'temp-socket-id',
        connect: vi.fn(() => {
          // Simulate the 'connect_error' event being emitted by the socket
          // Find the listener for 'connect_error' and call it.
          const connectErrorCallback = mockSocket.once.mock.calls.find(call => call[0] === 'connect_error')?.[1];
          if (connectErrorCallback) {
            connectErrorCallback(connectionError);
          }
        }),
        once: vi.fn((event, callback) => {
          // Store the callback for connect_error to be called by connect()
          if (event === 'connect_error') {
            // This setup allows connect() to trigger it
          } else if (event === 'connect'){
            // do nothing for connect, we want error
          }
        }),
        off: vi.fn(), // Add off mock
        removeAllListeners: vi.fn(), // Add removeAllListeners mock
      }));

      const createGamePromise = socketService.createGame('Test Room', 'normal');
      vi.advanceTimersByTime(6000); // Allow microtasks to run, connect() to be called

      await expect(createGamePromise)
        .rejects.toEqual({ success: false, error: 'Délai de connexion dépassé' });
      vi.useRealTimers();
    });
  });

  describe('joinGame Error Handling', () => {
    it('should handle joinGame throwing an error during ensureConnection', async () => {
      vi.useFakeTimers();
      mockSocket.connected = false; // ensure ensureConnection tries to connect
      const connectionError = new Error('Simulated Join Connection Failed');

      io.mockImplementationOnce(() => ({
        ...mockSocket,
        connected: false,
        id: 'temp-socket-id-join',
        connect: vi.fn(() => {
          const connectErrorCallback = mockSocket.once.mock.calls.find(call => call[0] === 'connect_error')?.[1];
          if (connectErrorCallback) {
            connectErrorCallback(connectionError);
          }
        }),
        once: vi.fn((event, callback) => {
          if (event === 'connect_error') {
            // callback will be stored by the mock and called by connect()
          }
        }),
        off: vi.fn(),
        removeAllListeners: vi.fn(),
      }));

      const joinGamePromise = socketService.joinGame('game123');
      vi.advanceTimersByTime(6000);

      await expect(joinGamePromise)
        .rejects.toEqual({ success: false, error: 'Délai de connexion dépassé' });
      vi.useRealTimers();
    });
  });

  describe('leaveGame Scenarios', () => {
    it('should handle leaveGame failing with error', async () => {
      socketService.resetSocketState();
      io.mockReturnValue(mockSocket); // Ensure io() returns the right mock
      socketService.connect(mockStore); // Re-connect to set internal socket state

      mockSocket.connected = true;
      mockSocket.emit.mockImplementation((event, callback) => {
        if (event === 'game:leave') {
          callback({ success: false, error: 'Server forced error' });
        }
      });
      await expect(socketService.leaveGame()).rejects.toEqual({ success: false, error: 'Server forced error' });
    });

    it('should handle leaveGame throwing an error during ensureConnection', async () => {
      vi.useFakeTimers();
      mockSocket.connected = false;
      const connectionError = new Error('Simulated Leave Connection Failed');

      io.mockImplementationOnce(() => ({
        ...mockSocket,
        connected: false,
        id: 'temp-socket-id-leave',
        connect: vi.fn(() => {
          const connectErrorCallback = mockSocket.once.mock.calls.find(call => call[0] === 'connect_error')?.[1];
          if (connectErrorCallback) {
            connectErrorCallback(connectionError);
          }
        }),
        once: vi.fn((event, callback) => {
          if (event === 'connect_error') {
            // Stored by mock
          }
        }),
        off: vi.fn(),
        removeAllListeners: vi.fn(),
      }));
      const leavePromise = socketService.leaveGame();
      vi.advanceTimersByTime(6000);

      await expect(leavePromise)
        .rejects.toEqual({ success: false, error: 'Délai de connexion dépassé' });
      vi.useRealTimers();
    });
  });

  describe('startGame Retries and Edge Cases', () => {
    it('should handle startGame failing with a server error response (no retry)', async () => {
      socketService.resetSocketState();
      io.mockReturnValue(mockSocket);
      socketService.connect(mockStore);

      mockSocket.connected = true;
      mockSocket.auth = true;
      mockSocket.emit.mockImplementation((event, callback) => {
        if (event === 'game:start') {
          callback({ success: false, error: 'Game already started' });
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
      // const connectionError = new Error('Connection failed for movePiece'); // Not directly used as ensureConnection rejects with its own error

      io.mockImplementationOnce(() => ({
        ...mockSocket,
        connected: false,
        id: 'temp-socket-id-move',
        connect: vi.fn(() => {
          // Simulate ensureConnection failing by not resolving connect and letting its internal timeout trigger
          // Or by directly triggering connect_error if the test required a specific error message from connect_error
          // For 'Délai de connexion dépassé', we let the ensureConnection timeout logic handle it.
        }),
        once: vi.fn((event, callback) => {
          if (event === 'connect') {
            // Do not call callback to simulate timeout within ensureConnection
          } else if (event === 'connect_error') {
            // Do not call, let ensureConnection timeout
          }
        }),
        off: vi.fn(),
        removeAllListeners: vi.fn(),
      }));

      const movePiecePromise = socketService.movePiece('left');
      vi.advanceTimersByTime(6000); // Ensure ensureConnection's 5s timeout is passed

      // movePiece catches the ensureConnection error and resolves with { success: false, error: error.message }
      await expect(movePiecePromise)
        .resolves.toEqual({ success: false, error: 'Délai de connexion dépassé' });

      vi.useRealTimers();
    });
  });

  describe('movePiece Edge Cases', () => {
    it('should handle movePiece server error (Partie non active) silently when not autoMove', async () => {
        socketService.resetSocketState();
        io.mockReturnValue(mockSocket);
        socketService.connect(mockStore);

        mockSocket.connected = true;
        mockSocket.auth = true;
        mockSocket.emit.mockImplementation((event, data, callback) => {
            if (event === 'game:move') {
                callback({ success: false, error: 'Partie non active ou terminée' });
            }
        });
        const result = await socketService.movePiece('up', false);
        expect(result).toEqual({ success: false, error: 'Partie non active ou terminée' });
    });

    it('should handle movePiece throwing during ensureConnection', async () => {
      mockSocket.connected = false;

      io.mockImplementationOnce(() => ({
        ...mockSocket,
        connected: false, // Ensure it tries to connect
        id: 'temp-socket-id-move-ensure',
        connect: vi.fn(() => {
          // Simulate connection failure for ensureConnection to timeout
        }),
        once: vi.fn((event, callback) => {
          if (event === 'connect') {
            // Do not call to simulate timeout
          }
        }),
        off: vi.fn(),
        removeAllListeners: vi.fn(),
      }));

      vi.useFakeTimers();
      const movePiecePromise = socketService.movePiece('up');
      vi.advanceTimersByTime(6000); // Ensure ensureConnection timeout (5s)
      // movePiece catches error from ensureConnection and resolves
      await expect(movePiecePromise)
        .resolves.toEqual({ success: false, error: 'Délai de connexion dépassé' });
      vi.useRealTimers();
    });
  });

  describe('Disconnect Logic', () => {
    it('should handle disconnect when socket is connected and emits explicit:disconnect', () => {
      // Explicitly connect here to ensure the module's `socket` is our `mockSocket`
      // for this specific test, overriding any broader beforeEach effects if they were problematic.
      socketService.resetSocketState(); // Ensure clean state before this connect
      io.mockReturnValue(mockSocket); // Ensure io() returns the mockSocket
      socketService.connect(mockStore); // Connect using a generic mockStore

      mockSocket.connected = true;
      const emitSpy = vi.spyOn(mockSocket, 'emit').mockImplementation((event, callback) => {
        if (event === 'explicit:disconnect') {
          if (typeof callback === 'function') callback();
          mockSocket.disconnect();
        }
      });
      const removeAllListenersSpy = vi.spyOn(mockSocket, 'removeAllListeners');
      const disconnectSpy = vi.spyOn(mockSocket, 'disconnect');

      socketService.disconnect();
      expect(removeAllListenersSpy).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith('explicit:disconnect', expect.any(Function));
      expect(disconnectSpy).toHaveBeenCalled();
      expect(mockSocket.auth).toBe(false);

      emitSpy.mockRestore();
      removeAllListenersSpy.mockRestore();
      disconnectSpy.mockRestore();
    });

    it('should handle disconnect when socket is not connected (already disconnected state)', () => {
      mockSocket.connected = false;
      socketService.disconnect(); // Call disconnect again
      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled(); // Should still be called
      expect(mockSocket.auth).toBe(false);
    });

    it('should clear reconnectionTimer on disconnect', () => {
      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      socketService.socketService.scheduleReconnection(1000); // Ensure timer is set
      const timerId = setTimeoutSpy.mock.results[0].value;

      socketService.disconnect();
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timerId);
      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  describe('Test Connection Logic', () => {
    it('should handle ping timeout in testConnection', () => {
      vi.useFakeTimers();
      mockSocket.connected = true;
      mockSocket.emit.mockImplementation((_event, _data, _callback) => {
        // Do not call callback to simulate timeout
      });
      socketService.testConnection();
      expect(mockSocket.emit).toHaveBeenCalledWith('ping', expect.any(Number), expect.any(Function));
      vi.advanceTimersByTime(3000); // Trigger ping timeout
      // Check console.error for 'Pas de réponse du serveur au ping (timeout)'
      // This requires spying on console.error, which can be done if needed but adds complexity.
      // For now, ensuring the timeout is handled is the main goal.
      vi.useRealTimers();
    });

    it('should handle no response to ping (null response)', () => {
        mockSocket.connected = true;
        mockSocket.emit.mockImplementation((event, data, callback) => {
            if (event === 'ping') {
                callback(null); // Simulate server responding with null
            }
        });
        socketService.testConnection();
        expect(mockSocket.emit).toHaveBeenCalledWith('ping', expect.any(Number), expect.any(Function));
        // We'd expect a console.error here, similar to the timeout case.
    });
  });

  describe('ensureConnection Edge Cases', () => {
    it('should reject if socket.connect() is not available during ensureConnection', async () => {
      socketService.resetSocketState(); // Ensure socket is null
      // Mock io to return a socket without a connect method initially
      io.mockImplementationOnce(() => ({
        ...mockSocket,
        connected: false,
        connect: undefined, // Simulate connect not being a function
        once: vi.fn(),
        off: vi.fn(),
      }));
       // Connect with a basic store
      socketService.connect(mockStore);

      // Since connect is now synchronous in this path (due to the mocked io),
      // ensureConnection will try to use the faulty socket.
      // This scenario is a bit artificial as io() should always return a compliant socket,
      // but it tests the robustness if the socket object was somehow malformed.
      // The actual error might depend on how `socket.connect()` being undefined is handled.
      // Let's assume it would throw an error when `socket.connect()` is called.
      // To make it more direct, let's ensure `connect` on the *actual mockSocket* is undefined for this test.
      const originalConnect = mockSocket.connect;
      mockSocket.connect = undefined; // Temporarily make connect undefined

      await expect(socketService.ensureConnection()).rejects.toThrow();

      mockSocket.connect = originalConnect; // Restore
    });


    it('should reject with timeout if connect event never fires', async () => {
      vi.useFakeTimers();
      socketService.resetSocketState();
      io.mockImplementationOnce(() => ({
        ...mockSocket,
        connected: false,
        connect: vi.fn(), // Mock connect
        once: vi.fn((_event, _callback) => {
          // Don't fire 'connect' or 'connect_error'
        }),
        off: vi.fn(),
      }));
      socketService.connect(mockStore); // This sets up the socket

      const promise = socketService.ensureConnection();
      vi.advanceTimersByTime(5000); // Advance past the timeout

      await expect(promise).rejects.toEqual(new Error('Délai de connexion dépassé'));
      vi.useRealTimers();
    });
  });

});
