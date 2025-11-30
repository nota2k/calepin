# Déploiement avec Phusion Passenger

## Configuration requise

1. **Node.js** : Version 20.19.0 ou supérieure (ou 22.12.0+)
2. **Express** : Installé via `npm install`
3. **Variable d'environnement** : `NOTION_SECRET` ou `VITE_NOTION_SECRET` doit être définie

## Installation des dépendances

```bash
npm install
```

## Build de l'application

```bash
npm run build
```

Cela génère les fichiers statiques dans le dossier `dist/`.

## Configuration de la variable d'environnement

Assurez-vous que la variable d'environnement `NOTION_SECRET` (ou `VITE_NOTION_SECRET`) est définie sur votre serveur avec votre clé API Notion.

### Sur cPanel / hébergement partagé

1. Allez dans **Variables d'environnement** ou **Setup Node.js App**
2. Ajoutez la variable `NOTION_SECRET` avec votre clé API Notion

### Sur serveur dédié

Ajoutez dans votre fichier `.env` ou dans la configuration de votre serveur :
```bash
export NOTION_SECRET="votre_cle_api_notion"
```

## Configuration Passenger

Passenger devrait automatiquement détecter le fichier `package.json` et utiliser `server.js` comme point d'entrée.

### Vérification

1. Le fichier `package.json` doit avoir `"main": "server.js"`
2. Le script `"start": "node server.js"` doit être défini
3. Passenger devrait démarrer automatiquement le serveur

## Structure des routes

- **`/api/notion/*`** : Proxy vers l'API Notion (géré par `server.js`)
- **`/*`** : Fichiers statiques de l'application Vue.js (en production)

## Dépannage

### Erreur 500 "Web application could not be started"

1. **Vérifiez les logs Passenger** :
   - Consultez les logs d'erreur dans cPanel ou sur le serveur
   - Recherchez l'Error ID mentionné dans l'erreur

2. **Vérifiez que Node.js est installé** :
   ```bash
   node --version
   ```

3. **Vérifiez que les dépendances sont installées** :
   ```bash
   npm install
   ```

4. **Vérifiez que la variable d'environnement est définie** :
   - La variable `NOTION_SECRET` ou `VITE_NOTION_SECRET` doit être définie
   - Le serveur s'arrêtera au démarrage si elle n'est pas définie

5. **Vérifiez que le build a été effectué** :
   ```bash
   npm run build
   ```

6. **Testez le serveur localement** :
   ```bash
   npm start
   ```
   Le serveur devrait démarrer sur le port 3000 (ou le port défini dans `PORT`)

### Erreurs CORS

Si vous voyez des erreurs CORS, vérifiez que :
- Le proxy backend (`/api/notion`) fonctionne correctement
- Les requêtes passent bien par le proxy et non directement vers l'API Notion

### Clé API non trouvée

Si vous voyez l'erreur "VITE_NOTION_SECRET n'est pas configuré" :
- Vérifiez que la variable d'environnement est bien définie sur le serveur
- Redémarrez l'application après avoir défini la variable

## Test en local

Pour tester avant de déployer :

```bash
# Installer les dépendances
npm install

# Build l'application
npm run build

# Définir la variable d'environnement
export NOTION_SECRET="votre_cle_api_notion"

# Démarrer le serveur
npm start
```

L'application devrait être accessible sur `http://localhost:3000`

