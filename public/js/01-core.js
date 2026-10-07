// 01-core.js
let personnes=[], lastDetails=[], sites=[], currentPhase='final';
let tOut; let lastDeleted=null, undoTimer=null;
const fmt=n=>new Intl.NumberFormat('fr-FR').format(Math.round(n))+' XOF';
const fmtD=n=>new Intl.NumberFormat('fr-FR').format(Math.round(n));
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
function toast(msg){ const t=$('toast'); if(!t) return; t.innerText=msg; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'),2500); }
function valPersLocal(p){ if(!p.nom||String(p.nom).trim().length<2) return "Nom court"; if(Number(p.montant)<=0) return "Montant >0"; if(!Number.isInteger(Number(p.quantite))||Number(p.quantite)<1) return "Qte >=1"; if(p.telephone&&String(p.telephone).replace(/\D/g,'').length<8) return "Tel invalide"; return null; }
function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
let confirmResolve=null;
function showConfirm(title,msg){ const t=document.getElementById('confirmTitle'),m=document.getElementById('confirmMsg'),mod=document.getElementById('modalConfirm'); if(t) t.innerText=title; if(m) m.innerText=msg; if(mod) mod.classList.remove('hidden'); return new Promise(r=> confirmResolve=r); }
function closeConfirm(v){ const mod=document.getElementById('modalConfirm'); if(mod) mod.classList.add('hidden'); if(confirmResolve) confirmResolve(v); confirmResolve=null; }
function markFieldError(el, on){ if(!el) return; el.classList.toggle('field-error', !!on); if(!on) el.removeAttribute('title'); }
