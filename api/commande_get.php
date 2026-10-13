<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders(); header('Content-Type: application/json; charset=utf-8');
try{
  $code=strtoupper(trim($_ROUTE_PARAMS['code']??'')); if(!$code){ $u=parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH); if(preg_match('#/commande/([^/]+)#',$u,$m)) $code=strtoupper(trim($m[1])); }
  if(!preg_match('/^ACSC-\d{4}-\d{4,5}$/',$code)) sendJson(['error'=>'Code invalide'],400);
  $row=dbGet("SELECT id,code,titre,statutProjet,gerant FROM historique WHERE code=?",[$code]); if(!$row) sendJson(['error'=>'Projet introuvable'],404);
  if(($row['statutProjet']??'')==='cloture') sendJson(['error'=>'Projet cloture'],403);
  $pers=dbAll("SELECT id,nom,site,telephone,statut FROM personnes WHERE projetCode=?",[$code]);
  sendJson(['ok'=>1,'projet'=>$row,'commandes'=>$pers]);
}catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
