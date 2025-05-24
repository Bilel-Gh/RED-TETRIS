import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ShareGame from './ShareGame';

describe('ShareGame Component', () => {
  const mockShareUrl = 'http://localhost:3000/game/123xyz';
  let writeTextMock;

  beforeEach(() => {
    writeTextMock = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (navigator.clipboard) {
        delete navigator.clipboard;
    }
    vi.useRealTimers();
  });

  it('should display the share URL in a read-only input', () => {
    render(<ShareGame shareUrl={mockShareUrl} />);
    const inputElement = screen.getByRole('textbox');
    expect(inputElement.value).toBe(mockShareUrl);
    expect(inputElement).toHaveAttribute('readOnly');
  });

  it('should call navigator.clipboard.writeText with the share URL when copy button is clicked', async () => {
    writeTextMock.mockResolvedValue(undefined);
    render(<ShareGame shareUrl={mockShareUrl} />);

    const copyButton = screen.getByRole('button', { name: 'Copier le lien' });
    await act(async () => {
        fireEvent.click(copyButton);
        await Promise.resolve();
    });

    expect(writeTextMock).toHaveBeenCalledWith(mockShareUrl);
  });

  it('should change button text to "Copié !" on successful copy and revert after 2 seconds', async () => {
    writeTextMock.mockResolvedValue(undefined);
    render(<ShareGame shareUrl={mockShareUrl} />);

    const copyButton = screen.getByRole('button', { name: 'Copier le lien' });

    await act(async () => {
      fireEvent.click(copyButton);
      await Promise.resolve();
    });

    expect(copyButton).toHaveTextContent('Copié !');

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(copyButton).toHaveTextContent('Copier le lien');
  });

  it('should log an error if navigator.clipboard.writeText fails and button text remains unchanged', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const errorMessage = 'Copy failed';
    writeTextMock.mockRejectedValue(new Error(errorMessage)); // Simplified

    render(<ShareGame shareUrl={mockShareUrl} />);
    const copyButton = screen.getByRole('button', { name: 'Copier le lien' });

    await act(async () => {
      fireEvent.click(copyButton);
      // Allow promise rejection to be processed
      await vi.advanceTimersByTimeAsync(0); // Flush microtasks & timers scheduled for now
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Erreur lors de la copie:', expect.any(Error));
    expect(copyButton).toHaveTextContent('Copier le lien');

    consoleErrorSpy.mockRestore();
  });

  it('should render correctly if shareUrl is an empty string', () => {
    render(<ShareGame shareUrl="" />);
    screen.debug(); // Added for debugging
    const inputElement = screen.getByRole('textbox');
    expect(inputElement.value).toBe('');
    const copyButton = screen.getByRole('button', { name: 'Copier le lien' });
    expect(copyButton).toBeInTheDocument();
  });
});
