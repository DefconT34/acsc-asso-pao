// 02-storage.js - Load & Save (v8.7 - refresh + garder selection courante)
async function refreshFiltreProjet(){
  try{
    const j=await (await fetch('/api/projets')).json();
    const arr=Array.isArray(j)? j : (j.rows||[]);
    const sel=document.getElementById('filterProjet'); if(!sel) return;
    // garder le code courant (localStorage prioritaire, sinon valeur du select)
    const cur=(typeof getCurrentProjetCode==='function' ? getCurrentProjetCode() : '') || sel.value || '';
    sel.innerHTML='<option value="">Tous projets</option>'+arr.map(function(p){return '<option value="'+p.code+'">'+p.code+' '+(p.statutProjet==='cloture'?' [CLOTURE]':'')+' - '+(p.titre||'')+'</option>'}).join('');
    if(cur && arr.some(function(p){return p.code===cur;})) sel.value=cur;
    // synchro bouton terminer apres refresh
    if(typeof updateTerminerBtn==='function') try{ updateTerminerBtn(); }catch{}
  }catch(e){}
}
async function load(){
  const s = await (await fetch('/api/settings')).json();
  let pers = await (await fetch('/api/personnes')).json();
  // compat pagination : si objet avec rows
  if(pers && pers.rows) pers = pers.rows;
  personnes = pers;
  try{ sites = JSON.parse(s.sites||'[]') }catch{ sites=[] }
  $('gerant').value = s.gerant; $('devise').value = s.devise;
  $('taux').value = s.taux; $('factureTransit').value = s.factureTransit;
  $('poidsTotal').value = s.poidsTotal;
  if($('pinInput') && s.pin) $('pinInput').value = s.pin;
  if($('gerantMobile')) $('gerantMobile').value = s.gerant;
  renderSites(); render();
  chargerBadgeHist(); refreshDark();
  // AUTO-SAVE avec confirmation : ne poste PLUS sans validation
  // Toutes les 5 min, si donnees presentes, on propose (confirm) d'ouvrir "Nouveau projet" — aucune creation auto
  setInterval(()=>{ if(personnes.length>0) autoSaveHist(); }, 5*60*1000);
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
      gerant:$('gerant').value, devise:$('devise').value,
      taux:parseFloat($('taux').value)||615, pays:'us',
      factureTransit:parseFloat($('factureTransit').value)||0,
      poidsTotal:parseFloat($('poidsTotal').value)||0, sites
    })
  }).then(function(){ if(typeof scheduleAutoSaveProjet==='function' && (typeof getCurrentProjetCode==='function' ? getCurrentProjetCode() : '')) scheduleAutoSaveProjet(); }),400);
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