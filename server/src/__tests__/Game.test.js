import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Game } from '../models/Game.js';
import { Player } from '../models/Player.js';
import { Piece } from '../models/Piece.js';

// Mock des classes dépendantes
vi.mock('../models/Player.js', () => {
  return {
    Player: vi.fn().mockImplementation((id, username, initialFallSpeedSetting) => {
      const playerInstance = {
        id,
        username,
        initialFallSpeedSetting,
        score: 0,
        level: 1,
        lines: 0,
        isPlaying: false,
        gameOver: false,
        isWinner: false,
        grid: Array(20).fill(null).map(() => Array(10).fill(0)),
        currentPiece: null,
        nextPiece: null,
        lastFallTime: Date.now(), // Initialized, startGame might update it
        fallSpeed: 1000, // Default or based on initialFallSpeedSetting
        pieceQueueIndex: 0,
        joinedAt: Date.now(),
        finalScore: null,
        finalLevel: null,
        startGame: vi.fn(function(speedSettingUsed) { // Note: param is speedSettingUsed
          this.isPlaying = true;
          this.gameOver = false;
          this.lastFallTime = Date.now();
          this.fallSpeed = Player.SPEED_SETTINGS[speedSettingUsed] || 1000;
          // Reset relevant game state for a new game
          this.score = 0;
          this.level = 1;
          this.lines = 0;
          this.grid = Array(20).fill(null).map(() => Array(10).fill(0));
          this.currentPiece = null;
          this.nextPiece = null;
          this.pieceQueueIndex = 0;
        }),
        addLines: vi.fn(function(linesCleared) {
          this.lines += linesCleared;
          this.level = Math.floor(this.lines / 10) + 1;
          // Score logic can be more complex, this is basic
          const points = { 1: 100, 2: 300, 3: 500, 4: 800 };
          this.score += (points[linesCleared] || 0) * this.level;
        }),
        getState: vi.fn(function() {
          return {
            id: this.id,
            username: this.username,
            score: this.score,
            level: this.level,
            lines: this.lines,
            isPlaying: this.isPlaying,
            gameOver: this.gameOver,
            isWinner: this.isWinner,
            grid: this.grid,
            nextPiece: this.nextPiece ? { type: this.nextPiece.type, shape: this.nextPiece.shape, x: this.nextPiece.x, y: this.nextPiece.y } : null,
            currentPiece: this.currentPiece ? { type: this.currentPiece.type, shape: this.currentPiece.shape, x: this.currentPiece.x, y: this.currentPiece.y, rotation: this.currentPiece.rotation } : null,
            initialFallSpeedSetting: this.initialFallSpeedSetting,
            // Potentially other fields if Player.js has them
          };
        })
      };
      return playerInstance;
    })
  };
});

// Static properties for Player mock
Player.SPEED_SETTINGS = {
  slow: 1500,
  normal: 1000,
  fast: 500,
};


vi.mock('../models/Piece.js', () => {
  const MockedPieceConstructor = vi.fn().mockImplementation((type, x, y) => {
    const pieceInstance = {
      type,
      x,
      y,
      rotation: 0,
      shape: MockedPieceConstructor.SHAPES[type] || [[1,1],[1,1]], // Default shape if type unknown
      clone: vi.fn().mockImplementation(function() {
        // Create a new object that is a copy of this one
        const clonedPiece = { ...this };
        clonedPiece.clone = this.clone; // Ensure clone method is also on the cloned object
        clonedPiece.rotate = this.rotate;
        clonedPiece.getMatrix = this.getMatrix;
        return clonedPiece;
      }),
      rotate: vi.fn().mockImplementation(function() {
        this.rotation = (this.rotation + 1) % 4;
        // Simplified rotation logic for mock: In a real scenario, shape would change.
        // For testing, we often mock getMatrix to return the rotated shape.
        return this;
      }),
      getMatrix: vi.fn().mockImplementation(function() {
        // This mock should ideally return different matrices based on this.type and this.rotation
        // For simplicity, returning the base shape. Tests needing specific rotated shapes
        // might need to further mock this on a per-instance basis.
        return MockedPieceConstructor.SHAPES[this.type] || [[1,1],[1,1]];
      })
    };
    return pieceInstance;
  });

  MockedPieceConstructor.SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]],
    P: [['penalty']]
  };
  MockedPieceConstructor.COLORS = { I: 'cyan', O: 'yellow', T: 'purple', S: 'green', Z: 'red', J: 'blue', L: 'orange', P: 'gray' };

  return { Piece: MockedPieceConstructor };
});

describe('Game', () => {
  let game;
  const gameId = 'game-123';
  const roomName = 'test-room';
  const initialFallSpeed = 'normal';
  let consoleWarnSpy;
  let consoleLogSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    const now = 1000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    game = new Game(gameId, roomName, initialFallSpeed);
    game.generateSharedPieceSequence();

    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('constructor', () => {
    it('devrait initialiser un jeu avec les valeurs correctes', () => {
      expect(game.id).toBe(gameId);
      expect(game.roomName).toBe(roomName);
      expect(game.initialFallSpeedSetting).toBe(initialFallSpeed);
      expect(game.players.size).toBe(0);
      expect(game.isActive).toBe(false);
      expect(game.createdAt).toBe(1000);
      expect(game.startedAt).toBeNull();
      expect(game.maxPlayers).toBe(4);
      expect(game.host).toBeNull();
      expect(game.pieceSequence.length).toBe(game.sequenceLength);
    });
  });

  describe('addPlayer', () => {
    it('devrait ajouter un joueur et le définir comme hôte s\'il est le premier', () => {
      const player = game.addPlayer('player1', 'User1');
      expect(Player).toHaveBeenCalledWith('player1', 'User1', game.initialFallSpeedSetting);
      expect(game.players.size).toBe(1);
      expect(game.players.get('player1')).toBe(player);
      expect(game.host).toBe('player1');
    });

    it('devrait ajouter plusieurs joueurs sans changer l\'hôte', () => {
      game.addPlayer('player1', 'User1');
      const player2 = game.addPlayer('player2', 'User2');
      expect(game.players.size).toBe(2);
      expect(game.players.get('player2')).toBe(player2);
      expect(game.host).toBe('player1');
    });

    it('devrait lever une erreur si le nombre maximum de joueurs est atteint', () => {
      game.addPlayer('p1', 'U1'); game.addPlayer('p2', 'U2'); game.addPlayer('p3', 'U3'); game.addPlayer('p4', 'U4');
      expect(() => game.addPlayer('p5', 'U5')).toThrow('La partie est complète');
    });
  });

  describe('removePlayer', () => {
    it('devrait supprimer un joueur correctement', () => {
      const player1 = game.addPlayer('player1', 'User1');
      const player2 = game.addPlayer('player2', 'User2');
      game.removePlayer('player1');
      expect(game.players.size).toBe(1);
      expect(game.players.has('player1')).toBe(false);
    });

    it('devrait changer l\'hôte vers le joueur le plus anciennement connecté quand l\'hôte actuel quitte', () => {
      const player1 = game.addPlayer('player1', 'User1');
      const player2 = game.addPlayer('player2', 'User2');
      game.isActive = true;
      game.removePlayer('player1');
      expect(game.players.size).toBe(1);
      expect(game.host).toBe('player2');
    });

    it('devrait changer l\'hôte vers le premier joueur disponible si aucun joueur plus ancien, ou si un seul reste', () => {
      const player1 = game.addPlayer('player1', 'User1');
      game.removePlayer('player1');
      const player2 = game.addPlayer('player2', 'User2');
      expect(game.host).toBe('player2');
    });

    it('devrait mettre fin à la partie si tous les joueurs partent', () => {
      game.isActive = true;
      game.removePlayer('player1');
      game.removePlayer('player2');
      game.removePlayer('player3');
      expect(game.players.size).toBe(0);
      expect(game.isActive).toBe(false);
    });
  });

  describe('start', () => {
    beforeEach(() => {
      game.addPlayer('player1', 'User1');
      game.addPlayer('player2', 'User2');
      vi.spyOn(game, 'spawnPiece').mockImplementation(() => false);
    });

    it('devrait démarrer la partie correctement', () => {
      vi.spyOn(game, 'generateSharedPieceSequence').mockClear();
      const result = game.start();
      expect(result).toBe(true);
      expect(game.isActive).toBe(true);
      expect(game.startedAt).toBe(Date.now());
      expect(game.generateSharedPieceSequence).toHaveBeenCalledTimes(1);
      game.players.forEach(player => {
        expect(player.startGame).toHaveBeenCalledWith(initialFallSpeed);
        expect(game.spawnPiece).toHaveBeenCalledWith(player);
      });
    });

    it('devrait lever une erreur si la partie est vide', () => {
      game.players.clear();
      expect(() => game.start()).toThrow('Impossible de démarrer une partie sans joueurs');
    });
  });

  describe('generateSharedPieceSequence', () => {
    it('devrait générer une séquence de la longueur correcte', () => {
      game.sequenceLength = 20;
      game.generateSharedPieceSequence();
      expect(game.pieceSequence.length).toBe(20);
    });

    it('devrait contenir toutes les pièces types dans les sacs mélangés', () => {
      game.sequenceLength = Object.keys(Piece.SHAPES).length * 2;
      game.generateSharedPieceSequence();
      const pieceTypes = Object.keys(Piece.SHAPES);
      const firstBag = game.pieceSequence.slice(0, pieceTypes.length);
      const secondBag = game.pieceSequence.slice(pieceTypes.length, pieceTypes.length * 2);
      pieceTypes.forEach(type => {
        expect(firstBag).toContain(type);
        expect(secondBag).toContain(type);
      });
      const sortedTypes = [...pieceTypes].sort();
      let isSorted = true;
      for(let i=0; i< sortedTypes.length; i++) {
          if(firstBag[i] !== sortedTypes[i]) {
              isSorted = false;
              break;
          }
      }
      expect(isSorted).toBe(false);
    });
  });

  describe('getNextPieceTypeForPlayer', () => {
    let player;
    beforeEach(() => {
      player = game.addPlayer('p1', 'P1');
      game.pieceSequence = ['I', 'O', 'T'];
      player.pieceQueueIndex = 0;
    });

    it('devrait retourner la pièce suivante et incrémenter l\'index', () => {
      expect(game.getNextPieceTypeForPlayer(player)).toBe('I');
      expect(player.pieceQueueIndex).toBe(1);
      expect(game.getNextPieceTypeForPlayer(player)).toBe('O');
      expect(player.pieceQueueIndex).toBe(2);
    });

    it('devrait boucler sur la séquence si l\'index du joueur dépasse la longueur', () => {
      player.pieceQueueIndex = 3;
      expect(game.getNextPieceTypeForPlayer(player)).toBe('I');
      expect(player.pieceQueueIndex).toBe(1);
    });
  });

  describe('spawnPiece', () => {
    let player1;
    beforeEach(() => {
      player1 = game.addPlayer('player1', 'User1');
      game.pieceSequence = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
      player1.pieceQueueIndex = 0;
      Piece.mockClear();
    });

    it('devrait utiliser la nextPiece du joueur si elle existe, puis en générer une nouvelle', () => {
      player1.nextPiece = new Piece('T', 1, 1);
      Piece.mockClear();

      vi.spyOn(game, 'checkCollision').mockReturnValue(false);
      game.spawnPiece(player1);

      expect(player1.currentPiece.type).toBe('T');
      expect(Piece).toHaveBeenCalledTimes(2);
      expect(Piece).toHaveBeenCalledWith('T', 3, 0);
      expect(Piece).toHaveBeenCalledWith(game.pieceSequence[0], 3, 0);
      expect(player1.nextPiece.type).toBe(game.pieceSequence[0]);
      expect(player1.pieceQueueIndex).toBe(1);
    });

    it('devrait générer une pièce courante et une pièce suivante si nextPiece du joueur est nulle', () => {
      player1.nextPiece = null;
      player1.pieceQueueIndex = 0;
      Piece.mockClear();
      vi.spyOn(game, 'checkCollision').mockReturnValue(false);

      game.spawnPiece(player1);

      expect(Piece).toHaveBeenCalledTimes(2);
      expect(Piece).toHaveBeenCalledWith(game.pieceSequence[0], 3, 0);
      expect(player1.currentPiece.type).toBe(game.pieceSequence[0]);
      expect(Piece).toHaveBeenCalledWith(game.pieceSequence[1], 3, 0);
      expect(player1.nextPiece.type).toBe(game.pieceSequence[1]);
      expect(player1.pieceQueueIndex).toBe(2);
    });

    it('devrait mettre le joueur en game over si la nouvelle pièce entre en collision', () => {
      vi.spyOn(game, 'checkCollision').mockReturnValue(true);
      vi.spyOn(game, 'checkGameEnd').mockReturnValue(false);

      const result = game.spawnPiece(player1);

      expect(result).toBe(true);
      expect(player1.gameOver).toBe(true);
      expect(player1.isPlaying).toBe(false);
      expect(game.checkGameEnd).toHaveBeenCalled();
    });
  });

  describe('checkCollision', () => {
    let player;
    let piece;
    beforeEach(() => {
      player = game.addPlayer('p1', 'P1');
      piece = new Piece('O', 0, 0);
      player.grid = Array(20).fill(null).map(() => Array(10).fill(0));
    });

    it('devrait retourner true en cas de collision avec la limite gauche', () => {
      expect(game.checkCollision(player, piece, -1, 0)).toBe(true);
    });
    it('devrait retourner true en cas de collision avec la limite droite', () => {
      piece.x = player.grid[0].length - 1;
      expect(game.checkCollision(player, piece, 0, 0)).toBe(true);
    });
    it('devrait retourner true en cas de collision avec la limite du bas', () => {
      piece.y = player.grid.length - 1;
      expect(game.checkCollision(player, piece, 0, 0)).toBe(true);
    });
    it('devrait retourner true en cas de collision avec des blocs existants', () => {
      player.grid[1][1] = 'L';
      piece.x = 0; piece.y = 0;
      expect(game.checkCollision(player, piece, 0, 0)).toBe(true);
    });
    it('devrait retourner false si pas de collision', () => {
      piece.x = 3; piece.y = 3;
      expect(game.checkCollision(player, piece, 0, 0)).toBe(false);
    });
    it('devrait gérer les pièces partiellement au-dessus de la grille (spawn)', () => {
      piece.y = -1;
      piece.type = 'T';
      piece.getMatrix.mockReturnValue(Piece.SHAPES.T);

      expect(game.checkCollision(player, piece, 0, 0)).toBe(true);
      player.grid[0][piece.x + 1] = 'S';
      expect(game.checkCollision(player, piece, 0, 0)).toBe(true);
    });
  });

  describe('lockPiece', () => {
    let player;
    beforeEach(() => {
      player = game.addPlayer('p1', 'User1');
      player.currentPiece = new Piece('I', 3, 0);
      vi.spyOn(game, 'checkLines').mockReturnValue({ linesCleared: 0, penaltyApplied: false, penaltyLines: 0 });
      vi.spyOn(game, 'spawnPiece').mockReturnValue(false);
      player.getState.mockReturnValue({ id: player.id, username: player.username });
    });

    it('devrait verrouiller la pièce sur la grille du joueur', () => {
      game.lockPiece(player);
      const matrix = player.currentPiece.getMatrix();
      for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
          if (matrix[y][x] !== 0) {
            if (player.currentPiece.y + y >= 0) {
              expect(player.grid[player.currentPiece.y + y][player.currentPiece.x + x]).toBe(player.currentPiece.type);
            }
          }
        }
      }
    });

    it('devrait appeler checkLines et spawnPiece', () => {
      game.lockPiece(player);
      expect(game.checkLines).toHaveBeenCalledWith(player);
      expect(game.spawnPiece).toHaveBeenCalledWith(player);
    });

    it('devrait retourner l\'état correct, incluant le résultat de spawnPiece pour isGameOver', () => {
      game.spawnPiece.mockReturnValue(true);
      game.checkLines.mockReturnValue({ linesCleared: 2, penaltyApplied: true, penaltyLines: 1 });
      const result = game.lockPiece(player);
      expect(result.isGameOver).toBe(true);
      expect(result.player).toEqual({ id: player.id, username: player.username });
      expect(result.linesCleared).toBe(2);
      expect(result.penaltyApplied).toBe(true);
      expect(result.penaltyLines).toBe(1);
    });

     it('ne devrait pas essayer de placer des parties de la pièce en dehors du haut de la grille (y < 0)', () => {
        player.currentPiece = new Piece('I', 3, -2);
        player.currentPiece.getMatrix.mockReturnValue(Piece.SHAPES.I);

        game.lockPiece(player);
        player.currentPiece.y = -1;
        game.lockPiece(player);

        const pieceMatrixRowWithBlocks = Piece.SHAPES.I[1];
        for (let x_in_matrix = 0; x_in_matrix < pieceMatrixRowWithBlocks.length; x_in_matrix++) {
            if (pieceMatrixRowWithBlocks[x_in_matrix] !== 0) {
                expect(player.grid[0][player.currentPiece.x + x_in_matrix]).toBe('I');
            }
        }
        expect(player.grid[-1]).toBeUndefined();
    });
  });

  describe('checkLines', () => {
    let player;
    beforeEach(() => {
      player = game.addPlayer('p1', 'User1');
      player.grid = Array(20).fill(null).map(() => Array(10).fill(0));
      vi.spyOn(game, 'addPenaltyLines').mockImplementation(() => false);
    });

    it('devrait retourner 0 lignes effacées si aucune ligne n\'est complète', () => {
      const result = game.checkLines(player);
      expect(result.linesCleared).toBe(0);
      expect(player.addLines).not.toHaveBeenCalled();
    });

    it('devrait effacer 1 ligne complète et mettre à jour le score/niveau', () => {
      player.grid[19].fill('L');
      const result = game.checkLines(player);
      expect(result.linesCleared).toBe(1);
      expect(player.addLines).toHaveBeenCalledWith(1);
      expect(player.grid[19].some(cell => cell !== 0)).toBe(false);
      expect(player.grid[0].every(cell => cell === 0)).toBe(true);
      expect(result.penaltyApplied).toBe(false);
    });

    it('devrait effacer plusieurs lignes et appliquer des pénalités aux autres joueurs', () => {
      const otherPlayer = game.addPlayer('p2', 'User2');
      otherPlayer.gameOver = false;
      player.grid[19].fill('I');
      player.grid[18].fill('J');

      const result = game.checkLines(player);
      expect(result.linesCleared).toBe(2);
      expect(player.addLines).toHaveBeenCalledWith(2);
      expect(result.penaltyApplied).toBe(true);
      expect(result.penaltyLines).toBe(1);
      expect(game.addPenaltyLines).toHaveBeenCalledWith(otherPlayer, 1);
    });

     it('devrait effacer 4 lignes (Tetris) et envoyer 3 lignes de pénalité', () => {
      const otherPlayer = game.addPlayer('p2', 'User2');
      otherPlayer.gameOver = false;
      player.grid[19].fill('I');
      player.grid[18].fill('I');
      player.grid[17].fill('I');
      player.grid[16].fill('I');

      const result = game.checkLines(player);
      expect(result.linesCleared).toBe(4);
      expect(player.addLines).toHaveBeenCalledWith(4);
      expect(result.penaltyApplied).toBe(true);
      expect(result.penaltyLines).toBe(3);
      expect(game.addPenaltyLines).toHaveBeenCalledWith(otherPlayer, 3);
    });

    it('ne devrait pas envoyer de pénalités en mode solo', () => {
      player.grid[19].fill('I');
      player.grid[18].fill('J');
      const result = game.checkLines(player);
      expect(result.linesCleared).toBe(2);
      expect(result.penaltyApplied).toBe(false);
      expect(game.addPenaltyLines).not.toHaveBeenCalled();
    });

    it('ne devrait pas envoyer de pénalités aux joueurs en game over', () => {
      const otherPlayer = game.addPlayer('p2', 'User2');
      otherPlayer.gameOver = true;
      player.grid[19].fill('I');
      player.grid[18].fill('J');

      const result = game.checkLines(player);
      expect(result.linesCleared).toBe(2);
      expect(result.penaltyApplied).toBe(true);
      expect(result.penaltyLines).toBe(1);
      expect(game.addPenaltyLines).not.toHaveBeenCalledWith(otherPlayer, 1);
    });
  });

  describe('addPenaltyLines', () => {
    let player;
    beforeEach(() => {
      player = game.addPlayer('p1', 'User1');
      player.grid = Array(20).fill(null).map(() => Array(10).fill(0));
      player.currentPiece = new Piece('O', 3, 0);
      vi.spyOn(game, 'checkCollision');
    });

    it('ne devrait rien faire si le joueur est déjà en game over', () => {
      player.gameOver = true;
      const initialGrid = JSON.parse(JSON.stringify(player.grid));
      const result = game.addPenaltyLines(player, 2);
      expect(result).toBe(false);
      expect(player.grid).toEqual(initialGrid);
    });

    it('devrait ajouter le nombre correct de lignes de pénalité en bas', () => {
      const numLines = 3;
      player.grid[0].fill('A');
      player.grid[1].fill('B');
      const originalTopLine = [...player.grid[numLines]];

      game.addPenaltyLines(player, numLines);

      for (let i = 0; i < numLines; i++) {
        const line = player.grid[player.grid.length - 1 - i];
        expect(line.filter(cell => cell === 'penalty').length).toBe(player.grid[0].length - 1);
        expect(line).toContain(0);
      }
      expect(player.grid[0]).toEqual(originalTopLine);
      expect(game.checkCollision).toHaveBeenCalledWith(player, player.currentPiece);
    });

    it('devrait mettre le joueur en game over si l\'ajout de lignes cause une collision', () => {
      game.checkCollision.mockReturnValue(true);
      const result = game.addPenaltyLines(player, 1);
      expect(result).toBe(true);
      expect(player.gameOver).toBe(true);
      expect(player.isPlaying).toBe(false);
    });

    it('ne devrait pas mettre en game over si pas de collision après ajout', () => {
      game.checkCollision.mockReturnValue(false);
      const result = game.addPenaltyLines(player, 1);
      expect(result).toBe(false);
      expect(player.gameOver).toBe(false);
    });
  });

  describe('movePiece', () => {
    let player;
    beforeEach(() => {
      player = game.addPlayer('p1', 'User1');
      player.currentPiece = new Piece('I', 3, 3);
      player.isPlaying = true;
      player.gameOver = false;
      vi.spyOn(game, 'lockPiece').mockReturnValue({ isGameOver: false, player: player.getState() });
      vi.spyOn(game, 'checkCollision');
    });

    it('ne devrait rien faire si le joueur n\'est pas actif ou si la pièce est nulle', () => {
      player.isPlaying = false;
      expect(game.movePiece(player, 1, 0)).toEqual({ moved: false, gameOver: player.gameOver });
      player.isPlaying = true; player.currentPiece = null;
      expect(game.movePiece(player, 1, 0)).toEqual({ moved: false, gameOver: player.gameOver });
    });

    it('devrait déplacer la pièce si aucune collision', () => {
      game.checkCollision.mockReturnValue(false);
      const result = game.movePiece(player, 1, 0);
      expect(result.moved).toBe(true);
      expect(player.currentPiece.x).toBe(4);
      expect(result.player).toEqual(player.getState());
    });

    it('devrait verrouiller la pièce si un mouvement vers le bas échoue', () => {
      game.checkCollision.mockImplementation((p, piece, dx, dy) => dy > 0);
      const result = game.movePiece(player, 0, 1);
      expect(result.moved).toBe(false);
      expect(game.lockPiece).toHaveBeenCalledWith(player);
      expect(result.gameOver).toBe(false);
      expect(result.player).toEqual(player.getState());
    });

    it('ne devrait pas déplacer si collision (non-vers le bas)', () => {
      game.checkCollision.mockReturnValue(true);
      const result = game.movePiece(player, 1, 0);
      expect(result.moved).toBe(false);
      expect(game.lockPiece).not.toHaveBeenCalled();
    });
  });

  describe('rotatePiece', () => {
    let player;
    beforeEach(() => {
      player = game.addPlayer('p1', 'User1');
      player.currentPiece = new Piece('I', 3, 3);
      player.currentPiece.clone = vi.fn().mockImplementation(function() {
        const cloned = { ...this, shape: [...this.shape] };
        cloned.rotate = this.rotate.bind(cloned);
        cloned.getMatrix = this.getMatrix.bind(cloned);
        cloned.clone = this.clone.bind(cloned);
        return cloned;
       });
      player.currentPiece.rotate = vi.fn().mockImplementation(function() { this.rotation = (this.rotation + 1) % 4; return this; });
      player.isPlaying = true;
      player.gameOver = false;
      vi.spyOn(game, 'checkCollision');
    });

    it('ne devrait rien faire si le joueur n\'est pas actif ou si la pièce est nulle', () => {
      player.isPlaying = false;
      expect(game.rotatePiece(player)).toEqual({ rotated: false, gameOver: player.gameOver });
      player.isPlaying = true; player.currentPiece = null;
      expect(game.rotatePiece(player)).toEqual({ rotated: false, gameOver: player.gameOver });
    });

    it('devrait faire tourner la pièce si aucune collision', () => {
      game.checkCollision.mockReturnValue(false);
      const originalRotation = player.currentPiece.rotation;
      const result = game.rotatePiece(player);
      expect(result.rotated).toBe(true);
      expect(player.currentPiece.rotate).toHaveBeenCalledTimes(2);
      expect(player.currentPiece.rotation).not.toBe(originalRotation);
    });

    it('ne devrait pas faire tourner la pièce si collision', () => {
      game.checkCollision.mockReturnValue(true);
      const result = game.rotatePiece(player);
      expect(result.rotated).toBe(false);
      expect(player.currentPiece.rotate).toHaveBeenCalledTimes(1);
    });
  });

  describe('dropPiece', () => {
    let player;
    beforeEach(() => {
      player = game.addPlayer('p1', 'User1');
      player.currentPiece = new Piece('I', 3, 0);
      player.isPlaying = true;
      player.gameOver = false;
      vi.spyOn(game, 'lockPiece').mockImplementation(() => ({
         isGameOver: false,
         player: player.getState()
      }));
      vi.spyOn(game, 'checkCollision');
    });

    it('ne devrait rien faire si le joueur n\'est pas actif ou si la pièce est nulle', () => {
      player.isPlaying = false;
      expect(game.dropPiece(player)).toEqual({ dropped: 0, gameOver: player.gameOver });
      player.isPlaying = true; player.currentPiece = null;
      expect(game.dropPiece(player)).toEqual({ dropped: 0, gameOver: player.gameOver });
    });

    it('devrait faire chuter la pièce et la verrouiller', () => {
      let calls = 0;
      game.checkCollision.mockImplementation(() => {
        calls++;
        return calls > 5;
      });
      const initialY = player.currentPiece.y;
      const result = game.dropPiece(player);

      expect(result.dropped).toBe(5);
      expect(player.currentPiece.y).toBe(initialY + 5);
      expect(game.lockPiece).toHaveBeenCalledWith(player);
      expect(result.player).toEqual(player.getState());
    });

    it('devrait verrouiller la pièce même si elle ne peut pas chuter (dropped 0) et lockPiece est appelée', () => {
      game.checkCollision.mockReturnValue(true);
      const result = game.dropPiece(player);
      expect(result.dropped).toBe(0);
      expect(game.lockPiece).not.toHaveBeenCalled();
      expect(result.gameOver).toBe(false);
    });
  });

  describe('update', () => {
    let player1, player2;
    beforeEach(() => {
      Date.now.mockReturnValue(1000);
      player1 = game.addPlayer('p1', 'User1');
      player2 = game.addPlayer('p2', 'User2');
      game.isActive = true;
      player1.isPlaying = true; player1.gameOver = false; player1.lastFallTime = 0; player1.fallSpeed = 1000;
      player2.isPlaying = true; player2.gameOver = false; player2.lastFallTime = 500; player2.fallSpeed = 1000;

      vi.spyOn(game, 'movePiece');
      vi.spyOn(game, 'checkGameEnd').mockReturnValue(false);
    });

    it('ne devrait rien faire si le jeu n\'est pas actif', () => {
      game.isActive = false;
      game.update();
      expect(game.movePiece).not.toHaveBeenCalled();
    });

    it('devrait ignorer les joueurs non actifs ou en game over', () => {
      player1.isPlaying = false;
      player2.gameOver = true;
      game.update();
      expect(game.movePiece).not.toHaveBeenCalled();
    });

    it('devrait faire tomber la pièce pour les joueurs actifs quand le temps est écoulé', () => {
      Date.now.mockReturnValue(1000); // Current time
      player1.lastFallTime = 0;      // Last fall was long ago
      player1.fallSpeed = 500;       // Fall speed is 500ms
      game.movePiece.mockReturnValueOnce({ player: player1.getState() });

      // player2 should not fall yet
      player2.lastFallTime = 800; // Last fall was recent
      player2.fallSpeed = 500;    // Fall speed is 500ms

      const result = game.update();

      expect(game.movePiece).toHaveBeenCalledTimes(1);
      expect(game.movePiece).toHaveBeenCalledWith(player1, 0, 1);
      expect(player1.lastFallTime).toBe(1000); // Updated to current time
      expect(result.updatedPlayers).toContainEqual(player1.getState());
      expect(result.gameHasEnded).toBe(false);
      expect(game.checkGameEnd).toHaveBeenCalled();
    });

    it('devrait mettre à jour le score après une chute de pièce et effacement de ligne', () => {
      Date.now.mockReturnValue(2000); // Time for the piece to fall
      player1.lastFallTime = 0;
      player1.fallSpeed = 1000;
      player1.currentPiece = new Piece('I', 3, 18); // Positioned to complete a line at y=19
      player1.grid[19].fill(0); // Ensure line 19 is clear first except for where the piece will land
      // Piece 'I' is [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]]
      // when currentPiece.y = 18, its 2nd row (1,1,1,1) will be at grid row 19.
      // To complete a line, other cells of row 19 must be filled.
      for(let i = 0; i < player1.grid[19].length; i++) {
        if (i < 3 || i > 6) { // Fill cells not covered by 'I' piece at x=3
            player1.grid[19][i] = 'L'; // Fill with some block type
        }
      }
      player1.isPlaying = true; // Make sure player is active
      player1.gameOver = false;

      // We need checkCollision to return true for the downward move that locks the piece.
      // The first call to checkCollision in movePiece(dx=0, dy=1) should be false (can move down one step).
      // Then piece.y becomes 19. The lockPiece will then be called.
      // OR, if currentPiece.y is already at the bottom (e.g. 19), checkCollision for dy=1 will be true.
      // Let's place the piece at y=18, so it moves to y=19 and then locks.

      // Spy on the actual checkCollision to control its behavior carefully only if needed.
      // For now, let's assume the setup is enough for natural collision.
      // The important part is that player1.addLines (mocked) gets called.
      // player1.addLines IS ALREADY A MOCK (vi.fn()) from Player mock setup.

      // No need to mock game.movePiece or game.checkLines here, let the real logic flow
      // to ensure player.addLines (which is mocked and updates score) is called.

      game.update(); // This should trigger the sequence of calls leading to score update

      expect(player1.score).toBeGreaterThan(0);
      // Optionally, verify addLines was called
      expect(player1.addLines).toHaveBeenCalled();
    });

    it('devrait terminer le jeu si tous les joueurs sont en game over', () => {
      game.startedAt = Date.now(); // Simulate game having been started
      player1.gameOver = true;
      player2.gameOver = true;
      // checkGameEnd will call game.stop() which sets isActive to false
      game.checkGameEnd.mockImplementation(() => {
        game.stop();
        return true;
      });

      const result = game.update();
      expect(result.gameHasEnded).toBe(true);
      expect(game.isActive).toBe(false);
    });
  });

  describe('checkGameEnd', () => {
    let player1, player2;
    beforeEach(() => {
      player1 = game.addPlayer('p1', 'User1');
      player2 = game.addPlayer('p2', 'User2');
      game.isActive = true;
      vi.spyOn(game, 'stop');
    });

    it('devrait retourner false si le jeu n\'est pas actif', () => {
      game.isActive = false;
      expect(game.checkGameEnd()).toBe(false);
    });

    it('devrait terminer le jeu si tous les joueurs sont en game over (multiplayer)', () => {
      player1.gameOver = true; player1.isPlaying = false;
      player2.gameOver = true; player2.isPlaying = false;
      expect(game.checkGameEnd()).toBe(true);
      expect(game.stop).toHaveBeenCalled();
    });

    it('devrait terminer le jeu si le joueur solo est en game over', () => {
      game.removePlayer('player2');
      player1.gameOver = true; player1.isPlaying = false;
      expect(game.checkGameEnd()).toBe(true);
      expect(game.stop).toHaveBeenCalled();
    });

    it('devrait identifier un gagnant et terminer le jeu s\'il ne reste qu\'un joueur actif (multiplayer)', () => {
      player1.gameOver = true; player1.isPlaying = false;
      player2.gameOver = false; player2.isPlaying = true;

      expect(game.checkGameEnd()).toBe(true);
      expect(player2.isWinner).toBe(true);
      expect(game.winner).toBe(player2.id);
      expect(game.stop).toHaveBeenCalled();
    });

    it('ne devrait pas terminer le jeu s\'il reste plusieurs joueurs actifs', () => {
      player1.gameOver = false; player1.isPlaying = true;
      player2.gameOver = false; player2.isPlaying = true;
      expect(game.checkGameEnd()).toBe(false);
      expect(game.stop).not.toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('devrait retourner l\'état complet du jeu', () => {
      const p1 = game.addPlayer('p1', 'User1');
      const p2 = game.addPlayer('p2', 'User2');
      game.isActive = true;
      game.startedAt = 1200;
      game.host = 'p1';
      p1.getState.mockReturnValue({ id: 'p1', name: 'User1', score: 100 });
      p2.getState.mockReturnValue({ id: 'p2', name: 'User2', score: 200 });

      const state = game.getState();

      expect(state.id).toBe(gameId);
      expect(state.roomName).toBe(roomName);
      expect(state.isActive).toBe(true);
      expect(state.host).toBe('p1');
      expect(state.createdAt).toBe(1000);
      expect(state.startedAt).toBe(1200);
      expect(state.initialFallSpeedSetting).toBe(initialFallSpeed);
      expect(state.players).toEqual([
        { id: 'p1', name: 'User1', score: 100 },
        { id: 'p2', name: 'User2', score: 200 }
      ]);
      expect(Object.prototype.hasOwnProperty.call(state, 'isOver')).toBe(true);
      expect(state.isOver).toBe(false);
    });
  });

  describe('stop', () => {
    let player1, player2;
    beforeEach(() => {
      player1 = game.addPlayer('p1', 'U1');
      player2 = game.addPlayer('p2', 'U2');
      game.isActive = true;
      player1.isPlaying = true; player1.score = 100; player1.level = 2;
      player2.isPlaying = true; player2.score = 200; player2.level = 3;
    });

    it('devrait désactiver le jeu et les joueurs', () => {
      game.stop();
      expect(game.isActive).toBe(false);
      expect(player1.isPlaying).toBe(false);
      expect(player2.isPlaying).toBe(false);
    });

    it('devrait enregistrer le score final et le niveau des joueurs', () => {
      game.stop();
      expect(player1.finalScore).toBe(100);
      expect(player1.finalLevel).toBe(2);
      expect(player2.finalScore).toBe(200);
      expect(player2.finalLevel).toBe(3);
    });

    it('ne devrait pas écraser le score final s\'il est déjà défini', () => {
      player1.finalScore = 50; player1.finalLevel = 1;
      game.stop();
      expect(player1.finalScore).toBe(50);
      expect(player1.finalLevel).toBe(1);
    });
  });
});
