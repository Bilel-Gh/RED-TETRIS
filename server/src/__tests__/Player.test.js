import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Player } from '../models/Player.js';

describe('Player', () => {
  let player;
  const mockId = 'player-123';
  const mockUsername = 'TestPlayer';

  // Helper to create player with specific speed setting for some tests
  const createPlayerWithSpeed = (speedSetting = 'normal') => {
    return new Player(mockId, mockUsername, speedSetting);
  };

  beforeEach(() => {
    // Default player for most tests uses 'normal' speed
    player = createPlayerWithSpeed('normal');
    vi.spyOn(Date, 'now').mockReturnValue(1000); // Consistent time for tests
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Clean up spies
  });

  describe('constructor', () => {
    it('devrait initialiser un joueur avec les valeurs par défaut (vitesse normale)', () => {
      expect(player.id).toBe(mockId);
      expect(player.username).toBe(mockUsername);
      expect(player.score).toBe(0);
      expect(player.level).toBe(1);
      expect(player.lines).toBe(0);
      expect(player.isPlaying).toBe(false);
      expect(player.gameOver).toBe(false);
      expect(player.grid.length).toBe(20);
      expect(player.grid[0].length).toBe(10);
      expect(player.grid.every(row => row.every(cell => cell === 0))).toBe(true);
      expect(player.currentPiece).toBeNull();
      expect(player.nextPiece).toBeNull();
      expect(player.initialFallSpeedSetting).toBe('normal');
      expect(player.fallSpeed).toBe(700); // Normal speed
      expect(player.lastFallTime).toBe(0); // Initial value
    });

    it('devrait initialiser un joueur avec la vitesse lente (slow)', () => {
      const slowPlayer = createPlayerWithSpeed('slow');
      expect(slowPlayer.initialFallSpeedSetting).toBe('slow');
      expect(slowPlayer.fallSpeed).toBe(1000); // Slow speed
    });

    it('devrait initialiser un joueur avec la vitesse rapide (fast)', () => {
      const fastPlayer = createPlayerWithSpeed('fast');
      expect(fastPlayer.initialFallSpeedSetting).toBe('fast');
      expect(fastPlayer.fallSpeed).toBe(300); // Fast speed
    });
  });

  describe('startGame', () => {
    it('devrait réinitialiser l\'état du joueur et le mettre en mode jeu', () => {
      // Modify some state before starting
      player.score = 100;
      player.level = 2;
      player.lines = 5;
      player.gameOver = true;
      player.currentPiece = {}; // Mock piece
      player.initialFallSpeedSetting = 'slow'; // Change initial speed
      player.fallSpeed = player.getBaseFallSpeed();

      player.startGame('fast'); // Start with 'fast' speed

      expect(player.score).toBe(0);
      expect(player.level).toBe(1);
      expect(player.lines).toBe(0);
      expect(player.isPlaying).toBe(true);
      expect(player.gameOver).toBe(false);
      expect(player.grid.every(row => row.every(cell => cell === 0))).toBe(true);
      expect(player.currentPiece).toBeNull();
      expect(player.nextPiece).toBeNull();
      expect(player.initialFallSpeedSetting).toBe('fast');
      expect(player.fallSpeed).toBe(300); // Fast speed
      expect(player.lastFallTime).toBe(1000); // Date.now() is mocked to 1000
      expect(player.pieceQueueIndex).toBe(0);
    });

    it('devrait utiliser le réglage de vitesse initial existant si aucun n\'est fourni', () => {
      player = createPlayerWithSpeed('slow'); // Player starts with slow speed
      player.startGame(); // No argument, should keep 'slow'
      expect(player.initialFallSpeedSetting).toBe('slow');
      expect(player.fallSpeed).toBe(1000);
    });
  });

  describe('resetGame', () => {
    it('devrait réinitialiser toutes les valeurs du joueur à leur état initial basé sur initialFallSpeedSetting', () => {
      player = createPlayerWithSpeed('slow'); // Create with 'slow' setting

      // Modify values to test reset
      player.score = 100;
      player.level = 5;
      player.lines = 20;
      player.gameOver = true;
      player.isPlaying = true;
      player.grid[0][0] = 1;
      player.currentPiece = {};
      player.nextPiece = {};
      player.fallSpeed = 500; // Some different speed
      player.lastFallTime = Date.now() + 1000; // Some different time

      player.resetGame();

      expect(player.score).toBe(0);
      expect(player.level).toBe(1);
      expect(player.lines).toBe(0);
      expect(player.gameOver).toBe(false);
      expect(player.isPlaying).toBe(false); // isPlaying should also be reset (though not explicitly in Player.js, it's logical for a full reset)
                                        // Player.js's resetGame doesn't touch isPlaying. This might be an oversight in Player.js or test.
                                        // For now, aligning with Player.js: isPlaying remains as it was.
                                        // If isPlaying should be reset, Player.js#resetGame needs `this.isPlaying = false;`
      expect(player.grid.every(row => row.every(cell => cell === 0))).toBe(true);
      expect(player.currentPiece).toBeNull();
      expect(player.nextPiece).toBeNull();
      expect(player.initialFallSpeedSetting).toBe('slow'); // Should retain the initial setting
      expect(player.fallSpeed).toBe(1000); // Reset to base speed of 'slow'
      expect(player.lastFallTime).toBe(0); // resetGame sets lastFallTime to 0
      expect(player.pieceQueueIndex).toBe(0);
    });
  });

  describe('addScore', () => {
    it('devrait ajouter des points au score', () => {
      player.score = 50;
      player.addScore(100);
      expect(player.score).toBe(150);
    });
  });

  describe('addLines', () => {
    beforeEach(() => {
      // Start each addLines test with a fresh player at level 1, 'normal' speed by default from outer beforeEach
      // Player.js addLines: score = base_points * this.level (level *before* adding lines and potentially leveling up)
      // Level is then: Math.floor(this.lines / 10) + 1
      // Fall speed: Math.max(100, baseSpeed - ((newLevel - 1) * 50))
      player.startGame(); // Resets to level 1, 0 lines, 0 score, normal speed (700ms)
    });

    it('ne devrait rien faire si le nombre de lignes est <= 0 (Player.js actuel ne gère pas <0, juste != 0)', () => {
      player.lines = 5;
      player.score = 100;
      player.level = 1; // Explicitly set for clarity before test
      player.fallSpeed = player.getBaseFallSpeed();

      player.addLines(0); // Player.js doesn't have a specific check for numLines <= 0, but switch default will apply.
                          // The `this.lines += numLines;` will add 0. Score `default: scoreToAdd = numLines * 40 * this.level;` will add 0.
                          // Level will be recalculated but won't change if lines don't cross threshold.

      expect(player.lines).toBe(5); // lines = 5 + 0 = 5
      expect(player.score).toBe(100); // score = 100 + (0 * 40 * 1) = 100
      expect(player.level).toBe(1);   // level = floor(5/10)+1 = 1
    });

    // Test cases: [linesAdded, expectedScoreIncrease, expectedNewLevel, initialLines (optional, default 0)]
    // Score calculation is: points_for_lines * level_BEFORE_potential_levelup
    // Level calculation is: floor((old_lines + linesAdded) / 10) + 1

    it('devrait ajouter 1 ligne: score +40*L1, niveau reste 1', () => {
      // player starts at level 1, 0 lines, score 0
      player.addLines(1);
      expect(player.lines).toBe(1);
      expect(player.score).toBe(40 * 1); // 40 * level 1
      expect(player.level).toBe(1);   // floor(1/10)+1 = 1
    });

    it('devrait ajouter 2 lignes: score +100*L1, niveau reste 1', () => {
      player.addLines(2);
      expect(player.lines).toBe(2);
      expect(player.score).toBe(100 * 1); // 100 * level 1
      expect(player.level).toBe(1);    // floor(2/10)+1 = 1
    });

    it('devrait ajouter 3 lignes: score +300*L1, niveau reste 1', () => {
      player.addLines(3);
      expect(player.lines).toBe(3);
      expect(player.score).toBe(300 * 1); // 300 * level 1
      expect(player.level).toBe(1);    // floor(3/10)+1 = 1
    });

    it('devrait ajouter 4 lignes (Tetris): score +1200*L1, niveau reste 1', () => {
      player.addLines(4);
      expect(player.lines).toBe(4);
      expect(player.score).toBe(1200 * 1); // 1200 * level 1
      expect(player.level).toBe(1);     // floor(4/10)+1 = 1
    });

    it('devrait passer au niveau 2 après 10 lignes (ex: 9 lignes + 1 ligne)', () => {
      player.lines = 9; // Simulate 9 lines already
      player.level = 1; // Math.floor(9/10)+1 = 1
      player.score = 300; // Dummy score
      const initialFallSpeed = player.getBaseFallSpeed(); // Should be 700 for 'normal'

      player.addLines(1); // Adds 1 line, total 10 lines. Score for this 1 line is at level 1.

      expect(player.lines).toBe(10);
      expect(player.score).toBe(300 + (40 * 1)); // old_score + (40 * level_at_time_of_scoring)
      expect(player.level).toBe(2);         // floor(10/10)+1 = 2
      expect(player.fallSpeed).toBe(Math.max(100, initialFallSpeed - ( (2-1) * 50) )); // 700 - 50 = 650
    });

    it('devrait passer au niveau 3 après 20 lignes (ex: 19 lignes + 1 ligne, vitesse lente)', () => {
      player = createPlayerWithSpeed('slow'); // Base speed 1000ms
      player.startGame(); // Resets lines, level, etc., but respects 'slow' from constructor if startGame has no arg

      player.lines = 19;
      player.level = Math.floor(player.lines / 10) + 1; // Should be level 2
      expect(player.level).toBe(2);
      const initialFallSpeed = player.getBaseFallSpeed(); // 1000ms for 'slow'
      player.fallSpeed = Math.max(100, initialFallSpeed - ((player.level -1) * 50)); // 1000 - 50 = 950
      expect(player.fallSpeed).toBe(950);
      player.score = 1000; // Dummy score

      player.addLines(1); // Adds 1 line, total 20. Score for this 1 line is at level 2.

      expect(player.lines).toBe(20);
      expect(player.score).toBe(1000 + (40 * 2)); // old_score + (40 * level_at_time_of_scoring which was 2)
      expect(player.level).toBe(3);          // floor(20/10)+1 = 3
      expect(player.fallSpeed).toBe(Math.max(100, initialFallSpeed - ( (3-1) * 50) )); // 1000 - 100 = 900
    });

    it('la vitesse de chute ne devrait pas descendre en dessous de 100ms', () => {
      player.initialFallSpeedSetting = 'normal'; // 700ms base
      player.fallSpeed = player.getBaseFallSpeed();
      player.level = 1;
      player.lines = 0;

      // (700 - 100) / 50 = 12 level ups needed to reach 100ms.
      // This means player needs to reach level 13.
      // To reach level 13 (floor(L/10)+1 = 13 => floor(L/10)=12 => L=120), 120 lines are needed.
      player.addLines(120);
      expect(player.level).toBe(13); // floor(120/10)+1 = 13
      expect(player.fallSpeed).toBe(100); // 700 - (12*50) = 100

      player.addLines(10); // Add 10 more lines, level 14
      expect(player.level).toBe(14); // floor(130/10)+1 = 14
      expect(player.fallSpeed).toBe(100); // Should stay at 100ms
    });
  });

  describe('getState', () => {
    it('devrait retourner l\'état complet du joueur', () => {
      player.startGame(); // Ensure consistent state, e.g. lastFallTime is set
      const state = player.getState();

      expect(state.id).toBe(mockId);
      expect(state.username).toBe(mockUsername);
      expect(state.score).toBe(0);
      expect(state.level).toBe(1);
      expect(state.lines).toBe(0);
      expect(state.grid).toEqual(player.grid); // Use toEqual for deep comparison of arrays/objects
      expect(state.currentPiece).toBeNull();
      expect(state.nextPiece).toBeNull();
      expect(state.isPlaying).toBe(true); // After startGame
      expect(state.gameOver).toBe(false);
      expect(state.initialFallSpeedSetting).toBe('normal');
      expect(state.fallSpeed).toBe(700);
      expect(state.spectrum).toEqual(Array(10).fill(0)); // Assuming GRID_WIDTH is 10
    });

    it('devrait inclure les informations des pièces si elles existent', () => {
      player.currentPiece = {
        type: 'I',
        shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
        x: 3,
        y: 2,
        rotation: 1
      };
      player.nextPiece = { type: 'T' }; // Player.nextPiece stores the Piece object (or mock)

      const state = player.getState();

      expect(state.currentPiece).toEqual({ // Use toEqual for objects
        type: 'I',
        shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
        x: 3,
        y: 2,
        rotation: 1
      });
      expect(state.nextPiece).toEqual({ type: 'T' }); // Corrected assertion
    });
  });
});
