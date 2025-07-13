import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'
import { homedir } from 'os'
import { join } from 'path'

// Try to read certificates from multiple locations
let httpsConfig = undefined
const customCertsPath = '../certs'
const officeAddinCertsPath = join(homedir(), '.office-addin-dev-certs')

// First try custom certificates
if (fs.existsSync(join(customCertsPath, 'localhost-key.pem')) && 
    fs.existsSync(join(customCertsPath, 'localhost.pem'))) {
  httpsConfig = {
    key: fs.readFileSync(join(customCertsPath, 'localhost-key.pem')),
    cert: fs.readFileSync(join(customCertsPath, 'localhost.pem'))
  }
}
// Then try office-addin-dev-certs
else if (fs.existsSync(join(officeAddinCertsPath, 'localhost.key')) && 
         fs.existsSync(join(officeAddinCertsPath, 'localhost.crt'))) {
  httpsConfig = {
    key: fs.readFileSync(join(officeAddinCertsPath, 'localhost.key')),
    cert: fs.readFileSync(join(officeAddinCertsPath, 'localhost.crt'))
  }
}
// Fallback to true to let Vite generate its own certificate
else {
  httpsConfig = true
  console.warn('No certificates found. Run "npm run certificates" to generate them.')
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@services': resolve(__dirname, './src/services'),
      '@store': resolve(__dirname, './src/store'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@types': resolve(__dirname, './src/types'),
      '@utils': resolve(__dirname, './src/utils')
    }
  },
  server: {
    https: httpsConfig,
    port: 3000,
    cors: {
      origin: true,
      credentials: true
    },
    proxy: {
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
})