Write-Host "=== VERIF by-code avant :id ==="
Select-String -Path server.js -Pattern "app\.(get|patch)\('/api/historique" | Select-Object LineNumber,Line | Format-Table -AutoSize | Out-String | Write-Host
Write-Host "=== VERIF ordre critique ==="
$s = Get-Content server.js -Raw
$g = $s.IndexOf("app.get('/api/historique/by-code")
$p = $s.IndexOf("app.patch('/api/historique/by-code")
$i = $s.IndexOf("app.get('/api/historique/:id")
$pd = $s.IndexOf("app.patch('/api/historique/:id")
Write-Host "by-code GET @$g  PATCH @$p   :id GET @$i  PATCH @$pd"
if ($g -lt $i -and $p -lt $pd) { Write-Host "ORDRE OK by-code avant :id" -ForegroundColor Green } else { Write-Host "ORDRE FAIL" -ForegroundColor Red }
Write-Host "=== INDEX.HTML checks ==="
Select-String -Path public\index.html -Pattern "btnTerminerProjet|autoSaveDot|08-projet-state" | Write-Host
Write-Host "=== 08-projet-state syntax ==="
node --check public\js\08-projet-state.js; Write-Host "08 check $LASTEXITCODE"
node --check public\js\02-storage.js; Write-Host "02 check $LASTEXITCODE"
