$oldUrl = "AKfycbxmKkz41efmBz1-1NnOcyoftxfQAtrHQy41WRrZnbsY0Y66zA4ZdxLPZF5UHemUROwN"
$newUrl = "AKfycbwNb_E4Vq202Gj1XdKUwiIkTbMKVm1TRn0JcmsxilBkDeAjDUcr44VvayDI-lNmV9Xn"

Get-ChildItem -Include *.html, *.js, *.bat -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -like "*$oldUrl*") {
        Write-Host "Updating URL in: $($_.Name)"
        $content = $content.Replace($oldUrl, $newUrl)
        Set-Content $_.FullName $content -NoNewline
    }
}
