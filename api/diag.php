<?php
// ACSC diag - voir FS depuis PHP (via HTTP /api/diag.php) - MULTI-HOME comprehensive
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
$root = realpath(__DIR__ . '/..');
$public = $root . '/public';
function perms_str($p) { return file_exists($p) ? substr(sprintf('%o', fileperms($p)), -4) : 'missing'; }
function ls($dir) {
    if (!is_dir($dir)) return "not_dir:$dir";
    $list = @scandir($dir);
    if ($list === false) return "scandir_fail";
    $list = array_values(array_filter($list, fn($x)=>$x!=='.'&&$x!=='..'));
    sort($list);
    return $list;
}
function ls_detail($dir) {
    $out=[];
    if(!is_dir($dir)) return $out;
    foreach (ls($dir) as $f) {
        $fp=$dir.'/'.$f;
        $out[]=$f.' ('.(is_dir($fp)?'dir '.perms_str($fp):'file '.perms_str($fp).' '.@filesize($fp).'b').')';
    }
    return $out;
}
$candidates = [
    $root,
    realpath(__DIR__.'/../..').'/acsc-asso-pao',
    '/home/koko6788/acsc-asso-pao',
    '/home2/koko6788/acsc-asso-pao',
    getenv('HOME') ? getenv('HOME').'/acsc-asso-pao' : 'no HOME',
    $_SERVER['DOCUMENT_ROOT'] ?? 'no docroot',
    dirname($_SERVER['SCRIPT_FILENAME'] ?? '').'/..',
];
$candidates = array_values(array_unique(array_filter($candidates)));
$data = [
    'time_utc' => gmdate('Y-m-d\TH:i:s\Z'),
    'php' => PHP_VERSION,
    'pwd' => getcwd(),
    'root' => $root,
    'public' => $public,
    'public_exists' => is_dir($public),
    'ls_root' => ls($root),
    'ls_root_detail' => ls_detail($root),
    'ls_public' => ls($public),
    'ls_public_detail' => ls_detail($public),
    'version_txt' => @file_get_contents($public.'/version.txt') ?: 'missing_or_unreadable',
    'version_txt_perms' => perms_str($public.'/version.txt'),
    'index_html_exists' => file_exists($public.'/index.html'),
    'index_html_perms' => perms_str($public.'/index.html'),
    'index_html_size' => file_exists($public.'/index.html') ? filesize($public.'/index.html') : 0,
    'htaccess_root_exists' => file_exists($root.'/.htaccess'),
    'htaccess_root_perms' => perms_str($root.'/.htaccess'),
    'htaccess_root_preview' => substr(@file_get_contents($root.'/.htaccess') ?: '', 0, 1200),
    'htaccess_root_size' => file_exists($root.'/.htaccess') ? filesize($root.'/.htaccess') : 0,
    'htaccess_public_exists' => file_exists($public.'/.htaccess'),
    'htaccess_public_perms' => perms_str($public.'/.htaccess'),
    'htaccess_public_preview' => substr(@file_get_contents($public.'/.htaccess') ?: '', 0, 600),
    'perms_root' => perms_str($root),
    'perms_public' => perms_str($public),
    'perms_home' => perms_str(getenv('HOME') ?: '/home/koko6788'),
    'uid' => function_exists('posix_geteuid') ? posix_geteuid() : 'no_posix',
    'user' => function_exists('posix_getpwuid') && function_exists('posix_geteuid') ? (posix_getpwuid(posix_geteuid())['name'] ?? 'unknown') : 'no_posix',
    'home' => getenv('HOME') ?: 'no HOME env',
    'docroot_hint' => $_SERVER['DOCUMENT_ROOT'] ?? 'no DOCUMENT_ROOT',
    'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? 'no SCRIPT_FILENAME',
    'script_dir' => __DIR__,
    'candidates' => [],
];
foreach ($candidates as $cand) {
    $cand = is_string($cand) ? $cand : strval($cand);
    $real = @realpath($cand) ?: $cand;
    $info = [
        'path' => $cand,
        'real' => $real,
        'exists' => file_exists($real),
        'is_dir' => is_dir($real),
        'perms' => perms_str($real),
        'ls' => is_dir($real) ? ls($real) : 'not_dir',
        'ls_detail' => is_dir($real) ? array_slice(ls_detail($real),0,20) : [],
        'public_ls' => is_dir($real.'/public') ? ls($real.'/public') : 'no_public',
        'public_detail' => is_dir($real.'/public') ? array_slice(ls_detail($real.'/public'),0,20) : [],
        'version_txt' => @file_get_contents($real.'/public/version.txt') ?: 'missing',
        'htaccess_preview' => substr(@file_get_contents($real.'/.htaccess') ?: '',0,400),
        'htaccess_public_preview' => substr(@file_get_contents($real.'/public/.htaccess') ?: '',0,300),
    ];
    $data['candidates'][] = $info;
}
echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
