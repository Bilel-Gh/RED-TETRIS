import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useGame } from '../useGame';
import gameReducer from '../../features/gameSlice';
import authReducer from '../../features/authSlice';
import { vi } from 'vitest';

// Mock socketService
vi.mock('../../services/socketService', () => ({
  socketService: {
    getGames: vi.fn().mockResolvedValue({ success: true, games: [] }),
    createGame: vi.fn().mockResolvedValue({ success: true, game: { id: 'game1', name: 'New Game' } }),
    joinGame: vi.fn().mockResolvedValue({ success: true, game: { id: 'game1' } }),
    leaveGame: vi.fn().mockResolvedValue({ success: true }),
    startGame: vi.fn().mockResolvedValue({ success: true }),
    restartGame: vi.fn().mockResolvedValue({ success: true }),
    movePiece: vi.fn().mockResolvedValue({ success: true }),
  }
}));

const createTestStore = (preloadedState) => {
  return configureStore({
    reducer: {
      game: gameReducer,
      auth: authReducer
    },
    preloadedState,
  });
};

const wrapper = ({ children, store }) => <Provider store={store}>{children}</Provider>;

describe('useGame Hook', () => {
  let store;

  beforeEach(() => {
    store = createTestStore({
      auth: {
        user: { id: 'user1' },
        token: 'test-token',
        isAuthenticated: true,
        status: 'idle',
        error: null
      },
      game: {
        status: 'idle',
        error: null,
        gamesList: [],
        currentGame: null,
        gameState: null,
        players: [],
        gameResults: null
      }
    });
    vi.clearAllMocks();
  });

  it('should return correct initial values from selectors', () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: ({ children }) => wrapper({ children, store }),
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBe(null);
    expect(result.current.gamesList).toBeUndefined();
    expect(result.current.currentGame).toBe(null);
  });

  it('should dispatch getGames action when getGames is called', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    const { result } = renderHook(() => useGame(), {
      wrapper: ({ children }) => wrapper({ children, store }),
    });

    act(() => {
      result.current.getGames();
    });

    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'game/getGames'
    }));
  });

  it('should dispatch movePieceLeft action when moveLeft is called', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    const { result } = renderHook(() => useGame(), {
      wrapper: ({ children }) => wrapper({ children, store }),
    });

    act(() => {
      result.current.moveLeft();
    });

    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'game/movePieceLeft'
    }));
  });

  it('should dispatch createGame action when createGame is called', () => {
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    const { result } = renderHook(() => useGame(), {
      wrapper: ({ children }) => wrapper({ children, store }),
    });

    act(() => {
      result.current.createGame('Test Room', 'normal');
    });

    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'game/createGame'
    }));
  });

  it('should return correct game state functions', () => {
    const preloadedState = {
      auth: {
        user: { id: 'user1' },
        token: 'test-token',
        isAuthenticated: true,
        status: 'idle',
        error: null
      },
      game: {
        status: 'succeeded',
        error: null,
        gamesList: [],
        currentGame: { id: 'game1', host: 'user1' },
        gameState: {
          isActive: false,
          startedAt: new Date(),
          playerStates: {
            'user1': { gameOver: false, isWinner: false }
          }
        },
        players: [{ id: 'user1' }],
        gameResults: null
      }
    };

    store = createTestStore(preloadedState);

    const { result } = renderHook(() => useGame(), {
      wrapper: ({ children }) => wrapper({ children, store }),
    });

    expect(result.current.canRestartGame()).toBe(true);
    expect(result.current.isCurrentPlayerGameOver()).toBe(false);
    expect(result.current.isCurrentPlayerWinner()).toBe(false);
    expect(result.current.isAllPlayersGameOver()).toBe(false);
  });

  it('should handle errors for createGame without roomName', async () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: ({ children }) => wrapper({ children, store }),
    });

    const response = await act(async () => {
      return result.current.createGame('', 'normal');
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe("Nom de la salle non défini");
  });

  it('should handle errors for joinGame without gameId', async () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: ({ children }) => wrapper({ children, store }),
    });

    const response = await act(async () => {
      return result.current.joinGame('');
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe("ID de partie non défini");
  });
});
