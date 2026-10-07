const fs=require('fs');
let s=fs.readFileSync('server.js','utf8');
let firstGet=s.indexOf("app.get('/api/historique/by-code");
let secondGet=s.indexOf("app.get('/api/historique/by-code", firstGet+10);
let firstPatch=s.indexOf("app.patch('/api/historique/by-code");
let secondPatch=s.indexOf("app.patch('/api/historique/by-code", firstPatch+10);
console.log(firstGet, firstPatch, secondGet, secondPatch);
// Keep first occurrence (18227,18648) remove second set
let secondBlockStart=secondGet;
let afterSecondPatchEnd=s.indexOf("});", secondPatch)+3;
let secondBlockEnd=s.indexOf("});", afterSecondPatchEnd)+3; // actually patch block ends with });\n
// simpler: find positions via substring search for second block
let block2 = s.slice(secondBlockStart, secondBlockStart+5000);
console.log(block2.slice(0,120));
// remove duplicates: keep first, remove second occurrences
let count=(s.match(/app\.get\('\/api\/historique\/by-code/g)||[]).length;
console.log('before dedupe count get',count);
// remove second get and patch
// Find exact second get block by locating next app.get(':id')
let idPos=s.indexOf("app.get('/api/historique/:id'", secondBlockStart);
let toRemove=s.slice(secondBlockStart, idPos);
console.log('toRemove len',toRemove.length);
// Keep first, remove second interval from secondBlockStart to idPos but we need to keep up to first? no idPos is after second patch, so we remove from secondGet to idPos and then re-add id header?
// Actually idPos is after second patch, so removing from secondGet to idPos would remove id header too. Better to remove only second get+patch: slice from secondGet to (position of app.get(':id'))
// We want s = s.slice(0,secondGet) + s.slice(idPos)
let newS = s.slice(0, secondGet) + s.slice(idPos);
fs.writeFileSync('server.js', newS, 'utf8');
console.log('deduped len',newS.length,' new count get', (newS.match(/app\.get\('\/api\/historique\/by-code/g)||[]).length, ' patch', (newS.match(/app\.patch\('\/api\/historique\/by-code/g)||[]).length);
