<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders(); header('Content-Type: application/json; charset=utf-8');
try{
  $settings=dbGet("SELECT * FROM settings WHERE id=1");
  $personnes=dbAll("SELECT * FROM personnes");
  $historique=dbAll("SELECT * FROM historique");
  echo json_encode(['version'=>'9.0-php','exportedAt'=>gmdate('c'),'settings'=>$settings,'personnes'=>$personnes,'historique'=>$historique], JSON_UNESCAPED_UNICODE);
}catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
