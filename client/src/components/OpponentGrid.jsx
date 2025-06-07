import React from 'react';
import './OpponentGrid.css';

/**
 * Composant qui affiche la grille d'un adversaire avec son spectre
 */
const OpponentGrid = ({ username, grid, score, gameOver, spectrum }) => {
  // Calcul de la hauteur maximale pour le rendu visuel du spectre
  const maxHeight = grid ? grid.length : 20; // Valeur par défaut si grid est null

  return (
    <div className={`opponent-grid-container ${gameOver ? 'game-over' : ''}`}>
      <div className="opponent-header">
        <h3>{username || 'Adversaire'}</h3>
        <span className="opponent-score">Score: {score || 0}</span>
        {gameOver && <span className="opponent-eliminated">Éliminé</span>}
      </div>

      {/* Affichage du spectre au lieu de la grille complète */}
      <div className="opponent-spectrum">
        {spectrum && spectrum.map((height, x) => (
          <div
            key={x}
            className="spectrum-column"
            style={{
              height: `${(height / maxHeight) * 100}%`,
              backgroundColor: gameOver ? '#555' : '#ff5252'
            }}
          />
        ))}
      </div>

      {/* Grille complète (version mini) */}
      <div className="opponent-mini-grid">
        {grid && grid.map((row, y) => (
          <div key={y} className="mini-row">
            {row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className={`mini-cell ${cell ? (cell === 'penalty' ? 'penalty' : `piece-${cell}`) : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OpponentGrid;
