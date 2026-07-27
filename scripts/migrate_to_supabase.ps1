# Patch: Migrasi welcome.html dari GAS ke Supabase metadata_client + config_invitation
# onsite.html: (dilewati sesuai permintaan)

$SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co"
$SB_KEY = "sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u"

# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
# PATCH 1: welcome.html - syncMetadata() baca dari Supabase
# Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
$welcomeFile = "d:\Google Antigrafity\mastersapatamuku\welcome.html"
$welcome = [System.IO.File]::ReadAllText($welcomeFile, [System.Text.Encoding]::UTF8)

$newSyncMetadata = @"
        async function syncMetadata() {
            if (!ssId) return;
            try {
                // 1. Baca metadata_client
                const metaRes = await fetch(
                    `${SB_URL}/rest/v1/metadata_client?ssid=eq.${ssId}&limit=1`,
                    { headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY } }
                );
                
                let coupleName = "Memuat...";
                let weddingDate = "Menunggu Sinkronisasi";
                
                if (metaRes.ok) {
                    const metaRows = await metaRes.json();
                    if (metaRows && metaRows.length > 0) {
                        const meta = metaRows[0];
                        coupleName = meta.nama_pengantin || "SapaTamu.Ku";
                        weddingDate = meta.hari_tanggal || "-";
                    }
                }

                document.getElementById('couple-name').innerHTML = coupleName.replace(" & ", " &amp; ");
                document.getElementById('wedding-date').innerText = weddingDate;

                // 2. Baca config_invitation untuk slideshow & rundown
                const res = await fetch(
                    `${SB_URL}/rest/v1/config_invitation?ssid=eq.${ssId}&select=data&limit=1`,
                    { headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY } }
                );
                
                if (res.ok) {
                    const rows = await res.json();
                    if (rows && rows.length > 0) {
                        const cfg = rows[0].data || {};
                        const ev1 = cfg.ev1 || {};
                        
                        // Slideshow dari gallery config
                        const gallery = (cfg.gallery || []).filter(u => u && u.trim() !== "");
                        if (gallery.length > 0) {
                            initSlideshow(gallery);
                        } else if (ev1.photo) {
                            initSlideshow([ev1.photo]);
                        } else {
                            initSlideshow(['https://drive.google.com/uc?id=1jBzMvevbhVvuVFTzwiLzmrum5IiEpwwz']);
                        }

                        // Rundown dari events (ev1, ev2)
                        const now = new Date();
                        const nowVal = (now.getHours() * 100) + now.getMinutes();
                        const events = [];
                        if (ev1.name) events.push({ displayTime: ev1.time || "", eventName: ev1.name, syncTime: ev1.time || "00:00" });
                        const ev2 = cfg.ev2 || {};
                        if (ev2.name) events.push({ displayTime: ev2.time || "", eventName: ev2.name, syncTime: ev2.time || "00:00" });

                        let rundownHtml = "";
                        events.forEach((item, i, arr) => {
                            const startVal = convertToTimeValue(item.syncTime);
                            const nextItem = arr[i + 1];
                            const active = nextItem
                                ? (nowVal >= startVal && nowVal < convertToTimeValue(nextItem.syncTime))
                                : (nowVal >= startVal);
                            rundownHtml += `<div class="rundown-item ${active ? 'active-event' : ''}"><div class="event-time">${item.displayTime}</div><div class="event-name">${item.eventName}</div></div>`;
                        });
                        document.getElementById('rundown-list').innerHTML = rundownHtml;
                    }
                }

                metadataLoaded = true;
            } catch (e) {
                console.warn("Metadata sync error (Supabase):", e);
                if (!metadataLoaded) {
                    document.getElementById('couple-name').innerText = "Memuat...";
                }
            }
            clearTimeout(metadataTimer);
            metadataTimer = setTimeout(syncMetadata, 5 * 60 * 1000);
        }
"@

if ($welcome.Contains("async function syncMetadata()")) {
    $pattern = "(?s)async function syncMetadata\(\) \{.*?\n        \}"
    $welcome2 = [System.Text.RegularExpressions.Regex]::Replace($welcome, $pattern, $newSyncMetadata.Trim())
    if ($welcome2 -ne $welcome) {
        [System.IO.File]::WriteAllText($welcomeFile, $welcome2, [System.Text.UTF8Encoding]::new($false))
        Write-Host "SUCCESS: welcome.html - syncMetadata() migrasi ke Supabase metadata_client"
    } else {
        Write-Host "WARN: Pattern syncMetadata tidak cocok di welcome.html"
    }
} else {
    Write-Host "WARN: syncMetadata tidak ditemukan di welcome.html"
}

Write-Host "DONE. Semua patch selesai."
