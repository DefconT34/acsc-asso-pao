<?php
require_once __DIR__.'/_helpers.php';
corsHeaders();
header('Content-Type: application/json; charset=utf-8');
try{
  require_once __DIR__.'/_db.php';
  pdoConn()->query("SELECT 1");
  $cfg=$GLOBALS['_ACSC_CFG'];
  echo json_encode(['ok'=>1,'version'=>'9.0-php','db'=>$cfg['db_name'],'dialect'=>'mysql','poolOk'=>true,'php'=>PHP_VERSION], JSON_UNESCAPED_UNICODE);
}catch(Exception $e){
  http_response_code(500);
  echo json_encode(['ok'=>0,'error'=>$e->getMessage(),'hint'=>'Verifie api/config.php et cPanel > MySQL Databases koko6788_* + phpMyAdmin sql/schema.mysql.sql'], JSON_UNESCAPED_UNICODE);
}
