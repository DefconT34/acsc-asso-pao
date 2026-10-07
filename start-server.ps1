taskkill /F /IM node.exe 2>$null | Out-Null
Start-Sleep 2
$proc = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "c:\Users\HP\Desktop\acsc-asso-pao" -WindowStyle Hidden -PassThru
"STARTED PID $($proc.Id)" | Out-File -FilePath "c:\temp\acsc_start.log" -Encoding utf8
Start-Sleep 4
try {
  $r = Invoke-WebRequest http://localhost:3000/api/settings -UseBasicParsing -TimeoutSec 5
  "HTTP $($r.StatusCode)" | Out-File -Append -FilePath "c:\temp\acsc_start.log"
  $r.Content.Substring(0,[Math]::Min(500,$r.Content.Length)) | Out-File -Append -FilePath "c:\temp\acsc_start.log"
} catch {
  "FAIL $($_.Exception.Message)" | Out-File -Append -FilePath "c:\temp\acsc_start.log"
}
Get-Content "c:\temp\acsc_start.log" | Write-Host
