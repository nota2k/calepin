<script setup>
import { computed } from 'vue'

const props = defineProps({
  card: {
    type: Object,
    required: true
  }
})

const sourceDisplay = computed(() => {
  if (!props.card.url) {
    return { text: props.card.databaseId, dataValue: null }
  }
  const urlLower = props.card.url.toLowerCase()
  if (urlLower.includes('youtube')) {
    return { text: 'YouTube', dataValue: 'youtube' }
  }
  if (urlLower.includes('plex')) {
    return { text: 'Plex', dataValue: 'plex' }
  }
  return { text: props.card.databaseId, dataValue: null }
})
</script>

<template>
  <a :href="card.url" target="_blank" rel="noopener noreferrer"
    class="overflow-hidden hover:shadow-lg transition-all duration-300 flex items-center gap-10 p-4 group border-gray-900 border-b-1">
    <!-- Header avec le nom de la base de données (vertical) -->
    <div class="flex-shrink-0 w-32 py-4 px-3 font-medium rounded-lg text-center flex flex-col gap-2">
      <span class="text-slate-700 font-semibold text-sm highlight"
        :style="{ '--highlight-color': card.databaseColor }">{{ card.databaseName }}</span>
    </div>

    <!-- Contenu principal -->
    <div class="flex-1 flex items-center justify-between gap-4">
      <div class="flex-1 min-w-0">
        <!-- Titre et Artiste -->
        <div class="flex items-baseline gap-2 mb-2">
          <h3 class="text-lg font-normal text-black text-slate-500 truncate">{{ card.titre }}</h3>
          <p v-if="card.artiste" class="text-lg font-bold text-black text-slate-700 whitespace-nowrap"> - {{
            card.artiste }}</p>
        </div>

        <!-- Genre et Date -->
        <div class="flex items-center gap-4">
          <span v-if="card.genre" :class="[
            'inline-block bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium',
            card.genreClass ? `${card.genreClass}` : ''
          ]">
            {{ card.genre }}
          </span>
          <p v-if="card.dateAjoute" class="text-sm font-normal text-gray-600">
            Ajouté le : {{ card.dateAjoute }}
          </p>
        </div>
      </div>

      <!-- Icône de lien -->
      <span v-if="sourceDisplay.text" class="text-xs text-slate-500 font-normal source"
        :data-source="sourceDisplay.dataValue">{{ sourceDisplay.text }}</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="flex-shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
      </svg>
    </div>
  </a>
</template>
