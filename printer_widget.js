/**
 * printer_widget.js --- SapaTamu Bluetooth Printer Widget v1.0
 * Inject tombol printer + modal ke panel jalur di kiosk, checkin, onsite.
 * Panggil: PrinterWidget.init({ sourceId: 'CHECKIN', jalurSelectorId: 'jalur-selector', jalurKey: 'checkin_jalur_id' })
 */
(function (window) {
  'use strict';

  const SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
  const SB_KEY = "sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u";
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz5zBOJIO-b0MP-oqWhIUehqQaPbQt5pK9cMpTOYlj1pyT19LFD4VwynyJt_EAayBE/exec";

  let printCharacteristic = null;
  let isProcessing = false;
  let pollingTimer = null;
  let currentDeviceName = "";
  let supabaseClient = null;
  let realtimeChannel = null;
  let CURRENT_SS_ID = null;
  let SOURCE_ID = "ALL";
  let JALUR_ID = "ALL";
  let TAB_ID = "REGISTRASI";
  let currentPollingInterval = 1500;

  // ------ CSS ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  const CSS = `
    #pw-btn {
      display:inline-flex; align-items:center; gap:5px;
      background:rgba(255,255,255,0.9); border:1px solid #F0E6DE;
      border-radius:20px; padding:4px 10px; cursor:pointer;
      font-size:9px; font-weight:800; color:#4A3F35;
      text-transform:uppercase; letter-spacing:0.05em;
      box-shadow:0 2px 8px rgba(0,0,0,0.06);
      transition:all 0.2s; user-select:none; backdrop-filter:blur(5px);
    }
    #pw-btn:hover { background:#4A3F35; color:#fff; border-color:#4A3F35; }
    #pw-btn .pw-dot {
      width:6px; height:6px; border-radius:50%; background:#ef4444;
      transition:background 0.3s; flex-shrink:0;
    }
    #pw-btn.connected .pw-dot { background:#10B981; animation:pw-pulse 2s infinite; }
    #pw-btn.connected { border-color:#10B981; color:#065f46; }
    @keyframes pw-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

    #pw-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,0.65);
      backdrop-filter:blur(6px); z-index:999999;
      display:none; align-items:center; justify-content:center;
    }
    #pw-overlay.open { display:flex; }
    #pw-modal {
      background:#111; border:1px solid rgba(255,255,255,0.08);
      border-radius:28px; padding:28px; width:min(420px,92vw);
      font-family:'Plus Jakarta Sans',sans-serif; color:#fff;
      box-shadow:0 40px 80px rgba(0,0,0,0.5);
      animation:pw-pop 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes pw-pop { from{transform:scale(0.88);opacity:0} to{transform:scale(1);opacity:1} }
    #pw-modal h2 { font-size:13px; font-weight:900; letter-spacing:3px; text-transform:uppercase; color:#fff; margin:0 0 4px; }
    #pw-modal .pw-sub { font-size:9px; color:#6b7280; letter-spacing:1px; text-transform:uppercase; margin-bottom:20px; }
    .pw-row { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; flex-wrap:wrap; }
    .pw-stat { display:flex; flex-direction:column; gap:3px; }
    .pw-stat-label { font-size:8px; color:#6b7280; text-transform:uppercase; letter-spacing:1px; }
    .pw-stat-val { font-size:11px; font-weight:800; color:#fff; display:flex; align-items:center; gap:5px; }
    .pw-status-dot { width:6px; height:6px; border-radius:50%; background:#ef4444; flex-shrink:0; }
    .pw-status-dot.on { background:#10B981; animation:pw-pulse 2s infinite; }
    #pw-connect-btn {
      background:#fff; color:#000; border:none; border-radius:50px;
      padding:9px 20px; font-size:10px; font-weight:900;
      text-transform:uppercase; letter-spacing:1px; cursor:pointer;
      transition:all 0.2s; white-space:nowrap;
    }
    #pw-connect-btn:hover { background:#10B981; color:#fff; }
    #pw-connect-btn:disabled { opacity:0.4; cursor:not-allowed; }
    .pw-selectors { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
    .pw-sel-wrap { display:flex; align-items:center; gap:4px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:4px 8px; }
    .pw-sel-lbl { font-size:7px; color:#6b7280; font-weight:800; text-transform:uppercase; white-space:nowrap; }
    .pw-sel-wrap select { background:transparent; border:none; color:#d1d5db; font-size:9px; font-weight:700; text-transform:uppercase; outline:none; cursor:pointer; }
    .pw-console { background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.05); border-radius:14px; padding:12px; height:130px; overflow-y:auto; font-family:monospace; font-size:9.5px; color:#6ee7b7; line-height:1.6; }
    .pw-close { float:right; background:rgba(255,255,255,0.08); border:none; color:#9ca3af; border-radius:50%; width:28px; height:28px; cursor:pointer; font-size:14px; line-height:1; transition:all 0.2s; }
    .pw-close:hover { background:#ef4444; color:#fff; }
    .pw-queue-badge { background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2); color:#10B981; font-size:8px; font-weight:700; padding:2px 8px; border-radius:6px; text-transform:uppercase; }
  `;

  // ------ HTML ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  const HTML = `
    <div id="pw-overlay">
      <div id="pw-modal">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
          <div>
            <h2>Printer Worker</h2>
            <div class="pw-sub">Bluetooth Print Engine v3.5</div>
          </div>
          <button class="pw-close" onclick="PrinterWidget.close()">&times;</button>
        </div>
        <div class="pw-row">
          <div style="display:flex;gap:20px">
            <div class="pw-stat">
              <div class="pw-stat-label">Printer Engine</div>
              <div class="pw-stat-val"><div id="pw-dot" class="pw-status-dot"></div><span id="pw-status-text">Disconnected</span></div>
            </div>
            <div class="pw-stat">
              <div class="pw-stat-label">Jalur Data</div>
              <div class="pw-stat-val"><div id="pw-db-dot" class="pw-status-dot"></div><span id="pw-db-text">Inisialisasi</span></div>
            </div>
          </div>
          <button id="pw-connect-btn" onclick="PrinterWidget.connect()">PAIR PRINTER</button>
        </div>
        <div class="pw-selectors">
          <div class="pw-sel-wrap">
            <span class="pw-sel-lbl">LOKET:</span>
            <select id="pw-tab"><option value="REGISTRASI">REGISTRASI (ALL)</option><option value="LOKET-1">LOKET-1 (SOUVENIR)</option><option value="LOKET-2">LOKET-2 (CHECKIN)</option></select>
          </div>
          <div class="pw-sel-wrap">
            <span class="pw-sel-lbl">STATION:</span>
            <select id="pw-source"><option value="ALL">ALL</option><option value="CHECKIN">CHECKIN</option><option value="ONSITE">ONSITE</option><option value="KIOSK">KIOSK</option></select>
          </div>
          <div class="pw-sel-wrap">
            <span class="pw-sel-lbl">JALUR:</span>
            <select id="pw-jalur"><option value="ALL">ALL</option><option value="1">JALUR 1</option><option value="2">JALUR 2</option><option value="3">JALUR 3</option><option value="4">JALUR 4</option></select>
          </div>
          <div class="pw-sel-wrap">
            <span class="pw-sel-lbl">JEDA:</span>
            <select id="pw-delay"><option value="200">200ms</option><option value="400">400ms</option><option value="600">600ms</option><option value="800">800ms</option><option value="1200" selected>1.2s</option></select>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:8px;color:#6b7280;text-transform:uppercase;font-weight:700;">Print Queue</span>
          <span id="pw-queue-badge" class="pw-queue-badge">READY</span>
        </div>
        <div id="pw-console" class="pw-console">&gt; System ready.</div>
      </div>
    </div>
  `;

  function log(msg, isError = false) {
    const el = document.getElementById('pw-console');
    if (!el) return;
    const t = new Date().toLocaleTimeString('id-ID', { hour12: false });
    el.innerHTML += `<div style="${isError ? 'color:#f87171' : ''}"><span style="opacity:0.35">[${t}]</span> &gt; ${msg}</div>`;
    el.scrollTop = el.scrollHeight;
  }

  function setConnected(deviceName) {
    document.getElementById('pw-dot').className = 'pw-status-dot on';
    document.getElementById('pw-status-text').textContent = deviceName + ' CONNECTED';
    document.getElementById('pw-connect-btn').style.display = 'none';
    const btn = document.getElementById('pw-btn');
    if (btn) { btn.classList.add('connected'); btn.querySelector('.pw-label').textContent = 'PRINTER CONNECTED'; }
  }

  function setDisconnected() {
    document.getElementById('pw-dot').className = 'pw-status-dot';
    document.getElementById('pw-status-text').textContent = 'Disconnected';
    document.getElementById('pw-connect-btn').style.display = '';
    const btn = document.getElementById('pw-btn');
    if (btn) { btn.classList.remove('connected'); btn.querySelector('.pw-label').textContent = 'PRINTER DISCONNECTED'; }
    printCharacteristic = null;
    if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null; }
  }

  function startPolling(ms = 1500) {
    if (pollingTimer && currentPollingInterval === ms) return;
    if (pollingTimer) clearInterval(pollingTimer);
    currentPollingInterval = ms;
    pollingTimer = setInterval(() => { if (!isProcessing && printCharacteristic) fetchQueue(); }, ms);
    log(`Polling aktif (${ms / 1000}s)`);
  }

  function initRealtime() {
    if (!CURRENT_SS_ID || !window.supabase) { startPolling(1500); return; }
    try {
      supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);
      realtimeChannel = supabaseClient.channel('pw_print_queue')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'print_queue', filter: `ssid=eq.${CURRENT_SS_ID}` },
          (payload) => {
            if (payload.new && payload.new.status === 'WAITING' && !isProcessing && printCharacteristic) fetchQueue();
          })
        .subscribe((status) => {
          const dot = document.getElementById('pw-db-dot');
          const txt = document.getElementById('pw-db-text');
          if (status === 'SUBSCRIBED') {
            if (dot) dot.className = 'pw-status-dot on';
            if (txt) txt.textContent = 'Realtime Aktif';
            startPolling(8000);
          } else {
            if (dot) dot.className = 'pw-status-dot';
            if (txt) txt.textContent = 'Polling';
            startPolling(1500);
          }
          log(`Realtime: ${status}`);
        });
    } catch (e) { log('Realtime error: ' + e.message, true); startPolling(1500); }
  }

  async function fetchQueue() {
    if (!CURRENT_SS_ID || !printCharacteristic) return;
    TAB_ID = document.getElementById('pw-tab')?.value || 'REGISTRASI';
    SOURCE_ID = document.getElementById('pw-source')?.value || 'ALL';
    JALUR_ID = document.getElementById('pw-jalur')?.value || 'ALL';
    try {
      const res = await fetch(`${SB_URL}/rest/v1/print_queue?ssid=eq.${CURRENT_SS_ID}&status=eq.WAITING&order=created_at.asc`, {
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
      });
      if (!res.ok) return;
      const raw = await res.json();
      const items = (raw || []).filter(item => {
        const info = (item.info || '').toUpperCase();
        if (TAB_ID === 'LOKET-1' && !info.includes('SOUVENIR')) return false;
        if (TAB_ID === 'LOKET-2' && !info.includes('CHECKIN')) return false;
        if (SOURCE_ID !== 'ALL' || JALUR_ID !== 'ALL') {
          const sid = (item.station_id || 'ALL').toUpperCase();
          if (sid !== 'ALL' && sid !== '') {
            const parts = sid.split('-');
            if (SOURCE_ID !== 'ALL' && parts[0] !== SOURCE_ID) return false;
            if (JALUR_ID !== 'ALL' && (parts[1] || 'ALL') !== JALUR_ID) return false;
          }
        }
        return true;
      });
      const badge = document.getElementById('pw-queue-badge');
      if (badge) badge.textContent = items.length > 0 ? `${items.length} WAITING` : 'READY';
      if (items.length > 0 && !isProcessing) { log(`Menemukan ${items.length} antrean...`); await processItems(items); }
    } catch (e) { log('Fetch error: ' + e.message, true); }
  }

  async function processItems(items) {
    isProcessing = true;
    const delay = parseInt(document.getElementById('pw-delay')?.value) || 1200;
    const printed = [];
    for (const item of items) {
      try { log(`Cetak: ${item.nama || 'GUEST'}`); await printLabel(item); printed.push(item.id); await new Promise(r => setTimeout(r, delay)); }
      catch (e) { log('Gagal: ' + e.message, true); break; }
    }
    if (printed.length > 0) {
      await Promise.all(printed.map(id =>
        fetch(`${SB_URL}/rest/v1/print_queue?id=eq.${id}`, {
          method: 'PATCH',
          headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'DONE' })
        })
      )).catch(() => { });
      fetch(SCRIPT_URL, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'markPrinted', printIds: printed, ssId: CURRENT_SS_ID, station: TAB_ID })
      });
    }
    isProcessing = false;
  }

  async function printLabel(data) {
    const enc = new TextEncoder();
    const nama = (data.nama || 'GUEST').toUpperCase();
    const kode = data.kode || '-';
    const kategori = (data.kategori || 'REGULER').toUpperCase();
    const alamat = (data.alamat || '-').toUpperCase();
    const pihak = (data.pihak || '-').toUpperCase();
    const sesi = (data.sesi || '-').toUpperCase();
    const pax = data.pax || '1';
    let labelTitle = 'CHECK-IN';
    if ((data.info || '').includes('SOUVENIR')) { labelTitle = (data.info.split(':')[1] || 'SOUVENIR').trim(); }

    function wrap(text, max) {
      if (!text || text.length <= max) return [text || ''];
      const words = text.split(' '); let lines = [], cur = words[0] || '';
      for (let i = 1; i < words.length; i++) { if (cur.length + 1 + words[i].length <= max) { cur += ' ' + words[i]; } else { lines.push(cur); cur = words[i]; } }
      lines.push(cur); return lines;
    }

    let tspl = `SIZE 75 mm, 45 mm\r\nGAP 3 mm, 0\r\nREFERENCE 0,0\r\nDIRECTION 1,0\r\nCLS\r\n`;
    tspl += `SET BOLD 3\r\nTEXT 50,25,"3",0,1,1,"[ ${labelTitle} ]"\r\nSET BOLD 0\r\n`;
    tspl += `SET BOLD 5\r\n`;
    let y = 75;
    const wrN = wrap(nama, 18);
    for (let i = 0; i < Math.min(wrN.length, 2); i++) { tspl += `TEXT 50,${y},"4",0,1,1,"${wrN[i]}"\r\n`; y += 40; }
    tspl += `SET BOLD 0\r\n`;
    if (y < 140) y = 140; else y += 5;

    const wrapMeta = (prefix, val) => { let ls = wrap(val, 26 - prefix.length); let r = [{ x: 50, t: `${prefix}${ls[0] || ''}` }]; for (let i = 1; i < Math.min(ls.length, 2); i++) { r.push({ x: 50, t: `${' '.repeat(prefix.length)}${ls[i]}` }); } return r; };
    const metaList = [
      ...wrapMeta('PAX     : ', pax),
      ...wrapMeta('INV BY  : ', pihak),
      ...wrapMeta('SESI    : ', sesi),
      ...wrapMeta('ALAMAT  : ', alamat)
    ];
    for (const f of metaList) {
      tspl += `TEXT ${f.x},${y},"2",0,1,1,"${f.t}"\r\n`; y += 35;
    }
    tspl += `QRCODE 380,60,H,9,A,0,"${kode}"\r\n`;
    tspl += `BOX 380,250,560,290,3\r\n`;
    tspl += `TEXT 395,260,"2",0,1,1,"${kategori.substring(0, 12)}"\r\n`;
    tspl += `TEXT 380,315,"2",0,1,1,"ID: ${kode}"\r\n`;
    tspl += `PRINT 1,1\r\n`;

    const arr = enc.encode(tspl);
    const chunk = 128;
    for (let i = 0; i < arr.length; i += chunk) {
      const c = arr.slice(i, i + chunk);
      if (typeof printCharacteristic.writeValueWithoutResponse === 'function') await printCharacteristic.writeValueWithoutResponse(c);
      else await printCharacteristic.writeValue(c);
      await new Promise(r => setTimeout(r, 10));
    }
  }

  // ------ PUBLIC API ------------------------------------------------------------------------------------------------------------------------------------------------------------------
  window.PrinterWidget = {
    init({ sourceId = 'CHECKIN', jalurSelectorId = 'jalur-selector', jalurKey = 'jalur_id', injectAfterEl = null } = {}) {
      // Inject CSS
      if (!document.getElementById('pw-style')) {
        const s = document.createElement('style'); s.id = 'pw-style'; s.textContent = CSS; document.head.appendChild(s);
      }
      // Inject HTML (modal overlay + button)
      if (!document.getElementById('pw-overlay')) {
        document.body.insertAdjacentHTML('beforeend', HTML);
      }

      // Inject button next to jalur selector
      if (!document.getElementById('pw-btn')) {
        const btn = document.createElement('button');
        btn.id = 'pw-btn';
        btn.innerHTML = `<div class="pw-dot"></div><span class="pw-label">PRINTER DISCONNECTED</span>`;
        btn.title = 'Buka Pengaturan Printer Bluetooth';
        btn.onclick = () => PrinterWidget.open();

        if (injectAfterEl) {
          injectAfterEl.insertAdjacentElement('afterend', btn);
        } else {
          const jalurEl = document.getElementById(jalurSelectorId);
          if (jalurEl) { jalurEl.closest('div').appendChild(btn); }
          else { document.body.appendChild(btn); }
        }
      }

      // Set defaults
      SOURCE_ID = sourceId;
      const savedJalur = localStorage.getItem(jalurKey);
      if (savedJalur) { JALUR_ID = savedJalur; }

      // Wait for ssId
      const tryInit = () => {
        const sess = JSON.parse(sessionStorage.getItem('sapatamu_session') || localStorage.getItem('sapatamu_db') || '{}');
        CURRENT_SS_ID = window.CURRENT_SS_ID || sess.ssId || null;
        if (!CURRENT_SS_ID) { setTimeout(tryInit, 300); return; }

        // Sync jalur dropdown with parent page
        const jalurSel = document.getElementById(jalurSelectorId);
        if (jalurSel) {
          jalurSel.addEventListener('change', e => {
            JALUR_ID = e.target.value;
            const pwJ = document.getElementById('pw-jalur');
            if (pwJ) pwJ.value = JALUR_ID;
          });
        }
        // Sync pw-jalur    parent jalur selector
        const pwJ = document.getElementById('pw-jalur');
        if (pwJ) {
          if (savedJalur) pwJ.value = savedJalur;
          pwJ.addEventListener('change', e => {
            JALUR_ID = e.target.value;
            localStorage.setItem(jalurKey, JALUR_ID);
            const ps = document.getElementById(jalurSelectorId);
            if (ps) { ps.value = JALUR_ID; ps.dispatchEvent(new Event('change')); }
          });
        }

        // Set source dropdown
        const pwSrc = document.getElementById('pw-source');
        if (pwSrc) pwSrc.value = sourceId;

        // Restore delay
        const savedDelay = localStorage.getItem('worker_print_delay');
        if (savedDelay) { const d = document.getElementById('pw-delay'); if (d) d.value = savedDelay; }
        document.getElementById('pw-delay')?.addEventListener('change', e => localStorage.setItem('worker_print_delay', e.target.value));

        log(`Worker aktif | ID: ${CURRENT_SS_ID} | Station: ${sourceId}`);
        initRealtime();
      };
      tryInit();
    },

    open() { document.getElementById('pw-overlay')?.classList.add('open'); },
    close() { document.getElementById('pw-overlay')?.classList.remove('open'); },

    async connect() {
      try {
        log('Mencari Bluetooth...');
        const device = await navigator.bluetooth.requestDevice({
          filters: [
            { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
            { namePrefix: 'TP' }, { namePrefix: 'BT' }, { namePrefix: 'BY' }
          ],
          optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });
        currentDeviceName = (device.name || '').toUpperCase();
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        printCharacteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
        device.addEventListener('gattserverdisconnected', () => { log('Printer terputus!', true); setDisconnected(); });
        setConnected(device.name);
        log(`Terhubung ke: ${device.name}`);
        startPolling(currentPollingInterval);
        fetchQueue();
      } catch (e) { log('Error: ' + e.message, true); }
    }
  };

  // Close on overlay click
  document.addEventListener('click', e => {
    if (e.target?.id === 'pw-overlay') PrinterWidget.close();
  });

})(window);
