<?php
// api/_helpers.php - helpers shared (rate limit, cors, json I/O)
function jsonBody(): array {
  $raw = file_get_contents('php://input');
  if ($raw === '' || $raw === false) return [];
  $j = json_decode($raw, true);
  return is_array($j) ? $j : [];
}
function sendJson($data, int $code=200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
  exit;
}
function corsHeaders(): void {
  $allowed = getenv('ALLOWED_ORIGINS') ?: '';
  $list = array_filter(array_map('trim', explode(',', $allowed)));
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if ($origin !== '' && count($list) > 0) {
    $ok = in_array($origin, $list, true) || in_array('*', $list, true);
    if (!$ok) {
      try{ $h=parse_url($origin, PHP_URL_HOST); if($h && (str_ends_with($h,'thecigarodyssey.com')||str_ends_with($h,'odns.fr')||$h==='localhost'||$h==='127.0.0.1')) $ok=true; }catch(Exception $e){}
    }
    if (!$ok) { http_response_code(403); header('Content-Type: application/json; charset=utf-8'); echo json_encode(['error'=>'CORS bloque: '.$origin]); exit; }
  }
  if ($origin !== '') {
    header('Access-Control-Allow-Origin: '.$origin);
    header('Access-Control-Allow-Credentials: true');
  } else {
    header('Access-Control-Allow-Origin: *');
  }
  header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
  header('Vary: Origin');
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
}
function rateLimitCheck(string $key, int $windowSec, int $max, string $msg='Trop de requetes'): void {
  $dir = __DIR__ . '/tmp';
  if (!is_dir($dir)) @mkdir($dir, 0775, true);
  $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
  $file = $dir . '/rl_' . md5($key.'_'.$ip) . '.json';
  $now = time();
  $data = ['ts'=>[]];
  if (file_exists($file)) { $raw=@file_get_contents($file); $j=json_decode($raw,true); if(is_array($j)&&isset($j['ts'])) $data=$j; }
  $cut = $now - $windowSec;
  $data['ts'] = array_values(array_filter($data['ts'], fn($t)=>$t>$cut));
  if (count($data['ts']) >= $max) {
    header('Retry-After: '. $windowSec);
    sendJson(['error'=>$msg], 429);
  }
  $data['ts'][] = $now;
  @file_put_contents($file, json_encode($data), LOCK_EX);
}
function normCode(string $c): string { return strtoupper(trim($c)); }
function isValidCode(string $c): bool { return (bool)preg_match('/^ACSC-\d{4}-\d{4,5}$/', $c); }
