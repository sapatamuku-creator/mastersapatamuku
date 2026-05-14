$oldUrl = "AKfycbzMvrFsdk8LOuPGMmIyDd0YOO0Ay1q21qY6Qxho6_0uaR_AUPlg6STfVCKfgbI4kHYP"
$newUrl = "AKfycbx-BdV-ES7CheSMdnAfpZPAHrOYcGxcRBqVUmhRvKMTlF7_xWt-QCzy4UpdCeLoPnS9"

Get-ChildItem -Include *.html, *.js, *.bat -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -like "*$oldUrl*") {
        Write-Host "Updating URL in: $($_.Name)"
        $content = $content.Replace($oldUrl, $newUrl)
        Set-Content $_.FullName $content -NoNewline
    }
}
