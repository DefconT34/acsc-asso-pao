// 06-actions.js - QR / WhatsApp / PDF / Excel
function buildMessage(d, phase){
  const montant = phase==='final' ? fmt(d.final) : fmt(d.phXOF);
  const dev = phase==='final' ? fmtD(d.finalDev)+' '+d.siteDevise : fmtD(d.phDev)+' '+d.siteDevise;
  const statut = d.statut==='paye'?'✅ Paye':d.statut==='partiel'?'⚠️ Partiel':'❌ Impaye';
  return `Bonjour ${d.nom} 👋\nACSC Asso Pao • ${statut}\nSite: ${d.siteLabel}\nQuantité: ${d.quantite} cigares\nMontant ${phase==='final'?'FINAL':'Phase 1'}: ${montant} (${dev})${phase==='final'?`\n(dont transit ${fmt(d.part)})`:''}\nGérant: ${$('gerant').value}`;
}
function voirQR(i, phase){
  currentPhase=phase; const d=lastDetails[i];
  const msg=buildMessage(d, phase);
  $('qrNom').innerText=d.nom+' - '+fmt(phase==='final'?d.final:d.phXOF);
  $('qrMsg').innerText=msg;
  const link=`https://wa.me/${(d.telephone||'').replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`;
  $('qrLink').href=link;
  $('modalQR').classList.remove('hidden');
  QRCode.toCanvas($('qrCanvas'), msg, {width:180});
}
function closeQR(){ $('modalQR').classList.add('hidden'); }
function notifierDirect(i, phase){ voirQR(i, phase); window.open($('qrLink').href,'_blank'); }
function ouvrirModalEnvoi(phase){
  currentPhase=phase; $('envoiTitre').innerText = phase==='final' ? 'Envoi Groupe FINAL' : 'Envoi Groupe Phase 1';
  $('envoiBody').innerHTML = lastDetails.map((d,i)=>{
    const msg=buildMessage(d, phase);
    return `<div class="border rounded p-2 text-xs"><b>${esc(d.nom)}</b> - ${d.telephone||'pas de tel'}<div class="opacity-60 whitespace-pre-wrap">${esc(msg)}</div><a href="https://wa.me/${(d.telephone||'').replace(/\D/g,'')}?text=${encodeURIComponent(msg)}" target="_blank" class="text-green-600 font-bold">→ Ouvrir WA</a></div>`;
  }).join('');
  $('modalEnvoi').classList.remove('hidden');
}
function closeEnvoi(){ $('modalEnvoi').classList.add('hidden'); }
function envoyerTousWhatsApp(){
  lastDetails.forEach(d=> window.open(`https://wa.me/${(d.telephone||'').replace(/\D/g,'')}?text=${encodeURIComponent(buildMessage(d, currentPhase))}`,'_blank'));
}
function getLogoDataUrl(){ return 'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 90"><rect width="340" height="90" rx="14" fill="#0A0A0A"/><text x="170" y="52" text-anchor="middle" font-family="cursive" font-size="54" font-style="italic" fill="#FFFFFF">Premium</text><rect x="22" y="58" width="296" height="2.5" rx="1.25" fill="#C9A86A"/><text x="170" y="76" text-anchor="middle" font-family="serif" font-size="13" letter-spacing="3.2" fill="#C9A86A" font-weight="700">CIGARS &amp; TOBACCO</text></svg>`); }
function headerPDF(doc){
  doc.setFillColor(10,10,10); doc.rect(0,0,210,22,'F');
  doc.setTextColor(201,168,106); doc.setFontSize(7); doc.text('CIGARS & TOBACCO', 105, 18, {align:'center'});
  doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bolditalic'); doc.text('Premium', 105, 12, {align:'center'});
  doc.setDrawColor(201,168,106); doc.line(20,14,190,14);
  doc.setTextColor(0,0,0);
}
function genererPDF(i){
  const {jsPDF}=window.jspdf; const doc=new jsPDF(); const d=lastDetails[i];
  headerPDF(doc);
  doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.text('Recu - ACSC Asso Pao',10,30);
  doc.setFont('helvetica','normal'); doc.setFontSize(10);
  doc.text(`Gerant: ${$('gerant').value}`,10,38);
  doc.text(`Client: ${d.nom}  Tel: ${d.telephone||'-'}`,10,44);
  doc.text(`Site: ${d.siteLabel} (${d.siteDevise} @${d.tx})`,10,50);
  doc.text(`Montant Phase1: ${fmt(d.phXOF)} (${fmtD(d.phDev)} ${d.siteDevise})`,10,56);
  doc.text(`Quantite: ${d.quantite}  | Transit part: ${fmt(d.part)}`,10,62);
  doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(201,120,10); doc.text(`TOTAL FINAL: ${fmt(d.final)}`,10,72);
  doc.setTextColor(100,100,100); doc.setFontSize(7); doc.text(`Premium Cigars & Tobacco • ${new Date().toLocaleString('fr-FR')} • ${d.statut||'impaye'}`,10,285);
  doc.save(`recu_${d.nom}.pdf`);
}
function genererPDFGlobal(){
  const {jsPDF}=window.jspdf; const doc=new jsPDF();
  headerPDF(doc);
  doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(0,0,0); doc.text('Recap Global - ACSC',10,30);
  doc.setFont('helvetica','normal'); doc.setFontSize(9);
  let y=38; lastDetails.forEach(d=>{ doc.text(`${d.nom} | ${d.siteLabel} | ${d.quantite} cig | ${fmt(d.final)} | ${d.statut||'impaye'}`,10,y); y+=6; if(y>275){ doc.addPage(); headerPDF(doc); y=30; } });
  doc.setFont('helvetica','bold'); doc.text(`TOTAL FINAL: ${$('totalFinal').innerText}`,10,y+6);
  doc.setFontSize(7); doc.setTextColor(100,100,100); doc.text(`Premium Cigars & Tobacco • ${new Date().toLocaleString('fr-FR')}`,10,286);
  doc.save("ACSC_global.pdf");
}
function exportExcel(){
  const totalFinalNum = lastDetails.reduce((s,d)=>s+d.final,0);
  const rows=lastDetails.map(d=>({Nom:d.nom, Telephone:d.telephone, Site:d.siteLabel, Devise:d.siteDevise, Taux:d.tx, Montant_dev:Number(d.phDev.toFixed(2)), Montant_XOF:Math.round(d.phXOF), Qte:d.quantite, Part_transit:Math.round(d.part), Total_final:Math.round(d.final), Statut:d.statut||'impaye'}));
  const ws=XLSX.utils.json_to_sheet(rows);
  ws['!cols']=[{wch:16},{wch:14},{wch:14},{wch:8},{wch:8},{wch:12},{wch:12},{wch:6},{wch:12},{wch:12},{wch:10}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Details");
  const bySite={}; lastDetails.forEach(d=>{ bySite[d.siteLabel]=(bySite[d.siteLabel]||0)+d.final; });
  const siteRows=Object.entries(bySite).map(([site,total])=>({Site:site, Total_XOF:Math.round(total)}));
  siteRows.push({Site:'TOTAL FINAL', Total_XOF:Math.round(totalFinalNum)});
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(siteRows),"Recap Sites");
  const paramRows=[{Parametre:'Gerant', Valeur:$('gerant').value}, {Parametre:'Devise', Valeur:$('devise').value}, {Parametre:'Taux', Valeur:$('taux').value}, {Parametre:'Facture Transit', Valeur:$('factureTransit').value}, {Parametre:'Poids Total', Valeur:$('poidsTotal').value}, {Parametre:'Total Final XOF', Valeur: Math.round(totalFinalNum)}, {Parametre:'Date export', Valeur: new Date().toLocaleString('fr-FR')}];
  const wsP=XLSX.utils.json_to_sheet(paramRows); wsP['!cols']=[{wch:18},{wch:22}];
  XLSX.utils.book_append_sheet(wb, wsP,"Parametres");
  XLSX.writeFile(wb,"ACSC_Premium_"+ new Date().toISOString().slice(0,10) +".xlsx");
}
function relancerImpayes(){
  const imp=lastDetails.filter(d=> (d.statut||'impaye')!=='paye');
  if(imp.length===0) return toast('Aucun impaye');
  imp.forEach(d=> window.open(`https://wa.me/${(d.telephone||'').replace(/\D/g,'')}?text=${encodeURIComponent(buildMessage(d,'final'))}`,'_blank'));
}
function exportBackup(){
  fetch('/api/backup').then(r=>r.json()).then(data=>{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='ACSC_backup_'+new Date().toISOString().slice(0,10)+'.json'; a.click(); URL.revokeObjectURL(url);
    toast('Backup exporte');
  });
}
function importBackup(e){
  const f=e.target.files[0]; if(!f) return;
  const reader=new FileReader();
  reader.onload=async ()=>{
    try{
      const data=JSON.parse(reader.result);
      const ok=await showConfirm('Restaurer backup ?', 'Remplace toutes les donnees actuelles');
      if(!ok) return;
      const res=await fetch('/api/restore',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
      if(!res.ok){ const j=await res.json(); return toast(j.error||'Erreur restore'); }
      toast('Backup restaure - rechargement'); setTimeout(()=> location.reload(), 800);
    }catch(err){ toast('Fichier invalide'); }
  };
  reader.readAsText(f);
}