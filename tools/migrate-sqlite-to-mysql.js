#!/usr/bin/env node
// tools/migrate-sqlite-to-mysql.js - dump database.db -> MySQL
try{require('dotenv').config();}catch(_){}
const fs=require('fs'),path=require('path');
const sqlite3=require('sqlite3');
const mysql=require('mysql2/promise');
const DB_PATH=process.env.DB_PATH||path.join(__dirname,'..','database.db');
const MYSQL={host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'acsc_assopao'};
if(!fs.existsSync(DB_PATH)){ console.error('SQLite file not found:',DB_PATH); process.exit(1); }
const db=new sqlite3.Database(DB_PATH);
function all(sql,params=[]){return new Promise((res,rej)=>db.all(sql,params,(e,r)=>e?rej(e):res(r)));}
function get(sql,params=[]){return new Promise((res,rej)=>db.get(sql,params,(e,r)=>e?rej(e):res(r)));}
(async()=>{
 const pool=await mysql.createPool({...MYSQL,charset:'utf8mb4',multipleStatements:true});
 console.log('[migrate] SQLite',DB_PATH,'->',MYSQL.user+'@'+MYSQL.host+':'+MYSQL.port+'/'+MYSQL.database);
 const settings=await get('SELECT * FROM settings WHERE id=1');
 const personnes=await all('SELECT * FROM personnes ORDER BY id');
 const historique=await all('SELECT * FROM historique ORDER BY id');
 console.log(`[migrate] rows: settings=${settings?'1':'0'} personnes=${personnes.length} historique=${historique.length}`);
 await pool.query('START TRANSACTION');
 try{
  await pool.query('DELETE FROM personnes'); await pool.query('DELETE FROM historique');
  if(settings){
   await pool.execute('UPDATE settings SET gerant=?,devise=?,taux=?,pays=?,factureTransit=?,poidsTotal=?,sites=?,pin=? WHERE id=1',
    [settings.gerant||'Président',settings.devise||'USD',settings.taux||615,settings.pays||'us',settings.factureTransit||0,settings.poidsTotal||0,settings.sites||'[]',settings.pin||'']);
  }
  for(const p of personnes){
   await pool.execute('INSERT INTO personnes(id,nom,montant,quantite,site,telephone,statut,datePaiement,montantPaye,projetCode,lienProduit,capture) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
    [p.id,p.nom,p.montant,p.quantite,p.site,p.telephone||'',p.statut||'impaye',p.datePaiement||'',p.montantPaye||0,p.projetCode||'',p.lienProduit||'',p.capture||'']);
  }
  for(const h of historique){
   let code=h.code||''; if(!code) code='ACSC-'+new Date().getFullYear()+'-'+String(h.id).padStart(4,'0');
   await pool.execute('INSERT INTO historique(id,date,gerant,totalFinal,data,titre,note,code,statutProjet) VALUES(?,?,?,?,?,?,?,?,?)',
    [h.id,h.date,h.gerant,h.totalFinal,h.data,h.titre||code,h.note||'',code,h.statutProjet||'en_cours']);
  }
  // reset AUTO_INCREMENT
  try{ await pool.query('ALTER TABLE personnes AUTO_INCREMENT = 1'); }catch(_){}
  try{ await pool.query('ALTER TABLE historique AUTO_INCREMENT = 1'); }catch(_){}
  await pool.query('COMMIT');
  console.log('[migrate] COMMIT ok');
 }catch(e){ await pool.query('ROLLBACK'); console.error('[migrate] ROLLBACK',e.message); process.exit(1); }
 await pool.end(); db.close();
 console.log('[migrate] done');
})();
