<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders(); header('Content-Type: application/json; charset=utf-8');
$method=$_SERVER['REQUEST_METHOD']??'GET';
try{
  $code=strtoupper(trim($_ROUTE_PARAMS['code']??'')); if(!$code){ $u=parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH); if(preg_match('#/by-code/([^/]+)#',$u,$m)) $code=strtoupper(trim($m[1])); }
  if(!preg_match('/^ACSC-\d{4}-\d{4,5}$/',$code)) sendJson(['error'=>'Code invalide'],400);
  if($method==='GET'){
    $row=dbGet("SELECT * FROM historique WHERE code=?",[$code]); if(!$row) sendJson(['error'=>'not found'],404);
    echo json_encode($row, JSON_UNESCAPED_UNICODE); exit;
  }
  if($method==='PATCH'){
    $row=dbGet("SELECT * FROM historique WHERE code=?",[$code]); if(!$row) sendJson(['error'=>'not found'],404);
    $b=jsonBody();
    $newCode=array_key_exists('code',$b)?strtoupper(trim((string)$b['code'])):($b['code']??$row['code']); // support alias code
    // also support newCodeRaw from older API
    if(isset($b['newCode'])) $newCode=strtoupper(trim((string)$b['newCode']));
    if(array_key_exists('code',$b)) $newCode=strtoupper(trim((string)$b['code'])); else $newCode=$row['code'];
    if(!empty($b['code'])) $newCode=strtoupper(trim((string)$b['code']));
    // normalize: if body has code field use it else keep row code
    $bodyCode = $b['code'] ?? $b['newCode'] ?? null;
    if($bodyCode!==null) $newCode=strtoupper(trim((string)$bodyCode)); else $newCode=$row['code'];
    if($newCode && !preg_match('/^ACSC-\d{4}-\d{4,5}$/',$newCode)) sendJson(['error'=>'Code invalide'],400);
    if($newCode && $newCode!==$row['code']){ $dup=dbGet("SELECT id FROM historique WHERE code=?",[$newCode]); if($dup) sendJson(['error'=>'Code deja utilise'],409); }
    $statutProjet=$b['statutProjet']??null;
    if($statutProjet && !in_array($statutProjet,['en_cours','cloture'],true)) $statutProjet=$row['statutProjet'];
    $next=$statutProjet?:($row['statutProjet']??'en_cours');
    if($row['statutProjet']==='cloture' && $next==='cloture' && (array_key_exists('data',$b)||array_key_exists('totalFinal',$b))) sendJson(['error'=>'Projet cloture - modification bloquee'],403);
    $newTitre=array_key_exists('titre',$b)?trim((string)$b['titre']):$row['titre'];
    $newNote=array_key_exists('note',$b)?(string)$b['note']:$row['note'];
    $newData=$row['data']; if(array_key_exists('data',$b)) $newData=is_string($b['data'])?$b['data']:json_encode($b['data'],JSON_UNESCAPED_UNICODE);
    $newTotal=array_key_exists('totalFinal',$b)?(string)$b['totalFinal']:$row['totalFinal'];
    $newGerant=array_key_exists('gerant',$b)?(string)$b['gerant']:$row['gerant'];
    $newDate=date('d/m/Y H:i:s');
    dbRun("UPDATE historique SET titre=?,note=?,code=?,statutProjet=?,data=?,totalFinal=?,gerant=?,date=? WHERE id=?",[$newTitre,$newNote,$newCode?:$row['code'],$next,$newData,$newTotal,$newGerant,$newDate,intval($row['id'])]);
    sendJson(['ok'=>1,'code'=>$newCode?:$row['code'],'statutProjet'=>$next]);
  }
  sendJson(['error'=>'method not allowed'],405);
}catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
