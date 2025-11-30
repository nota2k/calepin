<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchMultipleNotionDatabases, getDatabasesMetadata } from '@/services/notion'
import { getCachedCards, setCachedCards, setCachedMetadata, hasDatabasesChanged, clearCache } from '@/services/cache'
import CardGrid from '@/components/CardGrid.vue'
import CreatePageForm from '@/components/CreatePageForm.vue'

const cards = ref([])
const loading = ref(true)
const error = ref(null)
const viewMode = ref('grid') // 'grid' ou 'list'
const isRefreshing = ref(false) // Pour indiquer un rafraîchissement en arrière-plan
const selectedGenre = ref(null) // Genre sélectionné pour le filtre
const selectedSource = ref(null) // Source sélectionnée pour le filtre

function toggleViewMode() {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid'
}

// Fonction helper pour extraire la source d'une card (même logique que sourceDisplay)
function getCardSource(card) {
  if (!card.url) {
    return card.databaseId || null
  }
  const urlLower = card.url.toLowerCase()
  if (urlLower.includes('youtube')) {
    return 'YouTube'
  }
  if (urlLower.includes('plex')) {
    return 'Plex'
  }
  return card.databaseId || null
}

// Fonction helper pour obtenir la valeur data-source d'une source (même logique que sourceDisplay)
function getSourceDataValue(source) {
  if (!source) return null
  if (source === 'YouTube') return 'youtube'
  if (source === 'Plex') return 'plex'
  return null
}

// Extraire tous les genres uniques depuis les cards
const availableGenres = computed(() => {
  const genres = new Set()
  cards.value.forEach(card => {
    if (card.genre) {
      // Si c'est un tableau, ajouter tous les genres du tableau
      if (Array.isArray(card.genre)) {
        card.genre.forEach(genre => {
          if (genre) genres.add(genre)
        })
      } else {
        // Si c'est une chaîne (ancien format), l'ajouter quand même
        genres.add(card.genre)
      }
    }
  })
  return Array.from(genres).sort()
})

// Extraire toutes les sources uniques depuis les cards
const availableSources = computed(() => {
  const sources = new Set()
  cards.value.forEach(card => {
    const source = getCardSource(card)
    if (source) {
      sources.add(source)
    }
  })
  return Array.from(sources).sort()
})

// Filtrer les cards selon le genre et la source sélectionnés
const filteredCards = computed(() => {
  let filtered = cards.value

  // Filtrer par genre
  if (selectedGenre.value) {
    filtered = filtered.filter(card => {
      if (!card.genre) return false
      // Si c'est un tableau, vérifier si le genre sélectionné est dans le tableau
      if (Array.isArray(card.genre)) {
        return card.genre.includes(selectedGenre.value)
      }
      // Si c'est une chaîne (ancien format), comparer directement
      return card.genre === selectedGenre.value
    })
  }

  // Filtrer par source
  if (selectedSource.value) {
    filtered = filtered.filter(card => {
      const source = getCardSource(card)
      return source === selectedSource.value
    })
  }

  return filtered
})

function toggleGenre(genre) {
  if (selectedGenre.value === genre) {
    // Désélectionner si déjà sélectionné
    selectedGenre.value = null
  } else {
    // Sélectionner le genre
    selectedGenre.value = genre
  }
}

function toggleSource(source) {
  if (selectedSource.value === source) {
    // Désélectionner si déjà sélectionné
    selectedSource.value = null
  } else {
    // Sélectionner la source
    selectedSource.value = source
  }
}

function handlePageCreated() {
  // Nettoyer le cache pour forcer le rechargement
  clearCache()
  // Recharger les cards
  loadCards()
}

async function loadCards() {
  const fetchedCards = await fetchMultipleNotionDatabases()

  if (fetchedCards && fetchedCards.length > 0) {
    cards.value = fetchedCards
    setCachedCards(fetchedCards)

    // Sauvegarder les métadonnées
    const metadata = await getDatabasesMetadata()
    setCachedMetadata(metadata)
  } else {
    console.warn('Aucune card trouvée dans les bases de données Notion')
    cards.value = []
  }
}

async function checkForUpdates() {
  try {
    isRefreshing.value = true

    // Récupérer les métadonnées actuelles
    const currentMetadata = await getDatabasesMetadata()

    // Vérifier si quelque chose a changé
    if (hasDatabasesChanged(currentMetadata)) {
      console.log('🔄 Nouvelles données détectées, rechargement...')
      await loadCards()
    } else {
      console.log('✅ Données à jour, pas de rechargement nécessaire')
      // Forcer un rechargement périodique même si les métadonnées n'ont pas changé
      // pour s'assurer que les propriétés comme "Note" sont à jour
      const cachedCards = getCachedCards()
      if (cachedCards) {
        const cacheAge = Date.now() - (JSON.parse(localStorage.getItem('notion_cards_cache'))?.timestamp || 0)
        // Recharger si le cache a plus de 5 minutes
        if (cacheAge > 5 * 60 * 1000) {
          console.log('🔄 Cache ancien, rechargement...')
          await loadCards()
        }
      }
    }
  } catch (err) {
    console.error('Erreur lors de la vérification des mises à jour:', err)
  } finally {
    isRefreshing.value = false
  }
}

onMounted(async () => {
  try {
    loading.value = true
    error.value = null

    // 1. Charger les données en cache immédiatement
    const cachedCards = getCachedCards()
    if (cachedCards && cachedCards.length > 0) {
      cards.value = cachedCards
      loading.value = false

      // 2. Vérifier en arrière-plan si les données ont changé
      checkForUpdates()
    } else {
      // Pas de cache, charger les données
      await loadCards()
      loading.value = false
    }
  } catch (err) {
    error.value = err.message || 'Une erreur est survenue lors du chargement des données'
    console.error('Erreur lors du chargement:', err)
    cards.value = []
    loading.value = false
  }
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-800 mb-2">Bienvenue</h1>
      </div>
    </div>

    <!-- Formulaire de création de page -->
    <CreatePageForm v-if="!loading" @page-created="handlePageCreated" />

    <!-- Filtres par genre -->
    <div v-if="!loading && !error && availableGenres.length > 0" class="mb-6">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-sm font-medium text-gray-700">Filtrer par genre :</span>
        <button @click="selectedGenre = null" :class="[
          'px-3 py-1 rounded-full text-sm font-medium transition-colors',
          selectedGenre === null
            ? 'bg-teal-700 text-white'
            : 'bg-teal-700 text-teal-700 hover:bg-teal-200'
        ]">
          Tous
        </button>
        <button v-for="genre in availableGenres" :key="genre" @click="toggleGenre(genre)" :class="[
          'px-3 py-1 rounded-full text-sm font-medium transition-colors',
          selectedGenre === genre
            ? 'bg-teal-200 text-white'
            : 'bg-teal-200 text-teal-700 hover:bg-teal-200'
        ]">
          {{ genre }}
        </button>
      </div>
    </div>

    <!-- Filtres par source -->
    <div v-if="!loading && !error && availableSources.length > 0" class="mb-6">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-sm font-medium text-gray-700">Filtrer par source :</span>
        <button @click="selectedSource = null" :class="[
          'px-3 py-1 rounded-full text-sm font-medium transition-colors',
          selectedSource === null
            ? 'bg-teal-700 text-white'
            : 'bg-teal-700 text-teal-700 hover:bg-teal-200'
        ]">
          Toutes
        </button>
        <button v-for="source in availableSources" :key="source" @click="toggleSource(source)"
          :data-source="getSourceDataValue(source)" :class="[
            'px-3 py-1 rounded-full text-sm font-medium transition-colors',
            selectedSource === source
              ? 'bg-teal-200 text-white'
              : 'bg-teal-200 text-teal-700 hover:bg-teal-200'
          ]">
          {{ source }}
        </button>
      </div>
    </div>
    <!-- Bouton de bascule vue grille/liste -->
    <div v-if="!loading && !error && cards.length > 0" class="flex justify-end items-center gap-2 mb-6">
      <button @click="toggleViewMode" class="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
        :title="viewMode === 'grid' ? 'Passer en vue liste' : 'Passer en vue grille'">
        <svg v-if="viewMode === 'grid'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      </button>
    </div>
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

    <!-- Vue grille -->
    <div v-else-if="filteredCards.length > 0 && viewMode === 'grid'"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      <CardGrid v-for="card in filteredCards" :key="card.id" :card="card" view-mode="grid" />
    </div>

    <!-- Vue liste -->
    <div v-else-if="filteredCards.length > 0 && viewMode === 'list'" class="space-y-2">
      <CardGrid v-for="card in filteredCards" :key="card.id" :card="card" view-mode="list" />
    </div>

    <!-- Message si aucune card -->
    <div v-else-if="cards.length === 0" class="text-center py-12 text-gray-500">
      <p>Aucune card disponible pour le moment.</p>
    </div>

    <!-- Message si aucun résultat avec le filtre -->
    <div v-else-if="(selectedGenre || selectedSource) && filteredCards.length === 0"
      class="text-center py-12 text-gray-500">
      <p v-if="selectedGenre && selectedSource">
        Aucune card trouvée pour le genre "{{ selectedGenre }}" et la source "{{ selectedSource }}".
      </p>
      <p v-else-if="selectedGenre">
        Aucune card trouvée pour le genre "{{ selectedGenre }}".
      </p>
      <p v-else-if="selectedSource">
        Aucune card trouvée pour la source "{{ selectedSource }}".
      </p>
      <button @click="selectedGenre = null; selectedSource = null"
        class="mt-4 text-blue-600 hover:text-blue-800 underline">
        Afficher tous les résultats
      </button>
    </div>

    <!-- Indicateur de rafraîchissement en arrière-plan -->
    <div v-if="isRefreshing"
      class="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      <span class="text-sm">Vérification des mises à jour...</span>
    </div>
  </div>
</template>
