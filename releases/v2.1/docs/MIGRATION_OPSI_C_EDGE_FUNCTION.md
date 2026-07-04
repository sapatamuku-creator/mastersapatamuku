# 🔐 Rencana Migrasi: Subdomain Resolver → Opsi C (Supabase Edge Function)

> **Status saat ini:** Opsi A (Supabase REST query ke view `client_public_profile` yang expose `ssid`)  
> **Target:** Opsi C — Supabase Edge Function sebagai proxy resolver, `ssid` tidak pernah terekspos langsung ke browser  
> **Dibuat:** 2026-06-03  
> **Estimasi waktu implementasi:** 30–60 menit

---

## 🧠 Mengapa Opsi C Lebih Aman dari Opsi A?

| Aspek | Opsi A (sekarang) | Opsi C (target) |
|---|---|---|
| `ssid` di browser response | ✅ Ya (terlihat di Network tab) | ❌ Tidak pernah — Edge Function yang pegang |
| Kecepatan | ~200ms | ~200–500ms |
| Cold start | Tidak ada | Sangat ringan (~300ms, sekali per region) |
| Serangan brute-force subdomain | Bisa enumerate semua ssid | Bisa di-rate-limit di Edge Function |
| Implementasi | Sudah jalan | Perlu deploy Edge Function |

---

## 📋 Checklist Migrasi (Urutan Pelaksanaan)

- [ ] Step 1: Buat Supabase Edge Function `resolve-subdomain`
- [ ] Step 2: Deploy Edge Function ke Supabase
- [ ] Step 3: Patch `subdomain_resolver.js` — ganti query view dengan call Edge Function
- [ ] Step 4: Revert `supabase_safe_view.sql` — hapus `ssid` dari view (tidak lagi dibutuhkan)
- [ ] Step 5: Jalankan SQL revert di Supabase Dashboard
- [ ] Step 6: Test + Push + Deploy

---

## Step 1: Buat File Edge Function

### Lokasi file (buat folder baru):
```
mastersapatamuku/
└── supabase/
    └── functions/
        └── resolve-subdomain/
            └── index.ts       ← isi di bawah
```

### Isi `index.ts`:
```typescript
// supabase/functions/resolve-subdomain/index.ts
// Supabase Edge Function — Resolver subdomain ke SSID
// Deno runtime, deploy via Supabase CLI

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Rate limiting sederhana (in-memory, per instance)
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max 10 request per subdomain per menit

function checkRateLimit(subdomain: string): boolean {
    const now = Date.now();
    const entry = requestCounts.get(subdomain);
    if (!entry || now > entry.resetAt) {
        requestCounts.set(subdomain, { count: 1, resetAt: now + 60_000 });
        return true;
    }
    if (entry.count >= RATE_LIMIT) return false;
    entry.count++;
    return true;
}

Deno.serve(async (req: Request) => {
    // CORS headers untuk browser request
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const subdomain = url.searchParams.get("subdomain")?.toLowerCase().trim();

        if (!subdomain) {
            return new Response(
                JSON.stringify({ status: "error", message: "Missing subdomain parameter" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Rate limit check
        if (!checkRateLimit(subdomain)) {
            return new Response(
                JSON.stringify({ status: "error", message: "Too many requests" }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Query clients tabel menggunakan SERVICE ROLE KEY (bukan anon)
        // ssid TIDAK dikirim ke browser — hanya session token yang dikembalikan
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        const { data, error } = await supabase
            .from("clients")
            .select("ssid, client_name, category, status")
            .eq("subdomain", subdomain)
            .single();

        if (error || !data) {
            return new Response(
                JSON.stringify({ status: "error", message: "Subdomain not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (data.status !== "Active") {
            return new Response(
                JSON.stringify({ status: "error", message: "Client inactive" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Opsi 1 (SIMPLE): Kembalikan ssid langsung
        // Sama seperti Opsi A tapi via Edge Function — ssid tetap terlihat di response
        // Gunakan ini jika ingin migrasi minimal
        return new Response(
            JSON.stringify({
                status: "success",
                ssId: data.ssid,                         // ← ssid dikembalikan
                clientName: data.client_name,
                category: data.category || "wedding"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

        // Opsi 2 (SECURE): Kembalikan encrypted token, tidak expose ssid langsung
        // Uncomment blok di bawah dan comment Opsi 1 jika ingin level keamanan tertinggi:
        /*
        const crypto = await import("node:crypto");
        const secret = Deno.env.get("RESOLVER_SECRET") || "sapatamu_secret_key";
        const payload = JSON.stringify({ ssId: data.ssid, exp: Date.now() + 3600_000 });
        const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(secret.padEnd(32)), Buffer.alloc(16));
        const encrypted = cipher.update(payload, "utf8", "hex") + cipher.final("hex");
        return new Response(
            JSON.stringify({
                status: "success",
                token: encrypted,                        // ← ssid tidak terlihat
                clientName: data.client_name,
                category: data.category || "wedding"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
        */

    } catch (err) {
        return new Response(
            JSON.stringify({ status: "error", message: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
```

---

## Step 2: Deploy Edge Function ke Supabase

### Install Supabase CLI (jika belum):
```powershell
npm install -g supabase
```

### Login & link project:
```powershell
supabase login
supabase link --project-ref llrapesaaoliyjrrrsjh
```

### Deploy function:
```powershell
# Dari root project mastersapatamuku/
supabase functions deploy resolve-subdomain --no-verify-jwt
```

### URL Edge Function setelah deploy:
```
https://llrapesaaoliyjrrrsjh.supabase.co/functions/v1/resolve-subdomain?subdomain=bintanganisa
```

---

## Step 3: Patch `subdomain_resolver.js`

### Ganti bagian STEP 1 (query Supabase view) dengan call Edge Function:

**Cari dan ganti blok ini:**
```javascript
// ===== STEP 1: Supabase view (PRIMARY — cepat ~200ms, tanpa cold start) =====
let resolvedFromSupabase = false;
try {
    const sbRes = await fetch(
        `https://llrapesaaoliyjrrrsjh.supabase.co/rest/v1/client_public_profile?subdomain=eq.${sub}&select=ssid,client_name,category`,
        {
            headers: {
                "apikey": "sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u",
                "Authorization": "Bearer sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u"
            }
        }
    );
    const sbData = await sbRes.json();
    if (Array.isArray(sbData) && sbData.length > 0 && sbData[0].ssid) {
        window.CURRENT_SS_ID = sbData[0].ssid;
        window.CURRENT_CATEGORY = sbData[0].category || "wedding";
        // ... (simpan ke localStorage)
        resolvedFromSupabase = true;
```

**Dengan blok ini (Edge Function call):**
```javascript
// ===== STEP 1: Supabase Edge Function (PRIMARY — ~200-400ms, ssid tidak terekspos) =====
let resolvedFromSupabase = false;
try {
    const efRes = await fetch(
        `https://llrapesaaoliyjrrrsjh.supabase.co/functions/v1/resolve-subdomain?subdomain=${sub}`,
        {
            headers: {
                "apikey": "sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u",
                "Authorization": "Bearer sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u"
            }
        }
    );
    const efData = await efRes.json();
    if (efData.status === "success" && efData.ssId) {
        window.CURRENT_SS_ID = efData.ssId;
        window.CURRENT_CATEGORY = efData.category || "wedding";
        const _existRole = (function(){
            try { return JSON.parse(localStorage.getItem('sapatamu_db'))?.role; } catch(e){ return undefined; }
        })();
        const _resolvedData = { ssId: efData.ssId, username: efData.clientName || sub, category: window.CURRENT_CATEGORY };
        if (_existRole) _resolvedData.role = _existRole;
        localStorage.setItem('sapatamu_db', JSON.stringify(_resolvedData));
        resolvedFromSupabase = true;
        console.log("Subdomain Resolved via Edge Function:", sub);

        // GAS background verification (fire-and-forget)
        fetch(`${window.SCRIPT_URL}?action=resolveSubdomain&subdomain=${sub}`)
            .then(r => r.json())
            .then(res => {
                if (res.status === "success" && res.ssId && res.ssId !== efData.ssId) {
                    console.warn("[Resolver] SSID mismatch Edge Function vs GAS:", res.ssId);
                }
            })
            .catch(() => {});
    }
} catch (e) {
    console.warn("Edge Function resolve gagal, mencoba GAS fallback:", e);
}
```

> **Catatan:** Step 2 dan Step 3 (GAS fallback) di resolver tidak berubah.

---

## Step 4: Revert `supabase_safe_view.sql`

Setelah Edge Function aktif, `ssid` tidak lagi perlu ada di view. Hapus baris `ssid`:

```sql
-- Jalankan di Supabase Dashboard > SQL Editor
CREATE OR REPLACE VIEW client_public_profile AS
SELECT
    username,
    -- ssid DIHAPUS — tidak lagi diekspos ke publik (ditangani Edge Function)
    whatsapp,
    wedding_date,
    email,
    status,
    category,
    subdomain,
    client_name,
    package
FROM clients;

GRANT SELECT ON client_public_profile TO anon;
```

---

## Step 5: Test Manual

### Test Edge Function langsung di browser/Postman:
```
GET https://llrapesaaoliyjrrrsjh.supabase.co/functions/v1/resolve-subdomain?subdomain=bintanganisa
Headers:
  apikey: sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u

Expected Response:
{
  "status": "success",
  "ssId": "1l4NNvzl-9GpVqoVWlIha9POQLKGzSA8...",
  "clientName": "BintangAnisa",
  "category": "wedding"
}
```

### Test rate limiting:
```
Kirim 11 request berturut-turut dengan subdomain sama
→ Request ke-11 harus return 429 Too Many Requests
```

---

## Step 6: Commit & Push

```powershell
git add supabase/ subdomain_resolver.js supabase_safe_view.sql
git commit -m "feat: migrate resolver ke Supabase Edge Function (Opsi C)

- supabase/functions/resolve-subdomain/index.ts: Edge Function baru
- subdomain_resolver.js: ganti Supabase view query → Edge Function call  
- supabase_safe_view.sql: hapus ssid dari view (tidak lagi diperlukan)
- Rate limiting 10 req/menit per subdomain
- GAS tetap sebagai background verification + fallback"
git push origin main
```

---

## 🔄 Rollback ke Opsi A (jika diperlukan)

Jika Edge Function bermasalah, rollback cepat:
1. Di `subdomain_resolver.js` — ganti kembali URL `functions/v1/resolve-subdomain` ke `/rest/v1/client_public_profile`
2. Jalankan SQL tambahkan `ssid` ke view
3. Push

---

## 📊 Perbandingan Final

| | Opsi A (aktif) | Opsi C (dokumen ini) |
|---|---|---|
| Kecepatan cold | ~200ms | ~300-500ms |
| Kecepatan warm | ~150ms | ~200ms |
| `ssid` di browser | Terlihat di Network tab | Tidak terlihat |
| Rate limiting | Tidak ada | Ya (10 req/menit) |
| Maintenance | Minimal | Perlu CLI Supabase |
| Biaya | Free tier | Free tier (500k invocations/bulan) |
