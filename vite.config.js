import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: '.', 
  base: './', 
  server: {
    port: 5173,
    open: '/index.html',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html', 
      }
    }
  },
})
