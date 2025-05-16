import React, { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { useAuth } from '../hooks/useAuth';
import TetrisGrid from '../components/TetrisGrid';
import NextPiece from '../components/NextPiece';
import OpponentGrid from '../components/OpponentGrid';
import ShareGame from '../components/ShareGame';
import PageTransition from '../components/PageTransition';
import '../components/Tetris.css';
import './GamePage.css';

const GamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
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

  const [keyEnabled, setKeyEnabled] = useState(true);
  const [lastMoveTime, setLastMoveTime] = useState(Date.now());
  const [actionFeedback, setActionFeedback] = useState(null);

  // Gestionnaire d'événements clavier
  const handleKeyDown = useCallback((e) => {
    // Ignorer si la saisie est faite dans un input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    // Vérifier si le jeu est actif
    if (!gameState || !gameState.isActive || !keyEnabled) return;

    // Empêcher les actions par défaut pour les touches du jeu
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) {
      e.preventDefault();
    }

    // Contrôle du débit des touches (throttling)
    const now = Date.now();
    const minDelay = e.key === 'ArrowDown' ? 50 : 100; // Descente plus rapide
    if (now - lastMoveTime < minDelay) {
      return;
    }

    setLastMoveTime(now);
    setKeyEnabled(false);

    let actionPerformed = "";

    // Gérer les différentes touches
    switch (e.key) {
      case 'ArrowLeft':
        moveLeft().then(response => {
          if (response && response.success) {
            actionPerformed = "Gauche";
          }
        });
        break;
      case 'ArrowRight':
        moveRight().then(response => {
          if (response && response.success) {
            actionPerformed = "Droite";
          }
        });
        break;
      case 'ArrowDown':
        moveDown().then(response => {
          if (response && response.success) {
            actionPerformed = "Bas";
          }
        });
        break;
      case 'ArrowUp':
        rotate().then(response => {
          if (response && response.success) {
            actionPerformed = "Rotation";
          }
        });
        break;
      case ' ': // Espace
        drop().then(response => {
          if (response && response.success) {
            actionPerformed = "Chute";
          }
        });
        break;
      default:
        break;
    }

    // Afficher un retour visuel de l'action
    if (actionPerformed) {
      setActionFeedback(actionPerformed);
      setTimeout(() => setActionFeedback(null), 300);
    }

    // Réactiver les touches après un court délai
    setTimeout(() => setKeyEnabled(true), 50);
  }, [gameState, moveLeft, moveRight, moveDown, rotate, drop, keyEnabled, lastMoveTime]);

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

  // Gérer la déconnexion
  const handleLogout = async () => {
    await handleLeaveGame(); // Quitter d'abord la partie
    logout();
    navigate('/');
  };

  // Gérer le démarrage du jeu
  const handleStart = async () => {
    const result = await startGame();
    if (!result.success) {
      console.error('Erreur lors du démarrage du jeu:', result.error);
    }
  };

  // Détecter si le joueur actuel est éliminé
  const isCurrentPlayerGameOver = gameState?.playerStates?.[user?.id]?.gameOver;

  // Déterminer le nombre de joueurs encore en jeu
  const activePlayers = gameState?.playerStates ?
    Object.values(gameState.playerStates).filter(p => !p.gameOver).length :
    0;

  // Générer l'URL de partage avec le nouveau format
  const generateShareUrl = () => {
    if (!currentGame || !user) return '';

    const roomName = currentGame.roomName || gameId;
    // Construire l'URL avec le format demandé room/player_name
    return `${window.location.origin}/${roomName}/${encodeURIComponent(user.username)}`;
  };

  // Pour le débogage de l'état du jeu
  useEffect(() => {
    if (gameState) {
      console.log('État actuel du jeu:', gameState);
    }
  }, [gameState]);

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
            <button onClick={handleLogout} className="logout-button">
              Déconnexion
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

                {/* Retour visuel des actions */}
                {actionFeedback && (
                  <div className="action-feedback">{actionFeedback}</div>
                )}

                {isCurrentPlayerGameOver && (
                  <div className="game-over-message">
                    Game Over!
                  </div>
                )}

                {activePlayers === 1 && !isCurrentPlayerGameOver && (
                  <div className="winner-message">
                    Vous êtes le dernier survivant!
                  </div>
                )}

                {/* Contrôles à l'écran pour mobiles */}
                <div className="mobile-controls">
                  <button
                    className="control-btn"
                    onTouchStart={() => moveLeft()}
                    aria-label="Gauche"
                  >
                    ←
                  </button>
                  <button
                    className="control-btn"
                    onTouchStart={() => rotate()}
                    aria-label="Rotation"
                  >
                    ↻
                  </button>
                  <button
                    className="control-btn"
                    onTouchStart={() => moveRight()}
                    aria-label="Droite"
                  >
                    →
                  </button>
                  <button
                    className="control-btn"
                    onTouchStart={() => moveDown()}
                    aria-label="Bas"
                  >
                    ↓
                  </button>
                  <button
                    className="control-btn drop-btn"
                    onTouchStart={() => drop()}
                    aria-label="Chute instantanée"
                  >
                    ⤓
                  </button>
                </div>

                <div className="controls-help">
                  <p>Contrôles:</p>
                  <ul>
                    <li>← → : Déplacer</li>
                    <li>↑ : Tourner</li>
                    <li>↓ : Accélérer</li>
                    <li>Espace : Drop</li>
                  </ul>
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
