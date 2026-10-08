// 02-storage.js - Load & Save (v8.8 - CORS/CSP fix + error handling visible)
async function refreshFiltreProjet(){
  try{
    const r=await fetch('/api/projets');
    if(!r.ok){ console.error('[refreshFiltreProjet] HTTP',r.status, await r.text().catch(()=>'')); return; }
    const j=await r.json();
    const arr=Array.isArray(j)? j : (j.rows||[]);
    const sel=document.getElementById('filterProjet'); if(!sel) return;
    const cur=(typeof getCurrentProjetCode==='function' ? getCurrentProjetCode() : '') || sel.value || '';
    sel.innerHTML='<option value="">Tous projets</option>'+arr.map(function(p){return '<option value="'+p.code+'">'+p.code+' '+(p.statutProjet==='cloture'?' [CLOTURE]':'')+' - '+(p.titre||'')+'</option>'}).join('');
    if(cur && arr.some(function(p){return p.code===cur;})) sel.value=cur;
    if(typeof updateTerminerBtn==='function') try{ updateTerminerBtn(); }catch{}
  }catch(e){ console.error('[refreshFiltreProjet]',e); }
}
async function load(){
  try{
    const rs=await fetch('/api/settings');
    if(!rs.ok){ const t=await rs.text().catch(()=> ''); console.error('[load] GET /api/settings HTTP',rs.status,t); if(window.toast) toast('Erreur chargement settings (HTTP '+rs.status+')'); throw new Error('GET /api/settings '+rs.status); }
    const s = await rs.json();
    const rp=await fetch('/api/personnes');
    if(!rp.ok){ const t=await rp.text().catch(()=> ''); console.error('[load] GET /api/personnes HTTP',rp.status,t); throw new Error('GET /api/personnes '+rp.status); }
    let pers = await rp.json();
    if(pers && pers.rows) pers = pers.rows;
    personnes = Array.isArray(pers)? pers : [];
    try{ sites = JSON.parse(s.sites||'[]') }catch{ sites=[] }
    if($('gerant')) $('gerant').value = s.gerant || '';
    if($('devise')) $('devise').value = s.devise || 'USD';
    if($('taux')) $('taux').value = s.taux ?? 615;
    if($('factureTransit')) $('factureTransit').value = s.factureTransit ?? 48000;
    if($('poidsTotal')) $('poidsTotal').value = s.poidsTotal ?? 3.5;
    if($('pinInput') && s.pin) $('pinInput').value = s.pin;
    if($('gerantMobile')) $('gerantMobile').value = s.gerant || '';
    renderSites(); render();
    chargerBadgeHist(); refreshDark();
    setInterval(()=>{ if(personnes.length>0) autoSaveHist(); }, 5*60*1000);
  }catch(e){
    console.error('[load] fatal', e);
    if(window.toast) toast('Erreur chargement: '+(e.message||e));
  }
}
async function autoSaveHist(){
  const code=(typeof getCurrentProjetCode==='function' ? getCurrentProjetCode() : '') || (document.getElementById('filterProjet')?.value||'').trim().toUpperCase();
  if(code){
    if(typeof autoSaveCurrentProjet==='function') return autoSaveCurrentProjet();
    if(typeof scheduleAutoSaveProjet==='function') return scheduleAutoSaveProjet();
  }
  if(typeof showSaveBanner==='function') showSaveBanner();
  else { const b=document.getElementById('saveBanner'); if(b) b.classList.remove('hidden'); }
  return;
}
function showSaveBanner(){
  const b=document.getElementById('saveBanner');
  // ne pas afficher si projet ouvert (autosave silencieux dedie)
  const code=(typeof getCurrentProjetCode==='function' ? getCurrentProjetCode() : '') || (document.getElementById('filterProjet')?.value||'').trim().toUpperCase();
  if(code) return;
  if(b){ b.classList.remove('hidden'); }
}
function dismissSaveBanner(){
  const b=document.getElementById('saveBanner');
  if(b) b.classList.add('hidden');
}
// auto-dismiss banner when projet cree
document.addEventListener('click', (e)=>{
  if(e.target && e.target.id==='btnCreerProjet') dismissSaveBanner();
});
function save(){
  clearTimeout(tOut);
  tOut = setTimeout(()=> fetch('/api/settings',{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      gerant:($('gerant') && $('gerant').value)||'', devise:($('devise') && $('devise').value)||'USD',
      taux:parseFloat($('taux') && $('taux').value)||615, pays:'us',
      factureTransit:parseFloat($('factureTransit') && $('factureTransit').value)||0,
      poidsTotal:parseFloat($('poidsTotal') && $('poidsTotal').value)||0, sites
    })
  }).then(async function(r){ if(!r.ok){ const t=await r.text().catch(()=> ''); console.error('[save] POST /api/settings HTTP',r.status,t); if(window.toast) toast('Erreur sauvegarde settings (HTTP '+r.status+'): '+(t.slice(0,120)||r.statusText)); return; } if(typeof scheduleAutoSaveProjet==='function' && (typeof getCurrentProjetCode==='function' ? getCurrentProjetCode() : '')) scheduleAutoSaveProjet(); }).catch(function(e){ console.error('[save]',e); }),400);
}
document.addEventListener('DOMContentLoaded', function(){
  load().then(function(){
    // apres load: remplir filtre + restaurer selection courante + bouton terminer
    if(typeof refreshFiltreProjet==='function') refreshFiltreProjet().then(function(){
      const code=(typeof getCurrentProjetCode==='function'?getCurrentProjetCode():'');
      const sel=document.getElementById('filterProjet');
      if(sel && code) sel.value=code;
      if(typeof updateTerminerBtn==='function') updateTerminerBtn();
    });
  });
});