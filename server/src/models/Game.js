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
   * @param {string} initialFallSpeedSetting - Réglage de la vitesse de chute initiale pour cette partie
   */
  constructor(id, roomName, initialFallSpeedSetting = 'normal') {
    this.id = id;
    this.roomName = roomName;
    this.players = new Map(); // Map de Player indexée par id
    this.isActive = false;
    this.createdAt = Date.now();
    this.startedAt = null;
    this.maxPlayers = 4; // Limite à 4 joueurs
    this.host = null; // Premier joueur à rejoindre
    this.initialFallSpeedSetting = initialFallSpeedSetting; // Stocker le réglage pour la partie
    this.hasJustEnded = false;

    // Pour la séquence de pièces partagée
    this.pieceSequence = [];
    this.sequenceLength = 1000; // Nombre de pièces à pré-générer, ou plusieurs sacs
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

    const player = new Player(playerId, username, this.initialFallSpeedSetting);
    this.players.set(playerId, player);

    // Le premier joueur devient l'hôte, ou si l'hôte actuel n'est plus dans la partie
    if (!this.host || !this.players.has(this.host)) {
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

    // Générer la séquence de pièces partagée
    this.generateSharedPieceSequence();

    this.isActive = true;
    this.startedAt = Date.now();

    // Initialisation de tous les joueurs
    for (const player of this.players.values()) {
      player.startGame(this.initialFallSpeedSetting);
      this.spawnPiece(player);
    }

    return true;
  }

  /**
   * Génère une séquence de pièces partagée pour tous les joueurs
   */
  generateSharedPieceSequence() {
    const pieceTypes = Object.keys(Piece.SHAPES);
    this.pieceSequence = [];
    const bagSize = pieceTypes.length; // Typiquement 7 pour Tetris
    const numBags = Math.ceil(this.sequenceLength / bagSize);

    for (let i = 0; i < numBags; i++) {
      // Créer un "sac" avec une de chaque pièce
      let currentBag = [...pieceTypes];
      // Mélanger le sac (algorithme de Fisher-Yates)
      for (let j = currentBag.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [currentBag[j], currentBag[k]] = [currentBag[k], currentBag[j]];
      }
      this.pieceSequence.push(...currentBag);
    }
    // Assurer que la sequenceLength est respectée si elle n'est pas un multiple de bagSize
    this.pieceSequence = this.pieceSequence.slice(0, this.sequenceLength);
  }

  /**
   * Fournit le prochain type de pièce pour un joueur à partir de la séquence partagée du jeu.
   * Si la séquence est épuisée pour ce joueur, elle est (idéalement) étendue ou le jeu gère la fin.
   * Pour l'instant, si l'index dépasse la séquence principale, on la régénère (ce qui peut désynchroniser si les séquences ne sont pas identiques).
   * Une meilleure approche serait de boucler sur la séquence ou de la considérer comme infinie via régénération identique.
   * @param {Player} player - Le joueur qui demande une pièce.
   * @returns {string} Le type de la prochaine pièce.
   */
  getNextPieceTypeForPlayer(player) {
    if (player.pieceQueueIndex >= this.pieceSequence.length) {
      player.pieceQueueIndex = player.pieceQueueIndex % this.pieceSequence.length;
    }
    const type = this.pieceSequence[player.pieceQueueIndex];
    player.pieceQueueIndex++;
    return type;
  }

  /**
   * Fait apparaître une nouvelle pièce pour un joueur
   * @param {Player} player - Le joueur qui reçoit la pièce
   * @returns {boolean} true si le joueur est en game over après cette opération
   */
  spawnPiece(player) {
    const currentPieceType = player.nextPiece ? player.nextPiece.type : this.getNextPieceTypeForPlayer(player);
    const nextPieceType = this.getNextPieceTypeForPlayer(player);

    player.currentPiece = new Piece(currentPieceType, 3, 0);
    player.nextPiece = new Piece(nextPieceType, 3, 0);

    // Vérifier si la nouvelle pièce peut être placée, sinon game over
    if (this.checkCollision(player, player.currentPiece)) {
      player.gameOver = true;
      player.isPlaying = false;

      // Vérifier si tous les joueurs sont en game over
      this.checkGameEnd();

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

    // Vérifier les lignes complètes et compter leur nombre avant de les supprimer
    let linesCleared = 0;
    let penaltyApplied = false;
    let penaltyLines = 0;

    // Vérifier les lignes complètes et mettre à jour le score
    const checkLinesResult = this.checkLines(player);
    linesCleared = checkLinesResult.linesCleared;
    penaltyApplied = checkLinesResult.penaltyApplied;
    penaltyLines = checkLinesResult.penaltyLines;

    // Faire apparaître une nouvelle pièce et vérifier si game over
    const isGameOver = this.spawnPiece(player);

    return {
      isGameOver,
      player: player.getState(),
      linesCleared: linesCleared,
      penaltyApplied,
      penaltyLines
    };
  }

  /**
   * Vérifie et supprime les lignes complètes
   * @param {Player} player - Le joueur concerné
   * @returns {Object} Résultat contenant le nombre de lignes supprimées et si des pénalités ont été appliquées
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

      // Si au moins 2 lignes ont été éliminées, appliquer des pénalités aux adversaires
      if (linesCleared > 1 && this.players.size > 1) {
        // Nombre de lignes de pénalité = lignes éliminées - 1
        const penaltyLines = Math.max(1, linesCleared - 1);

        // Ajouter des lignes de pénalité à tous les autres joueurs
        for (const [playerId, otherPlayer] of this.players.entries()) {
          if (playerId !== player.id && !otherPlayer.gameOver) {
            this.addPenaltyLines(otherPlayer, penaltyLines);
          }
        }

        // Retourner les informations sur les pénalités appliquées
        return {
          linesCleared,
          penaltyApplied: true,
          penaltyLines
        };
      }
    }

    return {
      linesCleared,
      penaltyApplied: false
    };
  }

  /**
   * Ajoute des lignes de pénalité à un joueur
   * @param {Player} player - Le joueur qui reçoit les pénalités
   * @param {number} numLines - Nombre de lignes de pénalité à ajouter
   * @returns {boolean} true si le joueur est en game over après l'ajout des pénalités
   */
  addPenaltyLines(player, numLines) {
    // Ne pas ajouter de pénalités aux joueurs déjà éliminés
    if (player.gameOver) return false;

    const gridWidth = player.grid[0].length;

    // Supprimer les lignes du haut pour faire de la place aux lignes de pénalité
    player.grid.splice(0, numLines);

    // Créer et ajouter les lignes de pénalité en bas
    for (let i = 0; i < numLines; i++) {
      // Créer une ligne avec des blocs de pénalité (valeur 'penalty')
      // Avec un trou aléatoire pour permettre au joueur de continuer
      const penaltyLine = Array(gridWidth).fill('penalty');
      const holePosition = Math.floor(Math.random() * gridWidth);
      penaltyLine[holePosition] = 0; // Trou dans la ligne de pénalité

      // Ajouter la ligne de pénalité au bas de la grille
      player.grid.push(penaltyLine);
    }

    // Vérifier si l'ajout de pénalités a causé un game over
    if (player.currentPiece && this.checkCollision(player, player.currentPiece)) {
      player.gameOver = true;
      player.isPlaying = false;
      return true;
    }

    return false;
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
      return { moved: true, gameOver: false, player: player.getState() };
    }

    // Si la pièce ne peut pas descendre, la verrouiller en place
    if (dy > 0) {
      const lockResult = this.lockPiece(player);
      return {
        moved: false,
        gameOver: lockResult.isGameOver,
        player: lockResult.player,
        linesCleared: lockResult.linesCleared,
        penaltyApplied: lockResult.penaltyApplied,
        penaltyLines: lockResult.penaltyLines
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
        player: lockResult.player,
        linesCleared: lockResult.linesCleared,
        penaltyApplied: lockResult.penaltyApplied,
        penaltyLines: lockResult.penaltyLines
      };
    }

    return {
      dropped: 0,
      gameOver: false
    };
  }

  /**
   * Met à jour l'état du jeu (chute des pièces, etc.)
   * @returns {Object|null} L'état du jeu si quelque chose a changé, sinon null
   */
  update() {
    if (!this.isActive) {
      return null;
    }

    const updatedPlayers = [];

    // Mettre à jour chaque joueur actif
    for (const player of this.players.values()) {
      if (!player.isPlaying || player.gameOver) continue;

      // Vérifier si c'est le moment de faire tomber la pièce
      const currentTime = Date.now();
      if (currentTime - player.lastFallTime >= player.fallSpeed) {
        const moveResult = this.movePiece(player, 0, 1);
        player.lastFallTime = currentTime;

        if (moveResult.player) {
          updatedPlayers.push(moveResult.player);
        }
      }
    }

    if (this.isActive) {
        this.checkGameEnd();
    }

    const finalGameHasEnded = (this.startedAt !== null && !this.isActive);

    if (finalGameHasEnded && this.hasJustEnded) {
        this.hasJustEnded = false;
    } else if (this.hasJustEnded && !finalGameHasEnded) {
    }

    return { updatedPlayers, gameHasEnded: finalGameHasEnded };
  }

  /**
   * Vérifie si la partie est terminée (tous les joueurs en game over)
   * @returns {boolean} true si la partie est terminée
   */
  checkGameEnd() {
    if (!this.isActive) {
      return false;
    }

    // Compter les joueurs encore en vie (non game over)
    const activePlayers = [...this.players.values()].filter(player => {
      const isActive = !player.gameOver && player.isPlaying;
      return isActive;
    });

    const isSoloGame = this.players.size === 1;

    let shouldEndGame = false;

    if (isSoloGame) {
      shouldEndGame = activePlayers.length === 0;

      if (shouldEndGame) {
        this.winner = null;

        for (const player of this.players.values()) {
          player.isWinner = false;
          player.gameOver = true;
        }
      }

    } else {
      shouldEndGame = activePlayers.length <= 1;

      if (shouldEndGame) {
        if (activePlayers.length === 1) {
          const winner = activePlayers[0];
          this.winner = winner.id;
          winner.isWinner = true;

          const oldHost = this.host;
          this.host = winner.id;

          for (const player of this.players.values()) {
            if (player.id !== winner.id) {
              player.isWinner = false;
              player.gameOver = true;
            }
          }

        } else {
          console.log(`[Game ${this.id}] MULTIPLAYER DRAW - All players eliminated`);
          this.winner = null;

          for (const player of this.players.values()) {
            player.isWinner = false;
            player.gameOver = true;
          }
        }
      }
    }

    if (shouldEndGame) {
      this.hasJustEnded = true;
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
    const playerStates = Array.from(this.players.values()).map(player => player.getState());

    const state = {
      id: this.id,
      roomName: this.roomName,
      players: playerStates,
      isActive: this.isActive,
      isOver: !this.isActive && this.startedAt !== null, // Partie terminée
      host: this.host,
      winner: this.winner || null, // ID du gagnant s'il y en a un
      canRestart: !this.isActive && this.startedAt !== null && this.players.size > 0, // Peut être redémarrée
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      endedAt: this.endedAt || null,
      initialFallSpeedSetting: this.initialFallSpeedSetting,
      maxPlayers: this.maxPlayers
    };

    return state;
  }

  /**
   * Arrête la partie
   */
  stop() {
    this.isActive = false;
    this.endedAt = Date.now();

    // Marquer tous les joueurs comme n'étant plus en train de jouer
    for (const player of this.players.values()) {
      player.isPlaying = false;
      if (!player.finalScore) {
        player.finalScore = player.score;
        player.finalLevel = player.level;
      }
    }
  }

  /**
   * Redémarre la partie pour tous les joueurs actuels
   * @param {string} hostId - ID du joueur qui demande le restart (doit être l'host)
   * @returns {boolean} true si le restart a réussi
   */
  restart(hostId) {
    if (this.host !== hostId) {
      throw new Error('Seul l\'hôte peut redémarrer la partie');
    }

    if (this.isActive) {
      throw new Error('La partie est encore en cours');
    }

    if (this.players.size === 0) {
      throw new Error('Impossible de redémarrer une partie sans joueurs');
    }

    this.isActive = false;
    this.startedAt = null;
    this.winner = null;
    this.endedAt = null;

    for (const player of this.players.values()) {
      this.resetPlayer(player);
    }

    this.generateSharedPieceSequence();

    return true;
  }

  /**
   * Remet à zéro l'état d'un joueur pour un nouveau jeu
   * @param {Player} player - Le joueur à reset
   */
  resetPlayer(player) {
    player.resetGame();
  }

  /**
   * Vérifie si la partie peut être redémarrée
   * @param {string} hostId - ID du joueur qui demande le restart
   * @returns {boolean} true si le restart est possible
   */
  canRestart(hostId) {
    return (
      this.host === hostId &&
      !this.isActive &&
      this.players.size > 0
    );
  }
}
