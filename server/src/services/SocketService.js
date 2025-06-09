import { Server } from 'socket.io';
import { GameManager } from './GameManager.js';

/**
 * Service qui gère les communications Socket.io
 */
export class SocketService {
  /**
   * Crée un nouveau service Socket
   * @param {http.Server} httpServer - Serveur HTTP pour attacher Socket.io
   */
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Authorization", "X-Requested-With", "Content-Type"]
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 10000,
      pingInterval: 2000,
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 5
    });

    this.gameManager = new GameManager(
      // Callback for broadcasting player updates
      (gameId, playersToUpdate) => {
        for (const playerState of playersToUpdate) {
          this.io.to(playerState.id).emit('game:player_updated', {
            gameId: gameId,
            player: { ...playerState, isCurrentPlayer: true }
          });
          const roomSockets = this.io.sockets.adapter.rooms.get(gameId);
          if (roomSockets) {
            roomSockets.forEach(socketId => {
              if (socketId !== playerState.id) {
                this.io.to(socketId).emit('game:player_updated', {
                  gameId: gameId,
                  player: { ...playerState, isCurrentPlayer: false }
                });
              }
            });
          }
        }
      },
      // Callback for when a game has fully concluded
      (concludedGame) => {
        if (!concludedGame) return;

        const playersInfo = Array.from(concludedGame.players.values()).map(p => p.getState());
        const endedTimestamp = concludedGame.endedAt || Date.now();

        for (const player of concludedGame.players.values()) {
          if (player.id === concludedGame.winner) { // Check if this player is the winner
            this.io.to(player.id).emit('game:winner', {
              gameId: concludedGame.id,
              players: playersInfo,
              winner: concludedGame.winner,
              host: concludedGame.host, // Send winner ID
              endedAt: endedTimestamp
            });
          } else {
            this.io.to(player.id).emit('game:over', {
              gameId: concludedGame.id,
              players: playersInfo,
              winner: concludedGame.winner,
              host: concludedGame.host,
              endedAt: endedTimestamp
            });
          }
        }
      }
    );

    // Map des utilisateurs connectés (socketId -> userData)
    this.users = new Map();

    // Démarrer le service
    this.init();
  }

  /**
   * Initialise les écouteurs d'événements Socket.io
   */
  init() {
    this.io.on('connection', (socket) => {
      console.log(`Nouveau client connecté: ${socket.id}`);

      // Gestion du ping pour tester la connexion
      socket.on('ping', (timestamp, callback) => {
        callback({
          serverTime: Date.now(),
          clientTime: timestamp,
          latency: Date.now() - timestamp
        });
      });

      // --- Gestion des utilisateurs ---

      // Utilisateur se connecte avec son nom
      socket.on('user:login', (username, callback) => {
        try {
          const userData = { id: socket.id, username, joinedAt: Date.now() };
          this.users.set(socket.id, userData);

          callback({ success: true, user: userData });

          // Notifier les autres utilisateurs
          socket.broadcast.emit('user:joined', userData);
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });

      // --- Gestion des parties ---

      // Créer une nouvelle partie
      socket.on('game:create', ({ roomName, fallSpeedSetting }, callback) => {
        try {
          const user = this.users.get(socket.id);

          if (!user) {
            console.error('[SocketService] User not found for socket ID:', socket.id);
            throw new Error('Vous devez être connecté');
          }

          // Valider le nom de la salle (avant nettoyage)
          if (!roomName || typeof roomName !== 'string' || roomName.trim() === '') {
            console.error(`[SocketService] Initial roomName validation failed: roomName='${roomName}', type=${typeof roomName}`);
            throw new Error('Le nom de la salle est invalide');
          }

          // Nettoyer le nom de la salle (enlever espaces, caractères spéciaux, etc.)
          const cleanRoomName = roomName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

          // Valider le nom de la salle nettoyé
          if (!cleanRoomName || cleanRoomName.replace(/-/g, '') === '') {
            console.error(`[SocketService] cleanRoomName validation failed: '${cleanRoomName}' is empty or only hyphens.`);
            throw new Error('Le nom de la salle est invalide après nettoyage (ne peut être vide ou contenir uniquement des tirets).');
          }

          const game = this.gameManager.createGame(socket.id, user.username, cleanRoomName, fallSpeedSetting);

          // Rejoindre la room Socket.io pour cette partie
          socket.join(game.id);

          callback({ success: true, game: game.getState() });

          // Notifier les autres utilisateurs de la nouvelle partie disponible
          this.io.emit('game:list_updated', this.gameManager.getAvailableGames());
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });

      // Rejoindre une partie existante
      socket.on('game:join', (gameIdOrRoomName, callback) => {
        try {
          const user = this.users.get(socket.id);

          if (!user) {
            throw new Error('Vous devez être connecté');
          }

          const game = this.gameManager.joinGame(gameIdOrRoomName, socket.id, user.username);

          // Rejoindre la room Socket.io pour cette partie
          socket.join(game.id);

          callback({ success: true, game: game.getState() });

          // Notifier les autres joueurs dans cette partie
          socket.to(game.id).emit('game:player_joined', {
            gameId: game.id,
            roomName: game.roomName,
            player: {
              id: user.id,
              username: user.username
            }
          });

          // Notifier tous les utilisateurs de la mise à jour des parties disponibles
          this.io.emit('game:list_updated', this.gameManager.getAvailableGames());
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });

      // Quitter une partie
      socket.on('game:leave', (callback) => {
        try {
          const game = this.gameManager.getPlayerGame(socket.id);

          if (!game) {
            throw new Error('Vous n\'êtes pas dans une partie');
          }

          const gameId = game.id;

          // Vérifier si c'est le seul joueur actif restant
          const activePlayers = Array.from(game.players.values()).filter(p => !p.gameOver).length;
          const isCurrentPlayerGameOver = game.players.get(socket.id)?.gameOver;

          // Si c'est le dernier joueur actif ou si tous les joueurs sont en game over,
          // terminer la partie complètement
          if (activePlayers <= 1 || (isCurrentPlayerGameOver && activePlayers === 0)) {
            // Marquer la partie comme inactive
            game.isActive = false;
            game.endedAt = Date.now();
          }

          this.gameManager.leaveGame(socket.id);

          // Quitter la room Socket.io
          socket.leave(gameId);

          callback({ success: true });

          // Récupérer le jeu mis à jour
          const updatedGame = this.gameManager.getGame(gameId);

          if (updatedGame) {
            // Notifier les autres joueurs dans cette partie du joueur qui part
            this.io.to(gameId).emit('game:player_left', {
              gameId,
              playerId: socket.id,
              newHost: updatedGame.host // Envoyer le nouvel hôte
            });

            // Envoyer l'état complet du jeu mis à jour (incluant le nouvel hôte)
            this.io.to(gameId).emit('game:state_updated', updatedGame.getState());
          }

          // Notifier tous les utilisateurs de la mise à jour des parties disponibles
          this.io.emit('game:list_updated', this.gameManager.getAvailableGames());
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });

      // Démarrer une partie
      socket.on('game:start', (callback) => {
        try {
          const game = this.gameManager.getPlayerGame(socket.id);

          if (!game) {
            throw new Error('Vous n\'êtes pas dans une partie');
          }

          this.gameManager.startGame(game.id, socket.id);

          callback({ success: true });

          // Récupérer l'état complet du jeu pour l'envoyer avec l'événement de démarrage
          const gameState = game.getState();

          // Notifier tous les joueurs dans cette partie
          this.io.to(game.id).emit('game:started', {
            gameId: game.id,
            startedAt: game.startedAt,
            initialState: gameState // Inclure l'état initial du jeu
          });

          // Envoyer immédiatement un état détaillé pour chaque joueur
          for (const player of game.players.values()) {
            this.io.to(player.id).emit('game:player_updated', {
              gameId: game.id,
              player: {
                ...player.getState(),
                isCurrentPlayer: true // Marquer pour savoir que c'est le joueur courant
              }
            });
          }

          // Notifier tous les utilisateurs de la mise à jour des parties disponibles
          this.io.emit('game:list_updated', this.gameManager.getAvailableGames());
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });

      // Redémarrer une partie terminée
      socket.on('game:restart', (callback) => {
        try {
          const user = this.users.get(socket.id);

          if (!user) {
            throw new Error('Vous devez être connecté');
          }

          const game = this.gameManager.getPlayerGame(socket.id);

          if (!game) {
            throw new Error('Vous n\'êtes pas dans une partie');
          }

          // Vérifier que c'est bien l'hôte qui demande le restart
          if (game.host !== socket.id) {
            throw new Error('Seul l\'hôte peut redémarrer la partie');
          }

          // Vérifier que la partie est terminée
          if (game.isActive) {
            throw new Error('La partie est encore en cours');
          }

          // Redémarrer la partie via le GameManager
          this.gameManager.restartGame(game.id, socket.id);

          callback({ success: true });

          // Notifier tous les joueurs de la partie que le restart a eu lieu
          this.io.to(game.id).emit('game:restarted', {
            gameId: game.id,
            roomName: game.roomName,
            host: game.host,
            restartedAt: Date.now(),
            gameState: game.getState()
          });

          // Mettre à jour la liste des parties disponibles
          this.io.emit('game:list_updated', this.gameManager.getAvailableGames());

          console.log(`Partie ${game.roomName} redémarrée par ${user.username}`);

        } catch (error) {
          console.error('Erreur lors du restart:', error);
          callback({
            success: false,
            error: error.message
          });
        }
      });

      // Lister les parties disponibles
      socket.on('game:list', (callback) => {
        try {
          const games = this.gameManager.getAvailableGames();
          callback({ success: true, games });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });

      // --- Actions de jeu ---

      // Déplacer la pièce
      socket.on('game:move', (direction, callback) => {
        try {
          const game = this.gameManager.getPlayerGame(socket.id);

          // Vérifier si le jeu existe
          if (!game) {
            callback({
              success: false,
              error: 'Vous n\'êtes pas dans une partie'
            });
            return;
          }
          const player = game.players.get(socket.id);

          let result;

          switch (direction) {
            case 'left':
              result = game.movePiece(player, -1, 0);
              break;
            case 'right':
              result = game.movePiece(player, 1, 0);
              break;
            case 'down':
              result = game.movePiece(player, 0, 1);
              break;
            case 'drop':
              result = game.dropPiece(player);
              break;
            case 'rotate':
              result = game.rotatePiece(player);
              break;
            default:
              callback({
                success: false,
                error: 'Direction invalide'
              });
              return;
          }

          callback({ success: true, result });

          console.log(`[Server] Move result for ${player.username}:`, {
            direction: direction,
            result: result,
            'result?.gameOver': result?.gameOver,
            'result?.isGameOver': result?.isGameOver,
            'player.gameOver after move': player.gameOver,
            'player.isPlaying after move': player.isPlaying
          });

          // Si le résultat contient des données de joueur mises à jour, les utiliser
          const playerState = {
            ...(result?.player || player.getState()),
            isCurrentPlayer: true
          };

          // Envoyer d'abord la mise à jour au joueur qui a fait l'action
          socket.emit('game:player_updated', {
            gameId: game.id,
            player: playerState
          });

          // Puis envoyer aux autres joueurs sans le marqueur isCurrentPlayer
          socket.to(game.id).emit('game:player_updated', {
            gameId: game.id,
            player: result?.player || player.getState()
          });

          // Si le résultat indique des lignes complétées avec pénalités
          if (result?.penaltyApplied) {
            this.io.to(game.id).emit('game:penalty_applied', {
              gameId: game.id,
              fromPlayer: player.id,
              linesCleared: result.linesCleared,
              penaltyLines: result.penaltyLines
            });
          }

          const gameWasActive = game.isActive;
          const isGameEnded = game.checkGameEnd();

          console.log(`[Server] After move - gameWasActive: ${gameWasActive}, isGameEnded: ${isGameEnded}, game.isActive: ${game.isActive}`);

          if (gameWasActive && isGameEnded) {
            // 🏆 LE JEU VIENT DE SE TERMINER - Utiliser le callback existant
            console.log(`[Server] 🏆 Game ${game.id} just ended! Calling onGameConcluded callback`);

            // Utiliser directement le callback onGameConcluded du constructeur
            // (c'est la même logique que dans le callback du constructeur SocketService)
            const playersInfo = Array.from(game.players.values()).map(p => p.getState());
            const endedTimestamp = game.endedAt || Date.now();

            for (const gamePlayer of game.players.values()) {
              if (gamePlayer.id === game.winner) {
                console.log(`[Server] 🏆 Emitting 'game:winner' to winner ${gamePlayer.username} (${gamePlayer.id})`);
                this.io.to(gamePlayer.id).emit('game:winner', {
                  gameId: game.id,
                  players: playersInfo,
                  winner: game.winner,
                  endedAt: endedTimestamp
                });
              } else {
                console.log(`[Server] 💀 Emitting 'game:over' to loser ${gamePlayer.username} (${gamePlayer.id})`);
                this.io.to(gamePlayer.id).emit('game:over', {
                  gameId: game.id,
                  players: playersInfo,
                  winner: game.winner,
                  endedAt: endedTimestamp
                });
              }
            }

            // État global mis à jour
            this.io.to(game.id).emit('game:state_updated', game.getState());
          }

        } catch (error) {
          console.error('Erreur lors du mouvement:', error);
          callback({
            success: false,
            error: error.message || 'Erreur inconnue lors du mouvement'
          });
        }
      });

      // --- Gestion de la déconnexion ---

      socket.on('disconnect', () => {
        console.log(`Client déconnecté: ${socket.id}`);

        // Supprimer l'utilisateur de sa partie si nécessaire
        const game = this.gameManager.getPlayerGame(socket.id);

        if (game) {
          const gameId = game.id;
          this.gameManager.leaveGame(socket.id);

          // Récupérer le jeu mis à jour
          const updatedGame = this.gameManager.getGame(gameId);

          if (updatedGame) {
            // Notifier les autres joueurs dans cette partie
            this.io.to(gameId).emit('game:player_left', {
              gameId,
              playerId: socket.id,
              newHost: updatedGame.host // Envoyer le nouvel hôte
            });

            // Envoyer l'état complet du jeu mis à jour (incluant le nouvel hôte)
            this.io.to(gameId).emit('game:state_updated', updatedGame.getState());
          }

          // Notifier tous les utilisateurs de la mise à jour des parties disponibles
          this.io.emit('game:list_updated', this.gameManager.getAvailableGames());
        }

        // Supprimer l'utilisateur de la liste des utilisateurs connectés
        this.users.delete(socket.id);

        // Notifier les autres utilisateurs
        this.io.emit('user:left', { id: socket.id });
      });

    });

    // Démarrer le nettoyage périodique des parties
    setInterval(() => {
      this.gameManager.cleanupGames();
    }, 10 * 60 * 1000); // Toutes les 10 minutes
  }
}
