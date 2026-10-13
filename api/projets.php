<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders(); header('Content-Type: application/json; charset=utf-8');
try{
  $q=trim($_GET['q']??''); $statut=$_GET['statut']??''; $where=''; $params=[];
  if($q!=='' && $statut!==''){ $where="WHERE (titre LIKE ? OR code LIKE ? OR note LIKE ?) AND statutProjet=?"; $params=["%$q%","%$q%","%$q%",$statut]; }
  else if($q!==''){ $where="WHERE (titre LIKE ? OR code LIKE ? OR note LIKE ?)"; $params=["%$q%","%$q%","%$q%"]; }
  else if($statut!==''){ $where="WHERE statutProjet=?"; $params=[$statut]; }
  echo json_encode(dbAll("SELECT id,code,titre,note,statutProjet,date,gerant,totalFinal FROM historique $where ORDER BY id DESC",$params), JSON_UNESCAPED_UNICODE);
}catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
