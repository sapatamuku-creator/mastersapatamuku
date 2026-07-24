$files = Get-ChildItem -Path "." -Recurse -File -Include "*.html","*.js","*.bat" | Where-Object { $_.FullName -notlike "*\.git*" -and $_.FullName -notlike "*\releases\*" }
$count = 0
foreach ($file in $files) {
    try {
        $raw = [System.IO.File]::ReadAllBytes($file.FullName)
        $content = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($raw)
        # Hanya proses jika ada karakter mojibake
        if ($content -match "â|ð|Â") {
            # Re-encode: baca sebagai latin-1, tulis ulang sebagai UTF-8
            $bytes = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetBytes($content)
            $utf8content = [System.Text.Encoding]::UTF8.GetString($bytes)
            [System.IO.File]::WriteAllText($file.FullName, $utf8content, [System.Text.UTF8Encoding]::new($false))
            Write-Host "Fixed: $($file.Name)"
            $count++
        }
    } catch {
        Write-Host "Skip: $($file.Name) - $_"
    }
}
Write-Host "Total fixed: $count files"
