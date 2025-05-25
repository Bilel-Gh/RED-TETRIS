import Fastify from 'fastify'
import cors from '@fastify/cors'
import { createServer } from 'http'
import { SocketService } from './src/services/SocketService.js'

// Création du serveur Fastify
const fastify = Fastify({
  logger: true
})

// Configuration CORS
await fastify.register(cors, {
  origin: true
})

// Création du serveur HTTP
const httpServer = createServer(fastify.server)

// Initialisation du service Socket.io
const socketService = new SocketService(httpServer)

// Route de test
fastify.get('/', async (_request, _reply) => {
  return { status: 'online', message: 'RED-TETRIS Server is running' }
})

// Route pour lister les parties disponibles
fastify.get('/games', async (_request, _reply) => {
  return { games: socketService.gameManager.getAvailableGames() }
})

// Démarrage du serveur
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    httpServer.listen(3001)
    console.log('Serveur démarré sur le port 3000 (HTTP) et 3001 (WebSocket)')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
