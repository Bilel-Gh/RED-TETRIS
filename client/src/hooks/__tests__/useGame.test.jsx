import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { useGame } from '../useGame';
import { socketService } from '../../services/socketService';
import { vi } from 'vitest';

// Mock socketService
vi.mock('../../services/socketService', () => ({
  socketService: {
    getGames: vi.fn(),
    createGame: vi.fn(),
    joinGame: vi.fn(),
    leaveGame: vi.fn(),
    startGame: vi.fn(),
    restartGame: vi.fn(),
    movePiece: vi.fn(),
    isConnected: true,
    isAuth: true
  }
}));

const mockStore = configureStore([]);

describe('useGame Hook', () => {
  let store;
  let wrapper;

  beforeEach(() => {
    store = mockStore({
      game: {
        gameList: [],
        currentGame: null,
        gameState: {
          isActive: false,
          playerStates: {},
          startedAt: null
        },
        players: [],
        status: 'idle',
        error: null,
        gameResults: null
      },
      auth: {
        user: {
          id: 'user1'
        }
      }
    });

    wrapper = ({ children }) => (
      <Provider store={store}>
        {children}
      </Provider>
    );
  });

  it('should get games list', async () => {
    const mockGames = [{ id: 1, name: 'Game 1' }];
    socketService.getGames.mockResolvedValueOnce({ success: true, games: mockGames });

    const { result } = renderHook(() => useGame(), { wrapper });

    await act(async () => {
      await result.current.getGames();
    });

    expect(socketService.getGames).toHaveBeenCalled();
    expect(store.getActions()).toContainEqual(expect.objectContaining({
      type: 'game/fetchGamesSuccess',
      payload: mockGames
    }));
  });

  it('should create a game', async () => {
    const mockResponse = { success: true, game: { id: 1, name: 'New Game' } };
    socketService.createGame.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useGame(), { wrapper });

    await act(async () => {
      await result.current.createGame('New Game', 'normal');
    });

    expect(socketService.createGame).toHaveBeenCalledWith('New Game', 'normal');
  });

  it('should join a game', async () => {
    const mockResponse = { success: true };
    socketService.joinGame.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useGame(), { wrapper });

    await act(async () => {
      await result.current.joinGame('game1');
    });

    expect(socketService.joinGame).toHaveBeenCalledWith('game1');
  });

  it('should handle game movements', async () => {
    const { result } = renderHook(() => useGame(), { wrapper });

    await act(async () => {
      await result.current.moveLeft();
      await result.current.moveRight();
      await result.current.moveDown();
      await result.current.rotate();
      await result.current.drop();
    });

    expect(socketService.movePiece).toHaveBeenCalledWith('left');
    expect(socketService.movePiece).toHaveBeenCalledWith('right');
    expect(socketService.movePiece).toHaveBeenCalledWith('down');
    expect(socketService.movePiece).toHaveBeenCalledWith('rotate');
    expect(socketService.movePiece).toHaveBeenCalledWith('drop');
  });

  it('should check if player can restart game', () => {
    store = mockStore({
      game: {
        currentGame: { host: 'user1' },
        gameState: {
          isActive: false,
          startedAt: Date.now()
        },
        players: [{ id: 'user1' }]
      },
      auth: {
        user: {
          id: 'user1'
        }
      }
    });

    const { result } = renderHook(() => useGame(), { wrapper });
    expect(result.current.canRestartGame()).toBe(true);
  });

  it('should check if current player is game over', () => {
    store = mockStore({
      game: {
        gameState: {
          playerStates: {
            'user1': { gameOver: true }
          }
        }
      },
      auth: {
        user: {
          id: 'user1'
        }
      }
    });

    const { result } = renderHook(() => useGame(), { wrapper });
    expect(result.current.isCurrentPlayerGameOver()).toBe(true);
  });

  it('should check if all players are game over', () => {
    store = mockStore({
      game: {
        gameState: {
          playerStates: {
            'user1': { gameOver: true },
            'user2': { gameOver: true }
          }
        }
      },
      auth: {
        user: {
          id: 'user1'
        }
      }
    });

    const { result } = renderHook(() => useGame(), { wrapper });
    expect(result.current.isAllPlayersGameOver()).toBe(true);
  });

  it('should handle game start with error', async () => {
    socketService.isConnected = false;
    const { result } = renderHook(() => useGame(), { wrapper });

    await act(async () => {
      const response = await result.current.startGame();
      expect(response.success).toBe(false);
      expect(response.error).toContain('Connexion au serveur perdue');
    });
  });

  it('should handle game restart with error', async () => {
    socketService.isConnected = false;
    const { result } = renderHook(() => useGame(), { wrapper });

    await act(async () => {
      const response = await result.current.restartGame();
      expect(response.success).toBe(false);
      expect(response.error).toContain('Connexion au serveur perdue');
    });
  });
});
