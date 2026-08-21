# Perf Baseline — SapaTamu Guestbook v3.0 (Phase 0)

> T0.1 instrumentasi + T0.2 audit. Tidak ubah route/backend. Angka diukur setelah T0.1 `__sapaPerf` + Network throttling 4G. Isi tabel jika sudah running di staging.

## 1) RLS Audit — `tamu` (T0.2)

**Cara cek (baca saja, tidak ubah):**
```bash
# Cek anon tanpa filter ssid — harus 401/empty jika RLS benar
curl -s "https://<SB_URL>/rest/v1/tamu?select=row" -H "apikey: <SB_KEY>" -H "Authorization: Bearer <SB_KEY>" | head -c 200
# Cek dengan ssid valid — harus 200
curl -s "https://<SB_URL>/rest/v1/tamu?ssid=eq.TEST123&select=row" -H "apikey: <SB_KEY>" -H "Authorization: Bearer <SB_KEY>" | head -c 200
```
**Hasil staging (isi manual):**
| Query | Status | Catatan |
|-------|--------|---------|
| `GET /tamu?select=row` tanpa `ssid` | _isi_ | Harapan: 0 rows / 401 jika RLS `ssid` required |
| `GET /tamu?ssid=eq.ORANG_LAIN` | _isi_ | Harapan: 0 rows (tidak bocor) |
| `GET /tamu?ssid=eq.SSID_VALID` | _isi_ | Harapan: rows milik SSID tersebut saja |

**Rekomendasi jika longgar:** Buat RFC terpisah untuk tighten RLS `tamu` (`create policy select on tamu for anon using (ssid = current_setting('request.jwt.claims')::json->>'ssid' OR ...)`). **Tidak fix di v3.0 Phase 0** — hanya catat.

**Ditemukan 2026-05-13 (staging `10EDJZTur2oyey...`, 233 rows real):**
- `[perf v3.0] kiosk:fetchData: 176ms 233 rows, 92KB` (via `kiosk.html:551` `__sapaPerf`, Network Fast 4G? WiFi). Rata-rata ~395 byte/row. Ekstrapolasi: 500 rows ~193KB, 1000 ~386KB, 2000 ~772KB — validasi estimasi sebelumnya (~280 byte/row agak low, real 395).
- RLS belum cek — perlu `curl` di atas.

## 2) Payload `tamu` — `fetchData` (T0.1 marks)

Diukur via `__sapaPerf` + DevTools Network (Fast 4G throttling). `select` saat ini `kiosk.html:552` `ssid=eq.X&order=row.desc` tanpa `select` spesifik → kembalikan semua kolom.

| Jumlah tamu | JSON size (KB) | `kiosk:fetchData` | `checkin:fetchData` | `onsite:fetchData` | `analytics:fetchData` |
|-------------|----------------|-------------------|---------------------|--------------------|------------------------|
| 233 (real) | 92KB | **176ms** (staging) | _ms_ | _ms_ | _ms_ |
| 500 | ~193KB* | _ms_ | _ms_ | _ms_ | _ms_ |
| 1000 | ~386KB* | _ms_ | _ms_ | _ms_ | _ms_ |
| 2000 | ~772KB* | _ms_ | _ms_ | _ms_ | _ms_ |

\* Direvisi 2026-05-13 dari real 233 rows: 92KB /233 = 395 byte/row. Estimasi sebelumnya 280 byte/row low. Real ukur via `Math.round(JSON.stringify(masterData).length/1024)` yang sudah log di `kiosk:fetchData`/`checkin:fetchData`/`onsite:fetchData`. Ekstrapolasi linear.

**Cara isi:** Buka `kiosk.html` di staging, buka Console, filter `[perf v3.0]`, catat `kiosk:fetchData: 842ms 1243 rows, 312KB`. Atau `localStorage.sapatamu_perf`.

## 3) Render — `renderUI` / `renderKioskSearch`

| Halaman | Rows | `renderUI` / `renderKioskSearch` | Catatan |
|---------|------|-----------------------------------|---------|
| kiosk `renderKioskSearch` | 1000 filtered 12 | _ms_ | `kiosk.html:836` rebuild `innerHTML` tanpa debounce |
| checkin `renderUI` | 1000 | _ms_ | `checkin.html:997` grid 280px |
| onsite `renderUI` | 1000 | _ms_ | `onsite.html:1871` tab SCAN |
| analytics `renderFlow` | _ flow items | _ms_ | `analytics.html:renderFlow` grouping |
| welcome `initSlideshow` | _ media | _ms_ | `welcome.html:initSlideshow` |

## 4) Scanner — `initScanner`

| Halaman | `initScanner` | Mode |
|---------|---------------|------|
| kiosk | _ms_ | `user`/`environment` `kiosk.html:604` |
| checkin | _ms_ | `checkin.html:943` fps25 |
| onsite | _ms_ | `onsite.html:1818` fps25 |

## 5) Bundle — Tailwind

| Halaman | `cdn.tailwindcss.com` (sekarang) | `assets/tailwind.css` build (target Phase 1) |
|---------|----------------------------------|----------------------------------------------|
| kiosk/checkin/onsite/analytics/welcome | ~320KB runtime + 40KB CSS | <50KB gz, 0 runtime |

**Cara ukur:** DevTools Network → `cdn.tailwindcss.com` size + `Performance` → `Recalculate Style`.

## Next — Phase 1 akan pakai baseline ini untuk klaim "sebelum vs sesudah" (T1.2 debounce, T2.5 chunked+Details windowed).

> Guardrail: Semua angka di dokumen ini hanya observasi. Tidak ada perubahan route/backend — selfie tetap Drive, endpoint GAS tetap.
