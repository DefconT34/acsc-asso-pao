// 03-sites.js
function renderSites(){
  $('sitesEditor').innerHTML = sites.map((s,i)=>{
    const frais = (parseFloat(s.total)||0)-(parseFloat(s.sousTotal)||0);
    const fraisXOF = frais*(parseFloat(s.taux)||0);
    return `<div class="border rounded-xl p-2 bg-gray-50">
      <div class="flex gap-1">
        <input value="${esc(s.label)}" onchange="sites[${i}].label=this.value;save();render()" class="border rounded p-1 w-24 text-xs font-bold">
        <select onchange="sites[${i}].devise=this.value;save();calculer()" class="border rounded p-1 text-xs">
          <option ${s.devise=='USD'?'selected':''}>USD</option><option ${s.devise=='EUR'?'selected':''}>EUR</option><option ${s.devise=='GBP'?'selected':''}>GBP</option>
        </select>
        <button onclick="supprimerSite(${i})" class="text-red-500 px-1">✕</button>
      </div>
      <div class="grid grid-cols-3 gap-1 mt-1 text-[10px]">
        <label>Taux<input type="number" value="${s.taux}" onchange="sites[${i}].taux=parseFloat(this.value)||0;save();calculer()" class="border rounded p-1 w-full bg-blue-50 font-black"></label>
        <label>Sous-total<input type="number" value="${s.sousTotal}" onchange="sites[${i}].sousTotal=parseFloat(this.value)||0;save();calculer()" class="border rounded p-1 w-full"></label>
        <label>Total<input type="number" value="${s.total}" onchange="sites[${i}].total=parseFloat(this.value)||0;save();calculer()" class="border rounded p-1 w-full bg-orange-50 font-bold"></label>
      </div>
      <div class="text-[11px] mt-1 ${frais>0?'text-orange-600 font-bold':'text-gray-400'}">Frais: ${fmtD(frais)} ${s.devise} = ${fmt(fraisXOF)}</div>
    </div>`;
  }).join('');
  // refresh filtre site
  const fs=$('filterSite');
  if(fs){
    const cur=fs.value;
    fs.innerHTML='<option value="">Tous sites</option>'+sites.map(s=>`<option value="${s.id}">${esc(s.label)}</option>`).join('');
    fs.value=cur;
  }
}
function ajouterSite(){
  sites.push({id:'s'+Date.now(), label:'NouveauSite', devise:$('devise').value||'USD', taux:parseFloat($('taux').value)||615, sousTotal:0, total:0});
  save(); renderSites(); render();
}
async function supprimerSite(i){
  const sid=sites[i].id;
  const nb=personnes.filter(p=>p.site===sid).length;
  if(nb>0){
    const ok=await showConfirm('Supprimer site ?', nb+' personne(s) utilisent ce site. Elles passeront en site par defaut.');
    if(!ok) return;
    personnes.forEach(p=>{ if(p.site===sid) p.site=sites[0]?.id||sid; });
  } else {
    const ok=await showConfirm('Supprimer site ?', 'Confirmer suppression de '+sites[i].label+' ?');
    if(!ok) return;
  }
  sites.splice(i,1); save(); renderSites(); render();
  toast('Site supprime');
}