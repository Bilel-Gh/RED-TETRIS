import { GRID_WIDTH, GRID_HEIGHT } from '../config/gameConfig.js';

/**
 * Classe représentant un joueur dans le jeu Tetris
 */
export class Player {
  /**
   * Crée un nouveau joueur
   * @param {string} id - Identifiant unique du joueur (généralement socketId)
   * @param {string} username - Nom d'utilisateur
   * @param {string} initialFallSpeedSetting - Réglage de la vitesse de chute initiale ('slow', 'normal', 'fast')
   */
  constructor(id, username, initialFallSpeedSetting = 'normal') {
    this.id = id;
    this.username = username;
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.isPlaying = false;
    this.gameOver = false;
    this.isWinner = false;
    this.joinedAt = Date.now(); // Horodatage d'arrivée du joueur
    this.finalScore = 0; // Score final quand la partie se termine
    this.finalLevel = 0; // Niveau final quand la partie se termine

    // La grille de jeu (10x20 par défaut)
    this.grid = this.createEmptyGrid();

    // Pièce en cours et pièce suivante
    this.currentPiece = null;
    this.nextPiece = null;

    // Gestion du temps et de la vitesse
    this.lastFallTime = 0;
    this.initialFallSpeedSetting = initialFallSpeedSetting;
    this.fallSpeed = this.getBaseFallSpeed(); // Temps en ms entre les chutes (diminue avec le niveau)
    this.pieceQueueIndex = 0; // Index du joueur dans la séquence de pièces de la partie

    // Spectre pour visualisation
    this.spectrum = Array(GRID_WIDTH || 10).fill(0);
  }

  /**
   * Crée une grille vide
   * @returns {Array} Grille 2D vide
   */
  createEmptyGrid() {
    return Array(GRID_HEIGHT || 20).fill().map(() => Array(GRID_WIDTH || 10).fill(0));
  }

  /**
   * Calcule la vitesse de chute de base en fonction du réglage initial.
   * @returns {number} Vitesse de chute de base en ms.
   */
  getBaseFallSpeed() {
    switch (this.initialFallSpeedSetting) {
      case 'slow':
        return 1000;
      case 'fast':
        return 300;
      case 'normal':
      default:
        return 700;
    }
  }

  /**
   * Commence une nouvelle partie
   * @param {string} initialFallSpeedSetting - Réglage de la vitesse de chute initiale optionnel
   */
  startGame(initialFallSpeedSetting) {
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.isPlaying = true;
    this.gameOver = false;
    this.lastFallTime = Date.now();
    this.grid = this.createEmptyGrid();
    this.currentPiece = null;
    this.nextPiece = null;
    if (initialFallSpeedSetting) {
      this.initialFallSpeedSetting = initialFallSpeedSetting;
    }
    this.fallSpeed = this.getBaseFallSpeed();
    this.pieceQueueIndex = 0; // Réinitialiser l'index de pièce pour une nouvelle partie
    this.spectrum = Array(GRID_WIDTH || 10).fill(0);
  }

  /**
   * Réinitialise les données du joueur pour une nouvelle partie
   */
  resetGame() {
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.gameOver = false;
    this.isWinner = false;
    this.finalScore = 0;
    this.finalLevel = 0;
    this.grid = this.createEmptyGrid();
    this.currentPiece = null;
    this.nextPiece = null;
    this.fallSpeed = this.getBaseFallSpeed();
    this.lastFallTime = 0;
    this.pieceQueueIndex = 0; // Réinitialiser aussi ici
    this.spectrum = Array(GRID_WIDTH || 10).fill(0);
    this.isPlaying = false; // Explicitly reset isPlaying
  }

  /**
   * Ajoute des points au score du joueur
   * @param {number} points - Points à ajouter
   */
  addScore(points) {
    this.score += points;
  }

  /**
   * Ajoute des lignes complétées au compteur et met à jour le niveau
   * @param {number} numLines - Nombre de lignes complétées
   */
  addLines(numLines) {
    this.lines += numLines;

    // Calculer le score en fonction du nombre de lignes
    // Bonus pour les lignes multiples
    let scoreToAdd = 0;
    switch (numLines) {
      case 1:
        scoreToAdd = 40 * this.level;
        break;
      case 2:
        scoreToAdd = 100 * this.level;
        break;
      case 3:
        scoreToAdd = 300 * this.level;
        break;
      case 4:
        scoreToAdd = 1200 * this.level;
        break;
      default:
        scoreToAdd = numLines * 40 * this.level;
    }

    this.score += scoreToAdd;

    // Augmenter le niveau tous les 10 lignes
    this.level = Math.floor(this.lines / 10) + 1;

    // Accélérer la vitesse de chute en fonction du niveau et du réglage initial
    const baseSpeed = this.getBaseFallSpeed();
    this.fallSpeed = Math.max(100, baseSpeed - ((this.level - 1) * 50)); // 50ms de réduction par niveau

    // Mettre à jour le spectre
    this.updateSpectrum();

    return {
      score: this.score,
      level: this.level,
      lines: this.lines,
      fallSpeed: this.fallSpeed
    };
  }

  /**
   * Met à jour le spectre du joueur (hauteur maximale de chaque colonne)
   */
  updateSpectrum() {
    const width = this.grid[0].length;
    this.spectrum = Array(width).fill(0);

    // Parcourir chaque colonne
    for (let x = 0; x < width; x++) {
      // Trouver la hauteur maximale de chaque colonne (en partant du haut)
      for (let y = 0; y < this.grid.length; y++) {
        if (this.grid[y][x] !== 0) {
          // Hauteur = nombre de lignes - position y
          this.spectrum[x] = this.grid.length - y;
          break;
        }
      }
    }
  }

  /**
   * Renvoie une représentation sérialisable du joueur pour transmission
   * @returns {Object} État du joueur
   */
  getState() {
    // Mettre à jour le spectre avant de renvoyer l'état
    this.updateSpectrum();

    return {
      id: this.id,
      username: this.username,
      score: this.score,
      level: this.level,
      lines: this.lines,
      joinedAt: this.joinedAt,
      grid: this.grid,
      currentPiece: this.currentPiece ? {
        type: this.currentPiece.type,
        shape: this.currentPiece.shape,
        x: this.currentPiece.x,
        y: this.currentPiece.y,
        rotation: this.currentPiece.rotation
      } : null,
      nextPiece: this.nextPiece ? {
        type: this.nextPiece.type
      } : null,
      isPlaying: this.isPlaying,
      gameOver: this.gameOver,
      isWinner: this.isWinner || false,
      finalScore: this.finalScore || this.score, // Utiliser le score actuel par défaut
      finalLevel: this.finalLevel || this.level,  // Utiliser le niveau actuel par défaut
      spectrum: this.spectrum, // Ajout du spectre pour la visualisation des adversaires
      fallSpeed: this.fallSpeed,
      initialFallSpeedSetting: this.initialFallSpeedSetting,
      // pieceQueueIndex: this.pieceQueueIndex, // Pas nécessaire de l'envoyer au client a priori
    };
  }
}
