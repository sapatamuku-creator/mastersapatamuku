$files = Get-ChildItem -Include *.html -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -like "*window.location.replace('https://sapatamu.id/login.html');*") {
        Write-Host "Cleaning manual guard from: $($file.Name)"
        
        # Hapus blok script pengaman yang saya tambahkan secara otomatis
        $regex = "(?s)\s*// SECURITY GUARD: Cek sesi lokal sebelum lanjut.*?throw new Error\('Unauthorized'\);\s*}\s*"
        $newContent = [regex]::Replace($content, $regex, "")
        
        Set-Content $file.FullName $newContent -NoNewline
    }
}
