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
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [startGameError, setStartGameError] = useState(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);

  // Gestionnaire d'événements clavier
  const handleKeyDown = useCallback((e) => {
    // Ignorer si la saisie est faite dans un input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    // Vérifier si le jeu est actif et que le joueur n'est pas en game over
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
    console.log('Tentative de quitter la partie...');
    try {
      const result = await handleLeaveGame();
      console.log('Résultat de handleLeaveGame:', result);
      navigate('/lobby');
    } catch (error) {
      console.error('Erreur lors de la tentative de quitter la partie:', error);
      // En cas d'erreur, rediriger quand même vers le lobby
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
      console.log("Tentative de démarrage de la partie...");
      const result = await startGame();
      console.log("Résultat du démarrage:", result);

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

  useEffect(() => {
    console.log('GAME STATE', gameState);
  }, [gameState]);

  // Détecter si le jeu est terminé (pas d'activité)
  const isGameOver = !gameState?.isActive && gameState?.playerStates && Object.keys(gameState.playerStates).length > 0;

  // Déterminer le nombre de joueurs encore en jeu
  const activePlayers = gameState?.playerStates ?
    Object.values(gameState.playerStates).filter(p => !p.gameOver).length :
    0;

  const isSoloGame = gameState?.isSoloGame;

  // Pour le débogage - afficher les états du jeu
  useEffect(() => {
    if (gameState && user) {
      console.log('showGameOverModal', showGameOverModal);
      console.log('isGameOver', isGameOver);
      console.log('activePlayers', activePlayers);
      console.log('GAME STATE', gameState.playerStates);
    }
  }, [gameState, isGameOver, showGameOverModal, activePlayers, isSoloGame, user]);

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
      return;
    }

    // Récupérer l'état du joueur actuel
    const playerState = gameState.playerStates[user.id];

    // Ajouter des logs détaillés pour le débogage
    console.log('Information modales:', {
      isActive: gameState.isActive,
      hasStarted: !!gameState.startedAt,
      gameOver: playerState.gameOver,
      isWinner: playerState.isWinner,
      userId: user.id,
      activePlayers: Object.values(gameState.playerStates).filter(p => !p.gameOver).length
    });

    // Condition pour afficher la modale de victoire:
    // 1. Le jeu a été actif (startedAt existe)
    // 2. Le jeu est maintenant inactif ou le joueur est marqué comme gagnant
    // 3. Le joueur est explicitement marqué comme gagnant
    if (gameState.startedAt && playerState.isWinner === true) {
      console.log('MODAL: Victoire pour', user.id);
      setShowVictoryModal(true);
      setShowGameOverModal(false);
      return;
    }

    // Condition pour afficher la modale de défaite:
    // 1. Le jeu a été actif (startedAt existe)
    // 2. Le joueur est explicitement marqué comme éliminé (gameOver)
    if (gameState.startedAt && playerState.gameOver === true) {
      console.log('MODAL: Game Over pour', user.id);
      setShowGameOverModal(true);
      setShowVictoryModal(false);
      return;
    }

    // Sinon, cacher les deux modales
    if (showGameOverModal || showVictoryModal) {
      console.log('MODAL: Aucune modale nécessaire');
      setShowGameOverModal(false);
      setShowVictoryModal(false);
    }
  }, [gameState, user, showGameOverModal, showVictoryModal]);

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
              <button
                onClick={handleStart}
                className={`start-button ${isStartingGame ? 'loading' : ''}`}
                disabled={isStartingGame}
              >
                {isStartingGame ? 'Démarrage...' : 'Démarrer la partie'}
              </button>
            )}
            <button onClick={handleLeave} className="leave-button">
              Quitter la partie
            </button>
            <button onClick={handleLogout} className="logout-button">
              Déconnexion
            </button>
          </div>

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
                    spectrum={playerState.spectrum}
                  />
                ))
              }
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
                    : activePlayers > 0
                      ? "Vous pouvez observer la partie en cours ou quitter maintenant."
                      : "La partie est maintenant terminée pour tous les joueurs."
                  }
                </p>
              </div>
              <div className="game-over-modal-footer">
                {!isSoloGame && activePlayers > 0 && (
                  <button
                    className="game-over-close-btn"
                    onClick={() => setShowGameOverModal(false)}
                  >
                    Observer la partie
                  </button>
                )}
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
              </div>
              <div className="victory-modal-footer">
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
