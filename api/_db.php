<?php
// api/_db.php - PDO singleton ACSC v9.0-php (koko6788_acsc)
$c=require __DIR__.'/config.php';
$GLOBALS['_ACSC_CFG']=$c;
$DB_HOST=$c['db_host']; $DB_PORT=(int)$c['db_port']; $DB_USER=$c['db_user']; $DB_PASS=$c['db_pass']; $DB_NAME=$c['db_name'];
$_pdo=null;
function pdoConn(): PDO {
  global $_pdo,$DB_HOST,$DB_PORT,$DB_USER,$DB_PASS,$DB_NAME;
  if($_pdo instanceof PDO) return $_pdo;
  $dsn="mysql:host={$DB_HOST};port={$DB_PORT};dbname={$DB_NAME};charset=utf8mb4";
  $_pdo=new PDO($dsn,$DB_USER,$DB_PASS,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
  $_pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
  $_pdo->exec("SET time_zone='+00:00'");
  require_once __DIR__.'/_schema.php';
  ensureSchema($_pdo);
  return $_pdo;
}
function dbGet(string $sql,array $p=[]){ $s=pdoConn()->prepare($sql); $s->execute($p); $r=$s->fetch(); return $r?:null; }
function dbAll(string $sql,array $p=[]): array{ $s=pdoConn()->prepare($sql); $s->execute($p); return $s->fetchAll(); }
function dbRun(string $sql,array $p=[]): array{ $s=pdoConn()->prepare($sql); $s->execute($p); return ['lastID'=>(int)pdoConn()->lastInsertId(),'insertId'=>(int)pdoConn()->lastInsertId(),'affected'=>$s->rowCount()]; }
function genCodeProjet(): string{
  $y=date('Y');
  try{
    $r=dbGet("SELECT code FROM historique WHERE code LIKE ? ORDER BY id DESC LIMIT 1",["ACSC-{$y}-%"]);
    if($r && !empty($r['code']) && preg_match('/-(\d+)$/',$r['code'],$m)) return sprintf('ACSC-%s-%04d',$y,intval($m[1])+1);
    $c=dbGet("SELECT COUNT(*) AS n FROM historique WHERE code LIKE ?",["ACSC-{$y}-%"]);
    return sprintf('ACSC-%s-%04d',$y,intval($c['n']??0)+1);
  }catch(Exception $e){ return sprintf('ACSC-%s-%s',$y,substr((string)time(),-4)); }
}
function valPersonne(array $b): ?string{
  $n=trim($b['nom']??''); if($n===''||mb_strlen($n)<2) return 'Nom trop court (min 2)'; if(mb_strlen($n)>80) return 'Nom trop long (max 80)';
  $m=$b['montant']??null; if(!is_numeric($m)||floatval($m)<=0) return 'Montant doit etre > 0';
  $q=$b['quantite']??null; if(!is_numeric($q)||intval($q)!=floatval($q)||intval($q)<1) return 'Quantite entiere >=1';
  $t=trim($b['telephone']??''); if($t!==''&&strlen(preg_replace('/\D/','',$t))<8) return 'Telephone invalide';
  $s=trim($b['site']??''); if($s==='') return 'Site requis';
  $lp=trim($b['lienProduit']??''); if($lp!==''){ if(!preg_match('#^https://.+#i',$lp)) return 'Lien produit invalide (https:// requis)'; if(strlen($lp)>2048) return 'Lien trop long'; }
  $cap=trim($b['capture']??''); if($cap!==''){ if(strlen($cap)>900*1024) return 'Capture trop volumineuse'; if(!preg_match('#^data:image/(jpeg|jpg|png|webp);base64,#i',$cap)&&!preg_match('#^https://#i',$cap)) return 'Capture invalide'; }
  return null;
}
function valSettings(array $b): ?string{
  if(!is_numeric($b['taux']??null)||floatval($b['taux'])<=0) return 'Taux invalide';
  if(!is_numeric($b['factureTransit']??null)||floatval($b['factureTransit'])<0) return 'Facture transit invalide';
  if(!is_numeric($b['poidsTotal']??null)||floatval($b['poidsTotal'])<0) return 'Poids invalide';
  return null;
}
