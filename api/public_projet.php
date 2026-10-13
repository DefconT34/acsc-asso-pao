<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders(); header('Content-Type: application/json; charset=utf-8');
try{
  $code=strtoupper(trim($_GET['code']??$_GET['p']??'')); if($code==='') sendJson(['error'=>'Code manquant (?p=ACSC-... ou ?code=...)'],400);
  if(!preg_match('/^ACSC-\d{4}-\d{4,5}$/',$code)) sendJson(['error'=>'Code projet invalide'],400);
  $row=dbGet("SELECT id,code,titre,note,date,gerant,statutProjet FROM historique WHERE code=?",[$code]); if(!$row) sendJson(['error'=>'Projet introuvable: '.$code],404);
  $srow=dbGet("SELECT sites FROM settings WHERE id=1"); $sites=json_decode($srow['sites']??'[]',true); if(!is_array($sites)) $sites=[];
  sendJson(['ok'=>1,'projet'=>$row,'sites'=>$sites]);
}catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
