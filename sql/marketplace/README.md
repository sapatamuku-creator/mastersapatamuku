# Deploy Database Schema ke Supabase
## Sapatamu Marketplace — Phase 0: Database Setup

> [!IMPORTANT]
> Jalankan SQL files **secara berurutan** (01 → 08). Jangan skip urutan karena ada foreign key dependency.

---

## Cara Deploy via Supabase Dashboard (SQL Editor)

1. Buka [supabase.com/dashboard](https://supabase.com/dashboard) → pilih project sapatamu
2. Klik **`SQL Editor`** di sidebar kiri
3. Klik **`+ New query`**
4. Copy-paste isi file SQL → klik **`Run`**
5. Ulangi untuk file berikutnya

### Urutan Eksekusi

| Order | File | Isi |
|-------|------|-----|
| 1 | [01_categories.sql](file:///D:/Google%20Antigrafity/mastersapatamuku/sql/marketplace/01_categories.sql) | Tabel kategori |
| 2 | [02_vendors.sql](file:///D:/Google%20Antigrafity/mastersapatamuku/sql/marketplace/02_vendors.sql) | Tabel vendor utama |
| 3 | [03_products.sql](file:///D:/Google%20Antigrafity/mastersapatamuku/sql/marketplace/03_products.sql) | Tabel produk/paket |
| 4 | [04_inquiries.sql](file:///D:/Google%20Antigrafity/mastersapatamuku/sql/marketplace/04_inquiries.sql) | Tabel inquiry client |
| 5 | [05_reviews.sql](file:///D:/Google%20Antigrafity/mastersapatamuku/sql/marketplace/05_reviews.sql) | Tabel ulasan |
| 6 | [06_transactions.sql](file:///D:/Google%20Antigrafity/mastersapatamuku/sql/marketplace/06_transactions.sql) | Tabel komisi/transaksi |
| 7 | [07_rls_policies.sql](file:///D:/Google%20Antigrafity/mastersapatamuku/sql/marketplace/07_rls_policies.sql) | Views & helper functions |
| 8 | [08_seed_categories.sql](file:///D:/Google%20Antigrafity/mastersapatamuku/sql/marketplace/08_seed_categories.sql) | Data awal 10 kategori |

---

## Verifikasi Setelah Deploy

Jalankan query ini di SQL Editor untuk cek semua tabel sudah ada:

```sql
SELECT table_name, (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_name LIKE 'mp_%'
ORDER BY table_name;
```

Hasil yang diharapkan:
```
mp_categories   | 9
mp_inquiries    | 16
mp_products     | 19
mp_reviews      | 14
mp_transactions | 16
mp_vendors      | 30
```

Cek kategori sudah terseed:
```sql
SELECT name, slug, icon FROM mp_categories ORDER BY sort_order;
```
