<?php
require_once __DIR__.'/_helpers.php';
require_once __DIR__.'/_db.php';
corsHeaders(); header('Content-Type: application/json; charset=utf-8');
try{ $r=dbRun("DELETE FROM historique WHERE titre='Auto-save'"); sendJson(['ok'=>1,'deleted'=>$r['affected']]); }catch(Exception $e){ sendJson(['error'=>$e->getMessage()],500); }
