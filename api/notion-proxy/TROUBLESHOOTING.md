# Guide de dépannage - Proxy API Notion

## Erreur : "Le proxy API ne fonctionne pas correctement"

Cette erreur signifie que le proxy PHP retourne du HTML au lieu de JSON. Voici les étapes pour résoudre le problème :

### 1. Vérifier que le fichier config.php existe

Le fichier `api/config.php` doit exister et contenir votre clé API Notion.

```bash
# Si le fichier n'existe pas, copiez l'exemple
cp api/config.php.example api/config.php
```

Puis éditez `api/config.php` et remplacez `VOTRE_CLE_API_NOTION` par votre vraie clé API.

### 2. Vérifier la configuration de la clé API

Le proxy cherche la clé dans cet ordre :
1. Constante `NOTION_SECRET` dans `api/config.php`
2. Variable d'environnement `NOTION_SECRET`
3. Variable d'environnement `VITE_NOTION_SECRET`
4. Fichier `.env` à la racine

**Option A : Fichier config.php (recommandé pour serveur Apache)**
```php
define('NOTION_SECRET', 'secret_votre_cle_api');
```

**Option B : Variable d'environnement (cPanel)**
- Allez dans cPanel → Variables d'environnement
- Ajoutez : `NOTION_SECRET` = `votre_clé_api`

**Option C : Fichier .env**
Créez un fichier `.env` à la racine :
```
NOTION_SECRET=votre_clé_api
```

### 3. Vérifier que le .htaccess fonctionne

Le `.htaccess` doit contenir cette règle :
```apache
RewriteCond %{REQUEST_URI} ^/api/notion
RewriteRule ^api/notion(.*)$ /api/notion-proxy/index.php [L,QSA]
```

Vérifiez que :
- Le module `mod_rewrite` est activé sur Apache
- Le fichier `.htaccess` est bien à la racine du projet

### 4. Tester le proxy directement

Testez cette URL dans votre navigateur :
```
https://votre-domaine.com/api/notion/search
```

**Si vous voyez du JSON** (même une erreur) → Le proxy fonctionne ✅
**Si vous voyez du HTML** → Le proxy ne fonctionne pas ❌

### 5. Vérifier les permissions PHP

Assurez-vous que PHP peut :
- Lire les fichiers dans `api/`
- Exécuter cURL
- Accéder aux variables d'environnement

### 6. Vérifier les logs d'erreur

Consultez les logs d'erreur PHP de votre serveur pour voir les erreurs détaillées.

## Erreur : "NOTION_SECRET not configured"

La clé API n'a pas été trouvée. Vérifiez :
- Que `api/config.php` existe et contient une clé valide
- Que la variable d'environnement est bien définie
- Que le fichier `.env` existe et contient `NOTION_SECRET=...`

## Erreur : "Invalid endpoint"

L'URL de la requête est mal formatée. Vérifiez que les requêtes sont faites vers :
- `/api/notion/search`
- `/api/notion/databases/...`
- `/api/notion/pages/...`

## Erreur : "cURL error"

Problème de connexion avec l'API Notion. Vérifiez :
- Que votre serveur peut accéder à `https://api.notion.com`
- Que le SSL est correctement configuré
- Que le firewall ne bloque pas les connexions sortantes

