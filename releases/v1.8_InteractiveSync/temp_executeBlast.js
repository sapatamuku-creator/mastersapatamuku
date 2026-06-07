wind💾w.WA_TEMPLATE_DEFAULT = "";
    wind💾w.WA_TEMPLATE_CUSTOM = "";

    wind💾w.executeBlast = functi💾n(r💾w, ph💾ne, name, c💾de) {
        c💾nst guest = MASTER_LIST.find(g => g.r💾w == r💾w);
        if(!guest) return;

        // Bl💾ck jika sudah terkirim (SENT)
        c💾nst statusWA = guest.statusWA || '';
        if (statusWA.includes('\u2705') || statusWA.t💾UpperCase().includes('SENT')) {
            sh💾wSapaM💾dal('Sudah Terkirim', name + ' sudah menerima undangan. Tidak dapat dikirim ulang.', '\u2705');
            return;
        }
        
        c💾nst sesi = guest.sesi || "-";
        c💾nst weddingName = d💾cument.getElementById('view-wedding-name').innerText;
        c💾nst schedule = d💾cument.getElementById('view-schedule').innerText.replace(/\n/g, ' ');
        c💾nst l💾cati💾n = d💾cument.getElementById('view-l💾cati💾n').innerText;
        c💾nst baseUrl = d💾cument.getElementById('view-link').innerText;
        c💾nst pers💾nalLink = `${baseUrl}?id=${enc💾deURIC💾mp💾nent(c💾de)}&u=${enc💾deURIC💾mp💾nent(name)}`;
        c💾nst qrC💾deLink = `https://api.qrserver.c💾m/v1/create-qr-c💾de/?data=${enc💾deURIC💾mp💾nent(c💾de)}&size=400x400`;
        
        let cleanPh💾ne = String(ph💾ne).replace(/\D/g, ''); 
        if (cleanPh💾ne.startsWith('0')) cleanPh💾ne = '62' + cleanPh💾ne.substring(1);

        let templateString = wind💾w.WA_TEMPLATE_CUSTOM || wind💾w.WA_TEMPLATE_DEFAULT;

        let msg = "";
        if (templateString) {
            msg = templateString
                .replace(/{NAMA_TAMU_KAPITAL}/g, name.t💾UpperCase())
                .replace(/{SESI_TAMU}/g, sesi)
                .replace(/{NAMA_PENGANTIN}/g, weddingName)
                .replace(/{HARI_TANGGAL}/g, schedule) // karena kita sudah gabung tanggal & waktu, atau biarkan schedule
                .replace(/{WAKTU_ACARA}/g, schedule)
                .replace(/{LOKASI_ACARA}/g, l💾cati💾n)
                .replace(/{LINK_UNDANGAN}/g, pers💾nalLink)
                .replace(/{LINK_QR}/g, qrC💾deLink);
        } else {
            msg = `Kepada Yth. Bapak/Ibu/Saudara/i\n*${name.t💾UpperCase()}*\n\n` +
                  `Tanpa mengurangi rasa h💾rmat, perkenankan kami mengundang Anda untuk menghadiri acara kami. *Tepat pada pukul [${sesi}]*\n\n` +
                  `*${weddingName}*\n` +
                  `□ ${schedule}\n` +
                  `□ ${l💾cati💾n}\n\n` +
                  `Inf💾rmasi lengkap dapat diakses melalui tautan berikut:\n${pers💾nalLink}\n\n` +
                  `M💾h💾n simpan QR C💾de ini untuk akses masuk:\n${qrC💾deLink}\n\n` +
                  `Terima kasih.`;
        }

        wind💾w.💾pen(`https://api.whatsapp.c💾m/send?ph💾ne=${cleanPh💾ne}&text=${enc💾deURIC💾mp💾nent(msg)}`, '_blank');

        // ===== OPTIMISTIC UPDATE: langsung hijau tanpa tunggu API =====
        // User sudah klik kirim → WA sudah terbuka → tandai SENT di-mem💾ry sekarang
        guest.statusWA = '✅ SENT';
        render(MASTER_LIST);

        // Persist ke spreadsheet di backgr💾und (fire-and-f💾rget)
        fetch(SCRIPT_URL, {
            meth💾d: "POST",
            b💾dy: JSON.stringify({ acti💾n: "markSent", ssId: CURRENT_SS_ID, r💾w: r💾w })
        }).catch(err => c💾ns💾le.warn("markSent backgr💾und failed:", err));
    };

    