import React, { useEffect, useState, useRef } from 'react';
import { useGame } from '../hooks/useGame';
import { useSelector } from 'react-redux';
import './Tetris.css';

// Couleurs des pièces Tetris sans Tailwind
const COLORS = {
  'I': 'cell-i',
  'O': 'cell-o',
  'T': 'cell-t',
  'S': 'cell-s',
  'Z': 'cell-z',
  'J': 'cell-j',
  'L': 'cell-l',
  'penalty': 'cell-penalty', // Ligne de pénalité indestructible
  '0': 'cell-empty', // Cellule vide
};

const TetrisGrid = ({ grid, currentPiece }) => {
  const { autoDrop } = useGame();
  const { gameState } = useSelector(state => state.game);
  const { user } = useSelector(state => state.auth);

  // Grille par défaut si grid n'est pas défini
  const defaultGrid = Array(20).fill().map(() => Array(10).fill('0'));
  const [lastPiecePosition, setLastPiecePosition] = useState(null);
  const animationFrameRef = useRef(null);
  const [displayGrid, setDisplayGrid] = useState(defaultGrid);
  const [fallingCells, setFallingCells] = useState([]);
  const autoDropIntervalRef = useRef(null);
  const [isPenaltyShaking, setIsPenaltyShaking] = useState(false);

  // Surveiller les pénalités pour ajouter un effet de secousse
  useEffect(() => {
    if (gameState?.lastPenalty &&
        gameState.lastPenalty.timestamp &&
        Date.now() - gameState.lastPenalty.timestamp < 1000 &&
        gameState.lastPenalty.fromPlayer !== user?.id) {
      // Déclencher l'effet de secousse
      setIsPenaltyShaking(true);

      // Arrêter l'effet après un court délai
      setTimeout(() => {
        setIsPenaltyShaking(false);
      }, 1000);
    }
  }, [gameState?.lastPenalty, user?.id]);

  // Utiliser la grille fournie ou la grille par défaut
  const baseGrid = grid || defaultGrid;

  // Configuration de la chute automatique
  useEffect(() => {
    // Vérifier si le joueur est en game over ou si la partie est inactive
    const isGameActive = gameState?.isActive;
    const isPlayerGameOver = gameState?.playerStates?.[user?.id]?.gameOver;

    // Si le jeu n'est pas actif ou si le joueur est en game over, ne pas configurer la chute automatique
    if (!currentPiece || !isGameActive || isPlayerGameOver) {
      // Nettoyer tout intervalle existant
      if (autoDropIntervalRef.current) {
        clearInterval(autoDropIntervalRef.current);
        autoDropIntervalRef.current = null;
      }
      return;
    }

    // Nettoyer tout intervalle existant
    if (autoDropIntervalRef.current) {
      clearInterval(autoDropIntervalRef.current);
    }

    // Obtenir le niveau actuel du joueur depuis l'état du jeu
    const level = gameState?.level || 1;

    // La vitesse augmente avec le niveau (plus le nombre est petit, plus c'est rapide)
    // Formule plus progressive: niveau 1 = 800ms, niveau 10 = 200ms
    const baseSpeed = 900;
    const speedReduction = 70; // ms à réduire par niveau
    const minSpeed = 100; // vitesse maximale (ms minimum)

    const dropSpeed = Math.max(baseSpeed - ((level - 1) * speedReduction), minSpeed);

    // console.log(`Chute automatique configurée - Niveau: ${level}, Vitesse: ${dropSpeed}ms`);

    // Créer un nouvel intervalle pour la chute automatique
    autoDropIntervalRef.current = setInterval(() => {
      // Vérifier à nouveau avant chaque chute que le jeu est toujours actif
      const currentGameState = gameState;
      const isStillActive = currentGameState?.isActive;
      const isNowGameOver = currentGameState?.playerStates?.[user?.id]?.gameOver;

      if (isStillActive && !isNowGameOver) {
        autoDrop();
      } else {
        // Arrêter la chute si le jeu n'est plus actif
        if (autoDropIntervalRef.current) {
          clearInterval(autoDropIntervalRef.current);
          autoDropIntervalRef.current = null;
        }
      }
    }, dropSpeed);

    // Nettoyer l'intervalle lors du démontage ou lorsque la pièce change
    return () => {
      if (autoDropIntervalRef.current) {
        clearInterval(autoDropIntervalRef.current);
      }
    };
  }, [currentPiece, autoDrop, gameState, user?.id]);

  // Mettre à jour la grille avec la pièce courante
  useEffect(() => {
    // Annuler toute animation précédente
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Fonction pour mettre à jour la grille d'affichage
    const updateGrid = () => {
      // Créer une copie profonde de la grille
      const newGrid = baseGrid.map(row => [...row]);
      const newFallingCells = [];

      // Ajouter la pièce courante à la grille (si elle existe)
      if (currentPiece && currentPiece.shape) {
        const { type, shape, x, y } = currentPiece;
        // Vérifier si la position de la pièce a changé
        const positionChanged = !lastPiecePosition ||
                               lastPiecePosition.x !== x ||
                               lastPiecePosition.y !== y;

        if (positionChanged) {
          setLastPiecePosition({ x, y, type });
        }

        // Parcourir la forme de la pièce
        for (let row = 0; row < shape.length; row++) {
          for (let col = 0; col < shape[row].length; col++) {
            // Vérifier si ce numéro représente une partie de la pièce
            // Dans certaines implémentations, 0 = vide, 1+ = pièce
            const isPartOfPiece = shape[row][col] !== 0;

            if (isPartOfPiece) {
              const gridY = y + row;
              const gridX = x + col;

              // S'assurer que la cellule est dans les limites de la grille
              if (
                gridY >= 0 &&
                gridY < newGrid.length &&
                gridX >= 0 &&
                gridX < newGrid[0].length
              ) {
                newGrid[gridY][gridX] = type;

                // Marquer cette cellule comme étant en chute si la pièce descend
                if (positionChanged && lastPiecePosition && y > lastPiecePosition.y) {
                  newFallingCells.push(`${gridY}-${gridX}`);
                }
              }
            }
          }
        }
      }

      setDisplayGrid(newGrid);
      setFallingCells(newFallingCells);
    };

    // Mettre à jour la grille immédiatement
    updateGrid();

    // Définir une animation pour les mises à jour
    const animationLoop = () => {
      updateGrid();
      animationFrameRef.current = requestAnimationFrame(animationLoop);
    };

    // Démarrer l'animation si le jeu est actif
    if (currentPiece) {
      animationFrameRef.current = requestAnimationFrame(animationLoop);
    }

    // Nettoyage lors du démontage
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [baseGrid, currentPiece, lastPiecePosition]);

  // Dessiner la grille
  const renderGrid = () => {
    return displayGrid.map((row, rowIndex) => (
      <div key={`row-${rowIndex}`} className="grid-row">
        {row.map((cell, colIndex) => {
          const isCellFalling = fallingCells.includes(`${rowIndex}-${colIndex}`);
          const isCellActive = currentPiece &&
                               colIndex >= currentPiece.x &&
                               colIndex < currentPiece.x + (currentPiece.shape[0]?.length || 0) &&
                               rowIndex >= currentPiece.y &&
                               rowIndex < currentPiece.y + (currentPiece.shape?.length || 0);

          return (
            <div
              key={`cell-${rowIndex}-${colIndex}`}
              className={`
                grid-cell
                ${COLORS[cell] || COLORS['0']}
                ${isCellActive ? 'active-cell' : ''}
                ${isCellFalling ? 'falling-piece' : ''}
              `}
              data-row={rowIndex}
              data-col={colIndex}
              data-type={cell}
            />
          );
        })}
      </div>
    ));
  };

  // Vérifier si le joueur actuel est en game over
  const isPlayerGameOver = gameState?.playerStates?.[user?.id]?.gameOver;

  // Récupère explicitement l'état du joueur pour un meilleur debug
  const playerState = gameState?.playerStates?.[user?.id];

  useEffect(() => {
    if (isPlayerGameOver) {
      console.log('TetrisGrid: Joueur en Game Over:', playerState);
    }
  }, [isPlayerGameOver, playerState]);

  return (
    <div className={`tetris-grid-container ${isPlayerGameOver ? 'game-over' : ''} ${isPenaltyShaking ? 'penalty-shake' : ''}`}>
      <div className="tetris-grid">
        {renderGrid()}
      </div>
      {isPlayerGameOver && (
        <div className="game-over-overlay">
          <span>GAME OVER</span>
        </div>
      )}
    </div>
  );
};

export default TetrisGrid;
