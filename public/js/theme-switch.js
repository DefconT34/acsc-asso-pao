// theme-switch.js - switch Noir/Laiton <-> Creme/Tabac
(function(){
  const KEY='acsc_theme';
  function apply(t){
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(KEY, t);
    const b=document.getElementById('themeToggle');
    if(b) b.textContent = t==='clair' ? '🌙 Noir' : '☀️ Clair';
  }
  window.toggleTheme=function(){
    const cur=document.documentElement.getAttribute('data-theme')||'sombre';
    apply(cur==='sombre' ? 'clair' : 'sombre');
  };
  const saved=localStorage.getItem(KEY)||'sombre';
  document.documentElement.setAttribute('data-theme', saved);
  document.addEventListener('DOMContentLoaded', ()=> apply(saved));
})();
