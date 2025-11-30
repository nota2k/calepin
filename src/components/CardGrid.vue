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
    class="overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col min-h-[100px] group border border-gray-900 border-1">
    <!-- Header avec le nom de la base de données -->
    <div class="database flex items-center justify-between py-4 px-4 font-medium">
      <span class="text-xl text-slate-700 font-semibold highlight text-2xl"
        :style="{ '--highlight-color': card.databaseColor }">{{
          card.databaseName }}</span>
      <div class="flex items-center gap-2">
        <span v-if="sourceDisplay.text" class="text-sm text-slate-500 font-normal source"
          :data-source="sourceDisplay.dataValue">{{ sourceDisplay.text }}</span>
        <svg v-if="card.databaseName === 'Musique'" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" class="lucide lucide-circle-play-icon lucide-circle-play">
          <path d="M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z" />
          <circle cx="12" cy="12" r="10" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          class="lucide lucide-link-icon lucide-link">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </div>
    </div>

    <!-- Corps de la card -->
    <div class="p-2 flex flex-col justify-between flex-1">
      <div class="flex-1">
        <!-- Titre -->
        <div class="flex items-baseline justify-start gap-2 border-b border-slate-400 mb-3">
          <h3 class="text-3xl font-normal text-black mb-2 text-slate-500">{{ card.titre }}<strong v-if="card.artiste"
              class="text-xl font-bold text-black mb-3 text-slate-700"> - {{
                card.artiste }}</strong></h3>

          <!-- Artiste (si disponible) -->

        </div>
        <!-- Genres (tags rouges) -->
        <div v-if="card.genre && Array.isArray(card.genre) && card.genre.length > 0" class="flex flex-wrap gap-2">
          <span v-for="(genre, index) in card.genre" :key="index" :class="[
            'inline-block bg-teal-200 px-3 py-1 rounded-full text-lg font-medium genre-tag',
            card.genreClass ? `${card.genreClass}` : ''
          ]">
            {{ genre }}
          </span>
        </div>
        <span v-else-if="card.genre && !Array.isArray(card.genre)" :class="[
          'inline-block bg-red-500 text-white px-3 py-1 rounded-full text-lg font-medium genre-tag',
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
</template>
