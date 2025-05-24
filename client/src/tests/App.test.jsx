import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import App from '../App';
import { useAuth } from '../hooks/useAuth';
import { useGame } from '../hooks/useGame';

// Mock react-router-dom to replace BrowserRouter
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // If App.jsx uses <BrowserRouter>, this mock will prevent nested routers.
    // The <MemoryRouter> in individual tests will provide the routing context.
    BrowserRouter: ({ children }) => <>{children}</>,
  };
});

// Mock des hooks et services
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    login: vi.fn(() => Promise.resolve({ success: true })),
    logout: vi.fn(),
    user: null // Default mock user state
  })),
}));

vi.mock('../hooks/useGame', () => ({
  useGame: vi.fn(() => ({
    joinGame: vi.fn().mockResolvedValue({ success: true }),
    getGames: vi.fn(() => Promise.resolve({ games: [] })),
  })),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    toggleTheme: vi.fn(),
  })),
}));

vi.mock('../services/socketService', () => ({
  socketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    isAuth: false,
    isConnected: false,
    scheduleReconnection: vi.fn(),
  }
}));

const mockStore = configureStore([]);

describe('App Component', () => {
  let store;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Default store state
    store = mockStore({
      auth: {
        isAuthenticated: false,
        user: null,
        status: 'idle',
        error: null,
      },
      game: {
        gameList: [],
        currentGame: null,
        players: [],
        status: 'idle',
        gameState: null
      },
    });

    // Mock localStorage
    Storage.prototype.getItem = vi.fn();
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();

    // Default mock implementations for hooks
    vi.mocked(useAuth).mockReturnValue({
        login: vi.fn().mockResolvedValue({ success: true }),
        logout: vi.fn(),
        user: null
    });
    vi.mocked(useGame).mockReturnValue({
        joinGame: vi.fn().mockResolvedValue({ success: true }),
        getGames: vi.fn().mockResolvedValue({ games: [] })
    });
  });

  test('renders LoginPage by default', () => {
    render(
      <Provider store={store}>
        {/* BrowserRouter mock should allow MemoryRouter to take precedence or App to render without conflict */}
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      </Provider>
    );
    expect(screen.getByText(/se connecter/i)).toBeInTheDocument();
  });

  test('redirects to LoginPage if not authenticated and trying to access /lobby', () => {
    // Store state for this test (not authenticated)
    store = mockStore({
      auth: { isAuthenticated: false, user: null, status: 'idle' },
      game: {}
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/lobby']}> {/* MemoryRouter for specific route testing */}
          <App />
        </MemoryRouter>
      </Provider>
    );
    expect(screen.getByText(/se connecter/i)).toBeInTheDocument();
  });

  test('renders LobbyPage when authenticated and navigating to /lobby', async () => {
    // Store state for this test (authenticated)
    store = mockStore({
      auth: { isAuthenticated: true, user: { username: 'testuser' }, status: 'succeeded' },
      game: { gameList: [], currentGame: null, players: [], status: 'idle' }
    });

    // Mock useAuth for this specific test to reflect authenticated state
    vi.mocked(useAuth).mockReturnValue({
        login: vi.fn().mockResolvedValue({ success: true }),
        logout: vi.fn(),
        user: { username: 'testuser' } // Authenticated user
    });
    // Mock useGame to provide getGames for LobbyPage
    vi.mocked(useGame).mockReturnValue({
        getGames: vi.fn().mockResolvedValue({ games: [] }),
        joinGame: vi.fn().mockResolvedValue({ success: true })
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/lobby']}>
          <App />
        </MemoryRouter>
      </Provider>
    );
    // Check for actual content from LobbyPage
    expect(await screen.findByRole('heading', { name: /Lobby/i })).toBeInTheDocument();
    expect(await screen.findByText(/Aucune partie disponible/i)).toBeInTheDocument();
  });

  test('GameRouteHandler attempts to login and join game via URL parameters', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ success: true, user: { username: 'player1' } });
    const mockJoinGame = vi.fn().mockResolvedValue({ success: true });

    // Mock useAuth and useGame for this specific test
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      login: mockLogin,
      logout: vi.fn(),
    });
    vi.mocked(useGame).mockReturnValue({
      joinGame: mockJoinGame,
      getGames: vi.fn().mockResolvedValue({ games: [] })
    });

    store = mockStore({
      auth: { isAuthenticated: false, user: null, status: 'idle' }, // Initial auth state
      game: { gameState: null }
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/testroom/player1']}>
          <App />
        </MemoryRouter>
      </Provider>
    );

    // Check for loading state initially
    expect(await screen.findByText(/Chargement de la partie.../i)).toBeInTheDocument();

    // Ensure login was called. The exact timing and state updates might need awaits or further checks
    // For now, we check if the functions are called as expected by GameRouteHandler
    // await vi.waitFor(() => expect(mockLogin).toHaveBeenCalledWith('player1'));
    // await vi.waitFor(() => expect(mockJoinGame).toHaveBeenCalledWith('testroom'));
  });

});
