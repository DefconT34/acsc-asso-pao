const fs=require('fs');
let s=fs.readFileSync('server.js','utf8');
const a=s.indexOf("app.patch('/api/historique/:id'");
const b=s.indexOf("app.delete('/api/historique/purge-autosave'");
console.log(a,b);
let old=s.slice(a,b);
console.log('old len',old.length);
console.log(old.slice(0,120));
let newPatch=`app.patch('/api/historique/:id', async (req,res) => {
  try {
    const id = req.params.id; const row = await dbGet(\`SELECT * FROM historique WHERE id=?\`, [id]); if (!row) return res.status(404).json({ error: 'not found' });
    let { titre, note, code, statutProjet, data, totalFinal, gerant } = req.body;
    const newCode = code !== undefined ? String(code).trim().toUpperCase() : row.code;
    if (newCode && !/^ACSC-\\d{4}-\\d{4,5}$/.test(newCode)) return res.status(400).json({ error: 'Code invalide (format ACSC-YYYY-####)' });
    if (newCode && newCode !== row.code) { const dup = await dbGet(\`SELECT id FROM historique WHERE code=? AND id!=?\`, [newCode, id]); if (dup) return res.status(409).json({ error: 'Code deja utilise' }); }
    if (statutProjet && !['en_cours','cloture'].includes(statutProjet)) statutProjet = row.statutProjet;
    const nextStatut = statutProjet || row.statutProjet || 'en_cours';
    if(row.statutProjet==='cloture' && nextStatut==='cloture' && (data!==undefined || totalFinal!==undefined)){
      return res.status(403).json({ error: 'Projet cloture - modification bloquee (reouvrir d\\'abord)' });
    }
    const newTitre = titre !== undefined ? String(titre).trim() : row.titre;
    const newNote = note !== undefined ? String(note) : row.note;
    let newData = row.data;
    if(data!==undefined) newData = typeof data==='string' ? data : JSON.stringify(data);
    const newTotal = totalFinal!==undefined ? String(totalFinal) : row.totalFinal;
    const newGerant = gerant!==undefined ? String(gerant) : row.gerant;
    const newDate = new Date().toLocaleString('fr-FR');
    await dbRun(\`UPDATE historique SET titre=?, note=?, code=?, statutProjet=?, data=?, totalFinal=?, gerant=?, date=? WHERE id=?\`, [newTitre, newNote, newCode || row.code, nextStatut, newData, newTotal, newGerant, newDate, id]);
    res.json({ ok: 1, code: newCode||row.code, statutProjet: nextStatut });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/historique/by-code/:code', async (req,res)=>{
  try{ const code=String(req.params.code||'').trim().toUpperCase(); if(!/^ACSC-\\d{4}-\\d{4,5}$/.test(code)) return res.status(400).json({error:'Code invalide'}); const row=await dbGet(\`SELECT * FROM historique WHERE code=?\`,[code]); if(!row) return res.status(404).json({error:'not found'}); res.json(row);}catch(e){res.status(500).json({error:e.message});}
});
app.patch('/api/historique/by-code/:code', async (req,res)=>{
  try{
    const code=String(req.params.code||'').trim().toUpperCase(); if(!/^ACSC-\\d{4}-\\d{4,5}$/.test(code)) return res.status(400).json({error:'Code invalide'}); 
    const row=await dbGet(\`SELECT * FROM historique WHERE code=?\`,[code]); if(!row) return res.status(404).json({error:'not found'});
    let { titre, note, code: newCodeRaw, statutProjet, data, totalFinal, gerant } = req.body;
    let newCode = newCodeRaw!==undefined ? String(newCodeRaw).trim().toUpperCase() : row.code;
    if(newCode && !/^ACSC-\\d{4}-\\d{4,5}$/.test(newCode)) return res.status(400).json({error:'Code invalide'});
    if(newCode && newCode!==row.code){ const dup=await dbGet(\`SELECT id FROM historique WHERE code=?\`,[newCode]); if(dup) return res.status(409).json({error:'Code deja utilise'}); }
    if(statutProjet && !['en_cours','cloture'].includes(statutProjet)) statutProjet=row.statutProjet;
    const nextStatut=statutProjet||row.statutProjet||'en_cours';
    if(row.statutProjet==='cloture' && nextStatut==='cloture' && (data!==undefined || totalFinal!==undefined)) return res.status(403).json({error:'Projet cloture - modification bloquee'});
    const newTitre=titre!==undefined?String(titre).trim():row.titre;
    const newNote=note!==undefined?String(note):row.note;
    let newData=row.data; if(data!==undefined) newData=typeof data==='string'?data:JSON.stringify(data);
    const newTotal=totalFinal!==undefined?String(totalFinal):row.totalFinal;
    const newGerant=gerant!==undefined?String(gerant):row.gerant;
    const newDate=new Date().toLocaleString('fr-FR');
    await dbRun(\`UPDATE historique SET titre=?, note=?, code=?, statutProjet=?, data=?, totalFinal=?, gerant=?, date=? WHERE id=?\`,[newTitre,newNote,newCode||row.code,nextStatut,newData,newTotal,newGerant,newDate,row.id]);
    res.json({ok:1, code:newCode||row.code, statutProjet:nextStatut});
  }catch(e){res.status(500).json({error:e.message});}
});
`;
s = s.slice(0,a) + newPatch + s.slice(b);
fs.writeFileSync('server.js', s, 'utf8');
console.log('done len '+s.length);
