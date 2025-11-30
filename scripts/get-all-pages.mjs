/* eslint-env node */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Charger les variables d'environnement depuis .env
const envPath = join(__dirname, '..', '.env')
let envVars = {}
try {
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      envVars[key] = value
    }
  })
} catch (err) {
  console.error('⚠️  Fichier .env non trouvé:', err.message)
  process.exit(1)
}

const NOTION_API_BASE = 'https://api.notion.com/v1'
const secret = envVars.VITE_NOTION_SECRET

if (!secret) {
  console.error('❌ VITE_NOTION_SECRET non trouvé dans .env')
  console.error('💡 Ajoutez votre clé API Notion dans le fichier .env')
  process.exit(1)
}

// Options de ligne de commande
const exportJson = process.argv.includes('--json') || process.argv.includes('-j')
const outputFile = process.argv.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'all-pages.json'
const limitPerDb = process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1]
const maxPages = limitPerDb ? parseInt(limitPerDb) : null

/**
 * Nettoie l'ID d'une base de données (enlève les tirets)
 */
function cleanDatabaseId(id) {
  return id.replace(/-/g, '')
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
 * Récupère toutes les pages d'une base de données
 */
async function getAllPagesFromDatabase(databaseId, databaseTitle) {
  const cleanId = cleanDatabaseId(databaseId)
  let allPages = []
  let hasMore = true
  let nextCursor = null
  let pageCount = 0

  console.log(`\n📄 Récupération des pages de "${databaseTitle}"...`)

  while (hasMore) {
    const requestBody = {
      page_size: 100
    }

    if (nextCursor) {
      requestBody.start_cursor = nextCursor
    }

    try {
      const response = await fetch(`${NOTION_API_BASE}/databases/${cleanId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secret}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      const queryData = await response.json()
      const results = queryData.results || []

      // Filtrer les pages archivées
      const activePages = results.filter(page => !page.archived)

      // Traiter chaque page
      for (const page of activePages) {
        const pageData = {
          id: page.id,
          url: page.url,
          created_time: page.created_time,
          last_edited_time: page.last_edited_time,
          archived: page.archived,
          properties: {}
        }

        // Extraire toutes les propriétés
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

        allPages.push(pageData)
        pageCount++

        // Limiter le nombre de pages si spécifié
        if (maxPages && pageCount >= maxPages) {
          hasMore = false
          break
        }
      }

      hasMore = queryData.has_more || false
      nextCursor = queryData.next_cursor || null

      if (hasMore && (!maxPages || pageCount < maxPages)) {
        console.log(`   ${pageCount} page(s) récupérée(s)...`)
      }
    } catch (error) {
      console.error(`   ❌ Erreur lors de la récupération: ${error.message}`)
      break
    }
  }

  console.log(`   ✅ ${pageCount} page(s) récupérée(s) au total`)
  return allPages
}

/**
 * Fonction principale
 */
async function getAllPages() {
  try {
    console.log('\n🔍 Récupération de toutes les pages de toutes les bases de données...\n')
    console.log('='.repeat(80))

    // 1. Lister toutes les bases de données
    console.log('\n📊 Récupération de la liste des bases de données...')
    let dbResponse
    try {
      dbResponse = await fetch(`${NOTION_API_BASE}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secret}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
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
    } catch (error) {
      console.error('❌ [API /search] Erreur lors de l\'appel fetch:', error)
      console.error('   Endpoint: /search (filter: object=database)')
      console.error('   Message:', error.message)
      throw error
    }

    if (!dbResponse.ok) {
      const error = await dbResponse.json().catch(() => ({ message: `HTTP ${dbResponse.status}` }))
      console.error('❌ [API /search] Erreur HTTP:', dbResponse.status)
      console.error('   Endpoint: /search (filter: object=database)')
      console.error('   Réponse:', JSON.stringify(error, null, 2))
      throw new Error(error.message || `HTTP ${dbResponse.status}`)
    }

    const dbData = await dbResponse.json()
    const databases = dbData.results || []

    if (databases.length === 0) {
      console.log('   Aucune base de données trouvée.\n')
      return
    }

    console.log(`   ✅ ${databases.length} base(s) de données trouvée(s)\n`)

    // 2. Récupérer toutes les pages de chaque base de données
    const allData = {
      retrieved_at: new Date().toISOString(),
      total_databases: databases.length,
      databases: []
    }

    for (const db of databases) {
      const dbTitle = db.title?.[0]?.plain_text || 'Sans titre'
      const dbIcon = db.icon?.emoji || '📊'

      const pages = await getAllPagesFromDatabase(db.id, dbTitle)

      allData.databases.push({
        id: db.id,
        title: dbTitle,
        icon: dbIcon,
        url: db.url,
        properties: Object.keys(db.properties || {}),
        page_count: pages.length,
        pages: pages
      })
    }

    // 3. Afficher le résumé
    console.log('\n' + '='.repeat(80))
    console.log('\n📊 RÉSUMÉ:\n')

    let totalPages = 0
    allData.databases.forEach((db, index) => {
      console.log(`${index + 1}. ${db.icon} ${db.title}`)
      console.log(`   ID: ${db.id}`)
      console.log(`   Pages: ${db.page_count}`)
      console.log(`   Propriétés: ${db.properties.length}`)
      totalPages += db.page_count
      console.log('')
    })

    console.log(`\n✅ Total: ${totalPages} page(s) récupérée(s) depuis ${databases.length} base(s) de données\n`)

    // 4. Exporter en JSON si demandé
    if (exportJson) {
      const outputPath = join(__dirname, '..', outputFile)
      writeFileSync(outputPath, JSON.stringify(allData, null, 2), 'utf-8')
      console.log(`💾 Données exportées dans: ${outputFile}\n`)
    } else {
      console.log('💡 Astuce: Utilisez --json pour exporter toutes les données en JSON')
      console.log('   Exemple: node scripts/get-all-pages.mjs --json\n')
    }

  } catch (error) {
    console.error('\n❌ Erreur:', error.message)
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      console.error('💡 Vérifiez que votre clé API Notion est valide dans le fichier .env')
    }
    process.exit(1)
  }
}

// Afficher l'aide si demandé
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
📖 Utilisation: node scripts/get-all-pages.mjs [options]

Options:
  --json, -j              Exporter toutes les données en JSON
  --output=<fichier>      Spécifier le nom du fichier de sortie (défaut: all-pages.json)
  --limit=<nombre>        Limiter le nombre de pages par base de données
  --help, -h              Afficher cette aide

Exemples:
  node scripts/get-all-pages.mjs
  node scripts/get-all-pages.mjs --json
  node scripts/get-all-pages.mjs --json --output=mes-pages.json
  node scripts/get-all-pages.mjs --limit=10
  node scripts/get-all-pages.mjs --json --limit=50
`)
  process.exit(0)
}

getAllPages()

