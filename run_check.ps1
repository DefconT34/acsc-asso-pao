Write-Host "=== CHECK SYNTAX ==="
node --check server.js
if ($LASTEXITCODE -eq 0) { Write-Host "SYNTAX_OK" } else { Write-Host "SYNTAX_FAIL exit $LASTEXITCODE"; exit 1 }
Write-Host "=== KILL OLD NODE ==="
taskkill /F /IM node.exe 2>$null | Out-Null
Start-Sleep 2
Write-Host "=== START SERVER ==="
$proc = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "c:\Users\HP\Desktop\acsc-asso-pao" -WindowStyle Hidden -PassThru
Write-Host "STARTED PID $($proc.Id)"
Start-Sleep 5
Write-Host "=== HEALTH ==="
try {
  $r = Invoke-WebRequest http://localhost:3000/api/health -UseBasicParsing -TimeoutSec 8
  Write-Host "HEALTH $($r.StatusCode)"
  Write-Host $r.Content.Substring(0,[Math]::Min(600,$r.Content.Length))
} catch {
  Write-Host "HEALTH FAIL $($_.Exception.Message)"
  Get-Content c:\Users\HP\Desktop\acsc-asso-pao\server.log -ErrorAction SilentlyContinue | Select-Object -Last 50 | Write-Host
  exit 1
}
Write-Host "=== PROJETS ==="
try {
  $r2 = Invoke-RestMethod http://localhost:3000/api/projets -TimeoutSec 5
  $arr = if ($r2 -is [Array]) { $r2 } else { $r2.rows }
  Write-Host "PROJETS count $($arr.Count)"
} catch { Write-Host "PROJETS FAIL $($_.Exception.Message)" }
Write-Host "=== RUN test_live.js ==="
node test_live.js
Write-Host "=== DONE ==="
