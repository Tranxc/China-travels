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