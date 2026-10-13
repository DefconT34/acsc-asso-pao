<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders(); header('Content-Type: application/json; charset=utf-8');
try{
  $code=strtoupper(trim($_ROUTE_PARAMS['code']??$_GET['code']??'')); if(!$code){ $u=parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH); if(preg_match('#/by-projet/([^/]+)#',$u,$m)) $code=strtoupper(trim($m[1])); }
  echo json_encode(dbAll("SELECT * FROM personnes WHERE projetCode=?",[$code]), JSON_UNESCAPED_UNICODE);
}catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
