import { useState, useEffect } from 'react';

export const useGameStats = () => {
  // Initialisation des stats depuis le localStorage
  const [gameStats, setGameStats] = useState(() => {
    const savedStats = localStorage.getItem('redTetrisStats');
    if (savedStats) {
      try {
        return JSON.parse(savedStats);
      } catch (e) {
        console.error('Erreur lors du chargement des statistiques:', e);
      }
    }
    // Valeurs par défaut si aucune stat n'est trouvée
    return {
      soloGames: 0,
      multiplayerGames: 0,
      totalGames: 0,
      lastPlayed: null
    };
  });

  // Sauvegarde dans localStorage quand les stats changent
  useEffect(() => {
    localStorage.setItem('redTetrisStats', JSON.stringify(gameStats));
  }, [gameStats]);

  // Fonction pour incrémenter le compteur de parties
  const incrementGamesCount = (isMultiplayer = false) => {
    setGameStats(prevStats => ({
      soloGames: isMultiplayer ? prevStats.soloGames : prevStats.soloGames + 1,
      multiplayerGames: isMultiplayer ? prevStats.multiplayerGames + 1 : prevStats.multiplayerGames,
      totalGames: prevStats.totalGames + 1,
      lastPlayed: new Date().toISOString()
    }));
  };

  // Fonction pour réinitialiser les statistiques
  const resetStats = () => {
    setGameStats({
      soloGames: 0,
      multiplayerGames: 0,
      totalGames: 0,
      lastPlayed: null
    });
  };

  return {
    gameStats,
    incrementGamesCount,
    resetStats
  };
};
