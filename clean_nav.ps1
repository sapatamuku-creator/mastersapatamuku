# Skrip untuk membersihkan syncNavbar di semua file modul
$files = Get-ChildItem -Include onsite.html, checkin.html, analytics.html, luckydraw.html, angpao.html, wa_blast.html, formulir_tamu.html, worker.html, welcome.html -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # 1. Pastikan link Sign Out di HTML bersih
    # Cari pola: <a href="logout.html" ... Sign Out</a>
    # Kita buat konsisten menggunakan href="logout.html"
    
    # 2. Bersihkan fungsi syncNavbar di JavaScript
    # Cari pola lama: link.href = `${baseHref}?ssId=${CURRENT_SS_ID}`;
    # Ganti dengan logika yang lebih cerdas: jika target adalah logout.html, jangan tambah apa-apa.
    
    $oldSync = 'link.href = `${baseHref}?ssId=${CURRENT_SS_ID}`;'
    $newSync = 'link.href = baseHref;' # Kita sudah sepakat tidak pakai ssId di URL
    
    if ($content.Contains($oldSync)) {
        Write-Host "Cleaning syncNavbar in: $($file.Name)"
        $content = $content.Replace($oldSync, $newSync)
        Set-Content $file.FullName $content -NoNewline
    }
}
