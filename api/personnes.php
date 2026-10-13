<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders();
header('Content-Type: application/json; charset=utf-8');
$method=$_SERVER['REQUEST_METHOD']??'GET';
try{
if($method==='GET'){
  $q=trim($_GET['q']??''); $site=trim($_GET['site']??''); $statut=trim($_GET['statut']??''); $sort=$_GET['sort']??''; $projetCode=strtoupper(trim($_GET['projetCode']??$_GET['code']??''));
  $hasPage=isset($_GET['page'])&&$_GET['page']!==''; $hasLimit=isset($_GET['limit'])&&$_GET['limit']!==''; $page=max(1,intval($_GET['page']??1)); $limit=min(200,max(1,intval($_GET['limit']??200))); $paginated=$hasPage||$hasLimit;
  $where=[]; $params=[];
  if($q!==''){ $where[]="(nom LIKE ? OR telephone LIKE ? OR lienProduit LIKE ? OR projetCode LIKE ?)"; array_push($params,"%$q%","%$q%","%$q%","%$q%"); }
  if($site!==''){ $where[]="site=?"; $params[]=$site; }
  if($statut!==''){ $where[]="statut=?"; $params[]=$statut; }
  if($projetCode!==''){ $where[]="projetCode=?"; $params[]=$projetCode; }
  $whereSql=count($where)?"WHERE ".implode(" AND ",$where):"";
  $order="ORDER BY id ASC";
  if($sort==='montant_desc') $order="ORDER BY montant DESC";
  else if($sort==='montant_asc') $order="ORDER BY montant ASC";
  else if($sort==='qte_desc') $order="ORDER BY quantite DESC";
  else if($sort==='nom') $order="ORDER BY nom ASC";
  if(!$paginated){ $rows=dbAll("SELECT * FROM personnes $whereSql $order",$params); echo json_encode($rows,JSON_UNESCAPED_UNICODE); exit; }
  $totalRow=dbGet("SELECT COUNT(*) as c FROM personnes $whereSql",$params); $total=intval($totalRow['c']??0); $offset=($page-1)*$limit;
  $rows=dbAll("SELECT * FROM personnes $whereSql $order LIMIT ? OFFSET ?",array_merge($params,[$limit,$offset]));
  echo json_encode(['rows'=>$rows,'total'=>$total,'page'=>$page,'limit'=>$limit,'pages'=>(int)ceil($total/$limit)],JSON_UNESCAPED_UNICODE); exit;
}
if($method==='POST'){
  $b=jsonBody(); $err=valPersonne($b); if($err) sendJson(['error'=>$err],400);
  $r=dbRun("INSERT INTO personnes(nom,montant,quantite,site,telephone,statut,datePaiement,montantPaye,projetCode,lienProduit,capture) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",[
    $b['nom'], floatval($b['montant']), intval($b['quantite']), $b['site'], $b['telephone']??'', $b['statut']??'impaye', $b['datePaiement']??'', floatval($b['montantPaye']??0), strtoupper(trim($b['projetCode']??'')), $b['lienProduit']??'', $b['capture']??''
  ]);
  sendJson(['id'=>$r['lastID']]);
}
sendJson(['error'=>'method not allowed'],405);
}catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
