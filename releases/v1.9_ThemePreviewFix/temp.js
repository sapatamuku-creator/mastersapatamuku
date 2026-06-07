
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz5zBOJIO-b0MP-oqWhIUehqQaPbQt5pK9cMpTOYlj1pyT19LFD4VwynyJt_EAayBE/exec";
    const SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
    const SB_KEY = "sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u";

    // ── TIER MAPPING (harus sama dengan dashboard.html) ──────────────
    const PACKAGE_TIER_MAP = {
        'standard': 1, 'e-invitation standard': 1, 'e-inv standard': 1,
        'premium': 2,  'e-invitation premium': 2,  'e-inv premium': 2,
        'bronze': 3,   'bronze guestbook': 3,
        'silver': 4,   'silver guestbook': 4,
        'gold': 5,     'gold guestbook': 5,
        'exclusive': 6, 'exclusive collaboration': 6,
        'deluxe': 7,   'deluxe collaboration': 7,
        'platinum': 7, 'platinum collaboration': 7,
        'collaboration': 6, 'b2b': 6
    };

    // Harga resmi per paket
    const PACKAGE_PRICE_MAP = {
        'E-Invitation Standard': 100000,
        'E-Invitation Premium':  250000,
        'Bronze Guestbook':      2500000,
        'Silver Guestbook':      3500000,
        'Gold Guestbook':        4500000,
        'Exclusive Collaboration': 7500000,
        'Deluxe Collaboration':  10500000,
        'Platinum Collaboration':  10500000,
    };

    function getPackageTier(pkgName) {
        const key = (pkgName || '').toLowerCase().trim();
        if (PACKAGE_TIER_MAP[key] !== undefined) return PACKAGE_TIER_MAP[key];
        for (const k of Object.keys(PACKAGE_TIER_MAP)) {
            if (key.includes(k) || k.includes(key)) return PACKAGE_TIER_MAP[k];
        }
        return 0;
    }

    let currentUserData = null;
    let currentPackageTier = 0;  // Tier paket yang sudah dimiliki
    let currentPackagePrice = 0; // Harga paket yang sudah dibayar

    window.onload = function() {
        let sessionData = null;
        try {
            sessionData = JSON.parse(sessionStorage.getItem('sapatamu_session')) ||
                          JSON.parse(localStorage.getItem('sapatamu_db'));
        } catch (e) {}

        if (!sessionData || !sessionData.username) {
            window.location.href = 'login.html';
            return;
        }
        fetchClientData(sessionData.username);
    };

    async function fetchClientData(username) {
        try {
            const response = await fetch(`${SB_URL}/rest/v1/client_public_profile?username=eq.${username}&limit=1`, {
                headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY }
            });
            if (!response.ok) throw new Error("Gagal mengambil data profil");
            const rows = await response.json();
            if (rows && rows.length > 0) {
                currentUserData = rows[0];
                renderProfile();
            } else {
                showSapaModal("Data Tidak Ditemukan", "Tidak dapat memuat profil Anda.", "❌");
            }
        } catch (e) {
            showSapaModal("Koneksi Gagal", "Gagal menghubungi server database.", "⚠️");
        }
    }

    function formatIndonesianDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
        const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    function renderProfile() {
        let displayWeddingDate = currentUserData.wedding_date || "Belum Ditentukan";
        if (displayWeddingDate && typeof displayWeddingDate === 'string' && displayWeddingDate.includes("GMT")) {
            displayWeddingDate = formatIndonesianDate(displayWeddingDate);
        }

        document.getElementById('info-nama').innerText = currentUserData.client_name || currentUserData.username;
        document.getElementById('info-subdomain').innerText = currentUserData.subdomain;
        document.getElementById('info-tanggal').innerText = displayWeddingDate;
        document.getElementById('info-paket').innerText = currentUserData.package || "Belum ada paket";
        document.getElementById('slot-checker-date').innerText = displayWeddingDate !== "Belum Ditentukan" ? displayWeddingDate : "-";

        // Hitung tier & harga paket saat ini
        const currentPkg = currentUserData.package || '';
        currentPackageTier = getPackageTier(currentPkg);
        currentPackagePrice = PACKAGE_PRICE_MAP[currentPkg] || 0;

        // Terapkan dimming pada paket yang lebih rendah/sama (no-downgrade)
        applyUpgradeDimming();

        // RBAC Guard: usher tidak boleh upgrade
        try {
            const sess = JSON.parse(sessionStorage.getItem('sapatamu_session') || localStorage.getItem('sapatamu_db') || '{}');
            if (sess.role === 'usher') {
                const btn = document.getElementById('btn_upgrade_pay');
                if (btn) { btn.disabled = true; btn.title = 'Hanya pemilik akun yang dapat melakukan upgrade.'; }
                document.getElementById('slot-checker-widget').insertAdjacentHTML('beforeend',
                    '<div style="margin-top:8px;font-size:10px;font-weight:700;color:#E07B7B;">🔒 Fitur upgrade hanya tersedia untuk pemilik akun.</div>');
            }
        } catch(e) {}

        // Auto select 1 tier above current
        let targetCat = 'einv';
        if (currentPackageTier === 1 || currentPackageTier === 2) targetCat = 'guestbook';
        else if (currentPackageTier === 3 || currentPackageTier === 4) targetCat = 'guestbook';
        else if (currentPackageTier >= 5) targetCat = 'allin';
        
        filterPricingCategory(targetCat, true);
    }

    function applyUpgradeDimming() {
        document.querySelectorAll('.pricing-card').forEach(card => {
            const onclick = card.getAttribute('onclick') || '';
            const match = onclick.match(/selectPricing\('([^']+)',\s*(\d+)\)/);
            if (!match) return;
            const pkgName = match[1];
            const pkgTier = getPackageTier(pkgName);

            if (pkgTier <= currentPackageTier) {
                // Paket lebih rendah atau sama → disable & dim
                card.style.opacity = '0.4';
                card.style.filter = 'grayscale(1)';
                card.style.cursor = 'not-allowed';
                card.style.pointerEvents = 'none';
                card.title = pkgTier === currentPackageTier
                    ? '✔ Paket Anda saat ini'
                    : '⬇ Tidak dapat downgrade paket';
                // Tambah label "Paket Aktif" jika sama
                if (pkgTier === currentPackageTier) {
                    const badge = document.createElement('div');
                    badge.style.cssText = 'position:absolute;top:12px;right:12px;background:#4A3F35;color:#fff;font-size:9px;font-weight:800;padding:3px 10px;border-radius:20px;';
                    badge.innerText = '✔ PAKET AKTIF';
                    card.style.position = 'relative';
                    card.appendChild(badge);
                }
            }
        });
    }

    window.filterPricingCategory = function(cat) {
        ['einv','guestbook','allin'].forEach(c => {
            const btn = document.getElementById('btn-cat-' + c);
            if (btn) btn.classList.remove('active');
        });
        const activeBtn = document.getElementById('btn-cat-' + cat);
        if (activeBtn) activeBtn.classList.add('active');

        document.querySelectorAll('.pricing-group').forEach(g => {
            g.classList.remove('block');
            g.classList.add('hidden');
        });
        const group = document.querySelector('.pricing-group.' + cat);
        if (group) { group.classList.remove('hidden'); group.classList.add('block'); }

        let defaultPkg = null;
        if (cat === 'einv') {
            defaultPkg = currentPackageTier >= 1 ? ['E-Invitation Premium', 250000] : ['E-Invitation Standard', 100000];
        } else if (cat === 'guestbook') {
            if (currentPackageTier <= 2) defaultPkg = ['Bronze Guestbook', 2500000];
            else if (currentPackageTier === 3) defaultPkg = ['Silver Guestbook', 3500000];
            else defaultPkg = ['Gold Guestbook', 4500000];
        } else if (cat === 'allin') {
            defaultPkg = currentPackageTier <= 5 ? ['Exclusive Collaboration', 7500000] : ['Platinum Collaboration', 10500000];
        }

        if (defaultPkg) selectPricing(defaultPkg[0], defaultPkg[1], arguments[1]);
        triggerSlotCheck();
    };

    window.selectPricing = function(name, price, isAuto = false) {
        const tier = getPackageTier(name);
        const btnPay = document.getElementById('btn_upgrade_pay');
        const textEl = document.getElementById('text_upgrade_pay');

        // Cegah downgrade
        if (tier <= currentPackageTier) {
            if (!isAuto) {
                showSapaModal("Tidak Dapat Dipilih",
                    tier === currentPackageTier
                        ? `Paket "${name}" adalah paket Anda saat ini.`
                        : `Anda tidak dapat downgrade ke paket "${name}". Silakan pilih paket yang lebih tinggi.`,
                    "⚠️");
            } else {
                // Auto select gagal karena sudah top tier di kategori ini
                document.getElementById('final_package_name').value = '';
                if (btnPay) btnPay.disabled = true;
                if (textEl) textEl.innerText = 'Paket Maksimal';
            }
            return;
        }

        if (btnPay) btnPay.disabled = false;

        document.querySelectorAll('.pricing-card').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.pricing-card').forEach(card => {
            if ((card.getAttribute('onclick') || '').includes(`'${name}'`)) {
                card.classList.add('selected');
            }
        });

        // Hitung harga yang harus dibayar (selisih jika sudah punya paket sebelumnya)
        const fullPrice = PACKAGE_PRICE_MAP[name] || price;
        const diffPrice = Math.max(0, fullPrice - currentPackagePrice);
        const finalPrice = diffPrice > 0 ? diffPrice : fullPrice;

        document.getElementById('final_package_name').value = name;
        document.getElementById('final_package_price').value = finalPrice;
        document.getElementById('final_package_tier').value = tier;

        // Update tombol bayar dengan info selisih
        if (textEl) {
            const formatted = new Intl.NumberFormat('id-ID').format(finalPrice);
            if (currentPackagePrice > 0 && diffPrice < fullPrice && diffPrice > 0) {
                textEl.innerText = `Bayar Selisih Rp ${formatted}`;
            } else {
                textEl.innerText = `Bayar Rp ${formatted}`;
            }
        }
    };

    async function triggerSlotCheck() {
        if (!currentUserData) return;
        const tgl = currentUserData.wedding_date;
        const statusEl = document.getElementById('slot-checker-status');
        const btnPay = document.getElementById('btn_upgrade_pay');

        if (!tgl || tgl === "Belum Ditentukan" || tgl === "Masih belum tahu") {
            statusEl.innerText = "⚠️ Tanggal Belum Diatur. Hubungi Admin.";
            statusEl.className = "inline-block text-xs font-extrabold px-3 py-1 rounded-full bg-red-100 text-red-700";
            btnPay.disabled = true;
            return;
        }

        statusEl.innerText = "⏳ Sedang Cek Slot...";
        statusEl.className = "inline-block text-xs font-extrabold px-3 py-1 rounded-full bg-amber-200 text-amber-800";
        btnPay.disabled = true;

        try {
            const qDate = encodeURIComponent(tgl);
            const qUser = encodeURIComponent(currentUserData.username);
            const response = await fetch(`${SB_URL}/rest/v1/client_public_profile?wedding_date=eq.${qDate}&status=eq.Active&username=neq.${qUser}`, {
                headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY }
            });
            if (!response.ok) throw new Error("Gagal mengambil data slot");
            const rows = await response.json();

            let bookedCount = 0;
            if (rows && rows.length > 0) {
                rows.forEach(row => {
                    const pkg = (row.package || "").toLowerCase();
                    if (pkg.includes('guestbook') || pkg.includes('collaboration')) bookedCount++;
                });
            }

            if (bookedCount === 0) {
                statusEl.innerText = "✅ Slot Usher Tersedia";
                statusEl.className = "inline-block text-xs font-extrabold px-3 py-1 rounded-full bg-green-200 text-green-800";
                btnPay.disabled = false;
            } else {
                statusEl.innerText = "❌ Slot Usher Penuh";
                statusEl.className = "inline-block text-xs font-extrabold px-3 py-1 rounded-full bg-red-200 text-red-800";
                btnPay.disabled = true;
                showSapaModal("Tanggal Penuh", "Maaf, seluruh slot tim Usher/Guestbook untuk tanggal acara Anda sudah di-booking. Pembayaran ditangguhkan.", "📅");
            }
        } catch (e) {
            statusEl.innerText = "⚠️ Gagal Sinkronisasi Slot";
            statusEl.className = "inline-block text-xs font-extrabold px-3 py-1 rounded-full bg-red-100 text-red-700";
        }
    }

    function setLoading(btnId, isLoad) {
        const btn = document.getElementById(btnId);
        const text = document.getElementById(btnId.replace('btn', 'text'));
        const load = document.getElementById(btnId.replace('btn', 'load'));
        if (btn) btn.disabled = isLoad;
        if (text) text.style.display = isLoad ? 'none' : 'block';
        if (load) load.style.display = isLoad ? 'block' : 'none';
    }

    window.showSapaModal = function(title, msg, icon = "✨") {
        document.getElementById('notify-title').innerText = title;
        document.getElementById('notify-msg').innerText = msg;
        document.getElementById('notify-icon').innerText = icon;
        document.getElementById('sapa-notify-modal').style.display = 'flex';
    };
    window.closeSapaModal = function() {
        document.getElementById('sapa-notify-modal').style.display = 'none';
    };

    window.prosesPembayaranUpgrade = async function() {
        if (!currentUserData) return;
        const newPackage = document.getElementById('final_package_name').value;
        const price = document.getElementById('final_package_price').value;
        const newTier = parseInt(document.getElementById('final_package_tier').value || '0');

        // Final double-check no-downgrade
        if (newTier <= currentPackageTier) {
            showSapaModal("Tidak Dapat Diproses", "Anda tidak dapat downgrade atau memilih paket yang sama. Pilih paket yang lebih tinggi.", "⚠️");
            return;
        }

        setLoading('btn_upgrade_pay', true);
        try {
            const response = await fetch(SCRIPT_URL, {
                method: "POST", mode: "cors",
                body: JSON.stringify({
                    action: "createMidtransTransaction",
                    subdomain: currentUserData.subdomain,
                    price: price,
                    packageName: newPackage,
                    clientName: currentUserData.client_name || currentUserData.username,
                    email: currentUserData.email || "sapatamuku@gmail.com",
                    whatsapp: currentUserData.whatsapp || "08123456789"
                })
            });
            const resJson = await response.json();
            if (resJson.status === "success") {
                snap.pay(resJson.token, {
                    onSuccess: () => prosesAktivasiUpgrade(newPackage),
                    onPending: () => { showSapaModal("Menunggu Pembayaran", "Selesaikan instruksi pembayaran Anda.", "⏳"); setLoading('btn_upgrade_pay', false); },
                    onError:   () => { showSapaModal("Pembayaran Gagal", "Terjadi kesalahan saat memproses pembayaran.", "❌"); setLoading('btn_upgrade_pay', false); },
                    onClose:   () => { showSapaModal("Dibatalkan", "Anda menutup popup pembayaran Midtrans.", "⚠️"); setLoading('btn_upgrade_pay', false); }
                });
            } else {
                showSapaModal("Gagal Membuka Pembayaran", resJson.message, "❌");
                setLoading('btn_upgrade_pay', false);
            }
        } catch (err) {
            showSapaModal("Kesalahan Sistem", "Gagal menghubungi server pembayaran: " + err, "⚠️");
            setLoading('btn_upgrade_pay', false);
        }
    };

    async function prosesAktivasiUpgrade(newPackage) {
        setLoading('btn_upgrade_pay', true);
        document.getElementById('text_upgrade_pay').innerText = "Mengupgrade Akun...";
        try {
            const response = await fetch(SCRIPT_URL, {
                method: "POST", mode: "cors",
                body: JSON.stringify({ action: "upgradePackage", username: currentUserData.username, newPackage: newPackage })
            });
            const resJson = await response.json();
            if (resJson.status === "success") {
                showSapaModal("Upgrade Berhasil! 🎉", `Selamat! Layanan Anda telah di-upgrade ke ${newPackage}. Halaman akan dimuat ulang.`, "🎉");
                setTimeout(() => window.location.reload(), 3000);
            } else {
                showSapaModal("Aktivasi Gagal", resJson.message, "❌");
                setLoading('btn_upgrade_pay', false);
            }
        } catch (err) {
            showSapaModal("Kesalahan Sistem", "Pembayaran sukses namun aktivasi gagal: " + err, "⚠️");
            setLoading('btn_upgrade_pay', false);
        }
    }
