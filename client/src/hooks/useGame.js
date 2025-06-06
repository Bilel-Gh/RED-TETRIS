import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  getGames,
  createGame,
  joinGame,
  leaveGame,
  startGame,
  restartGame,
  movePieceLeft,
  movePieceRight,
  movePieceDown,
  rotatePiece,
  dropPiece,
  autoDropPiece,
  resetGame,
} from '../features/gameSlice';

export function useGame() {
  const dispatch = useDispatch();
  const {
    gameList: gamesList,
    currentGame,
    gameState,
    players,
    status,
    error,
    gameResults
  } = useSelector(state => state.game);
  const { user } = useSelector(state => state.auth);

  const handleGetGames = useCallback(() => {
    return dispatch(getGames());
  }, [dispatch]);

  const handleCreateGame = useCallback((roomName, fallSpeedSetting) => {
    if (!roomName) {
      return Promise.resolve({ success: false, error: "Nom de la salle non défini" });
    }
    return dispatch(createGame({ roomName, fallSpeedSetting }));
  }, [dispatch]);

  const handleJoinGame = useCallback((gameId) => {
    if (!gameId) {
      return Promise.resolve({ success: false, error: "ID de partie non défini" });
    }
    return dispatch(joinGame({ gameId }));
  }, [dispatch]);

  const handleLeaveGame = useCallback(() => {
    return dispatch(leaveGame());
  }, [dispatch]);

  const handleStartGame = useCallback(() => {
    // La logique de vérification (est-connecté, etc.) est maintenant implicitement gérée
    // par le socketService. Si besoin, des vérifications peuvent rester ici.
    return dispatch(startGame());
  }, [dispatch]);

  const handleRestartGame = useCallback(() => {
    // La logique de vérification (est-hôte, etc.) peut rester ici ou être déplacée
    // côté serveur pour plus de sécurité.
    if (currentGame?.host !== user?.id) {
      return Promise.resolve({ success: false, error: "Seul l'hôte peut redémarrer la partie." });
    }
    return dispatch(restartGame());
  }, [dispatch, currentGame, user]);

  const canRestartGame = useCallback(() => {
    return (
      currentGame?.host === user?.id && // L'utilisateur est l'hôte
      !gameState?.isActive && // La partie n'est pas active
      gameState?.startedAt && // La partie a été démarrée au moins une fois
      players && players.length > 0 // Il y a des joueurs dans la partie
    );
  }, [currentGame, gameState, user, players]);

  const moveLeft = useCallback(() => {
    return dispatch(movePieceLeft());
  }, [dispatch]);

  const moveRight = useCallback(() => {
    return dispatch(movePieceRight());
  }, [dispatch]);

  const moveDown = useCallback(() => {
    return dispatch(movePieceDown());
  }, [dispatch]);

  const rotate = useCallback(() => {
    return dispatch(rotatePiece());
  }, [dispatch]);

  const drop = useCallback(() => {
    return dispatch(dropPiece());
  }, [dispatch]);

  const autoDrop = useCallback(() => {
    return dispatch(autoDropPiece());
  }, [dispatch]);

  const handleResetGame = useCallback(() => {
    dispatch(resetGame());
  }, [dispatch]);

  // Les fonctions de vérification de l'état restent inchangées
  const isCurrentPlayerGameOver = useCallback(() => {
    if (!user || !user.id || !gameState?.playerStates?.[user.id]) {
      return false;
    }
    return gameState.playerStates[user.id].gameOver === true;
  }, [gameState, user]);

  const isCurrentPlayerWinner = useCallback(() => {
    if (!user || !user.id || !gameState?.playerStates?.[user.id]) {
      return false;
    }
    return gameState.playerStates[user.id].isWinner === true;
  }, [gameState, user]);

  const isAllPlayersGameOver = useCallback(() => {
    if (!gameState?.playerStates) return false;
    const playerStates = Object.values(gameState.playerStates);
    return playerStates.length > 0 && playerStates.every(player => player.gameOver);
  }, [gameState]);

  return {
    gamesList,
    currentGame,
    gameState,
    players,
    status,
    error,
    gameResults,
    getGames: handleGetGames,
    createGame: handleCreateGame,
    joinGame: handleJoinGame,
    handleLeaveGame,
    startGame: handleStartGame,
    restartGame: handleRestartGame,
    canRestartGame,
    moveLeft,
    moveRight,
    moveDown,
    rotate,
    drop,
    autoDrop,
    resetGame: handleResetGame,
    isCurrentPlayerGameOver,
    isCurrentPlayerWinner,
    isAllPlayersGameOver
  };
}
