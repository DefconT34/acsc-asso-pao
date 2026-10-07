function showHistEditFields(row){
  const ed=document.getElementById('histDetailEdit');
  if(!ed) return;
  ed.classList.remove('hidden');
  document.getElementById('editHistCode').value=row.code||'';
  document.getElementById('editHistTitre').value=row.titre||'';
  document.getElementById('editHistNote').value=row.note||'';
  document.getElementById('editHistStatut').value=(row.statutProjet==='cloture'?'cloture':'en_cours');
  const isCloture=row.statutProjet==='cloture';
  document.getElementById('editHistStatus').innerText=isCloture?' \u26D4 Lecture seule - Reouvrir pour modifier':'';
  const btn=document.getElementById('btnSaveHistEdit'); if(btn){ btn.disabled=isCloture; btn.classList.toggle('opacity-40',isCloture); }
  const ec=document.getElementById('editHistCode'); if(ec) ec.disabled=isCloture;
  const et=document.getElementById('editHistTitre'); if(et) et.disabled=isCloture;
  const en=document.getElementById('editHistNote'); if(en) en.disabled=isCloture;
  const toggleBtn=document.getElementById('toggleHistStatutBtn'); if(toggleBtn) toggleBtn.innerText=isCloture?'\uD83D\uDD13 Reouvrir':'\uD83D\uDD12 Cloturer';
}
async function saveHistEdit(){
  if(!histSelectedId) return;
  const code=document.getElementById('editHistCode').value.trim().toUpperCase();
  const titre=document.getElementById('editHistTitre').value.trim();
  const note=document.getElementById('editHistNote').value;
  const statutProjet=document.getElementById('editHistStatut').value;
  const st=document.getElementById('editHistStatus');
  st.innerText='...';
  const r=await fetch('/api/historique/'+histSelectedId,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,titre,note,statutProjet})});
  if(!r.ok){ const j=await r.json().catch(()=>({})); st.innerText=j.error||'Erreur'; st.className='text-[10px] self-center text-red-600'; return; }
  st.innerText='OK'; st.className='text-[10px] self-center text-emerald-600';
  toast('Projet mis a jour');
  ouvrirHistorique(histPage);
  // refresh detail header
  const row=await (await fetch('/api/historique/'+histSelectedId)).json();
  document.getElementById('histDetailTitre').innerText=(row.code? row.code+' • ':'')+(row.titre||'')+' • '+row.date+' ['+(row.statutProjet==='cloture'?'CLOTURE':'EN COURS')+']';
}
async function toggleHistStatut(){
  if(!histSelectedId) return;
  const row=await (await fetch('/api/historique/'+histSelectedId)).json();
  const next=row.statutProjet==='cloture'?'en_cours':'cloture';
  await fetch('/api/historique/'+histSelectedId,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({statutProjet:next})});
  toast(next==='cloture'?'Projet cloture':'Reouvert en cours');
  voirHistDetail(histSelectedId); ouvrirHistorique(histPage);
}
async function voirHistDetail(id){
  histSelectedId=id;
  const row=await (await fetch('/api/historique/'+id)).json();
  let d; try{ d=JSON.parse(row.data); if(typeof d==='string') d=JSON.parse(d);}catch{d=null;}
  const statutBadge = (row.statutProjet==='cloture') ? '[CLOTURE]' : '[EN COURS]';
  $('histDetailTitre').innerText=`${row.code?row.code+' • ':''}#${row.id} • ${row.titre||row.gerant} • ${row.date} ${statutBadge}`;
  showHistEditFields(row);
  let persRows='', sitesRows='', detailsRows='';
  if(d && d.personnes) persRows=d.personnes.map(p=>`<tr class="border-t text-xs"><td class="p-2">${esc(p.nom)}</td><td class="p-2">${esc(p.telephone||'')}</td><td class="p-2 text-center">${p.montant}</td><td class="p-2 text-center">${p.quantite}</td><td class="p-2">${esc(p.site)} ${p.statut?`[${p.statut}]`:''}</td></tr>`).join('');
  if(d && d.sites) sitesRows=d.sites.map(s=>`<tr class="border-t text-xs"><td class="p-2">${esc(s.label)}</td><td class="p-2 text-center">${esc(s.devise)} @${s.taux}</td><td class="p-2 text-center">${s.sousTotal}</td><td class="p-2 text-center">${s.total}</td></tr>`).join('');
  if(d && d.details) detailsRows=d.details.map(x=>`<tr class="border-t text-xs"><td class="p-2">${esc(x.nom)}</td><td class="p-2">${esc(x.siteLabel)}</td><td class="p-2 text-right">${fmt(x.phXOF)}</td><td class="p-2 text-right font-bold text-orange-600">${fmt(x.final)}</td></tr>`).join('');
  $('histDetailBody').innerHTML=`<div class="bg-gray-50 rounded-xl p-3 text-xs"><div><b>Code:</b> ${esc(row.code||'')} • <b>Gérant:</b> ${esc(row.gerant)} • <b>Total:</b> ${esc(row.totalFinal)}</div><div><b>Titre (projet):</b> ${esc(row.titre||'')} • <b>Statut:</b> ${row.statutProjet==='cloture'?'<span class="bg-gray-800 text-white px-1.5 rounded-full">CLOTURE</span>':'<span class="bg-emerald-100 text-emerald-700 px-1.5 rounded-full">EN COURS</span>'} <button id="toggleHistStatutBtn" onclick="toggleHistStatut()" class="ml-2 bg-white border px-2 py-0.5 rounded-full text-[10px] font-bold">${row.statutProjet==='cloture'?'Réouvrir':'Clôturer'}</button></div>${row.note?`<div><b>Note:</b> ${esc(row.note)}</div>`:''}</div><h4 class="font-bold text-sm mt-3">Personnes (${(d.personnes||[]).length})</h4><table class="w-full border rounded-xl overflow-hidden"><thead class="bg-gray-100 text-[10px]"><tr><th class="p-2 text-left">Nom</th><th class="p-2 text-left">Tel</th><th class="p-2">Montant</th><th class="p-2">Qte</th><th class="p-2">Site</th></tr></thead><tbody>${persRows||'<tr><td colspan=5 class="p-3 text-center text-gray-400">—</td></tr>'}</tbody></table><h4 class="font-bold text-sm mt-3">Sites (${(d.sites||[]).length})</h4><table class="w-full border rounded-xl overflow-hidden"><thead class="bg-gray-100 text-[10px]"><tr><th class="p-2 text-left">Label</th><th class="p-2">Devise/Taux</th><th class="p-2">Sous-total</th><th class="p-2">Total</th></tr></thead><tbody>${sitesRows||'<tr><td colspan=4 class="p-3 text-center text-gray-400">—</td></tr>'}</tbody></table>${detailsRows?`<h4 class="font-bold text-sm mt-3">Details</h4><table class="w-full border rounded-xl overflow-hidden"><thead class="bg-gray-100 text-[10px]"><tr><th class="p-2 text-left">Nom</th><th class="p-2">Site</th><th class="p-2 text-right">Phase1</th><th class="p-2 text-right">Final</th></tr></thead><tbody>${detailsRows}</tbody></table>`:''}`;
  $('modalHistDetail').classList.remove('hidden');
}
function closeHistDetail(){ $('modalHistDetail').classList.add('hidden'); histSelectedId=null; }
async function restaurerHistorique(){
  if(!histSelectedId) return;
  const ok=await showConfirm('Restaurer cet etat ?', 'Les donnees actuelles seront remplacees.'); if(!ok) return;
  const row=await (await fetch('/api/historique/'+histSelectedId)).json();
  let d; try{ d=JSON.parse(row.data); if(typeof d==='string') d=JSON.parse(d);}catch{ return toast('Donnees illisibles'); }
  if(d.settings){ $('gerant').value=d.settings.gerant||''; $('devise').value=d.settings.devise||'USD'; $('taux').value=d.settings.taux||615; $('factureTransit').value=d.settings.factureTransit||0; $('poidsTotal').value=d.settings.poidsTotal||0; }
  sites=d.sites||[];
  let actuelles=await (await fetch('/api/personnes')).json(); if(actuelles.rows) actuelles=actuelles.rows;
  for(const p of actuelles) await fetch('/api/personnes/'+p.id,{method:'DELETE'});
  personnes=[];
  for(const p of (d.personnes||[])){ const r=await (await fetch('/api/personnes',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({nom:p.nom, montant:p.montant, quantite:p.quantite, site:p.site, telephone:p.telephone||'', statut:p.statut||'impaye'})})).json(); personnes.push({id:r.id, nom:p.nom, montant:p.montant, quantite:p.quantite, site:p.site, telephone:p.telephone||'', statut:p.statut||'impaye'}); }
  await fetch('/api/settings',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({gerant:$('gerant').value, devise:$('devise').value, taux:parseFloat($('taux').value)||615, pays:'us', factureTransit:parseFloat($('factureTransit').value)||0, poidsTotal:parseFloat($('poidsTotal').value)||0, sites})});
  renderSites(); render(); closeHistDetail(); closeHistorique(); toast('Etat restaure #'+histSelectedId); try{ if(typeof setCurrentProjet==='function' && row.code) setCurrentProjet(row.code, row.id); }catch(e){}
}
async function dupliquerHist(id){
  const r=await fetch('/api/historique/'+id+'/duplicate',{method:'POST'});
  if(!r.ok){ toast('Echec duplication'); return; }
  const j=await r.json(); toast('Copie '+j.code+' creee'); ouvrirHistorique(1);
}
async function exporterHistPDF(){
  if(!histSelectedId) return;
  if(typeof genererPDFGlobal==='function'){
    const row=await (await fetch('/api/historique/'+histSelectedId)).json();
    // genere PDF depuis donnees actuelles si on veut export rapide: on utilise window.print style via genererPDFGlobal snapshot
    // sinon snapshot du detail: utilise jspdf direct pour historique
    let d; try{ d=JSON.parse(row.data); if(typeof d==='string') d=JSON.parse(d);}catch{d=null;}
    const {jsPDF}=window.jspdf||{};
    if(!jsPDF){ toast('PDF indisponible'); return; }
    const doc=new jsPDF();
    doc.setFontSize(14); doc.text((row.code||'')+' '+(row.titre||''),10,15);
    doc.setFontSize(10); doc.text('Date: '+(row.date||'')+'  Gerant: '+(row.gerant||'')+'  Total: '+(row.totalFinal||''),10,22);
    let y=30;
    if(d && d.personnes){ doc.text('Personnes:',10,y); y+=6; for(const p of d.personnes.slice(0,30)){ doc.text('- '+p.nom+' | '+p.montant+' x'+p.quantite+' ['+p.site+']',10,y); y+=5; if(y>280){doc.addPage(); y=10;} }
    }
    doc.save((row.code||'projet')+'.pdf');
    toast('PDF exporte');
  }
}
async function supprimerHist(id){ const ok=await showConfirm('Supprimer #'+id+' ?', 'Irreversible'); if(!ok) return; await fetch('/api/historique/'+id,{method:'DELETE'}); toast('Supprime #'+id); ouvrirHistorique(histPage); }
async function viderHistorique(){ const ok=await showConfirm('Vider TOUT l historique ?', 'Irreversible.'); if(!ok) return; await fetch('/api/historique',{method:'DELETE'}); toast('Historique vide'); ouvrirHistorique(1); }
document.addEventListener('click', (e)=>{ if(e.target.id==='modalHist') closeHistorique(); if(e.target.id==='modalHistDetail') closeHistDetail(); if(e.target.id==='modalSaveHist') closeSaveHist(); });
