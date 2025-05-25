import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from './hooks/useAuth';
import { useGame } from './hooks/useGame';
import { useTheme } from './hooks/useTheme';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import GameOverPage from './pages/GameOverPage';
import { socketService } from './services/socketService';
import './App.css';
import './components/Tetris.css';

// Composant de détection de la connexion réseau
const ConnectionMonitor = () => {
  useEffect(() => {
    const handleOnline = () => {
      console.log('Réseau en ligne, tentative de reconnexion...');
      socketService.scheduleReconnection();
    };

    const handleOffline = () => {
      console.log('Réseau hors ligne, attente de reconnexion...');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null; // Ce composant ne rend rien visuellement
};

// Composant pour protéger les routes qui nécessitent une authentification
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user, status } = useSelector(state => state.auth);
  const { login } = useAuth();

  useEffect(() => {
    // Si le socket est déconnecté mais que l'utilisateur est considéré comme authentifié,
    // tenter une reconnexion automatique
    const socket = socketService;
    if (isAuthenticated && user && user.username && !socket.isAuth) {
      login(user.username).catch(err => {
        console.error('ProtectedRoute: échec de la reconnexion automatique', err);
      });
    }
  }, [isAuthenticated, user, login]);

  if (status === 'loading') {
    return <div className="loading-container">Connexion en cours...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Composant pour gérer les URL de type /:room/:playerName
const GameRouteHandler = () => {
  const { room, playerName } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { login, user } = useAuth();
  const { joinGame } = useGame();

  useEffect(() => {
    const handleGameRouting = async () => {
      // Si l'utilisateur n'est pas encore connecté, le connecter avec le nom dans l'URL
      if (!user && playerName) {
        try {
          await login(playerName);
          // Essayer de rejoindre la partie avec le nom de la salle
          const result = await joinGame(room);
          if (!result.success) {
            // Si la partie n'existe pas, rediriger vers le lobby
            navigate('/lobby');
          }
        } catch (error) {
          console.error("Erreur lors de la connexion ou du join:", error);
          navigate('/');
        }
      }
    };

    handleGameRouting();
  }, [room, playerName, user, login, joinGame, navigate, dispatch]);

  if (user) {
    return <Navigate to={`/game/${room}`} replace />;
  }

  return <div className="loading-container">Chargement de la partie...</div>;
};

function App() {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const { login } = useAuth();

  // Initialiser le thème (pas besoin de déstructurer, seulement initialiser le hook)
  useTheme();

  // Vérifier l'état de connexion au chargement de l'application
  useEffect(() => {
    // Vérifier si on a des données d'authentification dans localStorage
    const savedAuth = localStorage.getItem('redTetrisAuth');
    if (savedAuth && !isAuthenticated) {
      try {
        const authData = JSON.parse(savedAuth);
        if (authData && authData.username) {
          login(authData.username).catch(err => {
            console.error('Échec de la reconnexion depuis localStorage:', err);
            localStorage.removeItem('redTetrisAuth');
          });
        }
      } catch (e) {
        console.error('Erreur lors de la lecture des données d\'authentification:', e);
        localStorage.removeItem('redTetrisAuth');
      }
    }
  }, [isAuthenticated, login]);

  useEffect(() => {
    if (isAuthenticated && user) {
      localStorage.setItem('redTetrisAuth', JSON.stringify({
        username: user.username,
        timestamp: Date.now()
      }));
    }
  }, [isAuthenticated, user]);

  return (
    <Router>
      {/* Composant de surveillance de la connexion réseau */}
      <ConnectionMonitor />

      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <LobbyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/:gameId"
          element={
            <ProtectedRoute>
              <GamePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game-over"
          element={
            <ProtectedRoute>
              <GameOverPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/:room/:playerName"
          element={<GameRouteHandler />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
