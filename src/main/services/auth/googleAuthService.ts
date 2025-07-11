import { google } from 'googleapis'
import * as fs from 'fs'
import * as path from 'path'
import { app, safeStorage } from 'electron'

export interface GoogleCredentials {
  access_token?: string | null
  refresh_token?: string | null
  scope?: string
  token_type?: string | null
  expiry_date?: number | null
}

export class GoogleAuthService {
  private static instance: GoogleAuthService
  private oAuth2Client: any = null
  private tokenPath: string
  
  // Required scopes for Google Sheets API
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.readonly'
  ]
  
  // OAuth2 client configuration
  private readonly CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
  private readonly CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
  private readonly REDIRECT_URI = 'http://localhost:3000/oauth2callback'
  
  private constructor() {
    const userDataPath = app.getPath('userData')
    this.tokenPath = path.join(userDataPath, 'google-token.enc')
  }
  
  public static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService()
    }
    return GoogleAuthService.instance
  }
  
  /**
   * Initialize OAuth2 client and authenticate user
   */
  public async authenticate(): Promise<any> {
    if (this.oAuth2Client && await this.isTokenValid()) {
      return this.oAuth2Client
    }
    
    // Try to load saved token
    const savedToken = await this.loadSavedToken()
    if (savedToken) {
      this.oAuth2Client = this.createOAuth2Client()
      this.oAuth2Client.setCredentials(savedToken)
      
      // Check if token needs refresh
      if (await this.needsTokenRefresh(savedToken)) {
        await this.refreshAccessToken()
      }
      
      return this.oAuth2Client
    }
    
    // No saved token, perform new authentication
    return await this.performNewAuthentication()
  }
  
  /**
   * Create OAuth2 client instance
   */
  private createOAuth2Client(): any {
    return new google.auth.OAuth2(
      this.CLIENT_ID,
      this.CLIENT_SECRET,
      this.REDIRECT_URI
    )
  }
  
  /**
   * Perform new OAuth2 authentication flow
   */
  private async performNewAuthentication(): Promise<any> {
    const oAuth2Client = this.createOAuth2Client()
    
    // Generate auth URL
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.SCOPES,
      prompt: 'consent'
    })
    
    console.log('Opening browser for Google authentication...')
    // Dynamic import for ESM module
    const open = (await import('open')).default
    await open(authUrl)
    
    // Start local server to handle callback
    const { authorizationCode } = await this.waitForAuthorizationCode()
    
    // Exchange authorization code for tokens
    const { tokens } = await oAuth2Client.getToken(authorizationCode)
    oAuth2Client.setCredentials(tokens)
    
    // Save tokens securely
    await this.saveToken(tokens)
    
    this.oAuth2Client = oAuth2Client
    return oAuth2Client
  }
  
  /**
   * Wait for authorization code from OAuth callback
   */
  private async waitForAuthorizationCode(): Promise<{ authorizationCode: string }> {
    return new Promise((resolve, reject) => {
      const express = require('express')
      const server = express()
      
      server.get('/oauth2callback', (req: any, res: any) => {
        const code = req.query.code
        const error = req.query.error
        
        if (error) {
          res.send('Authentication failed. You can close this window.')
          reject(new Error(`Authentication failed: ${error}`))
          return
        }
        
        res.send('Authentication successful! You can close this window.')
        httpServer.close()
        resolve({ authorizationCode: code })
      })
      
      const httpServer = server.listen(3000, () => {
        console.log('Listening for OAuth callback on http://localhost:3000')
      })
      
      // Timeout after 5 minutes
      setTimeout(() => {
        httpServer.close()
        reject(new Error('Authentication timeout'))
      }, 300000)
    })
  }
  
  /**
   * Save token securely using Electron's safeStorage
   */
  private async saveToken(token: GoogleCredentials): Promise<void> {
    try {
      const tokenString = JSON.stringify(token)
      
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(tokenString)
        await fs.promises.writeFile(this.tokenPath, encrypted)
      } else {
        // Fallback to plain text with warning
        console.warn('Encryption not available, storing token in plain text')
        await fs.promises.writeFile(this.tokenPath, tokenString, 'utf8')
      }
    } catch (error) {
      console.error('Failed to save token:', error)
      throw error
    }
  }
  
  /**
   * Load saved token from secure storage
   */
  private async loadSavedToken(): Promise<GoogleCredentials | null> {
    try {
      if (!fs.existsSync(this.tokenPath)) {
        return null
      }
      
      const data = await fs.promises.readFile(this.tokenPath)
      
      let tokenString: string
      if (safeStorage.isEncryptionAvailable()) {
        tokenString = safeStorage.decryptString(data)
      } else {
        tokenString = data.toString('utf8')
      }
      
      return JSON.parse(tokenString) as GoogleCredentials
    } catch (error) {
      console.error('Failed to load saved token:', error)
      return null
    }
  }
  
  /**
   * Check if token needs refresh
   */
  private async needsTokenRefresh(token: GoogleCredentials): Promise<boolean> {
    if (!token.expiry_date) return false
    
    // Refresh if token expires in less than 5 minutes
    const expiryBuffer = 5 * 60 * 1000
    return Date.now() > (token.expiry_date - expiryBuffer)
  }
  
  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.oAuth2Client) {
      throw new Error('OAuth2 client not initialized')
    }
    
    try {
      const { credentials } = await this.oAuth2Client.refreshAccessToken()
      this.oAuth2Client.setCredentials(credentials)
      await this.saveToken(credentials)
    } catch (error) {
      console.error('Failed to refresh access token:', error)
      throw error
    }
  }
  
  /**
   * Check if current token is valid
   */
  private async isTokenValid(): Promise<boolean> {
    if (!this.oAuth2Client) return false
    
    try {
      const tokenInfo = await this.oAuth2Client.getTokenInfo(
        this.oAuth2Client.credentials.access_token || ''
      )
      return !!(tokenInfo && tokenInfo.expiry_date && tokenInfo.expiry_date > Date.now())
    } catch {
      return false
    }
  }
  
  /**
   * Get authenticated Google Sheets client
   */
  public async getSheetsClient() {
    const auth = await this.authenticate()
    return google.sheets({ version: 'v4', auth })
  }
  
  /**
   * Get authenticated Google Drive client
   */
  public async getDriveClient() {
    const auth = await this.authenticate()
    return google.drive({ version: 'v3', auth })
  }
  
  /**
   * Revoke authentication and clear saved tokens
   */
  public async revokeAuth(): Promise<void> {
    if (this.oAuth2Client) {
      try {
        await this.oAuth2Client.revokeCredentials()
      } catch (error) {
        console.error('Failed to revoke credentials:', error)
      }
    }
    
    // Delete saved token
    if (fs.existsSync(this.tokenPath)) {
      await fs.promises.unlink(this.tokenPath)
    }
    
    this.oAuth2Client = null
  }
}