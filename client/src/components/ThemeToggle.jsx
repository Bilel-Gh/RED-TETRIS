import React from 'react';
import { useTheme } from '../hooks/useTheme';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle-btn"
      onClick={toggleTheme}
      aria-label={`Passer au thème ${theme === 'light' ? 'sombre' : 'clair'}`}
      title={`Passer au thème ${theme === 'light' ? 'sombre' : 'clair'}`}
    >
      <span className={`theme-icon ${theme === 'light' ? 'moon-icon' : 'sun-icon'}`}>
        {theme === 'light' ? '🌙' : '☀️'}
      </span>
    </button>
  );
};

export default ThemeToggle;
