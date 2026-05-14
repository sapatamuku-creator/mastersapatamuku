$oldUrl = "AKfycbzbRX1WvfTM8j-TS3DnwQOwCYjybzcYlC8HO9azksMkpAQ_wz6C70DXsVaS98zVgTf8"
$newUrl = "AKfycbz9ukdBO50YGGgVDbJEoUfzG7InAilggWPoETda8JE2f-tBD0XODJUdiDI8ZYlo3ikV"

Get-ChildItem -Include *.html, *.js, *.bat -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -like "*$oldUrl*") {
        Write-Host "Updating URL in: $($_.Name)"
        $content = $content.Replace($oldUrl, $newUrl)
        Set-Content $_.FullName $content -NoNewline
    }
}
