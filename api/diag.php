<?php
// ACSC diag - voir FS depuis PHP (via HTTP /api/diag.php)
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
$root = realpath(__DIR__ . '/..');
$public = $root . '/public';
function perms_str($p) { return file_exists($p) ? substr(sprintf('%o', fileperms($p)), -4) : 'missing'; }
function ls($dir) {
    if (!is_dir($dir)) return "not_dir:$dir";
    $list = @scandir($dir);
    if ($list === false) return "scandir_fail";
    // filter . and ..
    $list = array_values(array_filter($list, fn($x)=>$x!=='.'&&$x!=='..'));
    sort($list);
    return $list;
}
$data = [
    'time_utc' => gmdate('Y-m-d\TH:i:s\Z'),
    'php' => PHP_VERSION,
    'pwd' => getcwd(),
    'root' => $root,
    'public' => $public,
    'public_exists' => is_dir($public),
    'ls_root' => ls($root),
    'ls_public' => ls($public),
    'ls_public_detail' => [],
    'version_txt' => @file_get_contents($public.'/version.txt') ?: 'missing_or_unreadable',
    'version_txt_perms' => perms_str($public.'/version.txt'),
    'index_html_exists' => file_exists($public.'/index.html'),
    'index_html_perms' => perms_str($public.'/index.html'),
    'htaccess_root_exists' => file_exists($root.'/.htaccess'),
    'htaccess_root_perms' => perms_str($root.'/.htaccess'),
    'htaccess_root_preview' => substr(@file_get_contents($root.'/.htaccess') ?: '', 0, 800),
    'htaccess_public_exists' => file_exists($public.'/.htaccess'),
    'htaccess_public_perms' => perms_str($public.'/.htaccess'),
    'perms_root' => perms_str($root),
    'perms_public' => perms_str($public),
    'uid' => function_exists('posix_geteuid') ? posix_geteuid() : 'no_posix',
    'user' => function_exists('posix_getpwuid') && function_exists('posix_geteuid') ? (posix_getpwuid(posix_geteuid())['name'] ?? 'unknown') : 'no_posix',
    'home' => getenv('HOME') ?: 'no HOME env',
    'docroot_hint' => $_SERVER['DOCUMENT_ROOT'] ?? 'no DOCUMENT_ROOT',
    'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? 'no SCRIPT_FILENAME',
];
if (is_dir($public)) {
    foreach (ls($public) as $f) {
        $fp = $public.'/'.$f;
        $data['ls_public_detail'][] = $f . ' (' . (is_dir($fp) ? 'dir '.perms_str($fp) : 'file '.perms_str($fp).' '.filesize($fp).'b') . ')';
    }
}
echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
