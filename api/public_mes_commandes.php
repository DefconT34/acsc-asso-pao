<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders(); header('Content-Type: application/json; charset=utf-8');
try{
  $tel=trim($_GET['telephone']??''); $code=strtoupper(trim($_GET['code']??'')); if($tel==='') sendJson(['error'=>'Telephone requis'],400);
  $digits=substr(preg_replace('/\D/','',$tel),-8); $like='%'.$digits;
  if($code!=='') $rows=dbAll("SELECT * FROM personnes WHERE projetCode=? AND REPLACE(REPLACE(REPLACE(telephone,' ',''),'-',''),'+','') LIKE ? ORDER BY id DESC LIMIT 20",[$code,$like]);
  else $rows=dbAll("SELECT * FROM personnes WHERE REPLACE(REPLACE(REPLACE(telephone,' ',''),'-',''),'+','') LIKE ? ORDER BY id DESC LIMIT 20",[$like]);
  sendJson(['ok'=>1,'rows'=>$rows]);
}catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
