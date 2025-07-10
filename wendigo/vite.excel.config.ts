import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: '/',
  resolve: {
    alias: {
      '@': resolve('src'),
      '@renderer': resolve('src/renderer'),
      '@shared': resolve('src/shared')
    }
  },
  build: {
    outDir: '../../dist/excel',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        excel: resolve(__dirname, 'src/renderer/excel-app.tsx')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  server: {
    port: 3001,
    strictPort: true
  }
})