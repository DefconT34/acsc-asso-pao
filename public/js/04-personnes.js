// 04-personnes.js
function getFilteredPersonnes(){
  let q=($('searchPers')?.value||'').toLowerCase();
  let fSite=$('filterSite')?.value||'';
  let fStatut=$('filterStatut')?.value||'';
  let sort=$('sortPers')?.value||'';
  let fProjet=($('filterProjet')?.value||'').trim().toUpperCase();
  let arr=[...personnes];
  if(q) arr=arr.filter(p=> (p.nom+(p.telephone||'')+(p.lienProduit||'')+(p.projetCode||'')).toLowerCase().includes(q));
  if(fSite) arr=arr.filter(p=> p.site===fSite);
  if(fStatut) arr=arr.filter(p=> (p.statut||'impaye')===fStatut);
  if(fProjet) arr=arr.filter(p=> (p.projetCode||'').toUpperCase()===fProjet);
  if(sort==='montant_desc') arr.sort((a,b)=>b.montant-a.montant);
  else if(sort==='montant_asc') arr.sort((a,b)=>a.montant-b.montant);
  else if(sort==='qte_desc') arr.sort((a,b)=>b.quantite-a.quantite);
  else if(sort==='nom') arr.sort((a,b)=>a.nom.localeCompare(b.nom));
  return arr;
}
const debouncedRender = debounce(()=> render(), 300);
function render(){
  const list=getFilteredPersonnes();
  const info=$('filterInfo');
  if(info) info.innerText = list.length!==personnes.length ? `Affichage ${list.length}/${personnes.length}` : `${personnes.length} personne(s)`;
  $('tbody').innerHTML='';
  list.forEach(p=>{
    const opts = sites.map(s=>`<option value="${s.id}" ${p.site==s.id?'selected':''}>${esc(s.label)} @${s.taux} ${s.devise}</option>`).join('');
    const statut=p.statut||'impaye';
    const badge=statut==='paye' ? '<span class="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold">PAYE</span>' : statut==='partiel' ? '<span class="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold">PARTIEL</span>' : '<span class="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[9px] font-bold">IMPAYE</span>';
    const err=valPersLocal(p)?` title="${esc(valPersLocal(p))}" style="background:#fee2e2"`:'';
    const pc = p.projetCode ? `<span class="bg-amber-100 text-amber-800 border border-amber-200 px-1 py-0.5 rounded-full text-[8px] font-mono font-bold whitespace-nowrap">${esc(p.projetCode)}</span>` : `<span class="text-gray-300 text-[9px]">—</span>`;
    const sl = p.lienProduit ? (p.lienProduit.length>28 ? p.lienProduit.slice(0,28)+'…' : p.lienProduit) : '';
    const lien = p.lienProduit ? `<a href="${esc(p.lienProduit)}" target="_blank" class="text-blue-600 underline text-[10px] block truncate max-w-[150px] font-mono" title="${esc(p.lienProduit)}">🔗 ${esc(sl)}</a><button onclick="event.stopPropagation();navigator.clipboard.writeText('${esc(p.lienProduit).replace(/'/g,"\\'")}');toast('Lien copie')" class="text-[8px] bg-gray-100 px-1 py-0.5 rounded-full mt-0.5">copier</button>` : `<span class="text-gray-300 text-[10px]">— pas de lien</span>`;
    const cap = p.capture ? `<div class="flex items-center gap-1 mt-1"><img src="${p.capture}" onclick="openCaptureModal(${p.id})" class="h-9 w-9 object-cover rounded border cursor-zoom-in shadow" title="Voir capture"><button onclick="openCaptureModal(${p.id})" class="text-[9px] text-blue-600 underline">capture</button></div>` : `<span class="text-gray-300 text-[10px]">— pas de capture</span>`;
    $('tbody').innerHTML+=`<tr class="border-t hover:bg-amber-50/40"${err}>
      <td class="p-1 align-top"><input value="${esc(p.nom)}" onchange="update(${p.id},'nom',this.value, this)" class="border rounded p-1 w-full font-bold text-xs"><input value="${esc(p.telephone||'')}" onchange="update(${p.id},'telephone',this.value, this)" placeholder="22507000000" class="border rounded p-1 w-full text-[10px] mt-1 bg-green-50 font-mono"></td>
      <td class="p-1 text-center align-top pt-2">${pc}</td>
      <td class="p-1 align-top pt-1"><input type="number" min="1" value="${p.montant}" onchange="update(${p.id},'montant',this.value, this)" class="border rounded p-1 w-16 text-xs font-bold"></td>
      <td class="p-1 align-top pt-1"><input type="number" min="1" step="1" value="${p.quantite}" onchange="update(${p.id},'quantite',this.value, this)" class="border rounded p-1 w-10 text-center text-xs font-bold"></td>
      <td class="p-1 align-top pt-1"><select onchange="update(${p.id},'site',this.value)" class="border rounded p-1 bg-blue-50 font-bold text-[11px] w-24">${opts}</select></td>
      <td class="p-1 align-top max-w-[165px]"><div class="space-y-0.5">${lien}<div class="mt-1">${cap}</div></div></td>
      <td class="p-1 text-center align-top pt-1"><select onchange="updateStatut(${p.id},this.value)" class="border rounded text-[10px] p-1"><option value="impaye" ${statut==='impaye'?'selected':''}>Impaye</option><option value="partiel" ${statut==='partiel'?'selected':''}>Partiel</option><option value="paye" ${statut==='paye'?'selected':''}>Paye</option></select><div class="mt-1">${badge}</div></td>
      <td class="align-top pt-1 text-center whitespace-nowrap"><button onclick="openDetailPers(${p.id})" class="text-blue-500 hover:bg-blue-50 rounded px-1 text-xs" title="Details">👁️</button><button onclick="supprimer(${p.id})" class="text-red-400 font-bold px-1 hover:bg-red-50 rounded" title="Supprimer">✕</button></td></tr>`;
  });
  calculer();
}
function openCaptureModal(id){ const p=personnes.find(x=>x.id==id); if(!p) return; const m=$('modalCapture'),img=$('capturePreviewImg'),link=$('captureLien'),meta=$('captureMeta'),btn=$('captureLienBtn'); if(img) img.src=p.capture||''; if(link){ link.href=p.lienProduit||'#'; link.innerText=p.lienProduit||'—'; link.style.display=p.lienProduit?'block':'none'; } if(meta) meta.innerText=p.nom+' • '+(p.telephone||'')+' • '+(p.projetCode||'sans projet')+' • '+(p.capture?Math.round(p.capture.length/1024)+'Ko':''); if(btn) btn.href=p.lienProduit||'#'; if(m) m.classList.remove('hidden'); }
function closeCaptureModal(){ const m=$('modalCapture'); if(m) m.classList.add('hidden'); }
function openDetailPers(id){ const p=personnes.find(x=>x.id==id); if(!p) return openCaptureModal(id); const m=$('modalPersDetail'); if(!m) return openCaptureModal(id); $('detailNom').innerText=p.nom||''; $('detailTel').innerText=p.telephone||'—'; $('detailProjet').innerText=p.projetCode||'—'; $('detailMontant').innerText=p.montant||0; $('detailQte').innerText=p.quantite||0; $('detailSite').innerText=(sites.find(s=>s.id===p.site)?.label||p.site||''); $('detailStatut').innerText=p.statut||'impaye'; const a=$('detailLien'),e1=$('detailLienEmpty'); if(a){ a.href=p.lienProduit||'#'; a.innerText=p.lienProduit||'—'; a.style.display=p.lienProduit?'inline':'none'; if(e1) e1.style.display=p.lienProduit?'none':'inline'; } const img=$('detailCaptureImg'),e2=$('detailCaptureEmpty'); if(p.capture){ img.src=p.capture; img.style.display='block'; if(e2) e2.style.display='none'; } else { img.style.display='none'; if(e2) e2.style.display='block'; } m.classList.remove('hidden'); }
function closeDetailPers(){ const m=$('modalPersDetail'); if(m) m.classList.add('hidden'); }
async function update(id,ch,v, el){
  let p=personnes.find(x=>x.id===id);
  const old={...p};
  p[ch]=['nom','site','telephone','statut','projetCode','lienProduit','capture'].includes(ch)?v:parseFloat(v)||0;
  if(ch==='quantite') p[ch]=parseInt(v)||0;
  const e=valPersLocal(p);
  if(el) markFieldError(el, !!e);
  if(e){ p[ch]=old[ch]; toast('Invalide: '+e); if(el) el.title=e; render(); return; }
  if(el) markFieldError(el,false);
  const res=await fetch('/api/personnes/'+id,{method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(p)});
  if(!res.ok){ const j=await res.json(); toast(j.error||'Erreur'); p[ch]=old[ch]; if(el) markFieldError(el,true); render(); return; }
  calculer();
}
async function updateStatut(id, statut){
  const p=personnes.find(x=>x.id===id); p.statut=statut;
  if(statut==='paye'){ p.datePaiement=new Date().toLocaleDateString('fr-FR'); p.montantPaye=p.montant; }
  else if(statut==='impaye'){ p.montantPaye=0; }
  await fetch('/api/personnes/'+id+'/statut',{method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({statut, datePaiement:p.datePaiement||'', montantPaye:p.montantPaye||0})});
  await fetch('/api/personnes/'+id,{method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(p)});
  render();
}
async function ajouterPersonne(){
  let sid=sites[0]?.id||'site1';
  let pc=(document.getElementById('filterProjet')?.value||'').trim().toUpperCase();
  if(!pc){ try{ const pj=await (await fetch('/api/projets')).json(); const ar=Array.isArray(pj)?pj:(pj.rows||[]); const enc=ar.filter(x=>x.statutProjet!=='cloture'); if(enc[0]) pc=enc[0].code; }catch(e){} }
  if(!pc){ toast('Cree un projet d\'abord'); if(typeof sauvegarderHistoriqueModal==='function') sauvegarderHistoriqueModal(); return; }
  const payload={nom:'Nouveau',montant:100,quantite:5,site:sid,telephone:'', statut:'impaye', projetCode:pc, lienProduit:'', capture:''};
  let res=await fetch('/api/personnes',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
  if(!res.ok){ const j=await res.json(); return toast(j.error||'Erreur'); }
  let r=await res.json();
  personnes.push({id:r.id, ...payload}); render(); try{ if(typeof scheduleAutoSaveProjet==='function') scheduleAutoSaveProjet(); }catch(e){}
}
async function supprimer(id){
  const p=personnes.find(x=>x.id===id);
  const ok=await showConfirm('Supprimer ?', 'Supprimer '+esc(p.nom)+' ?');
  if(!ok) return;
  lastDeleted={person: {...p}, index: personnes.findIndex(x=>x.id===id)};
  await fetch('/api/personnes/'+id,{method:'DELETE'}); personnes=personnes.filter(x=>x.id!==id); render();
  showUndo(`Supprime: ${p.nom}`);
}
async function undoDelete(){
  if(!lastDeleted) return;
  const pers=lastDeleted.person;
  let r=await (await fetch('/api/personnes',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(pers)})).json();
  personnes.splice(lastDeleted.index,0,{...pers, id:r.id});
  lastDeleted=null; hideUndo(); render(); toast('Annule');
}
function showUndo(msg){
  $('undoMsg').innerText=msg;
  $('undoBar').classList.remove('hidden');
  clearTimeout(undoTimer);
  undoTimer=setTimeout(hideUndo,5000);
}
function hideUndo(){ $('undoBar').classList.add('hidden'); }