$file = "d:\Google Antigrafity\mastersapatamuku\upgrade.html"
$raw = [System.IO.File]::ReadAllBytes($file)
$latin = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($raw)
$bytes2 = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetBytes($latin)
$fixed = [System.Text.Encoding]::UTF8.GetString($bytes2)
[System.IO.File]::WriteAllText($file, $fixed, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done: upgrade.html re-encoded"
