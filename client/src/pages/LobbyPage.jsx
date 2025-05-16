import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { useAuth } from '../hooks/useAuth';
import PageTransition from '../components/PageTransition';

const LobbyPage = () => {
  const { user } = useAuth();
  const { getGames, createGame, joinGame, gamesList } = useGame();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');

  const loadGames = async () => {
    setIsLoading(true);
    await getGames();
    setIsLoading(false);
  };

  useEffect(() => {
    loadGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateGame = async (e) => {
    e.preventDefault();
    setError('');

    if (!roomName.trim()) {
      setError('Veuillez entrer un nom pour la salle');
      return;
    }

    setIsLoading(true);
    try {
      const result = await createGame(roomName);

      if (result.success) {
        navigate(`/game/${result.game.roomName}`);
      } else {
        console.error("Erreur lors de la création de la partie:", result.error);
        setError(result.error || "Impossible de créer la partie");
      }
    } catch (error) {
      console.error("Exception lors de la création de la partie:", error);
      setError(error.message || "Impossible de créer la partie");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = async (gameId, roomName) => {
    console.log("Tentative de rejoindre la partie:", roomName);
    setIsLoading(true);
    try {
      const result = await joinGame(gameId);
      console.log("Résultat de joinGame:", result);

      if (result.success) {
        navigate(`/game/${result.game.roomName}`);
      } else {
        console.error("Erreur lors de la tentative de rejoindre la partie:", result.error);
        setError(result.error || "Impossible de rejoindre la partie");
      }
    } catch (error) {
      console.error("Exception lors de la tentative de rejoindre la partie:", error);
      setError(error.message || "Impossible de rejoindre la partie");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="lobby-page">
        <div className="lobby-container">
          <div className="lobby-header">
            <h1 className="lobby-title">Lobby</h1>
            <p className="lobby-welcome">
              Bienvenue, <span className="username">{user?.username}</span>
            </p>
          </div>

          <div className="create-game-card">
            <h2 className="create-game-title">Créer une partie</h2>
            <form onSubmit={handleCreateGame} className="create-game-form">
              <div className="form-group">
                <label htmlFor="roomName">Nom de la salle:</label>
                <input
                  type="text"
                  id="roomName"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Entrez un nom pour votre salle"
                  disabled={isLoading}
                  className="room-name-input"
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <button
                type="submit"
                className="create-game-button"
                disabled={isLoading}
              >
                {isLoading ? 'Création...' : 'Créer une partie'}
              </button>
            </form>
          </div>

          <div className="games-list-card">
            <h2 className="games-list-title">Parties disponibles</h2>

            {isLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
              </div>
            ) : gamesList && gamesList.length > 0 ? (
              <div className="games-list">
                {gamesList.map((game) => (
                  <div
                    key={game.id}
                    className="game-item"
                    id={`game-${game.id}`}
                  >
                    <div className="game-info">
                      <h3 className="game-owner">Partie de {game.players[0]?.username}</h3>
                      <p className="game-room-name">Salle: {game.roomName}</p>
                      <p className="game-players-count">{game.players.length} joueur(s) connecté(s)</p>
                    </div>
                    <button
                      onClick={() => handleJoinGame(game.id, game.roomName)}
                      className="join-game-button"
                    >
                      Rejoindre
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-games-message">
                <p className="no-games-text">Aucune partie disponible</p>
                <p className="no-games-subtext">Créez une nouvelle partie pour commencer à jouer</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default LobbyPage;
