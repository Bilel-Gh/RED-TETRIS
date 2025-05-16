import React from 'react';
import LoginScreen from '../components/LoginScreen';
import PageTransition from '../components/PageTransition';
import './LoginPage.css';

const LoginPage = () => {
  return (
    <PageTransition>
      <div className="login-page">
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
