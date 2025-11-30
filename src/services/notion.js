// Utilise le proxy backend pour éviter les problèmes CORS et protéger la clé API
const NOTION_API_BASE = '/api/notion'

/**
 * Nettoie l'ID d'une base de données (enlève les tirets)
 */
function cleanDatabaseId(id) {
  return id.replace(/-/g, '')
}

/**
 * Effectue une requête à l'API Notion via le proxy backend
 * Le proxy gère l'authentification côté serveur
 */
async function notionRequest(endpoint, options = {}) {
  // Nettoyer l'ID de la base de données si présent dans l'endpoint
  let cleanEndpoint = endpoint
  if (endpoint.includes('/databases/')) {
    cleanEndpoint = endpoint.replace(/\/databases\/([^/]+)/, (match, id) => {
      return `/databases/${cleanDatabaseId(id)}`
    })
  }

  const response = await fetch(`${NOTION_API_BASE}${cleanEndpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  // Vérifier si la réponse est du HTML au lieu de JSON (erreur serveur)
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('text/html')) {
    const text = await response.text()
    console.error('❌ Réponse HTML reçue au lieu de JSON:', text.substring(0, 500))
    throw new Error('Le serveur proxy ne fonctionne pas correctement. Vérifiez la configuration du serveur.')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }))
    throw new Error(error.message || `Erreur HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * Liste toutes les bases de données Notion accessibles
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
    console.error('Erreur lors de la récupération des bases de données:', error)
    throw error
  }
}

/**
 * Liste toutes les pages Notion accessibles
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
    console.error('Erreur lors de la récupération des pages:', error)
    throw error
  }
}

/**
 * Récupère les informations d'une base de données spécifique par son nom
 * La recherche est insensible à la casse
 */
async function getDatabaseByName(name) {
  const databases = await listAllNotionDatabases()
  return databases.find(db => db.title.toLowerCase() === name.toLowerCase())
}

/**
 * Extrait la valeur d'une propriété Notion
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
 * Récupère les pages récentes d'une base de données avec leurs données (limité)
 * Utilisez getAllPagesFromDatabase() pour récupérer toutes les pages
 */
export async function getDatabasePages(databaseId, limit = 10) {
  try {
    const queryData = await notionRequest(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify({
        page_size: limit,
        sorts: [
          {
            property: 'last_edited_time',
            direction: 'descending'
          }
        ]
      })
    })

    const pages = (queryData.results || [])
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
            if (value !== null) {
              pageData.properties[key] = {
                type: prop.type,
                value: value
              }
            }
          })
        }

        return pageData
      })

    return pages
  } catch (error) {
    console.warn(`Impossible de récupérer les pages pour ${databaseId}:`, error.message)
    return []
  }
}

/**
 * Récupère toutes les pages d'une base de données avec pagination
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
              if (value !== null) {
                pageData.properties[key] = {
                  type: prop.type,
                  value: value
                }
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
 * Récupère le nombre de pages dans une base de données
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
 * Récupère les informations d'une base de données pour créer une card
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
 * Transforme une page en card pour l'affichage
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
    databaseName: databaseInfo?.title || 'Base de données',
    databaseColor: databaseInfo?.color || '#6B7280'
  }

  // Extraire les propriétés de la page
  if (page.properties) {
    // Chercher "Titre" (insensible à la casse)
    for (const [key, prop] of Object.entries(page.properties)) {
      const keyLower = key.toLowerCase()

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
          card.genre = prop.value
          card.genreClass = serializeForClass(prop.value)
        } else if (prop.type === 'multi_select' && Array.isArray(prop.value) && prop.value.length > 0) {
          card.genre = prop.value[0] // Prendre le premier genre
          card.genreClass = serializeForClass(prop.value[0])
        }
      } else if (keyLower === 'source' && prop.value) {
        // Utiliser la propriété "source" comme URL
        if (prop.type === 'url' && typeof prop.value === 'string') {
          card.url = prop.value
        } else if (prop.type === 'rich_text' && typeof prop.value === 'string') {
          // Si c'est du rich_text, essayer de l'utiliser comme URL
          card.url = prop.value
        }
      } else if ((keyLower.includes('date') || keyLower.includes('ajout') || keyLower.includes('créé')) && prop.value) {
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

  return card
}

/**
 * Récupère les informations de plusieurs bases de données pour les cards
 * Retourne une card par page au lieu d'une card par base de données
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
 * Récupère les propriétés d'une base de données
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
 * Crée une page dans une base de données Notion
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

/**
 * Formate le titre d'une card pour l'affichage
 */
export function formatCardTitle(card) {
  if (!card) return ''

  // Si le titre contient "Calepin", on peut le formater différemment
  if (card.title && card.title.includes('Calepin')) {
    return card.title
  }

  return card.title || 'Sans titre'
}

