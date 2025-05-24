import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameStats from './GameStats';
import { useGameStats } from '../hooks/useGameStats';

// Mock the useGameStats hook
vi.mock('../hooks/useGameStats');

describe('GameStats Component', () => {
  const mockGameStatsBase = {
    totalGames: 10,
    soloGames: 5,
    multiplayerGames: 5,
    lastPlayed: null, // Will be overridden in specific tests
  };

  it('should display game statistics correctly when lastPlayed is null', () => {
    useGameStats.mockReturnValue({ gameStats: { ...mockGameStatsBase, lastPlayed: null } });

    render(<GameStats />);

    expect(screen.getByText('Parties totales :').nextSibling).toHaveTextContent('10');
    expect(screen.getByText('Parties solo :').nextSibling).toHaveTextContent('5');
    expect(screen.getByText('Parties multijoueur :').nextSibling).toHaveTextContent('5');
    expect(screen.queryByText('Dernière partie :')).not.toBeInTheDocument();
  });

  it('should display game statistics correctly including lastPlayed date', () => {
    const lastPlayedTimestamp = new Date(2023, 0, 15).getTime(); // January 15, 2023
    useGameStats.mockReturnValue({
      gameStats: { ...mockGameStatsBase, lastPlayed: lastPlayedTimestamp }
    });

    render(<GameStats />);

    expect(screen.getByText('Parties totales :').nextSibling).toHaveTextContent('10');
    expect(screen.getByText('Parties solo :').nextSibling).toHaveTextContent('5');
    expect(screen.getByText('Parties multijoueur :').nextSibling).toHaveTextContent('5');

    const lastPlayedLabel = screen.getByText('Dernière partie :');
    expect(lastPlayedLabel).toBeInTheDocument();
    // Date formatting can be locale-specific. We check for parts of the date.
    // Using toLocaleDateString() in the component means we should match its output format.
    // For simplicity, let's assume a common format like D/M/YYYY or M/D/YYYY.
    const expectedDateString = new Date(lastPlayedTimestamp).toLocaleDateString();
    expect(lastPlayedLabel.nextSibling).toHaveTextContent(expectedDateString);
  });

  it('should handle zero values for stats', () => {
    useGameStats.mockReturnValue({
      gameStats: {
        totalGames: 0,
        soloGames: 0,
        multiplayerGames: 0,
        lastPlayed: null,
      }
    });

    render(<GameStats />);

    expect(screen.getByText('Parties totales :').nextSibling).toHaveTextContent('0');
    expect(screen.getByText('Parties solo :').nextSibling).toHaveTextContent('0');
    expect(screen.getByText('Parties multijoueur :').nextSibling).toHaveTextContent('0');
    expect(screen.queryByText('Dernière partie :')).not.toBeInTheDocument();
  });
});
