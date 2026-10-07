const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

let helmet, compression, bcrypt, rateLimit;
try { helmet = require('helmet'); } catch { console.error('FATAL: helmet manquant -> npm install'); process.exit(1); }
try { compression = require('compression'); } catch { compression = (_req,_res,next)=>next(); console.warn('compression not installed - run npm install compression'); }
try { bcrypt = require('bcryptjs'); } catch { console.error('FATAL: bcryptjs obligatoire -> npm install'); process.exit(1); }
try { rateLimit = require('express-rate-limit'); } catch { console.error('FATAL: express-rate-limit manquant -> npm install'); process.exit(1); }

const app = express();
const PORT = Number(process.env.PORT || 3000);

// o2switch / Passenger
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
      styleSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://api.elevenlabs.io"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      mediaSrc: ["'self'", "blob:", "https://api.elevenlabs.io"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));
app.use(compression());
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(v=>v.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => { if (!origin) return cb(null, true); if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true); return cb(new Error('CORS bloque: '+origin)); },
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));
// v8.6 rate-limiters (express-rate-limit 7.x)
const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 300, standardHeaders: true, legacyHeaders: false });
const pinLimiter = rateLimit({ windowMs: 15*60*1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de tentatives PIN, reessayez dans 15 min' } });
const elevenLimiter = rateLimit({ windowMs: 60*1000, max: 12, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de requetes TTS' } });
app.use('/api/', apiLimiter);
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d', etag: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString('fr-FR')}] ${req.method} ${req.url}`);
  next();
});

// -----------------------------------------------------------------------------
// SQLITE3
// -----------------------------------------------------------------------------
// IMPORTANT: sqlite3 is asynchronous. This file deliberately does NOT use
// better-sqlite3 APIs such as db.prepare().get()/run()/all().
const DB_PATH = process.env.DB_PATH || process.env.SQLITE_PATH || path.join(__dirname, 'database.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new sqlite3.Database(DB_PATH);
console.log(`[DB] sqlite3 -> ${DB_PATH}`);

function dbExec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, err => err ? reject(err) : resolve());
  });
}
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}
function dbClose() {
  return new Promise((resolve, reject) => {
    db.close(err => err ? reject(err) : resolve());
  });
}

async function initDatabase() {
  await dbExec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS settings(
      id INTEGER PRIMARY KEY CHECK(id=1),
      gerant TEXT DEFAULT 'Président',
      devise TEXT DEFAULT 'USD',
      taux REAL DEFAULT 615,
      pays TEXT DEFAULT 'us',
      factureTransit REAL DEFAULT 48000,
      poidsTotal REAL DEFAULT 3.5
    );

    CREATE TABLE IF NOT EXISTS personnes(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT,
      montant REAL,
      quantite INTEGER
    );

    CREATE TABLE IF NOT EXISTS historique(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      gerant TEXT,
      totalFinal TEXT,
      data TEXT
    );

    INSERT OR IGNORE INTO settings(id) VALUES(1);
  `);

  // Migrations sécurisées : SQLite renvoie une erreur si la colonne existe déjà.
  // On l'ignore volontairement.
  const migrations = [
    `ALTER TABLE settings ADD COLUMN sites TEXT`,
    `ALTER TABLE personnes ADD COLUMN site TEXT DEFAULT 'site1'`,
    `ALTER TABLE personnes ADD COLUMN telephone TEXT DEFAULT ''`,
    `ALTER TABLE personnes ADD COLUMN statut TEXT DEFAULT 'impaye'`,
    `ALTER TABLE personnes ADD COLUMN datePaiement TEXT DEFAULT ''`,
    `ALTER TABLE personnes ADD COLUMN montantPaye REAL DEFAULT 0`,
    `ALTER TABLE historique ADD COLUMN titre TEXT DEFAULT ''`,
    `ALTER TABLE historique ADD COLUMN note TEXT DEFAULT ''`,
    `ALTER TABLE historique ADD COLUMN code TEXT DEFAULT ''`,
    `ALTER TABLE historique ADD COLUMN statutProjet TEXT DEFAULT 'en_cours'`,
    `ALTER TABLE settings ADD COLUMN pin TEXT DEFAULT ''`,
    `ALTER TABLE personnes ADD COLUMN projetCode TEXT DEFAULT ''`,
    `ALTER TABLE personnes ADD COLUMN lienProduit TEXT DEFAULT ''`,
    `ALTER TABLE personnes ADD COLUMN capture TEXT DEFAULT ''`
  ];
  for (const sql of migrations) {
    try { await dbRun(sql); } catch (_) {}
  }

  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_personnes_site ON personnes(site)`,
    `CREATE INDEX IF NOT EXISTS idx_personnes_statut ON personnes(statut)`,
    `CREATE INDEX IF NOT EXISTS idx_personnes_nom ON personnes(nom)`,
    `CREATE INDEX IF NOT EXISTS idx_hist_date ON historique(date)`,
    `CREATE INDEX IF NOT EXISTS idx_hist_code ON historique(code)`,
    `CREATE INDEX IF NOT EXISTS idx_hist_statut ON historique(statutProjet)`,
    `CREATE INDEX IF NOT EXISTS idx_personnes_projet ON personnes(projetCode)`
  ];
  for (const sql of indexes) {
    try { await dbRun(sql); } catch (_) {}
  }

  let settings = await dbGet(`SELECT * FROM settings WHERE id=1`);
  let sites = [];
  try { sites = JSON.parse((settings && settings.sites) || '[]'); } catch (_) { sites = []; }

  // Ancien format / valeur vide
  if (!Array.isArray(sites) || sites.length === 0 || (sites[0] && sites[0].p) !== undefined) {
    const defaut = JSON.stringify([
      { id: 'site1', label: 'Cigars.com', devise: 'USD', taux: 615, sousTotal: 500, total: 540 },
      { id: 'site2', label: 'FamousSmoke', devise: 'USD', taux: 615, sousTotal: 300, total: 315 },
      { id: 'site3', label: 'Cigars-of-Cuba', devise: 'EUR', taux: 660, sousTotal: 400, total: 425 }
    ]);
    await dbRun(`UPDATE settings SET sites=? WHERE id=1`, [defaut]);
  }

  // Backfill codes projets existants
  try {
    const rows = await dbAll(`SELECT id FROM historique WHERE code IS NULL OR code=''`);
    for (const r of rows) {
      const code = `ACSC-${new Date().getFullYear()}-${String(r.id).padStart(4, '0')}`;
      try {
        await dbRun(`UPDATE historique SET code=?, statutProjet='en_cours' WHERE id=?`, [code, r.id]);
      } catch (_) {}
    }
  } catch (_) {}

  console.log('✅ Base SQLite initialisée');
}
// VALIDATION / HELPERS
function valPersonne(b) {
  if (!b.nom || String(b.nom).trim().length < 2) return 'Nom trop court (min 2)';
  if (isNaN(b.montant) || Number(b.montant) <= 0) return 'Montant doit etre > 0';
  if (!Number.isInteger(Number(b.quantite)) || Number(b.quantite) < 1) return 'Quantite entiere >=1';
  if (b.telephone && String(b.telephone).replace(/\D/g, '').length < 8) return 'Telephone invalide';
  if (!b.site) return 'Site requis';
  if (b.lienProduit && String(b.lienProduit).trim() && !/^https?:\/\/.+/i.test(String(b.lienProduit).trim())) return 'Lien produit invalide (http(s)://)';
  if (b.capture && String(b.capture).length > 1.8*1024*1024) return 'Capture trop volumineuse (max ~1.5Mo)';
  return null;
}
function valSettings(b) {
  if (isNaN(b.taux) || Number(b.taux) <= 0) return 'Taux invalide';
  if (isNaN(b.factureTransit) || Number(b.factureTransit) < 0) return 'Facture transit invalide';
  if (isNaN(b.poidsTotal) || Number(b.poidsTotal) < 0) return 'Poids invalide';
  return null;
}
async function genCodeProjet() {
  const y = new Date().getFullYear();
  try {
    const row = await dbGet(`SELECT code FROM historique WHERE code LIKE ? ORDER BY id DESC LIMIT 1`, [`ACSC-${y}-%`]);
    let seq = 1;
    if ((row && row.code)) { const m = row.code.match(/-(\d+)$/); if (m) seq = parseInt(m[1], 10) + 1; }
    else { const c = await dbGet(`SELECT COUNT(*) AS n FROM historique WHERE code LIKE ?`, [`ACSC-${y}-%`]); seq = Number((c && c.n) || 0) + 1; }
    return `ACSC-${y}-${String(seq).padStart(4, '0')}`;
  } catch { return `ACSC-${y}-${String(Date.now()).slice(-4)}`; }
}
// API SETTINGS + PIN
app.get('/api/settings', async (req, res) => {
  try { res.json(await dbGet(`SELECT * FROM settings WHERE id=1`)); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/settings', async (req, res) => {
  try {
    const b = req.body; const err = valSettings(b); if (err) return res.status(400).json({ error: err });
    if (b.pin !== undefined) {
      const pinVal = String(b.pin || '').trim();
      if (pinVal && !/^\d{4,8}$/.test(pinVal)) return res.status(400).json({ error: 'PIN doit etre 4-8 chiffres' });
      const hash = pinVal ? bcrypt.hashSync(pinVal, 10) : '';
      await dbRun(`UPDATE settings SET pin=? WHERE id=1`, [hash]);
    }
    await dbRun(`UPDATE settings SET gerant=?, devise=?, taux=?, pays=?, factureTransit=?, poidsTotal=?, sites=? WHERE id=1`, [b.gerant, b.devise, b.taux, b.pays, b.factureTransit, b.poidsTotal, JSON.stringify(b.sites || [])]);
    res.json({ ok: 1 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/pin/check', pinLimiter, async (req, res) => {
  try {
    const s = await dbGet(`SELECT pin FROM settings WHERE id=1`);
    if (!(s && s.pin)) return res.json({ ok: 1, needPin: false });
    const ok = bcrypt.compareSync(String(req.body.pin || ''), String(s.pin));
    if (ok) return res.json({ ok: 1, needPin: true, valid: true });
    return res.status(401).json({ ok: 0, valid: false });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// API PERSONNES v8.6 projetCode + lienProduit search + capture
app.get('/api/personnes', async (req, res) => {
  try {
    const q = (req.query.q || '').trim(); const site = (req.query.site || '').trim(); const statut = (req.query.statut || '').trim(); const sort = req.query.sort || ''; const projetCode = (req.query.projetCode || req.query.code || '').trim().toUpperCase();
    const hasPage = req.query.page !== undefined && String(req.query.page) !== '';
    const hasLimit = req.query.limit !== undefined && String(req.query.limit) !== '';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 200));
    const paginated = hasPage || hasLimit;
    const where = []; const params = [];
    if (q) { where.push(`(nom LIKE ? OR telephone LIKE ? OR lienProduit LIKE ? OR projetCode LIKE ?)`); params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
    if (site) { where.push(`site=?`); params.push(site); }
    if (statut) { where.push(`statut=?`); params.push(statut); }
    if (projetCode) { where.push(`projetCode=?`); params.push(projetCode); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    let orderSql = "ORDER BY id ASC";
    if (sort === 'montant_desc') orderSql = "ORDER BY montant DESC";
    else if (sort === 'montant_asc') orderSql = "ORDER BY montant ASC";
    else if (sort === 'qte_desc') orderSql = "ORDER BY quantite DESC";
    else if (sort === 'nom') orderSql = "ORDER BY nom COLLATE NOCASE ASC";
    if (!paginated) {
      return res.json(await dbAll(`SELECT * FROM personnes ${whereSql} ${orderSql}`, params));
    }
    const totalRow = await dbGet(`SELECT COUNT(*) as c FROM personnes ${whereSql}`, params);
    const total = Number((totalRow && totalRow.c) || 0);
    const offset = (page - 1) * limit;
    const rows = await dbAll(`SELECT * FROM personnes ${whereSql} ${orderSql} LIMIT ? OFFSET ?`, [...params, limit, offset]);
    res.json({ rows, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/personnes', async (req, res) => {
  try {
    const err = valPersonne(req.body); if (err) return res.status(400).json({ error: err });
    const { nom, montant, quantite, site, telephone, statut, datePaiement, montantPaye, projetCode, lienProduit, capture } = req.body;
    const r = await dbRun(`INSERT INTO personnes(nom,montant,quantite,site,telephone,statut,datePaiement,montantPaye,projetCode,lienProduit,capture) VALUES(?,?,?,?,?,?,?,?,?,?,?)`, [nom, Number(montant), parseInt(quantite), site, telephone || '', statut || 'impaye', datePaiement || '', Number(montantPaye) || 0, (projetCode||'').toString().trim().toUpperCase(), lienProduit||'', capture||'']);
    res.json({ id: r.lastID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/personnes/:id', async (req, res) => {
  try {
    const err = valPersonne(req.body); if (err) return res.status(400).json({ error: err });
    const { nom, montant, quantite, site, telephone, statut, datePaiement, montantPaye, projetCode, lienProduit, capture } = req.body;
    await dbRun(`UPDATE personnes SET nom=?,montant=?,quantite=?,site=?,telephone=?,statut=?,datePaiement=?,montantPaye=?,projetCode=?,lienProduit=?,capture=? WHERE id=?`, [nom, Number(montant), parseInt(quantite), site, telephone || '', statut || 'impaye', datePaiement || '', Number(montantPaye) || 0, (projetCode||'').toString().trim().toUpperCase(), lienProduit||'', capture||'', req.params.id]);
    res.json({ ok: 1 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/personnes/:id/statut', async (req, res) => {
  try {
    const { statut, datePaiement, montantPaye } = req.body;
    await dbRun(`UPDATE personnes SET statut=?, datePaiement=?, montantPaye=? WHERE id=?`, [statut || 'impaye', datePaiement || '', Number(montantPaye) || 0, req.params.id]);
    res.json({ ok: 1 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/personnes/:id', async (req, res) => {
  try { await dbRun(`DELETE FROM personnes WHERE id=?`, [req.params.id]); res.json({ ok: 1 }); } catch (e) { res.status(500).json({ error: e.message }); }
});
// API HISTORIQUE / PROJETS
app.get('/api/historique', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1); const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20)); const q = (req.query.q || '').trim(); const offset = (page - 1) * limit;
    let whereSql = ''; let params = []; const statutQ = req.query.statut || ''; const gerantQ = (req.query.gerant || '').trim();
    if (q && statutQ) { whereSql = `WHERE (gerant LIKE ? OR totalFinal LIKE ? OR titre LIKE ? OR note LIKE ? OR date LIKE ? OR code LIKE ?) AND statutProjet=?`; params = [`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,statutQ]; }
    else if (q) { whereSql = `WHERE (gerant LIKE ? OR totalFinal LIKE ? OR titre LIKE ? OR note LIKE ? OR date LIKE ? OR code LIKE ?)`; params = [`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`]; }
    else if (statutQ) { whereSql = `WHERE statutProjet=?`; params = [statutQ]; }
    if (gerantQ) { const clause = `gerant LIKE ?`; const param = `%${gerantQ}%`; if (whereSql) { whereSql += ` AND ${clause}`; params.push(param); } else { whereSql = `WHERE ${clause}`; params = [param]; } }
    if (req.query.all) return res.json(await dbAll(`SELECT * FROM historique ${whereSql} ORDER BY id DESC`, params));
    const totalRow = await dbGet(`SELECT COUNT(*) AS c FROM historique ${whereSql}`, params); const total = Number((totalRow && totalRow.c) || 0);
    const rows = await dbAll(`SELECT * FROM historique ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    res.json({ rows, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/projets', async (req, res) => {
  try {
    const q = (req.query.q || '').trim(); const statut = req.query.statut || ''; let where = ''; let params = [];
    if (q && statut) { where = `WHERE (titre LIKE ? OR code LIKE ? OR note LIKE ?) AND statutProjet=?`; params = [`%${q}%`,`%${q}%`,`%${q}%`,statut]; }
    else if (q) { where = `WHERE (titre LIKE ? OR code LIKE ? OR note LIKE ?)`; params = [`%${q}%`,`%${q}%`,`%${q}%`]; }
    else if (statut) { where = `WHERE statutProjet=?`; params = [statut]; }
    res.json(await dbAll(`SELECT id,code,titre,note,statutProjet,date,gerant,totalFinal FROM historique ${where} ORDER BY id DESC`, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/historique-all', async (req,res) => {
  try { res.json(await dbAll(`SELECT * FROM historique ORDER BY id DESC`)); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/historique/by-code/:code', async (req,res)=>{
  try{ const code=String(req.params.code||'').trim().toUpperCase(); if(!/^ACSC-\d{4}-\d{4,5}$/.test(code)) return res.status(400).json({error:'Code invalide'}); const row=await dbGet(`SELECT * FROM historique WHERE code=?`,[code]); if(!row) return res.status(404).json({error:'not found'}); res.json(row);}catch(e){res.status(500).json({error:e.message});}
});
app.patch('/api/historique/by-code/:code', async (req,res)=>{
  try{
    const code=String(req.params.code||'').trim().toUpperCase(); if(!/^ACSC-\d{4}-\d{4,5}$/.test(code)) return res.status(400).json({error:'Code invalide'}); 
    const row=await dbGet(`SELECT * FROM historique WHERE code=?`,[code]); if(!row) return res.status(404).json({error:'not found'});
    let { titre, note, code: newCodeRaw, statutProjet, data, totalFinal, gerant } = req.body;
    let newCode = newCodeRaw!==undefined ? String(newCodeRaw).trim().toUpperCase() : row.code;
    if(newCode && !/^ACSC-\d{4}-\d{4,5}$/.test(newCode)) return res.status(400).json({error:'Code invalide'});
    if(newCode && newCode!==row.code){ const dup=await dbGet(`SELECT id FROM historique WHERE code=?`,[newCode]); if(dup) return res.status(409).json({error:'Code deja utilise'}); }
    if(statutProjet && !['en_cours','cloture'].includes(statutProjet)) statutProjet=row.statutProjet;
    const nextStatut=statutProjet||row.statutProjet||'en_cours';
    if(row.statutProjet==='cloture' && nextStatut==='cloture' && (data!==undefined || totalFinal!==undefined)) return res.status(403).json({error:'Projet cloture - modification bloquee'});
    const newTitre=titre!==undefined?String(titre).trim():row.titre;
    const newNote=note!==undefined?String(note):row.note;
    let newData=row.data; if(data!==undefined) newData=typeof data==='string'?data:JSON.stringify(data);
    const newTotal=totalFinal!==undefined?String(totalFinal):row.totalFinal;
    const newGerant=gerant!==undefined?String(gerant):row.gerant;
    const newDate=new Date().toLocaleString('fr-FR');
    await dbRun(`UPDATE historique SET titre=?, note=?, code=?, statutProjet=?, data=?, totalFinal=?, gerant=?, date=? WHERE id=?`,[newTitre,newNote,newCode||row.code,nextStatut,newData,newTotal,newGerant,newDate,row.id]);
    res.json({ok:1, code:newCode||row.code, statutProjet:nextStatut});
  }catch(e){res.status(500).json({error:e.message});}
});
app.get('/api/historique/:id', async (req, res) => {
  try { const row = await dbGet(`SELECT * FROM historique WHERE id=?`, [req.params.id]); if (!row) return res.status(404).json({ error: 'not found' }); res.json(row); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/historique', async (req, res) => {
  try {
    let { gerant, totalFinal, data, titre, note, code, statutProjet } = req.body;
    statutProjet = (statutProjet === 'cloture' || statutProjet === 'en_cours') ? statutProjet : 'en_cours';
    let codeHistorique = (code || '').trim().toUpperCase();
    if (!codeHistorique) codeHistorique = await genCodeProjet();
    else {
      if (!/^ACSC-\d{4}-\d{4,5}$/.test(codeHistorique)) return res.status(400).json({ error: 'Code invalide (format ACSC-YYYY-####)', suggestion: await genCodeProjet() });
      const exists = await dbGet(`SELECT id FROM historique WHERE code=?`, [codeHistorique]); if (exists) return res.status(409).json({ error: 'Code deja utilise', suggestion: await genCodeProjet() });
    }
    titre = (titre || '').trim() || codeHistorique;
    const r = await dbRun(`INSERT INTO historique(date,gerant,totalFinal,data,titre,note,code,statutProjet) VALUES(?,?,?,?,?,?,?,?)`, [new Date().toLocaleString('fr-FR'), gerant || 'President', totalFinal || '', JSON.stringify(data), titre, note || '', codeHistorique, statutProjet]);
    res.json({ ok: 1, id: r.lastID, code: codeHistorique, statutProjet });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/historique/:id', async (req,res) => {
  try {
    const id = req.params.id; const row = await dbGet(`SELECT * FROM historique WHERE id=?`, [id]); if (!row) return res.status(404).json({ error: 'not found' });
    let { titre, note, code, statutProjet, data, totalFinal, gerant } = req.body;
    const newCode = code !== undefined ? String(code).trim().toUpperCase() : row.code;
    if (newCode && !/^ACSC-\d{4}-\d{4,5}$/.test(newCode)) return res.status(400).json({ error: 'Code invalide (format ACSC-YYYY-####)' });
    if (newCode && newCode !== row.code) { const dup = await dbGet(`SELECT id FROM historique WHERE code=? AND id!=?`, [newCode, id]); if (dup) return res.status(409).json({ error: 'Code deja utilise' }); }
    if (statutProjet && !['en_cours','cloture'].includes(statutProjet)) statutProjet = row.statutProjet;
    const nextStatut = statutProjet || row.statutProjet || 'en_cours';
    if(row.statutProjet==='cloture' && nextStatut==='cloture' && (data!==undefined || totalFinal!==undefined)){
      return res.status(403).json({ error: 'Projet cloture - modification bloquee (reouvrir d\'abord)' });
    }
    const newTitre = titre !== undefined ? String(titre).trim() : row.titre;
    const newNote = note !== undefined ? String(note) : row.note;
    let newData = row.data;
    if(data!==undefined) newData = typeof data==='string' ? data : JSON.stringify(data);
    const newTotal = totalFinal!==undefined ? String(totalFinal) : row.totalFinal;
    const newGerant = gerant!==undefined ? String(gerant) : row.gerant;
    const newDate = new Date().toLocaleString('fr-FR');
    await dbRun(`UPDATE historique SET titre=?, note=?, code=?, statutProjet=?, data=?, totalFinal=?, gerant=?, date=? WHERE id=?`, [newTitre, newNote, newCode || row.code, nextStatut, newData, newTotal, newGerant, newDate, id]);
    res.json({ ok: 1, code: newCode||row.code, statutProjet: nextStatut });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


app.delete('/api/historique/purge-autosave', async (req,res) => {
  try { const info = await dbRun(`DELETE FROM historique WHERE titre='Auto-save'`); res.json({ ok: 1, deleted: info.changes }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/historique/:id/duplicate', async (req,res) => {
  try {
    const row = await dbGet(`SELECT * FROM historique WHERE id=?`, [req.params.id]); if (!row) return res.status(404).json({ error: 'not found' });
    const newCode = await genCodeProjet();
    const newTitre = (row.titre||'') + ' (copie)';
    const r = await dbRun(`INSERT INTO historique(date,gerant,totalFinal,data,titre,note,code,statutProjet) VALUES(?,?,?,?,?,?,?,?)`, [new Date().toLocaleString('fr-FR'), row.gerant, row.totalFinal, row.data, newTitre, row.note || '', newCode, 'en_cours']);
    res.json({ ok:1, id: r.lastID, code: newCode });
  } catch(e){ res.status(500).json({error:e.message});}
});
app.delete('/api/historique/:id', async (req, res) => {
  try { await dbRun(`DELETE FROM historique WHERE id=?`, [req.params.id]); res.json({ ok: 1 }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/historique', async (req, res) => {
  try { await dbRun(`DELETE FROM historique`); res.json({ ok: 1 }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/backup', async (req,res) => {
  try { const settings = await dbGet(`SELECT * FROM settings WHERE id=1`); const personnes = await dbAll(`SELECT * FROM personnes`); const historique = await dbAll(`SELECT * FROM historique`); res.json({ version: '8.6-sqlite3', exportedAt: new Date().toISOString(), settings, personnes, historique }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/restore', async (req,res) => {
  try{
    const b=req.body;
    await dbRun('BEGIN TRANSACTION'); await dbRun('DELETE FROM personnes'); await dbRun('DELETE FROM historique');
    if(b.settings) await dbRun('UPDATE settings SET gerant=?, devise=?, taux=?, pays=?, factureTransit=?, poidsTotal=?, sites=? WHERE id=1', [b.settings.gerant||'President', b.settings.devise||'USD', b.settings.taux||615, b.settings.pays||'us', b.settings.factureTransit||0, b.settings.poidsTotal||0, b.settings.sites||'[]']);
    if(b.personnes) for(const p of b.personnes) await dbRun('INSERT INTO personnes(id,nom,montant,quantite,site,telephone,statut,datePaiement,montantPaye,projetCode,lienProduit,capture) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', [p.id, p.nom, p.montant, p.quantite, p.site, p.telephone||'', p.statut||'impaye', p.datePaiement||'', p.montantPaye||0, p.projetCode||'', p.lienProduit||'', p.capture||'']);
    if (b.historique) for (const h of b.historique) { let c = h.code || ''; if (!c) c = 'ACSC-'+new Date().getFullYear()+'-'+String(h.id).padStart(4, '0'); await dbRun('INSERT INTO historique(id,date,gerant,totalFinal,data,titre,note,code,statutProjet) VALUES(?,?,?,?,?,?,?,?,?)', [h.id, h.date, h.gerant, h.totalFinal, h.data, h.titre || c, h.note || '', c, h.statutProjet || 'en_cours']); }
    await dbRun('COMMIT'); res.json({ok:1});
  }catch(e){ try{await dbRun('ROLLBACK');}catch(_){} res.status(500).json({error:e.message});}
});

app.get('/api/commande/:code', async (req,res)=>{
  try{
    const code=String(req.params.code||'').trim().toUpperCase();
    if(!/^ACSC-\d{4}-\d{4,5}$/.test(code)) return res.status(400).json({error:'Code invalide'});
    const row=await dbGet('SELECT id,code,titre,statutProjet,gerant FROM historique WHERE code=?',[code]);
    if(!row) return res.status(404).json({error:'Projet introuvable'});
    if(row.statutProjet==='cloture') return res.status(403).json({error:'Projet cloture'});
    const pers=await dbAll('SELECT id,nom,site,telephone,statut FROM personnes WHERE projetCode=?',[code]);
    res.json({ok:1, projet: row, commandes: pers});
  }catch(e){res.status(500).json({error:e.message});}
});
app.get('/api/personnes/by-projet/:code', async (req,res)=>{
  try{ const code=String(req.params.code||'').trim().toUpperCase(); res.json(await dbAll('SELECT * FROM personnes WHERE projetCode=?',[code])); }catch(e){res.status(500).json({error:e.message});}
});
app.post('/api/commande', async (req,res)=>{
  try{
    const b=req.body||{};
    const projetCode=String(b.projetCode||'').trim().toUpperCase();
    const nom=String(b.nom||'').trim();
    const telephone=String(b.telephone||'').trim();
    if(!projetCode) return res.status(400).json({error:'Projet requis (?p=ACSC-...)'});
    if(!/^ACSC-\d{4}-\d{4,5}$/.test(projetCode)) return res.status(400).json({error:'Code projet invalide'});
    const proj=await dbGet('SELECT code,statutProjet FROM historique WHERE code=?', [projetCode]);
    if(!proj) return res.status(404).json({error:'Projet introuvable'});
    if(proj.statutProjet==='cloture') return res.status(403).json({error:'Projet cloture - commande refusee'});
    let items=[];
    if(Array.isArray(b.items) && b.items.length){ items=b.items; }
    else { items=[{site:b.site, montant:b.montant, quantite:b.quantite, lienProduit:b.lienProduit||'', capture:b.capture||''}]; }
    if(items.length<1) return res.status(400).json({error:'Au moins 1 article'});
    if(items.length>10) return res.status(400).json({error:'Max 10 articles par envoi'});
    for(let it of items){
      if(!String(it.site||'').trim()) return res.status(400).json({error:'Site requis'});
      if(!Number(it.montant)||Number(it.montant)<=0) return res.status(400).json({error:'Montant >0'});
      if(!Number.isInteger(Number(it.quantite))||Number(it.quantite)<1) return res.status(400).json({error:'Qte >=1'});
    }
    const digits=telephone.replace(/\D/g,'');
    const cnt=await dbGet("SELECT COUNT(*) as c FROM personnes WHERE projetCode=? AND replace(replace(replace(telephone,' ',''),'-',''),'+','') LIKE ?", [projetCode, '%'+digits.slice(-8)]);
    if(Number((cnt && cnt.c)||0)+items.length>3) return res.status(429).json({error:'Limite 3 commandes par tel/projet'});
    const ids=[];
    for(let it of items){
      const err=valPersonne({nom, montant:Number(it.montant), quantite:Number(it.quantite), site:String(it.site).trim(), telephone, statut:'impaye', lienProduit:it.lienProduit||'', capture:it.capture||''});
      if(err) return res.status(400).json({error:err});
      const r=await dbRun('INSERT INTO personnes(nom,montant,quantite,site,telephone,statut,projetCode,lienProduit,capture) VALUES(?,?,?,?,?,?,?,?,?)', [nom, Number(it.montant), parseInt(it.quantite), String(it.site).trim(), telephone,'impaye', projetCode, String(it.lienProduit||'').trim(), String(it.capture||'').trim()]);
      ids.push(r.lastID);
    }
    res.json({ok:1, ids, projetCode, count:ids.length});
  }catch(e){ res.status(500).json({error:e.message}); }
});
app.get('/api/health', (req,res) => { res.json({ ok: 1, version: '8.6-sqlite3', db: DB_PATH, uptime: process.uptime(), wal: true }); });
app.get('/health', (req,res) => res.send('ok'));
app.get('*', (req,res) => { if (req.path.startsWith('/api')) return res.status(404).json({ error: 'not found' }); res.sendFile(path.join(__dirname, 'public', 'index.html')); });
let server;
async function start() {
  try { await initDatabase(); server = app.listen(PORT, () => { console.log('ACSC v8.6 -> port '+PORT+' | DB '+DB_PATH+' [WAL]'); }); } catch (e) { console.error('Impossible init:', e); process.exit(1); }
}
async function shutdown(signal) {
  console.log(signal+' recu : arret propre...');
  if (server) server.close(async () => { try { await dbClose(); } catch (_) {} process.exit(0); });
  else { try { await dbClose(); } catch (_) {} process.exit(0); }
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
start();
