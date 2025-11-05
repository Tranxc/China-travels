import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.', // 当前目录
  base: './', // 让路径相对化，适配本地资源
  server: {
    port: 5173,
    open: '/index.html', // 启动时打开首页
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
