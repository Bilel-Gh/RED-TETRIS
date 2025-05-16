import React from 'react';

// Couleurs des pièces Tetris sans Tailwind
const COLORS = {
  'I': 'cell-i',
  'O': 'cell-o',
  'T': 'cell-t',
  'S': 'cell-s',
  'Z': 'cell-z',
  'J': 'cell-j',
  'L': 'cell-l',
  '0': 'cell-empty', // Cellule vide
};

const TetrisGrid = ({ grid, currentPiece }) => {
  // Créer une copie de la grille pour y ajouter la pièce courante
  const renderGrid = () => {
    if (!grid) return null;

    // Créer une copie profonde de la grille
    const displayGrid = grid.map(row => [...row]);

    // Ajouter la pièce courante à la grille (si elle existe)
    if (currentPiece) {
      const { type, shape, x, y } = currentPiece;

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

  return (
    <div className="tetris-grid-container">
      <div className="tetris-grid">
      {renderGrid()}
      </div>
    </div>
  );
};

export default TetrisGrid;
