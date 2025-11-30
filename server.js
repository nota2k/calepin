/**
 * Serveur proxy pour l'API Notion
 * Gère les requêtes vers l'API Notion côté serveur pour éviter les problèmes CORS
 * et protéger la clé API
 */

/* eslint-env node */
/* global process */
import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()

const PORT = process.env.PORT || 3000

// Middleware pour parser le JSON
app.use(express.json())

// Récupérer la clé API Notion depuis les variables d'environnement

const NOTION_SECRET = process.env.NOTION_SECRET || process.env.VITE_NOTION_SECRET

if (!NOTION_SECRET) {
  console.error('❌ ERREUR: NOTION_SECRET ou VITE_NOTION_SECRET n\'est pas défini')
  console.error('   Veuillez définir cette variable d\'environnement avant de démarrer le serveur')

  process.exit(1)
}

/**
 * Proxy pour les requêtes vers l'API Notion
 */
app.use('/api/notion', async (req, res) => {
  try {
    // Extraire le chemin de l'endpoint Notion depuis l'URL originale
    // req.path contient le chemin après /api/notion
    let endpoint = req.path

    // Si le chemin commence par /api/notion, l'enlever
    if (endpoint.startsWith('/api/notion')) {
      endpoint = endpoint.replace(/^\/api\/notion/, '')
    }

    // S'assurer que l'endpoint commence par /
    if (!endpoint.startsWith('/')) {
      endpoint = `/${endpoint}`
    }

    // Construire l'URL complète de l'API Notion
    let notionUrl = `https://api.notion.com/v1${endpoint}`

    // Ajouter les paramètres de requête s'il y en a
    if (Object.keys(req.query).length > 0) {
      const queryString = new URLSearchParams(req.query).toString()
      notionUrl += `?${queryString}`
    }

    // Préparer les options de la requête
    const fetchOptions = {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${NOTION_SECRET}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    }

    // Ajouter le corps de la requête pour POST, PUT, PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body)
    }

    // Effectuer la requête vers l'API Notion
    const response = await fetch(notionUrl, fetchOptions)

    // Récupérer le contenu de la réponse
    const contentType = response.headers.get('content-type') || ''
    let data

    if (contentType.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    // Retourner la réponse avec le même code HTTP
    res.status(response.status)

    if (contentType.includes('application/json')) {
      res.json(data)
    } else {
      res.set('Content-Type', contentType)
      res.send(data)
    }
  } catch (error) {
    console.error('Erreur lors de la requête vers l\'API Notion:', error)
    res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    })
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
  console.log(`📡 Proxy API Notion disponible sur /api/notion`)

  if (process.env.NODE_ENV === 'production') {
    console.log(`📦 Servant les fichiers statiques depuis /dist`)
  }
})

