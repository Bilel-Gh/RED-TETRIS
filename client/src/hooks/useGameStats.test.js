import { renderHook, act } from '@testing-library/react';
import { useGameStats } from './useGameStats';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Helper to mock localStorage
const mockLocalStorage = () => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn(key => delete store[key]),
  };
};

describe('useGameStats Hook', () => {
  let localStorageMock;

  beforeEach(() => {
    localStorageMock = mockLocalStorage();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    vi.useFakeTimers(); // For consistent Date testing
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    delete window.localStorage; // Clean up the mock
  });

  it('initializes with default stats if localStorage is empty', () => {
    const { result } = renderHook(() => useGameStats());
    expect(result.current.gameStats).toEqual({
      soloGames: 0,
      multiplayerGames: 0,
      totalGames: 0,
      lastPlayed: null,
    });
    expect(localStorageMock.getItem).toHaveBeenCalledWith('redTetrisStats');
  });

  it('initializes with stats from localStorage if present and valid', () => {
    const storedStats = {
      soloGames: 5,
      multiplayerGames: 2,
      totalGames: 7,
      lastPlayed: new Date(2023, 0, 1).toISOString(),
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedStats));
    const { result } = renderHook(() => useGameStats());
    expect(result.current.gameStats).toEqual(storedStats);
  });

  it('initializes with default stats and logs error if localStorage contains invalid JSON', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorageMock.getItem.mockReturnValue('invalid-json');
    const { result } = renderHook(() => useGameStats());
    expect(result.current.gameStats).toEqual({
      soloGames: 0,
      multiplayerGames: 0,
      totalGames: 0,
      lastPlayed: null,
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('incrementGamesCount updates stats for a solo game and saves to localStorage', () => {
    const mockDate = new Date(2023, 5, 15, 10, 0, 0);
    vi.setSystemTime(mockDate);

    const { result } = renderHook(() => useGameStats());
    act(() => {
      result.current.incrementGamesCount(false); // isMultiplayer = false
    });

    const expectedStats = {
      soloGames: 1,
      multiplayerGames: 0,
      totalGames: 1,
      lastPlayed: mockDate.toISOString(),
    };
    expect(result.current.gameStats).toEqual(expectedStats);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('redTetrisStats', JSON.stringify(expectedStats));

    vi.restoreAllMocks(); // For system time
  });

  it('incrementGamesCount updates stats for a multiplayer game', () => {
    const mockDate = new Date(2023, 6, 20, 12, 0, 0);
    vi.setSystemTime(mockDate);

    const { result } = renderHook(() => useGameStats());
    act(() => {
      result.current.incrementGamesCount(true); // isMultiplayer = true
    });

    const expectedStats = {
      soloGames: 0,
      multiplayerGames: 1,
      totalGames: 1,
      lastPlayed: mockDate.toISOString(),
    };
    expect(result.current.gameStats).toEqual(expectedStats);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('redTetrisStats', JSON.stringify(expectedStats));
    vi.restoreAllMocks(); // For system time
  });

  it('resetStats resets all game statistics and saves to localStorage', () => {
    // Set some initial stats
    const initialStats = {
      soloGames: 10,
      multiplayerGames: 5,
      totalGames: 15,
      lastPlayed: new Date().toISOString(),
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(initialStats));
    const { result } = renderHook(() => useGameStats());

    act(() => {
      result.current.resetStats();
    });

    const expectedResetStats = {
      soloGames: 0,
      multiplayerGames: 0,
      totalGames: 0,
      lastPlayed: null,
    };
    expect(result.current.gameStats).toEqual(expectedResetStats);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('redTetrisStats', JSON.stringify(expectedResetStats));
  });

  it('saves to localStorage when gameStats change due to multiple increments', () => {
    const { result } = renderHook(() => useGameStats());

    // localStorageMock.getItem would have been called by useState initialization
    // Then, the useEffect would call setItem once with the initial (default) stats.
    localStorageMock.setItem.mockClear(); // Clear calls from initialization

    act(() => {
      result.current.incrementGamesCount(false); // Call #1 to setItem after this
    });
    act(() => {
      result.current.incrementGamesCount(true); // Call #2 to setItem after this
    });

    // We expect setItem to be called once for each increment operation.
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);
  });
});
