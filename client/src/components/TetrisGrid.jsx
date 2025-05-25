import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
// Supprimer l'import de useGame car il n'est plus utilisé
// import { useGame } from '../hooks/useGame';
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

// Optimiser les cellules avec React.memo pour éviter les re-renders inutiles
const GridCell = React.memo(function GridCell({ type, isActive, isFalling, rowIndex, colIndex }) {
  return (
    <div
      className={`
        grid-cell
        ${COLORS[type] || COLORS['0']}
        ${isActive ? 'active-cell' : ''}
        ${isFalling ? 'falling-piece' : ''}
      `}
      data-row={rowIndex}
      data-col={colIndex}
      data-type={type}
    />
  );
});

// Optimiser les lignes de la grille
const GridRow = React.memo(function GridRow({ row, rowIndex, currentPiece, fallingCells }) {
  return (
    <div className="grid-row">
      {row.map((cell, colIndex) => {
        const isCellFalling = fallingCells.includes(`${rowIndex}-${colIndex}`);
        const isCellActive = currentPiece &&
                             colIndex >= currentPiece.x &&
                             colIndex < currentPiece.x + (currentPiece.shape[0]?.length || 0) &&
                             rowIndex >= currentPiece.y &&
                             rowIndex < currentPiece.y + (currentPiece.shape?.length || 0);

        return (
          <GridCell
            key={`cell-${rowIndex}-${colIndex}`}
            type={cell}
            isActive={isCellActive}
            isFalling={isCellFalling}
            rowIndex={rowIndex}
            colIndex={colIndex}
          />
        );
      })}
    </div>
  );
});

const TetrisGrid = ({ grid, currentPiece }) => {
  // const { autoDrop } = useGame(); // Déjà supprimé ou commenté
  const { gameState } = useSelector(state => state.game);
  const { user } = useSelector(state => state.auth);

  // Grille par défaut si grid n'est pas défini
  const defaultGrid = useMemo(() =>
    Array(20).fill().map(() => Array(10).fill('0')),
  []);

  // Using refs to prevent unnecessary re-renders
  const lastPiecePositionRef = useRef(null);
  const animationFrameRef = useRef(null);
  const displayGridRef = useRef(defaultGrid);
  const fallingCellsRef = useRef([]);
  const lastUpdateTimeRef = useRef(0);
  const lastAutoDropTimeRef = useRef(0); // Nouvelle référence pour le temps de la dernière chute auto
  const FPS_CAP = 60; // Limiter à 60 FPS pour une animation fluide mais efficace

  // States that trigger renders
  const [isPenaltyShaking, setIsPenaltyShaking] = useState(false);
  const [displayGrid, setDisplayGrid] = useState(defaultGrid);
  const [activeFallingCells, setActiveFallingCells] = useState([]);

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

  // Function to update the grid without state setters
  const updateGrid = useCallback(() => {
    // Créer une copie profonde de la grille
    const newGrid = baseGrid.map(row => [...row]);
    const newFallingCells = [];

    // Ajouter la pièce courante à la grille (si elle existe)
    if (currentPiece && currentPiece.shape) {
      const { type, shape, x, y } = currentPiece;
      // Vérifier si la position de la pièce a changé
      const positionChanged = !lastPiecePositionRef.current ||
                           lastPiecePositionRef.current.x !== x ||
                           lastPiecePositionRef.current.y !== y;

      if (positionChanged) {
        lastPiecePositionRef.current = { x, y, type };
      }

      // Parcourir la forme de la pièce
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          // Vérifier si ce numéro représente une partie de la pièce
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
              if (positionChanged && lastPiecePositionRef.current &&
                  y > lastPiecePositionRef.current.y) {
                newFallingCells.push(`${gridY}-${gridX}`);
              }
            }
          }
        }
      }
    }

    // Update refs
    displayGridRef.current = newGrid;
    fallingCellsRef.current = newFallingCells;

    // Update state (optimized to reduce renders)
    setDisplayGrid(newGrid);
    setActiveFallingCells(newFallingCells);

    return true;
  }, [baseGrid, currentPiece]);

  // Set up the initial grid rendering
  /*useEffect(() => {
    updateGrid();
  }, [baseGrid, currentPiece, updateGrid]);*/

  // Handle animation frame updates with controlled FPS
  useEffect(() => {
    // Vérifier si le jeu est actif avant toute mise à jour
    if (!gameState?.isActive || gameState?.playerStates?.[user?.id]?.gameOver) {
      // Annuler toute animation en cours si le jeu n'est pas actif
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const animationLoop = (timestamp) => {
      // Limiter les FPS pour une meilleure performance
      if (!lastUpdateTimeRef.current || timestamp - lastUpdateTimeRef.current >= (1000 / FPS_CAP)) {
        lastUpdateTimeRef.current = timestamp;
        updateGrid(); // Met à jour la grille pour l'affichage

        // Supprimer la logique de chute automatique pilotée par le client
        /*
        const isGameActive = gameState?.isActive;
        const isPlayerGameOver = gameState?.playerStates?.[user?.id]?.gameOver;

        if (currentPiece && isGameActive && !isPlayerGameOver) {
          const playerState = gameState?.playerStates?.[user?.id];
          const serverFallSpeed = playerState?.fallSpeed;
          const level = playerState?.level || gameState?.level || 1;
          const fallSpeedToUse = serverFallSpeed || Math.max(100, (playerState?.initialFallSpeedSetting === 'slow' ? 1500 : playerState?.initialFallSpeedSetting === 'fast' ? 700 : 1200) - ((level - 1) * 70));

              if (timestamp - lastAutoDropTimeRef.current >= fallSpeedToUse) {
                // autoDrop(); // Ne plus appeler autoDrop ici
                lastAutoDropTimeRef.current = timestamp;
              }
        }
        */
      }

      animationFrameRef.current = requestAnimationFrame(animationLoop);
    };

    // Démarrer l'animation si le jeu est actif et une pièce existe
    if (currentPiece) {
      animationFrameRef.current = requestAnimationFrame(animationLoop);
    }

    // Nettoyage lors du démontage
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Réinitialiser le temps de la dernière chute automatique
      lastAutoDropTimeRef.current = 0;
    };
  }, [currentPiece, gameState?.isActive, user?.id, updateGrid, gameState?.playerStates]);

  // Vérifier si le joueur actuel est en game over
  const isPlayerGameOver = gameState?.playerStates?.[user?.id]?.gameOver;

  return (
    <div className={`tetris-grid-container ${isPlayerGameOver ? 'game-over' : ''} ${isPenaltyShaking ? 'penalty-shake' : ''}`}>
      <div className="tetris-grid">
        {displayGrid.map((row, rowIndex) => (
          <GridRow
            key={`row-${rowIndex}`}
            row={row}
            rowIndex={rowIndex}
            currentPiece={currentPiece}
            fallingCells={activeFallingCells}
          />
        ))}
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
