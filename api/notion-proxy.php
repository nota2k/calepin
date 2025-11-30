<?php
/**
 * Proxy pour l'API Notion en production
 * Gère les requêtes vers l'API Notion côté serveur pour éviter les problèmes CORS
 * et protéger la clé APIs
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

// Récupérer la clé API Notion depuis les variables d'environnement
$notionSecret = getenv('NOTION_SECRET') ?: getenv('VITE_NOTION_SECRET');

if (empty($notionSecret)) {
    http_response_code(500);
    echo json_encode([
        'error' => 'NOTION_SECRET not configured',
        'message' => 'Please configure NOTION_SECRET or VITE_NOTION_SECRET as environment variable'
    ]);
    exit;
}

// Extraire le chemin de l'endpoint Notion depuis l'URL
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);

// Extraire l'endpoint Notion (enlever /api/notion)
$endpoint = '';
if (preg_match('#/api/notion(/.*)$#', $path, $matches)) {
    $endpoint = $matches[1];
} else {
    // Si pas trouvé, essayer depuis REQUEST_URI direct
    if (preg_match('#/api/notion(/.*)$#', $requestUri, $matches)) {
        $endpoint = $matches[1];
    }
}

// Nettoyer l'endpoint
$endpoint = ltrim($endpoint, '/');

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

