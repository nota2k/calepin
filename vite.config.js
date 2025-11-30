import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd(), '')

  return {
  plugins: [
    vue(),
    // Désactivez vueDevTools en production ou sur l'hébergement
    ...(process.env.NODE_ENV === 'development' && process.env.ENABLE_DEVTOOLS !== 'false'
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
    },
    proxy: {
      '/api/notion': {
        target: 'https://api.notion.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/notion/, '/v1'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Récupère la clé depuis le header custom (insensible à la casse) ou utilise la clé par défaut
            const customSecret = req.headers['x-notion-secret'] || req.headers['X-Notion-Secret']
            const envSecret = env.VITE_NOTION_SECRET
            const secret = customSecret || envSecret || ''

            if (secret) {
              proxyReq.setHeader('Authorization', `Bearer ${secret}`)
              proxyReq.setHeader('Notion-Version', '2022-06-28')
              console.log(`🔐 Proxy: Utilisation de la clé API (${secret.substring(0, 10)}...) pour ${req.method} ${req.url}`)
            } else {
              console.error('❌ Proxy: Aucune clé API Notion trouvée!')
              console.error('   - Header X-Notion-Secret:', customSecret ? 'présent' : 'absent')
              console.error('   - Variable VITE_NOTION_SECRET:', envSecret ? 'présente' : 'absente')
              console.error('💡 Vérifiez que votre fichier .env contient: VITE_NOTION_SECRET=votre_clé_api')
            }

            // Supprime le header custom pour ne pas l'envoyer à Notion
            proxyReq.removeHeader('x-notion-secret')
            proxyReq.removeHeader('X-Notion-Secret')
          })
        }
      }
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
