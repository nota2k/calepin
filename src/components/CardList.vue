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
      <svg v-if="card.databaseName === 'Musique'" xmlns="http://www.w3.org/2000/svg" width="20" height="20"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round"
        class="flex-shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors lucide lucide-circle-play-icon lucide-circle-play">
        <path d="M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z" />
        <circle cx="12" cy="12" r="10" />
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="flex-shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors lucide lucide-link-icon lucide-link">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    </div>
  </a>
</template>
