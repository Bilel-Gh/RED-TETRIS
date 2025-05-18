import { Player } from './Player.js';
import { Piece } from './Piece.js';

/**
 * Classe représentant une partie de Tetris
 */
export class Game {
  /**
   * Crée une nouvelle partie
   * @param {string} id - Identifiant unique de la partie
   * @param {string} roomName - Nom de la salle (pour l'URL)
   */
  constructor(id, roomName) {
    this.id = id;
    this.roomName = roomName;
    this.players = new Map(); // Map de Player indexée par id
    this.isActive = false;
    this.createdAt = Date.now();
    this.startedAt = null;
    this.maxPlayers = 4; // Limite à 4 joueurs
    this.host = null; // Premier joueur à rejoindre
  }

  /**
   * Ajoute un joueur à la partie
   * @param {string} playerId - Identifiant du joueur
   * @param {string} username - Nom d'utilisateur
   * @returns {Player} Le joueur créé
   */
  addPlayer(playerId, username) {
    if (this.players.size >= this.maxPlayers) {
      throw new Error('La partie est complète');
    }

    const player = new Player(playerId, username);
    this.players.set(playerId, player);

    // Le premier joueur devient l'hôte
    if (!this.host) {
      this.host = playerId;
    }

    return player;
  }

  /**
   * Retire un joueur de la partie
   * @param {string} playerId - Identifiant du joueur à retirer
   */
  removePlayer(playerId) {
    this.players.delete(playerId);

    // Si l'hôte part, désignez un nouvel hôte
    if (this.host === playerId && this.players.size > 0) {
      // Sélectionner le joueur qui est là depuis le plus longtemps comme nouvel hôte
      let oldestPlayer = null;
      let oldestJoinTime = Infinity;

      for (const [id, player] of this.players.entries()) {
        if (player.joinedAt < oldestJoinTime) {
          oldestJoinTime = player.joinedAt;
          oldestPlayer = id;
        }
      }

      // Si on a trouvé un joueur, le désigner comme hôte
      if (oldestPlayer) {
        this.host = oldestPlayer;
      } else {
        // Sinon, prendre le premier joueur disponible
        this.host = this.players.keys().next().value;
      }
    }

    // Si tous les joueurs sont partis, mettre fin à la partie
    if (this.players.size === 0) {
      this.isActive = false;
    }
  }

  /**
   * Démarre la partie
   */
  start() {
    if (this.players.size === 0) {
      throw new Error('Impossible de démarrer une partie sans joueurs');
    }

    this.isActive = true;
    this.startedAt = Date.now();

    // Initialisation de tous les joueurs
    for (const player of this.players.values()) {
      player.startGame();
      this.spawnPiece(player);
    }

    return true;
  }

  /**
   * Arrête la partie
   */
  stop() {
    this.isActive = false;

    // Marquer tous les joueurs comme n'étant plus en train de jouer
    for (const player of this.players.values()) {
      player.isPlaying = false;
    }
  }

  /**
   * Génère une nouvelle pièce aléatoire
   * @returns {Piece} La pièce générée
   */
  generateRandomPiece() {
    const types = Object.keys(Piece.SHAPES);
    const randomType = types[Math.floor(Math.random() * types.length)];

    // Positionner au milieu en haut
    const piece = new Piece(randomType, 3, 0);

    return piece;
  }

  /**
   * Fait apparaître une nouvelle pièce pour un joueur
   * @param {Player} player - Le joueur qui reçoit la pièce
   * @returns {boolean} true si le joueur est en game over après cette opération
   */
  spawnPiece(player) {
    // Si pas de pièce suivante, en générer une
    if (!player.nextPiece) {
      player.nextPiece = this.generateRandomPiece();
    }

    // La pièce suivante devient la pièce courante
    player.currentPiece = player.nextPiece;

    // Générer une nouvelle pièce suivante
    player.nextPiece = this.generateRandomPiece();

    // Vérifier si la nouvelle pièce peut être placée, sinon game over
    if (this.checkCollision(player, player.currentPiece)) {
      player.gameOver = true;
      player.isPlaying = false;

      // Vérifier si tous les joueurs sont en game over
      const isGameEnded = this.checkGameEnd();

      // Retourner true pour indiquer que ce joueur est en game over
      return true;
    }

    return false;
  }

  /**
   * Vérifie si une pièce entre en collision avec les limites du terrain ou d'autres pièces
   * @param {Player} player - Le joueur concerné
   * @param {Piece} piece - La pièce à vérifier
   * @param {number} dx - Déplacement horizontal optionnel
   * @param {number} dy - Déplacement vertical optionnel
   * @returns {boolean} true si collision, false sinon
   */
  checkCollision(player, piece, dx = 0, dy = 0) {
    const matrix = piece.getMatrix();

    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x] !== 0) {
          const newX = piece.x + x + dx;
          const newY = piece.y + y + dy;

          // Vérification des limites du terrain
          if (
            newX < 0 ||
            newX >= player.grid[0].length ||
            newY < 0 ||
            newY >= player.grid.length ||
            // Vérification de collision avec d'autres pièces déjà placées
            (newY >= 0 && player.grid[newY][newX] !== 0)
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Verrouille la pièce en cours à sa position actuelle
   * @param {Player} player - Le joueur concerné
   * @returns {Object} Résultat avec indication si le joueur est en game over après cette opération
   */
  lockPiece(player) {
    const piece = player.currentPiece;
    const matrix = piece.getMatrix();

    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x] !== 0) {
          const gridY = piece.y + y;
          const gridX = piece.x + x;

          if (gridY >= 0) { // Ignorer les valeurs négatives (hors grille)
            player.grid[gridY][gridX] = piece.type;
          }
        }
      }
    }

    // Vérifier les lignes complètes
    this.checkLines(player);

    // Faire apparaître une nouvelle pièce et vérifier si game over
    const isGameOver = this.spawnPiece(player);

    return {
      isGameOver,
      player: player.getState()
    };
  }

  /**
   * Vérifie et supprime les lignes complètes
   * @param {Player} player - Le joueur concerné
   */
  checkLines(player) {
    let linesCleared = 0;

    for (let y = player.grid.length - 1; y >= 0; y--) {
      // Vérifier si la ligne est complète (tous les éléments != 0)
      if (player.grid[y].every(cell => cell !== 0)) {
        // Supprimer la ligne
        player.grid.splice(y, 1);
        // Ajouter une nouvelle ligne vide en haut
        player.grid.unshift(Array(player.grid[0].length).fill(0));
        // Incrémenter le compteur de lignes
        linesCleared++;
        // Comme la ligne est supprimée, on doit revérifier la même position
        y++;
      }
    }

    // Mettre à jour le score en fonction des lignes complétées
    if (linesCleared > 0) {
      player.addLines(linesCleared);
    }
  }

  /**
   * Déplace la pièce courante si possible
   * @param {Player} player - Le joueur concerné
   * @param {number} dx - Déplacement horizontal
   * @param {number} dy - Déplacement vertical
   * @returns {Object} Résultat du déplacement, incluant si le mouvement a réussi et si game over
   */
  movePiece(player, dx, dy) {
    if (!player.currentPiece || player.gameOver || !player.isPlaying) {
      return { moved: false, gameOver: player.gameOver };
    }

    if (!this.checkCollision(player, player.currentPiece, dx, dy)) {
      player.currentPiece.x += dx;
      player.currentPiece.y += dy;
      return { moved: true, gameOver: false };
    }

    // Si la pièce ne peut pas descendre, la verrouiller en place
    if (dy > 0) {
      const lockResult = this.lockPiece(player);
      return {
        moved: false,
        gameOver: lockResult.isGameOver,
        player: lockResult.player
      };
    }

    return { moved: false, gameOver: false };
  }

  /**
   * Fait tourner la pièce courante si possible
   * @param {Player} player - Le joueur concerné
   * @returns {Object} Résultat de la rotation, incluant si la rotation a réussi et si game over
   */
  rotatePiece(player) {
    if (!player.currentPiece || player.gameOver || !player.isPlaying) {
      return { rotated: false, gameOver: player.gameOver };
    }

    // Créer une copie de la pièce et la faire tourner
    const rotatedPiece = player.currentPiece.clone().rotate();

    // Vérifier si la rotation est possible
    if (!this.checkCollision(player, rotatedPiece)) {
      // Appliquer la rotation
      player.currentPiece.rotate();
      return { rotated: true, gameOver: false };
    }

    return { rotated: false, gameOver: false };
  }

  /**
   * Fait chuter la pièce instantanément jusqu'en bas
   * @param {Player} player - Le joueur concerné
   * @returns {Object} Résultat du drop, incluant la distance descendue et si game over
   */
  dropPiece(player) {
    if (!player.currentPiece || player.gameOver || !player.isPlaying) {
      return {
        dropped: 0,
        gameOver: player.gameOver
      };
    }

    let dropDistance = 0;

    // Descendre la pièce tant qu'il n'y a pas de collision
    while (!this.checkCollision(player, player.currentPiece, 0, dropDistance + 1)) {
      dropDistance++;
    }

    if (dropDistance > 0) {
      player.currentPiece.y += dropDistance;
      const lockResult = this.lockPiece(player);
      return {
        dropped: dropDistance,
        gameOver: lockResult.isGameOver,
        player: lockResult.player
      };
    }

    return {
      dropped: 0,
      gameOver: false
    };
  }

  /**
   * Met à jour l'état du jeu pour un pas de temps
   * @param {number} deltaTime - Temps écoulé depuis la dernière mise à jour (ms)
   */
  update(deltaTime) {
    if (!this.isActive) return;

    // Mettre à jour chaque joueur actif
    for (const player of this.players.values()) {
      if (!player.isPlaying || player.gameOver) continue;

      // Vérifier si c'est le moment de faire tomber la pièce
      const currentTime = Date.now();
      if (currentTime - player.lastFallTime >= player.fallSpeed) {
        this.movePiece(player, 0, 1);
        player.lastFallTime = currentTime;
      }
    }

    // Vérifier si la partie est terminée
    this.checkGameEnd();
  }

  /**
   * Vérifie si la partie est terminée (tous les joueurs en game over)
   * @returns {boolean} true si la partie est terminée
   */
  checkGameEnd() {
    if (!this.isActive) {
      return false; // Le jeu est déjà terminé, ne pas vérifier à nouveau
    }

    // Vérifier si tous les joueurs sont en game over
    const allPlayersGameOver = [...this.players.values()].every(player =>
      player.gameOver || !player.isPlaying
    );

    // Mode solo : si le joueur unique est en game over, terminer la partie
    const isSoloGame = this.players.size === 1;
    const soloPlayerGameOver = isSoloGame && [...this.players.values()][0]?.gameOver === true;

    if ((allPlayersGameOver || soloPlayerGameOver) && this.isActive) {
      console.log('GAME OVER - Tous les joueurs sont éliminés ou mode solo terminé');
      this.stop();
      return true;
    }

    return false;
  }

  /**
   * Renvoie l'état actuel de la partie pour transmission
   * @returns {Object} État de la partie
   */
  getState() {
    return {
      id: this.id,
      roomName: this.roomName,
      players: Array.from(this.players.values()).map(p => p.getState()),
      isActive: this.isActive,
      host: this.host,
      createdAt: this.createdAt,
      startedAt: this.startedAt
    };
  }
}
