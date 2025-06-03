import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
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
  const { theme, toggleTheme } = useTheme();
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
    drop,
    restartGame,
    canRestartGame
  } = useGame();

  const [keyEnabled, setKeyEnabled] = useState(true);
  const [lastMoveTime, setLastMoveTime] = useState(Date.now());
  const [actionFeedback, setActionFeedback] = useState(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [startGameError, setStartGameError] = useState(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [isRestartingGame, setIsRestartingGame] = useState(false);
  const [restartGameError, setRestartGameError] = useState(null);

  // Gestionnaire d'événements clavier
  const handleKeyDown = useCallback((e) => {
    // Ignorer si la saisie est faite dans un input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    const playerState = gameState?.playerStates?.[user?.id];
    const isCurrentPlayerGameOver = !!playerState?.gameOver;

    if (!gameState || !gameState.isActive || isCurrentPlayerGameOver || !keyEnabled) {
      return;
    }

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
            if (response.message) {
              setActionFeedback(response.message);
            } else {
              actionPerformed = "Gauche";
            }
          }
        });
        break;
      case 'ArrowRight':
        moveRight().then(response => {
          if (response && response.success) {
            if (response.message) {
              setActionFeedback(response.message);
            } else {
              actionPerformed = "Droite";
            }
          }
        });
        break;
      case 'ArrowDown':
        moveDown().then(response => {
          if (response && response.success) {
            if (response.message) {
              setActionFeedback(response.message);
            } else {
              actionPerformed = "Bas";
            }
          }
        });
        break;
      case 'ArrowUp':
        rotate().then(response => {
          if (response && response.success) {
            if (response.message) {
              setActionFeedback(response.message);
            } else {
              actionPerformed = "Rotation";
            }
          }
        });
        break;
      case ' ': // Espace
        drop().then(response => {
          if (response && response.success) {
            if (response.message) {
              setActionFeedback(response.message);
            } else {
              actionPerformed = "Chute";
            }
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
  }, [gameState, user, moveLeft, moveRight, moveDown, rotate, drop, keyEnabled, lastMoveTime]);

  // Attacher/détacher les écouteurs d'événements clavier
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Gérer le départ du jeu
  const handleLeave = async () => {
    try {
      await handleLeaveGame();
      navigate('/lobby');
    } catch (error) {
      console.error('Erreur lors de la tentative de quitter la partie:', error);
      navigate('/lobby');
    }
  };

  // Gérer la déconnexion
  const handleLogout = async () => {
    await handleLeaveGame(); // Quitter d'abord la partie
    logout();
    navigate('/');
  };

  // Gérer le démarrage du jeu
  const handleStart = async () => {
    // Éviter les clics multiples
    if (isStartingGame) return;

    setIsStartingGame(true);
    setStartGameError(null);

    try {
      const result = await startGame();

      if (!result.success) {
        setStartGameError(result.error || "Erreur lors du démarrage du jeu");
        console.error('Erreur lors du démarrage du jeu:', result.error);
      }
    } catch (error) {
      console.error('Exception lors du démarrage du jeu:', error);
      setStartGameError(error.message || "Une erreur inattendue s'est produite");
    } finally {
      // Réactiver le bouton après 1.5 secondes pour éviter les clics répétés
      setTimeout(() => {
        setIsStartingGame(false);
      }, 1500);
    }
  };

  const handleRestart = async () => {
    // Éviter les clics multiples
    if (isRestartingGame) return;

    setIsRestartingGame(true);
    setRestartGameError(null);

    try {
      const result = await restartGame();

      if (!result.success) {
        setRestartGameError(result.error || "Erreur lors du redémarrage du jeu");
        console.error('Erreur lors du redémarrage du jeu:', result.error);
      } else {
        // Fermer les modales si le restart réussit
        setShowVictoryModal(false);
        setShowGameOverModal(false);
      }
    } catch (error) {
      console.error('Exception lors du redémarrage du jeu:', error);
      setRestartGameError(error.message || "Une erreur inattendue s'est produite");
    } finally {
      // Réactiver le bouton après 1.5 secondes pour éviter les clics répétés
      setTimeout(() => {
        setIsRestartingGame(false);
      }, 1500);
    }
  };

  useEffect(() => {
  }, [gameState]);

  // Détecter si le jeu est terminé (pas d'activité)
  const isGameOver = !gameState?.isActive && gameState?.playerStates && Object.keys(gameState.playerStates).length > 0;

  // Déterminer le nombre de joueurs encore en jeu
  const activePlayers = useMemo(() => {
    if (!gameState?.playerStates) return 0;

    // Compter les joueurs qui ne sont pas en game over
    const count = Object.values(gameState.playerStates)
      .filter(p => p && p.gameOver !== true)
      .length;

    return count;
  }, [gameState?.playerStates]);

  // Log activePlayers only when it changes to avoid console spam
  useEffect(() => {
  }, [activePlayers, gameState?.playerStates]);

  const isSoloGame = gameState?.isSoloGame;

  // Générer l'URL de partage avec le nouveau format
  const generateShareUrl = () => {
    if (!currentGame || !user) return '';

    const roomName = currentGame.roomName || gameId;
    // Construire l'URL avec le format demandé room/player_name
    return `${window.location.origin}/${roomName}/${encodeURIComponent(user.username)}`;
  };

  // Vérifier si le joueur doit voir une modale de fin de jeu
  useEffect(() => {
    // Vérifier que nous avons toutes les données nécessaires
    if (!gameState || !user?.id || !gameState.playerStates?.[user.id]) {
      // Si les données ne sont pas prêtes, s'assurer que les modales sont cachées
      setShowVictoryModal(false);
      setShowGameOverModal(false);
      return;
    }

    // Récupérer l'état du joueur actuel
    const playerState = gameState.playerStates[user.id];

    // Condition pour afficher la modale de victoire:
    // Le jeu doit avoir démarré et le joueur doit être marqué comme gagnant.
    if (gameState.startedAt && playerState.isWinner === true) {
      setShowVictoryModal(true);
      setShowGameOverModal(false);
    }
    // Condition pour afficher la modale de défaite:
    // Le jeu doit avoir démarré et le joueur doit être marqué comme game over.
    // On s'assure aussi de ne pas afficher la modale de défaite si celle de victoire est déjà affichée (edge case).
    else if (gameState.startedAt && playerState.gameOver === true) {
      setShowGameOverModal(true);
      setShowVictoryModal(false);
    }
    // Sinon, cacher les deux modales
    else {
      setShowGameOverModal(false);
      setShowVictoryModal(false);
    }
  }, [gameState, user]);

  return (
    <PageTransition>
      <div className="game-page">
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
              <>
                {!gameState?.startedAt ? (
                  // Bouton de démarrage initial
                  <button
                    onClick={handleStart}
                    className={`start-button ${isStartingGame ? 'loading' : ''}`}
                    disabled={isStartingGame}
                  >
                    {isStartingGame ? 'Démarrage...' : 'Démarrer la partie'}
                  </button>
                ) : canRestartGame() ? (
                  // Bouton de redémarrage
                  <button
                    onClick={handleRestart}
                    className={`restart-button ${isRestartingGame ? 'loading' : ''}`}
                    disabled={isRestartingGame}
                  >
                    {isRestartingGame ? 'Redémarrage...' : 'Redémarrer la partie'}
                  </button>
                ) : null}
              </>
            )}
            <button onClick={handleLeave} className="leave-button">
              Quitter la partie
            </button>
            <button onClick={handleLogout} className="logout-button">
              Déconnexion
            </button>
          </div>

          {restartGameError && (
            <div className="restart-game-error">
              <span>{restartGameError}</span>
              <button onClick={() => setRestartGameError(null)}>×</button>
            </div>
          )}

          {/* Afficher les erreurs de démarrage de jeu */}
          {startGameError && (
            <div className="start-game-error">
              <span>{startGameError}</span>
              <button onClick={() => setStartGameError(null)}>×</button>
            </div>
          )}
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
              <div className="tetris-and-next">
                <TetrisGrid
                  grid={gameState.grid}
                  currentPiece={gameState.currentPiece}
                />
                {/* Contrôles à l'écran pour mobiles */}
                <div className="mobile-controls">
                  <button
                    className="control-btn"
                    onTouchStart={() => moveLeft()}
                    onClick={() => moveLeft()}
                    onTouchEnd={(e) => e.preventDefault()}
                    aria-label="Gauche"
                  >
                    ←
                  </button>
                  <button
                    className="control-btn"
                    onTouchStart={() => moveDown()}
                    onClick={() => moveDown()}
                    onTouchEnd={(e) => e.preventDefault()}
                    aria-label="Bas"
                  >
                    ↓
                  </button>
                  <button
                    className="control-btn"
                    onTouchStart={() => rotate()}
                    onClick={() => rotate()}
                    onTouchEnd={(e) => e.preventDefault()}
                    aria-label="Rotation"
                  >
                    ↻
                  </button>
                  <button
                    className="control-btn"
                    onTouchStart={() => moveRight()}
                    onClick={() => moveRight()}
                    onTouchEnd={(e) => e.preventDefault()}
                    aria-label="Droite"
                  >
                    →
                  </button>
                  <button
                    className="control-btn drop-btn"
                    onTouchStart={() => drop()}
                    onClick={() => drop()}
                    onTouchEnd={(e) => e.preventDefault()}
                    aria-label="Chute instantanée"
                  >
                    ⤓
                  </button>
                </div>
                <div className="next-piece-side-container">
                  <NextPiece type={gameState.nextPiece} />
                </div>
              </div>
              <div className="game-sidebar">
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

                {activePlayers === 1 && gameState?.playerStates?.[user?.id] && !gameState.playerStates[user.id].gameOver && (
                  <>
                    <div className="winner-message">
                      {isSoloGame ? "Vous êtes dans une partie solo !" : "Vous êtes le dernier survivant! Victoire!"}
                    </div>
                    <button
                      className="exit-game-over-btn"
                      onClick={handleLeave}
                    >
                      Quitter la partie
                    </button>
                  </>
                )}

                {isGameOver && gameState?.playerStates?.[user?.id] && !gameState.playerStates[user.id].gameOver && (
                  <>
                    <div className="game-over-message">
                      La partie est terminée!
                    </div>
                    <button
                      className="exit-game-over-btn"
                      onClick={handleLeave}
                    >
                      Quitter la partie
                    </button>
                  </>
                )}

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

              {/* Conditionally render opponents-container only if not a solo game */}
              {!isSoloGame && (
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
                      spectrum={playerState.spectrum}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Notification de pénalité */}
            {gameState.lastPenalty && (Date.now() - gameState.lastPenalty.timestamp < 3000) && (
              <div className="penalty-notification">
                <span className="penalty-text">
                  {gameState.lastPenalty.fromPlayer === user?.id
                    ? `Vous avez envoyé ${gameState.lastPenalty.penaltyLines} lignes de pénalité aux adversaires !`
                    : `Vous avez reçu ${gameState.lastPenalty.penaltyLines} lignes de pénalité !`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Modal de Game Over pour le joueur éliminé */}
        {showGameOverModal && (
          <div className="game-over-modal-overlay">
            <div className="game-over-modal">
              <div className="game-over-modal-header">
                <h2>GAME OVER</h2>
              </div>
              <div className="game-over-modal-content">
                <p>{isSoloGame ? "Partie Solo Terminée !" : "Vous avez perdu cette partie !"}</p>
                <div className="game-over-stats">
                  <div className="stat-result">
                    <span className="stat-label">Score final</span>
                    <span className="stat-final">{gameState?.playerStates?.[user?.id]?.score || 0}</span>
                  </div>
                  <div className="stat-result">
                    <span className="stat-label">Niveau atteint</span>
                    <span className="stat-final">{gameState?.playerStates?.[user?.id]?.level || 1}</span>
                  </div>
                  <div className="stat-result">
                    <span className="stat-label">Lignes éliminées</span>
                    <span className="stat-final">{gameState?.playerStates?.[user?.id]?.lines || 0}</span>
                  </div>
                </div>
                <p className="game-over-message-wait">
                  {isSoloGame
                    ? `La partie solo est terminée !`
                    : "Vous avez perdu cette partie !"
                  }
                </p>
              </div>
              <div className="game-over-modal-footer">
                <button
                  className="game-over-exit-btn"
                  onClick={handleLeave}
                >
                  Quitter la partie
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Victoire pour le gagnant */}
        {showVictoryModal && (
          <div className="victory-modal-overlay">
            <div className="victory-modal">
              <div className="victory-modal-header">
                <h2>VICTOIRE!</h2>
              </div>
              <div className="victory-modal-content">
                <p>Félicitations! Vous êtes le dernier survivant!</p>
                <div className="victory-stats">
                  <div className="stat-result">
                    <span className="stat-label">Score final</span>
                    <span className="stat-victory">{gameState?.playerStates?.[user?.id]?.score || 0}</span>
                  </div>
                  <div className="stat-result">
                    <span className="stat-label">Niveau atteint</span>
                    <span className="stat-victory">{gameState?.playerStates?.[user?.id]?.level || 1}</span>
                  </div>
                  <div className="stat-result">
                    <span className="stat-label">Lignes éliminées</span>
                    <span className="stat-victory">{gameState?.playerStates?.[user?.id]?.lines || 0}</span>
                  </div>
                </div>
                <p className="victory-message">
                  Vous avez battu tous vos adversaires!
                </p>
                {canRestartGame() && (
                  <p className="restart-hint">
                    En tant que gagnant, vous pouvez redémarrer une nouvelle partie!
                  </p>
                )}
              </div>
              <div className="victory-modal-footer">
                {canRestartGame() && (
                  <button
                    className={`victory-restart-btn ${isRestartingGame ? 'loading' : ''}`}
                    onClick={handleRestart}
                    disabled={isRestartingGame}
                  >
                    {isRestartingGame ? 'Redémarrage...' : 'Nouvelle partie'}
                  </button>
                )}
                <button
                  className="victory-exit-btn"
                  onClick={handleLeave}
                >
                  Quitter la partie
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default GamePage;
