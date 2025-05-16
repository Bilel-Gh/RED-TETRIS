import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import PageTransition from '../components/PageTransition';
import './GameOverPage.css';

const GameOverPage = () => {
  const navigate = useNavigate();
  const { gameResults, resetGame } = useGame();

  const handleBackToLobby = () => {
    resetGame();
    navigate('/lobby');
  };

  // Trier les joueurs par score (ordre décroissant)
  const sortedPlayers = gameResults?.players?.sort((a, b) => b.score - a.score) || [];

  return (
    <PageTransition>
      <div className="gameover-page">
        <div className="gameover-container">
          <div className="gameover-header">
            <h1 className="gameover-title">Partie terminée</h1>
            <p className="gameover-subtitle">Merci d'avoir joué à RED TETRIS</p>
          </div>

          {gameResults ? (
            <>
              <div className="results-container">
                <h2 className="results-title">Résultats</h2>

                <div className="player-results-list">
                  {sortedPlayers.map((player, index) => (
                    <div
                      key={player.id}
                      className={`player-result ${
                        index === 0
                          ? 'first-place'
                          : index === 1
                            ? 'second-place'
                            : 'other-place'
                      }`}
                      data-rank={index + 1}
                    >
                      <div className="player-info">
                        <span className="player-rank">{index + 1}</span>
                        <div>
                          <div className="player-name">{player.username}</div>
                          <div className="player-level">Niveau: {player.level || 1}</div>
                        </div>
                      </div>
                      <div className="player-score">
                        {player.score}
                        {index === 0 && <span className="winner-crown">👑</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="gameover-actions">
                <button
                  onClick={handleBackToLobby}
                  className="back-to-lobby-button"
                  id="back-button"
                >
                  Retour au lobby
                </button>
              </div>
            </>
          ) : (
            <div className="no-results">
              <p className="no-results-text">Aucun résultat disponible.</p>
              <button
                onClick={handleBackToLobby}
                className="back-to-lobby-button"
                id="back-button-no-results"
              >
                Retour au lobby
              </button>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default GameOverPage;


