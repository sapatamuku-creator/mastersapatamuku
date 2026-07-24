-- ALTER TABLE tamu: Menambahkan kolom subdomain
-- Jalankan di Supabase Dashboard -> SQL Editor

ALTER TABLE public.tamu 
ADD COLUMN IF NOT EXISTS subdomain TEXT;

-- Tambahkan index untuk mempercepat pencarian berdasarkan subdomain jika diperlukan
CREATE INDEX IF NOT EXISTS idx_tamu_subdomain ON public.tamu(subdomain);

-- Tambahkan komentar penjelasan
COMMENT ON COLUMN public.tamu.subdomain IS 'Subdomain dari client yang bersangkutan untuk pemetaan sinkronisasi GAS/Spreadsheet';
