// 07-historique.js v8.6
let histCache=[], histSelectedId=null, histPage=1;
// esc() et toast() definis dans 01-core.js
async function sauvegarderHistoriqueModal(){
  const hc=document.getElementById('histCode'); if(hc) hc.value='';
  const hs=document.getElementById('histStatutNew'); if(hs) hs.value='en_cours';
 if(personnes.length===0) toast('Projet vide — tu pourras ajouter les commandes apres'); $('histTitre').value=''; $('histNote').value=''; if($('histCode')) $('histCode').value=''; if($('histStatutNew')) $('histStatutNew').value='en_cours'; try{ const r=await fetch('/api/projets'); const pj=await r.json(); const arr=Array.isArray(pj)?pj:(pj.rows||[]); const y=new Date().getFullYear(); const codes=arr.map(x=>x.code).filter(Boolean); let max=0; codes.forEach(c=>{const m=String(c).match(new RegExp('ACSC-'+y+'-(\\d+)')); if(m) max=Math.max(max, parseInt(m[1],10));}); const sugg='ACSC-'+y+'-'+String(max+1).padStart(4,'0'); const hc2=document.getElementById('histCode'); if(hc2 && !hc2.value) hc2.placeholder=sugg+' (auto si vide)'; const hint=document.getElementById('histCodeHint'); if(hint) hint.textContent='Laisse vide -> '+sugg+' auto. '+personnes.length+' commande(s) actuelle(s) seront liees.'; }catch(e){} $('modalSaveHist').classList.remove('hidden'); }
function validateHistCode(){
  const el=document.getElementById('histCode'), err=document.getElementById('histCodeError'), btn=document.getElementById('btnCreerProjet');
  const v=(el && el.value || '').trim().toUpperCase();
  const pat=/^ACSC-\d{4}-\d{4,5}$/;
  if(!v){ if(err) err.classList.add('hidden'); if(el) el.classList.remove('field-error'); if(btn) btn.disabled=false; return true; }
  if(!pat.test(v)){ if(err){ err.textContent='Format invalide (ex: ACSC-2026-0001)'; err.classList.remove('hidden'); } if(el) el.classList.add('field-error'); if(btn) btn.disabled=true; return false; }
  if(err) err.classList.add('hidden'); if(el) el.classList.remove('field-error'); if(btn) btn.disabled=false; return true;
}
function closeSaveHist(){ $('modalSaveHist').classList.add('hidden'); const e=document.getElementById('histCodeError'); if(e) e.classList.add('hidden'); }
async function confirmSauvegarder(){
  const titre=$('histTitre').value.trim(), note=$('histNote').value.trim();
  const totalFinal=$('totalFinal')?.innerText||'0 XOF';
  const data={ personnes:JSON.parse(JSON.stringify(personnes)), sites:JSON.parse(JSON.stringify(sites)), settings:{gerant:$('gerant').value, devise:$('devise').value, taux:$('taux').value, factureTransit:$('factureTransit').value, poidsTotal:$('poidsTotal').value}, totaux:{totalFinal}, details:lastDetails };
  const code=(document.getElementById('histCode')?.value||'').trim().toUpperCase();
  if(code && !/^ACSC-\d{4}-\d{4,5}$/.test(code)) return toast('Code invalide ACSC-YYYY-####');
  if(code && !validateHistCode()) return;
  const statutProjet=document.getElementById('histStatutNew')?.value||'en_cours';
  const r2=await fetch('/api/historique',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({gerant:$('gerant').value||'President', totalFinal, data, code, statutProjet, titre, note})});
  if(!r2.ok){
    const j=await r2.json().catch(()=>({}));
    if(r2.status===409 && j.suggestion){ const e=document.getElementById('histCodeError'); if(e){e.textContent=j.error+' -> suggestion: '+j.suggestion; e.classList.remove('hidden');} toast(j.error); return; }
    if(r2.status===400){ const e=document.getElementById('histCodeError'); if(e){e.textContent=j.error; e.classList.remove('hidden');} toast(j.error||'Erreur'); return; }
    toast('Erreur sauvegarde'); return;
  }
  const rj=await r2.json().catch(()=>({})); closeSaveHist(); if(rj.code){ toast('Projet '+rj.code+' cree'); if(typeof setCurrentProjet==='function') setCurrentProjet(rj.code, rj.id||null); const sel=document.getElementById('filterProjet'); if(sel) sel.value=rj.code; if(typeof updateTerminerBtn==='function') updateTerminerBtn(); } else toast('Sauvegarde OK'); const sb=document.getElementById('saveBanner'); if(sb) sb.classList.add('hidden'); chargerBadgeHist();
}
function sauvegarderHistorique(){ sauvegarderHistoriqueModal(); }
async function chargerBadgeHist(){
  try{
    const j=await (await fetch('/api/historique?limit=1')).json();
    const total=j.total ?? (Array.isArray(j)?j.length:(j.rows?.length||0));
    const b=$('badgeHist'); if(b){ if(total>0){b.innerText=total; b.classList.remove('hidden');} else b.classList.add('hidden'); }
    try{
      const c1=await (await fetch('/api/historique?limit=1&statut=en_cours')).json();
      const c2=await (await fetch('/api/historique?limit=1&statut=cloture')).json();
      const e1=document.getElementById('histCountEnCours'), e2=document.getElementById('histCountCloture');
      if(e1){ const n=c1.total??0; e1.textContent=n+' En cours'; e1.classList.toggle('hidden', n===0 && !e2); }
      if(e2){ const n=c2.total??0; e2.textContent=n+' Cl\u00F4tur\u00E9'; e2.classList.toggle('hidden', n===0 && !e1); }
      const hasAuto=await (await fetch('/api/historique?limit=50&q=Auto-save')).json();
      const btn=document.getElementById('purgeAutosaveBtn');
      if(btn) btn.classList.toggle('hidden', !(hasAuto.rows&&hasAuto.rows.length));
    }catch{}
  }catch{}
}
async function purgeAutoSave(){
  const ok=await showConfirm('Purger les projets Auto-save ?', 'Supprime tous les projets titre Auto-save.');
  if(!ok) return;
  const r=await fetch('/api/historique/purge-autosave',{method:'DELETE'});
  const j=await r.json(); toast((j.deleted||0)+' Auto-save purges'); ouvrirHistorique(1); chargerBadgeHist();
}
async function ouvrirHistorique(page=1){
  histPage=page; $('modalHist').classList.remove('hidden');
  const body=$('histBody'); body.innerHTML='<p class="text-center text-sm text-gray-400 py-8">Chargement...</p>';
  const q=$('searchHist')?.value||''; const limit=$('histLimit')?.value||'20'; const sort=document.getElementById('histSort')?.value||'date_desc'; const gerantFilter=document.getElementById('histGerant')?.value||'';
  let j=await (await fetch(`/api/historique?page=${histPage}&limit=${limit}&q=${encodeURIComponent(q)}&statut=${encodeURIComponent(document.getElementById('histStatut')?.value||'')}&sort=${encodeURIComponent(sort)}`)).json();
  if(Array.isArray(j)) j={rows:j, total:j.length, page:1, pages:1};
  histCache=j.rows||[]; const total=j.total||0;
  if(histCache.length===0){ body.innerHTML='<div class="text-center py-10"><p class="text-3xl">📭</p><p class="text-sm text-gray-400 mt-2">Aucune sauvegarde</p></div>'; const pg=$('histPagination'); if(pg) pg.innerHTML=''; chargerBadgeHist(); return; }
  body.innerHTML=histCache.map(row=>{
    let d; try{ d=JSON.parse(row.data);}catch{d=null;} if(typeof d==='string') try{d=JSON.parse(d);}catch{}
    const codeBadge=row.code?`<span class="inline-block bg-[#0A0A0A] text-[#C9A86A] px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">`+esc(row.code)+`</span>`:'';
    const badgeStatut=row.statutProjet==='cloture'?`<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[9px] font-bold">CLOTURE</span>`:`<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[9px] font-bold">EN COURS</span>`;
    return `<div class="bg-white border rounded-xl p-3 flex justify-between items-center">
      <div class="flex-1 min-w-0">
        <div class="font-bold text-sm truncate flex items-center gap-1">${codeBadge} ${esc(row.titre||row.code||row.gerant)} ${badgeStatut} <span class="font-normal text-gray-400">• ${esc(row.date)}</span></div>
        <div class="text-xs text-gray-500">${esc(row.gerant)} • ${(d?.personnes?.length??'?')} pers • ${(d?.sites?.length??'?')} sites • <span class="font-black text-orange-600">${esc(row.totalFinal)}</span></div>
        ${row.note?`<div class="text-[10px] text-gray-400 truncate">${esc(row.note)}</div>`:''}
        <div class="text-[10px] text-gray-400">#${row.id}</div>
      </div>
      <div class="flex gap-1 shrink-0 ml-2">
        <button onclick="voirHistDetail(${row.id})" class="bg-[#0F2A44] text-white px-3 py-1.5 rounded-full text-xs font-bold">Voir</button>
        <button onclick="supprimerHist(${row.id})" class="bg-red-50 text-red-600 border border-red-200 px-2 py-1.5 rounded-full text-xs font-bold">Suppr</button>
      </div>
    </div>`;
  }).join('');
  const pages=j.pages||1; const pag=$('histPagination');
  if(pag) pag.innerHTML=`<span>${total} sauvegarde(s)</span><span class="flex gap-1"><button onclick="ouvrirHistorique(${Math.max(1,histPage-1)})" class="px-2 py-1 border rounded ${histPage<=1?'opacity-30 pointer-events-none':''}">‹ Prev</button><span class="px-2 py-1 font-bold">${histPage}/${pages}</span><button onclick="ouvrirHistorique(${Math.min(pages,histPage+1)})" class="px-2 py-1 border rounded ${histPage>=pages?'opacity-30 pointer-events-none':''}">Next ›</button></span>`;
  chargerBadgeHist();
}
function closeHistorique(){ $('modalHist').classList.add('hidden'); }
