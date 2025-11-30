<?php
/**
 * Proxy CORS pour l'API Notion en production
 * Transmet les requêtes vers l'API Notion en ajoutant les en-têtes CORS
 * La clé API est envoyée depuis le client (pas de protection côté serveur)
 */

// En-têtes CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, Notion-Version');
header('Access-Control-Max-Age: 86400');

// Gérer les requêtes OPTIONS (preflight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Extraire le chemin de l'endpoint Notion depuis l'URL
// Le .htaccess passe l'endpoint via PATH_INFO
$endpoint = '';

// Méthode 1 : PATH_INFO (quand appelé via .htaccess)
if (isset($_SERVER['PATH_INFO']) && $_SERVER['PATH_INFO'] !== '') {
    $endpoint = ltrim($_SERVER['PATH_INFO'], '/');
} else {
    // Méthode 2 : Extraire depuis REQUEST_URI
    $requestUri = $_SERVER['REQUEST_URI'];
    $path = parse_url($requestUri, PHP_URL_PATH);
    
    if (preg_match('#/api/notion(/.*)$#', $path, $matches)) {
        $endpoint = ltrim($matches[1], '/');
    } elseif (preg_match('#/api/notion(/.*)$#', $requestUri, $matches)) {
        $endpoint = ltrim($matches[1], '/');
    }
}

// Si l'endpoint est vide, retourner une erreur
if (empty($endpoint)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid endpoint',
        'message' => 'The API endpoint is missing. Expected format: /api/notion/search, /api/notion/databases/...'
    ]);
    exit;
}

// Construire l'URL complète de l'API Notion
$notionApiUrl = 'https://api.notion.com/v1/' . $endpoint;

// Ajouter la query string originale
$queryParams = $_GET;
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

// Récupérer la clé API Notion depuis les variables d'environnement
$notionSecret = getenv('NOTION_SECRET') ?: getenv('VITE_NOTION_SECRET');

if (empty($notionSecret)) {
    http_response_code(500);
    echo json_encode([
        'error' => 'NOTION_SECRET not configured',
        'message' => 'Please configure NOTION_SECRET or VITE_NOTION_SECRET as environment variable on the server'
    ]);
    exit;
}

// Préparer les en-têtes pour la requête vers Notion
$headers = [
    'Authorization: Bearer ' . $notionSecret,
    'Notion-Version: 2022-06-28',
    'Content-Type: application/json'
];

// Configurer les options cURL
$curlOptions = [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $headers,
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
    // Logger les erreurs pour /search
    if (strpos($endpoint, 'search') !== false) {
        error_log(sprintf(
            '[API /search] Erreur cURL: %s | Endpoint: %s | URL: %s',
            $error,
            $endpoint,
            $notionApiUrl
        ));
    }
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
    // Logger les erreurs pour /search
    if (strpos($endpoint, 'search') !== false) {
        error_log(sprintf(
            '[API /search] Réponse invalide | HTTP Code: %s | Endpoint: %s | URL: %s',
            $httpCode,
            $endpoint,
            $notionApiUrl
        ));
    }
    http_response_code(500);
    echo json_encode([
        'error' => 'Invalid response from Notion API',
        'http_code' => $httpCode,
        'url' => $notionApiUrl
    ]);
    exit;
}

// Logger les erreurs HTTP pour /search
if (strpos($endpoint, 'search') !== false && $httpCode >= 400) {
    $responseData = json_decode($response, true);
    error_log(sprintf(
        '[API /search] Erreur HTTP %s | Endpoint: %s | URL: %s | Réponse: %s',
        $httpCode,
        $endpoint,
        $notionApiUrl,
        json_encode($responseData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    ));
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


