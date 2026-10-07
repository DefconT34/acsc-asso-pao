taskkill /F /IM node.exe 2>$null | Out-Null
Start-Sleep 1
Remove-Item c:\temp\acsc_start.log -ErrorAction SilentlyContinue
Remove-Item server.log -ErrorAction SilentlyContinue
$proc = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "c:\Users\HP\Desktop\acsc-asso-pao" -WindowStyle Hidden -PassThru -RedirectStandardOutput "c:\Users\HP\Desktop\acsc-asso-pao\server.log" -RedirectStandardError "STDOUT"
"STARTED $($proc.Id) $(Get-Date -Format o)" | Out-File c:\temp\acsc_start.log -Encoding utf8
Write-Host "STARTED $($proc.Id)"
Start-Sleep 2
Get-Content c:\Users\HP\Desktop\acsc-asso-pao\server.log -ErrorAction SilentlyContinue | Select-Object -Last 20 | Write-Host
