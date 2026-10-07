// 05-calcul.js - Moteur frais déduits
function calculer(){
  const fb=parseFloat($('taux').value)||615, fac=parseFloat($('factureTransit').value)||0, dev=$('devise').value;
  let qt=personnes.reduce((s,p)=>s+(parseInt(p.quantite)||0),0), tot=0;
  let siteSums={}; personnes.forEach(p=>{ siteSums[p.site]=(siteSums[p.site]||0)+(parseFloat(p.montant)||0)});
  let det=personnes.map(p=>{
    let s=sites.find(x=>x.id===p.site)||{taux:fb, sousTotal:0, total:0, label:p.site, devise:dev};
    let tx=s.taux||fb, base=p.montant*tx;
    let fraisSiteDev=Math.max(0,(parseFloat(s.total)||0)-(parseFloat(s.sousTotal)||0));
    let denom=parseFloat(s.sousTotal)>0?parseFloat(s.sousTotal):(siteSums[p.site]||1);
    let fSiteDev=denom>0?(p.montant/denom)*fraisSiteDev:0;
    let fSite=fSiteDev*tx, ph=base+fSite; tot+=ph;
    return {...p, siteLabel:s.label, siteDevise:s.devise, tx, baseXOF:base, phXOF:ph, phDev:ph/tx, fSiteXOF:fSite, fSiteDev};
  });
  $('qteTotale').innerText=qt; $('prixParCigare').innerText=qt?fmt(fac/qt)+'/cigare':'-';
  if($('prixParKg')) $('prixParKg').innerText = (parseFloat($('poidsTotal').value)||0) ? fmt(fac/(parseFloat($('poidsTotal').value)||1))+'/kg' : '-';
  $('resultatsPhase1').innerHTML=det.map((d,i)=>`
    <div class="border rounded-xl p-2 bg-gray-50 flex flex-col">
      <div class="flex justify-between"><span class="font-bold text-xs">${esc(d.nom)}</span><span class="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-[9px] font-black">${esc(d.siteLabel)} @${d.tx}</span></div>
      <div class="text-[10px] text-gray-500">${d.quantite} cig • frais ${fmt(d.fSiteXOF)} ${d.statut==='paye'?'✅':d.statut==='partiel'?'⚠️':'❌'}</div>
      <div class="font-black text-sm text-orange-600">${fmt(d.phXOF)}</div><div class="text-[10px] opacity-60">${fmtD(d.phDev)} ${d.siteDevise}</div>
      <div class="flex gap-1 mt-2"><button onclick="voirQR(${i},'phase1')" class="flex-1 bg-green-500 text-white text-[10px] py-1.5 rounded-full font-bold">QR</button><button onclick="genererPDF(${i})" class="flex-1 bg-[#0F2A44] text-white text-[10px] py-1.5 rounded-full font-bold">PDF</button><button onclick="notifierDirect(${i},'phase1')" class="flex-1 bg-white border text-[10px] py-1.5 rounded-full font-bold">WA</button></div>
    </div>`).join('')||'<p class="text-xs text-gray-400 col-span-2 text-center py-4">Ajoute des personnes</p>';
  $('totalPhase1').innerText=fmt(tot);
  let mix=det.reduce((a,d)=>{a[d.siteDevise]=(a[d.siteDevise]||0)+d.phDev;return a},{});
  $('totalPhase1Devise').innerText=Object.entries(mix).map(([k,v])=>`${fmtD(v)} ${k}`).join(' + ')||`≈ ${fmtD(tot/fb)} ${dev}`;
  $('totalPhase1XOF').innerText=fmt(tot);
  lastDetails=det.map(d=>{let part=qt?(d.quantite/qt)*fac:0; return{...d, part, final:d.phXOF+part, finalDev:(d.phXOF+part)/d.tx}});
  $('resultatsPhase2').innerHTML=lastDetails.map((d,i)=>`<div class="bg-white/10 rounded-xl p-2 flex justify-between items-center"><div><div class="font-bold text-xs">${esc(d.nom)} (${d.quantite} cig) ${d.statut==='paye'?'✅':d.statut==='partiel'?'⚠️':'❌'}</div><div class="text-[10px] opacity-60">${fmt(d.phXOF)} + ${fmt(d.part)}</div></div><div class="text-right"><div class="font-black text-sm text-orange-300">${fmt(d.final)}</div><div class="flex gap-1 mt-1"><button onclick="voirQR(${i},'final')" class="text-[10px] bg-white text-[#0F2A44] px-2 py-1 rounded-full font-bold">QR</button><button onclick="genererPDF(${i})" class="text-[10px] bg-orange-600 px-2 py-1 rounded-full font-bold">PDF</button><button onclick="notifierDirect(${i},'final')" class="text-[10px] bg-green-500 px-2 py-1 rounded-full font-bold">WA</button></div></div></div>`).join('');
  $('totalFinal').innerText=fmt(tot+fac); $('totalFinalDevise').innerText=Object.entries(mix).map(([k,v])=>`${fmtD(v)} ${k}`).join(' + ')+' + Transit '+fmt(fac);
  // totaux encaisse
  const encaisse=lastDetails.filter(d=>d.statut==='paye').reduce((s,d)=>s+d.final,0);
  const reste=lastDetails.filter(d=>d.statut!=='paye').reduce((s,d)=>s+d.final,0);
  if($('totalEncaisse')) $('totalEncaisse').innerText=fmt(encaisse);
  if($('totalReste')) $('totalReste').innerText=fmt(reste);
  // KPI dashboard avec animation
  function animKpi(id, val){ const el=$(id); if(!el) return; el.innerText=val; el.classList.remove('kpi-animate'); void el.offsetWidth; el.classList.add('kpi-animate'); }
  animKpi('kpiFinal', fmt(tot+fac));
  if($('kpiFinalDev')) $('kpiFinalDev').innerText=Object.entries(mix).map(([k,v])=>`${fmtD(v)} ${k}`).join(' + ');
  animKpi('kpiEncaisse', fmt(encaisse));
  if($('kpiEncaisseCount')) $('kpiEncaisseCount').innerText=lastDetails.filter(d=>d.statut==='paye').length+' paye(s)';
  animKpi('kpiReste', fmt(reste));
  animKpi('kpiMoy', qt?fmt((tot+fac)/qt)+'/cigare':'-');
  animKpi('kpiPers', personnes.length);
  animKpi('kpiSites', sites.length+' sites');
  try{ updateDashboardCharts(det, lastDetails); }catch{}
  save(); try{ if(typeof scheduleAutoSaveProjet==='function') scheduleAutoSaveProjet(); }catch(e){}
}