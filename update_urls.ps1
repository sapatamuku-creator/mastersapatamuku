$oldUrl = "AKfycbzKOapV7HR2QV3cRZotSNQzvKEO7vPSMTYo43VI2cj7iYdholUFt1CIkweQhVFW_Dzs"
$newUrl = "AKfycbxJJxmhqjS_gZ7xdS98-13alRxnbTUHSKROyvfjmVoagl9zu1PTgQay2oW5k4oOzeI5"

Get-ChildItem -Include *.html, *.js, *.bat -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -like "*$oldUrl*") {
        Write-Host "Updating URL in: $($_.Name)"
        $content = $content.Replace($oldUrl, $newUrl)
        Set-Content $_.FullName $content -NoNewline
    }
}
