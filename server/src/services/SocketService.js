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

    this.gameManager = new GameManager();

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
        console.log(`Ping reçu de ${socket.id}`);
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
      socket.on('game:create', (roomName, callback) => {
        try {
          const user = this.users.get(socket.id);

          if (!user) {
            throw new Error('Vous devez être connecté');
          }

          // Valider le nom de la salle
          if (!roomName || typeof roomName !== 'string' || roomName.trim() === '') {
            throw new Error('Le nom de la salle est invalide');
          }

          // Nettoyer le nom de la salle (enlever espaces, caractères spéciaux, etc.)
          const cleanRoomName = roomName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

          const game = this.gameManager.createGame(socket.id, user.username, cleanRoomName);

          // Rejoindre la room Socket.io pour cette partie
          socket.join(game.id);

          callback({ success: true, game: game.getState() });

          // Notifier les autres utilisateurs de la nouvelle partie disponible
          console.log('Émission de l\'événement game:list_updated pour la creation de la partie', game.id);
          this.io.emit('game:list_updated', this.gameManager.getAvailableGames());
          console.log('Liste des parties mise à jour:', this.gameManager.getAvailableGames());
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
            console.log('Dernier joueur actif quitte la partie ou tous les joueurs sont en game over, terminaison de la partie');
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

          // Si le résultat contient des données de joueur mises à jour, les utiliser
          const playerState = {
            ...(result?.player || player.getState()),
            isCurrentPlayer: true
          };

          // Envoyer d'abord la mise à jour au joueur qui a fait l'action
          // avec toutes les informations (pièce courante, prochaine pièce, etc.)
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
            // Informer tous les joueurs qu'une pénalité a été appliquée
            this.io.to(game.id).emit('game:penalty_applied', {
              gameId: game.id,
              fromPlayer: player.id,
              linesCleared: result.linesCleared,
              penaltyLines: result.penaltyLines
            });
          }

          // Si le mouvement a provoqué un game over pour ce joueur, émettre l'événement immédiatement
          if (result?.gameOver) {
            console.log('Game over détecté pour le joueur', player.username, 'après un mouvement');

            // Mettre à jour l'état de game over du joueur
            player.gameOver = true;
            player.isPlaying = false;

            // Vérifier si c'est la fin du jeu pour tous les joueurs
            if (game.checkGameEnd()) {
              console.log('Émission de l\'événement game:over pour la partie', game.id, 'avec', game.players.size, 'joueurs');
              console.log('État des joueurs:', Array.from(game.players.entries()).map(([id, p]) =>
                `ID: ${id}, nom: ${p.username}, gameOver: ${p.gameOver}, isPlaying: ${p.isPlaying}`
              ));

              this.io.to(game.id).emit('game:over', {
                gameId: game.id,
                players: Array.from(game.players.values()).map(p => p.getState()),
                endedAt: Date.now()
              });
            } else {
              // Notifier uniquement le joueur en game over si la partie continue pour les autres
              socket.emit('game:player_gameover', {
                gameId: game.id,
                player: {
                  ...player.getState(),
                  gameOver: true,
                  isCurrentPlayer: true
                }
              });
            }
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
