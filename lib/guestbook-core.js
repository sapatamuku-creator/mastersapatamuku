// [v3.0 T2.1] guestbook-core — shared scanner/fetch/selfie, no route/backend change
// Hanya bungkus logic yang sudah ada di kiosk/checkin/onsite. Endpoint tetap SB_URL/rest/v1/tamu dan SCRIPT_URL.

import { getJalur, setJalur, getCamEnabled, setCamEnabled } from './jalur-store.js';

// --- Fetch tamu (chunked-ready, T2.5: support limit/offset for infinite) ---
export async function fetchTamu(ssId, opts = {}) {
  const startMark = 'core:fetch:' + (opts.mark || 'start');
  try { performance.mark(startMark); } catch (e) { }
  if (!ssId) throw new Error('ssId required');
  const limit = opts.limit || 1000;
  const offset = opts.offset || 0;
  const url = `${SB_URL}/rest/v1/tamu?ssid=eq.${ssId}&order=row.desc&limit=${limit}&offset=${offset}`;
  const res = await fetch(url, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
  if (!res.ok) throw new Error('fetchTamu ' + res.status);
  const sbData = await res.json();
  const mapped = (sbData || []).map(item => ({
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
  try {
    performance.measure('core:fetchTamu', startMark);
    const e = performance.getEntriesByName('core:fetchTamu').pop();
    const ms = e ? e.duration : 0;
    performance.clearMarks(startMark); performance.clearMeasures('core:fetchTamu');
    const kb = Math.round(JSON.stringify(mapped).length / 1024);
    try {
      const buf = JSON.parse(localStorage.getItem('sapatamu_perf') || '[]');
      buf.push({ t: Date.now(), name: 'core:fetchTamu', ms: Math.round(ms), extra: mapped.length + ' rows, ' + kb + 'KB' });
      if (buf.length > 20) buf.shift();
      localStorage.setItem('sapatamu_perf', JSON.stringify(buf));
    } catch (e2) { }
    console.log('[perf v3.0] core:fetchTamu: ' + Math.round(ms) + 'ms', mapped.length + ' rows, ' + kb + 'KB');
  } catch (e) { }
  return mapped;
}

// --- Realtime tamu — no route change, reuse channel tamu_changes_channel ---
export function createRealtimeTamu(ssId, handlers = {}, opts = {}) {
  if (!ssId || !window.supabase) return null;
  let supabaseClient = null;
  let channel = null;
  try {
    supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);
    console.log('[core] Realtime tamu connect', ssId);
    channel = supabaseClient.channel('tamu_changes_channel_kiosk_' + ssId.slice(0, 6))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tamu', filter: `ssid=eq.${ssId}` }, (payload) => {
        try {
          const t = payload.eventType;
          if (t === 'INSERT' && handlers.onInsert) handlers.onInsert(payload.new);
          else if (t === 'UPDATE' && handlers.onUpdate) handlers.onUpdate(payload.new, payload.old);
          else if (t === 'DELETE' && handlers.onDelete) handlers.onDelete(payload.old);
          else if (handlers.onEvent) handlers.onEvent(payload);
        } catch (e) { console.warn('[core] realtime handler error', e); }
      })
      .subscribe((status) => {
        console.log('[core] Realtime tamu status', status);
        if (handlers.onStatus) handlers.onStatus(status);
        // auto crank visibility: pause when hidden to save battery
        if (status === 'SUBSCRIBED' && opts.pauseWhenHidden) {
          document.addEventListener('visibilitychange', () => {
            if (document.hidden) { try { channel.unsubscribe(); } catch (e) { } }
            else { try { channel.subscribe(); } catch (e) { } }
          });
        }
      });
  } catch (e) { console.error('[core] realtime init failed', e); return null; }
  return {
    channel,
    unsubscribe: () => { try { channel.unsubscribe(); } catch (e) { } },
    getClient: () => supabaseClient
  };
}

// --- Scanner (Html5Qrcode wrapper) ---
export function createScanner({ readerId = 'reader', onScan, fps = 15, qrbox, facingMode = 'environment' }) {
  let html5QrCode = null;
  let active = false;
  let currentMode = facingMode;

  function isActive() { return active; }

  async function start(mode) {
    const m = mode || currentMode || (localStorage.getItem('force_frontcam_on') === '1' ? 'user' : 'environment');
    currentMode = m;
    if (!html5QrCode) html5QrCode = new Html5Qrcode(readerId);
    if (active) {
      try { await html5QrCode.stop(); } catch (e) { }
      try { html5QrCode.clear(); } catch (e) { }
      active = false;
    }
    const cfg = qrbox ? { fps, qrbox, aspectRatio: 1.0 } : { fps };
    try {
      const perfMark = 'core:scanner:start';
      try { performance.mark(perfMark); } catch (e) { }
      await html5QrCode.start({ facingMode: m }, cfg, onScan);
      active = true;
      document.getElementById(readerId)?.classList.toggle('mirror-mode', m === 'user');
      try {
        performance.measure('core:scanner', perfMark);
        const e = performance.getEntriesByName('core:scanner').pop();
        console.log('[perf v3.0] core:scanner: ' + Math.round(e ? e.duration : 0) + 'ms', m);
        performance.clearMarks(perfMark); performance.clearMeasures('core:scanner');
      } catch (e) { }
      return true;
    } catch (e) {
      // fallback opposite camera
      const fallback = m === 'user' ? 'environment' : 'user';
      try {
        await html5QrCode.start({ facingMode: fallback }, cfg, onScan);
        active = true;
        currentMode = fallback;
        document.getElementById(readerId)?.classList.toggle('mirror-mode', fallback === 'user');
        return true;
      } catch (e2) {
        console.error('[core] scanner start failed', e2);
        active = false;
        return false;
      }
    }
  }

  async function stop() {
    if (html5QrCode && active) {
      try { await html5QrCode.stop(); } catch (e) { }
      try { html5QrCode.clear(); } catch (e) { }
      active = false;
    }
    if (html5QrCode && !active) {
      try { html5QrCode.clear(); } catch (e) { }
    }
  }

  async function toggleFrontcam(enabled) {
    try { localStorage.setItem('force_frontcam_on', enabled ? '1' : '0'); } catch (e) { }
    document.getElementById(readerId)?.classList.toggle('mirror-mode', !!enabled);
    if (active) {
      await stop();
      await start(enabled ? 'user' : 'environment');
    }
  }

  return { start, stop, isActive, toggleFrontcam, getMode: () => currentMode };
}

// --- Selfie (simple wrapper, T2.1 only basic) ---
export function createSelfie({ videoId = 'camera-preview', canvasId = 'capture-canvas' }) {
  let stream = null;
  async function start() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 600 }, height: { ideal: 600 } }, audio: false });
      const v = document.getElementById(videoId);
      if (v) { v.srcObject = stream; v.onloadedmetadata = () => v.play(); }
      return stream;
    } catch (e) { console.warn('[core] selfie start failed', e); return null; }
  }
  function capture() {
    const v = document.getElementById(videoId);
    const c = document.getElementById(canvasId);
    if (!v || !c) return null;
    const ctx = c.getContext('2d');
    c.width = v.videoWidth || 600; c.height = v.videoHeight || 600;
    v.pause();
    ctx.save(); ctx.translate(c.width, 0); ctx.scale(-1, 1); ctx.drawImage(v, 0, 0, c.width, c.height); ctx.restore();
    return c.toDataURL('image/jpeg', 0.7);
  }
  function stop() {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    const v = document.getElementById(videoId); if (v) v.srcObject = null;
  }
  return { start, capture, stop, getStream: () => stream };
}

export { getJalur, setJalur, getCamEnabled, setCamEnabled };
