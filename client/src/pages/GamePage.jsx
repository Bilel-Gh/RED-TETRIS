import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { useAuth } from '../hooks/useAuth';
import TetrisGrid from '../components/TetrisGrid';
import NextPiece from '../components/NextPiece';
import OpponentGrid from '../components/OpponentGrid';
import ShareGame from '../components/ShareGame';
import PageTransition from '../components/PageTransition';

const GamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentGame,
    gameState,
    players,
    startGame,
    handleLeaveGame,
    moveLeft,
    moveRight,
    moveDown,
    rotate,
    drop
  } = useGame();

  // Gestionnaire d'événements clavier
  const handleKeyDown = useCallback((e) => {
    if (!gameState || !gameState.isActive) return;

    switch (e.key) {
      case 'ArrowLeft':
        moveLeft();
        break;
      case 'ArrowRight':
        moveRight();
        break;
      case 'ArrowDown':
        moveDown();
        break;
      case 'ArrowUp':
        rotate();
        break;
      case ' ': // Espace
        drop();
        break;
      default:
        break;
    }
  }, [gameState, moveLeft, moveRight, moveDown, rotate, drop]);

  // Attacher/détacher les écouteurs d'événements clavier
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Gérer le départ du jeu
  const handleLeave = async () => {
    await handleLeaveGame();
    navigate('/lobby');
  };

  // Gérer le démarrage du jeu
  const handleStart = async () => {
    await startGame();
  };

  // Générer l'URL de partage avec le nouveau format
  const generateShareUrl = () => {
    if (!currentGame || !user) return '';

    const roomName = currentGame.roomName || gameId;
    // Construire l'URL avec le format demandé room/player_name
    return `${window.location.origin}/${roomName}/${encodeURIComponent(user.username)}`;
  };

  return (
    <PageTransition>
      <div className="game-page">
        <div className="game-header">
          <h1 className="game-title">RED TETRIS</h1>

          {currentGame && (
            <div className="game-info">
              <p className="room-name">Salle: {currentGame.roomName || gameId}</p>
              <div className="players-info">
                {players.map(player => (
                  <span key={player.id} className="player-badge">
                    {player.username} {currentGame.host === player.id ? '(Hôte)' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="game-controls">
            {currentGame && currentGame.host === user?.id && !gameState?.isActive && (
              <button onClick={handleStart} className="start-button">
                Démarrer la partie
              </button>
            )}
            <button onClick={handleLeave} className="leave-button">
              Quitter la partie
            </button>
          </div>
        </div>

        {!gameState?.isActive && (
          <div className="waiting-room">
            <h2 className="waiting-title">En attente de joueurs...</h2>
            <ShareGame shareUrl={generateShareUrl()} />
          </div>
        )}

        {gameState?.isActive && (
          <div className="game-area">
            <div className="main-grid-container">
              <TetrisGrid
                grid={gameState.grid}
                currentPiece={gameState.currentPiece}
              />
              <div className="game-sidebar">
                <NextPiece type={gameState.nextPiece} />
                <div className="game-stats">
                  <div className="stat-item">
                    <span className="stat-label">Score</span>
                    <span className="stat-value">{gameState.score || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Niveau</span>
                    <span className="stat-value">{gameState.level || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Lignes</span>
                    <span className="stat-value">{gameState.lines || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="opponents-container">
              {Object.entries(gameState.playerStates || {})
                .filter(([playerId]) => playerId !== user?.id)
                .map(([playerId, playerState]) => (
                  <OpponentGrid
                    key={playerId}
                    username={playerState.username || 'Adversaire'}
                    grid={playerState.grid}
                    score={playerState.score}
                    gameOver={playerState.gameOver}
                  />
                ))
              }
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default GamePage;
