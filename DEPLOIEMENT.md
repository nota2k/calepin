# Guide de déploiement

Ce guide explique comment déployer l'application Calepin en production. L'application nécessite un backend pour communiquer avec l'API Notion (à cause des restrictions CORS).

## ⚠️ Important : Pourquoi un backend est nécessaire

L'API Notion ne supporte **pas** les requêtes CORS depuis le navigateur. Il est donc **impossible** d'appeler directement l'API Notion depuis le code JavaScript côté client. Vous devez utiliser un backend qui :

1. Stocke la clé API Notion de manière sécurisée (côté serveur)
2. Fait les requêtes vers l'API Notion
3. Retourne les données au client

## 📋 Prérequis

1. **Clé API Notion** : Vous devez avoir une clé API Notion (commence par `secret_` ou `ntn_`)
2. **Build de l'application** : Exécutez `npm run build` pour générer les fichiers statiques dans `dist/`

## 🚀 Option 1 : Déploiement avec PHP (Hébergement Apache/PHP)

Cette option est pour les hébergements classiques qui supportent PHP (Plesk, cPanel, etc.).

### Étapes de déploiement

1. **Build de l'application** :
   ```bash
   npm run build
   ```
   Cela génère les fichiers statiques dans le dossier `dist/`.

2. **Upload des fichiers** :
   - Uploader le contenu du dossier `dist/` à la racine de votre site web
   - Uploader le dossier `api/` (contient `notion-proxy.php`)
   - Uploader le fichier `.htaccess`

3. **Configuration de la variable d'environnement** :

   **Sur Plesk** :
   - Allez dans **Domaines** → votre domaine
   - **Variables d'environnement** (ou **Environment Variables**)
   - Ajoutez :
     - **Nom** : `NOTION_SECRET`
     - **Valeur** : votre clé API Notion
   - Cliquez sur **OK**

   **Sur cPanel** :
   - Allez dans **Variables d'environnement**
   - Ajoutez `NOTION_SECRET` avec votre clé API

4. **Vérification** :
   - Testez l'API : `https://votre-domaine.fr/api/notion/search`
   - Vérifiez que l'application fonctionne

### Structure des fichiers en production

```
votre-domaine.fr/
├── index.html          (depuis dist/)
├── assets/             (depuis dist/assets/)
├── favicon.ico         (depuis dist/)
├── api/
│   └── notion-proxy.php
└── .htaccess
```

### Fonctionnement

- Les requêtes `/api/notion/*` sont redirigées vers `api/notion-proxy.php` par `.htaccess`
- Le proxy PHP fait les requêtes vers l'API Notion avec la clé API stockée côté serveur
- Les fichiers statiques sont servis par Apache

## 🚀 Option 2 : Déploiement avec Node.js (Hébergement moderne)

Cette option est pour les hébergements qui supportent Node.js (Passenger, Heroku, Vercel, etc.).

### Étapes de déploiement

1. **Build de l'application** :
   ```bash
   npm run build
   ```

2. **Installation des dépendances** (sur le serveur) :
   ```bash
   npm install --production
   ```

3. **Configuration de la variable d'environnement** :
   - Définissez `NOTION_SECRET` ou `VITE_NOTION_SECRET` sur votre serveur
   - Sur Heroku : `heroku config:set NOTION_SECRET=votre_cle`
   - Sur Vercel : Ajoutez dans les variables d'environnement du projet

4. **Démarrage du serveur** :
   ```bash
   npm start
   ```
   Ou laissez votre plateforme (Passenger, Heroku, etc.) démarrer automatiquement via `package.json`

### Structure des fichiers en production

```
votre-application/
├── dist/               (fichiers statiques)
├── server.js           (serveur Express avec SDK Notion)
├── package.json
└── node_modules/
```

### Fonctionnement

- Le serveur Express (`server.js`) :
  - Sert les fichiers statiques depuis `dist/`
  - Gère les requêtes `/api/notion/*` avec le SDK Notion
  - Utilise la clé API stockée dans les variables d'environnement

## 🔧 Configuration en développement

En développement, vous devez démarrer **deux serveurs** :

1. **Serveur Express** (port 3000) :
   ```bash
   npm run dev:server
   ```

2. **Serveur Vite** (port 5173) :
   ```bash
   npm run dev
   ```

Le proxy Vite redirige automatiquement `/api/notion/*` vers le serveur Express.

## 📝 Résumé des différences

| Aspect | Développement | Production PHP | Production Node.js |
|--------|---------------|-----------------|-------------------|
| Frontend | Vite (port 5173) | Fichiers statiques | Fichiers statiques |
| Backend | Express (port 3000) | PHP (`notion-proxy.php`) | Express (`server.js`) |
| SDK Notion | ✅ Oui (Express) | ❌ Non (cURL) | ✅ Oui (Express) |
| Proxy | Vite proxy | Apache `.htaccess` | Express routes |
| Variable env | `.env` | `NOTION_SECRET` (Plesk/cPanel) | `NOTION_SECRET` (plateforme) |

## 🐛 Dépannage

### Erreur 404 sur `/api/notion/search`

**Avec PHP** :
- Vérifiez que `.htaccess` est présent et actif
- Vérifiez que `mod_rewrite` est activé sur Apache
- Vérifiez que `api/notion-proxy.php` existe

**Avec Node.js** :
- Vérifiez que le serveur Express est démarré
- Vérifiez que les routes `/api/notion/*` sont bien configurées dans `server.js`

### Erreur 500 "NOTION_SECRET not configured"

- Vérifiez que la variable d'environnement `NOTION_SECRET` ou `VITE_NOTION_SECRET` est définie
- Redémarrez le serveur après avoir défini la variable
- Vérifiez que le nom de la variable est exactement `NOTION_SECRET` ou `VITE_NOTION_SECRET`

### Erreurs CORS

- Le backend doit inclure les en-têtes CORS (déjà configuré dans `server.js` et `notion-proxy.php`)
- Vérifiez que les requêtes passent bien par le backend et non directement vers l'API Notion

## 🔒 Sécurité

⚠️ **Important** : Ne jamais exposer la clé API Notion dans le code JavaScript côté client. Elle doit toujours être stockée côté serveur dans les variables d'environnement.

## 📚 Documentation supplémentaire

- `PLESK_CONFIGURATION.md` : Détails pour Plesk
- `PASSENGER_DEPLOYMENT.md` : Détails pour Passenger/Node.js

