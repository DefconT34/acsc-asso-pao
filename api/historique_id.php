<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders(); header('Content-Type: application/json; charset=utf-8');
try{
  $id=$_ROUTE_PARAMS['id']??null; if(!$id){ $u=parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH); if(preg_match('#/historique/(\d+)#',$u,$m)) $id=$m[1]; }
  $row=dbGet("SELECT * FROM historique WHERE id=?",[intval($id)]); if(!$row) sendJson(['error'=>'not found'],404);
  echo json_encode($row, JSON_UNESCAPED_UNICODE);
}catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
