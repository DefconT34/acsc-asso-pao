<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders();
header('Content-Type: application/json; charset=utf-8');
try{
  $s=dbGet("SELECT pin FROM settings WHERE id=1");
  $hash=trim((string)($s['pin']??''));
  if($hash===''){ sendJson(['ok'=>1,'needPin'=>false]); }
  $b=jsonBody();
  $pin=trim((string)($b['pin']??''));
  $ok=false;
  if($hash!=='' && $pin!==''){
    if(password_verify($pin,$hash)) $ok=true;
    else if(hash('sha256',$pin)===$hash) $ok=true; // compat ancien Node fallback sha256
    else if($pin===$hash) $ok=true;
  }
  if($ok) sendJson(['ok'=>1,'needPin'=>true,'valid'=>true]);
  sendJson(['ok'=>0,'valid'=>false],401);
}catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
