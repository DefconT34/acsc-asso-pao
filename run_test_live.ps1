node test_live.js > c:\temp\test_live.log 2>&1
Get-Content c:\temp\test_live.log | Write-Host
