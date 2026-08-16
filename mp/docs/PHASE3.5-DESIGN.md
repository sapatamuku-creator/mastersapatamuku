# PHASE3.5-DESIGN — OAuth2 Client & Dashboard Pengantin
## Desain Integrasi Identitas + Dashboard Client + Integrasi Guestbook

**Versi:** 0.1.0-draft
**Tanggal:** 2026-08-15
**Status:** Draft — Pending Review (diskusi lanjutan terbuka)
**Referensi:** PHASE3-DESIGN.md, PRD.md, SPEC.md, PLAN.md, TODO.md

---

## 1. Visi

Phase 3.5 menutup lingkaran marketplace: **client (calon pengantin) memiliki identitas digital resmi** yang menjadi syarat eksekusi pemesanan, dan **semua datanya terkumpul di satu dashboard** — bukan tersebar di chat WA.

Prinsip desain:

> **Satu akun, satu login, semua data terkumpul otomatis.**
> Direct ke vendor = data hilang di chat. Lewat Sapatamu = data hidup di dashboard.

Dua pilar:

1. **OAuth2 Social Login (Google)** sebagai metode masuk client — wajib saat eksekusi (checkout/pembayaran).
2. **SSO / Account-Linking** antara marketplace dan guestbook menggunakan email sebagai join key → client tidak perlu login dua kali di dua sistem.

---

## 2. Value Proposition: "Kenapa Booking Lewat Sapatamu?"

Naskah halaman pembanding (Sapatamu vs direct ke vendor):

| Manfaat | Lewat Sapatamu | Direct |
|---|---|---|
| Dana aman (escrow flow-through Phase 3) | ✅ | ❌ |
| Dashboard simulasi biaya + rekap vendor | ✅ free | ❌ |
| Timeline persiapan H-12 → H-1 + reminder WA/email otomatis | ✅ free | ❌ |
| Tracking pembayaran + invoice transparan | ✅ | ❌ (janji lisan) |
| Akses resmi guestbook + input angpao | ✅ free | ❌ |
| Vendor terverifikasi + rating | ✅ | ❌ |
| **Satu login untuk semua sistem** | ✅ | ❌ (chat WA hilang-hilangan) |

**Narasi kunci**: "Setelah H-day, kamu tidak perlu membuka 30 chat WA untuk mencari bukti pembayaran. Semuanya ada di dashboard Sapatamu."

---

## 3. Arsitektur Identitas

### 3.1 Fondasi (sudah ada di codebase)
- Marketplace (`mp/`) sudah menggunakan **Supabase Auth** (`mp_vendors.user_id → auth.users`).
- Guestbook (`temp_dev/`) masih **username/password via GAS + RPC Supabase**, subdomain SaaS, RBAC owner/worker/guest.
- Infra WA notification (FONNTE) sudah terpasang → bisa dipakai untuk reminder & OTP.

### 3.2 Desain

```
[ Supabase Auth — satu project ]
   └─ auth.users
       ├─ email/password + Google OAuth (PKCE)
       └─ role: 'client' (RBAC sama di marketplace & guestbook)

[ Jembatan Linking ]  mp_guestbook_links
   marketplace_user_id  ──►  guestbook.username + subdomain
   metode linking:
     a. AUTO : saat register/login, deteksi email sama → ajukan linking
     b. MANUAL: owner set di panel pusat guestbook
   → konfirmasi SATU ARAH oleh guestbook owner (cegah salah link/klaim akun)
```

**Keputusan penting**: guestbook **tetap** pada sistem auth lamanya (GAS + username/password). Tidak perlu migrasi penuh ke Supabase Auth karena guestbook punya offline PWA + subdomain SaaS yang berisiko tinggi diubah. Yang dibangun hanyalah **jembatan linking**.

---

## 4. Integrasi Guestbook — 3 Tingkat Akses

| Level | Syarat | Akses guestbook |
|---|---|---|
| **Free** | Login marketplace (Google OAuth) | `formulir_tamu` (catat tamu) + input **angpao** — tanpa akun guestbook terpisah |
| **Linking** | Email sama / di-pair oleh panel owner | Terdeteksi + ter-link ke akun resmi guestbook (verifikasi owner) |
| **Paket Resmi** | Booking paket Sapatamu | Full akses dashboard guestbook sesuai paket (daftar semua tamu, rekap angpao, export) |

**Prinsip operasi**:
- Client **tidak pernah login dua kali**. Sekali OAuth di marketplace → sistem tahu email → menampilkan guestbook mana yang boleh diakses.
- Belum ada akun guestbook (belum beli paket) → tetap dapat akses free (formulir + angpao).

---

## 5. Fitur Dashboard Client

### 5.1 Simulasi Vendor & Biaya (Gerbang Funnel)
- Pilih beberapa vendor + paket → **total biaya otomatis**.
- Data model: `mp_client_plans` (draft rencana) berisi banyak item (`vendor_id + product_id`).
- **Simulasi → checkout → booking** (langsung atau dikonversi jadi order).
- Bisa disimpan sebagai draft dan dilanjut kapan saja.

### 5.2 Timeline Persiapan "All-in-One" (H-12 → H-1)
- Template statis per kategori: `mp_timeline_templates`.
- Checkpoint waktu: **H-12, H-9, H-6, H-3, H-1 bulan**, masing-masing berisi to-do list.
- Progress checkbox + **reminder otomatis ke email & WA** (infra FONNTE, konsisten dengan cron Phase 3).
- Template contoh:
  - **H-12**: tentukan tanggal & venue, dapatkan vendor inti (WO, venue), rekap budget kasar.
  - **H-9**: booking fotografer & video, dekorasi, undangan awal.
  - **H-6**: booking katering, musik/hiburan, MC, fitting baju pertama.
  - **H-3**: MUA, souvenir, finalisasi daftar tamu, undangan massal.
  - **H-1**: revisi tamu final, konfirmasi semua vendor, gladi resik.

### 5.3 Tracking Pembayaran Vendor (Terintegrasi Dashboard Vendor)
- Agregasi dari `mp_orders` + `mp_escrow_ledger` (satu sumber kebenaran).
- Tampilan per paket: **DP sudah dibayar, sisa tagihan** — sinkron dengan dashboard vendor.
- Invoice otomatis 2 versi (client & vendor) — konsisten PHASE3-DESIGN.

### 5.4 Guestbook Access
- Jembatan integrasi sesuai §4 — dari dashboard client bisa langsung kelola tamu & angpao sesuai tingkat akses.

---

## 6. Skema Database — Tabel Baru

```sql
-- 1. Profil client marketplace
CREATE TABLE mp_clients (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  email         TEXT UNIQUE NOT NULL,
  avatar_url    TEXT,
  whatsapp      TEXT,
  plan_id       UUID REFERENCES mp_client_plans(id),  -- rencana aktif (opsional)
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. Rencana simulasi biaya (wishlist / draft)
CREATE TABLE mp_client_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES mp_clients(id) ON DELETE CASCADE,
  name          TEXT,               -- "Paket Pernikahan Impian"
  total_amount  BIGINT DEFAULT 0,   -- disinkron dari items
  status        TEXT DEFAULT 'draft'
                CHECK (status IN ('draft','converted','archived')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 3. Item rencana (satu baris = satu vendor + paket)
CREATE TABLE mp_plan_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       UUID NOT NULL REFERENCES mp_client_plans(id) ON DELETE CASCADE,
  vendor_id     UUID NOT NULL REFERENCES mp_vendors(id),
  product_id    UUID NOT NULL REFERENCES mp_products(id),
  qty           INTEGER DEFAULT 1,
  price         BIGINT NOT NULL,    -- snapshot harga saat dipilih
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 4. Template timeline persiapan (statis per kategori)
CREATE TABLE mp_timeline_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID REFERENCES mp_categories(id),
  phase_label   TEXT NOT NULL,             -- 'H-12','H-9','H-6','H-3','H-1'
  phase_offset_month INTEGER NOT NULL,     -- 12, 9, 6, 3, 1
  task_title    TEXT NOT NULL,
  task_desc     TEXT,
  sort_order    INTEGER DEFAULT 0
);

-- 5. Progress timeline client (per client, instantiate dari template)
CREATE TABLE mp_client_timeline_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES mp_clients(id) ON DELETE CASCADE,
  template_id   UUID NOT NULL REFERENCES mp_timeline_templates(id),
  due_at        DATE,
  is_done       BOOLEAN DEFAULT false,
  done_at       TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ
);

-- 6. Jembatan linking marketplace ↔ guestbook
CREATE TABLE mp_guestbook_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES mp_clients(id) ON DELETE CASCADE,
  guestbook_username TEXT NOT NULL,     -- akun guestbook resmi
  guestbook_subdomain TEXT NOT NULL,
  email_match   BOOLEAN DEFAULT false,  -- true jika auto-detect via email
  link_method   TEXT CHECK (link_method IN ('auto_email','manual_owner')),
  status        TEXT DEFAULT 'pending'
                CHECK (status IN ('pending','linked','rejected','unlinked')),
  verified_by   UUID REFERENCES auth.users(id),  -- owner guestbook yang approve
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, guestbook_username, guestbook_subdomain)
);
```

> Rename/perluasan rincian bisa menyesuaikan struktur tabel guestbook yang ada.

---

## 7. Endpoint API

| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/marketplace/client/register-oauth` | POST | Finalisasi profil client setelah Google OAuth redirect |
| `/api/marketplace/client/me` | GET | Profil + data dashboard client |
| `/api/marketplace/plan` | POST | Buat/simpan simulasi rencana biaya |
| `/api/marketplace/plan/:id` | GET/PUT/DELETE | Kelola isi rencana & item |
| `/api/marketplace/plan/:id/convert` | POST | Konversi rencana → booking request |
| `/api/marketplace/timeline` | GET | Instantiate & ambil timeline (dari template) |
| `/api/marketplace/timeline/:itemId/toggle` | POST | Tandai to-do selesai |
| `/api/marketplace/guestbook/link` | POST | Ajukan/minta link marketplace ↔ guestbook |
| `/api/marketplace/guestbook/link/decide` | POST | Owner approve/reject (panel pusat guestbook) |
| `/api/marketplace/payments-summary` | GET | Rekap DP/sisa per vendor (dari ledger) |

---

## 8. Keamanan & Privasi

- Google OAuth wajib **PKCE** + validasi `state` (ditangani Supabase Auth).
- **UU PDP**: consent saat login → data yang dibagikan minimal: nama, email, avatar.
- Linking antar-akun harus **diverifikasi satu arah** oleh guestbook owner (jangan asal cocok email).
- Token sesi tidak pernah disimpan di localStorage tanpa enkripsi; gunakan cookie httpOnly bila memungkinkan, atau pola Supabase `getSession()` + refresh.
- RBAC: `client` di marketplace dan guestbook harus dipetakan eksplisit di `mp_guestbook_links` — bukan hanya berdasar email yang bersesuaian.

---

## 9. Keputusan Diskusi yang Masih Terbuka {#keputusan}

1. **Metode login**: Google OAuth saja, ditambah email/password, atau + WA OTP (konteks Indonesia, infra FONNTE sudah ada)? *(default: Google OAuth + email/password)*
2. **Guestbook tetap di auth lama (GAS)** dengan jembatan linking — setuju, atau mulai migrasi ke Supabase Auth? *(default: tetap GAS + jembatan)*
3. **Kapan login wajib**: checkout/pembayaran saja (rekomendasi, browse & simulasi tetap bebas) atau sejak booking request?
4. **Simulasi harga**: bisa dikonversi jadi order, atau hanya lembar perkiraan (non-binding)?
5. **Level akses guestbook**: konfirmasi 3 tingkat (free formulir+angpao / linking / full sesuai paket)?
6. **Detail guestbook `formulir_tamu` + `angpao`**: hanya halaman input, atau juga daftar tamu yang sudah tercatat untuk akses free?

---

## 10. Referensi & Pertautan

- PHASE3-DESIGN.md (escrow flow-through, state machine, endpoint, cron).
- Tabel existing: `mp_vendors`, `mp_products`, `mp_categories`, `mp_inquiries`.
- Infrastruktur guestbook: `temp_dev/` (subdomain SaaS, GAS auth, offline PWA).
- Notifikasi: FONNTE (dipakai ulang untuk reminder).

---

## 11. Catatan Implementasi Sandbox (Prototype UI) — 2026-08-16

Sandbox `mp/frontend/phase35-sandbox.html` (HTML tunggal, localStorage, OAuth Google/email simulasi) dipakai untuk memvalidasi UX dashboard client **sebelum** eksekusi DB/API nyata. Dua tambahan terbaru yang sudah terverifikasi via Playwright:

### 11.1 Dashboard Task = Form Detail per Tugas

Timeline "Timeline & Tugas" (H-12 → H-1) bukan sekadar checklist centang — **setiap tugas punya field input yang bisa diisi & tersimpan**, sehingga dashboard menjadi data overview:

- **Definisi field** dirender dari array `fields` di `TIMELINE_TEMPLATE`: tipe `date`, `time`, `text`, `number`, `select`, `textarea` (mis. task "Tentukan tanggal & jam acara" → field tanggal, jam akad, jam resepsi; "Booking venue" → nama venue, alamat, kapasitas, kontak).
- **Interaksi**: tombol **✎** di samping tugas membuka panel `task-detail` berisi form grid; input tersimpan **otomatis** (oninput/onchange) ke `localStorage["spt35_taskdata"]` dengan key `"FASE:index"` → `{ fieldKey: value, _open }`.
- **Feedback realtime**: badge `✎ n` (jumlah field terisi per tugas), counter `X terisi detail` per fase, dan bar bawaan tetap update tanpa re-render penuh (fokus input tidak hilang; fase yang terbuka dipertahankan saat re-render).
- **Overview**: card **"Detail Persiapan"** di Ringkasan menampilkan semua data terisi sebagai chips (label + nilai + sumber `FASE · tugas`); data persist setelah reload.
- **Fungsi** terkait: `fieldInput()`, `toggleTaskDetail()`, `saveTaskField()`, `renderTaskOverview()`, `renderRingkasanOverview()`-style render (inlined), key LS `spt35_taskdata`.

> Nilai bagi fase nyata: memvalidasi bahwa task timeline bisa membawa **data terstruktur** (tanggal, jam, budget, vendor, catatan) — bukan hanya boolean done — yang kelak dipetakan ke `mp_client_timeline_items` + kolom detail di DB.

### 11.2 Landing Page "Wedding Checklist" + Pintu Masuk

Gaya Bridestory `/id/wedding-checklist/about` untuk memasarkan fitur checklist → alur masuk ke dashboard client:

- **`mp/frontend/wedding-checklist.html`** (baru): hero + badge "100% GRATIS", 4 kartu manfaat, 4 langkah cara membuat, CTA band, 4 FAQ (accordion JS). Desain reset-free (navbar + section lokal, terpisah dari marketplace).
- **Navbar link "Wedding Checklist"** (pill merah muda, ikon checklist) ditaruh **di sebelah kiri searchbar**:
  - `mp/frontend/marketplace.html:274` — di navbar, sebelum searchbar global.
  - `mp/frontend/index.html:418` — di hero, kiri `hero-search`.
- **CTA landing** → `phase35-sandbox.html` → login OAuth2 (Google / email) → dashboard client penuh.

Terverifikasi Playwright: link muncul di index & marketplace, semua section landing render, FAQ toggle jalan, dan alur landing → OAuth → dashboard (sideName "Opick") tanpa error JS.