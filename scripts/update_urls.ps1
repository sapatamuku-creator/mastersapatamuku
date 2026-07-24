$oldId = "AKfycbzQlcitRpVbBafJeq67Pky9ikvt7JU4ULSJT55VBbLWKTDt-Nkd-dboKPeg2tK90ahd"
$newId = "AKfycbyfJD7Vr_1ALz7LGb_rQ_HE4iH1AuOUZRiwzshRgFppWzBdvtfOpXB7fM9gaEslYwJN"

Get-ChildItem -Include *.html, *.js, *.bat -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -like "*$oldId*") {
        Write-Host "Updating URL in: $($_.Name)"
        $content = $content.Replace($oldId, $newId)
        Set-Content $_.FullName $content -NoNewline
    }
}
