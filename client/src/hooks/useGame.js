import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import socketService from '../services/socketService';
import {
  fetchGamesStart,
  fetchGamesSuccess,
  fetchGamesFailure,
  createGameStart,
  joinGameStart,
  joinGameFailure,
  leaveGame,
  movePieceLeft,
  movePieceRight,
  movePieceDown,
  rotatePiece,
  dropPiece,
  resetGame
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

  const getGames = async () => {
    dispatch(fetchGamesStart());
    try {
      const response = await socketService.getGames();
      if (response.success) {
        dispatch(fetchGamesSuccess(response.games));
        return response;
      } else {
        dispatch(fetchGamesFailure(response.error));
        return response;
      }
    } catch (error) {
      dispatch(fetchGamesFailure(error.message));
      return { success: false, error: error.message };
    }
  };

  const createGame = async (roomName) => {
    dispatch(createGameStart());
    try {
      if (!roomName) {
        const error = "Nom de la salle non défini";
        return { success: false, error };
      }

      const response = await socketService.createGame(roomName);
      return response;
    } catch (error) {
      return error;
    }
  };

  const joinGame = async (gameId) => {
    dispatch(joinGameStart());
    try {
      if (!gameId) {
        const error = "ID de partie non défini";
        dispatch(joinGameFailure(error));
        return { success: false, error };
      }

      console.log("Tentative de rejoindre la partie avec ID:", gameId);
      const response = await socketService.joinGame(gameId);
      console.log("Réponse de socketService.joinGame:", response);

      return response;
    } catch (error) {
      console.error("Erreur lors de la tentative de rejoindre la partie:", error);
      return error;
    }
  };

  const handleLeaveGame = async () => {
    try {
      const response = await socketService.leaveGame();
      if (response.success) {
        dispatch(leaveGame());
      }
      return response;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const startGame = async () => {
    console.log("Hook useGame: appel de startGame");
    try {
      const response = await socketService.startGame();
      console.log("Hook useGame: réponse de socketService.startGame:", response);
      return { success: true, ...response };
    } catch (error) {
      console.error("Hook useGame: erreur lors du démarrage de la partie:", error);
      return {
        success: false,
        error: error.error || error.message || "Erreur inconnue lors du démarrage du jeu"
      };
    }
  };

  const moveLeft = useCallback(async () => {
    dispatch(movePieceLeft());
    return socketService.movePiece('left');
  }, [dispatch]);

  const moveRight = useCallback(async () => {
    dispatch(movePieceRight());
    return socketService.movePiece('right');
  }, [dispatch]);

  const moveDown = useCallback(async () => {
    dispatch(movePieceDown());
    return socketService.movePiece('down');
  }, [dispatch]);

  const rotate = useCallback(async () => {
    dispatch(rotatePiece());
    return socketService.movePiece('rotate');
  }, [dispatch]);

  const drop = useCallback(async () => {
    dispatch(dropPiece());
    return socketService.movePiece('drop');
  }, [dispatch]);

  // Fonction pour réinitialiser le jeu (après une fin de partie)
  const handleResetGame = useCallback(() => {
    dispatch(resetGame());
  }, [dispatch]);

  return {
    gamesList,
    currentGame,
    gameState,
    players,
    status,
    error,
    gameResults,
    getGames,
    createGame,
    joinGame,
    handleLeaveGame,
    startGame,
    moveLeft,
    moveRight,
    moveDown,
    rotate,
    drop,
    resetGame: handleResetGame
  };
}
