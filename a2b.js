const fs=require('fs');
let tail = `
app.get('/api/commande/:code', async (req,res)=>{
  try{
    const code=String(req.params.code||'').trim().toUpperCase();
    if(!/^ACSC-\\d{4}-\\d{4,5}$/.test(code)) return res.status(400).json({error:'Code invalide'});
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
    if(!/^ACSC-\\d{4}-\\d{4,5}$/.test(projetCode)) return res.status(400).json({error:'Code projet invalide'});
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
    const digits=telephone.replace(/\\D/g,'');
    const cnt=await dbGet('SELECT COUNT(*) as c FROM personnes WHERE projetCode=? AND replace(replace(replace(telephone,\' \',\'\'),\'-\',\'\'),\'+\',\'\') LIKE ?', [projetCode, '%'+digits.slice(-8)]);
    if(Number(cnt?.c||0)+items.length>3) return res.status(429).json({error:'Limite 3 commandes par tel/projet'});
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
`;
fs.appendFileSync('server.js', tail);
console.log('done '+fs.readFileSync('server.js','utf8').length);
