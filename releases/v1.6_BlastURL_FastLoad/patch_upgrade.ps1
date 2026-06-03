$file = "d:\Google Antigrafity\mastersapatamuku\upgrade.html"
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

$newFunc = @"
    async function fetchClientData(username) {
        try {
            // Baca profil langsung dari Supabase View yang aman (tanpa password)
            const SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
            const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscmFwZXNhYW9saXlqcnJyc2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzU2ODUsImV4cCI6MjA5NDc1MTY4NX0.rZPCxRQmjb3SyimYDokgm1R1u2QSqj3iBv0gGEEteII";
            const res = await fetch(
                SB_URL + "/rest/v1/client_public_profile?subdomain=eq." + encodeURIComponent(username) + "&select=username,whatsapp,wedding_date,email,status,category,subdomain,client_name,package",
                { headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY } }
            );
            const rows = await res.json();

            if (Array.isArray(rows) && rows.length > 0) {
                currentUserData = rows[0];
                renderProfile();
            } else {
                showSapaModal("Data Tidak Ditemukan", "Tidak dapat memuat profil Anda.", "❌");
            }
        } catch (e) {
            showSapaModal("Koneksi Gagal", "Gagal menghubungi server database.", "⚠️");
        }
    }
"@

# Cari dan ganti blok fetchClientData dari awal hingga tutup kurung kurawal fungsi
$pattern = "(?s)async function fetchClientData\(username\) \{.*?\n    \}"
$newContent = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, $newFunc.Trim())

if ($newContent -eq $content) {
    Write-Host "TIDAK ada perubahan - pattern tidak cocok"
} else {
    [System.IO.File]::WriteAllText($file, $newContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "SUCCESS: fetchClientData diperbarui ke Supabase View"
}
