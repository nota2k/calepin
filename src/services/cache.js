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

  if (!cachedMetadata) {
    console.log('📊 Pas de métadonnées en cache, changement détecté')
    return true
  }

  // Comparer les métadonnées de chaque base de données
  for (const [dbId, currentMeta] of Object.entries(currentMetadata)) {
    const cachedMeta = cachedMetadata[dbId]

    if (!cachedMeta) {
      console.log(`📊 Nouvelle base de données détectée: ${dbId}, changement détecté`)
      return true // Nouvelle base de données
    }

    // Vérifier si le nombre de pages a changé
    if (currentMeta.pageCount !== cachedMeta.pageCount) {
      console.log(`📊 Nombre de pages changé pour ${dbId}: ${cachedMeta.pageCount} → ${currentMeta.pageCount}`)
      return true
    }

    // Vérifier si la date de modification de la base de données est plus récente
    const currentDate = new Date(currentMeta.lastEditedTime)
    const cachedDate = new Date(cachedMeta.lastEditedTime)
    if (currentDate > cachedDate) {
      console.log(`📊 Date de modification de la DB changée pour ${dbId}: ${cachedMeta.lastEditedTime} → ${currentMeta.lastEditedTime}`)
      return true
    }

    // Vérifier si le last_edited_time le plus récent des pages a changé
    // Cela détecte les modifications de pages individuelles même si la DB n'a pas changé
    if (currentMeta.latestPageEditTime && cachedMeta.latestPageEditTime) {
      const currentPageDate = new Date(currentMeta.latestPageEditTime)
      const cachedPageDate = new Date(cachedMeta.latestPageEditTime)
      if (currentPageDate > cachedPageDate) {
        console.log(`📊 Date de modification de page changée pour ${dbId}: ${cachedMeta.latestPageEditTime} → ${currentMeta.latestPageEditTime}`)
        return true
      }
    } else if (currentMeta.latestPageEditTime && !cachedMeta.latestPageEditTime) {
      // Si on a maintenant latestPageEditTime mais pas avant, c'est un changement
      console.log(`📊 Nouvelle détection de modification de page pour ${dbId}`)
      return true
    }
  }

  // Vérifier aussi si une base de données a été supprimée
  for (const dbId of Object.keys(cachedMetadata)) {
    if (!currentMetadata[dbId]) {
      console.log(`📊 Base de données supprimée: ${dbId}, changement détecté`)
      return true
    }
  }

  console.log('📊 Aucun changement détecté dans les métadonnées')
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

