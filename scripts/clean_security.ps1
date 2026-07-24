$files = Get-ChildItem -Include *.html -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -like "*Akses ditolak: Sesi tidak ditemukan*") {
        Write-Host "Cleaning: $($file.Name)"
        
        # Hapus blok script pengaman yang terlalu cepat
        $regex = "(?s)<script>\s*// SECURITY GUARD: Cek sesi lokal sebelum lanjut.*?throw new Error\('Unauthorized'\);\s*}\s*</script>"
        $newContent = [regex]::Replace($content, $regex, "")
        
        Set-Content $file.FullName $newContent -NoNewline
    }
}
