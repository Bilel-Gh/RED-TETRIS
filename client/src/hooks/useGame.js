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
  autoDropPiece,
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
  const { user } = useSelector(state => state.auth);

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
      // Enregistrer l'état actuel si c'est la fin de partie
      const isGameOver = gameState && !gameState.isActive && Object.keys(gameState.playerStates || {}).length > 0;
      const isCurrentPlayerGameOver = gameState?.playerStates?.[user?.id]?.gameOver;

      if (isGameOver || isCurrentPlayerGameOver) {
        console.log('Enregistrement des résultats de fin de partie avant de quitter');
      }

      // Tenter de quitter proprement en utilisant le socket
      const response = await socketService.leaveGame();
      console.log('Réponse de socketService.leaveGame:', response);

      // Nettoyer l'état local quel que soit le résultat
      dispatch(leaveGame());

      // Retourner la réponse pour permettre au composant de décider quoi faire ensuite
      return response;
    } catch (error) {
      console.error('Erreur lors de la tentative de quitter la partie:', error);
      // Même en cas d'erreur, nettoyer l'état local
      dispatch(leaveGame());
      return { success: false, error: error.message };
    }
  };

  const startGame = async () => {
    console.log("Hook useGame: appel de startGame");
    try {
      // Vérifier si le service socket est connecté
      if (!socketService.isConnected) {
        console.error("Impossible de démarrer la partie: socket non connecté");
        return {
          success: false,
          error: "Connexion au serveur perdue. Veuillez rafraîchir la page et réessayer."
        };
      }

      // Vérifier si l'utilisateur est authentifié
      if (!socketService.isAuth) {
        console.error("Impossible de démarrer la partie: utilisateur non authentifié");
        return {
          success: false,
          error: "Vous n'êtes pas authentifié. Veuillez vous reconnecter."
        };
      }

      // Vérifier si une partie est actuellement en cours
      if (gameState?.isActive) {
        console.error("Impossible de démarrer la partie: une partie est déjà en cours");
        return {
          success: false,
          error: "Une partie est déjà en cours."
        };
      }

      // Essai de démarrer la partie avec un timeout de 5 secondes
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Le serveur prend trop de temps à répondre")), 5000);
      });

      // Exécution de la requête avec un timeout
      const response = await Promise.race([
        socketService.startGame(),
        timeoutPromise
      ]);

      console.log("Hook useGame: réponse de socketService.startGame:", response);

      // Vérifier si la réponse contient une erreur
      if (response && !response.success) {
        return {
          success: false,
          error: response.error || "Échec du démarrage de la partie"
        };
      }

      return { success: true, ...response };
    } catch (error) {
      console.error("Hook useGame: erreur lors du démarrage de la partie:", error);

      // Gérer les différents types d'erreurs
      let errorMessage = "Erreur inconnue lors du démarrage du jeu";

      if (error.message.includes("timeout") || error.message.includes("trop de temps")) {
        errorMessage = "Le serveur ne répond pas. Veuillez réessayer plus tard.";
      } else if (error.message.includes("connexion") || error.message.includes("connect")) {
        errorMessage = "Problème de connexion au serveur. Vérifiez votre connexion internet.";
      } else if (error.error) {
        errorMessage = error.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
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

  const autoDrop = useCallback(async () => {
    dispatch(autoDropPiece());
    return socketService.movePiece('down', true);
  }, [dispatch]);

  // Fonction pour réinitialiser le jeu (après une fin de partie)
  const handleResetGame = useCallback(() => {
    dispatch(resetGame());
  }, [dispatch]);

  // Vérifier si le joueur actuel est en game over
  const isCurrentPlayerGameOver = useCallback(() => {
    if (!user || !user.id || !gameState?.playerStates?.[user.id]) {
      return false;
    }
    return gameState.playerStates[user.id].gameOver === true;
  }, [gameState, user]);

  // Vérifier si le joueur actuel est le gagnant
  const isCurrentPlayerWinner = useCallback(() => {
    if (!user || !user.id || !gameState?.playerStates?.[user.id]) {
      return false;
    }
    return gameState.playerStates[user.id].isWinner === true;
  }, [gameState, user]);

  // Vérifier si tous les joueurs sont en game over
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
    autoDrop,
    resetGame: handleResetGame,
    isCurrentPlayerGameOver,
    isCurrentPlayerWinner,
    isAllPlayersGameOver
  };
}
