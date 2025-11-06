<<<<<<< HEAD
import { defineConfig } from "vite";

export default defineConfig({
  root: ".", // 以当前目录为项目根目录
  server: {
    open: "index.html", // ✅ 启动时默认打开 index.html
    port: 5173,         // 可改成你想要的端口
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",   // 主入口
      }
    }
  }
});
=======
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
>>>>>>> 58988cccb4345b4bda3b0c6c35256a642a789568
