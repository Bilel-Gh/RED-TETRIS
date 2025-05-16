import React, { useEffect, useState, useRef } from 'react';
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
  'X': 'cell-indestructible', // Ligne indestructible
  '0': 'cell-empty', // Cellule vide
};

const TetrisGrid = ({ grid, currentPiece }) => {
  console.log('TetrisGrid - currentPiece:', currentPiece);
  console.log('TetrisGrid - grid:', grid);

  // Grille par défaut si grid n'est pas défini
  const defaultGrid = Array(20).fill().map(() => Array(10).fill('0'));
  const [lastPiecePosition, setLastPiecePosition] = useState(null);
  const animationFrameRef = useRef(null);
  const [displayGrid, setDisplayGrid] = useState(defaultGrid);
  const [fallingCells, setFallingCells] = useState([]);

  // Utiliser la grille fournie ou la grille par défaut
  const baseGrid = grid || defaultGrid;

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
        console.log('Rendu de la pièce:', type, 'à position:', x, y);

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

  return (
    <div className="tetris-grid-container">
      <div className="tetris-grid">
        {renderGrid()}
      </div>
    </div>
  );
};

export default TetrisGrid;
