<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders(); header('Content-Type: application/json; charset=utf-8');
try{
  $page=max(1,intval($_GET['page']??1)); $limit=min(100,max(1,intval($_GET['limit']??20))); $q=trim($_GET['q']??''); $offset=($page-1)*$limit;
  $statutQ=$_GET['statut']??''; $gerantQ=trim($_GET['gerant']??'');
  $where=''; $params=[];
  if($q!=='' && $statutQ!==''){ $where="WHERE (gerant LIKE ? OR totalFinal LIKE ? OR titre LIKE ? OR note LIKE ? OR date LIKE ? OR code LIKE ?) AND statutProjet=?"; $params=["%$q%","%$q%","%$q%","%$q%","%$q%","%$q%",$statutQ]; }
  else if($q!==''){ $where="WHERE (gerant LIKE ? OR totalFinal LIKE ? OR titre LIKE ? OR note LIKE ? OR date LIKE ? OR code LIKE ?)"; $params=["%$q%","%$q%","%$q%","%$q%","%$q%","%$q%"]; }
  else if($statutQ!==''){ $where="WHERE statutProjet=?"; $params=[$statutQ]; }
  if($gerantQ!==''){ $cl="gerant LIKE ?"; $pa="%$gerantQ%"; if($where!==''){ $where.=" AND $cl"; $params[]=$pa; } else { $where="WHERE $cl"; $params=[$pa]; } }
  if(isset($_GET['all'])){ echo json_encode(dbAll("SELECT * FROM historique $where ORDER BY id DESC",$params),JSON_UNESCAPED_UNICODE); exit; }
  $totalRow=dbGet("SELECT COUNT(*) AS c FROM historique $where",$params); $total=intval($totalRow['c']??0);
  $rows=dbAll("SELECT * FROM historique $where ORDER BY id DESC LIMIT ? OFFSET ?", array_merge($params,[$limit,$offset]));
  echo json_encode(['rows'=>$rows,'total'=>$total,'page'=>$page,'limit'=>$limit,'pages'=>(int)ceil($total/$limit)], JSON_UNESCAPED_UNICODE);
}catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
