<script setup>

const props = defineProps({
  genres: {
    type: Array,
    default: () => []
  },
  sources: {
    type: Array,
    default: () => []
  },
  selectedGenre: {
    type: String,
    default: null
  },
  selectedSource: {
    type: String,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:selectedGenre', 'update:selectedSource'])

// Fonction helper pour obtenir la valeur data-source d'une source
function getSourceDataValue(source) {
  if (!source) return null
  if (source === 'YouTube') return 'youtube'
  if (source === 'Plex') return 'plex'
  return null
}

function toggleGenre(genre) {
  if (props.selectedGenre === genre) {
    // Désélectionner si déjà sélectionné
    emit('update:selectedGenre', null)
  } else {
    // Sélectionner le genre
    emit('update:selectedGenre', genre)
  }
}

function toggleSource(source) {
  if (props.selectedSource === source) {
    // Désélectionner si déjà sélectionné
    emit('update:selectedSource', null)
  } else {
    // Sélectionner la source
    emit('update:selectedSource', source)
  }
}
</script>

<template>
  <div v-if="!loading && !error">
    <!-- Filtres par genre -->
    <div v-if="genres.length > 0" class="mb-6">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-sm font-medium text-gray-700"></span>
        <button @click="emit('update:selectedGenre', null)" :class="[
          'px-3 py-1 rounded-full text-sm font-medium transition-colors',
          selectedGenre === null
            ? 'bg-teal-700 text-white'
            : 'bg-teal-700 text-teal-700 hover:bg-teal-200'
        ]">
          Tous
        </button>
        <button v-for="genre in genres" :key="genre" @click="toggleGenre(genre)" :class="[
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
    <div v-if="sources.length > 0" class="mb-6">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-sm font-medium text-gray-700"></span>
        <button @click="emit('update:selectedSource', null)" :class="[
          'px-3 py-1 rounded-full text-sm font-medium transition-colors',
          selectedSource === null
            ? 'bg-teal-700 text-white'
            : 'bg-teal-700 text-teal-700 hover:bg-teal-200'
        ]">
          Toutes
        </button>
        <button v-for="source in sources" :key="source" @click="toggleSource(source)"
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
  </div>
</template>
