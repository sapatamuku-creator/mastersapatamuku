$files = Get-ChildItem -Include *.html -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -like "*subdomain_resolver.js*") {
        # Ganti subdomain_resolver.js atau subdomain_resolver.js?v=... dengan versi terbaru
        $newContent = $content -replace 'subdomain_resolver\.js(\?v=[0-9\.]+)?', 'subdomain_resolver.js?v=1.2'
        if ($content -ne $newContent) {
            Write-Host "Adding cache-buster to: $($file.Name)"
            Set-Content $file.FullName $newContent -NoNewline
        }
    }
}
