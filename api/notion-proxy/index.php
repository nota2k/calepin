<?php
/**
 * Proxy pour l'API Notion
 * 
 * Ce proxy gère les requêtes vers l'API Notion en ajoutant automatiquement
 * la clé API et les en-têtes nécessaires, tout en évitant les problèmes CORS.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Notion-Secret, Notion-Version, Accept');
header('Access-Control-Max-Age: 86400');

// Gérer les requêtes OPTIONS (preflight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Charger la configuration
$configFile = __DIR__ . '/../config.php';
if (file_exists($configFile)) {
    require_once $configFile;
}
// Si le fichier config.php n'existe pas, on essaiera de charger depuis les variables d'environnement

// Récupérer la clé API Notion (plusieurs sources possibles)
$notionSecret = null;

// 1. Depuis la constante définie dans config.php
if (defined('NOTION_SECRET')) {
    $notionSecret = NOTION_SECRET;
}

// 2. Depuis les variables d'environnement du serveur
if (empty($notionSecret) || $notionSecret === 'VOTRE_CLE_API_NOTION') {
    $notionSecret = getenv('NOTION_SECRET') ?: getenv('VITE_NOTION_SECRET');
}

// 3. Depuis $_SERVER (pour certains hébergeurs)
if (empty($notionSecret) || $notionSecret === 'VOTRE_CLE_API_NOTION') {
    $notionSecret = $_SERVER['NOTION_SECRET'] ?? $_SERVER['VITE_NOTION_SECRET'] ?? null;
}

// 4. Depuis un header custom (pour compatibilité)
$customSecret = $_SERVER['HTTP_X_NOTION_SECRET'] ?? null;
if ($customSecret) {
    $notionSecret = $customSecret;
}

// Vérifier que la clé est valide (pas la valeur par défaut)
if (empty($notionSecret) || $notionSecret === 'VOTRE_CLE_API_NOTION') {
    http_response_code(500);
    echo json_encode([
        'error' => 'NOTION_SECRET not configured',
        'message' => 'Please configure NOTION_SECRET in api/config.php, as environment variable, or in .env file'
    ]);
    exit;
}

// Extraire le chemin de l'URL originale
// Utiliser THE_REQUEST qui contient la requête HTTP originale avant réécriture
$originalRequest = $_SERVER['THE_REQUEST'] ?? $_SERVER['REQUEST_URI'];
$path = parse_url($originalRequest, PHP_URL_PATH);

// Extraire le chemin de la query string si passé par la réécriture
if (isset($_GET['path'])) {
    $endpoint = $_GET['path'];
} else {
    // Enlever le préfixe /api/notion pour obtenir l'endpoint Notion
    $endpoint = '';
    if (preg_match('#/api/notion(/.*)$#', $path, $matches)) {
        $endpoint = $matches[1];
    } elseif (preg_match('#/api/notion-proxy(/.*)$#', $path, $matches)) {
        $endpoint = $matches[1];
    }
    
    // Si toujours vide, essayer REQUEST_URI direct
    if (empty($endpoint)) {
        $requestUri = $_SERVER['REQUEST_URI'];
        if (preg_match('#/api/notion(/.*)$#', $requestUri, $matches)) {
            $endpoint = $matches[1];
        }
    }
}

// Nettoyer l'endpoint (enlever le slash initial s'il existe)
$endpoint = ltrim($endpoint, '/');

// Si l'endpoint est vide, retourner une erreur
if (empty($endpoint)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid endpoint',
        'message' => 'The API endpoint is missing. Expected format: /api/notion/search, /api/notion/databases/...',
        'debug' => [
            'original_request' => $originalRequest,
            'request_uri' => $_SERVER['REQUEST_URI'],
            'path' => $path,
            'the_request' => $_SERVER['THE_REQUEST'] ?? 'not set'
        ]
    ]);
    exit;
}

// Construire l'URL complète de l'API Notion
$notionApiUrl = 'https://api.notion.com/v1/' . $endpoint;

// Ajouter la query string originale (sans le paramètre 'path' ajouté par la réécriture)
$queryParams = $_GET;
unset($queryParams['path']); // Retirer le paramètre 'path' utilisé pour le routage
if (!empty($queryParams)) {
    $queryString = http_build_query($queryParams);
    $notionApiUrl .= '?' . $queryString;
}

// Récupérer le corps de la requête
$body = file_get_contents('php://input');

// Récupérer la méthode HTTP
$method = $_SERVER['REQUEST_METHOD'];

// Initialiser cURL
$ch = curl_init($notionApiUrl);

// Configurer les options cURL
$curlOptions = [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $notionSecret,
        'Notion-Version: 2022-06-28',
        'Content-Type: application/json'
    ],
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_TIMEOUT => 30
];

// Ajouter le corps de la requête si présent
if (!empty($body) && in_array($method, ['POST', 'PUT', 'PATCH'])) {
    $curlOptions[CURLOPT_POSTFIELDS] = $body;
}

curl_setopt_array($ch, $curlOptions);

// Exécuter la requête
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$error = curl_error($ch);

curl_close($ch);

// Gérer les erreurs cURL
if ($error) {
    http_response_code(500);
    echo json_encode([
        'error' => 'cURL error',
        'message' => $error,
        'url' => $notionApiUrl
    ]);
    exit;
}

// Vérifier si la réponse est vide ou invalide
if ($response === false || $httpCode === 0) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Invalid response from Notion API',
        'http_code' => $httpCode,
        'url' => $notionApiUrl
    ]);
    exit;
}

// Retourner la réponse avec le code HTTP approprié
http_response_code($httpCode);

// Définir le Content-Type approprié
if ($contentType) {
    header('Content-Type: ' . $contentType);
} else {
    header('Content-Type: application/json');
}

echo $response;
