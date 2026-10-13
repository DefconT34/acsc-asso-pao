<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders(); header('Content-Type: application/json; charset=utf-8');
try{
  $b=jsonBody();
  $statut=$b['statutProjet']??'en_cours'; if(!in_array($statut,['en_cours','cloture'],true)) $statut='en_cours';
  $code=strtoupper(trim($b['code']??'')); 
  if($code==='') $code=genCodeProjet();
  else{
    if(!preg_match('/^ACSC-\d{4}-\d{4,5}$/',$code)) sendJson(['error'=>'Code invalide (format ACSC-YYYY-####)','suggestion'=>genCodeProjet()],400);
    $ex=dbGet("SELECT id FROM historique WHERE code=?",[$code]); if($ex) sendJson(['error'=>'Code deja utilise','suggestion'=>genCodeProjet()],409);
  }
  $titre=trim((string)($b['titre']??'')); if($titre==='') $titre=$code;
  $data=$b['data']??null; $dataStr=is_string($data)?$data:json_encode($data, JSON_UNESCAPED_UNICODE);
  $r=dbRun("INSERT INTO historique(date,gerant,totalFinal,data,titre,note,code,statutProjet) VALUES(?,?,?,?,?,?,?,?)",[date('d/m/Y H:i:s'),$b['gerant']??'President',$b['totalFinal']??'',$dataStr,$titre,$b['note']??'',$code,$statut]);
  sendJson(['ok'=>1,'id'=>$r['lastID'],'code'=>$code,'statutProjet'=>$statut]);
}catch(Exception $e){ error_log('[POST /api/historique] '.$e->getMessage()); sendJson(['error'=>$e->getMessage()],500); }
