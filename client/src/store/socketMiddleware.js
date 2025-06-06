import { socketService } from '../services/socketService';

/**
 * Middleware Redux pour gérer la communication avec Socket.io.
 * Il intercepte des actions spécifiques, appelle le service socket correspondant,
 * et retourne les promesses pour que l'UI puisse réagir.
 */
const socketMiddleware = store => next => action => {

  // Laisser passer les actions standards pour qu'elles atteignent les reducers.
  // Le reducer associé à l'action interceptée (ex: `joinGame`) mettra à jour l'état
  // pour indiquer un chargement (`status: 'loading'`).
  next(action);

  // Intercepter les actions spécifiques pour déclencher des appels socket.
  switch (action.type) {
    // Gestion des parties
    case 'game/getGames':
      return socketService.getGames();

    case 'game/createGame':
      return socketService.createGame(action.payload.roomName, action.payload.fallSpeedSetting);

    case 'game/joinGame':
      return socketService.joinGame(action.payload.gameId);

    case 'game/leaveGame':
      return socketService.leaveGame();

    case 'game/startGame':
      return socketService.startGame();

    case 'game/restartGame':
      return socketService.restartGame();

    // Mouvements en jeu
    case 'game/movePieceLeft':
      return socketService.movePiece('left');

    case 'game/movePieceRight':
      return socketService.movePiece('right');

    case 'game/movePieceDown':
      return socketService.movePiece('down');

    case 'game/rotatePiece':
      return socketService.movePiece('rotate');

    case 'game/dropPiece':
      return socketService.movePiece('drop');

    case 'game/autoDropPiece':
      return socketService.movePiece('down');

    default:
      break;
  }
};

export default socketMiddleware;
