import express from 'express'
import https from 'https'
import http from 'http'
import path from 'path'
import fs from 'fs'
import { logger } from '../utils/logger'
import { WebSocketServer } from 'ws'
import { ExcelBridgeService } from './excelBridgeService'

export class ExcelAddinServer {
  private app: express.Application
  private server: https.Server | http.Server | null = null
  private wss: WebSocketServer | null = null
  private port: number = 3000
  private isRunning: boolean = false

  constructor() {
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    // Enable CORS for Office domains
    this.app.use((req, res, next) => {
      const allowedOrigins = [
        'https://localhost:3000',
        'https://excel.officeapps.live.com',
        'https://office.live.com',
        'ms-word:',
        'ms-excel:',
        'ms-powerpoint:'
      ]
      
      const origin = req.headers.origin
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
      }
      
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200)
      } else {
        next()
      }
    })

    // Serve static files
    this.app.use('/assets', express.static(path.join(__dirname, '../../../assets')))
    this.app.use(express.json())
  }

  private setupRoutes(): void {
    // Excel add-in taskpane route
    this.app.get('/excel', (req, res) => {
      res.sendFile(path.join(__dirname, '../../../public/excel.html'))
    })

    // Functions file for Excel commands
    this.app.get('/functions.html', (req, res) => {
      res.sendFile(path.join(__dirname, '../../../public/functions.html'))
    })

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    // WebSocket endpoint for Electron-Excel communication
    this.app.get('/ws', (req, res) => {
      res.json({ 
        message: 'WebSocket endpoint', 
        url: `wss://localhost:${this.port}/ws` 
      })
    })
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Excel add-in server is already running')
      return
    }

    try {
      // Check if we have certificates for HTTPS
      const certPath = path.join(__dirname, '../../../certs/localhost.pem')
      const keyPath = path.join(__dirname, '../../../certs/localhost-key.pem')
      
      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        // Use HTTPS in development
        const options = {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath)
        }
        
        this.server = https.createServer(options, this.app)
        logger.info('Starting Excel add-in server with HTTPS')
      } else {
        // Fallback to HTTP if certificates don't exist
        this.server = http.createServer(this.app)
        logger.warn('Starting Excel add-in server with HTTP (certificates not found)')
        logger.warn('Excel add-ins require HTTPS. Please generate certificates.')
      }

      // Set up WebSocket server
      this.wss = new WebSocketServer({ server: this.server })
      this.setupWebSocket()

      await new Promise<void>((resolve, reject) => {
        this.server!.listen(this.port, () => {
          this.isRunning = true
          const protocol = this.server instanceof https.Server ? 'https' : 'http'
          logger.info(`Excel add-in server running at ${protocol}://localhost:${this.port}`)
          resolve()
        })

        this.server!.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            logger.error(`Port ${this.port} is already in use`)
          } else {
            logger.error('Failed to start Excel add-in server:', error)
          }
          reject(error)
        })
      })
    } catch (error) {
      logger.error('Error starting Excel add-in server:', error)
      throw error
    }
  }

  private setupWebSocket(): void {
    if (!this.wss) return

    const bridgeService = ExcelBridgeService.getInstance()

    this.wss.on('connection', (ws, req) => {
      const clientId = `excel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      logger.info(`New WebSocket connection from Excel add-in: ${clientId}`)
      
      // Send initial connection success message
      ws.send(JSON.stringify({ 
        type: 'connected', 
        message: 'Connected to Gridmate Excel add-in server',
        clientId
      }))

      // Delegate to bridge service
      bridgeService.handleConnection(ws, clientId)
    })
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return

    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          logger.info('WebSocket server closed')
        })
      }

      if (this.server) {
        this.server.close(() => {
          this.isRunning = false
          logger.info('Excel add-in server stopped')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  isServerRunning(): boolean {
    return this.isRunning
  }
}