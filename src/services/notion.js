// Service backend utilisant le SDK Notion officiel
// La clé API est gérée côté serveur par le service backend (Express en dev, PHP en prod)
// Le service backend utilise @notionhq/client pour communiquer avec l'API Notion
const NOTION_API_BASE = '/api/notion'

/**
 * Nettoie l'ID d'une base de données en supprimant les tirets
 * @param {string} id - L'ID de la base de données avec ou sans tirets
 * @returns {string} L'ID nettoyé sans tirets
 * @private
 */
function cleanDatabaseId(id) {
  return id.replace(/-/g, '')
}

/**
 * Effectue une requête à l'API Notion via le service backend
 * Le service backend utilise le SDK Notion officiel (@notionhq/client)
 * L'authentification est gérée côté serveur (clé API stockée sur le serveur)
 * @param {string} endpoint - L'endpoint de l'API Notion (ex: '/search', '/databases/{id}')
 * @param {Object} options - Options de la requête fetch (method, body, headers, etc.)
 * @param {string} [options.method='GET'] - Méthode HTTP (GET, POST, PUT, DELETE, etc.)
 * @param {string} [options.body] - Corps de la requête (sera stringifié si objet)
 * @param {Object} [options.headers={}] - En-têtes HTTP supplémentaires
 * @returns {Promise<Object>} La réponse JSON de l'API Notion
 * @throws {Error} Si la requête échoue ou si la réponse n'est pas du JSON valide
 * @private
 */
async function notionRequest(endpoint, options = {}) {
  // Nettoyer l'ID de la base de données si présent dans l'endpoint
  let cleanEndpoint = endpoint
  if (endpoint.includes('/databases/')) {
    cleanEndpoint = endpoint.replace(/\/databases\/([^/]+)/, (match, id) => {
      return `/databases/${cleanDatabaseId(id)}`
    })
  }

  const isSearchEndpoint = cleanEndpoint === '/search'
  const fullUrl = `${NOTION_API_BASE}${cleanEndpoint}`

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  // Vérifier le Content-Type avant de lire le body
  const contentType = response.headers.get('content-type') || ''

  // Lire le body une seule fois (cloner la réponse si nécessaire pour les logs)
  let responseText = null
  let responseData = null

  // Si ce n'est pas OK, on va lire le body pour l'erreur
  if (!response.ok || contentType.includes('text/html')) {
    responseText = await response.text()

    // Vérifier si la réponse est du HTML au lieu de JSON
    if (contentType.includes('text/html')) {
      if (isSearchEndpoint) {
        console.error('❌ [API /search] Réponse HTML reçue au lieu de JSON')
        console.error('   Endpoint:', cleanEndpoint)
        console.error('   URL:', fullUrl)
        console.error('   Status:', response.status)
        console.error('   Content-Type:', contentType)
        console.error('   Contenu HTML (premiers 500 caractères):', responseText.substring(0, 500))
      } else {
        console.error('❌ Réponse HTML reçue au lieu de JSON:', responseText.substring(0, 500))
      }
      throw new Error('La réponse de l\'API Notion n\'est pas du JSON valide.')
    }
  }

  // Si la réponse n'est pas OK, parser l'erreur
  if (!response.ok) {
    let error
    try {
      error = JSON.parse(responseText)
    } catch {
      // Si le parsing JSON échoue, utiliser le texte brut
      if (isSearchEndpoint) {
        console.error('❌ [API /search] Erreur HTTP avec réponse non-JSON')
        console.error('   Endpoint:', cleanEndpoint)
        console.error('   Status:', response.status)
        console.error('   Contenu (premiers 500 caractères):', responseText?.substring(0, 500) || 'Aucun contenu')
      }
      error = { message: `HTTP ${response.status}` }
    }
    if (isSearchEndpoint) {
      console.error('❌ [API /search] Erreur HTTP:', response.status)
      console.error('   Endpoint:', cleanEndpoint)
      console.error('   Réponse:', JSON.stringify(error, null, 2))
    }
    throw new Error(error.message || `Erreur HTTP ${response.status}`)
  }

  // Si OK, parser le JSON
  try {
    // Si on a déjà lu le texte, le parser, sinon lire directement le JSON
    if (responseText) {
      responseData = JSON.parse(responseText)
    } else {
      responseData = await response.json()
    }
    return responseData
  } catch (parseError) {
    // Si le parsing échoue, lire le texte pour diagnostiquer (si pas déjà lu)
    if (!responseText) {
      responseText = await response.text()
    }
    if (isSearchEndpoint) {
      console.error('❌ [API /search] Erreur lors du parsing JSON')
      console.error('   Endpoint:', cleanEndpoint)
      console.error('   URL:', fullUrl)
      console.error('   Status:', response.status)
      console.error('   Content-Type:', contentType)
      console.error('   Erreur de parsing:', parseError.message)
      console.error('   Contenu reçu (premiers 500 caractères):', responseText.substring(0, 500))
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        console.error('   ⚠️  La réponse semble être du HTML au lieu de JSON')
      }
    } else {
      console.error('❌ Erreur lors du parsing JSON:', parseError.message)
      console.error('   Contenu reçu:', responseText.substring(0, 500))
    }
    throw new Error(`Erreur de parsing JSON: ${parseError.message}. La réponse du serveur n'est pas du JSON valide.`)
  }
}

/**
 * Liste toutes les bases de données Notion accessibles par l'intégration
 * @returns {Promise<Array<Object>>} Tableau d'objets représentant les bases de données
 * @returns {string} returns[].id - L'ID unique de la base de données
 * @returns {string} returns[].title - Le titre de la base de données
 * @returns {string|null} returns[].icon - L'emoji icône de la base de données
 * @returns {string} returns[].url - L'URL Notion de la base de données
 * @returns {Array<string>} returns[].properties - Liste des noms de propriétés
 * @returns {string} returns[].created_time - Date de création (ISO 8601)
 * @returns {string} returns[].last_edited_time - Date de dernière modification (ISO 8601)
 * @throws {Error} Si la requête vers l'API Notion échoue
 * @example
 * const databases = await listAllNotionDatabases()
 * console.log(`Trouvé ${databases.length} bases de données`)
 */
export async function listAllNotionDatabases() {
  try {
    const data = await notionRequest('/search', {
      method: 'POST',
      body: JSON.stringify({
        filter: {
          property: 'object',
          value: 'database'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      })
    })

    const databases = (data.results || []).map(db => ({
      id: db.id,
      title: db.title?.[0]?.plain_text || 'Sans titre',
      icon: db.icon?.emoji || null,
      url: db.url,
      properties: Object.keys(db.properties || {}),
      created_time: db.created_time,
      last_edited_time: db.last_edited_time
    }))

    return databases
  } catch (error) {
    console.error('❌ [API /search] Erreur lors de la récupération des bases de données:', error)
    console.error('   Endpoint: /search (filter: object=database)')
    console.error('   Message:', error.message)
    if (error.stack) {
      console.error('   Stack:', error.stack)
    }
    throw error
  }
}

/**
 * Liste toutes les pages Notion accessibles (non archivées) avec pagination automatique
 * @returns {Promise<Array<Object>>} Tableau d'objets représentant les pages
 * @returns {string} returns[].id - L'ID unique de la page
 * @returns {string} returns[].title - Le titre de la page
 * @returns {string|null} returns[].icon - L'icône de la page (emoji, URL fichier, ou URL externe)
 * @returns {string} returns[].url - L'URL Notion de la page
 * @returns {Object} returns[].parent - Informations sur le parent (type, id, etc.)
 * @returns {boolean} returns[].archived - Indique si la page est archivée
 * @returns {Object} returns[].properties - Objet contenant toutes les propriétés de la page
 * @returns {string} returns[].created_time - Date de création (ISO 8601)
 * @returns {string} returns[].last_edited_time - Date de dernière modification (ISO 8601)
 * @throws {Error} Si la requête vers l'API Notion échoue
 * @example
 * const pages = await listAllNotionPages()
 * console.log(`Trouvé ${pages.length} pages`)
 */
export async function listAllNotionPages() {
  try {
    let allPages = []
    let hasMore = true
    let nextCursor = null

    while (hasMore) {
      const requestBody = {
        filter: {
          property: 'object',
          value: 'page'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        },
        page_size: 100
      }

      if (nextCursor) {
        requestBody.start_cursor = nextCursor
      }

      const data = await notionRequest('/search', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const pages = (data.results || [])
        .filter(page => !page.archived)
        .map(page => {
          // Extraire le titre
          let title = 'Sans titre'
          if (page.properties) {
            // Chercher une propriété de type 'title'
            for (const prop of Object.values(page.properties)) {
              if (prop.type === 'title' && prop.title && prop.title.length > 0) {
                title = prop.title[0].plain_text || 'Sans titre'
                break
              }
            }
          }

          // Extraire les propriétés
          const properties = {}
          if (page.properties) {
            Object.entries(page.properties).forEach(([key, prop]) => {
              const value = extractPropertyValue(prop)
              if (value !== null) {
                properties[key] = {
                  type: prop.type,
                  value: value
                }
              }
            })
          }

          return {
            id: page.id,
            title: title,
            icon: page.icon?.emoji || page.icon?.file?.url || page.icon?.external?.url || null,
            url: page.url,
            parent: page.parent,
            archived: page.archived || false,
            properties: properties,
            created_time: page.created_time,
            last_edited_time: page.last_edited_time
          }
        })

      allPages = allPages.concat(pages)
      hasMore = data.has_more || false
      nextCursor = data.next_cursor || null
    }

    return allPages
  } catch (error) {
    console.error('❌ [API /search] Erreur lors de la récupération des pages:', error)
    console.error('   Endpoint: /search (filter: object=page)')
    console.error('   Message:', error.message)
    if (error.stack) {
      console.error('   Stack:', error.stack)
    }
    throw error
  }
}

/**
 * Récupère les informations d'une base de données spécifique par son nom
 * La recherche est insensible à la casse
 * @param {string} name - Le nom de la base de données à rechercher
 * @returns {Promise<Object|null>} L'objet base de données ou null si non trouvée
 * @private
 */
async function getDatabaseByName(name) {
  const databases = await listAllNotionDatabases()
  return databases.find(db => db.title.toLowerCase() === name.toLowerCase())
}

/**
 * Extrait la valeur d'une propriété Notion selon son type
 * @param {Object} property - L'objet propriété Notion
 * @param {string} property.type - Le type de la propriété (title, rich_text, number, etc.)
 * @returns {*} La valeur extraite selon le type de propriété
 * @returns {string|null} Pour title, rich_text, select, url, email, phone_number
 * @returns {number|null} Pour number
 * @returns {Array<string>} Pour multi_select
 * @returns {Object|null} Pour date (avec start et end)
 * @returns {boolean} Pour checkbox
 * @returns {number} Pour relation (nombre de relations)
 * @returns {null} Pour les types non supportés
 * @private
 */
function extractPropertyValue(property) {
  if (!property) return null

  switch (property.type) {
    case 'title':
      return property.title?.[0]?.plain_text || null
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text || null
    case 'number':
      return property.number !== null ? property.number : null
    case 'select':
      return property.select?.name || null
    case 'multi_select':
      return property.multi_select?.map(s => s.name) || []
    case 'date':
      if (property.date?.start) {
        return {
          start: property.date.start,
          end: property.date.end || null
        }
      }
      return null
    case 'checkbox':
      return property.checkbox || false
    case 'url':
      return property.url || null
    case 'email':
      return property.email || null
    case 'phone_number':
      return property.phone_number || null
    case 'relation':
      return property.relation?.length || 0
    default:
      return null
  }
}


/**
 * Récupère toutes les pages d'une base de données avec pagination automatique
 * @param {string} databaseId - L'ID de la base de données (avec ou sans tirets)
 * @returns {Promise<Array<Object>>} Tableau de pages avec leurs propriétés
 * @returns {string} returns[].id - L'ID de la page
 * @returns {string} returns[].url - L'URL Notion de la page
 * @returns {string} returns[].created_time - Date de création
 * @returns {string} returns[].last_edited_time - Date de dernière modification
 * @returns {Object} returns[].properties - Objet contenant toutes les propriétés extraites
 * @private
 */
async function getAllPagesFromDatabase(databaseId) {
  try {
    let allPages = []
    let hasMore = true
    let nextCursor = null

    while (hasMore) {
      const requestBody = {
        page_size: 100
      }

      if (nextCursor) {
        requestBody.start_cursor = nextCursor
      }

      const queryData = await notionRequest(`/databases/${databaseId}/query`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const results = queryData.results || []
      // Filtrer les pages archivées et extraire leurs données
      const activePages = results
        .filter(page => !page.archived)
        .map(page => {
          const pageData = {
            id: page.id,
            url: page.url,
            created_time: page.created_time,
            last_edited_time: page.last_edited_time,
            properties: {}
          }

          // Extraire toutes les propriétés de la page
          if (page.properties) {
            Object.entries(page.properties).forEach(([key, prop]) => {
              const value = extractPropertyValue(prop)
              // Inclure toutes les propriétés, même si la valeur est null
              // Cela permet d'inclure les propriétés vides comme rich_text
              pageData.properties[key] = {
                type: prop.type,
                value: value !== null ? value : (prop.type === 'checkbox' ? false : null)
              }
            })
          }

          return pageData
        })

      allPages = allPages.concat(activePages)
      hasMore = queryData.has_more || false
      nextCursor = queryData.next_cursor || null
    }

    return allPages
  } catch (error) {
    console.warn(`Impossible de récupérer toutes les pages pour ${databaseId}:`, error.message)
    return []
  }
}

/**
 * Récupère uniquement les métadonnées d'une base de données (sans les pages)
 * @param {string} databaseName - Le nom de la base de données
 * @returns {Promise<Object|null>} Les métadonnées ou null si non trouvée
 * @returns {string} returns.id - L'ID de la base de données
 * @returns {number} returns.pageCount - Le nombre de pages dans la base
 * @returns {string} returns.lastEditedTime - Date de dernière modification
 * @private
 */
async function getDatabaseMetadata(databaseName) {
  try {
    const database = await getDatabaseByName(databaseName)
    if (!database) {
      return null
    }

    const pageCount = await getDatabasePageCount(database.id)

    return {
      id: database.id,
      pageCount: pageCount,
      lastEditedTime: database.last_edited_time
    }
  } catch (error) {
    console.error(`Erreur lors de la récupération des métadonnées de "${databaseName}":`, error)
    return null
  }
}

/**
 * Récupère les métadonnées de toutes les bases de données cibles
 * Les bases de données cibles sont définies dans le code : 'Calepin musique' et 'Calepin web'
 * @returns {Promise<Object>} Objet avec les IDs de bases de données comme clés
 * @returns {Object} returns[databaseId] - Métadonnées de la base de données
 * @returns {string} returns[databaseId].id - L'ID de la base de données
 * @returns {number} returns[databaseId].pageCount - Le nombre de pages
 * @returns {string} returns[databaseId].lastEditedTime - Date de dernière modification
 * @example
 * const metadata = await getDatabasesMetadata()
 * console.log(Object.keys(metadata)) // ['id1', 'id2', ...]
 */
export async function getDatabasesMetadata() {
  try {
    const targetDatabases = ['Calepin musique', 'Calepin web']
    const metadata = {}

    for (const dbName of targetDatabases) {
      const meta = await getDatabaseMetadata(dbName)
      if (meta) {
        metadata[meta.id] = meta
      }
    }

    return metadata
  } catch (error) {
    console.error('Erreur lors de la récupération des métadonnées:', error)
    return {}
  }
}

/**
 * Récupère le nombre de pages non archivées dans une base de données
 * Limite la pagination à 1000 pages pour éviter trop de requêtes
 * @param {string} databaseId - L'ID de la base de données
 * @returns {Promise<number>} Le nombre de pages (maximum 1000)
 * @private
 */
async function getDatabasePageCount(databaseId) {
  try {
    let pageCount = 0
    let hasMore = true
    let nextCursor = null

    while (hasMore) {
      const requestBody = {
        page_size: 100
      }

      if (nextCursor) {
        requestBody.start_cursor = nextCursor
      }

      const queryData = await notionRequest(`/databases/${databaseId}/query`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const results = queryData.results || []
      // Compter uniquement les pages non archivées
      pageCount += results.filter(page => !page.archived).length
      hasMore = queryData.has_more || false
      nextCursor = queryData.next_cursor || null

      // Limiter à 1000 pages pour éviter trop de requêtes
      if (pageCount >= 1000) {
        break
      }
    }

    return pageCount
  } catch (error) {
    console.warn(`Impossible de compter les pages pour ${databaseId}:`, error.message)
    return 0
  }
}

/**
 * Récupère les informations complètes d'une base de données pour créer une card
 * Inclut les métadonnées, toutes les pages, et les informations de style
 * @param {string} databaseName - Le nom de la base de données
 * @returns {Promise<Object|null>} Les informations de la base de données ou null si non trouvée
 * @returns {string} returns.id - L'ID de la base de données
 * @returns {string} returns.title - Le titre de la base de données
 * @returns {string} returns.displayName - Le nom d'affichage formaté
 * @returns {string} returns.description - La description de la base de données
 * @returns {string|null} returns.icon - L'emoji icône
 * @returns {string} returns.color - La classe CSS de couleur
 * @returns {string} returns.headerColor - La couleur d'en-tête (RGB ou CSS variable)
 * @returns {string} returns.url - L'URL Notion
 * @returns {string} returns.databaseId - L'ID de la base de données
 * @returns {number} returns.pageCount - Le nombre de pages
 * @returns {number} returns.propertiesCount - Le nombre de propriétés
 * @returns {string} returns.lastEdited - Date formatée en français
 * @returns {string} returns.createdTime - Date de création (ISO 8601)
 * @returns {string} returns.lastEditedTime - Date de modification (ISO 8601)
 * @returns {Array<Object>} returns.pages - Toutes les pages avec leurs données
 * @returns {Array<string>} returns.properties - Liste des noms de propriétés
 * @private
 */
async function getDatabaseCardInfo(databaseName) {
  try {
    const database = await getDatabaseByName(databaseName)

    if (!database) {
      console.warn(`Base de données "${databaseName}" non trouvée`)
      return null
    }

    // Récupérer les détails complets de la base de données
    const dbDetails = await notionRequest(`/databases/${database.id}`)

    // Extraire la description si elle existe
    let description = ''
    const properties = dbDetails.properties || {}

    // Chercher une propriété de type "rich_text" qui pourrait servir de description
    // ou utiliser le nom d'une propriété qui pourrait contenir une description
    const descriptionKeys = ['Description', 'description', 'Résumé', 'résumé', 'Note', 'note']
    for (const key of descriptionKeys) {
      if (properties[key] && properties[key].type === 'rich_text') {
        const richText = properties[key].rich_text
        if (richText && richText.length > 0) {
          description = richText[0].plain_text || ''
          break
        }
      }
    }

    // Si pas de description trouvée, chercher dans toutes les propriétés rich_text
    if (!description) {
      for (const prop of Object.values(properties)) {
        if (prop.type === 'rich_text' && prop.rich_text && prop.rich_text.length > 0) {
          const text = prop.rich_text[0].plain_text || ''
          if (text.length > 20) { // Prendre une propriété avec du contenu significatif
            description = text
            break
          }
        }
      }
    }

    // Récupérer le nombre de pages dans la base de données
    const pageCount = await getDatabasePageCount(database.id)

    // Récupérer toutes les pages avec leurs données (sans limite pour avoir toutes les données)
    const allPages = await getAllPagesFromDatabase(database.id)

    // Si pas de description trouvée, utiliser un texte par défaut
    if (!description) {
      if (databaseName.includes('Musique')) {
        description = 'Explorez votre collection musicale et organisez vos références.'
      } else if (databaseName.includes('Web')) {
        description = 'Gérez vos projets web et vos ressources de développement.'
      } else {
        description = `Base de données ${databaseName} - Accédez à toutes vos données organisées.`
      }
    }

    // Définir une couleur et une icône par défaut selon le nom
    let color = 'bg-gray-600'
    let headerColor = '#6B7280' // Gris par défaut
    let displayName = databaseName
    let icon = database.icon?.emoji || null

    if (databaseName.toLowerCase().includes('musique')) {
      headerColor = 'rgb(255 222 98)' // Rouge-brun pour Musique
      color = 'bg-[#8B4513]'
      displayName = 'Musique'
    } else if (databaseName.toLowerCase().includes('web')) {
      headerColor = 'rgb(39 150 231)' // Jaune-vert pour Web
      color = 'bg-[#9ACD32]'
      displayName = 'Web'
    } else {
      headerColor = 'var(--highlight-color)'
      color = 'var(--highlight-color)'
    }

    // Formater la date de dernière modification
    const lastEdited = new Date(database.last_edited_time)
    const formattedDate = lastEdited.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    return {
      id: database.id,
      title: database.title,
      displayName: displayName,
      description: description,
      icon: icon,
      color: color,
      headerColor: headerColor,
      url: database.url,
      databaseId: database.id,
      pageCount: pageCount,
      propertiesCount: Object.keys(properties).length,
      lastEdited: formattedDate,
      createdTime: database.created_time,
      lastEditedTime: database.last_edited_time,
      pages: allPages, // Toutes les pages avec leurs données
      properties: Object.keys(properties) // Liste des noms de propriétés
    }
  } catch (error) {
    console.error(`Erreur lors de la récupération de "${databaseName}":`, error)
    return null
  }
}

/**
 * Sériealise une valeur pour l'utiliser comme classe CSS
 * Normalise les accents, remplace les espaces par des tirets, supprime les caractères spéciaux
 * @param {string} value - La valeur à sérialiser
 * @returns {string} La valeur sérialisée pour une classe CSS
 * @private
 * @example
 * serializeForClass('Jazz & Blues') // 'jazz-blues'
 */
function serializeForClass(value) {
  if (!value || typeof value !== 'string') return ''
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD') // Normalise les caractères accentués
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/\s+/g, '-') // Remplace les espaces par des tirets
    .replace(/[^a-z0-9-]/g, '') // Supprime les caractères spéciaux
    .replace(/-+/g, '-') // Remplace plusieurs tirets consécutifs par un seul
    .replace(/^-|-$/g, '') // Supprime les tirets en début/fin
}

/**
 * Transforme une page Notion en objet card pour l'affichage
 * Extrait les propriétés spécifiques (titre, artiste, genre, date, source/URL)
 * @param {Object} page - L'objet page Notion avec ses propriétés
 * @param {Object} [databaseInfo=null] - Informations sur la base de données parente
 * @param {string} [databaseInfo.title] - Le titre de la base de données
 * @param {string} [databaseInfo.color] - La couleur de la base de données
 * @returns {Object} L'objet card formaté
 * @returns {string} returns.id - L'ID de la page
 * @returns {string} returns.url - L'URL de la page (ou de la source)
 * @returns {string|null} returns.titre - Le titre extrait
 * @returns {string|null} returns.artiste - L'artiste extrait
 * @returns {Array<string>|null} returns.genre - Le ou les genres extraits (tableau)
 * @returns {string|null} returns.genreClass - La classe CSS du genre
 * @returns {string|null} returns.dateAjoute - La date formatée (JJ/MM/AAAA)
 * @returns {string} returns.databaseName - Le nom de la base de données
 * @returns {string} returns.databaseColor - La couleur de la base de données
 * @private
 */
function transformPageToCard(page, databaseInfo = null) {
  const card = {
    id: page.id,
    url: page.url, // URL par défaut (fallback)
    titre: null,
    artiste: null,
    genre: null,
    genreClass: null, // Classe CSS formatée pour le genre
    dateAjoute: null,
    like: false, // Propriété "like" (checkbox)
    note: null,
    databaseName: databaseInfo?.title || 'Base de données',
    databaseColor: databaseInfo?.color || '#6B7280'
  }

  // Extraire les propriétés de la page
  if (page.properties) {
    // Debug: afficher toutes les propriétés pour voir si "Note" existe
    if (!window._debugNoteShown) {
      console.log('🔍 Toutes les propriétés disponibles:', Object.keys(page.properties))
      console.log('🔍 Détails des propriétés:', Object.entries(page.properties).map(([key, prop]) => ({
        key,
        type: prop.type,
        value: prop.value
      })))
      window._debugNoteShown = true
    }

    // Chercher "Titre" (insensible à la casse)
    for (const [key, prop] of Object.entries(page.properties)) {
      const keyLower = key.toLowerCase()

      // Debug: vérifier spécifiquement "Note"
      if (keyLower.includes('note')) {
        console.log('✅ Propriété contenant "note" trouvée:', { key, type: prop.type, value: prop.value, cardTitre: card.titre || card.id })
      }

      if (keyLower === 'titre' && prop.type === 'title' && prop.value) {
        card.titre = prop.value
      } else if (keyLower === 'artiste' && prop.value) {
        if (prop.type === 'rich_text' || prop.type === 'title') {
          card.artiste = typeof prop.value === 'string' ? prop.value : null
        } else if (prop.type === 'select') {
          card.artiste = prop.value
        }
      } else if (keyLower === 'genre' && prop.value) {
        if (prop.type === 'select') {
          // Si c'est un select simple, créer un tableau avec une seule valeur
          card.genre = [prop.value]
          card.genreClass = serializeForClass(prop.value)
        } else if (prop.type === 'multi_select' && Array.isArray(prop.value) && prop.value.length > 0) {
          // Si c'est un multi_select, garder tous les genres dans un tableau
          card.genre = prop.value
          card.genreClass = serializeForClass(prop.value[0]) // Utiliser le premier pour la classe CSS principale
        }
      } else if (keyLower === 'source' && prop.value) {
        // Utiliser la propriété "source" comme URL
        if (prop.type === 'url' && typeof prop.value === 'string') {
          card.url = prop.value
        } else if (prop.type === 'rich_text' && typeof prop.value === 'string') {
          // Si c'est du rich_text, essayer de l'utiliser comme URL
          card.url = prop.value
        }
      } else if (keyLower === 'note' && prop.type === 'rich_text') {
        // Extraire la propriété "note" (rich_text)
        // Vérifier d'abord si la propriété existe et a une valeur
        if (prop.value && typeof prop.value === 'string' && prop.value.trim() !== '') {
          card.note = prop.value
          console.log('📝 Note extraite pour', card.titre || card.id + ':', card.note)
        } else {
          console.log('⚠️ Note trouvée mais vide pour', card.titre || card.id + ':', { value: prop.value, type: typeof prop.value })
        }
      }
      else if (keyLower === 'like' && prop.type === 'checkbox') {
        // Extraire la propriété "like" (checkbox)
        // prop.value est déjà un booléen (true/false) grâce à extractPropertyValue
        // On extrait même si la valeur est false
        card.like = prop.value === true || prop.value === 'true'
      }
      else if ((keyLower.includes('date') || keyLower.includes('ajout') || keyLower.includes('créé')) && prop.value) {
        if (prop.type === 'date' && prop.value.start) {
          const date = new Date(prop.value.start)
          card.dateAjoute = date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        }
      }
    }

    // Si pas de titre trouvé, chercher la première propriété title
    if (!card.titre) {
      for (const prop of Object.values(page.properties)) {
        if (prop.type === 'title' && prop.value) {
          card.titre = prop.value
          break
        }
      }
    }

    // Si pas de date trouvée, utiliser created_time
    if (!card.dateAjoute && page.created_time) {
      const date = new Date(page.created_time)
      card.dateAjoute = date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }
  }

  // Si pas de titre, utiliser "Sans titre"
  if (!card.titre) {
    card.titre = 'Sans titre'
  }

  // S'assurer que like est toujours défini (booléen)
  if (card.like === undefined || card.like === null) {
    card.like = false
  }

  return card
}

/**
 * Récupère les informations de plusieurs bases de données et retourne une card par page
 * Les bases de données cibles sont : 'Calepin musique' et 'Calepin web'
 * @returns {Promise<Array<Object>>} Tableau de cards, une par page
 * @returns {string} returns[].id - L'ID de la page
 * @returns {string} returns[].url - L'URL de la page
 * @returns {string|null} returns[].titre - Le titre de la page
 * @returns {string|null} returns[].artiste - L'artiste (si applicable)
 * @returns {string|null} returns[].genre - Le genre (si applicable)
 * @returns {string|null} returns[].genreClass - La classe CSS du genre
 * @returns {string|null} returns[].dateAjoute - La date d'ajout formatée
 * @returns {string} returns[].databaseName - Le nom de la base de données
 * @returns {string} returns[].databaseColor - La couleur de la base de données
 * @throws {Error} Si la récupération des données échoue
 * @example
 * const cards = await fetchMultipleNotionDatabases()
 * console.log(`Récupéré ${cards.length} cards`)
 */
export async function fetchMultipleNotionDatabases() {
  try {
    const targetDatabases = ['Calepin musique', 'Calepin web']
    const allCards = []

    for (const dbName of targetDatabases) {
      const cardInfo = await getDatabaseCardInfo(dbName)
      if (cardInfo && cardInfo.pages && cardInfo.pages.length > 0) {
        // Préparer les informations de la base de données parente
        const databaseInfo = {
          title: cardInfo.displayName || cardInfo.title,
          color: cardInfo.headerColor || cardInfo.color
        }

        // Transformer chaque page en card avec les infos de la base de données
        for (const page of cardInfo.pages) {
          const pageCard = transformPageToCard(page, databaseInfo)
          allCards.push(pageCard)
        }
      }
    }

    return allCards
  } catch (error) {
    console.error('Erreur lors de la récupération des cards:', error)
    throw error
  }
}

/**
 * Récupère les propriétés d'une base de données avec leurs options pour select/multi_select
 * @param {string} databaseId - L'ID de la base de données (avec ou sans tirets)
 * @returns {Promise<Object>} Les propriétés de la base de données
 * @returns {string} returns.id - L'ID de la base de données
 * @returns {string} returns.title - Le titre de la base de données
 * @returns {Object} returns.properties - Objet avec les propriétés comme clés
 * @returns {string} returns.properties[].type - Le type de la propriété
 * @returns {Array|null} returns.properties[].options - Les options pour select/multi_select
 * @throws {Error} Si la récupération échoue
 * @example
 * const props = await getDatabaseProperties('abc-123-def')
 * console.log(props.properties) // { Titre: { type: 'title', options: null }, ... }
 */
export async function getDatabaseProperties(databaseId) {
  try {
    const cleanId = cleanDatabaseId(databaseId)
    const dbDetails = await notionRequest(`/databases/${cleanId}`)

    // Extraire les options pour les propriétés select et multi_select
    const properties = {}
    for (const [key, prop] of Object.entries(dbDetails.properties || {})) {
      properties[key] = {
        type: prop.type,
        options: null
      }

      if (prop.type === 'select' && prop.select?.options) {
        properties[key].options = prop.select.options
      } else if (prop.type === 'multi_select' && prop.multi_select?.options) {
        properties[key].options = prop.multi_select.options
      }
    }

    return {
      id: dbDetails.id,
      title: dbDetails.title?.[0]?.plain_text || 'Sans titre',
      properties: properties
    }
  } catch (error) {
    console.error(`Erreur lors de la récupération des propriétés de la base de données:`, error)
    throw error
  }
}

/**
 * Crée une nouvelle page dans une base de données Notion
 * @param {string} databaseId - L'ID de la base de données (avec ou sans tirets)
 * @param {Object} properties - Les propriétés de la page au format Notion API
 * @returns {Promise<Object>} La réponse de l'API Notion avec les détails de la page créée
 * @throws {Error} Si la création échoue
 * @example
 * await createPageInDatabase('abc-123', {
 *   Titre: { title: [{ text: { content: 'Ma page' } }] },
 *   Artiste: { rich_text: [{ text: { content: 'Mon artiste' } }] }
 * })
 */
export async function createPageInDatabase(databaseId, properties) {
  try {
    const cleanId = cleanDatabaseId(databaseId)

    const response = await notionRequest(`/pages`, {
      method: 'POST',
      body: JSON.stringify({
        parent: {
          database_id: cleanId
        },
        properties: properties
      })
    })

    return response
  } catch (error) {
    console.error('Erreur lors de la création de la page:', error)
    throw error
  }
}



