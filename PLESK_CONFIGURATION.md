# Configuration pour Plesk / Hébergement Apache

## Problème résolu

Le proxy Vite ne fonctionne qu'en **développement**. En **production**, après le build, les fichiers sont statiques et le proxy Vite n'existe plus.

**Solution** : Un proxy PHP a été créé pour gérer les requêtes API en production.

## Configuration requise

### 1. Variable d'environnement

Vous devez définir la variable d'environnement `NOTION_SECRET` ou `VITE_NOTION_SECRET` sur votre serveur.

#### Sur Plesk :

1. Connectez-vous à Plesk
2. Allez dans **Domaines** → votre domaine
3. Allez dans **Variables d'environnement** (ou **Environment Variables**)
4. Ajoutez une nouvelle variable :
   - **Nom** : `NOTION_SECRET`
   - **Valeur** : votre clé API Notion (commence par `secret_`)
5. Cliquez sur **OK**

#### Alternative : Fichier .htaccess (moins sécurisé)

Si vous ne pouvez pas définir de variables d'environnement, vous pouvez créer un fichier `.env` dans le répertoire `api/` (mais ce n'est **pas recommandé** pour la sécurité).

### 2. Vérification

Une fois la variable configurée, testez le proxy :

```bash
curl https://votre-domaine.fr/api/notion/search \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"filter":{"property":"object","value":"database"}}'
```

Vous devriez recevoir une réponse JSON de l'API Notion.

## Structure des fichiers

- **`api/notion-proxy.php`** : Proxy PHP qui gère les requêtes vers l'API Notion
- **`.htaccess`** : Configuration Apache qui redirige `/api/notion/*` vers le proxy PHP
- **`vite.config.js`** : Configuration Vite avec proxy pour le développement

## Fonctionnement

1. **En développement** (`npm run dev`) :
   - Le proxy Vite dans `vite.config.js` gère les requêtes `/api/notion/*`

2. **En production** (après `npm run build`) :
   - Les fichiers statiques sont dans `dist/`
   - Apache sert les fichiers statiques
   - Les requêtes `/api/notion/*` sont redirigées vers `api/notion-proxy.php` via `.htaccess`
   - Le proxy PHP fait les requêtes vers l'API Notion avec la clé API stockée côté serveur

## Dépannage

### Erreur 500 sur `/api/notion/search`

1. **Vérifiez que la variable d'environnement est définie** :
   - Dans Plesk : **Variables d'environnement**
   - Vérifiez que `NOTION_SECRET` ou `VITE_NOTION_SECRET` est bien défini

2. **Vérifiez les permissions** :
   ```bash
   chmod 644 api/notion-proxy.php
   chmod 644 .htaccess
   ```

3. **Vérifiez les logs Apache** :
   - Dans Plesk : **Logs** → **Error Log**
   - Cherchez les erreurs liées à `notion-proxy.php`

4. **Testez le proxy directement** :
   ```bash
   php api/notion-proxy.php
   ```
   (Cela devrait afficher une erreur JSON si la variable n'est pas définie)

### Erreur CORS

Le proxy PHP inclut les en-têtes CORS nécessaires. Si vous avez encore des erreurs CORS :
- Vérifiez que `.htaccess` est bien présent et actif
- Vérifiez que `mod_rewrite` est activé sur Apache

### Clé API non trouvée

Si vous voyez l'erreur "NOTION_SECRET not configured" :
- Vérifiez que la variable d'environnement est bien définie dans Plesk
- Redémarrez Apache si nécessaire
- Vérifiez que le nom de la variable est exactement `NOTION_SECRET` ou `VITE_NOTION_SECRET`

## Sécurité

⚠️ **Important** : Ne jamais exposer la clé API Notion dans le code JavaScript côté client. Le proxy PHP garde la clé API côté serveur, ce qui est sécurisé.

