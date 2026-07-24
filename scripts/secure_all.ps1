$files = Get-ChildItem -Include *.html -Recurse

foreach ($file in $files) {
    if ($file.Name -eq "login.html" -or $file.Name -eq "logout.html" -or $file.Name -eq "index.html") { continue }
    
    $content = Get-Content $file.FullName -Raw
    
    # Tambahkan Satpam di bagian atas script atau init
    if ($content -notlike "*Akses ditolak: Sesi tidak ditemukan*") {
        Write-Host "Securing: $($file.Name)"
        
        # Cari tempat yang cocok untuk menaruh satpam (biasanya setelah resolveSapatamuSubdomain)
        # Atau taruh di awal script tag
        $securityScript = "
    // SECURITY GUARD: Cek sesi lokal sebelum lanjut
    if (!localStorage.getItem('sapatamu_db')) {
        window.location.replace('https://sapatamu.id/login.html');
        throw new Error('Unauthorized');
    }
"
        # Masukkan setelah <script> pertama
        $newContent = $content -replace '<script>', "<script>$securityScript"
        Set-Content $file.FullName $newContent -NoNewline
    }
}
