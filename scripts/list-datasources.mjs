import { readFileSync } from 'fs'
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
  process.exit(1)
}

async function listDatasources() {
  try {
    console.log('\n🔍 Recherche des datasources Notion...\n')
    console.log('='.repeat(80))

    // 1. Lister toutes les bases de données
    console.log('\n📊 BASES DE DONNÉES:\n')

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
    } else {
      console.log(`   ✅ ${databases.length} base(s) de données trouvée(s)\n`)

      for (const [index, db] of databases.entries()) {
        const title = db.title?.[0]?.plain_text || 'Sans titre'
        const properties = Object.keys(db.properties || {})

        console.log(`   ${index + 1}. ${db.icon?.emoji || '📊'} ${title}`)
        console.log(`      ID: ${db.id}`)
        console.log(`      URL: ${db.url}`)
        console.log(`      Propriétés: ${properties.length} (${properties.slice(0, 5).join(', ')}${properties.length > 5 ? '...' : ''})`)
        console.log(`      Créée: ${new Date(db.created_time).toLocaleString('fr-FR')}`)
        console.log(`      Modifiée: ${new Date(db.last_edited_time).toLocaleString('fr-FR')}`)

        // Compter le nombre de pages dans cette base de données
        try {
          const queryResponse = await fetch(`${NOTION_API_BASE}/databases/${db.id.replace(/-/g, '')}/query`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${secret}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              page_size: 1
            })
          })

          if (queryResponse.ok) {
            const queryData = await queryResponse.json()
            // Pour obtenir le vrai total, il faudrait paginer, mais on peut au moins voir s'il y en a
            if (queryData.has_more || queryData.results.length > 0) {
              console.log(`      📄 Contient des pages (au moins ${queryData.results.length})`)
            } else {
              console.log(`      📄 Vide (aucune page)`)
            }
          }
        } catch {
          // Ignorer les erreurs de comptage
        }

        console.log('')
      }
    }

    // 2. Lister les pages autonomes (qui pourraient servir de datasources)
    console.log('\n' + '='.repeat(80))
    console.log('\n📄 PAGES AUTONOMES (potentielles datasources):\n')

    let pagesResponse
    try {
      pagesResponse = await fetch(`${NOTION_API_BASE}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secret}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter: {
            property: 'object',
            value: 'page'
          },
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time'
          },
          page_size: 20 // Limiter à 20 pour l'affichage
        })
      })
    } catch (error) {
      console.error('❌ [API /search] Erreur lors de l\'appel fetch:', error)
      console.error('   Endpoint: /search (filter: object=page)')
      console.error('   Message:', error.message)
      throw error
    }

    if (!pagesResponse.ok) {
      const error = await pagesResponse.json().catch(() => ({ message: `HTTP ${pagesResponse.status}` }))
      console.error('❌ [API /search] Erreur HTTP:', pagesResponse.status)
      console.error('   Endpoint: /search (filter: object=page)')
      console.error('   Réponse:', JSON.stringify(error, null, 2))
      throw new Error(error.message || `HTTP ${pagesResponse.status}`)
    }

    const pagesData = await pagesResponse.json()
    const pages = pagesData.results || []

    if (pages.length === 0) {
      console.log('   Aucune page trouvée.\n')
    } else {
      console.log(`   ✅ ${pages.length} page(s) trouvée(s) (limité à 20 premières)\n`)

      pages.forEach((page, index) => {
        // Extraire le titre
        let title = 'Sans titre'
        if (page.properties) {
          for (const key in page.properties) {
            if (page.properties[key]?.title?.[0]?.plain_text) {
              title = page.properties[key].title[0].plain_text
              break
            }
          }
        }

        console.log(`   ${index + 1}. ${page.icon?.emoji || '📄'} ${title}`)
        console.log(`      ID: ${page.id}`)
        console.log(`      URL: ${page.url}`)
        console.log(`      Type: ${page.parent?.type || 'Autonome'}`)
        if (page.parent?.type === 'database_id') {
          console.log(`      Base de données: ${page.parent.database_id}`)
        }
        console.log(`      Modifiée: ${new Date(page.last_edited_time).toLocaleString('fr-FR')}`)
        console.log('')
      })

      if (pagesData.has_more) {
        console.log(`   ... et plus (utilisez l'API pour voir toutes les pages)\n`)
      }
    }

    // Résumé
    console.log('='.repeat(80))
    console.log('\n📊 RÉSUMÉ:')
    console.log(`   • Bases de données: ${databases.length}`)
    console.log(`   • Pages (premières 20): ${pages.length}`)
    console.log(`\n💡 Pour voir toutes les données d'une base de données:`)
    console.log(`   node scripts/query-database.mjs <DATABASE_ID>\n`)

  } catch (error) {
    console.error('\n❌ Erreur:', error.message)
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      console.error('💡 Vérifiez que votre clé API Notion est valide dans le fichier .env')
    }
    process.exit(1)
  }
}

listDatasources()

