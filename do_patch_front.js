const fs=require('fs');
let html=fs.readFileSync('public/index.html','utf8');
let changed=false;
if(!html.includes('btnTerminerProjet')){
  html=html.replace('<div id="filterInfo" class="text-[10px] text-gray-400 mt-1"></div>',
'<div id="filterInfo" class="text-[10px] text-gray-400 mt-1"></div><button id="btnTerminerProjet" onclick="terminerProjetCourant()" class="hidden mt-2 w-full bg-red-600 text-white px-3 py-2 rounded-full text-xs font-black">\uD83D\uDD12 Terminer projet <span id="terminerCode"></span></button><div id="autoSaveDot" class="text-[10px] text-gray-400 mt-1"></div>');
  changed=true; console.log('html terminer btn added');
}
if(!html.includes('08-projet-state.js')){
  html=html.replace('<script src="js/07-hist2.js"></script>', '<script src="js/07-hist2.js"></script>\n<script src="js/08-projet-state.js"></script>');
  changed=true; console.log('html script tag added');
}
if(changed) fs.writeFileSync('public/index.html', html, 'utf8');

let c05=fs.readFileSync('public/js/05-calcul.js','utf8');
if(!c05.includes('scheduleAutoSaveProjet')){
  c05=c05.replace('  save();', '  save(); try{ if(typeof scheduleAutoSaveProjet===\'function\') scheduleAutoSaveProjet(); }catch(e){}');
  fs.writeFileSync('public/js/05-calcul.js', c05, 'utf8');
  console.log('05 patched');
}

let c07=fs.readFileSync('public/js/07-historique.js','utf8');
if(!c07.includes('setCurrentProjet')){
  const from="const rj=await r2.json().catch(()=>({})); closeSaveHist(); if(rj.code) toast('Projet '+rj.code+' cree'); else toast('Sauvegarde OK'); const sb=document.getElementById('saveBanner'); if";
  const to="const rj=await r2.json().catch(()=>({})); closeSaveHist(); if(rj.code){ toast('Projet '+rj.code+' cree'); if(typeof setCurrentProjet==='function') setCurrentProjet(rj.code, rj.id||null); const sel=document.getElementById('filterProjet'); if(sel) sel.value=rj.code; if(typeof updateTerminerBtn==='function') updateTerminerBtn(); } else toast('Sauvegarde OK'); const sb=document.getElementById('saveBanner'); if";
  if(c07.includes(from)){
    c07=c07.replace(from,to);
    fs.writeFileSync('public/js/07-historique.js', c07, 'utf8');
    console.log('07 patched creation');
  } else console.log('07 from not found');
}

let c07b=fs.readFileSync('public/js/07-hist2.js','utf8');
if(!c07b.includes('setCurrentProjet')){
  const f='  renderSites(); render(); closeHistDetail(); closeHistorique(); toast(\'Etat restaure #\'+histSelectedId);';
  const t='  renderSites(); render(); closeHistDetail(); closeHistorique(); toast(\'Etat restaure #\'+histSelectedId); try{ if(typeof setCurrentProjet===\'function\' && row.code) setCurrentProjet(row.code, row.id); }catch(e){}';
  if(c07b.includes(f)){
    c07b=c07b.replace(f,t);
    fs.writeFileSync('public/js/07-hist2.js', c07b, 'utf8');
    console.log('07b patched restaurer');
  } else console.log('07b from not found');
  // also open via voirHistDetail should not set current, only restaurer. good.
}

let c04=fs.readFileSync('public/js/04-personnes.js','utf8');
if(c04.includes('personnes.push({id:r.id, ...payload}); render();') && !c04.includes('scheduleAutoSaveProjet(); }catch')){
  c04=c04.replace('personnes.push({id:r.id, ...payload}); render();', 'personnes.push({id:r.id, ...payload}); render(); try{ if(typeof scheduleAutoSaveProjet===\'function\') scheduleAutoSaveProjet(); }catch(e){}');
  fs.writeFileSync('public/js/04-personnes.js', c04, 'utf8');
  console.log('04 patched ajouter');
}
console.log('front done');
