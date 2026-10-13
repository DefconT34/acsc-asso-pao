-- sql/schema.mysql.sql - ACSC v9.0 MySQL 8 InnoDB utf8mb4
-- A executer dans phpMyAdmin (o2switch cPanel) APRES avoir cree la DB vide
-- cPanel > MySQL Databases > Creer DB (ex: cpaneluser_acsc) + user + lier ALL PRIVILEGES

CREATE TABLE IF NOT EXISTS settings(
  id INT PRIMARY KEY,
  gerant VARCHAR(80) DEFAULT 'Président',
  devise VARCHAR(10) DEFAULT 'USD',
  taux DECIMAL(10,2) DEFAULT 615,
  pays VARCHAR(10) DEFAULT 'us',
  factureTransit DECIMAL(12,2) DEFAULT 48000,
  poidsTotal DECIMAL(10,3) DEFAULT 3.500,
  sites MEDIUMTEXT,
  pin VARCHAR(255) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personnes(
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(80) NOT NULL,
  montant DECIMAL(10,2) NOT NULL,
  quantite INT NOT NULL,
  site VARCHAR(50) DEFAULT 'site1',
  telephone VARCHAR(30) DEFAULT '',
  statut VARCHAR(20) DEFAULT 'impaye',
  datePaiement VARCHAR(30) DEFAULT '',
  montantPaye DECIMAL(10,2) DEFAULT 0,
  projetCode VARCHAR(20) DEFAULT '',
  lienProduit VARCHAR(2048) DEFAULT '',
  capture MEDIUMTEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_site (site),
  KEY idx_statut (statut),
  KEY idx_nom (nom),
  KEY idx_projet (projetCode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS historique(
  id INT AUTO_INCREMENT PRIMARY KEY,
  date VARCHAR(40) DEFAULT '',
  gerant VARCHAR(80) DEFAULT '',
  totalFinal VARCHAR(40) DEFAULT '',
  data MEDIUMTEXT,
  titre VARCHAR(120) DEFAULT '',
  note TEXT,
  code VARCHAR(20) DEFAULT '',
  statutProjet VARCHAR(20) DEFAULT 'en_cours',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_code (code),
  KEY idx_statut (statutProjet),
  KEY idx_date (date),
  KEY idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO settings(id, gerant, devise, taux, pays, factureTransit, poidsTotal, sites)
VALUES(1,'Président','USD',615,'us',48000,3.5,'[]');
