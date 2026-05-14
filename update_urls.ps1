$oldUrl = "AKfycbQlcitRpVbBafJeq67Pky9ikvt7JU4ULSJT55VBbLWKTDt-Nkd-dboKPeg2tK90ahd"
$newUrl = "AKfycbzQlcitRpVbBafJeq67Pky9ikvt7JU4ULSJT55VBbLWKTDt-Nkd-dboKPeg2tK90ahd"

Get-ChildItem -Include *.html, *.js, *.bat -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -like "*$oldUrl*") {
        Write-Host "Updating URL in: $($_.Name)"
        $content = $content.Replace($oldUrl, $newUrl)
        Set-Content $_.FullName $content -NoNewline
    }
}
