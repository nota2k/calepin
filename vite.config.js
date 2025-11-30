import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
/* eslint-env node */
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    // Réduire les options du serveur pour économiser la mémoire
    hmr: {
      overlay: false // Désactive l'overlay d'erreur pour économiser la mémoire
    }
  },
  // Optimisations pour réduire la mémoire
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia']
  },
  build: {
    // Options de build optimisées
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia']
        }
      }
    }
  }
})
