<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders(); header('Content-Type: application/json; charset=utf-8');
try{
  $b=jsonBody();
  $projetCode=strtoupper(trim($b['projetCode']??'')); $nom=trim($b['nom']??''); $telephone=trim($b['telephone']??'');
  if($projetCode==='') sendJson(['error'=>'Projet requis (?p=ACSC-...)'],400);
  if(!preg_match('/^ACSC-\d{4}-\d{4,5}$/',$projetCode)) sendJson(['error'=>'Code projet invalide'],400);
  $proj=dbGet("SELECT code,statutProjet FROM historique WHERE code=?",[$projetCode]); if(!$proj) sendJson(['error'=>'Projet introuvable'],404);
  if(($proj['statutProjet']??'')==='cloture') sendJson(['error'=>'Projet cloture - commande refusee'],403);
  $items=[]; if(isset($b['items']) && is_array($b['items']) && count($b['items'])) $items=$b['items']; else $items=[['site'=>$b['site']??'','montant'=>$b['montant']??0,'quantite'=>$b['quantite']??0,'lienProduit'=>$b['lienProduit']??'','capture'=>$b['capture']??'']];
  if(count($items)<1) sendJson(['error'=>'Au moins 1 article'],400); if(count($items)>10) sendJson(['error'=>'Max 10 articles par envoi'],400);
  foreach($items as $it){ if(!trim((string)($it['site']??''))) sendJson(['error'=>'Site requis'],400); if(!is_numeric($it['montant']??null)||floatval($it['montant'])<=0) sendJson(['error'=>'Montant >0'],400); if(!is_numeric($it['quantite']??null)||intval($it['quantite'])!=floatval($it['quantite'])||intval($it['quantite'])<1) sendJson(['error'=>'Qte >=1'],400); }
  $digits=preg_replace('/\D/','',$telephone); $like='%'.substr($digits,-8);
  $cnt=dbGet("SELECT COUNT(*) as c FROM personnes WHERE projetCode=? AND REPLACE(REPLACE(REPLACE(telephone,' ',''),'-',''),'+','') LIKE ?",[$projetCode,$like]);
  if(intval($cnt['c']??0)+count($items)>3) sendJson(['error'=>'Limite 3 commandes par tel/projet'],429);
  foreach($items as $it){ $err=valPersonne(['nom'=>$nom,'montant'=>floatval($it['montant']),'quantite'=>intval($it['quantite']),'site'=>trim((string)$it['site']),'telephone'=>$telephone,'lienProduit'=>$it['lienProduit']??'','capture'=>$it['capture']??'']); if($err) sendJson(['error'=>$err],400); }
  $pdo=pdoConn(); $pdo->beginTransaction(); $ids=[];
  try{
    $st=$pdo->prepare("INSERT INTO personnes(nom,montant,quantite,site,telephone,statut,projetCode,lienProduit,capture) VALUES(?,?,?,?,?,?,?,?,?)");
    foreach($items as $it){ $st->execute([$nom,floatval($it['montant']),intval($it['quantite']),trim((string)$it['site']),$telephone,'impaye',$projetCode,trim((string)($it['lienProduit']??'')),trim((string)($it['capture']??''))]); $ids[]=(int)$pdo->lastInsertId(); }
    $pdo->commit();
  }catch(Exception $e){ $pdo->rollBack(); throw $e; }
  sendJson(['ok'=>1,'ids'=>$ids,'projetCode'=>$projetCode,'count'=>count($ids)]);
}catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
