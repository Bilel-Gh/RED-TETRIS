import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../hooks/useTheme';

// Mock the useTheme hook
vi.mock('../hooks/useTheme');

describe('ThemeToggle Component', () => {
  const mockToggleTheme = vi.fn();

  it('should render moon icon and correct aria-label for light theme', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);

    // Check for aria-label
    expect(screen.getByLabelText('Passer au thème sombre')).toBeInTheDocument();

    // Check for moon icon
    const iconElement = screen.getByRole('button').querySelector('.moon-icon');
    expect(iconElement).toBeInTheDocument();
    expect(iconElement).toHaveTextContent('🌙');
  });

  it('should render sun icon and correct aria-label for dark theme', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'dark',
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);

    // Check for aria-label
    expect(screen.getByLabelText('Passer au thème clair')).toBeInTheDocument();

    // Check for sun icon
    const iconElement = screen.getByRole('button').querySelector('.sun-icon');
    expect(iconElement).toBeInTheDocument();
    expect(iconElement).toHaveTextContent('☀️');
  });

  it('should call toggleTheme on click', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('should have the correct CSS classes based on theme', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme,
    });

    const { rerender } = render(<ThemeToggle />);

    let iconElement = screen.getByRole('button').querySelector('.theme-icon');
    expect(iconElement).toHaveClass('moon-icon');
    expect(iconElement).not.toHaveClass('sun-icon');

    // Re-render with dark theme
    vi.mocked(useTheme).mockReturnValue({
      theme: 'dark',
      toggleTheme: mockToggleTheme,
    });

    rerender(<ThemeToggle />);

    iconElement = screen.getByRole('button').querySelector('.theme-icon');
    expect(iconElement).toHaveClass('sun-icon');
    expect(iconElement).not.toHaveClass('moon-icon');
  });

  afterEach(() => {
    vi.clearAllMocks(); // Clear mocks after each test
  });
});
