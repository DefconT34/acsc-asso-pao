// 08-projet-state.js - Projet ouvert + autosave cible + terminer (v8.7 fix bouton visible)
let currentProjetCode = '';
let currentProjetId = null;
let autoSaveTimer = null;
let autoSaveInFlight = false;
try{
  currentProjetCode = (localStorage.getItem('acsc_currentProjetCode')||'').trim().toUpperCase();
  const v=localStorage.getItem('acsc_currentProjetId'); if(v) currentProjetId=parseInt(v,10)||null;
}catch{}
function setCurrentProjet(code, id){
  currentProjetCode=(code||'').trim().toUpperCase();
  currentProjetId=id||null;
  try{
    if(currentProjetCode) localStorage.setItem('acsc_currentProjetCode', currentProjetCode); else localStorage.removeItem('acsc_currentProjetCode');
    if(currentProjetId) localStorage.setItem('acsc_currentProjetId', String(currentProjetId)); else localStorage.removeItem('acsc_currentProjetId');
  }catch{}
  const sel=document.getElementById('filterProjet');
  if(sel && currentProjetCode) sel.value=currentProjetCode;
  updateTerminerBtn();
  if(typeof refreshGateProjet==='function') try{refreshGateProjet();}catch{}
  if(typeof refreshFiltreProjet==='function') try{refreshFiltreProjet();}catch{}
}
function clearCurrentProjet(){ setCurrentProjet('', null); }
function getCurrentProjetCode(){ return (currentProjetCode || (document.getElementById('filterProjet')?.value||'').trim().toUpperCase()); }
function buildProjetSnapshot(){
  const totalFinal=document.getElementById('totalFinal')?.innerText||'0 XOF';
  return { gerant: document.getElementById('gerant')?.value||'President', totalFinal, data:{ personnes: JSON.parse(JSON.stringify(personnes)), sites: JSON.parse(JSON.stringify(sites)), settings:{gerant: document.getElementById('gerant')?.value||'', devise: document.getElementById('devise')?.value||'USD', taux: document.getElementById('taux')?.value||615, factureTransit: document.getElementById('factureTransit')?.value||0, poidsTotal: document.getElementById('poidsTotal')?.value||0 }, totaux:{totalFinal}, details: JSON.parse(JSON.stringify(lastDetails||[])) } };
}
async function autoSaveCurrentProjet(){
  const code=getCurrentProjetCode();
  if(!code){ if(typeof showSaveBanner==='function') showSaveBanner(); return; }
  try{
    const pj=await (await fetch('/api/projets')).json();
    const arr=Array.isArray(pj)?pj:(pj.rows||[]);
    const proj=arr.find(p=>p.code===code);
    if(!proj){ clearCurrentProjet(); toast('Projet ouvert introuvable'); return; }
    if(proj.statutProjet==='cloture'){ toast('Projet '+code+' cloture - autosave bloque'); clearCurrentProjet(); updateTerminerBtn(); return; }
    if(!currentProjetId && proj.id){ currentProjetId=proj.id; try{localStorage.setItem('acsc_currentProjetId', String(proj.id));}catch{} }
  }catch(e){}
  if(autoSaveInFlight) return;
  autoSaveInFlight=true;
  try{
    const snap=buildProjetSnapshot();
    const url = currentProjetId ? '/api/historique/'+currentProjetId : '/api/historique/by-code/'+encodeURIComponent(code);
    const r=await fetch(url,{method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ data: snap.data, totalFinal: snap.totalFinal, gerant: snap.gerant })});
    if(r.ok){
      toast('Autosave '+code+' ok');
      const dot=document.getElementById('autoSaveDot');
      if(dot){ dot.textContent=' autosave '+new Date().toLocaleTimeString('fr-FR'); dot.className='text-[10px] text-emerald-600'; setTimeout(function(){dot.textContent='';},3500); }
      if(typeof chargerBadgeHist==='function') chargerBadgeHist();
    } else {
      const j=await r.json().catch(function(){return {};});
      if(r.status===404) clearCurrentProjet();
      toast(j.error||'Autosave echec');
    }
  }catch(e){ console.warn('autosave fail',e); }
  finally{ autoSaveInFlight=false; }
}
function scheduleAutoSaveProjet(){
  const code=getCurrentProjetCode();
  if(!code) return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer=setTimeout(function(){ autoSaveCurrentProjet(); }, 1200);
}
async function terminerProjetCourant(){
  const code=getCurrentProjetCode();
  if(!code){ toast('Aucun projet ouvert'); return; }
  const ok=await showConfirm('Terminer projet '+code+' ?', 'Le projet sera CLOTURE : plus de commandes, autosave bloque. Reouverture possible via Historique.');
  if(!ok) return;
  try{
    const url = currentProjetId ? '/api/historique/'+currentProjetId : '/api/historique/by-code/'+encodeURIComponent(code);
    const r=await fetch(url,{method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ statutProjet:'cloture' })});
    if(!r.ok){ const j=await r.json().catch(function(){return {};}); return toast(j.error||'Erreur cloture'); }
    toast('Projet '+code+' cloture');
    clearCurrentProjet();
    if(typeof refreshFiltreProjet==='function') await refreshFiltreProjet();
    if(typeof refreshGateProjet==='function') await refreshGateProjet();
    updateTerminerBtn();
    const b=document.getElementById('saveBanner'); if(b) b.classList.add('hidden');
  }catch(e){ toast('Erreur cloture'); }
}
function updateTerminerBtn(){
  const btn=document.getElementById('btnTerminerProjet');
  const dot=document.getElementById('autoSaveDot');
  if(!btn) return;
  let code=getCurrentProjetCode();
  if(code){
    btn.classList.remove('hidden');
    btn.style.display='';
    btn.title='Terminer '+code+' (cloture definitive)';
    const span=btn.querySelector('#terminerCode');
    if(span) span.textContent=code;
    if(dot && !dot.textContent) dot.textContent='Projet ouvert : '+code;
    fetch('/api/projets').then(function(r){return r.json();}).then(function(j){
      const arr=Array.isArray(j)?j:(j.rows||[]);
      const p=arr.find(function(x){return x.code===code;});
      if(p && p.statutProjet==='cloture'){ btn.classList.add('hidden'); clearCurrentProjet(); if(dot) dot.textContent=''; }
    }).catch(function(){});
  } else {
    // pas de projet selectionne : auto-selection du projet en cours le plus recent pour rendre bouton visible immediatement
    fetch('/api/projets').then(function(r){return r.json();}).then(function(j){
      const arr=Array.isArray(j)?j:(j.rows||[]);
      const enc=arr.filter(function(x){return x.statutProjet!=='cloture';});
      if(enc.length>=1){
        const p=enc[0];
        currentProjetCode=p.code; currentProjetId=p.id||null;
        try{ localStorage.setItem('acsc_currentProjetCode', p.code); if(p.id) localStorage.setItem('acsc_currentProjetId', String(p.id)); }catch{}
        const sel=document.getElementById('filterProjet');
        if(sel) sel.value=p.code;
        btn.classList.remove('hidden'); btn.style.display='';
        const span=btn.querySelector('#terminerCode'); if(span) span.textContent=p.code;
        if(dot) { dot.textContent='Projet ouvert : '+p.code+' (auto)'; dot.className='text-[10px] text-emerald-600'; }
        if(enc.length>1 && dot) dot.textContent+=' - '+enc.length+' projets en cours (change via filtre ci-dessus)';
      } else {
        btn.classList.add('hidden');
        if(dot) dot.textContent='';
      }
    }).catch(function(){ btn.classList.add('hidden'); });
  }
}
document.addEventListener('DOMContentLoaded', function(){
  // 1) apres 600ms : si code en memoire, afficher bouton + remplir filtre
  setTimeout(function(){
    const sel=document.getElementById('filterProjet');
    if(sel && currentProjetCode) sel.value=currentProjetCode;
    updateTerminerBtn();
  }, 600);
  // 2) apres 1400ms : si toujours pas de code mais projets existent, auto-select si unique
  setTimeout(function(){ if(!getCurrentProjetCode()) updateTerminerBtn(); }, 1400);
  const sel=document.getElementById('filterProjet');
  if(sel) sel.addEventListener('change', function(){
    const v=(sel.value||'').trim().toUpperCase();
    if(v){
      fetch('/api/projets').then(function(r){return r.json();}).then(function(j){
        const arr=Array.isArray(j)?j:(j.rows||[]);
        const p=arr.find(function(x){return x.code===v;});
        setCurrentProjet(v, p? p.id : null);
      }).catch(function(){ setCurrentProjet(v, null); });
    } else { clearCurrentProjet(); updateTerminerBtn(); }
  });
});
// filet securite : si filtre rempli apres coup, resync bouton toutes les 2s pendant 10s
(function(){
  let n=0; const iv=setInterval(function(){ n++; updateTerminerBtn(); if(n>5) clearInterval(iv); }, 2000);
})();
