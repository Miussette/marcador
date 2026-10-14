import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron'
import { resolve } from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  // Rutas relativas: imprescindible para cargar `dist/` con file:// en la app empaquetada.
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              // sql.js (WASM), obs-websocket-js (depende de `ws` y
              // módulos de Node) y jspdf (build node con fs/Buffer) se
              // cargan desde node_modules: incluirlos dentro del bundle
              // rompe el proceso principal de Electron.
              external: ['sql.js', 'obs-websocket-js', 'jspdf'],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart: ({ reload }) => reload(),
      },
    ]),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        display: resolve(__dirname, 'display.html'),
        live: resolve(__dirname, 'live.html'),
      },
    },
  },
})
