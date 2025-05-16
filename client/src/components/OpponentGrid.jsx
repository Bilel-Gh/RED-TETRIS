import React from 'react';

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

const OpponentGrid = ({ grid, username, score }) => {
  if (!grid) return null;

  return (
    <div className="opponent-container">
      <div className="opponent-header">
        <span className="opponent-name">{username}</span>
        <span className="opponent-score">{score || 0} pts</span>
      </div>
      <div className="opponent-grid">
        {grid.slice(0, 15).map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="opponent-grid-row">
            {row.map((cell, colIndex) => (
              <div
                key={`cell-${rowIndex}-${colIndex}`}
                className={`opponent-grid-cell ${COLORS[cell] || COLORS['0']}`}
                data-row={rowIndex}
                data-col={colIndex}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OpponentGrid;
