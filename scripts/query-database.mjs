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
  console.error('💡 Ajoutez votre clé API Notion dans le fichier .env')
  process.exit(1)
}

// ID de la base de données à interroger
const databaseId = process.argv[2] || '2baae0be-cdf7-8035-be0e-ec574025c85d'

// Nettoyer l'ID (enlever les tirets s'il y en a)
const cleanId = databaseId.replace(/-/g, '')

console.log(`\n🔍 Récupération des données de la base: ${databaseId}\n`)

async function queryDatabase() {
  try {
    // D'abord, récupérer les informations de la base de données
    console.log('📋 Récupération des informations de la base de données...')
    const dbInfoResponse = await fetch(`${NOTION_API_BASE}/databases/${cleanId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    })

    if (!dbInfoResponse.ok) {
      const error = await dbInfoResponse.json()
      throw new Error(error.message || `HTTP ${dbInfoResponse.status}`)
    }

    const dbInfo = await dbInfoResponse.json()
    const dbTitle = dbInfo.title?.[0]?.plain_text || 'Sans titre'
    const properties = Object.keys(dbInfo.properties || {})

    console.log(`\n✅ Base de données: ${dbInfo.icon?.emoji || ''} ${dbTitle}`)
    console.log(`   ID: ${dbInfo.id}`)
    console.log(`   URL: ${dbInfo.url}`)
    console.log(`   Propriétés: ${properties.join(', ')}`)
    console.log(`\n${'='.repeat(80)}\n`)

    // Ensuite, récupérer toutes les pages de la base de données
    console.log('📄 Récupération des pages...\n')

    let allResults = []
    let hasMore = true
    let nextCursor = null

    while (hasMore) {
      const requestBody = {
        page_size: 100
      }

      if (nextCursor) {
        requestBody.start_cursor = nextCursor
      }

      const queryResponse = await fetch(`${NOTION_API_BASE}/databases/${cleanId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secret}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!queryResponse.ok) {
        const error = await queryResponse.json()
        throw new Error(error.message || `HTTP ${queryResponse.status}`)
      }

      const queryData = await queryResponse.json()
      allResults = allResults.concat(queryData.results || [])
      hasMore = queryData.has_more || false
      nextCursor = queryData.next_cursor || null

      if (hasMore) {
        console.log(`   ${allResults.length} page(s) récupérée(s)...`)
      }
    }

    console.log(`\n✅ ${allResults.length} page(s) trouvée(s) au total\n`)
    console.log('='.repeat(80))
    console.log('\n📊 DONNÉES SOURCES:\n')

    if (allResults.length === 0) {
      console.log('   Aucune page trouvée dans cette base de données.\n')
    } else {
      allResults.forEach((page, index) => {
        console.log(`\n${'─'.repeat(80)}`)
        console.log(`\n📄 Page ${index + 1}/${allResults.length}`)
        console.log(`   ID: ${page.id}`)
        console.log(`   URL: ${page.url}`)
        console.log(`   Créée: ${new Date(page.created_time).toLocaleString('fr-FR')}`)
        console.log(`   Modifiée: ${new Date(page.last_edited_time).toLocaleString('fr-FR')}`)
        console.log(`   Archivée: ${page.archived ? 'Oui' : 'Non'}`)

        // Afficher les propriétés
        if (page.properties && Object.keys(page.properties).length > 0) {
          console.log(`\n   📋 Propriétés:`)

          Object.entries(page.properties).forEach(([key, prop]) => {
            let value = 'N/A'

            switch (prop.type) {
              case 'title':
                value = prop.title?.[0]?.plain_text || '(vide)'
                break
              case 'rich_text':
                value = prop.rich_text?.[0]?.plain_text || '(vide)'
                break
              case 'number':
                value = prop.number !== null ? prop.number.toString() : '(vide)'
                break
              case 'select':
                value = prop.select?.name || '(vide)'
                break
              case 'multi_select':
                value = prop.multi_select?.map(s => s.name).join(', ') || '(vide)'
                break
              case 'date':
                if (prop.date?.start) {
                  value = new Date(prop.date.start).toLocaleString('fr-FR')
                  if (prop.date.end) {
                    value += ` → ${new Date(prop.date.end).toLocaleString('fr-FR')}`
                  }
                } else {
                  value = '(vide)'
                }
                break
              case 'checkbox':
                value = prop.checkbox ? 'Oui' : 'Non'
                break
              case 'url':
                value = prop.url || '(vide)'
                break
              case 'email':
                value = prop.email || '(vide)'
                break
              case 'phone_number':
                value = prop.phone_number || '(vide)'
                break
              case 'relation':
                value = `${prop.relation?.length || 0} relation(s)`
                break
              case 'formula':
                value = JSON.stringify(prop.formula)
                break
              case 'rollup':
                value = JSON.stringify(prop.rollup)
                break
              default:
                value = JSON.stringify(prop)
            }

            // Limiter la longueur de la valeur pour l'affichage
            if (typeof value === 'string' && value.length > 100) {
              value = value.substring(0, 97) + '...'
            }

            console.log(`      • ${key}: ${value}`)
          })
        }

        // Afficher le contenu brut (JSON) si demandé via --raw
        if (process.argv.includes('--raw')) {
          console.log(`\n   🔧 JSON brut:`)
          console.log(JSON.stringify(page, null, 2))
        }
      })

      console.log(`\n${'─'.repeat(80)}\n`)
      console.log(`\n✅ Total: ${allResults.length} page(s) affichée(s)`)
      console.log(`\n💡 Astuce: Utilisez --raw pour afficher le JSON brut de chaque page\n`)
    }

  } catch (error) {
    console.error('\n❌ Erreur:', error.message)
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      console.error('💡 Vérifiez que votre clé API Notion est valide dans le fichier .env')
    } else if (error.message.includes('404') || error.message.includes('object_not_found')) {
      console.error('💡 Vérifiez que l\'ID de la base de données est correct et qu\'elle est partagée avec votre intégration')
    }
    process.exit(1)
  }
}

queryDatabase()

