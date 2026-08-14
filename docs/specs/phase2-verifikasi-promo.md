# Spec: Phase 2 — Verifikasi Akun Vendor & Promo Diskon Marketplace

## Objective

Tiga peningkatan pada marketplace SapaTamu.id:

1. **Verifikasi akun** — Saat registrasi, email wajib diverifikasi via OTP (Supabase Auth bawaan) sebagai syarat akun bisa dipakai (login). WhatsApp diverifikasi via OTP 6 digit (Fonnte) sebagai **syarat publikasi paket** ke marketplace. Vendor bisa mengganti nomor WhatsApp di dashboard (wajib verify ulang). Lupa password: reset via email (Supabase recover) atau via WhatsApp (kode reset).
2. **Paket pending** — Vendor yang WhatsApp-nya belum terverifikasi tetap bisa upload paket, tapi statusnya `pending` (tidak tampil di publik: marketplace, profil, detail, OG preview). Setelah WhatsApp terverifikasi, semua paket pending otomatis menjadi `publish`.
3. **Promo diskon** — Satu slot promo per paket: `discount_price`, `promo_start_at`, `promo_end_at` (datetime-local picker). Aktif otomatis saat sekarang berada dalam periode. Ditampilkan di marketplace, profil, dan halaman detail sebagai harga diskon di atas harga normal yang dicoret, dan terbawa ke pesan WhatsApp.

## User Stories

- **US1 (Register)**: Vendor mendaftar (email, password, WA, dll) → sistem mengirim OTP 6 digit ke email → vendor masukkan kode → akun aktif, bisa login.
- **US2 (Login)**: Login hanya via email+password (fallback tanpa password DIHAPUS). Jika email belum verified → ditolak dengan instruksi verifikasi + tombol kirim ulang OTP.
- **US3 (Lupa password)**: Di login, "Lupa password" → input email + pilih channel (Email/WhatsApp). Email → link reset Supabase. WhatsApp → kode 6 digit ke nomor terdaftar → form password baru.
- **US4 (Verifikasi WA)**: Dashboard menampilkan banner "Verifikasi WhatsApp untuk mempublikasikan paket" → kirim OTP ke nomor → masukkan kode → verified → paket pending otomatis publish.
- **US5 (Ganti nomor WA)**: Ubah nomor di dashboard → nomor baru tersimpan, `whatsapp_verified_at` direset, paket kembali pending → verify ulang → publish.
- **US6 (Paket pending)**: Vendor unverified-WA upload paket → tersimpan dengan badge "Pending" di dashboard, tidak terlihat publik.
- **US7 (Promo)**: Dari daftar paket di dashboard, tombol "Promo" → modal: harga diskon, mulai (tanggal+jam), selesai. Paket yang sedang promo menunjukkan badge di daftar.
- **US8 (Tampilan promo)**: Marketplace (kartu vendor), vendor-profile (kartu paket), vendor-product (halaman detail): harga diskon di atas harga normal dicoret. Aktif hanya dalam periode.
- **US9 (WA message)**: Pesan WA paket membawa informasi promo: `...paket "X" — harga promo Rp A (normal Rp B)...`.

## Tech Stack

- Vercel serverless: `api/mp.js` (Node — semua POST), `api/mp-public.js` (edge — GET publik), `middleware.js` + `lib/og-shared.js` (OG preview)
- Supabase: Auth (`/auth/v1/otp`, `/auth/v1/verify`, `/auth/v1/recover`, `/auth/v1/admin/users`) + Postgres (service role)
- WhatsApp: Fonnte `POST https://api.fonnte.com/send` + `FONNTE_TOKEN` env (sudah ada, dipakai `api/monitor-alert.js`)
- Frontend: JSON statis vanilla JS (marketplace.html, vendor-register.html, vendor-dashboard.html, vendor-profile.html, vendor-product.html) — tanpa framework baru

## Schema (SQL migration `sql/marketplace/08_vendor_verification_promo.sql`)

```sql
CREATE TABLE IF NOT EXISTS vendor_otp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES mp_vendors(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','whatsapp')),
  purpose text NOT NULL CHECK (purpose IN ('email_verify','wa_verify','wa_reverify','reset')),
  target text NOT NULL,
  code text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mp_vendors
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_verified_at timestamptz;

ALTER TABLE mp_products
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'publish'
    CHECK (status IN ('pending','publish')),
  ADD COLUMN IF NOT EXISTS discount_price bigint,
  ADD COLUMN IF NOT EXISTS promo_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS promo_end_at timestamptz;
```

Aturan bisnis:
- Promo aktif ⇔ `discount_price > 0 AND discount_price < price AND promo_start_at <= now() <= promo_end_at`
- Paket baru dari vendor `whatsapp_verified_at IS NULL` → `status='pending'`
- Verifikasi WA sukses → `UPDATE mp_products SET status='publish' WHERE vendor_id=? AND status='pending'`
- Ganti nomor WA → `whatsapp_verified_at=NULL` + paket `pending` (verify ulang)

## Endpoints Baru (api/mp.js, Node, semuanya POST)

| Endpoint | Fungsi |
|---|---|
| `POST /api/mp/register-vendor` (ubah) | Buat vendor + auth user (signup w/ redirectTo), kirim OTP email via `auth/v1/otp`, respons `{ needs_email_otp: true }` |
| `POST /api/mp/send-otp` | purpose `email`/`wa`(verify atau reverify)/`reset`; cooldown 60 detik; WA → Fonnte, email → Supabase otp |
| `POST /api/mp/verify-otp` | Validasi kode (5 menit, maks 5 percobaan); `email_verify` → `auth/v1/verify` + set `email_verified_at`; `wa_*` → set `whatsapp_verified_at` + auto-publish pending |
| `POST /api/mp/forgot-password` | channel `email` → `auth/v1/recover` (redirectTo dashboard; fallback: deteksi via admin API); channel `wa` → kode reset ke nomor terdaftar |
| `POST /api/mp/reset-password` | Validasi kode reset (wa) → `PUT /auth/v1/admin/users/{id} {password}` (service role) |
| `PATCH /api/mp/vendor-me` (ubah) | Ubah `whatsapp` → unverify + repend paket + kirim OTP ke nomor baru |

Endpoint yang diubah:
- `login-vendor`: hapus fallback tanpa password; tolak jika `email_verified_at` null
- `vendor-products` POST/PATCH: tulis `status` + `discount_price`/`promo_start_at`/`promo_end_at`
- `mp-public` (edge): semua query produk publik + `status=eq.publish`; payload produk diberi `has_promo`, `price_display`, `price_original`, `promo_end_at`; endpoint `vendors` menghitung `price_from` promo-aware (min normal + min aktif) untuk tampilan coret di kartu
- `lib/og-shared.js` `resolveProductById`: filter `status=eq.publish`; `buildProductOgMeta`: sebutkan harga promo di description

## Perubahan Frontend

- `vendor-register.html`: setelah submit → panel OTP email (6 digit, timer 120s, kirim ulang) → sukses → dashboard
- `vendor-dashboard.html`:
  - Login: gate `EMAIL_UNVERIFIED` → panel verify email (input kode + kirim ulang); tombol "Lupa password" + modal (input email, channel Email/WA)
  - Banner verifikasi WA bila `whatsapp_verified_at` null + modal OTP WA; setelah verified → auto reload paket
  - Daftar paket: badge "Pending" / "Promo aktif"; tombol "Promo" tiap paket → modal promo (`discount_price`, `promo_start_at`, `promo_end_at` — `<input type="datetime-local">`, konversi WIB)
  - Edit profil: ganti nomor WA → flow verify ulang
  - Setelah reset password (channel WA): form password baru; (email): tangani hash `#access_token&type=recovery` → set password
- `vendor-profile.html`: kartu paket harga promo+coret; pesan WA pakai harga promo
- `vendor-product.html`: harga promo+coret; pesan WA promo
- `marketplace.html`: kartu vendor — bila `price_from` terdiskon, tampil harga promo + coret harga normal

## Command & Verifikasi (tidak ada test framework / build step di repo)

- Deploy: `git add … && git commit && git push origin main` (Vercel auto-deploy)
- Verifikasi backend: `node --input-type=module -e "..."` + `curl.exe` terhadap endpoint publik/protected (pola seperti phase 1)
- Verifikasi UI: `curl -A WhatsApp …` untuk memastikan OG; manual via browser untuk alur OTP/lokasi

## Struktur

```
sql/marketplace/08_vendor_verification_promo.sql  → migration
api/mp.js          → otp, reset, login gate, wa-verify, promo write, status
api/mp-public.js   → filter status+promo di poly publik
lib/og-shared.js   → middleware OG (status filter + promo desc)
vendor-register.html, vendor-dashboard.html, vendor-profile.html,
vendor-product.html, marketplace.html              → UI
docs/specs/phase2-verifikasi-promo.md              → spec ini
tasks/plan.md, tasks/todo.md                       → plan + tasks
```

## Batasan

- Always: validasi input (email valid, WA ke format 628, kode OTP regex `^\d{6}$`), rate-limit OTP (cooldown 60s, max 5 percobaan, expired 5 menit), hapus kode OTP setelah dipakai, tolak produk pending dari API publik
- Ask first: perubahan schema DB (sudah disetujui via spec ini), penambahan env baru (tidak ada — FONNTE_TOKEN sudah ada)
- Never: commit token/secrets, simpan OTP dalam bentuk mentah di API publik, publish produk pending

## Risiko & Mitigasi

1. **Supabase email OTP vs magic link** (tergantung setting dashboard): UI menerima keduanya — kode 6 digit via `auth/v1/verify`, link langsung diklik; status dipakai via admin API check di `vendor-me`. 
2. **Cache CDN 1 jam** (`s-maxage=3600`) pada listing: awal promo bisa telat maks ~1 jam di kartu marketplace; detail halaman tidak ter-cache CDN (via middleware), OK.
3. **Fonnte token** hanya ada di Vercel env: semua call Fonnte dari Node API, tidak dari edge.

## Success Criteria

- [ ] Register → OTP email → verified → bisa login; login sebelum verify ditolak
- [ ] Fallback login tanpa password hilang (email+password salah → 401)
- [ ] Vendor unverified-WA upload paket → status pending, tidak muncul di `/api/mp/vendors`, vendor-detail, product-detail, OG preview
- [ ] Verify WA → pending otomatis publish (terlihat di semua tempat)
- [ ] Ganti nomor WA → unverified + pending ulang; verify nomor baru → publish
- [ ] Reset password via email & via WA berfungsi
- [ ] Promo: dashboard set harga diskon+periode → tampil promo (harga diskon di atas coret) di marketplace card, profile, product; non-aktif di luar periode
- [ ] Pesan WA membawa informasi promo
- [ ] Paket tanpa promo = harga normal seperti sekarang