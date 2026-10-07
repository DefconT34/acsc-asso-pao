const fs=require('fs');
let s=fs.readFileSync('server.js','utf8');
if(s.includes("purge-autosave")){console.log('already has tail');process.exit(0);}
let tail = `
app.delete('/api/historique/purge-autosave', async (req,res) => {
  try { const info = await dbRun(\`DELETE FROM historique WHERE titre='Auto-save'\`); res.json({ ok: 1, deleted: info.changes }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/historique/:id/duplicate', async (req,res) => {
  try {
    const row = await dbGet(\`SELECT * FROM historique WHERE id=?\`, [req.params.id]); if (!row) return res.status(404).json({ error: 'not found' });
    const newCode = await genCodeProjet();
    const newTitre = (row.titre||'') + ' (copie)';
    const r = await dbRun(\`INSERT INTO historique(date,gerant,totalFinal,data,titre,note,code,statutProjet) VALUES(?,?,?,?,?,?,?,?)\`, [new Date().toLocaleString('fr-FR'), row.gerant, row.totalFinal, row.data, newTitre, row.note || '', newCode, 'en_cours']);
    res.json({ ok:1, id: r.lastID, code: newCode });
  } catch(e){ res.status(500).json({error:e.message});}
});
app.delete('/api/historique/:id', async (req, res) => {
  try { await dbRun(\`DELETE FROM historique WHERE id=?\`, [req.params.id]); res.json({ ok: 1 }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/historique', async (req, res) => {
  try { await dbRun(\`DELETE FROM historique\`); res.json({ ok: 1 }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/backup', async (req,res) => {
  try { const settings = await dbGet(\`SELECT * FROM settings WHERE id=1\`); const personnes = await dbAll(\`SELECT * FROM personnes\`); const historique = await dbAll(\`SELECT * FROM historique\`); res.json({ version: '8.6-sqlite3', exportedAt: new Date().toISOString(), settings, personnes, historique }); } catch (e) { res.status(500).json({ error: e.message }); }
});
`;
fs.appendFileSync('server.js', tail, 'utf8');
console.log('tail1 appended len now '+fs.readFileSync('server.js','utf8').length);
