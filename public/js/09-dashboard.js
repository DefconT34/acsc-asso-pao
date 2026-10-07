// 09-dashboard.js - Charts Premium or/noir
let chartSiteInstance=null, chartTopInstance=null, chartHistInstance=null;
const PREMIUM_COLORS=['#0A0A0A','#C9A86A','#8B7355','#3a3a3a','#D4B896','#1a1a1a','#B8956A'];
function updateDashboardCharts(det, details){
  try{
    const isDark=document.body.classList.contains('dark');
    const textColor=isDark?'#e2e8f0':'#1e293b';
    const gridColor=isDark?'#334155':'#e2e8f0';
    const bySite={}; (det||lastDetails).forEach(d=>{ bySite[d.siteLabel]=(bySite[d.siteLabel]||0)+d.phXOF; });
    const siteLabels=Object.keys(bySite); const siteVals=Object.values(bySite);
    const c1=$('chartSite'); if(c1 && window.Chart){
      if(chartSiteInstance) chartSiteInstance.destroy();
      chartSiteInstance=new Chart(c1, {type:'doughnut', data:{labels:siteLabels, datasets:[{data:siteVals, backgroundColor:PREMIUM_COLORS, borderColor:isDark?'#1e293b':'#fff', borderWidth:2}]}, options:{animation:{duration:600}, plugins:{legend:{position:'bottom', labels:{color:textColor, padding:12, usePointStyle:true}}}}});
    }
    const top=(details||lastDetails).slice().sort((a,b)=>b.final-a.final).slice(0,5);
    const c2=$('chartTop'); if(c2 && window.Chart){
      if(chartTopInstance) chartTopInstance.destroy();
      chartTopInstance=new Chart(c2, {type:'bar', data:{labels:top.map(t=>t.nom), datasets:[{label:'XOF', data:top.map(t=>Math.round(t.final)), backgroundColor:top.map((_,i)=> PREMIUM_COLORS[i%PREMIUM_COLORS.length]), borderRadius:6}]}, options:{indexAxis:'y', animation:{duration:600}, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:textColor}, grid:{color:gridColor}}, y:{ticks:{color:textColor}, grid:{display:false}}}}});
    }
    fetch('/api/historique?limit=12').then(r=>r.json()).then(j=>{
      const rows=j.rows||j; if(!Array.isArray(rows)) return;
      rows.reverse();
      const labels=rows.map(r=>String(r.date).split(' ')[0]);
      const vals=rows.map(r=> parseInt(String(r.totalFinal).replace(/\D/g,''))||0);
      const c3=$('chartHist'); if(c3 && window.Chart){
        if(chartHistInstance) chartHistInstance.destroy();
        const gradient=c3.getContext('2d').createLinearGradient(0,0,0,180); gradient.addColorStop(0,'rgba(201,168,106,0.35)'); gradient.addColorStop(1,'rgba(201,168,106,0)');
        chartHistInstance=new Chart(c3, {type:'line', data:{labels, datasets:[{label:'Total XOF', data:vals, borderColor:'#C9A86A', backgroundColor:gradient, fill:true, tension:0.35, pointBackgroundColor:'#0A0A0A', pointBorderColor:'#C9A86A'}]}, options:{animation:{duration:600}, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:textColor}, grid:{display:false}}, y:{ticks:{color:textColor}, grid:{color:gridColor}}}}});
      }
    });
  }catch{}
}
