<script setup>
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { listAllNotionDatabases, getDatabaseProperties, createPageInDatabase } from '@/services/notion'
import TomSelect from 'tom-select'
import 'tom-select/dist/css/tom-select.css'

const databases = ref([])
const selectedDatabaseId = ref('')
const formData = ref({})
const loading = ref(false)
const submitting = ref(false)
const error = ref(null)
const success = ref(false)
const tomSelectInstances = ref(new Map())

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

const focusInHandler = (event) => {
  const target = event.target
  if (target && target.tagName && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
    if (!target.control) {
      Object.defineProperty(target, 'control', {
        get: () => target,
        configurable: true,
        enumerable: false
      })
    }
  }
}

onMounted(async () => {
  try {
    loading.value = true
    databases.value = await listAllNotionDatabases()

    // Ajouter un gestionnaire d'événements global pour protéger les champs au focus
    document.addEventListener('focusin', focusInHandler, true) // Utiliser capture phase pour intercepter avant les extensions
  } catch (err) {
    error.value = 'Impossible de charger les bases de données'
    console.error(err)
  } finally {
    loading.value = false
  }
})

// Watcher pour protéger les champs quand ils sont ajoutés au DOM
watch(formFields, async () => {
  await nextTick()
  await nextTick()
  setTimeout(() => {
    protectAllFormFieldsFromExtensions()
  }, 100)
}, { deep: true })

watch(selectedDatabaseId, async (newId) => {
  if (!newId) {
    databaseProperties.value = {}
    formData.value = {}
    // Détruire toutes les instances TomSelect
    tomSelectInstances.value.forEach(instance => {
      if (instance && instance.destroy) {
        instance.destroy()
      }
    })
    tomSelectInstances.value.clear()
    return
  }

  try {
    loading.value = true

    // Détruire toutes les instances TomSelect existantes avant de charger une nouvelle base
    tomSelectInstances.value.forEach(instance => {
      if (instance && instance.destroy) {
        instance.destroy()
      }
    })
    tomSelectInstances.value.clear()

    databaseProperties.value = await getDatabaseProperties(newId)

    // Initialiser les champs du formulaire selon leur type
    formData.value = {}
    const properties = databaseProperties.value.properties || {}
    Object.entries(properties).forEach(([key, prop]) => {
      if (prop.type === 'multi_select') {
        formData.value[key] = []
      } else if (prop.type === 'checkbox') {
        formData.value[key] = false
      } else if (prop.type === 'select' && key.toLowerCase() === 'genre') {
        // Le champ genre avec TomSelect stocke un tableau pour permettre la sélection multiple
        formData.value[key] = []
      } else {
        formData.value[key] = ''
      }
    })

    // Initialiser TomSelect pour le champ genre après le rendu
    await nextTick()
    await nextTick() // Double nextTick pour s'assurer que le DOM est complètement rendu
    // Petit délai pour garantir que le DOM est complètement prêt
    setTimeout(() => {
      protectAllFormFieldsFromExtensions()
      initializeTomSelectForGenre()
    }, 150)
  } catch (err) {
    error.value = 'Impossible de charger les propriétés de la base de données'
    console.error(err)
  } finally {
    loading.value = false
  }
})

function protectAllFormFieldsFromExtensions() {
  // Protéger tous les champs du formulaire contre les erreurs des extensions de navigateur
  formFields.value.forEach(field => {
    const element = document.getElementById(field.key)
    if (element && !element.control) {
      Object.defineProperty(element, 'control', {
        get: () => element,
        configurable: true,
        enumerable: false
      })
    }

    // Pour les champs checkbox, protéger aussi le label associé
    if (field.type === 'checkbox') {
      const checkbox = document.getElementById(field.key)
      if (checkbox && !checkbox.control) {
        Object.defineProperty(checkbox, 'control', {
          get: () => checkbox,
          configurable: true,
          enumerable: false
        })
      }
    }

    // Pour les champs multi_select avec checkboxes, protéger chaque checkbox
    if (field.type === 'multi_select' && field.options) {
      field.options.forEach(option => {
        const checkboxId = `${field.key}-${option.name}`
        const checkbox = document.getElementById(checkboxId)
        if (checkbox && !checkbox.control) {
          Object.defineProperty(checkbox, 'control', {
            get: () => checkbox,
            configurable: true,
            enumerable: false
          })
        }
      })
    }
  })
}

async function initializeTomSelectForGenre() {
  await nextTick()

  // Trouver le champ genre (peut être select ou multi_select)
  const genreField = formFields.value.find(
    field => field.name.toLowerCase() === 'genre' && (field.type === 'select' || field.type === 'multi_select')
  )

  if (!genreField) return

  const inputElement = document.getElementById(genreField.key)
  if (!inputElement) {
    // Retry après un court délai si l'élément n'est pas encore dans le DOM
    setTimeout(() => initializeTomSelectForGenre(), 50)
    return
  }

  // Ajouter des propriétés pour éviter les erreurs des extensions de navigateur
  if (!inputElement.control) {
    Object.defineProperty(inputElement, 'control', {
      get: () => inputElement,
      configurable: true,
      enumerable: false
    })
  }

  // Détruire l'instance existante si elle existe dans la Map
  if (tomSelectInstances.value.has(genreField.key)) {
    const existingInstance = tomSelectInstances.value.get(genreField.key)
    if (existingInstance && existingInstance.destroy) {
      existingInstance.destroy()
    }
    tomSelectInstances.value.delete(genreField.key)
  }

  // Vérifier si TomSelect est déjà initialisé sur cet élément (double vérification)
  if (inputElement.tomselect) {
    inputElement.tomselect.destroy()
    inputElement.tomselect = null
  }

  // Préparer les options existantes
  const options = genreField.options ? genreField.options.map(opt => ({
    value: opt.name,
    text: opt.name
  })) : []

  try {
    // S'assurer que formData est un tableau
    if (!Array.isArray(formData.value[genreField.key])) {
      formData.value[genreField.key] = formData.value[genreField.key] ? [formData.value[genreField.key]] : []
    }

    // Initialiser TomSelect avec sélection multiple
    const tomSelectInstance = new TomSelect(`#${genreField.key}`, {
      options: options,
      items: formData.value[genreField.key] || [],
      create: true, // Permet de créer de nouvelles options
      createOnBlur: true, // Crée l'option lorsqu'on quitte le champ
      delimiter: '|', // Utiliser | comme délimiteur pour éviter les conflits avec les virgules dans les valeurs
      maxItems: null, // Permettre plusieurs sélections
      createFilter: (input) => {
        // Filtrer pour éviter les doublons (insensible à la casse)
        const normalizedInput = input.trim().toLowerCase()
        if (!normalizedInput) return false
        return !options.some(opt => opt.value.toLowerCase() === normalizedInput)
      },
      plugins: ['clear_button'],
      placeholder: 'Rechercher ou créer un genre...',
      onItemAdd: (value) => {
        // Ajouter la valeur au tableau
        if (!Array.isArray(formData.value[genreField.key])) {
          formData.value[genreField.key] = []
        }
        if (!formData.value[genreField.key].includes(value)) {
          formData.value[genreField.key].push(value)
        }
      },
      onItemRemove: (value) => {
        // Retirer la valeur du tableau
        if (Array.isArray(formData.value[genreField.key])) {
          formData.value[genreField.key] = formData.value[genreField.key].filter(v => v !== value)
        }
      },
      onChange: (value) => {
        // Mettre à jour avec le tableau de valeurs
        formData.value[genreField.key] = value ? (Array.isArray(value) ? value : value.split('|').filter(v => v.trim())) : []
      }
    })

    tomSelectInstances.value.set(genreField.key, tomSelectInstance)

    // Ajouter une protection après l'initialisation pour éviter les erreurs des extensions
    const wrapper = inputElement.closest('.ts-wrapper')
    if (wrapper) {
      const actualInput = wrapper.querySelector('input[type="text"]')
      if (actualInput && !actualInput.control) {
        Object.defineProperty(actualInput, 'control', {
          get: () => actualInput,
          configurable: true,
          enumerable: false
        })
      }
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de TomSelect:', error)
  }
}

onBeforeUnmount(() => {
  // Détruire toutes les instances TomSelect lors du démontage
  tomSelectInstances.value.forEach(instance => {
    if (instance && instance.destroy) {
      instance.destroy()
    }
  })
  tomSelectInstances.value.clear()

  // Retirer le gestionnaire d'événements global
  document.removeEventListener('focusin', focusInHandler, true)
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
      // Ignorer les valeurs vides
      if (!value) continue
      if (typeof value === 'string' && !value.trim()) continue
      if (Array.isArray(value) && value.length === 0) continue

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
          if (value) {
            // Pour un champ select, prendre la première valeur (même si c'est un tableau)
            // Notion ne permet qu'une seule valeur pour un champ select
            let selectValue = Array.isArray(value) ? value[0] : value
            if (selectValue) {
              // Notion permet de créer de nouvelles options à la volée en envoyant simplement le nom
              properties[key] = {
                select: { name: selectValue }
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

          <!-- Champ select pour genre avec TomSelect -->
          <input
            v-else-if="(field.type === 'select' || field.type === 'multi_select') && field.options && field.name.toLowerCase() === 'genre'"
            :id="field.key" type="text" autocomplete="new-password" data-lpignore="true" data-1p-ignore="true"
            data-form-type="other"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :value="formData[field.key] || ''" placeholder="Rechercher ou créer un genre..." />

          <!-- Champ select standard pour autres champs -->
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
