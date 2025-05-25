  // Disabling prop-types for this test file
import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest'; // Ensure vi is imported
import LoginPage from './LoginPage';
import { MemoryRouter } from 'react-router-dom'; // Needed for PageTransition

// Use vi.hoisted for mocks
const { mockUseTheme, mockToggleThemeFn } = vi.hoisted(() => {
  const toggleFn = vi.fn();
  return {
    mockUseTheme: vi.fn(() => ({ theme: 'light', toggleTheme: toggleFn })),
    mockToggleThemeFn: toggleFn,
  };
});

vi.mock('../hooks/useTheme', () => ({
  useTheme: mockUseTheme,
}));

// Mock PageTransition component
vi.mock('../components/PageTransition', () => ({
   
  default: ({ children }) => <>{children}</>,
}));

// Mock LoginScreen component
vi.mock('../components/LoginScreen', () => ({
  default: () => <div data-testid="loginscreen-mock">LoginScreen Mock</div>,
}));


describe('LoginPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockUseTheme.mockClear();
    mockToggleThemeFn.mockClear();
    // Default mock implementation for useTheme
    mockUseTheme.mockImplementation(() => ({
      theme: 'light',
      toggleTheme: mockToggleThemeFn,
    }));
  });

  it('renders the login page with title', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByText('RED TETRIS')).toBeInTheDocument();
    expect(screen.getByText('Le jeu Tetris multijoueur en temps réel')).toBeInTheDocument();
    expect(screen.getByTestId('loginscreen-mock')).toBeInTheDocument();
  });

  it('renders theme toggle button with correct initial theme (light)', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-label', 'Passer au thème sombre');
    expect(toggleButton).toHaveTextContent('🌙');
  });

 it('renders theme toggle button with correct initial theme (dark)', () => {
    // Override the mock for this specific test
    mockUseTheme.mockImplementationOnce(() => ({
      theme: 'dark',
      toggleTheme: mockToggleThemeFn,
    }));
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-label', 'Passer au thème clair');
    expect(toggleButton).toHaveTextContent('☀️');
  });

  it('calls toggleTheme when theme toggle button is clicked', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    const toggleButton = screen.getByRole('button');
    toggleButton.click();
    expect(mockToggleThemeFn).toHaveBeenCalledTimes(1);
  });
});
