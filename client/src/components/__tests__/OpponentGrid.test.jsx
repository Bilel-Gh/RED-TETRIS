import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, expect, describe, it } from 'vitest';
import OpponentGrid from '../OpponentGrid';

// Mock CSS
vi.mock('../OpponentGrid.css', () => ({}));

describe('OpponentGrid Component', () => {
  const mockGrid = [
    [null, null, 'T', null],
    [null, 'T', 'T', 'T'],
    [null, null, null, null],
    ['I', 'I', 'I', 'I']
  ];

  const mockSpectrum = [0, 1, 2, 1];

  it('should render without crashing', () => {
    render(<OpponentGrid />);
  });

  it('should render username when provided', () => {
    render(
      <OpponentGrid
        username="TestPlayer"
        grid={mockGrid}
        score={100}
        spectrum={mockSpectrum}
      />
    );

    expect(screen.getByText('TestPlayer')).toBeInTheDocument();
  });

  it('should render default username when not provided', () => {
    render(
      <OpponentGrid
        grid={mockGrid}
        score={100}
        spectrum={mockSpectrum}
      />
    );

    expect(screen.getByText('Adversaire')).toBeInTheDocument();
  });

  it('should render score when provided', () => {
    render(
      <OpponentGrid
        username="TestPlayer"
        grid={mockGrid}
        score={1500}
        spectrum={mockSpectrum}
      />
    );

    expect(screen.getByText('Score: 1500')).toBeInTheDocument();
  });

  it('should render default score when not provided', () => {
    render(
      <OpponentGrid
        username="TestPlayer"
        grid={mockGrid}
        spectrum={mockSpectrum}
      />
    );

    expect(screen.getByText('Score: 0')).toBeInTheDocument();
  });

  it('should show eliminated status when gameOver is true', () => {
    render(
      <OpponentGrid
        username="TestPlayer"
        grid={mockGrid}
        score={100}
        gameOver={true}
        spectrum={mockSpectrum}
      />
    );

    expect(screen.getByText('Éliminé')).toBeInTheDocument();
  });

  it('should not show eliminated status when gameOver is false', () => {
    render(
      <OpponentGrid
        username="TestPlayer"
        grid={mockGrid}
        score={100}
        gameOver={false}
        spectrum={mockSpectrum}
      />
    );

    expect(screen.queryByText('Éliminé')).not.toBeInTheDocument();
  });

  it('should apply game-over class when gameOver is true', () => {
    const { container } = render(
      <OpponentGrid
        username="TestPlayer"
        grid={mockGrid}
        score={100}
        gameOver={true}
        spectrum={mockSpectrum}
      />
    );

    const gridContainer = container.querySelector('.opponent-grid-container');
    expect(gridContainer).toHaveClass('game-over');
  });

  it('should not apply game-over class when gameOver is false', () => {
    const { container } = render(
      <OpponentGrid
        username="TestPlayer"
        grid={mockGrid}
        score={100}
        gameOver={false}
        spectrum={mockSpectrum}
      />
    );

    const gridContainer = container.querySelector('.opponent-grid-container');
    expect(gridContainer).not.toHaveClass('game-over');
  });

  it('should render spectrum columns when spectrum is provided', () => {
    const { container } = render(
      <OpponentGrid
        username="TestPlayer"
        grid={mockGrid}
        score={100}
        spectrum={mockSpectrum}
      />
    );

    const spectrumColumns = container.querySelectorAll('.spectrum-column');
    expect(spectrumColumns).toHaveLength(mockSpectrum.length);
  });

  it('should render mini grid when grid is provided', () => {
    const { container } = render(
      <OpponentGrid
        username="TestPlayer"
        grid={mockGrid}
        score={100}
        spectrum={mockSpectrum}
      />
    );

    const miniRows = container.querySelectorAll('.mini-row');
    expect(miniRows).toHaveLength(mockGrid.length);
  });

  it('should handle empty grid gracefully', () => {
    render(
      <OpponentGrid
        username="TestPlayer"
        grid={[]}
        score={100}
        spectrum={[]}
      />
    );

    expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    expect(screen.getByText('Score: 100')).toBeInTheDocument();
  });

  it('should handle null grid gracefully', () => {
    render(
      <OpponentGrid
        username="TestPlayer"
        grid={null}
        score={100}
        spectrum={null}
      />
    );

    expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    expect(screen.getByText('Score: 100')).toBeInTheDocument();
  });
});
