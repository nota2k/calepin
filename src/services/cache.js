const CACHE_KEY = 'notion_cards_cache'
const CACHE_METADATA_KEY = 'notion_cache_metadata'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 heures en millisecondes

/**
 * Récupère les données en cache
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
 * Sauvegarde les cards en cache
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
 * Sauvegarde les métadonnées des bases de données
 */
export function setCachedMetadata(metadata) {
  try {
    localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata))
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des métadonnées:', error)
  }
}

/**
 * Vérifie si les bases de données ont été modifiées
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
 * Nettoie le cache
 */
export function clearCache() {
  localStorage.removeItem(CACHE_KEY)
  localStorage.removeItem(CACHE_METADATA_KEY)
}

