import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginScreen from './LoginScreen';
import { useAuth } from '../hooks/useAuth';

// mockNavigate can be declared here as it's used as a simple spy
const mockNavigate = vi.fn();

// For useLocation, we'll use a changeable function reference
// The actual vi.fn() instance will be assigned in beforeEach/tests.
let useLocationMockImplementation = () => ({ state: null, pathname: '/login' });

vi.mock('../hooks/useAuth');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    // The factory now calls the changeable function reference
    useLocation: (...args) => useLocationMockImplementation(...args),
  };
});

describe('LoginScreen Component', () => {
  let mockLogin;
  let mockUseAuth;
  let currentUseLocationMock; // To hold the vi.fn() for useLocation per test setup

  beforeEach(() => {
    vi.clearAllMocks(); // Clears mockNavigate as well
    mockLogin = vi.fn();
    mockUseAuth = {
      login: mockLogin,
      status: 'idle',
      isAuthenticated: false,
      error: null,
    };
    vi.mocked(useAuth).mockReturnValue(mockUseAuth);

    // Set up the default mock for useLocation for this test run
    currentUseLocationMock = vi.fn().mockReturnValue({ state: null, pathname: '/login' });
    useLocationMockImplementation = currentUseLocationMock;
  });

  const renderWithRouter = (ui, { route = '/', path = '/', locationState = null } = {}) => {
    window.history.pushState({}, 'Test page', route);
    // Allow passing custom location state for the initialEntries
    const initialEntryState = locationState || (path === '/' ? null : { from: { pathname: path }});
    return render(
      <MemoryRouter initialEntries={[{ pathname: route, state: initialEntryState }]}>
        <Routes>
          <Route path={route} element={ui} />
          <Route path="/lobby" element={<div>Lobby Page</div>} />
          <Route path="/some/protected/route" element={<div>Protected Route</div>} />
        </Routes>
      </MemoryRouter>
    );
  };


  it('should render the login form', () => {
    renderWithRouter(<LoginScreen />, { route: '/login'});
    expect(screen.getByLabelText(/nom d'utilisateur/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
  });

  it('should allow typing in the username field', () => {
    renderWithRouter(<LoginScreen />, { route: '/login'});
    const usernameInput = screen.getByLabelText(/nom d'utilisateur/i);
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    expect(usernameInput.value).toBe('testuser');
  });

  it('should show an error if username is empty on submit', async () => {
    renderWithRouter(<LoginScreen />, { route: '/login'});
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));
    expect(await screen.findByText(/veuillez entrer un nom d'utilisateur/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should call login and navigate to lobby on successful submission', async () => {
    mockLogin.mockResolvedValue({ success: true });
    renderWithRouter(<LoginScreen />, { route: '/login'});

    const usernameInput = screen.getByLabelText(/nom d'utilisateur/i);
    fireEvent.change(usernameInput, { target: { value: 'gooduser' } });
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('gooduser'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/lobby'));
  });

  it('should display error message if login fails', async () => {
    mockLogin.mockRejectedValue(new Error('Login failed'));
    renderWithRouter(<LoginScreen />, { route: '/login'});

    const usernameInput = screen.getByLabelText(/nom d'utilisateur/i);
    fireEvent.change(usernameInput, { target: { value: 'baduser' } });
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(await screen.findByText(/login failed/i)).toBeInTheDocument();
  });

  it('should disable form and show loading text when status is "loading"', () => {
    vi.mocked(useAuth).mockReturnValue({ ...mockUseAuth, status: 'loading' });
    renderWithRouter(<LoginScreen />, { route: '/login'});

    expect(screen.getByLabelText(/nom d'utilisateur/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /connexion.../i })).toBeDisabled();
  });

  it('should redirect to /lobby if already authenticated', () => {
     vi.mocked(useAuth).mockReturnValue({ ...mockUseAuth, isAuthenticated: true });
    // currentUseLocationMock will provide the default behavior from beforeEach
    renderWithRouter(<LoginScreen />, { route: '/login'});
    expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/lobby' });
  });

  it('should redirect to "from" location if authenticated and location.state.from exists', () => {
    vi.mocked(useAuth).mockReturnValue({ ...mockUseAuth, isAuthenticated: true });
    const fromLocation = { from: { pathname: '/some/protected/route' } };

    // Set specific mock for useLocation for THIS TEST
    currentUseLocationMock = vi.fn().mockReturnValue({
      state: fromLocation,
      pathname: '/login'
    });
    useLocationMockImplementation = currentUseLocationMock;

    renderWithRouter(<LoginScreen />, { route: '/login', locationState: fromLocation });

    expect(mockNavigate).toHaveBeenCalledWith(fromLocation.from);
    // Important: Reset to default for other tests if not using vi.clearAllMocks or more specific resets
    // For now, beforeEach handles reset via new vi.fn() assignment.
  });

});
