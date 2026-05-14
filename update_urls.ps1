$oldUrl = "AKfycbz9ukdBO50YGGgVDbJEoUfzG7InAilggWPoETda8JE2f-tBD0XODJUdiDI8ZYlo3ikV"
$newUrl = "AKfycbyXut2gNkm4JDJQP28brh9AblTu_QhugoMr6va3iRzvKjLgZbGZb4xRnNQILE8fW5Y-"

Get-ChildItem -Include *.html, *.js, *.bat -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -like "*$oldUrl*") {
        Write-Host "Updating URL in: $($_.Name)"
        $content = $content.Replace($oldUrl, $newUrl)
        Set-Content $_.FullName $content -NoNewline
    }
}
