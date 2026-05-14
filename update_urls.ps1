$oldUrl = "AKfycbx-BdV-ES7CheSMdnAfpZPAHrOYcGxcRBqVUmhRvKMTlF7_xWt-QCzy4UpdCeLoPnS9"
$newUrl = "AKfycbzKOapV7HR2QV3cRZotSNQzvKEO7vPSMTYo43VI2cj7iYdholUFt1CIkweQhVFW_Dzs"

Get-ChildItem -Include *.html, *.js, *.bat -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -like "*$oldUrl*") {
        Write-Host "Updating URL in: $($_.Name)"
        $content = $content.Replace($oldUrl, $newUrl)
        Set-Content $_.FullName $content -NoNewline
    }
}
