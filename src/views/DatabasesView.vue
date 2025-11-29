<script setup>
import { ref, onMounted } from 'vue'
import { listAllNotionDatabases } from '@/services/notion'

const databases = ref([])
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    loading.value = true
    error.value = null

    // Utilise la nouvelle fonction qui liste toutes les bases avec toutes les clés
    const fetchedDatabases = await listAllNotionDatabases()

    if (fetchedDatabases && fetchedDatabases.length > 0) {
      databases.value = fetchedDatabases
    } else {
      console.warn('Aucune base de données trouvée')
      databases.value = []
    }
  } catch (err) {
    error.value = err.message || 'Une erreur est survenue lors du chargement des bases de données'
    console.error('Erreur lors du chargement:', err)
    databases.value = []
  } finally {
    loading.value = false
  }
})

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function extractDatabaseId(url) {
  if (!url) return ''
  // Extrait l'ID de l'URL Notion (format: https://www.notion.so/ID?v=...)
  const match = url.match(/notion\.so\/([a-f0-9]{32})/)
  return match ? match[1] : ''
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-gray-800 mb-2">Bases de données Notion</h1>
      <p class="text-gray-600">Liste de toutes les bases de données accessibles par votre intégration</p>
    </div>

    <!-- État de chargement -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>

    <!-- Message d'erreur -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
      <div class="flex items-start">
        <svg class="w-6 h-6 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 class="text-red-800 font-semibold mb-2">Erreur de connexion à Notion</h3>
          <p class="text-red-700 mb-3">{{ error }}</p>
          <div class="text-red-600 text-sm space-y-1">
            <p><strong>Vérifications à faire :</strong></p>
            <ul class="list-disc list-inside space-y-1 ml-2">
              <li>Votre fichier <code class="bg-red-100 px-1 rounded">.env</code> contient bien <code class="bg-red-100 px-1 rounded">VITE_NOTION_SECRET</code></li>
              <li>La clé API Notion est valide (commence par <code class="bg-red-100 px-1 rounded">secret_</code> ou <code class="bg-red-100 px-1 rounded">ntn_</code>)</li>
              <li>Les bases de données Notion sont partagées avec votre intégration</li>
              <li>Redémarrez le serveur de développement après modification du <code class="bg-red-100 px-1 rounded">.env</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Liste des bases de données -->
    <div v-else-if="databases.length > 0" class="space-y-4">
      <div class="mb-4 text-sm text-gray-600">
        <strong>{{ databases.length }}</strong> base{{ databases.length > 1 ? 's' : '' }} de données trouvée{{ databases.length > 1 ? 's' : '' }}
      </div>

      <div
        v-for="db in databases"
        :key="db.id"
        class="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-200"
      >
        <div class="p-6">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-start space-x-4 flex-1">
              <div v-if="db.icon" class="text-4xl flex-shrink-0">
                {{ db.icon }}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-2xl font-semibold text-gray-800 mb-2">{{ db.title }}</h3>
                <div class="flex flex-wrap gap-2 mb-3">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ID: {{ extractDatabaseId(db.url) || db.id.substring(0, 8) + '...' }}
                  </span>
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {{ db.properties.length }} propriété{{ db.properties.length > 1 ? 's' : '' }}
                  </span>
                </div>
              </div>
            </div>
            <a
              v-if="db.url"
              :href="db.url"
              target="_blank"
              rel="noopener noreferrer"
              class="ml-4 text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center whitespace-nowrap"
            >
              Ouvrir
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          <!-- Propriétés -->
          <div v-if="db.properties.length > 0" class="mb-4">
            <h4 class="text-sm font-semibold text-gray-700 mb-2">Propriétés :</h4>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="prop in db.properties"
                :key="prop"
                class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
              >
                {{ prop }}
              </span>
            </div>
          </div>

          <!-- Métadonnées -->
          <div class="flex flex-wrap gap-4 text-xs text-gray-500 pt-4 border-t border-gray-200">
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Créée: {{ formatDate(db.created_time) }}
            </div>
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modifiée: {{ formatDate(db.last_edited_time) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Message si aucune base de données -->
    <div v-else class="text-center py-12">
      <div class="bg-gray-50 rounded-lg p-8 border border-gray-200">
        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
        <p class="text-gray-600 text-lg mb-2">Aucune base de données trouvée</p>
        <p class="text-gray-500 text-sm">Assurez-vous que vos bases de données Notion sont partagées avec votre intégration.</p>
      </div>
    </div>
  </div>
</template>


