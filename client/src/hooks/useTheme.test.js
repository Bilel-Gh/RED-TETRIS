import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

// Store mock listeners outside to be accessible in tests
let mockMediaQueryList = {
  matches: false,
  media: '',
  onchange: null,
  addListener: vi.fn(), // deprecated
  removeListener: vi.fn(), // deprecated
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

const setupMatchMediaMock = (matches) => {
  mockMediaQueryList.matches = matches;
  mockMediaQueryList.addEventListener.mockClear();
  mockMediaQueryList.removeEventListener.mockClear();
  mockMediaQueryList.addListener.mockClear();
  mockMediaQueryList.removeListener.mockClear();

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => {
      if (query === '(prefers-color-scheme: dark)') {
        mockMediaQueryList.media = query;
        return mockMediaQueryList;
      }
      // Fallback for other queries if any, though not expected for this hook
      return {
        matches: false, media: query, addListener: vi.fn(), removeListener: vi.fn(),
        addEventListener: vi.fn(), removeEventListener: vi.fn()
      };
    }),
  });
  return mockMediaQueryList; // Return the spy object for assertions
};

// Helper to mock localStorage
const mockLocalStorage = () => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn(key => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
};

describe('useTheme Hook', () => {
  let localStorageMock;

  beforeEach(() => {
    localStorageMock = mockLocalStorage();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    // Default to light system theme & setup mock
    mockMediaQueryList = setupMatchMediaMock(false);

    // Clear documentElement classes
    document.documentElement.className = '';
    // Ensure meta tag exists for testing
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.head.querySelector('meta[name="theme-color"]').remove();
  });

  it('initializes with light theme if localStorage is empty and system is light', () => {
    mockMediaQueryList.matches = false;
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('light-theme')).toBe(true);
  });

  it('initializes with dark theme if localStorage is empty and system is dark', () => {
    mockMediaQueryList.matches = true;
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
  });

  it('initializes with theme from localStorage if present (dark)', () => {
    localStorageMock.setItem('redTetrisTheme', 'dark');
    mockMediaQueryList.matches = false;
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('redTetrisTheme');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
  });

  it('initializes with theme from localStorage if present (light)', () => {
    localStorageMock.setItem('redTetrisTheme', 'light');
    mockMediaQueryList.matches = true;
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('light-theme')).toBe(true);
  });

  it('toggleTheme switches theme from light to dark', () => {
    mockMediaQueryList.matches = false;
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('redTetrisTheme', 'dark');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
    expect(document.documentElement.classList.contains('light-theme')).toBe(false);
    expect(document.querySelector('meta[name="theme-color"]').getAttribute('content')).toBe('#121212');
  });

  it('toggleTheme switches theme from dark to light', () => {
    localStorageMock.setItem('redTetrisTheme', 'dark');
    mockMediaQueryList.matches = true;
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('redTetrisTheme', 'light');
    expect(document.documentElement.classList.contains('light-theme')).toBe(true);
    expect(document.documentElement.classList.contains('dark-theme')).toBe(false);
    expect(document.querySelector('meta[name="theme-color"]').getAttribute('content')).toBe('#f5f5f5');
  });

  it('does NOT update theme if system preference changes and localStorage theme IS set', () => {
    localStorageMock.setItem('redTetrisTheme', 'light');
    // Initial system: light, hook initializes, addEventListener is called
    const { result, unmount } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');

    const changeCallback = mockMediaQueryList.addEventListener.mock.calls.find(
      call => call[0] === 'change'
    )?.[1];
    // In this case, the hook *still* adds the listener, even if it won't act on it due to localStorage
    expect(changeCallback).toBeDefined();

    // Simulate system theme change to dark
    mockMediaQueryList.matches = true;
    act(() => {
      if (changeCallback) changeCallback({ matches: true });
    });

    expect(result.current.theme).toBe('light'); // Should remain 'light' due to localStorage
    unmount();
  });

  // Test for addListener/removeListener fallback (older browsers)
  it('uses addListener/removeListener if addEventListener is not available', () => {
    // Specific mock setup for this test case
    const customMediaQueryList = {
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: undefined, // Simulate addEventListener not being available
      removeEventListener: undefined,
      dispatchEvent: vi.fn(),
    };

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => {
        if (query === '(prefers-color-scheme: dark)') {
          return customMediaQueryList;
        }
        return { matches: false, media: query, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() };
      }),
    });

    const { unmount } = renderHook(() => useTheme());
    expect(customMediaQueryList.addListener).toHaveBeenCalled();

    unmount(); // This will trigger removeListener
    expect(customMediaQueryList.removeListener).toHaveBeenCalled();

    // Restore global mock for other tests if necessary, though beforeEach should handle it
    setupMatchMediaMock(false);
  });

});
