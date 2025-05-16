import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from '../models/Game.js';
import { Player } from '../models/Player.js';
import { Piece } from '../models/Piece.js';

// Mock des classes dépendantes
vi.mock('../models/Player.js', () => {
  return {
    Player: vi.fn().mockImplementation((id, username) => {
      return {
        id,
        username,
        score: 0,
        level: 1,
        lines: 0,
        isPlaying: false,
        gameOver: false,
        grid: Array(20).fill().map(() => Array(10).fill(0)),
        currentPiece: null,
        nextPiece: null,
        lastFallTime: Date.now(),
        fallSpeed: 1000,
        startGame: vi.fn(function() { this.isPlaying = true; }),
        getState: vi.fn(function() { return { id: this.id, username: this.username }; })
      };
    })
  };
});

vi.mock('../models/Piece.js', () => {
  return {
    Piece: vi.fn().mockImplementation((type, x, y) => {
      return {
        type,
        x,
        y,
        rotation: 0,
        shape: [[1, 1], [1, 1]],
        clone: vi.fn().mockReturnThis(),
        rotate: vi.fn().mockReturnThis(),
        getMatrix: vi.fn().mockReturnValue([[1, 1], [1, 1]])
      };
    }),
    // Simuler les propriétés statiques
    SHAPES: {
      I: [], O: [], T: [], S: [], Z: [], J: [], L: []
    }
  };
});

describe('Game', () => {
  let game;
  const gameId = 'game-123';

  beforeEach(() => {
    // Réinitialiser un jeu de test avant chaque test
    vi.clearAllMocks();
    game = new Game(gameId);

    // Mock de Date.now() pour des tests déterministes
    const now = 1000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    // Mock de Math.random() pour des tests déterministes
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  describe('constructor', () => {
    it('devrait initialiser un jeu avec les valeurs correctes', () => {
      expect(game.id).toBe(gameId);
      expect(game.players.size).toBe(0);
      expect(game.isActive).toBe(false);
      expect(game.createdAt).toBe(1000);
      expect(game.startedAt).toBeNull();
      expect(game.maxPlayers).toBe(4);
      expect(game.host).toBeNull();
    });
  });

  describe('addPlayer', () => {
    it('devrait ajouter un joueur et le définir comme hôte s\'il est le premier', () => {
      const playerId = 'player1';
      const username = 'User1';

      const player = game.addPlayer(playerId, username);

      expect(Player).toHaveBeenCalledWith(playerId, username);
      expect(game.players.size).toBe(1);
      expect(game.players.get(playerId)).toBe(player);
      expect(game.host).toBe(playerId);
    });

    it('devrait ajouter plusieurs joueurs sans changer l\'hôte', () => {
      const player1 = game.addPlayer('player1', 'User1');
      const player2 = game.addPlayer('player2', 'User2');

      expect(game.players.size).toBe(2);
      expect(game.players.get('player1')).toBe(player1);
      expect(game.players.get('player2')).toBe(player2);
      expect(game.host).toBe('player1');
    });

    it('devrait lever une erreur si le nombre maximum de joueurs est atteint', () => {
      game.addPlayer('player1', 'User1');
      game.addPlayer('player2', 'User2');
      game.addPlayer('player3', 'User3');
      game.addPlayer('player4', 'User4');

      expect(() => game.addPlayer('player5', 'User5')).toThrow('La partie est complète');
      expect(game.players.size).toBe(4);
    });
  });

  describe('removePlayer', () => {
    beforeEach(() => {
      game.addPlayer('player1', 'User1');
      game.addPlayer('player2', 'User2');
      game.addPlayer('player3', 'User3');
    });

    it('devrait supprimer un joueur correctement', () => {
      game.removePlayer('player2');

      expect(game.players.size).toBe(2);
      expect(game.players.has('player2')).toBe(false);
      expect(game.host).toBe('player1'); // L'hôte ne change pas
    });

    it('devrait changer l\'hôte quand l\'hôte actuel quitte', () => {
      game.removePlayer('player1');

      expect(game.players.size).toBe(2);
      expect(game.players.has('player1')).toBe(false);
      expect(game.host).not.toBe('player1');
      expect(['player2', 'player3']).toContain(game.host);
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

      // Mock des méthodes de Game
      vi.spyOn(game, 'spawnPiece').mockImplementation(() => {});
    });

    it('devrait démarrer la partie correctement', () => {
      const result = game.start();

      expect(result).toBe(true);
      expect(game.isActive).toBe(true);
      expect(game.startedAt).toBe(1000);

      // Vérifier que startGame est appelé pour chaque joueur
      for (const player of game.players.values()) {
        expect(player.startGame).toHaveBeenCalledTimes(1);
      }

      // Vérifier que spawnPiece est appelé pour chaque joueur
      expect(game.spawnPiece).toHaveBeenCalledTimes(2);
    });

    it('devrait lever une erreur si la partie est vide', () => {
      game.players.clear();

      expect(() => game.start()).toThrow('Impossible de démarrer une partie sans joueurs');
      expect(game.isActive).toBe(false);
    });
  });

  describe('stop', () => {
    beforeEach(() => {
      game.addPlayer('player1', 'User1');
      game.addPlayer('player2', 'User2');
      game.isActive = true;

      // Simuler que les joueurs jouent
      for (const player of game.players.values()) {
        player.isPlaying = true;
      }
    });

    it('devrait arrêter la partie et mettre tous les joueurs en non-jouant', () => {
      game.stop();

      expect(game.isActive).toBe(false);

      // Vérifier que tous les joueurs ont isPlaying à false
      for (const player of game.players.values()) {
        expect(player.isPlaying).toBe(false);
      }
    });
  });

  describe('generateRandomPiece', () => {
    it('devrait générer une pièce aléatoire positionnée correctement', () => {
      const piece = game.generateRandomPiece();

      // Avec notre mock de Math.random() à 0.5, nous devrions obtenir le type au milieu
      expect(piece.type).toBeDefined();
      expect(piece.x).toBe(3); // Position x par défaut
      expect(piece.y).toBe(0); // Position y par défaut
    });
  });

  describe('getState', () => {
    beforeEach(() => {
      game.addPlayer('player1', 'User1');
      game.addPlayer('player2', 'User2');
      game.isActive = true;
      game.startedAt = 2000;
    });

    it('devrait retourner l\'état complet du jeu', () => {
      const state = game.getState();

      expect(state.id).toBe(gameId);
      expect(state.isActive).toBe(true);
      expect(state.host).toBe('player1');
      expect(state.createdAt).toBe(1000);
      expect(state.startedAt).toBe(2000);
      expect(state.players).toBeInstanceOf(Array);
      expect(state.players.length).toBe(2);

      // Vérifier que getState est appelé pour chaque joueur
      for (const player of game.players.values()) {
        expect(player.getState).toHaveBeenCalledTimes(1);
      }
    });
  });
});
