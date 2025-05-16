import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameManager } from '../services/GameManager.js';
import { Game } from '../models/Game.js';

// Mock UUID
vi.mock('uuid', () => {
  return {
    v4: vi.fn().mockReturnValue('game-123')
  };
});

// Mock Game class
vi.mock('../models/Game.js', () => {
  return {
    Game: vi.fn().mockImplementation((id) => {
      return {
        id,
        players: new Map(),
        isActive: false,
        host: null,
        createdAt: Date.now(),
        startedAt: null,
        addPlayer: vi.fn().mockImplementation((playerId, playerName) => {
          const player = { id: playerId, name: playerName };
          if (!this.host) this.host = playerId;
          this.players.set(playerId, player);
          return player;
        }),
        removePlayer: vi.fn().mockImplementation((playerId) => {
          this.players.delete(playerId);
          if (this.host === playerId && this.players.size > 0) {
            this.host = this.players.keys().next().value;
          }
          if (this.players.size === 0) {
            this.isActive = false;
          }
        }),
        start: vi.fn().mockImplementation(() => {
          this.isActive = true;
          this.startedAt = Date.now();
          return true;
        }),
        update: vi.fn(),
        getState: vi.fn().mockReturnValue({ id, players: [] })
      };
    })
  };
});

describe('GameManager', () => {
  let gameManager;

  beforeEach(() => {
    // Réinitialiser le GameManager avant chaque test
    vi.clearAllMocks();
    gameManager = new GameManager();

    // Mock de Date.now() pour des tests déterministes
    vi.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    // Nettoyer les timers
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('devrait initialiser les maps et les variables', () => {
      expect(gameManager.games).toBeInstanceOf(Map);
      expect(gameManager.games.size).toBe(0);
      expect(gameManager.playerGameMap).toBeInstanceOf(Map);
      expect(gameManager.playerGameMap.size).toBe(0);
      expect(gameManager.lastUpdateTime).toBe(1000);
      expect(gameManager.updateInterval).toBeNull();
    });
  });

  describe('createGame', () => {
    it('devrait créer une nouvelle partie et l\'associer au créateur', () => {
      const creatorId = 'player1';
      const creatorName = 'User1';

      const game = gameManager.createGame(creatorId, creatorName);

      expect(Game).toHaveBeenCalledWith('game-123');
      expect(game.id).toBe('game-123');
      expect(gameManager.games.size).toBe(1);
      expect(gameManager.games.get('game-123')).toBe(game);
      expect(gameManager.playerGameMap.get(creatorId)).toBe('game-123');
    });
  });

  describe('joinGame', () => {
    let game;

    beforeEach(() => {
      game = gameManager.createGame('player1', 'User1');
      vi.clearAllMocks(); // Clear mocks after creation
    });

    it('devrait permettre à un joueur de rejoindre une partie existante', () => {
      const playerId = 'player2';
      const playerName = 'User2';

      const joinedGame = gameManager.joinGame('game-123', playerId, playerName);

      expect(joinedGame).toBe(game);
      expect(game.addPlayer).toHaveBeenCalledWith(playerId, playerName);
      expect(gameManager.playerGameMap.get(playerId)).toBe('game-123');
    });

    it('devrait lever une erreur si la partie n\'existe pas', () => {
      expect(() => {
        gameManager.joinGame('nonexistent-game', 'player2', 'User2');
      }).toThrow('Partie nonexistent-game introuvable');
    });

    it('devrait lever une erreur si la partie est déjà en cours', () => {
      // Simuler une partie active
      game.isActive = true;

      expect(() => {
        gameManager.joinGame('game-123', 'player2', 'User2');
      }).toThrow('La partie game-123 est déjà en cours');
    });
  });

  describe('leaveGame', () => {
    let game;

    beforeEach(() => {
      game = gameManager.createGame('player1', 'User1');
      gameManager.joinGame('game-123', 'player2', 'User2');
      vi.clearAllMocks(); // Clear mocks after setup
    });

    it('devrait permettre à un joueur de quitter une partie', () => {
      const leftGame = gameManager.leaveGame('player2');

      expect(leftGame).toBe(game);
      expect(game.removePlayer).toHaveBeenCalledWith('player2');
      expect(gameManager.playerGameMap.has('player2')).toBe(false);
    });

    it('devrait retourner null si le joueur n\'est pas dans une partie', () => {
      const leftGame = gameManager.leaveGame('nonexistent-player');

      expect(leftGame).toBeNull();
    });

    it('devrait supprimer la partie si elle devient vide', () => {
      // Simuler que le jeu devient vide après le départ du premier joueur
      game.players.clear();

      const leftGame = gameManager.leaveGame('player1');

      expect(leftGame).toBe(game);
      expect(gameManager.games.has('game-123')).toBe(false);
    });
  });

  describe('startGame', () => {
    let game;

    beforeEach(() => {
      game = gameManager.createGame('player1', 'User1');
      gameManager.joinGame('game-123', 'player2', 'User2');
      game.host = 'player1'; // Explicitement définir l'hôte
      vi.clearAllMocks(); // Clear mocks after setup

      // Mock startGameLoop
      vi.spyOn(gameManager, 'startGameLoop').mockImplementation(() => {});
    });

    it('devrait démarrer une partie si le demandeur est l\'hôte', () => {
      const result = gameManager.startGame('game-123', 'player1');

      expect(result).toBe(true);
      expect(game.start).toHaveBeenCalledTimes(1);
      expect(gameManager.startGameLoop).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une erreur si la partie n\'existe pas', () => {
      expect(() => {
        gameManager.startGame('nonexistent-game', 'player1');
      }).toThrow('Partie nonexistent-game introuvable');
    });

    it('devrait lever une erreur si le demandeur n\'est pas l\'hôte', () => {
      expect(() => {
        gameManager.startGame('game-123', 'player2');
      }).toThrow('Seul l\'hôte peut démarrer la partie');
    });
  });

  describe('getGame', () => {
    let game;

    beforeEach(() => {
      game = gameManager.createGame('player1', 'User1');
    });

    it('devrait retourner une partie par son ID', () => {
      const foundGame = gameManager.getGame('game-123');

      expect(foundGame).toBe(game);
    });

    it('devrait retourner undefined si la partie n\'existe pas', () => {
      const foundGame = gameManager.getGame('nonexistent-game');

      expect(foundGame).toBeUndefined();
    });
  });

  describe('getPlayerGame', () => {
    let game;

    beforeEach(() => {
      game = gameManager.createGame('player1', 'User1');
    });

    it('devrait retourner la partie d\'un joueur', () => {
      const foundGame = gameManager.getPlayerGame('player1');

      expect(foundGame).toBe(game);
    });

    it('devrait retourner null si le joueur n\'est pas dans une partie', () => {
      const foundGame = gameManager.getPlayerGame('nonexistent-player');

      expect(foundGame).toBeNull();
    });
  });

  describe('getAvailableGames', () => {
    beforeEach(() => {
      // Créer plusieurs parties, certaines actives
      const game1 = gameManager.createGame('player1', 'User1');
      const game2 = gameManager.createGame('player2', 'User2');
      const game3 = gameManager.createGame('player3', 'User3');

      // Simuler une partie active
      game2.isActive = true;
    });

    it('devrait retourner uniquement les parties non démarrées', () => {
      // Mock pour simulation des états des parties
      vi.spyOn(gameManager.games.get('game-123'), 'getState').mockReturnValue({
        id: 'game-123',
        isActive: false,
        players: [{ id: 'player1', username: 'User1' }],
        host: 'player1'
      });

      const availableGames = gameManager.getAvailableGames();

      expect(availableGames.length).toBe(2); // game1 et game3 sont disponibles
      expect(availableGames.some(g => g.id === 'game-123')).toBe(true);
    });
  });

  describe('cleanupGames', () => {
    beforeEach(() => {
      // Créer quelques parties
      gameManager.createGame('player1', 'User1');
      gameManager.createGame('player2', 'User2');

      // Simuler une partie ancienne (créée il y a longtemps)
      const oldGame = gameManager.games.get('game-123');
      oldGame.createdAt = 1000 - (31 * 60 * 1000); // 31 minutes avant
    });

    it('devrait nettoyer les parties inactives trop anciennes', () => {
      // Avant le nettoyage
      expect(gameManager.games.size).toBe(2);

      gameManager.cleanupGames(30 * 60 * 1000); // 30 minutes

      // Après le nettoyage
      expect(gameManager.games.size).toBe(1); // La partie ancienne doit être supprimée
      expect(gameManager.games.has('game-123')).toBe(false);
      expect(gameManager.playerGameMap.has('player1')).toBe(false);
    });
  });
});
