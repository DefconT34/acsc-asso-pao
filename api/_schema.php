<?php
function ensureSchema(PDO $pdo): void {
  static $done=false; if($done) return; $done=true;
  $pdo->exec("CREATE TABLE IF NOT EXISTS settings(id INT PRIMARY KEY,gerant VARCHAR(80) DEFAULT 'Président',devise VARCHAR(10) DEFAULT 'USD',taux DECIMAL(10,2) DEFAULT 615,pays VARCHAR(10) DEFAULT 'us',factureTransit DECIMAL(12,2) DEFAULT 48000,poidsTotal DECIMAL(10,3) DEFAULT 3.500,sites MEDIUMTEXT,pin VARCHAR(255) DEFAULT '') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  $pdo->exec("CREATE TABLE IF NOT EXISTS personnes(id INT AUTO_INCREMENT PRIMARY KEY,nom VARCHAR(80) NOT NULL,montant DECIMAL(10,2) NOT NULL,quantite INT NOT NULL,site VARCHAR(50) DEFAULT 'site1',telephone VARCHAR(30) DEFAULT '',statut VARCHAR(20) DEFAULT 'impaye',datePaiement VARCHAR(30) DEFAULT '',montantPaye DECIMAL(10,2) DEFAULT 0,projetCode VARCHAR(20) DEFAULT '',lienProduit VARCHAR(2048) DEFAULT '',capture MEDIUMTEXT,createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,KEY idx_site(site),KEY idx_statut(statut),KEY idx_nom(nom),KEY idx_projet(projetCode)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  $pdo->exec("CREATE TABLE IF NOT EXISTS historique(id INT AUTO_INCREMENT PRIMARY KEY,date VARCHAR(40) DEFAULT '',gerant VARCHAR(80) DEFAULT '',totalFinal VARCHAR(40) DEFAULT '',data MEDIUMTEXT,titre VARCHAR(120) DEFAULT '',note TEXT,code VARCHAR(20) DEFAULT '',statutProjet VARCHAR(20) DEFAULT 'en_cours',createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,UNIQUE KEY uniq_code(code),KEY idx_statut(statutProjet),KEY idx_date(date),KEY idx_code(code)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  try{
    $pdo->exec("INSERT IGNORE INTO settings(id,gerant,devise,taux,pays,factureTransit,poidsTotal,sites) VALUES(1,'Président','USD',615,'us',48000,3.5,'[]')");
    $row=$pdo->query("SELECT sites FROM settings WHERE id=1")->fetch();
    $raw=$row?($row['sites']??'[]'):'[]'; $arr=json_decode($raw,true);
    $needs=!is_array($arr)||count($arr)===0||isset($arr[0]['p']);
    if($needs){
      $def=json_encode([['id'=>'site1','label'=>'Cigars.com','devise'=>'USD','taux'=>615,'sousTotal'=>500,'total'=>540],['id'=>'site2','label'=>'FamousSmoke','devise'=>'USD','taux'=>615,'sousTotal'=>300,'total'=>315],['id'=>'site3','label'=>'Cigars-of-Cuba','devise'=>'EUR','taux'=>660,'sousTotal'=>400,'total'=>425]],JSON_UNESCAPED_UNICODE);
      $st=$pdo->prepare("UPDATE settings SET sites=? WHERE id=1"); $st->execute([$def]);
    }
    $rs=$pdo->query("SELECT id FROM historique WHERE code IS NULL OR code=''");
    if($rs){ $y=date('Y'); foreach($rs->fetchAll() as $r){ $code=sprintf('ACSC-%s-%04d',$y,(int)$r['id']); try{$pdo->prepare("UPDATE historique SET code=?,statutProjet='en_cours' WHERE id=?")->execute([$code,$r['id']]);}catch(Exception $e){} } }
  }catch(Exception $e){}
  foreach(["CREATE INDEX idx_personnes_site ON personnes(site)","CREATE INDEX idx_personnes_statut ON personnes(statut)","CREATE INDEX idx_personnes_nom ON personnes(nom)","CREATE INDEX idx_personnes_projet ON personnes(projetCode)","CREATE INDEX idx_hist_code ON historique(code)","CREATE INDEX idx_hist_statut ON historique(statutProjet)"] as $sql){ try{$pdo->exec($sql);}catch(Exception $e){} }
}
