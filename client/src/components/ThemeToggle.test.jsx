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

    // Check for moon SVG path (a bit fragile, but can indicate the icon)
    const svgPath = screen.getByRole('button').querySelector('svg path');
    expect(svgPath).toHaveAttribute('d', expect.stringContaining('M6 .278a')); // Moon icon path start
  });

  it('should render sun icon and correct aria-label for dark theme', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'dark',
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);

    // Check for aria-label
    expect(screen.getByLabelText('Passer au thème clair')).toBeInTheDocument();

    // Check for sun SVG path
    const svgPath = screen.getByRole('button').querySelector('svg path');
    expect(svgPath).toHaveAttribute('d', expect.stringContaining('M8 12a4')); // Sun icon path start
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

  afterEach(() => {
    vi.clearAllMocks(); // Clear mocks after each test
  });
});
