<script setup>
import { ref, onMounted } from 'vue'
import { fetchMultipleNotionDatabases } from '@/services/notion'

const cards = ref([])
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    loading.value = true
    error.value = null

    // La fonction fetchMultipleNotionDatabases retourne maintenant une card par page
    const fetchedCards = await fetchMultipleNotionDatabases()

    if (fetchedCards && fetchedCards.length > 0) {
      cards.value = fetchedCards
    } else {
      console.warn('Aucune card trouvée dans les bases de données Notion')
      cards.value = []
    }
  } catch (err) {
    error.value = err.message || 'Une erreur est survenue lors du chargement des données'
    console.error('Erreur lors du chargement:', err)
    cards.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold text-gray-800 mb-2">Bienvenue</h1>
    <p class="text-gray-600 mb-8">Découvrez nos fonctionnalités</p>

    <!-- État de chargement -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>

    <!-- Message d'erreur -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
      <div class="flex items-start">
        <svg class="w-6 h-6 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 class="text-red-800 font-semibold mb-2">Erreur de connexion à Notion</h3>
          <p class="text-red-700 mb-3">{{ error }}</p>
          <div class="text-red-600 text-sm space-y-1">
            <p><strong>Vérifications à faire :</strong></p>
            <ul class="list-disc list-inside space-y-1 ml-2">
              <li>Votre fichier <code class="bg-red-100 px-1 rounded">.env</code> contient bien <code
                  class="bg-red-100 px-1 rounded">VITE_NOTION_SECRET</code> et <code
                  class="bg-red-100 px-1 rounded">VITE_NOTION_DATABASE_ID</code></li>
              <li>La clé API Notion est valide (commence par <code class="bg-red-100 px-1 rounded">secret_</code> ou
                <code class="bg-red-100 px-1 rounded">ntn_</code>)
              </li>
              <li>La base de données Notion est partagée avec votre intégration</li>
              <li>Redémarrez le serveur de développement après modification du <code
                  class="bg-red-100 px-1 rounded">.env</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Grille de cards -->
    <div v-else-if="cards.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <a v-for="card in cards" :key="card.id" :href="card.url" target="_blank" rel="noopener noreferrer"
        class="bg-gray-100 rounded-b-lg overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col min-h-[200px] group">
        <!-- Header avec le nom de la base de données -->
        <div class="database text-white py-3 px-4 font-medium" :style="{ backgroundColor: card.databaseColor }">
          <span class="text-slate-700 font-semibold">{{ card.databaseName }}</span>
        </div>

        <!-- Corps de la card -->
        <div class="p-6 flex flex-col justify-between flex-1">
          <div class="flex-1">
            <!-- Titre -->
            <div class="flex items-baseline justify-start gap-2 border-b border-slate-400 pb-1 mb-4">
              <h3 class="text-xl font-normal text-black mb-2 text-slate-500">{{ card.titre }}</h3>

              <!-- Artiste (si disponible) -->
              <p v-if="card.artiste" class="text-xl font-bold text-black mb-3 text-slate-700"> - {{
                card.artiste }}</p>
            </div>
            <!-- Genre (tag rouge) -->
            <span v-if="card.genre" :class="[
              'inline-block bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium',
              card.genreClass ? `${card.genreClass}` : ''
            ]">
              {{ card.genre }}
            </span>
          </div>

          <!-- Date en bas à droite -->
          <div class="mt-4 text-right">
            <p v-if="card.dateAjoute" class="text-sm font-normal text-black">
              Ajouté le : {{ card.dateAjoute }}
            </p>
          </div>
        </div>
      </a>
    </div>

    <!-- Message si aucune card -->
    <div v-else class="text-center py-12 text-gray-500">
      <p>Aucune card disponible pour le moment.</p>
    </div>
  </div>
</template>
