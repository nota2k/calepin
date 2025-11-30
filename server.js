/**
 * Service backend pour l'API Notion utilisant le SDK officiel
 * Gère les requêtes vers l'API Notion côté serveur pour éviter les problèmes CORS
 * et protéger la clé API
 */

/* eslint-env node */
/* global process */
import express from 'express'
import { Client } from '@notionhq/client'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Charger les variables d'environnement depuis .env
const envPath = join(__dirname, '.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
} catch {
  // Le fichier .env n'existe pas, ce n'est pas grave si les variables sont définies autrement
  console.warn('⚠️  Fichier .env non trouvé, utilisation des variables d\'environnement système')
}

const app = express()

const PORT = process.env.PORT || 3000

// Middleware CORS pour permettre les requêtes depuis le navigateur
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Notion-Version')
  res.header('Access-Control-Max-Age', '86400')

  // Répondre immédiatement aux requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }

  next()
})

// Middleware pour parser le JSON
app.use(express.json())

// Récupérer la clé API Notion depuis les variables d'environnement
const NOTION_SECRET = process.env.NOTION_SECRET || process.env.VITE_NOTION_SECRET

if (!NOTION_SECRET) {
  console.error('❌ ERREUR: NOTION_SECRET ou VITE_NOTION_SECRET n\'est pas défini')
  console.error('   Veuillez définir cette variable d\'environnement avant de démarrer le serveur')
  console.error('   💡 Créez un fichier .env à la racine du projet avec:')
  console.error('      VITE_NOTION_SECRET=votre_cle_api_notion')
  console.error('   💡 Ou définissez la variable d\'environnement:')
  console.error('      export VITE_NOTION_SECRET=votre_cle_api_notion')

  process.exit(1)
}

// Initialiser le client Notion avec le SDK officiel
const notion = new Client({
  auth: NOTION_SECRET
})

/**
 * Service backend utilisant le SDK Notion officiel
 * Gère les requêtes vers l'API Notion via le SDK
 */
app.use('/api/notion', async (req, res) => {
  try {
    // Extraire le chemin de l'endpoint Notion depuis l'URL originale
    let endpoint = req.path

    // Si le chemin commence par /api/notion, l'enlever
    if (endpoint.startsWith('/api/notion')) {
      endpoint = endpoint.replace(/^\/api\/notion/, '')
    }

    // S'assurer que l'endpoint commence par /
    if (!endpoint.startsWith('/')) {
      endpoint = `/${endpoint}`
    }

    let result

    // Router les requêtes selon l'endpoint
    if (endpoint === '/search' && req.method === 'POST') {
      // Recherche de bases de données ou pages
      result = await notion.search(req.body)
    } else if (endpoint.startsWith('/databases/')) {
      const databaseId = endpoint.replace('/databases/', '').split('/')[0].replace(/-/g, '')

      if (endpoint.endsWith('/query') && req.method === 'POST') {
        // Interroger une base de données
        result = await notion.databases.query({
          database_id: databaseId,
          ...req.body
        })
      } else if (req.method === 'GET') {
        // Récupérer les informations d'une base de données
        result = await notion.databases.retrieve({
          database_id: databaseId
        })
      } else {
        throw new Error(`Méthode ${req.method} non supportée pour ${endpoint}`)
      }
    } else if (endpoint === '/pages' && req.method === 'POST') {
      // Créer une page
      result = await notion.pages.create(req.body)
    } else if (endpoint.startsWith('/pages/')) {
      const pageId = endpoint.replace('/pages/', '').split('/')[0].replace(/-/g, '')

      if (req.method === 'GET') {
        // Récupérer une page
        result = await notion.pages.retrieve({
          page_id: pageId
        })
      } else {
        throw new Error(`Méthode ${req.method} non supportée pour ${endpoint}`)
      }
    } else {
      throw new Error(`Endpoint ${endpoint} avec méthode ${req.method} non supporté`)
    }

    // Retourner la réponse
    res.json(result)
  } catch (error) {
    console.error('Erreur lors de la requête vers l\'API Notion:', error)
    console.error('Endpoint:', req.path)
    console.error('Méthode:', req.method)
    console.error('Body:', req.body)

    // Gérer les erreurs du SDK Notion
    // Le SDK Notion peut lever des erreurs avec des propriétés spécifiques
    if (error.code) {
      // Erreur API Notion (ex: APIResponseError)
      const statusCode = error.status || error.statusCode || 500
      res.status(statusCode).json({
        error: error.code,
        message: error.message,
        ...(error.body && { details: error.body })
      })
    } else if (error.message) {
      // Erreur générique
      res.status(500).json({
        error: 'Erreur serveur',
        message: error.message
      })
    } else {
      // Erreur inconnue
      res.status(500).json({
        error: 'Erreur serveur',
        message: 'Une erreur inattendue s\'est produite'
      })
    }
  }
})

// Servir les fichiers statiques en production

if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, 'dist')
  app.use(express.static(distPath))

  // Toutes les autres routes renvoient vers index.html (SPA)
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`)
  console.log(`📡 Service API Notion (SDK) disponible sur /api/notion`)

  if (process.env.NODE_ENV === 'production') {
    console.log(`📦 Servant les fichiers statiques depuis /dist`)
  }
})

