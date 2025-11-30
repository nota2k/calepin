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
    class="hover:shadow-lg transition-all duration-300 flex flex-col min-h-[100px] group border border-gray-900 border-1">
    <!-- Header avec le nom de la base de données -->
    <div class="database flex items-center justify-between pb-1 py-4 px-4 font-medium">
      <span class="text-slate-700 font-semibold highlight text-3xl"
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
    <div class="p-3 flex flex-col justify-between flex-1 infos">
      <div class="flex-1 ">
        <!-- Titre -->
        <div class="flex items-baseline justify-start gap-2 border-b-2 border-gray-500 mb-4">
          <h3 class="text-3xl font-normal text-black mb-2 text-slate-500">{{ card.titre }}<strong v-if="card.artiste"
              class="text-3xl font-bold text-black mb-3 text-slate-700"> - {{
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
      <div class="flex items-center justify-between like">
        <!-- SVG rempli si like est true -->
        <svg v-if="card.like === true" width="15" height="13" viewBox="0 0 15 13" fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M6.9254 1.19665C6.16559 0.433249 5.13371 0.0028267 4.05663 1.3873e-05C2.97956 -0.00279895 1.94544 0.422228 1.18165 1.18165C0.422228 1.94544 -0.00279895 2.97956 1.3873e-05 4.05663C0.0028267 5.13371 0.433249 6.16559 1.19665 6.9254L7.0804 12.8104C7.19761 12.9276 7.35655 12.9934 7.52228 12.9934C7.68801 12.9934 7.84695 12.9276 7.96415 12.8104L13.8179 6.9604C14.5769 6.19666 15.0017 5.16282 14.9989 4.08605C14.9961 3.00928 14.5659 1.97767 13.8029 1.2179C13.4265 0.838778 12.9791 0.537605 12.4862 0.331625C11.9933 0.125646 11.4646 0.0189044 10.9304 0.0175111C10.3962 0.0161178 9.86694 0.1201 9.37296 0.323506C8.87899 0.526912 8.42999 0.825746 8.05165 1.2029L7.4929 1.7629L6.9254 1.19665Z"
            fill="black" />
        </svg>

        <!-- SVG avec stroke si like est false -->
        <svg v-else width="15" height="13" viewBox="0 0 15 13" fill="#fff" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4.05566 0.5C5.00006 0.502555 5.90507 0.880439 6.57129 1.5498L6.57227 1.55078L7.13965 2.11719L7.49414 2.46973L7.84668 2.11621L8.4043 1.55664C8.73607 1.2259 9.1303 0.964503 9.56348 0.786133C9.99653 0.607813 10.4604 0.516406 10.9287 0.517578C11.397 0.5188 11.8608 0.612442 12.293 0.792969C12.7252 0.973597 13.1182 1.23785 13.4482 1.57031L13.4502 1.57227C14.1192 2.23841 14.4964 3.14286 14.499 4.08691C14.5015 5.03043 14.1295 5.93685 13.4648 6.60645L7.61035 12.457C7.58698 12.4803 7.55541 12.4931 7.52246 12.4932C7.48931 12.4932 7.45703 12.4805 7.43359 12.457L1.5498 6.57227V6.57129L1.42773 6.44336C0.834595 5.79153 0.502396 4.94113 0.5 4.05566C0.497536 3.11209 0.869467 2.20573 1.53418 1.53613C2.20396 0.8702 3.11117 0.497533 4.05566 0.5Z"
            stroke="black" />
        </svg>


      </div>

      <!-- Date en bas à droite -->
      <div class="mt-4 text-right ">
        <p v-if="card.dateAjoute" class="text-lg font-normal text-black">
          Ajouté le : {{ card.dateAjoute }}
        </p>
      </div>
    </div>
  </a>
</template>
