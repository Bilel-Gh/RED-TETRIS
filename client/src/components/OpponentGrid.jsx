import React from 'react';
import './Tetris.css';

// Version simplifiée des couleurs pour les grilles des adversaires
const COLORS = {
  'I': 'opponent-cell-i',
  'O': 'opponent-cell-o',
  'T': 'opponent-cell-t',
  'S': 'opponent-cell-s',
  'Z': 'opponent-cell-z',
  'J': 'opponent-cell-j',
  'L': 'opponent-cell-l',
  '0': 'opponent-cell-empty', // Cellule vide
};

const OpponentGrid = ({ username, grid, score, gameOver }) => {
  // Si la grille n'est pas définie, afficher une grille vide
  const displayGrid = grid || Array(20).fill().map(() => Array(10).fill('0'));

  // Fonction pour déterminer la classe de la cellule
  const getCellClass = (cell) => {
    if (cell === '0') return 'cell-empty';
    if (cell === 'X') return 'cell-indestructible';
    return 'cell-filled'; // Pour simplifier, toutes les pièces ont la même couleur pour l'adversaire
  };

  return (
    <div className="opponent-grid-container">
      <div className="opponent-name">{username || 'Adversaire'}</div>
      <div className="opponent-grid">
        {displayGrid.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="opponent-row">
            {row.map((cell, colIndex) => (
              <div
                key={`cell-${rowIndex}-${colIndex}`}
                className={`opponent-cell ${getCellClass(cell)}`}
              />
            ))}
          </div>
        ))}
        {gameOver && <div className="opponent-gameover">Game Over</div>}
      </div>
      <div className="opponent-grid-score">Score: {score || 0}</div>
    </div>
  );
};

export default OpponentGrid;
