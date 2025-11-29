<script setup>
// Données des cards
const cards = [
  {
    id: 1,
    title: 'Card 1',
    description: 'Description de la première card avec du contenu intéressant et informatif.',
    icon: '📝',
    color: 'bg-blue-500'
  },
  {
    id: 2,
    title: 'Card 2',
    description: 'Description de la deuxième card avec du contenu intéressant et informatif.',
    icon: '📊',
    color: 'bg-green-500'
  },
  {
    id: 3,
    title: 'Card 3',
    description: 'Description de la troisième card avec du contenu intéressant et informatif.',
    icon: '🎨',
    color: 'bg-purple-500'
  },
  {
    id: 4,
    title: 'Card 4',
    description: 'Description de la quatrième card avec du contenu intéressant et informatif.',
    icon: '🚀',
    color: 'bg-orange-500'
  },
  {
    id: 5,
    title: 'Card 5',
    description: 'Description de la cinquième card avec du contenu intéressant et informatif.',
    icon: '💡',
    color: 'bg-red-500'
  },
  {
    id: 6,
    title: 'Card 6',
    description: 'Description de la sixième card avec du contenu intéressant et informatif.',
    icon: '⭐',
    color: 'bg-yellow-500'
  }
]
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold text-gray-800 mb-2">Bienvenue</h1>
    <p class="text-gray-600 mb-8">Découvrez nos fonctionnalités</p>

    <!-- Grille de cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div
        v-for="card in cards"
        :key="card.id"
        class="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden group cursor-pointer"
      >
        <div :class="[card.color, 'h-32 flex items-center justify-center']">
          <span class="text-6xl transform group-hover:scale-110 transition-transform duration-300">
            {{ card.icon }}
          </span>
        </div>
        <div class="p-6">
          <h3 class="text-xl font-semibold text-gray-800 mb-2">{{ card.title }}</h3>
          <p class="text-gray-600 text-sm leading-relaxed">{{ card.description }}</p>
          <button class="mt-4 text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center group-hover:translate-x-1 transition-transform duration-300">
            En savoir plus
            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
