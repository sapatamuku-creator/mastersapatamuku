# 03 — Modal / Drawer / Bottom-Sheet / Form System

> Sumber: `checkin.html` st-modal, `dashboard.html` SapaModal, `auth_guard.js` SapaGuard, `vendor-dashboard.html` crop, `formulir_tamu.html` bottom-sheet, `animations.css` easings

## 3.1 Modal — 5 varian (pilih 1, jangan campur tanpa alasan)

| Varian | Kapan | Overlay | Content | Open/Close |
|--------|-------|---------|---------|------------|
| **Glass Modal** (st-modal) | checkin/onsite/analytics confirm, SapaNotify | `fixed inset 0 bg rgba(255,255,255,0.4) backdrop-blur(15px) z-2147483647` | `max 320–400px radius35 pad30-40 bg #fff border shadow-lg` | `display:flex` toggle + anim `modalIn scale0.95→1 0.25 var(--ease-modal)` |
| **SapaModal Promise** | dashboard `showSapaModal(title,msg,icon)` | sama | `400px radius35` — Promise resolve on Mengerti | `new Promise(resolve=> btn.onclick=resolve)` |
| **SapaGuard Overlay** | RBAC field/sensitive guard | `fixed inset 0 rgba(74,63,53,0.5) backdrop-blur(6px) z-999999` box `380px radius35 pop` | admin modal `rgba(0,0,0,0.7) blur8 340px radius30` | dismiss → `opacity0 pointer none` + `dismissed` class |
| **Vendor Crop/Lightroom** | vendor image crop | `fixed inset 0 z-1000 bg rgba(74,63,53,0.4) blur4 fadeIn 0.25` | `640px canvas340 bg #12100e` zoom 1–5 step0.02 angle -45→45 | `modal-overlay.active{display:flex}` |
| **Generic Center** | katalog notify | sama glass | `340px radius30` | sama |

**CSS canon modal (copy):**

```css
.st-modal-overlay{
  position:fixed; inset:0; background:rgba(74,63,53,0.4);
  backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
  display:none; align-items:center; justify-content:center; z-index:99999; padding:20px;
}
.st-modal-overlay.is-open{ display:flex; }
.st-modal-card{
  background:#fff; border:1px solid var(--border); border-radius:35px;
  padding:30px; width:100%; max-width:400px; box-shadow:var(--shadow-lg);
  animation: modalIn 0.25s var(--ease-modal);
}
@keyframes modalIn{ from{opacity:0; transform:scale(0.95) translateY(8px)} to{opacity:1; transform:scale(1) translateY(0)} }
@starting-style{ .st-modal-overlay{opacity:0} .st-modal-card{transform:scale(0.95)}}
```

**Buttons di modal:**

```css
.st-btn{ padding:14px 25px; border-radius:18px; font-size:11px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; cursor:pointer; transition:all var(--duration-normal) var(--ease-out); }
.st-btn--primary{ background:var(--text-main); color:#fff; border:1px solid var(--text-main); box-shadow:var(--shadow-sm); }
.st-btn--primary:hover{ transform:translateY(-1px); box-shadow:var(--shadow-md); }
.st-btn--ghost{ background:transparent; color:var(--text-muted); border:1px solid var(--border); }
```

## 3.2 Drawer Mobile (Laci Kartu Akses)

```css
.mob-kartu-tab{
  position:fixed; left:2px; top:50%; transform:translateY(-50%);
  writing-mode:vertical-rl; text-orientation:mixed; padding:13px 9px;
  border-radius:0 12px 12px 0; border:1.5px solid #f0f0f0; background:#fff;
  box-shadow:0 4px 20px rgba(0,0,0,0.06); z-index:1000; cursor:pointer;
}
.mob-drawer-overlay{ position:fixed; inset:0; background:rgba(15,15,15,0.5); backdrop-filter:blur(8px);
  opacity:0; pointer-events:none; transition:opacity 0.3s; z-index:999; }
.mob-drawer-overlay.is-open{ opacity:1; pointer-events:auto; }
.mob-drawer-panel{
  position:fixed; left:0; top:0; bottom:0; width:min(320px,84vw);
  transform:translateX(-105%); transition:transform 0.38s var(--ease-drawer);
  background:#fff; box-shadow:0 0 20px rgba(0,0,0,0.08); z-index:1001; overflow:auto;
}
.mob-drawer-panel.is-open{ transform:translateX(0); }
```

## 3.3 Bottom-Sheet (<1024 — formulir/checkin/onsite/kiosk)

```css
.sheet{ position:fixed; bottom:0; left:0; right:0; height:50vh; /* atau 86vh untuk checkin drawer */
  background:#fff; border-radius:25px 25px 0 0; box-shadow:0 -8px 32px rgba(0,0,0,0.12);
  transform:translateY(calc(100% - 64px)); transition:transform 0.38s var(--ease-drawer); z-index:100; }
.sheet.is-expanded{ transform:translateY(0); }
.sheet.is-open{ transform:translateY(0); } /* modal variant */
.grip-bar{ width:40px; height:4px; background:#d8d8d8; border-radius:999px; margin:10px auto; cursor:grab; }
.sheet-overlay{ position:fixed; inset:0; background:rgba(15,15,15,0.5); backdrop-filter:blur(8px); opacity:0; pointer-events:none; transition:opacity 0.3s; }
.sheet-overlay.is-open{ opacity:1; pointer-events:auto; }
@keyframes sheetUp{ from{transform:translateY(100%)} to{transform:translateY(0)} }
@keyframes sheetDown{ from{transform:translateY(0)} to{transform:translateY(100%)} }
```

Sticky submit di sheet: `.sheet-submit{ position:sticky; bottom:0; background:#fff; padding:16px; border-top:1px solid var(--border); }`

## 3.4 Form canon

```css
/* Input group — formulir_tamu style */
.input-group{ position:relative; border-bottom:1.5px solid var(--border); margin-bottom:25px; transition:border-color var(--duration-normal); }
.input-group:focus-within{ border-color:var(--primary); box-shadow:0 0 0 3px var(--primary-soft); border-radius:8px; }
.input-group input, .input-group textarea{
  width:100%; border:none; background:transparent; padding:10px 0;
  font-size:16px; font-weight:700; color:var(--text-main); outline:none;
}
.input-group label{ position:absolute; top:-8px; left:0; font-size:10px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; color:var(--text-muted); }

/* Vendor form — boxed */
.form-input{ width:100%; padding:12px 16px; border:1.5px solid var(--border); border-radius:14px; background:#fafafa; font-size:14px; transition:all var(--duration-normal); }
.form-input:focus{ background:#fff; border-color:var(--primary); box-shadow:0 0 0 3px var(--primary-soft); outline:none; }
.form-label{ font-size:10px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; color:var(--text-muted); margin-bottom:6px; display:block; }
.form-error{ color:var(--danger); font-size:11px; font-weight:700; margin-top:4px; }

/* Qty stepper */
.qty-control{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.qty-btn{ width:40px; height:40px; border-radius:14px; border:1.5px solid var(--border); background:#fff; font-size:18px; cursor:pointer; transition:all var(--duration-fast); }
.qty-btn:active{ transform:scale(0.95); filter:grayscale(0.95); }

/* Currency */
.currency-wrap{ display:flex; gap:8px; align-items:center; }
.currency-wrap select{ width:110px; }
.currency-prefix{ position:absolute; left:44px; color:var(--text-muted); pointer-events:none; }
```

**Validasi:**

- Jangan `alert()` — pakai `SapaModal` / `st-modal` / `sapa-notify-modal`.
- Error dekat field + `aria-describedby` — jangan hanya di top.
- Helper text visible, placeholder bukan label.
- Validate `ssId /^[a-zA-Z0-9_-]{20,60}$/`, `username /^[a-z0-9-]{3,50}$/`, `category` enum — dari `subdomain_resolver.js`.

## 3.5 Dropzone (vendor)

```css
.dropzone{ border:2px dashed var(--border); min-height:140px; background:var(--bg); border-radius:14px;
  display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all var(--duration-normal); }
.dropzone:hover{ border-color:var(--primary); border-width:2px; border-style:dashed; background:var(--primary-light); box-shadow:0 0 0 4px var(--primary-soft); }
.dropzone.filled{ position:relative; overflow:hidden; border-style:solid; }
.dropzone.filled img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.dropzone.filled.logo img{ width:110px; height:110px; border-radius:50%; position:static; }
.dropzone-overlay{ position:absolute; inset:0; background:rgba(44,36,32,0.65); backdrop-filter:blur(3px); opacity:0; transition:opacity var(--duration-normal); display:flex; align-items:center; justify-content:center; color:#fff; }
.dropzone.filled:hover .dropzone-overlay{ opacity:1; }
```

## 3.6 A11y modal

- `role="dialog" aria-modal="true" aria-labelledby="modalTitle"`
- Focus trap: simpan `previousActiveElement`, focus ke modal on open, restore on close.
- `Esc` closes, `Enter` confirms (jika single action).
- `aria-hidden="true"` untuk overlay saat closed.
- Jangan hilangkan focus ring — `outline: 2px solid var(--primary); outline-offset:2px` untuk `:focus-visible`.
