async function run(){
  const base='http://localhost:3000';
  function log(m){ console.log(m); }
  try{
    let h=await (await fetch(base+'/api/health')).json().catch(async()=>({status: (await fetch(base+'/api/health').then(r=>r.text()))}));
    log('health '+JSON.stringify(h).slice(0,300));
  }catch(e){ log('health fail '+e.message); return; }
  // list projets before
  let projs=await (await fetch(base+'/api/projets')).json();
  let arr=Array.isArray(projs)?projs:(projs.rows||[]);
  log('projets before '+arr.length+' codes '+arr.slice(0,3).map(p=>p.code+'['+p.statutProjet+']').join(','));
  // create new projet vide
  const codeGen = 'ACSC-'+new Date().getFullYear()+'-9999';
  // use auto gen instead
  let r=await fetch(base+'/api/historique',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({gerant:'TestCoord', totalFinal:'0 XOF', data:{personnes:[], sites:[], settings:{}, totaux:{}, details:[]}, code:'', titre:'TEST-AUTOSAVE', note:'test'})});
  let j=await r.json();
  log('create POST status '+r.status+' '+JSON.stringify(j));
  if(!j.code){ log('create failed'); return; }
  const code=j.code; const id=j.id;
  log('created code '+code+' id '+id);
  // verify count stable
  let projs2=await (await fetch(base+'/api/projets')).json();
  let arr2=Array.isArray(projs2)?projs2:(projs2.rows||[]);
  log('projets after create '+arr2.length+' has '+code+'? '+arr2.some(p=>p.code===code));
  // add person via api linked to code
  let r2=await fetch(base+'/api/personnes',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({nom:'Client A', montant:120, quantite:5, site:'site1', telephone:'22507000001', statut:'impaye', projetCode:code, lienProduit:'https://ex.com/a', capture:''})});
  let j2=await r2.json();
  log('add pers1 '+r2.status+' '+JSON.stringify(j2));
  let r3=await fetch(base+'/api/personnes',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({nom:'Client B', montant:200, quantite:3, site:'site1', telephone:'22507000002', statut:'impaye', projetCode:code, lienProduit:'', capture:''})});
  let j3=await r3.json();
  log('add pers2 '+r3.status+' '+JSON.stringify(j3));
  // simulate autosave update via PATCH by id with data snapshot
  let snap={personnes:[{nom:'Client A', montant:120, quantite:5, site:'site1', telephone:'22507000001', statut:'impaye', projetCode:code},{nom:'Client B', montant:200, quantite:3, site:'site1', telephone:'22507000002', statut:'impaye', projetCode:code}], sites:[], settings:{}, totaux:{}, details:[]};
  let patchRes=await fetch(base+'/api/historique/'+id,{method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({data: snap, totalFinal:'999 XOF', gerant:'TestCoord'})});
  let pj=await patchRes.json();
  log('PATCH autosave id '+patchRes.status+' '+JSON.stringify(pj));
  // check GET by-code
  let got=await (await fetch(base+'/api/historique/by-code/'+code)).json();
  log('GET by-code data pers count '+(got.data? JSON.parse(got.data).personnes?.length : 'no data')+' totalFinal '+got.totalFinal);
  // check GET by id also
  let got2=await (await fetch(base+'/api/historique/'+id)).json();
  let d2=JSON.parse(got2.data);
  log('GET by id pers '+d2.personnes?.length);
  // verify projets count stable after autosave (no new row)
  let projs3=await (await fetch(base+'/api/projets')).json();
  let arr3=Array.isArray(projs3)?projs3:(projs3.rows||[]);
  log('projets after autosave '+arr3.length+' (should = after create '+arr2.length+')');
  // terminer projet
  let term=await fetch(base+'/api/historique/by-code/'+code,{method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({statutProjet:'cloture'})});
  let tj=await term.json();
  log('terminer PATCH '+term.status+' '+JSON.stringify(tj));
  // verify statut
  let check=await (await fetch(base+'/api/historique/by-code/'+code)).json();
  log('check statut '+check.statutProjet);
  // try autosave after cloture should be 403
  let patchAfter=await fetch(base+'/api/historique/'+id,{method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({data: snap, totalFinal:'111 XOF'})});
  let paj=await patchAfter.json();
  log('patch after cloture status '+patchAfter.status+' '+JSON.stringify(paj)+' (expect 403)');
  // try commande on cloture should be 403
  let cmd=await fetch(base+'/api/commande',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({projetCode:code, nom:'John', telephone:'22507000999', items:[{site:'site1', montant:50, quantite:2, lienProduit:'https://ex.com', capture:''}]})});
  let cmdj=await cmd.json();
  log('commande on cloture '+cmd.status+' '+JSON.stringify(cmdj)+' (expect 403)');
  // list en_cours filter
  let enc=await (await fetch(base+'/api/projets')).json();
  let encArr=(Array.isArray(enc)?enc:enc.rows||[]).filter(x=>x.statutProjet!=='cloture');
  log('encours count '+encArr.length+' includes '+code+'? '+encArr.some(x=>x.code===code)+' (expect false)');
  // cleanup: delete test project and persons
  await fetch(base+'/api/historique/'+id,{method:'DELETE'});
  // delete persons with this code
  let pers=await (await fetch(base+'/api/personnes')).json();
  let list=pers.rows||pers;
  for(let p of list.filter(x=>x.projetCode===code)){
    await fetch(base+'/api/personnes/'+p.id,{method:'DELETE'});
  }
  let finalProjs=await (await fetch(base+'/api/projets')).json();
  log('final projets '+(Array.isArray(finalProjs)?finalProjs.length:(finalProjs.rows||[]).length));
  log('TEST DONE');
}
run();
