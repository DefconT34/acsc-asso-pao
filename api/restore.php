<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders(); header('Content-Type: application/json; charset=utf-8');
try{
  $b=jsonBody();
  $pdo=pdoConn(); $pdo->beginTransaction();
  try{
    $pdo->exec("DELETE FROM personnes"); $pdo->exec("DELETE FROM historique");
    if(isset($b['settings']) && is_array($b['settings'])){
      $s=$b['settings'];
      $st=$pdo->prepare("UPDATE settings SET gerant=?,devise=?,taux=?,pays=?,factureTransit=?,poidsTotal=?,sites=? WHERE id=1");
      $st->execute([$s['gerant']??'President',$s['devise']??'USD',$s['taux']??615,$s['pays']??'us',$s['factureTransit']??0,$s['poidsTotal']??0, isset($s['sites'])?(is_string($s['sites'])?$s['sites']:json_encode($s['sites'],JSON_UNESCAPED_UNICODE)):'[]']);
    }
    if(isset($b['personnes']) && is_array($b['personnes'])){
      $st=$pdo->prepare("INSERT INTO personnes(id,nom,montant,quantite,site,telephone,statut,datePaiement,montantPaye,projetCode,lienProduit,capture) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)");
      foreach($b['personnes'] as $p){ $st->execute([$p['id']??null,$p['nom']??'',floatval($p['montant']??0),intval($p['quantite']??1),$p['site']??'site1',$p['telephone']??'',$p['statut']??'impaye',$p['datePaiement']??'',floatval($p['montantPaye']??0),strtoupper(trim($p['projetCode']??'')),$p['lienProduit']??'',$p['capture']??'']); }
    }
    if(isset($b['historique']) && is_array($b['historique'])){
      $st=$pdo->prepare("INSERT INTO historique(id,date,gerant,totalFinal,data,titre,note,code,statutProjet) VALUES(?,?,?,?,?,?,?,?,?)");
      foreach($b['historique'] as $h){ $c=trim($h['code']??''); if($c==='') $c='ACSC-'.date('Y').'-'.str_pad((string)($h['id']??0),4,'0',STR_PAD_LEFT); $st->execute([$h['id']??null,$h['date']??'', $h['gerant']??'', $h['totalFinal']??'', is_string($h['data']??null)?$h['data']:json_encode($h['data']??null,JSON_UNESCAPED_UNICODE), $h['titre']??$c, $h['note']??'', $c, $h['statutProjet']??'en_cours']); }
    }
    $pdo->commit(); sendJson(['ok'=>1]);
  }catch(Exception $e){ $pdo->rollBack(); throw $e; }
}catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
