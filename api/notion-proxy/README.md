# Proxy PHP pour l'API Notion

Ce proxy PHP permet de faire fonctionner l'application en production sur un serveur Apache traditionnel.

## Configuration

Le proxy cherche la clé API Notion dans l'ordre suivant :

1. Variable d'environnement `NOTION_SECRET`
2. Variable d'environnement `VITE_NOTION_SECRET`
3. Fichier `.env` à la racine du projet
4. Fichier `.env.production` à la racine du projet

## Configuration sur cPanel / Serveur Apache

### Option 1 : Variable d'environnement (Recommandé)

Dans cPanel, allez dans **Variables d'environnement** et ajoutez :
- Nom : `NOTION_SECRET`
- Valeur : votre clé API Notion (commence par `secret_` ou `ntn_`)

### Option 2 : Fichier .env

Créez un fichier `.env` à la racine du projet avec :
```
NOTION_SECRET=votre_clé_api_notion
```

⚠️ **Important** : Assurez-vous que le fichier `.env` n'est pas accessible publiquement. Le fichier `.htaccess` devrait déjà bloquer l'accès aux fichiers `.env`.

## Vérification

Pour vérifier que le proxy fonctionne, testez cette URL dans votre navigateur :
```
https://votre-domaine.com/api/notion/search
```

Vous devriez recevoir une réponse JSON (même en cas d'erreur d'authentification, ce sera du JSON, pas du HTML).

## Dépannage

### Erreur : "NOTION_SECRET non configuré"
- Vérifiez que la variable d'environnement est bien définie dans cPanel
- Vérifiez que le fichier `.env` existe et contient `NOTION_SECRET=...`
- Assurez-vous que PHP peut lire les fichiers `.env` (permissions)

### Erreur : Réponse HTML au lieu de JSON
- Vérifiez que le `.htaccess` contient bien la règle pour `/api/notion`
- Vérifiez que le module `mod_rewrite` est activé sur Apache
- Vérifiez que PHP est activé et fonctionne sur votre serveur

### Erreur : "Endpoint invalide"
- Vérifiez que les requêtes sont bien formatées : `/api/notion/search`, `/api/notion/databases/...`, etc.

