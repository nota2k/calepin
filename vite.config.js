import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
  plugins: [
    vue(),
    // Désactivez vueDevTools en production ou sur l'hébergement
    ...(import.meta.env.DEV && import.meta.env.ENABLE_DEVTOOLS !== 'false'
      ? [vueDevTools()]
      : []),
    tailwindcss(),
  ],
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
