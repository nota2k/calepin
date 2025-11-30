<script setup>
defineProps({
  card: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <a :href="card.url" target="_blank" rel="noopener noreferrer"
    class="bg-gray-100 rounded-b-lg overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col min-h-[200px] group">
    <!-- Header avec le nom de la base de données -->
    <div class="database flex items-center justify-between text-white py-3 px-4 font-medium"
      :style="{ backgroundColor: card.databaseColor }">
      <span class="text-slate-700 font-semibold">{{ card.databaseName }}</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="lucide lucide-circle-play-icon lucide-circle-play">
        <path d="M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    </div>

    <!-- Corps de la card -->
    <div class="p-6 flex flex-col justify-between flex-1">
      <div class="flex-1">
        <!-- Titre -->
        <div class="flex items-baseline justify-start gap-2 border-b border-slate-400 pb-1 mb-4">
          <h3 class="text-xl font-normal text-black mb-2 text-slate-500">{{ card.titre }}<strong v-if="card.artiste"
              class="text-xl font-bold text-black mb-3 text-slate-700"> - {{
                card.artiste }}</strong></h3>

          <!-- Artiste (si disponible) -->

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
</template>
