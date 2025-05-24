import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GhostToggle from './GhostToggle';
import { useGhostPiece } from '../hooks/useGhostPiece';

// Mock the useGhostPiece hook
vi.mock('../hooks/useGhostPiece');

describe('GhostToggle Component', () => {
  it('should display ON and have enabled class when ghostPieceEnabled is true', () => {
    useGhostPiece.mockReturnValue({
      ghostPieceEnabled: true,
      toggleGhostPiece: vi.fn(),
    });

    render(<GhostToggle />);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('ON');
    expect(button).toHaveClass('enabled');
    expect(button).not.toHaveClass('disabled');
    expect(button).toHaveAttribute('title', 'Pièce fantôme: Activée');
  });

  it('should display OFF and have disabled class when ghostPieceEnabled is false', () => {
    useGhostPiece.mockReturnValue({
      ghostPieceEnabled: false,
      toggleGhostPiece: vi.fn(),
    });

    render(<GhostToggle />);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('OFF');
    expect(button).toHaveClass('disabled');
    expect(button).not.toHaveClass('enabled');
    expect(button).toHaveAttribute('title', 'Pièce fantôme: Désactivée');
  });

  it('should call toggleGhostPiece when clicked', () => {
    const mockToggle = vi.fn();
    useGhostPiece.mockReturnValue({
      ghostPieceEnabled: true,
      toggleGhostPiece: mockToggle,
    });

    render(<GhostToggle />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('should update display when ghostPieceEnabled state changes', () => {
    const mockToggle = vi.fn();
    let ghostPieceEnabled = false;

    // Initial hook state
    useGhostPiece.mockReturnValue({
      get ghostPieceEnabled() { return ghostPieceEnabled; },
      toggleGhostPiece: mockToggle,
    });

    const { rerender } = render(<GhostToggle />);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('OFF');
    expect(button).toHaveClass('disabled');

    // Simulate state change in the hook
    ghostPieceEnabled = true;
    // Rerender with the new mocked value (Vitest mock won't auto-update like a real hook)
    // For this to work well, the component would typically rely on the hook's state update to trigger re-render.
    // Here, we explicitly rerender to simulate the component reacting to a new prop/state from the hook.
    useGhostPiece.mockReturnValue({
        get ghostPieceEnabled() { return ghostPieceEnabled; },
        toggleGhostPiece: mockToggle,
      });
    rerender(<GhostToggle />);

    expect(button).toHaveTextContent('ON');
    expect(button).toHaveClass('enabled');
  });
});
