/**
 * Classe représentant une pièce de Tetris
 */
export class Piece {
  /**
   * Les formes des pièces Tetris (représentées par des matrices)
   * I, O, T, S, Z, J, L
   */
  static SHAPES = {
    I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    O: [
      [1, 1],
      [1, 1]
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ]
  };

  /**
   * Couleurs associées à chaque type de pièce
   */
  static COLORS = {
    I: 'cyan',
    O: 'yellow',
    T: 'purple',
    S: 'green',
    Z: 'red',
    J: 'blue',
    L: 'orange'
  };

  /**
   * Crée une nouvelle pièce
   * @param {string} type - Type de pièce (I, O, T, S, Z, J, L)
   * @param {number} x - Position x initiale
   * @param {number} y - Position y initiale
   */
  constructor(type, x = 0, y = 0) {
    if (!Object.keys(Piece.SHAPES).includes(type)) {
      throw new Error(`Type de pièce invalide: ${type}`);
    }

    this.type = type;
    this.shape = JSON.parse(JSON.stringify(Piece.SHAPES[type]));
    this.color = Piece.COLORS[type];
    this.x = x;
    this.y = y;
    this.rotation = 0; // 0, 1, 2, 3 (0°, 90°, 180°, 270°)
  }

  /**
   * Clone la pièce actuelle
   * @returns {Piece} Une nouvelle instance identique
   */
  clone() {
    const piece = new Piece(this.type, this.x, this.y);
    piece.shape = JSON.parse(JSON.stringify(this.shape));
    piece.rotation = this.rotation;
    return piece;
  }

  /**
   * Fait tourner la pièce dans le sens horaire
   * @returns {Piece} La pièce elle-même (pour chaînage)
   */
  rotate() {
    // Cas spécial pour la pièce O qui ne change pas en rotation
    if (this.type === 'O') return this;

    const size = this.shape.length;
    const newShape = Array(size).fill().map(() => Array(size).fill(0));

    // Rotation 90° dans le sens horaire
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        newShape[x][size - 1 - y] = this.shape[y][x];
      }
    }

    this.shape = newShape;
    this.rotation = (this.rotation + 1) % 4;

    return this;
  }

  /**
   * Renvoie la matrice de la pièce actuelle
   * @returns {number[][]} La matrice représentant la pièce
   */
  getMatrix() {
    return this.shape;
  }
}
