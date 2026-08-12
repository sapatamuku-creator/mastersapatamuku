# Setup Guide: Google Drive Image Storage
## Sapatamu Marketplace — Manual Setup (4 Steps)

> [!IMPORTANT]
> Setup ini dilakukan **SEKALI** sebelum mulai coding. Estimasi waktu: **15–20 menit**.

---

## Step 1 — Buat Folder di Google Drive
1. Buat folder `sapatamu-marketplace`
2. Buat 4 subfolder: `logos`, `covers`, `gallery`, `products`

## Step 2 — Buat Google Apps Script Project Baru
1. Buka script.google.com -> `sapatamu-marketplace-upload`
2. Paste `backend/MarketplaceUpload.gs`
3. Set Script Properties (`MP_FOLDER_LOGO`, `MP_FOLDER_COVER`, `MP_FOLDER_GALLERY`, `MP_FOLDER_PRODUCT`)

## Step 3 — Deploy sebagai Web App
Deploy sebagai Aplikasi Web (Jalankan sebagai: Saya, Akses: Semua orang).

## Step 4 — Simpan URL ke Vercel Environment Variable
Set `GAS_MARKETPLACE_URL` di Vercel Dashboard.
