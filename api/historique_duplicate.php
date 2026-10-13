<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders(); header('Content-Type: application/json; charset=utf-8');
try{
  $id=$_ROUTE_PARAMS['id']??null; if(!$id){ $u=parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH); if(preg_match('#/historique/(\d+)/duplicate#',$u,$m)) $id=$m[1]; }
  $row=dbGet("SELECT * FROM historique WHERE id=?",[intval($id)]); if(!$row) sendJson(['error'=>'not found'],404);
  $newCode=genCodeProjet(); $newTitre=trim((string)($row['titre']??'')); if($newTitre==='') $newTitre=$newCode; else $newTitre.=" (copie)";
  $r=dbRun("INSERT INTO historique(date,gerant,totalFinal,data,titre,note,code,statutProjet) VALUES(?,?,?,?,?,?,?,?)",[date('d/m/Y H:i:s'),$row['gerant'],$row['totalFinal'],$row['data'],$newTitre,$row['note']??'',$newCode,'en_cours']);
  sendJson(['ok'=>1,'id'=>$r['lastID'],'code'=>$newCode]);
}catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
