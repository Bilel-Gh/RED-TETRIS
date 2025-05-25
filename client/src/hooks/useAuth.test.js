import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as redux from 'react-redux';
import { socketService } from '../services/socketService';
import { loginStart, logout as logoutAction } from '../features/authSlice'; // Renamed to avoid conflict

// Mocks
vi.mock('react-redux', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useSelector: vi.fn(),
    useDispatch: vi.fn(),
  };
});

vi.mock('../services/socketService', () => ({
  socketService: {
    login: vi.fn(),
    disconnect: vi.fn(),
    isAuth: false,
    isConnected: false
  }
}));

const mockLocalStorage = () => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: vi.fn(key => delete store[key]),
    clear: vi.fn(() => { store = {}; }),
  };
};
const mockSessionStorage = mockLocalStorage; // Same implementation for simplicity

describe('useAuth Hook', () => {
  let mockDispatch;
  let localStorageMock;
  let sessionStorageMock;
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    mockDispatch = vi.fn();
    redux.useDispatch.mockReturnValue(mockDispatch);

    localStorageMock = mockLocalStorage();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true });
    sessionStorageMock = mockSessionStorage();
    Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete window.localStorage;
    delete window.sessionStorage;
  });

  const mockAuthState = (authState) => {
    redux.useSelector.mockImplementation(callback => callback({ auth: authState }));
  };

  describe('login function', () => {
    it('rejects if username is empty', async () => {
      mockAuthState({ user: null, isAuthenticated: false, status: 'idle', error: null });
      const { result } = renderHook(() => useAuth());
      await expect(result.current.login('')).rejects.toBe('Le nom d\'utilisateur ne peut pas être vide');
      await expect(result.current.login('   ')).rejects.toBe('Le nom d\'utilisateur ne peut pas être vide');
    });

    it('resolves immediately if already authenticated with the same username', async () => {
      const currentUser = { id: '1', username: 'testuser' };
      mockAuthState({ user: currentUser, isAuthenticated: true, status: 'succeeded', error: null });
      const { result } = renderHook(() => useAuth());
      await expect(result.current.login('testuser')).resolves.toEqual(currentUser);
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(socketService.login).not.toHaveBeenCalled();
    });

    it('dispatches loginStart and calls socketService.login for a new login attempt', async () => {
      mockAuthState({ user: null, isAuthenticated: false, status: 'idle', error: null });
      const mockUserData = { id: '2', username: 'newuser' };
      socketService.login.mockResolvedValue(mockUserData);
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login('newuser');
      });

      expect(mockDispatch).toHaveBeenCalledWith(loginStart());
      expect(socketService.login).toHaveBeenCalledWith('newuser');
    });

    it('does not dispatch loginStart if status is already "loading"', async () => {
        mockAuthState({ user: null, isAuthenticated: false, status: 'loading', error: null });
        socketService.login.mockResolvedValue({ id: '3', username: 'anotheruser' });
        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.login('anotheruser');
        });

        expect(mockDispatch).not.toHaveBeenCalledWith(loginStart()); // Should not be called again
        expect(socketService.login).toHaveBeenCalledWith('anotheruser');
      });

    it('returns userData on successful socketService.login', async () => {
      mockAuthState({ user: null, isAuthenticated: false, status: 'idle', error: null });
      const mockUserData = { id: '4', username: 'successUser' };
      socketService.login.mockResolvedValue(mockUserData);
      const { result } = renderHook(() => useAuth());

      const returnedData = await result.current.login('successUser');
      expect(returnedData).toEqual(mockUserData);
    });

    it('rejects and logs error on failed socketService.login', async () => {
      mockAuthState({ user: null, isAuthenticated: false, status: 'idle', error: null });
      const loginError = new Error('Socket login failed');
      socketService.login.mockRejectedValue(loginError);
      const { result } = renderHook(() => useAuth());

      await expect(result.current.login('failUser')).rejects.toEqual(loginError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Échec de la connexion:', loginError);
    });
  });

  describe('logout function', () => {
    it('calls necessary cleanup and dispatches logout action', () => {
      // Spies should be on the mock instances themselves
      const removeItemSpyLocalStorage = vi.spyOn(localStorageMock, 'removeItem');
      const removeItemSpySessionStorage = vi.spyOn(sessionStorageMock, 'removeItem');

      // Ensure an initial authenticated state for logout to be meaningful
      mockAuthState({ user: { id: '1', username: 'testuser' }, isAuthenticated: true, status: 'succeeded', error: null });

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.logout();
      });

      expect(removeItemSpyLocalStorage).toHaveBeenCalledWith('redTetrisAuth');
      expect(removeItemSpySessionStorage).toHaveBeenCalledWith('redTetrisAuth');
      expect(socketService.disconnect).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(logoutAction());
    });
  });

  describe('returned values from selector', () => {
    it('returns current auth state values', () => {
      const currentAuthState = {
        user: { id: 'authuser', username: 'tester' },
        isAuthenticated: true,
        status: 'succeeded',
        error: null,
      };
      mockAuthState(currentAuthState);
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toEqual(currentAuthState.user);
      expect(result.current.isAuthenticated).toBe(currentAuthState.isAuthenticated);
      expect(result.current.status).toBe(currentAuthState.status);
      expect(result.current.error).toBe(currentAuthState.error);
    });
  });
});
