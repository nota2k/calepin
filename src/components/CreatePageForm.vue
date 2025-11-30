<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { listAllNotionDatabases, getDatabaseProperties, createPageInDatabase } from '@/services/notion'

const databases = ref([])
const selectedDatabaseId = ref('')
const formData = ref({})
const loading = ref(false)
const submitting = ref(false)
const error = ref(null)
const success = ref(false)

const selectedDatabase = computed(() => {
  return databases.value.find(db => db.id === selectedDatabaseId.value)
})

const databaseProperties = ref({})

const formFields = computed(() => {
  if (!selectedDatabase.value || !databaseProperties.value) return []

  const properties = databaseProperties.value.properties || {}
  const fields = Object.entries(properties).map(([key, prop]) => ({
    key,
    name: key,
    type: prop.type,
    options: prop.options || null
  }))

  // Trier pour mettre "titre" en premier, puis "artiste"
  return fields.sort((a, b) => {
    const aName = a.name.toLowerCase()
    const bName = b.name.toLowerCase()

    if (aName === 'titre') return -1
    if (bName === 'titre') return 1
    if (aName === 'artiste') return -1
    if (bName === 'artiste') return 1
    return 0
  })
})

onMounted(async () => {
  try {
    loading.value = true
    databases.value = await listAllNotionDatabases()
  } catch (err) {
    error.value = 'Impossible de charger les bases de données'
    console.error(err)
  } finally {
    loading.value = false
  }
})

watch(selectedDatabaseId, async (newId) => {
  if (!newId) {
    databaseProperties.value = {}
    formData.value = {}
    return
  }

  try {
    loading.value = true
    databaseProperties.value = await getDatabaseProperties(newId)

    // Initialiser les champs du formulaire selon leur type
    formData.value = {}
    const properties = databaseProperties.value.properties || {}
    Object.entries(properties).forEach(([key, prop]) => {
      if (prop.type === 'multi_select') {
        formData.value[key] = []
      } else if (prop.type === 'checkbox') {
        formData.value[key] = false
      } else {
        formData.value[key] = ''
      }
    })
  } catch (err) {
    error.value = 'Impossible de charger les propriétés de la base de données'
    console.error(err)
  } finally {
    loading.value = false
  }
})


async function handleSubmit() {
  if (!selectedDatabaseId.value) {
    error.value = 'Veuillez sélectionner une base de données'
    return
  }

  try {
    submitting.value = true
    error.value = null
    success.value = false

    // Préparer les propriétés pour l'API Notion
    const properties = {}

    for (const [key, value] of Object.entries(formData.value)) {
      if (!value || (typeof value === 'string' && !value.trim())) continue

      const field = formFields.value.find(f => f.key === key)
      if (!field) continue

      const prop = databaseProperties.value.properties[key]
      if (!prop) continue

      switch (prop.type) {
        case 'title':
          properties[key] = {
            title: [{ text: { content: value } }]
          }
          break
        case 'rich_text':
          properties[key] = {
            rich_text: [{ text: { content: value } }]
          }
          break
        case 'number':
          properties[key] = {
            number: parseFloat(value) || 0
          }
          break
        case 'select':
          if (value && prop.options) {
            const option = prop.options.find(opt => opt.name === value)
            if (option) {
              properties[key] = {
                select: { name: value }
              }
            }
          }
          break
        case 'multi_select':
          if (Array.isArray(value) && value.length > 0) {
            properties[key] = {
              multi_select: value.map(v => ({ name: v }))
            }
          }
          break
        case 'date':
          if (value) {
            properties[key] = {
              date: { start: value }
            }
          }
          break
        case 'checkbox':
          properties[key] = {
            checkbox: Boolean(value)
          }
          break
        case 'url':
          if (value) {
            properties[key] = {
              url: value
            }
          }
          break
        case 'email':
          if (value) {
            properties[key] = {
              email: value
            }
          }
          break
        case 'phone_number':
          if (value) {
            properties[key] = {
              phone_number: value
            }
          }
          break
      }
    }

    await createPageInDatabase(selectedDatabaseId.value, properties)

    success.value = true

    // Émettre un événement pour rafraîchir les cards
    emit('page-created')

    // Réinitialiser le formulaire après un court délai
    setTimeout(() => {
      formData.value = {}
      selectedDatabaseId.value = ''
      databaseProperties.value = {}
      success.value = false
    }, 2000)
  } catch (err) {
    error.value = err.message || 'Erreur lors de la création de la page'
    console.error(err)
  } finally {
    submitting.value = false
  }
}

const emit = defineEmits(['page-created'])
</script>

<template>
  <div class="p-6 mb-8">
    <h2 class="text-2xl font-bold text-gray-800 mb-4">Créer une nouvelle entrée</h2>

    <!-- Message de succès -->
    <div v-if="success" class="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
      <div class="flex items-center">
        <svg class="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <p class="text-green-800 font-medium">Page créée avec succès !</p>
      </div>
    </div>

    <!-- Message d'erreur -->
    <div v-if="error" class="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-800">{{ error }}</p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4" autocomplete="off">
      <!-- Sélection de la base de données -->
      <div>
        <label for="database" class="block text-sm font-medium text-gray-700 mb-2">
          Base de données
        </label>
        <select id="database" v-model="selectedDatabaseId" :disabled="loading" autocomplete="off"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-w-2/4">
          <option value="">Sélectionnez une base de données</option>
          <option v-for="db in databases" :key="db.id" :value="db.id">{{ db.title }}
          </option>
        </select>
      </div>

      <!-- Chargement des propriétés -->
      <div v-if="loading && selectedDatabaseId" class="text-center py-4">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        <p class="text-sm text-gray-500 mt-2">Chargement des propriétés...</p>
      </div>

      <!-- Champs dynamiques selon la base de données -->
      <div v-if="selectedDatabaseId && !loading && formFields.length > 0"
        class="border-t pt-4 flex items-center justify-between flex-wrap gap-2">
        <div v-for="field in formFields" :key="field.key" :class="[
          'space-y-2',
          (field.name.toLowerCase() === 'artiste' || field.name.toLowerCase() === 'titre') ? 'w-full' : 'grow-2 min-w-2/54'
        ]">
          <label :for="field.key" class="block text-sm font-medium text-gray-700">
            {{ field.name }}
          </label>

          <!-- Champ titre -->
          <input v-if="field.type === 'title'" :id="field.key" v-model="formData[field.key]" type="text"
            :required="field.type === 'title'" autocomplete="off" data-lpignore="true"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :placeholder="`Entrez ${field.name.toLowerCase()}`" />

          <!-- Champ texte riche -->
          <input type="text" v-else-if="field.type === 'rich_text'" :id="field.key" v-model="formData[field.key]"
            autocomplete="off" data-lpignore="true"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :placeholder="`Entrez ${field.name.toLowerCase()}`" />

          <!-- Champ nombre -->
          <input v-else-if="field.type === 'number'" :id="field.key" v-model="formData[field.key]" type="number"
            autocomplete="off" data-lpignore="true"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :placeholder="`Entrez ${field.name.toLowerCase()}`" />

          <!-- Champ select -->
          <select v-else-if="field.type === 'select' && field.options" :id="field.key" v-model="formData[field.key]"
            autocomplete="off" data-lpignore="true"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="">Sélectionnez une option</option>
            <option v-for="option in field.options" :key="option.name" :value="option.name">
              {{ option.name }}
            </option>
          </select>

          <!-- Champ multi-select -->
          <div v-else-if="field.type === 'multi_select' && field.options" class="space-y-2">
            <div v-for="option in field.options" :key="option.name" class="flex items-center">
              <input :id="`${field.key}-${option.name}`" type="checkbox" :value="option.name"
                v-model="formData[field.key]" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <label :for="`${field.key}-${option.name}`" class="ml-2 text-sm text-gray-700">
                {{ option.name }}
              </label>
            </div>
          </div>

          <!-- Champ date -->
          <input v-else-if="field.type === 'date'" :id="field.key" v-model="formData[field.key]" type="date"
            autocomplete="off" data-lpignore="true"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-w-{50%}" />

          <!-- Champ checkbox -->
          <div v-else-if="field.type === 'checkbox'" class="flex items-center">
            <input :id="field.key" v-model="formData[field.key]" type="checkbox"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label :for="field.key" class="ml-2 text-sm text-gray-700">
              {{ field.name }}
            </label>
          </div>

          <!-- Champ URL -->
          <input v-else-if="field.type === 'url'" :id="field.key" v-model="formData[field.key]" type="url"
            autocomplete="off" data-lpignore="true"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-w-2/4"
            placeholder="https://..." />

          <!-- Champ email -->
          <input v-else-if="field.type === 'email'" :id="field.key" v-model="formData[field.key]" type="email"
            autocomplete="off" data-lpignore="true"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-w-2/4"
            placeholder="email@example.com" />

          <!-- Champ téléphone -->
          <input v-else-if="field.type === 'phone_number'" :id="field.key" v-model="formData[field.key]" type="tel"
            autocomplete="off" data-lpignore="true"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-w-2/4"
            placeholder="+33 1 23 45 67 89" />

          <!-- Champ texte par défaut -->
          <input v-else :id="field.key" v-model="formData[field.key]" type="text" autocomplete="off"
            data-lpignore="true"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-w-2/4"
            :placeholder="`Entrez ${field.name.toLowerCase()}`" />
        </div>
      </div>

      <!-- Message si aucune propriété -->
      <div v-if="selectedDatabaseId && !loading && formFields.length === 0" class="text-center py-4 text-gray-500">
        <p>Aucune propriété configurable pour cette base de données.</p>
      </div>

      <!-- Bouton de soumission -->
      <div class="flex justify-end pt-4 border-t">
        <button type="submit" :disabled="!selectedDatabaseId || submitting || loading"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
          <span v-if="submitting" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
          <span>{{ submitting ? 'Création...' : 'Créer l\'entrée' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>
