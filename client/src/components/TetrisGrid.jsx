import React, { useEffect } from 'react';
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
  // Grille par défaut si grid n'est pas défini
  const defaultGrid = Array(20).fill().map(() => Array(10).fill('0'));

  // Utiliser la grille fournie ou la grille par défaut
  const baseGrid = grid || defaultGrid;

  // Créer une copie de la grille pour y ajouter la pièce courante
  const renderGrid = () => {
    // Créer une copie profonde de la grille
    const displayGrid = baseGrid.map(row => [...row]);

    // Ajouter la pièce courante à la grille (si elle existe)
    if (currentPiece && currentPiece.shape) {
      const { type, shape, x, y } = currentPiece;

      // Parcourir la forme de la pièce
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (shape[row][col] !== 0) {
            const gridY = y + row;
            const gridX = x + col;

            // S'assurer que la cellule est dans les limites de la grille
            if (
              gridY >= 0 &&
              gridY < displayGrid.length &&
              gridX >= 0 &&
              gridX < displayGrid[0].length
            ) {
              displayGrid[gridY][gridX] = type;
            }
          }
        }
      }
    }

    // Dessiner la grille
    return displayGrid.map((row, rowIndex) => (
      <div key={`row-${rowIndex}`} className="grid-row">
        {row.map((cell, colIndex) => (
          <div
            key={`cell-${rowIndex}-${colIndex}`}
            className={`grid-cell ${COLORS[cell] || COLORS['0']}`}
            data-row={rowIndex}
            data-col={colIndex}
          />
        ))}
      </div>
    ));
  };

  // Ajouter une animation lorsque des lignes sont effacées
  useEffect(() => {
    // Cette fonction pourrait être utilisée pour ajouter des animations
    // lorsque les lignes sont effacées
  }, [grid]);

  return (
    <div className="tetris-grid-container">
      <div className="tetris-grid">
        {renderGrid()}
      </div>
    </div>
  );
};

export default TetrisGrid;
