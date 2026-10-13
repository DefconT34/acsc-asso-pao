<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
header('Content-Type: application/json; charset=utf-8');
try{
  if($method==='GET'){
    $row=dbGet("SELECT * FROM settings WHERE id=1");
    echo json_encode($row?:['id'=>1], JSON_UNESCAPED_UNICODE); exit;
  }
  if($method==='POST'){
    $b=jsonBody();
    $err=valSettings($b); if($err) sendJson(['error'=>$err],400);
    if(array_key_exists('pin',$b)){
      $pinVal=trim((string)($b['pin']??''));
      if($pinVal!=='' && !preg_match('/^\d{4,8}$/',$pinVal)) sendJson(['error'=>'PIN doit etre 4-8 chiffres'],400);
      $hash=$pinVal!=='' ? password_hash($pinVal, PASSWORD_DEFAULT) : '';
      // compat: si hash bcrypt non dispo, fallback sha (mais password_hash ok en PHP 8)
      dbRun("UPDATE settings SET pin=? WHERE id=1",[$hash]);
    }
    $sitesJson = json_encode($b['sites']??[], JSON_UNESCAPED_UNICODE);
    dbRun("UPDATE settings SET gerant=?,devise=?,taux=?,pays=?,factureTransit=?,poidsTotal=?,sites=? WHERE id=1",[
      $b['gerant']??'President',$b['devise']??'USD',$b['taux']??615,$b['pays']??'us',$b['factureTransit']??48000,$b['poidsTotal']??3.5,$sitesJson
    ]);
    sendJson(['ok'=>1]);
  }
  sendJson(['error'=>'method not allowed'],405);
}catch(Exception $e){ error_log('[POST /api/settings] '.$e->getMessage()); sendJson(['error'=>$e->getMessage()],500); }
