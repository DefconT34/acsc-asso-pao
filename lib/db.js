try{require('dotenv').config();}catch(_){}
const mysql=require('mysql2/promise');
const DB_HOST=process.env.DB_HOST||process.env.MYSQL_HOST||'127.0.0.1';
const DB_PORT=Number(process.env.DB_PORT||process.env.MYSQL_PORT||3306);
const DB_USER=process.env.DB_USER||process.env.MYSQL_USER||'root';
const DB_PASSWORD=process.env.DB_PASSWORD||process.env.MYSQL_PASSWORD||'';
const DB_NAME=process.env.DB_NAME||process.env.MYSQL_DATABASE||'acsc_assopao';
const DB_LIMIT=Number(process.env.DB_POOL_LIMIT||10);
let pool=null;
function getPool(){
 if(pool) return pool;
 pool=mysql.createPool({
  host:DB_HOST,port:DB_PORT,user:DB_USER,password:DB_PASSWORD,database:DB_NAME,
  waitForConnections:true,connectionLimit:DB_LIMIT,queueLimit:0,
  enableKeepAlive:true,keepAliveInitialDelay:10000,
  charset:'utf8mb4',timezone:'+00:00',multipleStatements:true,connectTimeout:10000
 });
 console.log(`[DB] mysql2 pool -> ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME} (limit ${DB_LIMIT})`);
 return pool;
}
function normalizeSql(sql){
 if(!sql) return sql;
 let s=String(sql);
 s=s.replace(/^\s*BEGIN(\s+TRANSACTION)?\s*;?\s*$/im,'START TRANSACTION');
 s=s.replace(/INSERT\s+OR\s+IGNORE/gi,'INSERT IGNORE');
 s=s.replace(/AUTOINCREMENT/gi,'AUTO_INCREMENT');
 return s;
}
async function dbExec(sql){
 const p=getPool(); await p.query(normalizeSql(sql));
}
async function dbRun(sql,params=[]){
 const p=getPool(); const [r]=await p.execute(normalizeSql(sql),params);
 return {lastID:r.insertId,insertId:r.insertId,changes:r.affectedRows,affectedRows:r.affectedRows};
}
async function dbGet(sql,params=[]){
 const p=getPool(); const [rows]=await p.execute(normalizeSql(sql),params); return rows[0]||null;
}
async function dbAll(sql,params=[]){
 const p=getPool(); const [rows]=await p.execute(normalizeSql(sql),params); return rows;
}
async function dbClose(){
 if(pool){ try{await pool.end();}catch(_){} pool=null; console.log('[DB] pool closed'); }
}
async function initDatabase(){
 const p=getPool();
 try{ await p.query('SELECT 1'); }catch(e){
  console.error('[DB] MySQL connexion echouee:',e.message);
  console.error(' -> Verifie .env DB_HOST/DB_USER/DB_PASSWORD/DB_NAME et cree la DB (sql/schema.mysql.sql)');
  throw e;
 }
 await p.query(`
  CREATE TABLE IF NOT EXISTS settings(
   id INT PRIMARY KEY,
   gerant VARCHAR(80) DEFAULT 'Pr\u00e9sident',
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
   createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
   KEY idx_date (date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 `);
 const idxs=[
  'CREATE INDEX idx_personnes_site ON personnes(site)',
  'CREATE INDEX idx_personnes_statut ON personnes(statut)',
  'CREATE INDEX idx_personnes_nom ON personnes(nom)',
  'CREATE INDEX idx_personnes_projet ON personnes(projetCode)',
  'CREATE INDEX idx_hist_code ON historique(code)',
  'CREATE INDEX idx_hist_statut ON historique(statutProjet)'
 ];
 for(const sql of idxs){ try{ await p.query(sql);}catch(e){ if(!String(e.message).includes('Duplicate')) console.warn('[idx]',e.message); } }
 await p.query("INSERT IGNORE INTO settings(id, gerant, devise, taux, pays, factureTransit, poidsTotal, sites) VALUES(1,'Pr\u00e9sident','USD',615,'us',48000,3.5,'[]')");
 let [rows]=await p.execute('SELECT * FROM settings WHERE id=1');
 let sites=[]; try{ sites=JSON.parse((rows[0]&&rows[0].sites)||'[]'); }catch(_){ sites=[]; }
 if(!Array.isArray(sites)||sites.length===0||(sites[0]&&sites[0].p!==undefined)){
  const defaut=JSON.stringify([
   {id:'site1',label:'Cigars.com',devise:'USD',taux:615,sousTotal:500,total:540},
   {id:'site2',label:'FamousSmoke',devise:'USD',taux:615,sousTotal:300,total:315},
   {id:'site3',label:'Cigars-of-Cuba',devise:'EUR',taux:660,sousTotal:400,total:425}
  ]);
  await p.execute('UPDATE settings SET sites=? WHERE id=1',[defaut]);
 }
 try{
  const [rh]=await p.execute("SELECT id FROM historique WHERE code IS NULL OR code=''");
  for(const r of rh){ const code=`ACSC-${new Date().getFullYear()}-${String(r.id).padStart(4,'0')}`; try{ await p.execute('UPDATE historique SET code=?, statutProjet="en_cours" WHERE id=?',[code,r.id]); }catch(_){} }
 }catch(_){}
 console.log('\u2705 MySQL initialis\u00e9 (InnoDB utf8mb4)');
}
module.exports={getPool,dbExec,dbRun,dbGet,dbAll,dbClose,initDatabase,dialect:'mysql'};
