try {
  $r = Invoke-RestMethod http://localhost:3000/api/health -TimeoutSec 5
  ($r | ConvertTo-Json -Compress) | Out-File c:\temp\health.json -Encoding utf8
  "HEALTH_OK" | Out-File c:\temp\health.log -Encoding utf8
  Get-Content c:\temp\health.json | Out-File c:\temp\health.log -Append
} catch {
  "HEALTH_FAIL $($_.Exception.Message)" | Out-File c:\temp\health.log -Encoding utf8
  if (Test-Path server.log) { "--- server.log ---" | Out-File c:\temp\health.log -Append; Get-Content server.log | Select-Object -Last 80 | Out-File c:\temp\health.log -Append }
}
Get-Content c:\temp\health.log | Write-Host
