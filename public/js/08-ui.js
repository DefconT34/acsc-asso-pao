// 08-ui.js - Modals, dark, pin, menus
function toggleMobileMenu(){
  const m=$('mobileMenu'); m.classList.toggle('hidden'); m.classList.toggle('flex');
}
function toggleBackupMenu(){
  $('backupMenu').classList.toggle('hidden');
}
function toggleDark(){
  document.body.classList.toggle('dark');
  document.documentElement.classList.toggle('dark');
  const isDark=document.body.classList.contains('dark');
  localStorage.setItem('acsc_dark', isDark ? '1':'0');
  // rerender charts couleurs dark
  setTimeout(()=> { try{ updateDashboardCharts(); }catch{} }, 150);
}
function refreshDark(){
  if(localStorage.getItem('acsc_dark')==='1'){ document.body.classList.add('dark'); document.documentElement.classList.add('dark'); }
}
function toggleDashboard(){
  const d=$('dashboard'); d.classList.toggle('hidden');
  if(!d.classList.contains('hidden')) setTimeout(()=> updateDashboardCharts(), 100);
}
// Raccourcis clavier
document.addEventListener('keydown', (e)=>{
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); const s=$('searchPers'); if(s){ s.focus(); s.select(); } }
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='d'){ e.preventDefault(); toggleDashboard(); }
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); sauvegarderHistoriqueModal(); }
  if(e.key==='Escape'){
    ['modalQR','modalEnvoi','modalHist','modalHistDetail','modalSaveHist','modalConfirm','modalPin','dashboard'].forEach(id=>{ const el=$(id); if(el && !el.classList.contains('hidden')) el.classList.add('hidden'); });
    if(confirmResolve){ confirmResolve(false); confirmResolve=null; }
  }
});
function openPinModal(){ $('modalPin').classList.remove('hidden'); }
function closePinModal(){ $('modalPin').classList.add('hidden'); }
async function savePin(){
  const pin=$('pinInput').value.trim();
  await fetch('/api/settings',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({gerant:$('gerant').value, devise:$('devise').value, taux:parseFloat($('taux').value)||615, pays:'us', factureTransit:parseFloat($('factureTransit').value)||0, poidsTotal:parseFloat($('poidsTotal').value)||0, sites, pin})});
  toast('PIN enregistre');
}
async function savePinModal(){
  const pin=$('pinModalInput').value.trim();
  await fetch('/api/settings',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({gerant:$('gerant').value, devise:$('devise').value, taux:parseFloat($('taux').value)||615, pays:'us', factureTransit:parseFloat($('factureTransit').value)||0, poidsTotal:parseFloat($('poidsTotal').value)||0, sites, pin})});
  $('pinStatus').innerText='PIN enregistre'; toast('PIN enregistre');
}
async function checkPin(){
  const pin=$('pinModalInput').value.trim();
  const res=await fetch('/api/pin/check',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({pin})});
  const j=await res.json();
  if(j.valid || j.needPin===false){ $('pinStatus').innerText='✅ PIN valide'; toast('PIN valide'); }
  else { $('pinStatus').innerText='❌ PIN invalide'; toast('PIN invalide'); }
}
document.addEventListener('click', (e)=>{
  if(e.target.id==='modalConfirm') closeConfirm(false);
  if(e.target.id==='modalPin') closePinModal();
  if(!e.target.closest('#backupMenu') && !e.target.closest('[onclick="toggleBackupMenu()"]')){ const m=$('backupMenu'); if(m) m.classList.add('hidden'); }
});
