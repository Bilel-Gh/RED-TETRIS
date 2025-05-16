import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from './hooks/useAuth';
import { useGame } from './hooks/useGame';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import GameOverPage from './pages/GameOverPage';

// Composant pour protéger les routes qui nécessitent une authentification
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector(state => state.auth);

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

  // Rediriger vers la page de jeu une fois que tout est configuré
  if (user) {
    return <Navigate to={`/game/${room}`} replace />;
  }

  // Pendant le chargement
  return <div>Chargement...</div>;
};

function App() {
  return (
    <Router>
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
