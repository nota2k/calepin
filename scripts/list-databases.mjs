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

async function listDatabases() {
  try {
    const response = await fetch(`${NOTION_API_BASE}/search`, {
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

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    const databases = data.results || []

    console.log(`\n✅ ${databases.length} base(s) de données trouvée(s)\n`)

    databases.forEach((db, index) => {
      const title = db.title?.[0]?.plain_text || 'Sans titre'
      console.log(`${index + 1}. ${db.icon?.emoji || ''} ${title}`)
      console.log(`   ID: ${db.id}`)
      console.log(`   URL: ${db.url}`)
      console.log(`   Propriétés: ${Object.keys(db.properties || {}).length}`)
      console.log('')
    })
  } catch (error) {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  }
}

listDatabases()
