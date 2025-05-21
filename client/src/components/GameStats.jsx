import React from 'react';
import { useGameStats } from '../hooks/useGameStats';

const GameStats = () => {
  const { gameStats } = useGameStats();

  return (
    <div className="game-stats">
      <h3>Vos statistiques</h3>
      <div className="stats-content">
        <div className="stat-item">
          <span className="stat-label">Parties totales :</span>
          <span className="stat-value">{gameStats.totalGames}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Parties solo :</span>
          <span className="stat-value">{gameStats.soloGames}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Parties multijoueur :</span>
          <span className="stat-value">{gameStats.multiplayerGames}</span>
        </div>
        {gameStats.lastPlayed && (
          <div className="stat-item">
            <span className="stat-label">Dernière partie :</span>
            <span className="stat-value">
              {new Date(gameStats.lastPlayed).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameStats;
