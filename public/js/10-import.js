// 10-import.js
function importExcelFile(e){
  const f=e.target.files[0]; if(!f) return;
  const reader=new FileReader();
  reader.onload=async (evt)=>{
    try{
      const data=new Uint8Array(evt.target.result);
      const wb=XLSX.read(data,{type:'array'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws);
      if(rows.length===0) return toast('Fichier vide');
      let added=0;
      for(const r of rows){
        const nom=r.Nom||r.nom||r.Name||'';
        const montant=Number(r.Montant||r.montant||r.Montant_dev||0);
        const qte=parseInt(r.Qte||r.qte||r.Quantite||1);
        const tel=String(r.Telephone||r.tel||'');
        let site=r.Site||sites[0]?.id||'site1';
        // si site label, mapper vers id
        const found=sites.find(s=>s.label.toLowerCase()===String(site).toLowerCase());
        if(found) site=found.id;
        if(!nom || !montant) continue;
        const res=await fetch('/api/personnes',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({nom, montant, quantite:qte, site, telephone:tel, statut:'impaye'})});
        if(res.ok){ const j=await res.json(); personnes.push({id:j.id, nom, montant, quantite:qte, site, telephone:tel, statut:'impaye'}); added++; }
      }
      render(); toast(added+' lignes importees');
    }catch(err){ toast('Import erreur: '+err.message); }
  };
  reader.readAsArrayBuffer(f);
  e.target.value='';
}
