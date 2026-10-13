<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders();
header('Content-Type: application/json; charset=utf-8');
try{
  $id=$_ROUTE_PARAMS['id']??$_GET['id']??null;
  if(!$id){ $uri=parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH); if(preg_match('#/personnes/(\d+)#',$uri,$m)) $id=$m[1]; }
  $b=jsonBody(); $err=valPersonne($b); if($err) sendJson(['error'=>$err],400);
  dbRun("UPDATE personnes SET nom=?,montant=?,quantite=?,site=?,telephone=?,statut=?,datePaiement=?,montantPaye=?,projetCode=?,lienProduit=?,capture=? WHERE id=?",[
    $b['nom'],floatval($b['montant']),intval($b['quantite']),$b['site'],$b['telephone']??'',$b['statut']??'impaye',$b['datePaiement']??'',floatval($b['montantPaye']??0),strtoupper(trim($b['projetCode']??'')),$b['lienProduit']??'',$b['capture']??'',intval($id)
  ]);
  sendJson(['ok'=>1]);
}catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
