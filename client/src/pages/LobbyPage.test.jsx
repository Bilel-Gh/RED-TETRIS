import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import LobbyPage from './LobbyPage';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mocks
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock('../hooks/useGame');
vi.mock('../hooks/useAuth');
vi.mock('../hooks/useTheme');

const mockNavigate = vi.fn();

describe('LobbyPage Component', () => {
  let mockGetGames, mockCreateGame, mockJoinGame, mockLogoutAuth;

  beforeEach(() => {
    mockNavigate.mockClear();
    useNavigate.mockReturnValue(mockNavigate);

    mockGetGames = vi.fn().mockResolvedValue({ success: true, games: [] });
    mockCreateGame = vi.fn();
    mockJoinGame = vi.fn();
    useGame.mockReturnValue({
      getGames: mockGetGames,
      createGame: mockCreateGame,
      joinGame: mockJoinGame,
      gamesList: [], // Default empty list
    });

    mockLogoutAuth = vi.fn();
    useAuth.mockReturnValue({
      user: { username: 'testuser' },
      logout: mockLogoutAuth,
    });

    useTheme.mockReturnValue({
      theme: 'light',
      toggleTheme: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (ui, { route = '/' } = {}) => {
    window.history.pushState({}, 'Test page', route);
    return render(ui, { wrapper: MemoryRouter });
  };

  it('loads games on initial render', async () => {
    renderWithRouter(<LobbyPage />);
    await waitFor(() => expect(mockGetGames).toHaveBeenCalled());
  });

  describe('handleCreateGame', () => {
    it('shows error if room name is empty', async () => {
      renderWithRouter(<LobbyPage />);
      await screen.findByText('Aucune partie disponible'); // Wait for initial load

      const createButton = screen.getByRole('button', { name: /Créer une partie/i });
      fireEvent.click(createButton); // Use click

      expect(await screen.findByText('Veuillez entrer un nom pour la salle')).toBeInTheDocument();
      expect(mockCreateGame).not.toHaveBeenCalled();
      // Button should still be in its initial state as no async creation was attempted
      expect(screen.getByRole('button', { name: /Créer une partie/i })).toBeEnabled();
    });

    it('calls createGame and navigates on success', async () => {
      mockCreateGame.mockResolvedValue({ success: true, game: { id: 'game1', roomName: 'Test Room' } });
      renderWithRouter(<LobbyPage />);
      await screen.findByText('Aucune partie disponible'); // Wait for initial load

      fireEvent.change(screen.getByLabelText(/Nom de la salle/i), { target: { value: 'Test Room' } });
      const createButton = screen.getByRole('button', { name: /Créer une partie/i });
      fireEvent.click(createButton); // Use click

      // Optional: Check loading state if needed, though it's covered in another test
      // expect(screen.getByRole('button', { name: /Création.../i })).toBeDisabled();

      await waitFor(() => expect(mockCreateGame).toHaveBeenCalledWith('Test Room', 'normal'));
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/game/Test Room'));
    });

    it('shows error if createGame returns success: false', async () => {
      mockCreateGame.mockResolvedValue({ success: false, error: 'Room exists' });
      renderWithRouter(<LobbyPage />);
      await screen.findByText('Aucune partie disponible'); // Wait for initial load

      fireEvent.change(screen.getByLabelText(/Nom de la salle/i), { target: { value: 'Existing Room' } });
      const createButton = screen.getByRole('button', { name: /Créer une partie/i });
      fireEvent.click(createButton); // Use click

      expect(await screen.findByText('Room exists')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
      // Check button is back to normal state
      expect(screen.getByRole('button', { name: /Créer une partie/i })).toBeEnabled();
    });

    it('shows error if createGame throws an exception', async () => {
      mockCreateGame.mockRejectedValue(new Error('Creation failed unexpectedly'));
      renderWithRouter(<LobbyPage />);
      await screen.findByText('Aucune partie disponible'); // Wait for initial load

      fireEvent.change(screen.getByLabelText(/Nom de la salle/i), { target: { value: 'Error Room' } });
      const createButton = screen.getByRole('button', { name: /Créer une partie/i });
      fireEvent.click(createButton); // Use click

      expect(await screen.findByText('Creation failed unexpectedly')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
      // Check button is back to normal state
      expect(screen.getByRole('button', { name: /Créer une partie/i })).toBeEnabled();
    });

    it('updates fall speed setting', async () => {
        renderWithRouter(<LobbyPage />);
        await screen.findByText('Aucune partie disponible'); // Wait for initial load

        fireEvent.click(screen.getByLabelText('Rapide'));
        fireEvent.change(screen.getByLabelText(/Nom de la salle/i), { target: { value: 'Fast Room' } });
        mockCreateGame.mockResolvedValue({ success: true, game: { id: 'gameFast', roomName: 'Fast Room' } });

        const createButton = screen.getByRole('button', { name: /Créer une partie/i });
        fireEvent.click(createButton); // Use click

        await waitFor(() => expect(mockCreateGame).toHaveBeenCalledWith('Fast Room', 'fast'));
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/game/Fast Room'));
      });
  });

  describe('handleJoinGame', () => {
    const games = [{ id: 'g1', roomName: 'Cool Game', players: [{ username: 'player1' }] }];
    beforeEach(() => {
      useGame.mockReturnValue({
        getGames: mockGetGames.mockResolvedValue({ success: true, games: games }),
        createGame: mockCreateGame,
        joinGame: mockJoinGame,
        gamesList: games,
      });
    });

    it('calls joinGame and navigates on success', async () => {
      mockJoinGame.mockResolvedValue({ success: true, game: { id: 'g1', roomName: 'Cool Game' } });
      renderWithRouter(<LobbyPage />);
      // Wait for games to be listed
      await screen.findByText('Partie de player1');
      fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }));

      await waitFor(() => expect(mockJoinGame).toHaveBeenCalledWith('g1'));
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/game/Cool Game'));
    });

    it('shows error if joinGame returns success: false', async () => {
      mockJoinGame.mockResolvedValue({ success: false, error: 'Game is full' });
      renderWithRouter(<LobbyPage />);
      await screen.findByText('Partie de player1');
      fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }));

      expect(await screen.findByText('Game is full')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows error if joinGame throws an exception', async () => {
      mockJoinGame.mockRejectedValue(new Error('Join failed unexpectedly'));
      renderWithRouter(<LobbyPage />);
      await screen.findByText('Partie de player1');
      fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }));

      expect(await screen.findByText('Join failed unexpectedly')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('handleLogout', () => {
    it('calls auth logout and navigates to home', async () => { // Made async
      renderWithRouter(<LobbyPage />);
      await screen.findByText('Aucune partie disponible'); // Wait for initial load

      fireEvent.click(screen.getByRole('button', { name: 'Déconnexion' }));
      expect(mockLogoutAuth).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Game List Rendering', () => {
    it('shows "No games available" message when gamesList is empty', async () => {
      useGame.mockReturnValue({
        getGames: mockGetGames.mockResolvedValue({ success: true, games: [] }),
        createGame: mockCreateGame,
        joinGame: mockJoinGame,
        gamesList: [],
      });
      renderWithRouter(<LobbyPage />);
      await waitFor(() => expect(screen.getByText('Aucune partie disponible')).toBeInTheDocument());
    });

    it('renders game items when gamesList is populated', async () => {
      const games = [
        { id: 'g1', roomName: 'Game One', players: [{ username: 'owner1' }], maxPlayers: 2 },
        { id: 'g2', roomName: 'Game Two', players: [{ username: 'owner2' }, {username: 'player2'}], maxPlayers: 2 },
      ];
      useGame.mockReturnValue({
        getGames: mockGetGames.mockResolvedValue({ success: true, games: games }),
        createGame: mockCreateGame,
        joinGame: mockJoinGame,
        gamesList: games,
      });
      renderWithRouter(<LobbyPage />);
      expect(await screen.findByText('Partie de owner1')).toBeInTheDocument();
      expect(screen.getByText('Salle: Game One')).toBeInTheDocument();
      expect(screen.getByText('1 joueur(s) connecté(s)')).toBeInTheDocument();

      expect(await screen.findByText('Partie de owner2')).toBeInTheDocument();
      expect(screen.getByText('Salle: Game Two')).toBeInTheDocument();
      expect(screen.getByText('2 joueur(s) connecté(s)')).toBeInTheDocument();
    });
  });

  it('displays loading spinner when isLoading is true for games list', async () => {
    // Keep getGames pending
    let resolveGetGames;
    const promiseGetGames = new Promise(resolve => { resolveGetGames = resolve; });
    mockGetGames.mockReturnValue(promiseGetGames);

    renderWithRouter(<LobbyPage />);
    expect(screen.getByRole('heading', {name: 'Parties disponibles'}).nextSibling.querySelector('.loading-spinner')).toBeInTheDocument();

    // When game list is loading, the shared isLoading state makes the create button show "Création..."
    const createButton = screen.getByRole('button', { name: /Création.../i });
    expect(createButton).toBeInTheDocument();
    expect(createButton).toBeDisabled();

    await act(async () => {
        resolveGetGames({ success: true, games: [] });
        await promiseGetGames; // Ensure promise settles
    });
    await waitFor(() => expect(screen.queryByLabelText('loading-spinner')).not.toBeInTheDocument());
  });

  it('displays loading state in create game button when creating', async () => {
    let resolveCreateGame;
    const promiseCreateGame = new Promise(resolve => { resolveCreateGame = resolve; });
    mockCreateGame.mockReturnValue(promiseCreateGame);

    renderWithRouter(<LobbyPage />);
    await screen.findByText('Aucune partie disponible'); // Wait for initial load

    fireEvent.change(screen.getByLabelText(/Nom de la salle/i), { target: { value: 'Loading Room' } });
    const buttonBeforeSubmit = screen.getByRole('button', { name: /Créer une partie/i });
    fireEvent.click(buttonBeforeSubmit); // Use click

    const createButton = screen.getByRole('button', { name: /Création.../i });
    expect(createButton).toBeDisabled();
    expect(createButton).toHaveTextContent('Création...');

    await act(async () => {
        resolveCreateGame({ success: true, game: {id: 'g1', roomName: 'Loading Room'} });
        await promiseCreateGame;
    });
    // After creation, it navigates, so button won't be there or will revert
    // We primarily test the loading state here.
  });

});
