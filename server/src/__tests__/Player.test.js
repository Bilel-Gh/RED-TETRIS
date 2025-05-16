import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../models/Player.js';

describe('Player', () => {
  let player;
  const mockId = 'player-123';
  const mockUsername = 'TestPlayer';

  beforeEach(() => {
    // Réinitialiser un joueur de test avant chaque test
    player = new Player(mockId, mockUsername);

    // Pas besoin de mocker Date.now() pour la plupart des tests
  });

  describe('constructor', () => {
    it('devrait initialiser un joueur avec les valeurs correctes', () => {
      expect(player.id).toBe(mockId);
      expect(player.username).toBe(mockUsername);
      expect(player.score).toBe(0);
      expect(player.level).toBe(1);
      expect(player.lines).toBe(0);
      expect(player.isPlaying).toBe(false);
      expect(player.gameOver).toBe(false);

      // Vérification de la grille 10x20
      expect(player.grid.length).toBe(20);
      expect(player.grid[0].length).toBe(10);
      expect(player.grid.every(row => row.every(cell => cell === 0))).toBe(true);

      // Vérification des pièces
      expect(player.currentPiece).toBeNull();
      expect(player.nextPiece).toBeNull();

      // Vérification du temps et de la vitesse
      expect(typeof player.lastFallTime).toBe('number');
      expect(player.fallSpeed).toBe(1000);
    });
  });

  describe('startGame', () => {
    it('devrait démarrer le jeu et mettre isPlaying à true', () => {
      // Mock de resetGame pour vérifier qu'il est appelé
      const resetGameSpy = vi.spyOn(player, 'resetGame');

      player.startGame();

      expect(resetGameSpy).toHaveBeenCalledOnce();
      expect(player.isPlaying).toBe(true);
    });
  });

  describe('resetGame', () => {
    it('devrait réinitialiser toutes les valeurs du joueur', () => {
      // Modifier les valeurs pour tester la réinitialisation
      player.score = 100;
      player.level = 5;
      player.lines = 20;
      player.gameOver = true;
      player.grid[0][0] = 1;
      player.currentPiece = {};
      player.nextPiece = {};
      player.fallSpeed = 500;

      // Remplacer l'implémentation de Date.now pour ce test spécifique
      const mockTime = 12345;
      const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(mockTime);

      player.resetGame();

      expect(player.score).toBe(0);
      expect(player.level).toBe(1);
      expect(player.lines).toBe(0);
      expect(player.gameOver).toBe(false);
      expect(player.grid.every(row => row.every(cell => cell === 0))).toBe(true);
      expect(player.currentPiece).toBeNull();
      expect(player.nextPiece).toBeNull();
      expect(player.fallSpeed).toBe(1000);
      expect(player.lastFallTime).toBe(mockTime);

      // Nettoyer le mock
      dateNowSpy.mockRestore();
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
    it('ne devrait rien faire si le nombre de lignes est <= 0', () => {
      player.lines = 5;
      player.score = 100;
      player.level = 1;

      player.addLines(0);

      expect(player.lines).toBe(5);
      expect(player.score).toBe(100);
      expect(player.level).toBe(1);
    });

    it('devrait ajouter des lignes et augmenter le score (1 ligne)', () => {
      player.score = 0;
      player.level = 2;

      player.addLines(1);

      expect(player.lines).toBe(1);
      expect(player.score).toBe(40 * 2); // 40 points * niveau 2
      expect(player.level).toBe(2); // Pas de changement de niveau
    });

    it('devrait ajouter des lignes et augmenter le score (2 lignes)', () => {
      player.score = 0;
      player.level = 2;

      player.addLines(2);

      expect(player.lines).toBe(2);
      expect(player.score).toBe(100 * 2); // 100 points * niveau 2
      expect(player.level).toBe(2); // Pas de changement de niveau
    });

    it('devrait ajouter des lignes et augmenter le score (3 lignes)', () => {
      player.score = 0;
      player.level = 2;

      player.addLines(3);

      expect(player.lines).toBe(3);
      expect(player.score).toBe(300 * 2); // 300 points * niveau 2
      expect(player.level).toBe(2); // Pas de changement de niveau
    });

    it('devrait ajouter des lignes et augmenter le score (4 lignes - Tetris)', () => {
      player.score = 0;
      player.level = 2;

      player.addLines(4);

      expect(player.lines).toBe(4);
      expect(player.score).toBe(1200 * 2); // 1200 points * niveau 2
      expect(player.level).toBe(2); // Pas de changement de niveau
    });

    it('devrait augmenter le niveau toutes les 10 lignes', () => {
      player.lines = 8;
      player.level = 1;
      player.fallSpeed = 1000;

      player.addLines(2); // 8 + 2 = 10 lignes (passage au niveau 2)

      expect(player.lines).toBe(10);
      expect(player.level).toBe(2);
      expect(player.fallSpeed).toBe(900); // 1000 - (2-1) * 100

      player.addLines(9); // 10 + 9 = 19 lignes (pas de changement de niveau)

      expect(player.lines).toBe(19);
      expect(player.level).toBe(2);

      player.addLines(1); // 19 + 1 = 20 lignes (passage au niveau 3)

      expect(player.lines).toBe(20);
      expect(player.level).toBe(3);
      expect(player.fallSpeed).toBe(800); // 1000 - (3-1) * 100
    });
  });

  describe('getState', () => {
    it('devrait retourner l\'état complet du joueur', () => {
      const state = player.getState();

      expect(state.id).toBe(mockId);
      expect(state.username).toBe(mockUsername);
      expect(state.score).toBe(0);
      expect(state.level).toBe(1);
      expect(state.lines).toBe(0);
      expect(state.grid).toBe(player.grid);
      expect(state.currentPiece).toBeNull();
      expect(state.nextPiece).toBeNull();
      expect(state.isPlaying).toBe(false);
      expect(state.gameOver).toBe(false);
    });

    it('devrait inclure les informations des pièces si elles existent', () => {
      // Simuler une pièce en cours
      player.currentPiece = {
        type: 'I',
        shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
        x: 3,
        y: 2,
        rotation: 1
      };

      // Simuler une pièce suivante
      player.nextPiece = { type: 'T' };

      const state = player.getState();

      expect(state.currentPiece).toEqual({
        type: 'I',
        shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
        x: 3,
        y: 2,
        rotation: 1
      });

      expect(state.nextPiece).toBe('T');
    });
  });
});
