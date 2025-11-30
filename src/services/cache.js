const CACHE_KEY = 'notion_cards_cache'
const CACHE_METADATA_KEY = 'notion_cache_metadata'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 heures en millisecondes

/**
 * Récupère les cards en cache depuis le localStorage
 * Vérifie automatiquement si le cache est expiré (24 heures)
 * @returns {Array<Object>|null} Les cards en cache ou null si expiré/inexistant
 * @example
 * const cached = getCachedCards()
 * if (cached) {
 *   console.log(`Cache valide avec ${cached.length} cards`)
 * }
 */
export function getCachedCards() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const data = JSON.parse(cached)
    const now = Date.now()

    // Vérifier si le cache est expiré
    if (now - data.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY)
      localStorage.removeItem(CACHE_METADATA_KEY)
      return null
    }

    return data.cards
  } catch (error) {
    console.error('Erreur lors de la récupération du cache:', error)
    return null
  }
}

/**
 * Sauvegarde les cards en cache dans le localStorage avec un timestamp
 * @param {Array<Object>} cards - Le tableau de cards à sauvegarder
 * @example
 * setCachedCards([{ id: '1', titre: 'Ma card' }, ...])
 */
export function setCachedCards(cards) {
  try {
    const data = {
      cards,
      timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du cache:', error)
  }
}

/**
 * Récupère les métadonnées des bases de données en cache
 * @returns {Object|null} Les métadonnées en cache ou null si inexistant
 * @returns {Object} returns[databaseId] - Métadonnées d'une base de données
 * @returns {number} returns[databaseId].pageCount - Nombre de pages
 * @returns {string} returns[databaseId].lastEditedTime - Date de modification
 * @example
 * const metadata = getCachedMetadata()
 * if (metadata) {
 *   console.log('Métadonnées en cache:', Object.keys(metadata))
 * }
 */
export function getCachedMetadata() {
  try {
    const cached = localStorage.getItem(CACHE_METADATA_KEY)
    return cached ? JSON.parse(cached) : null
  } catch (error) {
    console.error('Erreur lors de la récupération des métadonnées:', error)
    return null
  }
}

/**
 * Sauvegarde les métadonnées des bases de données dans le localStorage
 * @param {Object} metadata - Les métadonnées à sauvegarder (clé = databaseId)
 * @example
 * setCachedMetadata({
 *   'abc-123': { pageCount: 10, lastEditedTime: '2024-01-01T00:00:00Z' }
 * })
 */
export function setCachedMetadata(metadata) {
  try {
    localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata))
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des métadonnées:', error)
  }
}

/**
 * Vérifie si les bases de données ont été modifiées en comparant avec le cache
 * @param {Object} currentMetadata - Les métadonnées actuelles à comparer
 * @param {Object} currentMetadata[databaseId] - Métadonnées d'une base de données
 * @param {number} currentMetadata[databaseId].pageCount - Nombre de pages actuel
 * @param {string} currentMetadata[databaseId].lastEditedTime - Date de modification actuelle
 * @returns {boolean} true si des changements ont été détectés, false sinon
 * @example
 * const metadata = await getDatabasesMetadata()
 * if (hasDatabasesChanged(metadata)) {
 *   console.log('Des changements détectés, rechargement nécessaire')
 * }
 */
export function hasDatabasesChanged(currentMetadata) {
  const cachedMetadata = getCachedMetadata()

  if (!cachedMetadata) return true

  // Comparer les métadonnées de chaque base de données
  for (const [dbId, currentMeta] of Object.entries(currentMetadata)) {
    const cachedMeta = cachedMetadata[dbId]

    if (!cachedMeta) return true // Nouvelle base de données

    // Vérifier si le nombre de pages a changé ou si la date de modification est plus récente
    if (
      currentMeta.pageCount !== cachedMeta.pageCount ||
      new Date(currentMeta.lastEditedTime) > new Date(cachedMeta.lastEditedTime)
    ) {
      return true
    }
  }

  return false
}

/**
 * Nettoie complètement le cache (cards et métadonnées)
 * @example
 * clearCache() // Supprime tout le cache
 */
export function clearCache() {
  localStorage.removeItem(CACHE_KEY)
  localStorage.removeItem(CACHE_METADATA_KEY)
}

