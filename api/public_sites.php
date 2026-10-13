<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders(); header('Content-Type: application/json; charset=utf-8');
try{
  $row=dbGet("SELECT sites FROM settings WHERE id=1"); $sites=json_decode($row['sites']??'[]',true);
  if(!is_array($sites)||!count($sites)) $sites=[['id'=>'site1','label'=>'Site 1','taux'=>615,'devise'=>'USD'],['id'=>'site2','label'=>'Site 2','taux'=>620,'devise'=>'USD'],['id'=>'site3','label'=>'Site 3','taux'=>660,'devise'=>'EUR']];
  sendJson(['ok'=>1,'sites'=>$sites]);
}catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
