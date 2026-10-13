<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders(); header('Content-Type: application/json; charset=utf-8');
try{
  $id=$_ROUTE_PARAMS['id']??null; if(!$id){ $u=parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH); if(preg_match('#/historique/(\d+)#',$u,$m)) $id=$m[1]; }
  $row=dbGet("SELECT * FROM historique WHERE id=?",[intval($id)]); if(!$row) sendJson(['error'=>'not found'],404);
  $b=jsonBody();
  $newCode=array_key_exists('code',$b)?strtoupper(trim((string)$b['code'])):$row['code'];
  if($newCode && !preg_match('/^ACSC-\d{4}-\d{4,5}$/',$newCode)) sendJson(['error'=>'Code invalide (format ACSC-YYYY-####)'],400);
  if($newCode && $newCode!==$row['code']){ $dup=dbGet("SELECT id FROM historique WHERE code=? AND id!=?",[$newCode,intval($id)]); if($dup) sendJson(['error'=>'Code deja utilise'],409); }
  $statut=$b['statutProjet']??null; if($statut && !in_array($statut,['en_cours','cloture'],true)) $statut=$row['statutProjet'];
  $next=$statut?:($row['statutProjet']??'en_cours');
  if($row['statutProjet']==='cloture' && $next==='cloture' && (array_key_exists('data',$b)||array_key_exists('totalFinal',$b))) sendJson(['error'=>"Projet cloture - modification bloquee (reouvrir d'abord)"],403);
  $newTitre=array_key_exists('titre',$b)?trim((string)$b['titre']):$row['titre'];
  $newNote=array_key_exists('note',$b)?(string)$b['note']:$row['note'];
  $newData=$row['data']; if(array_key_exists('data',$b)) $newData=is_string($b['data'])?$b['data']:json_encode($b['data'],JSON_UNESCAPED_UNICODE);
  $newTotal=array_key_exists('totalFinal',$b)?(string)$b['totalFinal']:$row['totalFinal'];
  $newGerant=array_key_exists('gerant',$b)?(string)$b['gerant']:$row['gerant'];
  $newDate=date('d/m/Y H:i:s');
  dbRun("UPDATE historique SET titre=?,note=?,code=?,statutProjet=?,data=?,totalFinal=?,gerant=?,date=? WHERE id=?",[$newTitre,$newNote,$newCode?:$row['code'],$next,$newData,$newTotal,$newGerant,$newDate,intval($id)]);
  sendJson(['ok'=>1,'code'=>$newCode?:$row['code'],'statutProjet'=>$next]);
}catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
