<?php
// api/config.php - ACSC v9.0-php
// o2switch cPanel > MySQL Databases : DB koko6788_acsc + user koko6788_acscuser
// Pour local XAMPP : modifie ici ou cree api/config.local.php (gitignore)
// Priorite : 1) config.local.php 2) SetEnv/ getenv 3) valeurs ci-dessous

$local = __DIR__ . '/config.local.php';
if (file_exists($local)) {
  return require $local;
}

// Fallback getenv (SetEnv dans .htaccess ou variables cPanel)
function _env($k, $def=''){ $v = getenv($k); return ($v!==false && $v!=='') ? $v : $def; }

return [
  'db_host' => _env('DB_HOST', _env('MYSQL_HOST', '127.0.0.1')),
  'db_port' => (int)_env('DB_PORT', _env('MYSQL_PORT', '3306')),
  'db_user' => _env('DB_USER', _env('MYSQL_USER', 'koko6788_acscuser')),
  'db_pass' => _env('DB_PASSWORD', _env('MYSQL_PASSWORD', '')),
  'db_name' => _env('DB_NAME', _env('MYSQL_DATABASE', 'koko6788_acsc')),
  'allowed_origins' => _env('ALLOWED_ORIGINS', ''),
];
