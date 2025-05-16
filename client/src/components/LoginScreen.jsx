import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './LoginScreen.css';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const { login, status, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Rediriger vers le lobby si déjà authentifié
  useEffect(() => {
    if (isAuthenticated) {
      // Vérifier si on a une redirection à effectuer depuis une URL de type /:room/:playerName
      const { from } = location.state || { from: { pathname: '/lobby' } };
      navigate(from);
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Veuillez entrer un nom d\'utilisateur');
      return;
    }

    try {
      await login(username);
      navigate('/lobby');
    } catch (err) {
      setError(err.toString());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div className="login-field">
        <label htmlFor="username" className="username-label">
          Nom d'utilisateur
        </label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="username-input"
          placeholder="Entrez votre nom d'utilisateur"
          disabled={status === 'loading'}
        />
      </div>

      {error && (
        <div className="login-error">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="login-button"
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  );
};

export default LoginScreen;
