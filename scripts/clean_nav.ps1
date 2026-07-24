$files = Get-ChildItem -Include *.html -Recurse
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace '<a href="config_invitation.html".*?</a>', ''
    $newContent = $newContent -replace '<a href="config.html".*?</a>', ''
    if ($content -ne $newContent) {
        Write-Host "Cleaning navbar in: $($file.Name)"
        Set-Content $file.FullName $newContent -NoNewline
    }
}
