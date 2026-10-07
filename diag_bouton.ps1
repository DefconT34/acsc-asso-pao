Write-Host "=== DIAG BOUTON TERMINER ==="
Write-Host "index.html btn ?"
Select-String public\index.html -Pattern "btnTerminerProjet" | ForEach-Object { Write-Host "  $($_.LineNumber): $($_.Line.Trim())" }
Write-Host "sw.js contient 08-projet-state ?"
Select-String public\sw.js -Pattern "08-projet" | Write-Host
Write-Host "08 chargé dans index.html ?"
Select-String public\index.html -Pattern "08-projet-state" | Write-Host
Write-Host "02-storage refreshFiltreProjet écrase sel.value ?"
Get-Content public\js\02-storage.js | Write-Host
Write-Host "--- server health ---"
try { (Invoke-RestMethod http://localhost:3000/api/health -TimeoutSec 5 | ConvertTo-Json -Compress) | Write-Host } catch { Write-Host "health fail $_" }
Write-Host "--- projets ---"
try { $p = Invoke-RestMethod http://localhost:3000/api/projets -TimeoutSec 5; ($p | ConvertTo-Json -Depth 3) | Write-Host } catch { Write-Host "projets fail $_" }
Write-Host "--- sw.js ASSETS ---"
Get-Content public\sw.js | Write-Host
