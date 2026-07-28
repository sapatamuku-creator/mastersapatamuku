
        const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz5zBOJIO-b0MP-oqWhIUehqQaPbQt5pK9cMpTOYlj1pyT19LFD4VwynyJt_EAayBE/exec";

        let CURRENT_SS_ID = null;
        let masterData = [];
        let html5QrCode;
        let selectedIDs = new Set();
        
        window.toggleSelect = function(id) {
            if (selectedIDs.has(id)) selectedIDs.delete(id);
            else selectedIDs.add(id);
            document.getElementById('selected-count').innerText = selectedIDs.size;
            document.getElementById('bulk-btn').style.display = selectedIDs.size > 0 ? 'block' : 'none';
            renderUI();
        };

        window.openConfirmModal = function() {
            const selectedList = Array.from(selectedIDs).map(id => masterData.find(r => r.kode === id));
            if (selectedList.length === 0) return;
            if (selectedList.length > 1) {
                showAlert("Perhatian", "Pilih 1 tamu saja. Fitur On-Site Check-in khusus untuk melayani registrasi, foto & angpao/kado secara perorangan.", "�a�️");
                return;
            }
            openConfirm(selectedList[0]);
        };

        let currentStream = null;
        let capturedBase64 = null;
        let regStream = null;
        let selectedGuest = null;
        let JALUR_ID = "ALL";

        // SB_URL and SB_KEY are now global vars from config.js

        let supabaseClient = null;
        let realtimeChannel = null;
        let EVENT_DATE = null;

        function initSupabaseRealtimeTamu() {
            if (!CURRENT_SS_ID) return;
            try {
                if (window.supabase) {
                    supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);
                    console.log("Menghubungkan ke Supabase Realtime (Tamu)...");
                    
                    realtimeChannel = supabaseClient
                        .channel('tamu_changes_channel')
                        .on(
                            'postgres_changes',
                            {
                                event: '*',
                                schema: 'public',
                                table: 'tamu',
                                filter: `ssid=eq.${CURRENT_SS_ID}`
                            },
                            (payload) => {
                                console.log("Realtime event (Tamu):", payload);
                                const eventType = payload.eventType;
                                
                                if (eventType === 'INSERT') {
                                    const item = payload.new;
                                    const newItem = {
                                        row: item.row,
                                        nama: item.nama,
                                        whatsapp: item.whatsapp,
                                        kategori: item.kategori,
                                        kode: item.kode,
                                        barcode: `https://api.qrserver.com/v1/create-qr-code/?data=${item.kode}&size=400x400`,
                                        rencanaHadir: item.rencana_hadir,
                                        statusHadir: String(item.status_hadir),
                                        jamDatang: item.jam_datang,
                                        souvenir: item.souvenir,
                                        pihakPengundang: item.pihak_pengundang,
                                        alamat: item.alamat,
                                        realHadir: item.real_hadir,
                                        statusWA: item.status_wa,
                                        statusHadiah: item.status_hadiah,
                                        tandaKasih: item.tanda_kasih,
                                        sesi: item.sesi
                                    };
                                    const existingIdx = masterData.findIndex(g => g.kode === newItem.kode);
                                    if (existingIdx !== -1) {
                                        masterData[existingIdx].row = newItem.row;
                                        masterData[existingIdx].statusWA = newItem.statusWA;
                                        console.log("Updated optimistic onsite guest row number:", newItem.row);
                                    } else {
                                        masterData.unshift(newItem);
                                    }
                                    renderUI();
                                } else if (eventType === 'UPDATE') {
                                    const item = payload.new;
                                    const idx = masterData.findIndex(g => g.kode === item.kode || g.row === item.row);
                                    if (idx !== -1) {
                                        masterData[idx] = {
                                            ...masterData[idx],
                                            nama: item.nama,
                                            whatsapp: item.whatsapp,
                                            kategori: item.kategori,
                                            rencanaHadir: item.rencana_hadir,
                                            statusHadir: String(item.status_hadir),
                                            jamDatang: item.jam_datang,
                                            souvenir: item.souvenir,
                                            pihakPengundang: item.pihak_pengundang,
                                            alamat: item.alamat,
                                            realHadir: item.real_hadir,
                                            statusWA: item.status_wa,
                                            statusHadiah: item.status_hadiah,
                                            tandaKasih: item.tanda_kasih,
                                            sesi: item.sesi
                                        };
                                        renderUI();
                                    }
                                } else if (eventType === 'DELETE') {
                                    const item = payload.old;
                                    masterData = masterData.filter(g => g.kode !== item.kode && g.row !== item.row);
                                    renderUI();
                                }
                            }
                        )
                        .subscribe((status) => {
                            console.log(`Status Realtime Tamu: ${status}`);
                            const indicator = document.getElementById('realtime-status');
                            if (indicator) {
                                if (status === 'SUBSCRIBED') {
                                    indicator.innerText = "Realtime On";
                                    indicator.style.background = "#d1fae5";
                                    indicator.style.color = "#059669";
                                } else {
                                    indicator.innerText = "Realtime Off";
                                    indicator.style.background = "#fee2e2";
                                    indicator.style.color = "#ef4444";
                                }
                            }
                        });
                } else {
                    console.warn("Supabase library tidak termuat.");
                }
            } catch (e) {
                console.error("Gagal inisialisasi Realtime Tamu:", e);
            }
        }

        window.showAlert = function (title, msg, icon = "�a�️") {
            return new Promise(resolve => {
                document.getElementById('st-modal-icon').innerText = icon;
                document.getElementById('st-modal-title').innerText = title;
                document.getElementById('st-modal-msg').innerText = msg;
                document.getElementById('modal-cancel-btn').style.display = 'none';
                const okBtn = document.getElementById('modal-ok-btn');
                okBtn.innerText = "TUTUP";
                okBtn.onclick = () => {
                    document.getElementById('st-modal').style.display = 'none';
                    resolve(true);
                };
                document.getElementById('st-modal').style.display = 'flex';
            });
        };

        window.showConfirm = function (title, msg, icon = "�xa�") {
            return new Promise(resolve => {
                document.getElementById('st-modal-icon').innerText = icon;
                document.getElementById('st-modal-title').innerText = title;
                document.getElementById('st-modal-msg').innerText = msg;
                document.getElementById('modal-cancel-btn').style.display = 'block';
                document.getElementById('modal-ok-btn').innerText = "LANJUTKAN";
                document.getElementById('modal-ok-btn').onclick = () => {
                    document.getElementById('st-modal').style.display = 'none';
                    resolve(true);
                };
                document.getElementById('modal-cancel-btn').onclick = () => {
                    document.getElementById('st-modal').style.display = 'none';
                    resolve(false);
                };
                document.getElementById('st-modal').style.display = 'flex';
            });
        };

        async function initApp() {
            SapaGuard.apply('field'); // RBAC Guard
            if (!window.SAPATAMU_RESOLVED) {
                setTimeout(initApp, 100);
                return;
            }

            const session = JSON.parse(sessionStorage.getItem('sapatamu_session')) || JSON.parse(localStorage.getItem('sapatamu_db'));
            CURRENT_SS_ID = window.CURRENT_SS_ID || (session ? session.ssId : null);

            if (!CURRENT_SS_ID) { window.location.href = "login.html"; return; }

            const savedJalur = localStorage.getItem('onsite_jalur_id');
            if (savedJalur) {
                JALUR_ID = savedJalur;
                document.getElementById('jalur-selector').value = savedJalur;
            }

            document.getElementById('jalur-selector').addEventListener('change', (e) => {
                JALUR_ID = e.target.value;
                localStorage.setItem('onsite_jalur_id', JALUR_ID);
            });

            fetchData();
            syncMetadataOptions();
            initSupabaseRealtimeTamu();
            initScanner();
            initNavScroll();
        }

        function syncMetadataOptions() {
            fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: "getMasterData", ssId: CURRENT_SS_ID })
            })
            .then(r => r.json())
            .then(result => {
                if (result.status === "error") {
                    console.error("GAS Metadata sync error:", result.message);
                    return;
                }

                // Update Dynamic Dropdown "Inviter Side"
                if (result.dropdownOptions && result.dropdownOptions.length > 0) {
                    const select = document.getElementById('reg-host');
                    if (select) {
                        const map = {
                            'PENGANTIN PRIA': 'Pengantin Pria',
                            'PENGANTIN WANITA': 'Pengantin Wanita',
                            'KELUARGA AYAH PENGANTIN PRIA': 'Keluarga Ayah CPP',
                            'KELUARGA IBU PENGANTIN PRIA': 'Keluarga Ibu CPP',
                            'KELUARGA AYAH PENGANTIN WANITA': 'Keluarga Ayah CPW',
                            'KELUARGA IBU PENGANTIN WANITA': 'Keluarga Ibu CPW'
                        };
                        select.innerHTML = "";
                        result.dropdownOptions.forEach(opt => {
                            const valUpper = opt.toUpperCase().trim();
                            const label = map[valUpper] || opt;
                            const el = document.createElement('option');
                            el.value = valUpper;
                            el.innerText = label;
                            select.appendChild(el);
                        });
                    }
                }

                // Update Dynamic Dropdown "Sesi"
                if (result.eventMeta && result.eventMeta.sesiOptions && result.eventMeta.sesiOptions.length > 0) {
                    const sesiSelect = document.getElementById('reg-sesi');
                    if (sesiSelect) {
                        sesiSelect.innerHTML = '<option value="">Pilih Sesi</option>' + result.eventMeta.sesiOptions.map((val, index) => {
                            return `<option value="${val}">Sesi ${index + 1} (${val})</option>`;
                        }).join('');
                    }
                }
            })
            .catch(e => console.error("Error syncing metadata options:", e));
        }

        function initNavScroll() {
            const container = document.getElementById('nav-scroll');
            const fLeft = document.getElementById('fade-left');
            const fRight = document.getElementById('fade-right');

            const updateFades = () => {
                const scrollLeft = container.scrollLeft;
                const maxScroll = container.scrollWidth - container.clientWidth;
                fLeft.classList.toggle('visible', scrollLeft > 10);
                fRight.classList.toggle('visible', scrollLeft < maxScroll - 10);
            };

            container.addEventListener('scroll', updateFades);
            window.addEventListener('resize', updateFades);
            setTimeout(updateFades, 500);

            // Auto-scroll to active link
            const active = container.querySelector('.nav-link.active');
            if (active) {
                container.scrollLeft = active.offsetLeft - (container.clientWidth / 2) + (active.clientWidth / 2);
            }
        }

        async function fetchData() {
            try {
                const supabaseUrl = SB_URL + "/rest/v1/tamu?ssid=eq." + CURRENT_SS_ID + "&order=row.desc";
                const response = await fetch(supabaseUrl, {
                    headers: {
                        "apikey": SB_KEY,
                        "Authorization": "Bearer " + SB_KEY
                    }
                });
                const sbData = await response.json();
                
                if (sbData && sbData.length > 0 && sbData[0].event_date) {
                    EVENT_DATE = sbData[0].event_date;
                }
                
                // Map data snake_case Supabase ke format camelCase frontend
                masterData = (sbData || []).map(item => ({
                    row: item.row,
                    nama: item.nama,
                    whatsapp: item.whatsapp,
                    kategori: item.kategori,
                    kode: item.kode,
                    barcode: `https://api.qrserver.com/v1/create-qr-code/?data=${item.kode}&size=400x400`,
                    rencanaHadir: item.rencana_hadir,
                    statusHadir: String(item.status_hadir),
                    jamDatang: item.jam_datang,
                    souvenir: item.souvenir,
                    pihakPengundang: item.pihak_pengundang,
                    alamat: item.alamat,
                    realHadir: item.real_hadir,
                    statusWA: item.status_wa,
                    statusHadiah: item.status_hadiah,
                    tandaKasih: item.tanda_kasih,
                    sesi: item.sesi
                }));

                renderUI();
            } catch (e) { console.error(e); }
        }

        function initScanner() {
            if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");
            html5QrCode.start({ facingMode: "environment" }, { fps: 25, qrbox: 220, aspectRatio: 1.0 }, onScanSuccess).catch(e => console.log(e));
        }

        function onScanSuccess(txt) {
            if (document.getElementById('modalConfirm').style.display === 'flex') return;
            const frame = document.getElementById('target-frame');
            let scCode = txt.trim();
            if (scCode.includes("id=")) scCode = scCode.split("id=")[1].split("&")[0];

            frame.classList.add('qr-detected');
            const guest = masterData.find(g => String(g.kode).trim().toUpperCase() === scCode.toUpperCase());

            if (guest) {
                if (String(guest.statusHadir) === "1") {
                    showAlert("Sudah Hadir", "Tamu '" + guest.nama + "' sudah hadir.", "�a�️");
                    frame.classList.remove('qr-detected');
                } else {
                    frame.classList.add('qr-success');
                    setTimeout(() => {
                        frame.classList.remove('qr-success', 'qr-detected');
                        openConfirm(guest);
                    }, 400);
                }
            } else {
                setTimeout(() => frame.classList.remove('qr-detected'), 1000);
            }
        }

        function switchTab(t) {
            document.getElementById('tab-scan-btn').classList.toggle('active', t === 'scan');
            document.getElementById('tab-reg-btn').classList.toggle('active', t === 'reg');
            document.getElementById('pane-scan').style.display = t === 'scan' ? 'flex' : 'none';
            document.getElementById('pane-reg').style.display = t === 'reg' ? 'block' : 'none';
            if (t === 'scan') {
                initScanner();
                if (regStream) { regStream.getTracks().forEach(t => t.stop()); regStream = null; }
                document.getElementById('reg-preview-container').style.display = 'none';
                document.getElementById('btn-reg-snap').innerText = "�x� AMBIL SELFIE (OPSIONAL)";
                document.getElementById('btn-reg-snap').style.background = "white";
                document.getElementById('btn-reg-snap').style.color = "var(--gold)";
                capturedBase64 = null;
            }
            else if (html5QrCode) html5QrCode.stop();
        }

        function renderUI() {
            const checkedInGuests = masterData.filter(r => r.jamDatang && r.jamDatang !== "-");
            const totalGuests = checkedInGuests.length;
            const totalPax = checkedInGuests.reduce((acc, r) => acc + (parseInt(r.realHadir) || 0), 0);
            
            const guestEl = document.getElementById('checkedin-guests');
            if (guestEl) guestEl.innerText = `${totalGuests} GUESTS`;
            const paxEl = document.getElementById('checkedin-pax');
            if (paxEl) paxEl.innerText = `${totalPax} PAX`;

            const term = document.getElementById('search-box').value.toLowerCase();
            const searchTerms = term.trim().split(/\s+/).filter(Boolean);
            const filtered = masterData.filter(g => {
                const rowText = [
                    g.nama || "", g.kode || "", g.whatsapp || "",
                    g.alamat || "", g.pihakPengundang || "",
                    g.sesi || "", g.kategori || "", String(g.rencanaHadir || "")
                ].join(" ").toLowerCase();
                return searchTerms.every(t => rowText.includes(t));
            });
            document.getElementById('guest-list').innerHTML = filtered.map(row => {
                const isDone = row.jamDatang && row.jamDatang !== "-";
                const isChecked = selectedIDs.has(row.kode);
                
                let giftIcons = "";
                if ((row.statusHadiah && row.statusHadiah.includes("ANGPAO")) || parseFloat(row.tandaKasih) > 0) giftIcons += "�x��";
                if (row.statusHadiah && row.statusHadiah.includes("KADO")) giftIcons += "�x}�";

                return `
                <div class="guest-item ${isDone ? 'checked-in' : ''}" style="border-top: 4px solid ${isDone?'var(--success)':'var(--border)'}">
                    <div class="guest-header">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div onclick="${isDone ? '' : `toggleSelect('${row.kode}')`}" style="cursor: pointer; padding: 5px;">
                                ${!isDone ? `<input type="checkbox" ${isChecked ? 'checked' : ''} style="accent-color:var(--gold); transform:scale(1.3); pointer-events:none;">` : '�S&'}
                            </div>
                            <div>
                                <div class="guest-name">${row.nama} <span style="margin-left:5px;">${giftIcons}</span></div>
                            </div>
                        </div>
                        <div class="guest-wa">${row.whatsapp || '-'}</div>
                    </div>

                    <div class="guest-details">
                        <div class="detail-item">�x�� <span>${row.alamat || '-'}</span></div>
                        <div class="detail-item">�xR Inv by: <span>${row.pihakPengundang || '-'}</span></div>
                        <div class="detail-item">⏰ Sesi: <span>${row.sesi || row.rencanaJamHadir || row.jamHadir || '-'}</span></div>
                    </div>

                    <div class="guest-footer">
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            <div class="guest-cat" style="display:inline-block">${row.kategori || 'UMUM'}</div>
                            <div style="font-size:8px; font-weight:800; color:var(--primary); margin-left:2px;">PAX PLAN: ${(row.rencanaHadir !== "" && row.rencanaHadir !== undefined) ? row.rencanaHadir : '1'}</div>
                        </div>
                        <div class="guest-status" style="color:${isDone ? 'var(--success)':'var(--text-muted)'}; text-align:right">
                            ${isDone ? `�S HADIR (${row.realHadir})` : '�� BELUM SCAN'}
                        </div>
                    </div>
                    <div style="font-size:7px; color:#ccc; margin-top:8px; text-align:right">ID: ${row.kode}</div>
                </div>`;
            }).join('');
        }

        async function openConfirm(guest) {
            selectedGuest = guest;
            document.getElementById('m-nama').innerText = guest.nama;
            document.getElementById('m-info').innerText = `${guest.kategori || 'UMUM'} | ${guest.alamat || '-'}`;
            document.getElementById('m-card-nama').innerText = guest.nama;
            document.getElementById('m-card-cat').innerText = guest.kategori || 'UMUM';
            document.getElementById('modalConfirm').style.display = 'flex';
            capturedBase64 = null;

            // Reset tags
            document.getElementById('tag-angpao').classList.remove('active');
            document.getElementById('tag-kado').classList.remove('active');

            // Reset pax based on plan
            const initialAdult = parseInt(guest.rencanaHadir) || 1;
            document.getElementById('m-pax-adult').innerText = initialAdult;
            document.getElementById('m-pax-child').innerText = "0";
            document.getElementById('m-pax-total').innerText = initialAdult;

            // Reset camera display to default
            const v = document.getElementById('camera-preview');
            const photoPreview = document.getElementById('camera-photo-preview');
            const btnSnap = document.getElementById('btn-snap');

            v.style.display = 'block';
            if (photoPreview) {
                photoPreview.style.display = 'none';
                photoPreview.src = "";
            }
            btnSnap.innerText = "AMBIL FOTO";
            btnSnap.style.background = "none";
            btnSnap.style.color = "var(--gold)";

            try {
                if (html5QrCode) {
                    try { await html5QrCode.stop(); } catch(e) {}
                }
                currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                v.srcObject = currentStream;
            } catch (e) { }
        }

        function closeModal() {
            if (currentStream) { currentStream.getTracks().forEach(t => t.stop()); currentStream = null; }
            document.getElementById('modalConfirm').style.display = 'none';

            // Reset preview display just in case
            document.getElementById('camera-preview').style.display = 'block';
            const photoPreview = document.getElementById('camera-photo-preview');
            if (photoPreview) {
                photoPreview.style.display = 'none';
                photoPreview.src = "";
            }

            setTimeout(() => initScanner(), 300);
        }

        window.updatePax = function (type, delta) {
            const el = document.getElementById('m-pax-' + type);
            let val = parseInt(el.innerText) + delta;
            if (type === 'adult' && val < 1) val = 1;
            if (type === 'child' && val < 0) val = 0;
            el.innerText = val;

            const adult = parseInt(document.getElementById('m-pax-adult').innerText);
            const child = parseInt(document.getElementById('m-pax-child').innerText);
            document.getElementById('m-pax-total').innerText = adult + child;
        };

        window.updateRegPax = function (type, delta) {
            const el = document.getElementById('reg-pax-' + type);
            let val = parseInt(el.innerText) + delta;
            if (type === 'adult' && val < 1) val = 1;
            if (type === 'child' && val < 0) val = 0;
            el.innerText = val;
        };

        window.toggleRegSelfie = async function () {
            const v = document.getElementById('reg-video');
            const container = document.getElementById('reg-preview-container');
            const preview = document.getElementById('reg-photo-preview');
            const btn = document.getElementById('btn-reg-snap');
            const canvas = document.getElementById('reg-canvas');
            
            if (!regStream && !capturedBase64) {
                try {
                    regStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                    v.srcObject = regStream;
                    container.style.display = 'block';
                    v.style.display = 'block';
                    preview.style.display = 'none';
                    btn.innerText = "�x� AMBIL FOTO SEKARANG";
                    btn.style.background = "var(--gold)";
                    btn.style.color = "white";
                } catch (err) {
                    alert("Gagal mengakses kamera: " + err.message);
                }
            } else if (regStream && !capturedBase64) {
                btn.disabled = true;
                btn.innerText = "MENYIAPKAN...";

                const overlay = document.getElementById('reg-countdown-overlay');
                if(overlay) overlay.style.display = 'flex';
                let count = 3;
                if(overlay) overlay.innerText = count;
                
                const timer = setInterval(() => {
                    count--;
                    if (count > 0) {
                        if(overlay) overlay.innerText = count;
                    } else if (count === 0) {
                        if(overlay) overlay.innerText = "�x�";
                    } else {
                        clearInterval(timer);
                        if(overlay) overlay.style.display = 'none';
                        
                        const ctx = canvas.getContext('2d');
                        canvas.width = v.videoWidth || 640;
                        canvas.height = v.videoHeight || 480;
                        ctx.translate(canvas.width, 0);
                        ctx.scale(-1, 1);
                        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                        capturedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                        
                        regStream.getTracks().forEach(t => t.stop());
                        regStream = null;
                        
                        v.style.display = 'none';
                        preview.src = capturedBase64;
                        preview.style.display = 'block';
                        
                        btn.disabled = false;
                        btn.innerText = "�x— ULANGI SELFIE";
                        btn.style.background = "white";
                        btn.style.color = "var(--gold)";
                    }
                }, 800);
            } else if (capturedBase64) {
                capturedBase64 = null;
                preview.style.display = 'none';
                preview.src = "";
                toggleRegSelfie();
            }
        };

        async function takeSelfie() {
            const v = document.getElementById('camera-preview');
            const c = document.getElementById('capture-canvas');
            const ctx = c.getContext('2d');
            const photoPreview = document.getElementById('camera-photo-preview');
            const btnSnap = document.getElementById('btn-snap');

            // If streaming, take picture and freeze
            if (currentStream) {
                btnSnap.disabled = true;
                btnSnap.innerText = "MENYIAPKAN...";

                const overlay = document.getElementById('countdown-overlay');
                if(overlay) overlay.style.display = 'flex';
                let count = 3;
                if(overlay) overlay.innerText = count;
                
                const timer = setInterval(() => {
                    count--;
                    if (count > 0) {
                        if(overlay) overlay.innerText = count;
                    } else if (count === 0) {
                        if(overlay) overlay.innerText = "�x�";
                    } else {
                        clearInterval(timer);
                        if(overlay) overlay.style.display = 'none';
                        executePhotoCaptureOnsite();
                    }
                }, 800);
            }
            // If frozen, restart stream to retake
            else {
                try {
                    if (html5QrCode) {
                        try { await html5QrCode.stop(); } catch(e) {}
                    }
                    currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                    v.srcObject = currentStream;
                    v.style.display = 'block';
                    if (photoPreview) {
                        photoPreview.style.display = 'none';
                        photoPreview.src = "";
                    }
                    btnSnap.innerText = "AMBIL FOTO";
                    btnSnap.style.background = "none";
                    btnSnap.style.color = "var(--gold)";
                } catch (e) {
                    showAlert("Akses Kamera", "Kamera tidak diizinkan.", "�a�️");
                }
            }
        }

        function executePhotoCaptureOnsite() {
            const v = document.getElementById('camera-preview');
            const c = document.getElementById('capture-canvas');
            const ctx = c.getContext('2d');
            const photoPreview = document.getElementById('camera-photo-preview');
            const btnSnap = document.getElementById('btn-snap');

            c.width = v.videoWidth || 640;
            c.height = v.videoHeight || 480;
            ctx.translate(c.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(v, 0, 0, c.width, c.height);
            capturedBase64 = c.toDataURL('image/jpeg', 0.8);

            // Stop stream
            if (currentStream) {
                currentStream.getTracks().forEach(t => t.stop());
                currentStream = null;
            }

            v.style.display = 'none';
            if (photoPreview) {
                photoPreview.src = capturedBase64;
                photoPreview.style.display = 'block';
            }

            btnSnap.disabled = false;
            btnSnap.innerText = "ULANGI FOTO �S";
            btnSnap.style.background = "var(--success)";
            btnSnap.style.color = "white";
        }

        async function executeCheckin() {
            const loading = document.getElementById('loading');
            loading.style.display = 'flex';

            // --- STEP 1: BLOCK UI ---
            const blocker = document.createElement('div');
            blocker.id = "global-blocker";
            blocker.style = "position:fixed; inset:0; z-index:999999; cursor:wait; background:transparent;";
            document.body.appendChild(blocker);

            const adult = document.getElementById('m-pax-adult').innerText;
            const child = document.getElementById('m-pax-child').innerText;
            const total = document.getElementById('m-pax-total').innerText;
            const paxString = `${total} ( ${adult}D + ${child}A )`;
            const gift = (document.getElementById('tag-angpao').classList.contains('active') ? "ANGPAO " : "") + (document.getElementById('tag-kado').classList.contains('active') ? "KADO" : "");

            try {
                // --- STEP 1.5: SUPABASE UPDATE & PRINT QUEUE LANGSUNG (< 200ms) ---
                const stationId = JALUR_ID === "ALL" ? "ONSITE-ALL" : "ONSITE-" + JALUR_ID;
                const mainPrintId = crypto.randomUUID();
                const nowISO = new Date().toLocaleTimeString('en-GB', { hour12: false });
                const SB_HEADERS = {
                    "apikey": SB_KEY,
                    "Authorization": "Bearer " + SB_KEY,
                    "Content-Type": "application/json"
                };

                try {
                    // Update tamu status
                    await fetch(`${SB_URL}/rest/v1/tamu?ssid=eq.${CURRENT_SS_ID}&kode=eq.${selectedGuest.kode}`, {
                        method: "PATCH",
                        headers: SB_HEADERS,
                        body: JSON.stringify({
                            status_hadir: "1",
                            jam_datang: nowISO,
                            real_hadir: paxString,
                            status_hadiah: gift || "-"
                        })
                    });

                    // Write print queue
                    let catUpper = String(selectedGuest.kategori || "").toUpperCase();
                    let labelType = (catUpper.includes("VIP") || catUpper.includes("VVIP") || catUpper.includes("KELUARGA")) ? "CHECKIN-LABEL" : "CHECKIN-STRUK";

                    const printPromises = [
                        fetch(`${SB_URL}/rest/v1/print_queue`, {
                            method: "POST",
                            headers: SB_HEADERS,
                            body: JSON.stringify({
                                id: mainPrintId,
                                ssid: CURRENT_SS_ID,
                                nama: selectedGuest.nama || "-",
                                kode: selectedGuest.kode || "-",
                                qr: `https://api.qrserver.com/v1/create-qr-code/?data=${selectedGuest.kode}&size=400x400`,
                                info: labelType,
                                status: "WAITING",
                                kategori: selectedGuest.kategori || "Umum",
                                alamat: selectedGuest.alamat || "-",
                                pihak: selectedGuest.pihakPengundang || "-",
                                sesi: selectedGuest.sesi || "-",
                                pax: paxString,
                                station_id: stationId
                            })
                        })
                    ];

                    if (gift && gift !== "-" && gift !== "ON-SITE") {
                        const statusUpper = String(gift).toUpperCase();
                        const queueSouvenir = (souvenirType) => {
                            const souvenirPrintId = crypto.randomUUID();
                            printPromises.push(
                                fetch(`${SB_URL}/rest/v1/print_queue`, {
                                    method: "POST",
                                    headers: SB_HEADERS,
                                    body: JSON.stringify({
                                        id: souvenirPrintId,
                                        ssid: CURRENT_SS_ID,
                                        nama: selectedGuest.nama || "-",
                                        kode: selectedGuest.kode || "-",
                                        qr: `https://api.qrserver.com/v1/create-qr-code/?data=${selectedGuest.kode}&size=400x400`,
                                        info: "SOUVENIR: " + souvenirType,
                                        status: "WAITING",
                                        kategori: selectedGuest.kategori || "Umum",
                                        alamat: selectedGuest.alamat || "-",
                                        pihak: selectedGuest.pihakPengundang || "-",
                                        sesi: selectedGuest.sesi || "-",
                                        pax: paxString,
                                        station_id: stationId
                                    })
                                })
                            );
                        };

                        if (statusUpper.includes("ANGPAO") && statusUpper.includes("KADO")) {
                            queueSouvenir("KADO");
                            queueSouvenir("ANGPAO");
                        } else {
                            queueSouvenir(statusUpper);
                        }
                    }
                    printPromises.push(
                        fetch(`${SB_URL}/rest/v1/welcome_queue`, {
                            method: "POST", headers: SB_HEADERS,
                            body: JSON.stringify({
                                id: genUUID(),
                                ssid: CURRENT_SS_ID,
                                nama: nama || "Tanpa Nama",
                                kategori: document.getElementById('reg-kategori').value || "Umum",
                                alamat: document.getElementById('reg-alamat').value || "-",
                                pihak: document.getElementById('reg-host').value || "-",
                                pax: paxString,
                                kode: kodeUnik,
                                status: "DISPLAY",
                                created_at: new Date().toISOString()
                            })
                        }).then(async res => {
                            if (!res.ok) console.warn("welcome_queue onsite write error:", await res.text());
                        }).catch(e => console.warn(e))
                    );

                    await Promise.all(printPromises);

                    // --- STEP 2: BACKGROUND SELFIE UPLOAD ---
                    if (capturedBase64) {
                        fetch(SCRIPT_URL, {
                            method: 'POST',
                            mode: 'no-cors',
                            body: JSON.stringify({
                                action: "uploadSelfie",
                                image: capturedBase64,
                                nama: selectedGuest.nama,
                                kode: selectedGuest.kode,
                                ssId: CURRENT_SS_ID
                            })
                        }).catch(e => console.warn("Background selfie upload failed:", e));
                    }

            } catch (e) {
                if (blocker) blocker.remove();
                showAlert("Error", "Gagal koneksi.", "�R");
            } finally {
                loading.style.display = 'none';
            }
        }

        window.submitOnsite = async function() {
            const nama = document.getElementById('reg-nama').value;
            const whatsapp = document.getElementById('reg-wa').value;
            if (!nama) { showAlert("Perhatian", "Nama wajib diisi!", "�a�️"); return; }
            const cleanPhone = whatsapp.replace(/\D/g, '');

            const loading = document.getElementById('loading');
            loading.style.display = 'flex';

            // --- STEP 1: BLOCK UI ---
            const blocker = document.createElement('div');
            blocker.id = "global-blocker";
            blocker.style = "position:fixed; inset:0; z-index:999999; cursor:wait; background:transparent;";
            document.body.appendChild(blocker);

            const adult = document.getElementById('reg-pax-adult').innerText;
            const child = document.getElementById('reg-pax-child').innerText;
            const total = parseInt(adult) + parseInt(child);
            const paxString = `${total} ( ${adult}D + ${child}A )`;
            const gift = (document.getElementById('reg-tag-angpao').classList.contains('active') ? "ANGPAO " : "") + (document.getElementById('reg-tag-kado').classList.contains('active') ? "KADO" : "");
            
            try {
                // Generate Unique Code and Print UUID on Frontend
                const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
                const kodeUnik = "ONS-" + randomPart;
                const mainPrintId = crypto.randomUUID();
                const stationId = JALUR_ID === "ALL" ? "ONSITE-ALL" : "ONSITE-" + JALUR_ID;
                const timeOnly = new Date().toLocaleTimeString('en-GB', { hour12: false });
                const SB_HEADERS = {
                    "apikey": SB_KEY,
                    "Authorization": "Bearer " + SB_KEY,
                    "Content-Type": "application/json"
                };

                try {
                    // Update print queue and welcome queue first
                    let catUpper = String(document.getElementById('reg-kategori').value || "").toUpperCase();
                    let labelType = (catUpper.includes("VIP") || catUpper.includes("VVIP") || catUpper.includes("KELUARGA")) ? "CHECKIN-LABEL" : "CHECKIN-STRUK";

                    const printPromises = [
                        fetch(`${SB_URL}/rest/v1/print_queue`, {
                            method: "POST",
                            headers: SB_HEADERS,
                            body: JSON.stringify({
                                id: mainPrintId,
                                ssid: CURRENT_SS_ID,
                                nama: nama || "-",
                                kode: kodeUnik,
                                qr: `https://api.qrserver.com/v1/create-qr-code/?data=${kodeUnik}&size=400x400`,
                                info: labelType,
                                status: "WAITING",
                                kategori: document.getElementById('reg-kategori').value || "Umum",
                                alamat: document.getElementById('reg-alamat').value || "-",
                                pihak: document.getElementById('reg-host').value || "-",
                                sesi: document.getElementById('reg-sesi').value || "-",
                                pax: paxString,
                                station_id: stationId
                            })
                        })
                    ];

                    if (gift && gift !== "-" && gift !== "ON-SITE") {
                        const statusUpper = String(gift).toUpperCase();
                        const queueSouvenir = (souvenirType) => {
                            const souvenirPrintId = crypto.randomUUID();
                            printPromises.push(
                                fetch(`${SB_URL}/rest/v1/print_queue`, {
                                    method: "POST",
                                    headers: SB_HEADERS,
                                    body: JSON.stringify({
                                        id: souvenirPrintId,
                                        ssid: CURRENT_SS_ID,
                                        nama: nama || "-",
                                        kode: kodeUnik,
                                        qr: `https://api.qrserver.com/v1/create-qr-code/?data=${kodeUnik}&size=400x400`,
                                        info: "SOUVENIR: " + souvenirType,
                                        status: "WAITING",
                                        kategori: document.getElementById('reg-kategori').value || "Umum",
                                        alamat: document.getElementById('reg-alamat').value || "-",
                                        pihak: document.getElementById('reg-host').value || "-",
                                        sesi: document.getElementById('reg-sesi').value || "-",
                                        pax: paxString,
                                        station_id: stationId
                                    })
                                })
                            );
                        };

                        if (statusUpper.includes("ANGPAO") && statusUpper.includes("KADO")) {
                            queueSouvenir("KADO");
                            queueSouvenir("ANGPAO");
                        } else {
                            queueSouvenir(statusUpper);
                        }
                    }

                    printPromises.push(
                        fetch(`${SB_URL}/rest/v1/welcome_queue`, {
                            method: "POST", headers: SB_HEADERS,
                            body: JSON.stringify({
                                id: crypto.randomUUID(),
                                ssid: CURRENT_SS_ID,
                                nama: nama || "Tanpa Nama",
                                kategori: document.getElementById('reg-kategori').value || "Umum",
                                alamat: document.getElementById('reg-alamat').value || "-",
                                pihak: document.getElementById('reg-host').value || "-",
                                pax: paxString,
                                kode: kodeUnik,
                                status: "DISPLAY",
                                created_at: new Date().toISOString()
                            })
                        }).then(async res => {
                            if (!res.ok) console.warn("welcome_queue onsite write error:", await res.text());
                        }).catch(e => console.warn(e))
                    );

                    await Promise.all(printPromises);

                } catch(e) {
                    console.error("Direct Supabase guest registration / print queuing failed:", e);
                }

                const payload = {
                    action: "register_new_onsite",
                    ssId: CURRENT_SS_ID,
                    namaTamu: nama,
                    alamat: document.getElementById('reg-alamat').value,
                    whatsapp: whatsapp,
                    kategori: document.getElementById('reg-kategori').value,
                    host: document.getElementById('reg-host').value,
                    sesi: document.getElementById('reg-sesi').value,
                    souvenir: document.getElementById('reg-souvenir').value,
                    realHadir: paxString,
                    catatan: gift || "-",
                    prefix: "ONS",
                    stationId: stationId,
                    kodeUnik: kodeUnik,
                    customUuid: mainPrintId,
                    skipSupabase: false, // Let GAS sync this record to Supabase tamu table with the correct row ID
                    skipSupabasePrint: true // Skip duplicate print queue insertions in Supabase
                };

                // Optimistic UI Update: Add to local masterData list immediately
                const localGuest = {
                    row: null, // Will be updated via realtime sync once GAS writes to database
                    nama: nama || "Tanpa Nama",
                    whatsapp: cleanPhone,
                    kategori: document.getElementById('reg-kategori').value || "UMUM",
                    kode: kodeUnik,
                    barcode: `https://api.qrserver.com/v1/create-qr-code/?data=${kodeUnik}&size=400x400`,
                    rencanaHadir: 0,
                    statusHadir: "1",
                    jamDatang: timeOnly,
                    souvenir: document.getElementById('reg-souvenir').value === "tidak" ? "tidak" : "ya",
                    pihakPengundang: document.getElementById('reg-host').value || "-",
                    alamat: document.getElementById('reg-alamat').value || "-",
                    realHadir: paxString,
                    statusWA: "-",
                    statusHadiah: gift || "-",
                    tandaKasih: 0,
                    sesi: document.getElementById('reg-sesi').value || "-"
                };
                if (!masterData.some(g => g.kode === localGuest.kode)) {
                    masterData.unshift(localGuest);
                    renderUI();
                }

                // --- STEP 2: CORE REGISTER (Non-Blocking background sync) ---
                fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify(payload)
                }).catch(e => console.error("GAS registration sync failed:", e));

                // --- STEP 3: FAST FEEDBACK ---
                if (blocker) blocker.remove();

                // --- STEP 4: SUCCESS GREETING MODAL ---
                document.getElementById('loading').style.display = 'none';
                if (document.getElementById('global-blocker')) document.getElementById('global-blocker').remove();
                document.body.style.cursor = 'default';

                await showAlert(
                    "REGISTRASI BERHASIL",
                    `Selamat Datang,\n\n${nama.toUpperCase()}\n(${payload.kategori || 'UMUM'})\n\nSilakan Masuk`,
                    "�S�"
                );

                // RESET FIELDS
                document.getElementById('reg-nama').value = "";
                document.getElementById('reg-wa').value = "";
                document.getElementById('reg-alamat').value = "";
                document.getElementById('reg-pax-adult').innerText = "1";
                document.getElementById('reg-pax-child').innerText = "0";
                document.getElementById('reg-tag-angpao').classList.remove('active');
                document.getElementById('reg-tag-kado').classList.remove('active');

                // Reset registration camera preview container and preview image
                document.getElementById('reg-preview-container').style.display = 'none';
                document.getElementById('reg-video').style.display = 'block';
                const photoPreview = document.getElementById('reg-photo-preview');
                if (photoPreview) {
                    photoPreview.style.display = 'none';
                    photoPreview.src = "";
                }

                // --- STEP 5: BACKGROUND TASKS ---
                if (capturedBase64) {
                    fetch(SCRIPT_URL, {
                        method: 'POST',
                        mode: 'no-cors',
                        body: JSON.stringify({
                            action: "uploadSelfie",
                            image: capturedBase64,
                            nama: nama,
                            kode: kodeUnik,
                            ssId: CURRENT_SS_ID
                        })
                    }).catch(e => console.warn("Background selfie upload failed:", e));
                }

                capturedBase64 = null;
                document.getElementById('btn-reg-snap').innerText = "�x� AMBIL SELFIE (OPSIONAL)";
                document.getElementById('btn-reg-snap').style.background = "white";
                document.getElementById('btn-reg-snap').style.color = "var(--gold)";

                switchTab('scan');
                fetchData();
            } catch (e) {
                if (blocker) blocker.remove();
                showAlert("Error", "Gagal koneksi.", "�R");
            } finally {
                loading.style.display = 'none';
            }
        }
        window.initApp();
    
