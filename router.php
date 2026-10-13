<?php
// router.php - pour php -S local dev (php -S localhost:8000 router.php)
// Simule le .htaccess : /api/* -> api/index.php, /health -> api/health.php, SPA -> public/index.html
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = __DIR__ . $uri;
if ($uri === '/health') { require __DIR__ . '/api/health.php'; return; }
if (str_starts_with($uri, '/api/')) { require __DIR__ . '/api/index.php'; return; }
if ($uri === '/api' || $uri === '/api/health') { require __DIR__ . '/api/index.php'; return; }
// fichier statique existant
if ($uri !== '/' && file_exists($path) && is_file($path)) return false;
// public/*
if (file_exists(__DIR__ . '/public' . $uri) && is_file(__DIR__ . '/public' . $uri)) {
  $ext = pathinfo(__DIR__ . '/public' . $uri, PATHINFO_EXTENSION);
  $map = ['html'=>'text/html','js'=>'application/javascript','css'=>'text/css','json'=>'application/json','svg'=>'image/svg+xml'];
  if (isset($map[$ext])) header('Content-Type: '.$map[$ext].'; charset=utf-8');
  readfile(__DIR__ . '/public' . $uri); return;
}
if (preg_match('#\.(js|css|json|svg|png|jpg|webp|ico)$#', $uri) && file_exists(__DIR__.'/public'.$uri)) return false;
// SPA fallback
header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/public/index.html');
