import React from 'react';
import LoginScreen from '../components/LoginScreen';
import PageTransition from '../components/PageTransition';
import { useTheme } from '../hooks/useTheme';
import './LoginPage.css';

const LoginPage = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <PageTransition>
      <div className="login-page">
        <div className="theme-toggle-container">
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={theme === 'light' ? 'Passer au thème sombre' : 'Passer au thème clair'}
            title={theme === 'light' ? 'Passer au thème sombre' : 'Passer au thème clair'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
        <div className="login-container">
          <div className="login-header">
            <h1 className="login-title">RED TETRIS</h1>
            <p className="login-subtitle">Le jeu Tetris multijoueur en temps réel</p>
          </div>
          <LoginScreen />
        </div>
      </div>
    </PageTransition>
  );
};

export default LoginPage;
