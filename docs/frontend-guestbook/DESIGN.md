# DESIGN — Formulir Tamu Reference Build (`formulir_tamu.ref.html`)

> **Status:** REFERENCE ONLY — bukan pengganti `formulir_tamu.html` produksi.
> **Arah:** desain **fresh & berbeda**, BUKAN kloning halaman produksi. Fitur mengacu kebijakan paritas bertahap (`PLAN.md`), visual & pola interaksi adalah interpretasi baru.
> Design direction diverifikasi via skill `ui-ux-pro-max` (`--design-system`, 2026-08-23): gaya **Soft UI Evolution**, palet indigo–emerald–lavender, tipografi Cormorant Infant (display) + sans (body).

---

## 1. Konsep: "Indigo Atelier" — Workspace, Bukan Formulir

Produksi memakai metafora *formulir + kartu glassmorphism hangat*. Versi referensi ini memakai metafora **workspace operasional modern**:

| Aspek | Produksi (acuan pembanding) | Referensi (desain baru) |
|---|---|---|
| Warna | Warm Sand `#FFF9F5`, Gold, Rose | Indigo `#6366F1`, Emerald `#059669`, Lavender `#F5F3FF` |
| Permukaan | Glassmorphism, blur, glow | Soft UI flat-lembut: shadow lembut berlapis, tanpa blur |
| Tipografi | Sans tebal seragam | **Cormorant Infant serif** untuk heading/angka besar + sans body |
| Tambah tamu | Panel formulir selalu tampak (sticky) | **Inline Composer** yang expand di atas daftar (progressive disclosure) |
| Edit tamu | Modal tengah layar | **Inspector Drawer** panel kanan (desktop) / sheet penuh (mobile) |
| Filter | Dropdown multi-checkbox | **Chip bar** horizontal scroll + popover detail |
| View utama | Kartu grid utama | **Ledger rows** (tabel rapat) utama ↔ Cards sekunder |
| Navigasi konteks | Navbar + tombol tersebar | **Command bar** tunggal: brand · search · quick-add |

## 2. Design Tokens

```css
--color-primary:        #6366F1;   /* indigo */
--color-primary-soft:   #818CF8;
--color-accent:         #059669;   /* emerald — sukses/CTA positif */
--color-destructive:    #DC2626;
--color-background:     #F5F3FF;   /* lavender wash */
--color-card:           #FFFFFF;
--color-foreground:     #312E81;   /* ink indigo */
--color-muted-fg:       #475569;
--color-border:         #E0E7FF;
--shadow-card:          0 1px 2px rgba(49,46,129,.06), 0 8px 24px rgba(99,102,241,.10);
--radius-card:          16px;  --radius-input: 12px;
/* Display: 'Cormorant Infant', Georgia, serif  (Google Fonts, fallback aman offline) */
```

Kontras teks wajib ≥4.5:1; focus ring indigo terlihat; semua ikon SVG inline (Lucide-style stroke) — **tanpa emoji sebagai ikon** (emoji gift 🧧🎁 dipertahankan hanya sebagai *data* status hadiah, bukan ikon UI).

## 3. Layout per Breakpoint

### Desktop ≥1024px — Split Workspace
```
┌───────────────────────────────────────────────────────────┐
│ COMMAND BAR: ◆ brand · [search…………] · [+ Tamu]           │
├───────────────────────────────────────────────────────────┤
│ [stat][stat][stat][stat]   ← strip 4 kartu statistik      │
├───────────────────────────────────────────────────────────┤
│ chip-bar: (Semua)(VIP)(Keluarga)(PP)(PW)(KIPP)(KIPW)…     │
├──────────────────────────────┬────────────────────────────┤
│ LEDGER LIST (rows rapat)     │ INSPECTOR PANEL (360px)    │
│ ─ Nama │ Pihak │ Sesi │ Pax  │ foto inisial + field edit │
│ ─ …                          │ tombol simpan/hapus        │
│ toggle: Ledger ⇄ Cards       │ kosong = empty-state elegan│
└──────────────────────────────┴────────────────────────────┘
```

### Tablet 768–1023px
- Inspector menjadi overlay drawer kanan (slide-in), list tetap lebar penuh; stat strip 2×2; chip bar scrollable.

### Mobile <768px
- Command bar ringkas (brand + ikon search + FAB "+").
- Stat strip carousel horizontal snap.
- Ledger row = kartu kompak satu kolom; inspector = **full-screen sheet** slide-up dengan drag-handle, exit slide-down.
- Inline composer = bottom sheet.
- Singkatan pihak aktif: PW / PP / KIPP / KAPP / KIPW (pola `.pihak-full/.pihak-short`).

## 4. Data Layer (Mock Adapter)

```js
MockDB.list()               → Promise<Guest[]>   // latensi simulasi 120–260ms
MockDB.insert(guest)        → Promise<Guest>
MockDB.update(kode, patch)  → Promise<Guest>
MockDB.remove(kodes[])      → Promise<number>
MockDB.resetSeed()          → Promise<void>
```

Skema `Guest`: `kode, nama, whatsapp(628…), kategori, alamat, pihakPengundang, sesi, rencanaHadir, souvenir, createdAt`.
Persist `localStorage["spt_ref_mock_db"]`; seed 14 tamu; tombol reset seed di footer command bar menu.

## 5. Standar Interaksi & Motion

- Skeleton shimmer saat load pertama (adaptasi palet indigo, standar `instant-skeleton-loading`).
- Live progress overlay untuk operasi batch (`X dari Y · Z%`) — pola v3.1, skin indigo.
- Transisi 150–300ms ease; `prefers-reduced-motion` mematikan shimmer/slide.
- Search debounce rAF+250ms; listener passive; `touch-action: manipulation`; CSS containment pada rows/kartu (60 FPS low-mid end).
- Keyboard: Esc menutup drawer/composer, Enter submit composer, tab-trap di drawer.

## 6. Komponen Inventaris (mapping fase)

| Komponen | Fase |
|---|---|
| Command bar + stat strip + chip bar filter | F1 |
| Ledger/Cards list + skeleton shimmer | F1 |
| Inline Composer (tambah) | F1 |
| Inspector drawer (lihat/edit/hapus) | F1 |
| Live progress overlay + konfirmasi destruktif | F1 |
| Import wizard / Duplikat manager / Sync Sheet UI | F2/F3/F4 (shell placeholder di F1) |
| Hero slideshow dinamis, tour, RSVP tools | F5/F6 |

## 6b. Checklist Pra-Rilis (dari ui-ux-pro-max)

- [ ] Tanpa emoji sebagai ikon UI (SVG inline)
- [ ] `cursor:pointer` semua elemen klik; hover transition 150–300ms
- [ ] Kontras light mode ≥4.5:1; focus states visible
- [ ] `prefers-reduced-motion` dihormati
- [ ] Responsif teruji 375 / 768 / 1024 / 1440px
