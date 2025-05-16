/**
 * Classe représentant un joueur dans le jeu Tetris
 */
export class Player {
  /**
   * Crée un nouveau joueur
   * @param {string} id - Identifiant unique du joueur (généralement socketId)
   * @param {string} username - Nom d'utilisateur
   */
  constructor(id, username) {
    this.id = id;
    this.username = username;
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.isPlaying = false;
    this.gameOver = false;
    this.joinedAt = Date.now(); // Horodatage d'arrivée du joueur

    // La grille de jeu (10x20 par défaut)
    this.grid = Array(20).fill().map(() => Array(10).fill(0));

    // Pièce en cours et pièce suivante
    this.currentPiece = null;
    this.nextPiece = null;

    // Gestion du temps et de la vitesse
    this.lastFallTime = Date.now();
    this.fallSpeed = 1000; // Temps en ms entre les chutes (diminue avec le niveau)
  }

  /**
   * Commence une nouvelle partie
   */
  startGame() {
    this.resetGame();
    this.isPlaying = true;
  }

  /**
   * Réinitialise les données du joueur pour une nouvelle partie
   */
  resetGame() {
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.gameOver = false;
    this.grid = Array(20).fill().map(() => Array(10).fill(0));
    this.currentPiece = null;
    this.nextPiece = null;
    this.fallSpeed = 1000;
    this.lastFallTime = Date.now();
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
   * @param {number} linesCount - Nombre de lignes complétées
   */
  addLines(linesCount) {
    if (linesCount <= 0) return;

    // Ajout des lignes au compteur
    this.lines += linesCount;

    // Calcul du score selon le nombre de lignes complétées en une fois
    let points = 0;
    switch (linesCount) {
      case 1: points = 40 * this.level; break;
      case 2: points = 100 * this.level; break;
      case 3: points = 300 * this.level; break;
      case 4: points = 1200 * this.level; break; // Tetris!
    }
    this.score += points;

    // Mise à jour du niveau (toutes les 10 lignes)
    const newLevel = Math.floor(this.lines / 10) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      // Augmentation de la vitesse avec le niveau
      this.fallSpeed = Math.max(100, 1000 - ((this.level - 1) * 100));
    }
  }

  /**
   * Renvoie une représentation sérialisable du joueur pour transmission
   * @returns {Object} État du joueur
   */
  getState() {
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
      nextPiece: this.nextPiece ? this.nextPiece.type : null,
      isPlaying: this.isPlaying,
      gameOver: this.gameOver
    };
  }
}
