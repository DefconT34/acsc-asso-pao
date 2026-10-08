const {execSync}=require('child_process');
function sh(c){ return execSync(c,{encoding:'utf8',timeout:15000}); }
console.log(sh('git status --porcelain'));
console.log(sh('git diff --stat'));
console.log(sh('npm run check 2>&1').slice(0,800));
console.log(sh('git add server.js public/commande.js public/js/02-storage.js public/index.html deploy-o2switch.yml 2>&1 || git add -A && echo added'));
console.log(sh('git status --porcelain'));
console.log(sh('git commit -m "orchestrateur: hardening + fix flux commande - esc XSS, rate-limit IP 30/min, transaction BEGIN/COMMIT, validation capture strict, polling 12s deja en place, badge temps reel (fix commande invisible)" 2>&1'));
console.log(sh('git log --oneline -3'));
console.log(sh('git push 2>&1').slice(0,800));
