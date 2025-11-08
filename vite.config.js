import { copyFileSync, mkdirSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { defineConfig } from 'vite'

function copyComponentsPlugin() {
  return {
    name: 'copy-components',
    closeBundle() {
      const copyDir = (src, dest) => {
        mkdirSync(dest, { recursive: true })
        const entries = readdirSync(src, { withFileTypes: true })

        for (const entry of entries) {
          const srcPath = join(src, entry.name)
          const destPath = join(dest, entry.name)

          if (entry.isDirectory()) {
            copyDir(srcPath, destPath)
          } else {
            copyFileSync(srcPath, destPath)
          }
        }
      }

      copyDir('src/data', 'dist/src/data')
      copyDir('src/modules', 'dist/src/modules')

      // 复制 favicon
      try {
        copyFileSync('favicon.ico', 'dist/favicon.ico')
      } catch (e) { }

      // 复制其他组件
      const otherComponents = ['auth-modal.html', 'home-page.html', 'login-page.html',
        'mountain-poem.html', 'scene-drawer.html', 'map-toolbar.html']
      mkdirSync('dist/src/components', { recursive: true })
      otherComponents.forEach(file => {
        try {
          copyFileSync(join('src/components', file), join('dist/src/components', file))
        } catch (e) { }
      })
    }
  }
}

export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'assets',
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
        main: resolve(__dirname, 'index.html'),
        scenic: resolve(__dirname, 'pages/scenic.html'),
        culture: resolve(__dirname, 'src/components/culture-page.html'),
        map: resolve(__dirname, 'src/components/map.html'),
      }
    },
  },
  plugins: [copyComponentsPlugin()],
})
