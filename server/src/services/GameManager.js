import { Game } from '../models/Game.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Classe qui gère l'ensemble des parties de Tetris
 */
export class GameManager {
  constructor(broadcastPlayerUpdatesCallback) {
    this.games = new Map(); // Map des parties indexées par ID
    this.playerGameMap = new Map(); // Map des joueurs vers leur partie (playerId -> gameId)
    this.roomNameToIdMap = new Map(); // Map pour associer les noms de salle aux IDs de partie
    this.broadcastPlayerUpdatesCallback = broadcastPlayerUpdatesCallback || (() => {}); // Fallback

    // Boucle de mise à jour du jeu
    this.lastUpdateTime = Date.now();
    this.updateInterval = null;
  }

  /**
   * Démarre la boucle de mise à jour du jeu
   * @param {number} interval - Intervalle de mise à jour en ms
   */
  startGameLoop(interval = 50) {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(() => {
      const currentTime = Date.now();
      const deltaTime = currentTime - this.lastUpdateTime;

      // Mettre à jour toutes les parties actives
      for (const game of this.games.values()) {
        if (game.isActive) {
          const updateResult = game.update(deltaTime);
          if (updateResult && updateResult.updatedPlayers && updateResult.updatedPlayers.length > 0) {
            if (this.broadcastPlayerUpdatesCallback) {
              this.broadcastPlayerUpdatesCallback(game.id, updateResult.updatedPlayers);
            }
          }
          // Gérer gameHasEnded si nécessaire (pas implémenté ici pour l'instant)
        }
      }

      this.lastUpdateTime = currentTime;
    }, interval);
  }

  /**
   * Arrête la boucle de mise à jour du jeu
   */
  stopGameLoop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Crée une nouvelle partie
   * @param {string} creatorId - ID du joueur qui crée la partie
   * @param {string} creatorName - Nom du joueur qui crée la partie
   * @param {string} roomName - Nom de la salle pour l'URL
   * @param {string} initialFallSpeedSetting - Réglage de la vitesse de chute initiale
   * @returns {Game} La partie créée
   */
  createGame(creatorId, creatorName, roomName, initialFallSpeedSetting = 'normal') {
    // Vérifier si le nom de salle n'est pas déjà utilisé
    if (this.roomNameToIdMap.has(roomName)) {
      throw new Error(`Une partie avec le nom "${roomName}" existe déjà`);
    }

    const gameId = uuidv4();
    const game = new Game(gameId, roomName, initialFallSpeedSetting);

    // Ajouter le créateur comme premier joueur
    game.addPlayer(creatorId, creatorName);

    // Enregistrer la partie
    this.games.set(gameId, game);
    this.playerGameMap.set(creatorId, gameId);
    this.roomNameToIdMap.set(roomName, gameId);

    return game;
  }

  /**
   * Rejoint une partie existante par son ID ou son nom de salle
   * @param {string} gameIdOrRoomName - ID de la partie ou nom de la salle à rejoindre
   * @param {string} playerId - ID du joueur qui rejoint
   * @param {string} playerName - Nom du joueur qui rejoint
   * @returns {Game} La partie rejointe
   */
  joinGame(gameIdOrRoomName, playerId, playerName) {
    // Vérifier si c'est un nom de salle et le convertir en ID de partie
    const gameId = this.roomNameToIdMap.get(gameIdOrRoomName) || gameIdOrRoomName;

    const game = this.games.get(gameId);

    if (!game) {
      throw new Error(`Partie ${gameIdOrRoomName} introuvable`);
    }

    if (game.isActive) {
      throw new Error(`La partie ${game.roomName} est déjà en cours`);
    }

    // Ajouter le joueur à la partie
    game.addPlayer(playerId, playerName);

    // Associer le joueur à la partie
    this.playerGameMap.set(playerId, gameId);

    return game;
  }

  /**
   * Quitte une partie
   * @param {string} playerId - ID du joueur qui quitte
   * @returns {Game|null} La partie quittée ou null si le joueur n'était pas dans une partie
   */
  leaveGame(playerId) {
    const gameId = this.playerGameMap.get(playerId);

    if (!gameId) return null;

    const game = this.games.get(gameId);

    if (game) {
      // Retirer le joueur de la partie
      game.removePlayer(playerId);
      console.log(`Le joueur ${playerId} a quitté la partie ${game.roomName}`);
      // Si la partie est vide, la supprimer
      if (game.players.size === 0) {
        this.games.delete(gameId);
        this.roomNameToIdMap.delete(game.roomName);
        console.log(`Partie ${game.roomName} supprimée car elle est vide`);
      } else {
        console.log(`Il reste ${game.players.size} joueurs dans la partie ${game.roomName}`);
        if (game.players.size === 1) {
          game.checkGameEnd();
        }
      }
    }

    // Dissocier le joueur de la partie
    this.playerGameMap.delete(playerId);
    console.log(`Le joueur ${playerId} a été dissocier de la partie`);
    console.log(`il reste ${this.playerGameMap.size} joueurs dans les parties`);

    return game;
  }

  /**
   * Démarre une partie
   * @param {string} gameId - ID de la partie à démarrer
   * @param {string} playerId - ID du joueur qui démarre la partie (doit être l'hôte)
   * @returns {boolean} true si la partie a démarré avec succès
   */
  startGame(gameId, playerId) {
    // console.log(`[GameManager.startGame] Attempting to start game: ${gameId} by player: ${playerId}`);
    const game = this.games.get(gameId);

    if (!game) {
      // console.error(`[GameManager.startGame] Game not found: ${gameId}`);
      throw new Error(`Partie ${gameId} introuvable`);
    }
    // console.log(`[GameManager.startGame] Game found: ${game.id}, Host is: ${game.host}, Player attempting start: ${playerId}`);

    if (game.host !== playerId) {
      // console.error(`[GameManager.startGame] Host check failed. Game host: ${game.host}, Player: ${playerId}`);
      throw new Error('Seul l\'hôte peut démarrer la partie');
    }

    // Démarrer la boucle de jeu si ce n'est pas déjà fait
    if (!this.updateInterval) {
      this.startGameLoop();
    }

    return game.start();
  }

  /**
   * Obtient une partie par son ID ou son nom de salle
   * @param {string} gameIdOrRoomName - ID de la partie ou nom de salle
   * @returns {Game|undefined} La partie ou undefined si non trouvée
   */
  getGame(gameIdOrRoomName) {
    // Vérifier si c'est un nom de salle et le convertir en ID de partie
    const gameId = this.roomNameToIdMap.get(gameIdOrRoomName) || gameIdOrRoomName;
    return this.games.get(gameId);
  }

  /**
   * Obtient la partie dans laquelle se trouve un joueur
   * @param {string} playerId - ID du joueur
   * @returns {Game|null} La partie ou null si le joueur n'est pas dans une partie
   */
  getPlayerGame(playerId) {
    const gameId = this.playerGameMap.get(playerId);
    return gameId ? this.games.get(gameId) : null;
  }

  /**
   * Liste toutes les parties disponibles (non démarrées)
   * @returns {Array} Liste des parties disponibles
   */
  getAvailableGames() {
    return Array.from(this.games.values())
      .filter(game => !game.isActive)
      .map(game => ({
        id: game.id,
        roomName: game.roomName,
        players: Array.from(game.players.values()).map(p => ({
          id: p.id,
          username: p.username
        })),
        host: game.host,
        createdAt: game.createdAt
      }));
  }

  /**
   * Nettoie les parties inactives ou terminées depuis trop longtemps
   * @param {number} maxAge - Âge maximum en ms avant nettoyage
   */
  cleanupGames(maxAge = 30 * 60 * 1000) { // 30 minutes par défaut
    const now = Date.now();

    for (const [gameId, game] of this.games.entries()) {
      // Nettoyer les parties inactives qui sont trop anciennes
      const gameEndTime = game.isActive ? now : (game.startedAt || game.createdAt);
      if (now - gameEndTime > maxAge) {
        // Dissocier tous les joueurs de cette partie
        for (const playerId of game.players.keys()) {
          this.playerGameMap.delete(playerId);
        }

        // Supprimer la partie
        this.games.delete(gameId);
        this.roomNameToIdMap.delete(game.roomName);
      }
    }
  }
}
