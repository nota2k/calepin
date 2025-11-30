import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
/* eslint-env node */
export default defineConfig(({ mode }) => {

  const isDev = mode === 'development'
  // eslint-disable-next-line no-undef
  const enableDevTools = process.env.ENABLE_DEVTOOLS !== 'false'

  const plugins = [vue(), tailwindcss()]

  // Ajouter vueDevTools uniquement en développement si activé
  if (isDev && enableDevTools) {
    plugins.push(vueDevTools())
  }

  return {
  plugins,
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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia']
        }
      }
    }
  }
  }
})
