import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Game class SECOND
vi.mock('../models/Game.js', () => {
  const GameMockConstructor = function(id, roomName, initialFallSpeedSetting) {
    this.id = id || 'mockGameId'; // Default to mockGameId if id is undefined
    this.roomName = roomName || 'mockRoom';
    this.initialFallSpeedSetting = initialFallSpeedSetting || 'normal';
    this.players = new Map();
    this.isActive = false;
    this.isOver = false;
    this.host = null;
    this.createdAt = Date.now(); // Uses the globally mocked Date.now()
    this.startedAt = null; // Initialize startedAt
    this.pieceSequence = [];

    this.addPlayer = vi.fn().mockImplementation((playerId, playerName) => {
      const player = {
        id: playerId,
        username: playerName,
        joinedAt: Date.now(), // Uses the globally mocked Date.now()
      };
      if (!this.host) {
        this.host = playerId;
      }
      this.players.set(playerId, player);
      return player;
    });

    this.removePlayer = vi.fn().mockImplementation((playerId) => {
      const playerExisted = this.players.has(playerId);
      this.players.delete(playerId);
      if (this.host === playerId) {
        if (this.players.size > 0) {
          this.host = this.players.values().next().value.id; // Simplistic host transfer
        } else {
          this.host = null;
        }
      }
      // If game becomes empty or only one player left, it might end.
      // This check is crucial for some GameManager logic.
      this.checkGameEnd(); // Call checkGameEnd after a player is removed
      return playerExisted;
    });

    this.start = vi.fn().mockImplementation(function() {
      if (this.players.size === 0) {
        this.isActive = false;
        return false;
      }
      this.isActive = true;
      this.isOver = false;
      this.startedAt = Date.now();
      return true;
    });

    this.update = vi.fn().mockReturnValue({ updatedPlayers: [], gameHasEnded: false });

    this.checkGameEnd = vi.fn().mockImplementation(() => {
      // Simplified logic for testing: if 0 or 1 player, game is over.
      // Real Game.js logic might be more complex (e.g., based on active players, scores, etc.)
      if (this.players.size <= 1 && this.isActive) { // Only consider active games
        this.isOver = true;
        this.isActive = false; // Game is no longer active if it's over
      }
      return this.isOver;
    });

    this.getState = vi.fn().mockImplementation(() => ({
      id: this.id,
      roomName: this.roomName,
      players: Array.from(this.players.values()).map(p => ({ id: p.id, username: p.username })),
      isActive: this.isActive,
      isOver: this.isOver,
      host: this.host,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      initialFallSpeedSetting: this.initialFallSpeedSetting,
    }));
  };
  const MockedGame = vi.fn(GameMockConstructor);
  return { Game: MockedGame };
});

// THEN describe block
describe('GameManager', () => {
  let GameManager_m;
  let Game_m; // This will be the mocked Game class constructor
  let mockUuidV4_m; // This will be our specific mock function for uuid.v4
  let gameManager_m;
  let dateNowSpy_m;
  let uuidCounter_m; // Counter for UUIDs

  beforeEach(async () => {
    vi.resetModules(); // Reset modules before each test

    uuidCounter_m = 0; // Reset counter for each test
    mockUuidV4_m = vi.fn().mockImplementation(() => `fixed-uuid-${++uuidCounter_m}`);
    vi.doMock('uuid', () => ({
      v4: mockUuidV4_m,
    }));

    // Import dependencies AFTER resetting modules and establishing mocks
    GameManager_m = (await import('../services/GameManager.js')).GameManager;
    Game_m = (await import('../models/Game.js')).Game; // Gets the mocked Game constructor

    dateNowSpy_m = vi.spyOn(Date, 'now').mockReturnValue(1000);
    gameManager_m = new GameManager_m();

    // Clear mocks. Game is the constructor mock. mockUuidV4_m is the function mock.
    Game_m.mockClear();
    if (mockUuidV4_m && mockUuidV4_m.mockClear) { // Check if it's a mock and has mockClear
      mockUuidV4_m.mockClear();
    }

    // Clear method mocks on any previously created Game instances
    if (Game_m.mock && Game_m.mock.instances) {
        Game_m.mock.instances.forEach(instance => {
            if (instance.addPlayer && instance.addPlayer.mockClear) instance.addPlayer.mockClear();
            if (instance.removePlayer && instance.removePlayer.mockClear) instance.removePlayer.mockClear();
            if (instance.start && instance.start.mockClear) instance.start.mockClear();
            if (instance.update && instance.update.mockClear) instance.update.mockClear();
            if (instance.checkGameEnd && instance.checkGameEnd.mockClear) instance.checkGameEnd.mockClear();
            if (instance.getState && instance.getState.mockClear) instance.getState.mockClear();
        });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (gameManager_m && gameManager_m.updateInterval) {
      gameManager_m.stopGameLoop();
    }
  });

  describe('constructor', () => {
    it('devrait initialiser les maps et les variables', () => {
      expect(gameManager_m.games).toBeInstanceOf(Map);
      expect(gameManager_m.games.size).toBe(0);
      expect(gameManager_m.playerGameMap).toBeInstanceOf(Map);
      expect(gameManager_m.playerGameMap.size).toBe(0);
      expect(gameManager_m.lastUpdateTime).toBe(1000);
      expect(gameManager_m.updateInterval).toBeNull();
    });
  });

  describe('createGame', () => {
    it('devrait creer une nouvelle partie et l associer au createur', () => {
      const creatorId = 'player1';
      const creatorName = 'User1';
      const roomName = 'Test Room';
      const initialFallSpeedSetting = 'fast';

      // Check if mockUuidV4_m is indeed the mock we expect
      expect(vi.isMockFunction(mockUuidV4_m)).toBe(true);

      const game = gameManager_m.createGame(creatorId, creatorName, roomName, initialFallSpeedSetting);

      expect(mockUuidV4_m).toHaveBeenCalledTimes(1);
      expect(Game_m).toHaveBeenCalledWith('fixed-uuid-1', roomName, initialFallSpeedSetting);
      expect(game.id).toBe('fixed-uuid-1');
      expect(game.roomName).toBe(roomName);
      expect(game.initialFallSpeedSetting).toBe(initialFallSpeedSetting);
      expect(game.addPlayer).toHaveBeenCalledWith(creatorId, creatorName);
      expect(gameManager_m.games.size).toBe(1);
      expect(gameManager_m.games.get('fixed-uuid-1')).toBe(game);
      expect(gameManager_m.playerGameMap.get(creatorId)).toBe('fixed-uuid-1');
      expect(gameManager_m.roomNameToIdMap.get(roomName)).toBe('fixed-uuid-1');
    });

    it('devrait lever une erreur si le nom de salle est déjà utilisé', () => {
      gameManager_m.createGame('p1', 'u1', 'ExistingRoom');
      // mockUuidV4_m would have been called once. Clear it for the next call.
      if (mockUuidV4_m && mockUuidV4_m.mockClear) mockUuidV4_m.mockClear();
      Game_m.mockClear(); // also clear Game constructor calls

      expect(() => {
        gameManager_m.createGame('p2', 'u2', 'ExistingRoom');
      }).toThrow('Une partie avec le nom "ExistingRoom" existe déjà');
      expect(mockUuidV4_m).not.toHaveBeenCalled(); // Should not be called if error is thrown early
    });
  });

  describe('joinGame', () => {
    let gameInstance_jg;

    beforeEach(() => {
      const creatorId = 'hostPlayerJoin';
      const creatorName = 'HostUserJoin';
      const roomName = 'JoinableRoomJG';
      gameInstance_jg = gameManager_m.createGame(creatorId, creatorName, roomName);
      // Clear mocks called during createGame for specific checks in joinGame tests
      if (gameInstance_jg && gameInstance_jg.addPlayer && gameInstance_jg.addPlayer.mockClear) {
        gameInstance_jg.addPlayer.mockClear();
      }
       // Clear calls to the main Game constructor and mockUuidV4_m from the createGame call above
      Game_m.mockClear();
      if (mockUuidV4_m && mockUuidV4_m.mockClear) mockUuidV4_m.mockClear();
    });

    it('devrait permettre à un joueur de rejoindre une partie existante', () => {
      const playerId = 'player2JG';
      const playerName = 'User2JG';
      const joinedGame = gameManager_m.joinGame(gameInstance_jg.roomName, playerId, playerName);
      expect(joinedGame).toBe(gameInstance_jg);
      expect(gameInstance_jg.addPlayer).toHaveBeenCalledWith(playerId, playerName);
      expect(gameManager_m.playerGameMap.get(playerId)).toBe(gameInstance_jg.id);
    });

    it('devrait lever une erreur si la partie n\'existe pas', () => {
      expect(() => {
        gameManager_m.joinGame('nonexistent-room-jg', 'p2jg', 'u2jg');
      }).toThrow('Partie nonexistent-room-jg introuvable');
    });

    it('devrait lever une erreur si la partie est déjà en cours', () => {
      gameInstance_jg.isActive = true;
      expect(() => {
        gameManager_m.joinGame(gameInstance_jg.roomName, 'p2jg', 'u2jg');
      }).toThrow(`La partie ${gameInstance_jg.roomName} est déjà en cours`);
      gameInstance_jg.isActive = false;
    });
  });

  describe('leaveGame', () => {
    let gameInstance_lg;
    const hostId_lg = 'hostPlayerLeaveLG'; // Unique host ID for this suite
    const guestId_lg = 'guestPlayerLeaveLG'; // Unique guest ID
    const roomName_lg = 'LeaveableRoomLG';

    beforeEach(() => {
      gameInstance_lg = gameManager_m.createGame(hostId_lg, 'HostLG', roomName_lg);
      gameManager_m.joinGame(roomName_lg, guestId_lg, 'GuestLG');
      // Clear method mocks on gameInstance from setup
      if (gameInstance_lg && gameInstance_lg.removePlayer && gameInstance_lg.removePlayer.mockClear) {
        gameInstance_lg.removePlayer.mockClear();
      }
      if (gameInstance_lg && gameInstance_lg.addPlayer && gameInstance_lg.addPlayer.mockClear) {
        gameInstance_lg.addPlayer.mockClear();
      }
      // Clear calls to the main Game constructor and mockUuidV4_m from the setup calls above
      Game_m.mockClear();
      if (mockUuidV4_m && mockUuidV4_m.mockClear) mockUuidV4_m.mockClear();
    });

    it('devrait permettre à un joueur de quitter une partie', () => {
      const leftGame = gameManager_m.leaveGame(guestId_lg);
      expect(leftGame).toBe(gameInstance_lg);
      expect(gameInstance_lg.removePlayer).toHaveBeenCalledWith(guestId_lg);
      expect(gameManager_m.playerGameMap.has(guestId_lg)).toBe(false);
    });

    it('devrait retourner null si le joueur n\'est pas dans une partie', () => {
      expect(gameManager_m.leaveGame('nonExistentPlayerIdLG')).toBeNull();
    });

    it('devrait transférer le rôle d\'hôte si l\'hôte quitte et qu\'il reste des joueurs', () => {
      gameManager_m.leaveGame(hostId_lg); // Host leaves
      expect(gameInstance_lg.removePlayer).toHaveBeenCalledWith(hostId_lg);
      // Mocked Game.removePlayer should handle setting the new host to guestId
      expect(gameInstance_lg.host).toBe(guestId_lg);
      expect(gameManager_m.playerGameMap.has(hostId_lg)).toBe(false);
      expect(gameManager_m.games.get(gameInstance_lg.id)).toBe(gameInstance_lg);
    });

    it('devrait supprimer la partie si elle devient vide après qu\'un joueur quitte', () => {
      const player1_lg_single = 'p1SingleLG';
      const roomSingle_lg = 'roomSingleLG';
      const singlePlayerGame_lg = gameManager_m.createGame(player1_lg_single, 'SingleLG', roomSingle_lg);
      const singlePlayerGameId_lg = singlePlayerGame_lg.id;

      // Clear removePlayer mock on this specific instance if needed, or rely on its current state
      if (singlePlayerGame_lg.removePlayer && singlePlayerGame_lg.removePlayer.mockClear) {
        singlePlayerGame_lg.removePlayer.mockClear();
      }
      // Simulate this game having only one player after creation for this test logic
      // The mock addPlayer in createGame already adds player1. We need to ensure no other players are assumed.
      // Our mock of Game.removePlayer also updates the host. If player1 is host and leaves,
      // and is the only player, players map becomes empty, host becomes null.

      gameManager_m.leaveGame(player1_lg_single);
      expect(singlePlayerGame_lg.removePlayer).toHaveBeenCalledWith(player1_lg_single);
      expect(gameManager_m.games.has(singlePlayerGameId_lg)).toBe(false);
      expect(gameManager_m.roomNameToIdMap.has(roomSingle_lg)).toBe(false);
      expect(gameManager_m.playerGameMap.has(player1_lg_single)).toBe(false);
    });
  });

  describe('startGame', () => {
    let gameInstance_sg;
    const hostId_sg = 'hostToStartSG';
    const roomName_sg = 'StartableGameRoomSG';

    beforeEach(() => {
      gameInstance_sg = gameManager_m.createGame(hostId_sg, 'HostSG', roomName_sg);
      if (gameInstance_sg && gameInstance_sg.start && gameInstance_sg.start.mockClear) {
        gameInstance_sg.start.mockClear();
      }
      Game_m.mockClear();
      mockUuidV4_m.mockClear();
    });

    it('devrait démarrer une partie existante si le demandeur est l\'hôte', () => {
      const result = gameManager_m.startGame(gameInstance_sg.id, hostId_sg);

      expect(result).toBe(true);
      expect(gameInstance_sg.start).toHaveBeenCalled();
      expect(gameInstance_sg.isActive).toBe(true);
      expect(gameManager_m.updateInterval).not.toBeNull();
    });

    it('devrait lever une erreur si la partie n\'existe pas', () => {
      expect(() => {
        gameManager_m.startGame('nonexistent-game-id-sg', hostId_sg);
      }).toThrow('Partie nonexistent-game-id-sg introuvable');
    });

    it('devrait lever une erreur si le demandeur n\'est pas l\'hôte', () => {
      const nonHostId_sg = 'nonHostPlayerStartSG';
      gameManager_m.joinGame(roomName_sg, nonHostId_sg, 'Non-HostSG');
      if (gameInstance_sg.start.mockClear) gameInstance_sg.start.mockClear();
      expect(() => {
        gameManager_m.startGame(gameInstance_sg.id, nonHostId_sg);
      }).toThrow('Seul l\'hôte peut démarrer la partie');
      expect(gameInstance_sg.start).not.toHaveBeenCalled();
    });

    it('ne devrait pas démarrer une nouvelle boucle de jeu si une est déjà active', () => {
      gameManager_m.startGameLoop(50);
      const initialInterval = gameManager_m.updateInterval;
      gameInstance_sg.start.mockReturnValue(true);
      gameManager_m.startGame(gameInstance_sg.id, hostId_sg);
      expect(gameInstance_sg.start).toHaveBeenCalled();
      expect(gameManager_m.updateInterval).toBe(initialInterval);
    });
  });

  describe('stopGameLoop', () => {
    it('devrait arrêter la boucle de jeu', () => {
      gameManager_m.startGameLoop(50);
      expect(gameManager_m.updateInterval).not.toBeNull();
      gameManager_m.stopGameLoop();
      expect(gameManager_m.updateInterval).toBeNull();
    });
  });

  describe('getGame', () => {
    it('devrait retourner une partie par son ID', () => {
      const game = gameManager_m.createGame('p1gg', 'u1gg', 'roomByIdGG');
      expect(gameManager_m.getGame(game.id)).toBe(game);
    });

    it('devrait retourner une partie par son nom de salle', () => {
      const game = gameManager_m.createGame('p1ggn', 'u1ggn', 'roomByNameGGN');
      expect(gameManager_m.getGame('roomByNameGGN')).toBe(game);
    });

    it('devrait retourner undefined si la partie n\'existe pas (par ID)', () => {
      expect(gameManager_m.getGame('nonexistent-id-gg')).toBeUndefined();
    });

    it('devrait retourner undefined si la partie n\'existe pas (par nom de salle)', () => {
      expect(gameManager_m.getGame('nonexistent-room-name-gg')).toBeUndefined();
    });
  });

  describe('getPlayerGame', () => {
    it('devrait retourner la partie d\'un joueur', () => {
      const player1Id_gpg = 'playerInGameGPG';
      const game = gameManager_m.createGame(player1Id_gpg, 'UserFromGameGPG', 'TestRoomForPlayerGPG');
      expect(gameManager_m.getPlayerGame(player1Id_gpg)).toBe(game);
    });

    it('devrait retourner null si le joueur n\'est pas dans une partie', () => {
      expect(gameManager_m.getPlayerGame('nonexistent-player-gpg')).toBeNull();
    });
  });

  describe('getAvailableGames', () => {
    it('devrait retourner toutes les parties non démarrées', () => {
      const game1_gag = gameManager_m.createGame('p1gag', 'u1gag', 'activeGameRoomGAG');

      if (!vi.isMockFunction(game1_gag.start)) {
      }

      gameManager_m.startGame(game1_gag.id, 'p1gag');

      const game2_gag = gameManager_m.createGame('p2gag', 'u2gag', 'pendingGameRoomGAG');

      const availableGames = gameManager_m.getAvailableGames();

      expect(availableGames.length).toBe(1);
      expect(availableGames[0].id).toBe(game2_gag.id);
      expect(availableGames.find(g => g.id === game1_gag.id)).toBeUndefined();
    });
  });

  describe('cleanupGames', () => {
    beforeEach(() => {
      // Date.now is already mocked to 1000 in the outer beforeEach
      // mockUuidV4_m and Game constructor mocks are also cleared in outer beforeEach
    });

    it('devrait supprimer les vieilles parties inactives', () => {
      const oldInactiveGame_cg = gameManager_m.createGame('pOldICG', 'uOICG', 'oldInactiveRoomCG');
      oldInactiveGame_cg.createdAt = 0; // Created long ago
      oldInactiveGame_cg.isActive = false;
      oldInactiveGame_cg.startedAt = null;

      const recentInactiveGame_cg = gameManager_m.createGame('pRecentICG', 'uRICG', 'recentInactiveRoomCG');
      recentInactiveGame_cg.createdAt = 500; // Created more recently
      recentInactiveGame_cg.isActive = false;
      recentInactiveGame_cg.startedAt = null;

      gameManager_m.cleanupGames(500); // maxAge = 500; Date.now() is 1000

      expect(gameManager_m.games.has(oldInactiveGame_cg.id)).toBe(false);
      expect(gameManager_m.roomNameToIdMap.has('oldInactiveRoomCG')).toBe(false);
      expect(gameManager_m.games.has(recentInactiveGame_cg.id)).toBe(true);
    });

    it('devrait supprimer les vieilles parties actives (terminées implicitement)', () => {
      const oldActiveGame_cg = gameManager_m.createGame('pOldACG', 'uOACG', 'oldActiveRoomCG');
      oldActiveGame_cg.isActive = true;
      oldActiveGame_cg.startedAt = 0;

      gameManager_m.cleanupGames(500);

      expect(gameManager_m.games.has(oldActiveGame_cg.id)).toBe(true);
      expect(gameManager_m.roomNameToIdMap.has('oldActiveRoomCG')).toBe(true);
    });

    it('ne devrait pas supprimer les parties récentes', () => {
      const recentGame_cg = gameManager_m.createGame('pRecentCG', 'uRCG', 'recentRoomCG');
      recentGame_cg.createdAt = 800;
      recentGame_cg.isActive = false;

      const recentActiveGame_cg = gameManager_m.createGame('pRecentACG', 'uRACG', 'recentActiveRoomCG');
      recentActiveGame_cg.isActive = true;
      recentActiveGame_cg.startedAt = 800;

      gameManager_m.cleanupGames(500);

      expect(gameManager_m.games.has(recentGame_cg.id)).toBe(true);
      expect(gameManager_m.games.has(recentActiveGame_cg.id)).toBe(true);
    });

    it('devrait dissocier les joueurs des parties supprimées', () => {
      const playerInOldGame_cg = 'playerOldGameCleanupCG';
      const oldGameToClean_cg = gameManager_m.createGame(playerInOldGame_cg, 'OldUserCleanCG', 'gameToCleanPlayerMapCG');
      oldGameToClean_cg.createdAt = 0;
      oldGameToClean_cg.isActive = false;

      expect(gameManager_m.playerGameMap.has(playerInOldGame_cg)).toBe(true);
      gameManager_m.cleanupGames(500);
      expect(gameManager_m.games.has(oldGameToClean_cg.id)).toBe(false);
      expect(gameManager_m.playerGameMap.has(playerInOldGame_cg)).toBe(false);
    });
  });
});
