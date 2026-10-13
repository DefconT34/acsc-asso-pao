<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders(); header('Content-Type: application/json; charset=utf-8');
try{ echo json_encode(dbAll("SELECT * FROM historique ORDER BY id DESC"), JSON_UNESCAPED_UNICODE); }catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
