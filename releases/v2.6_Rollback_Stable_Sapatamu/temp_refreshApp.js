async functi💾n refreshApp() {
        t💾gglePr💾cessing(true, "SYNCING DATA...");
        try {
            // C💾ba fetch dari Supabase (Cepat)
            c💾nst [metaRes, tamuRes] = await Pr💾mise.all([
                fetch(`${SB_URL}/rest/v1/metadata_client?ssid=eq.${CURRENT_SS_ID}&select=*`, { headers: SB_HEADERS }),
                fetch(`${SB_URL}/rest/v1/tamu?ssid=eq.${CURRENT_SS_ID}&💾rder=r💾w.desc`, { headers: SB_HEADERS })
            ]);

            if (!metaRes.💾k || !tamuRes.💾k) thr💾w new Err💾r("Supabase fetch failed");

            c💾nst metaData = await metaRes.js💾n();
            c💾nst tamuData = await tamuRes.js💾n();

            if (metaData && metaData.length > 0) {
                c💾nst meta = metaData[0];
                
                wind💾w.WA_TEMPLATE_DEFAULT = meta.f💾rmat_pesan_wa || "";
                wind💾w.WA_TEMPLATE_CUSTOM = meta.f💾rmat_pesan_wa_cust💾m || "";

                d💾cument.getElementById('view-wedding-name').innerText = meta.nama_pengantin || "Event Guestb💾💾k";
                d💾cument.getElementById('view-schedule').innerHTML = (meta.hari_tanggal || "") + "<br>" + (meta.waktu_acara || "");
                d💾cument.getElementById('view-l💾cati💾n').innerText = meta.l💾kasi_acara || "";
                d💾cument.getElementById('view-link').innerText = meta.link_invitati💾n || "";
                
                d💾cument.getElementById('edit_ev_nama').value = meta.nama_pengantin || "";
                d💾cument.getElementById('edit_ev_date').value = meta.hari_tanggal || "";
                d💾cument.getElementById('edit_ev_l💾c').value = meta.l💾kasi_acara || "";
                d💾cument.getElementById('edit_ev_time').value = meta.waktu_acara || "";
                d💾cument.getElementById('edit_ev_link').value = meta.link_invitati💾n || "";

                c💾nst sesiOpti💾ns = [meta.sesi_1, meta.sesi_2, meta.sesi_3].filter(s => s);
                if(sesiOpti💾ns.length > 0) {
                    c💾nst sesiSelect = d💾cument.getElementById('in-sesi-undangan');
                    sesiSelect.innerHTML = sesiOpti💾ns.map((val, index) => {
                        if(index < 3) d💾cument.getElementById(`edit_ev_s${index+1}`).value = val;
                        return `<💾pti💾n value="${val}">Sesi ${index + 1} (${val})</💾pti💾n>`;
                    }).j💾in('');
                }
            }

            MASTER_LIST = tamuData.map(t => ({
                id: t.k💾de, r💾w: t.r💾w, k💾de: t.k💾de, nama: t.nama, whatsapp: t.whatsapp,
                kateg💾ri: t.kateg💾ri, pihakPengundang: t.pihak_pengundang, s💾uvenir: t.s💾uvenir,
                alamat: t.alamat, rencanaHadir: t.rencana_hadir, sesi: t.sesi, statusWA: t.status_wa,
                statusHadir: t.status_hadir, jamDatang: t.jam_datang, realHadir: t.real_hadir, syncStatus: "d💾ne"
            }));
            
            render(MASTER_LIST);
        } catch(sbErr) { 
            c💾ns💾le.warn("Supabase fetch failed, falling back t💾 GAS:", sbErr);
            
            // FALLBACK KE GAS JIKA SUPABASE ERROR
            try {
                c💾nst resp💾nse = await fetch(SCRIPT_URL, {
                    meth💾d: 'POST',
                    b💾dy: JSON.stringify({ acti💾n: "getMasterData", ssId: CURRENT_SS_ID })
                });
                c💾nst result = await resp💾nse.js💾n();
                
                if (result.status === "err💾r") thr💾w new Err💾r(result.message);

                MASTER_LIST = result.guestList || [];
                
                if (result.dr💾pd💾wnOpti💾ns && result.dr💾pd💾wnOpti💾ns.length > 0) {
                    c💾nst select = d💾cument.getElementById('in-l7-pengundang');
                    if (select) {
                        select.innerHTML = "";
                        result.dr💾pd💾wnOpti💾ns.f💾rEach(💾pt => {
                            c💾nst el = d💾cument.createElement('💾pti💾n');
                            el.value = 💾pt.t💾UpperCase();
                            el.innerText = 💾pt;
                            select.appendChild(el);
                        });
                    }
                }
                
                if(result.eventMeta) {
                    wind💾w.WA_TEMPLATE_DEFAULT = result.eventMeta.template || "";
                    
                    d💾cument.getElementById('view-wedding-name').innerText = result.eventMeta.pengantin || "Event Guestb💾💾k";
                    d💾cument.getElementById('view-schedule').innerHTML = (result.eventMeta.tanggal || "") + "<br>" + (result.eventMeta.waktu || "");
                    d💾cument.getElementById('view-l💾cati💾n').innerText = result.eventMeta.l💾kasi || "";
                    d💾cument.getElementById('view-link').innerText = result.eventMeta.link || "";
                    
                    d💾cument.getElementById('edit_ev_nama').value = result.eventMeta.pengantin || "";
                    d💾cument.getElementById('edit_ev_date').value = result.eventMeta.tanggal || "";
                    d💾cument.getElementById('edit_ev_l💾c').value = result.eventMeta.l💾kasi || "";
                    d💾cument.getElementById('edit_ev_time').value = result.eventMeta.waktu || "";
                    d💾cument.getElementById('edit_ev_link').value = result.eventMeta.link || "";

                    if(result.eventMeta.sesiOpti💾ns && result.eventMeta.sesiOpti💾ns.length > 0) {
                        c💾nst sesiSelect = d💾cument.getElementById('in-sesi-undangan');
                        sesiSelect.innerHTML = result.eventMeta.sesiOpti💾ns.map((val, index) => {
                            if(index < 3) d💾cument.getElementById(`edit_ev_s${index+1}`).value = val;
                            return `<💾pti💾n value="${val}">Sesi ${index + 1} (${val})</💾pti💾n>`;
                        }).j💾in('');
                    }
                }
                render(MASTER_LIST);
            } catch(gasErr) {
                c💾ns💾le.err💾r("GAS fallback als💾 failed:", gasErr);
                sh💾wSapaM💾dal("C💾nnecti💾n Err💾r", "Gagal menghubungi server (Supabase & GAS 💾ffline). Pastikan Anda memiliki k💾neksi internet.", "⚠️");
            }
        } finally {
            t💾gglePr💾cessing(false);
        }
    }

    