<?php
// api/index.php - Router PHP unique (o2switch: DirectoryIndex api)
// Reecrit /api/* -> api/index.php via .htaccess, puis dispatch interne
require_once __DIR__.'/_helpers.php';
corsHeaders();

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$uri = rtrim($uri ?? '/', '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Normalise: /api/settings , /api/personnes/5, /api/historique/by-code/ACSC-2026-0001, /api/public/sites, /health
// Supporte aussi direct /health sans /api
if ($uri === '/health') { require __DIR__.'/health.php'; exit; }

// Retire prefix /api si present
if (str_starts_with($uri, '/api')) $uri = substr($uri, 4) ?: '/';
if ($uri === '') $uri = '/';

// Route map
$routes = [
  'GET /settings' => 'settings.php',
  'POST /settings' => 'settings.php',
  'POST /pin/check' => 'pin_check.php',
  'GET /personnes' => 'personnes.php',
  'POST /personnes' => 'personnes.php',
  'PUT /personnes/{id}' => 'personnes_put.php',
  'PATCH /personnes/{id}/statut' => 'personnes_statut.php',
  'DELETE /personnes/{id}' => 'personnes_delete.php',
  'GET /personnes/by-projet/{code}' => 'personnes_by_projet.php',
  'GET /historique' => 'historique.php',
  'GET /projets' => 'projets.php',
  'GET /historique-all' => 'historique_all.php',
  'GET /historique/by-code/{code}' => 'historique_by_code.php',
  'PATCH /historique/by-code/{code}' => 'historique_by_code.php',
  'GET /historique/{id}' => 'historique_id.php',
  'POST /historique' => 'historique_create.php',
  'PATCH /historique/{id}' => 'historique_patch_id.php',
  'DELETE /historique/purge-autosave' => 'historique_purge.php',
  'POST /historique/{id}/duplicate' => 'historique_duplicate.php',
  'DELETE /historique/{id}' => 'historique_delete.php',
  'DELETE /historique' => 'historique_delete.php',
  'GET /backup' => 'backup.php',
  'POST /restore' => 'restore.php',
  'GET /commande/{code}' => 'commande_get.php',
  'POST /commande' => 'commande_post.php',
  'GET /public/sites' => 'public_sites.php',
  'GET /public/projet' => 'public_projet.php',
  'GET /public/mes-commandes' => 'public_mes_commandes.php',
  'POST /public/commande' => 'public_commande.php',
  'GET /health' => 'health.php',
];

function matchRoute(string $method, string $uri, array $routes): ?array {
  $m = strtoupper($method);
  // Exact first
  $key = "$m $uri";
  if (isset($routes[$key])) return [$routes[$key], []];
  // Pattern with {id}/{code}
  foreach ($routes as $pattern => $file) {
    [$pm,$pp] = explode(' ', $pattern, 2);
    if ($pm !== $m) continue;
    // Build regex
    $rx = preg_replace('#\{[^}]+\}#', '([^/]+)', $pp);
    $rx = '#^' . $rx . '$#';
    if (preg_match($rx, $uri, $matches)) {
      array_shift($matches);
      // extract param names
      preg_match_all('#\{([^}]+)\}#', $pp, $names);
      $params = [];
      foreach ($names[1] as $i=>$n) $params[$n] = $matches[$i] ?? null;
      return [$file, $params];
    }
  }
  return null;
}

require_once __DIR__.'/_helpers.php';
header('X-ACSC-Version: 9.0-php');

// Global rate limit API (300 / 15min comme Node)
rateLimitCheck('api_global', 15*60, 300, 'Trop de requetes');

$matched = matchRoute($method, $uri, $routes);
if ($matched) {
  [$file,$params] = $matched;
  $_ROUTE_PARAMS = $params;
  // Pin / Commande specific limits
  if ($file === 'pin_check.php') rateLimitCheck('pin', 15*60, 20, 'Trop de tentatives PIN');
  if (in_array($file, ['commande_post.php','public_commande.php'], true)) rateLimitCheck('commande', 60, 30, 'Trop de commandes, reessayez dans 1 min');
  require __DIR__ . '/' . $file;
  exit;
}

// Fallback SPA
if (!str_starts_with($uri, '/api') && !str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/api')) {
  // deja gere par Apache fallback, mais au cas ou
  $idx = realpath(__DIR__.'/../public/index.html');
  if ($idx && file_exists($idx)) { header('Content-Type: text/html; charset=utf-8'); readfile($idx); exit; }
}

http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['error'=>'not found','uri'=>$uri,'method'=>$method], JSON_UNESCAPED_UNICODE);
