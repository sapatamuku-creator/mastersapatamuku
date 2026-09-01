// api/sortir-auth.js — SapaTamu Sortir SaaS Authentication & OTP Endpoint
// Handles vendor registration with 6-digit email OTP, login, and session validation.

import crypto from 'crypto';

const SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u";
const GAS_URL = process.env.GAS_URL || "https://script.google.com/macros/s/AKfycbyC9-H72dZl1H7vIqg4dE4pL7pT9zQ8x/exec"; // Fallback GAS mailer

// Helper to hash password with SHA-256 + salt
function hashPassword(password) {
  const salt = 'sapatamu_sortir_salt_2026';
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// Helper to send email via GAS or fallback fetch
async function sendOtpEmail(email, vendorName, otpCode) {
  const htmlBody = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #FFF9F5; border: 1px solid #F0E6DE; border-radius: 20px; color: #4A3F35;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #C8962E; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">SapaTamu Sortir</h2>
        <p style="color: #8C7560; font-size: 13px; margin: 4px 0 0 0;">Platform Culling & Seleksi Foto Fotografer</p>
      </div>
      
      <div style="background: #FFFFFF; border-radius: 16px; padding: 24px; box-shadow: 0 4px 16px rgba(74,63,53,0.06); text-align: center;">
        <p style="font-size: 14px; margin-top: 0; color: #4A3F35;">Halo <strong>${vendorName || 'Fotografer'}</strong>,</p>
        <p style="font-size: 13px; color: #8C7560; line-height: 1.6;">
          Gunakan kode OTP berikut untuk memverifikasi email Anda dan mengaktifkan akun <strong>Free Tier (10x Event Culling)</strong>:
        </p>
        
        <div style="margin: 24px 0; padding: 16px; background: #FDF8F4; border: 2px dashed #C8962E; border-radius: 12px;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #C8962E; font-family: monospace;">${otpCode}</span>
        </div>
        
        <p style="font-size: 12px; color: #A89584; margin-bottom: 0;">
          ⏱️ Kode ini berlaku selama <strong>5 menit</strong>. Jangan bagikan kode ini kepada siapa pun.
        </p>
      </div>
      
      <p style="text-align: center; font-size: 11px; color: #B0A090; margin-top: 24px;">
        &copy; ${new Date().getFullYear()} SapaTamu.id — All rights reserved.
      </p>
    </div>
  `;

  // Attempt sending via GAS Mailer endpoint if configured
  try {
    const gasPayload = {
      action: 'sendCustomEmail',
      recipient: email,
      subject: `[SapaTamu Sortir] Kode OTP Anda: ${otpCode}`,
      htmlBody: htmlBody
    };

    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gasPayload)
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to send email via GAS mailer:', err);
    return false;
  }
}

export default async function handler(req, res) {
  // Dynamic CORS headers
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { action } = req.query || req.body;

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. ACTION: SEND OTP (Registrasi Akun Baru)
    // ─────────────────────────────────────────────────────────────
    if (action === 'send_otp') {
      const { email, vendorName } = req.body;
      const cleanEmail = (email || '').toLowerCase().trim();

      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        return res.status(400).json({ error: 'Format email tidak valid.' });
      }

      // a. Cek apakah email sudah terdaftar di sortir_vendors
      const checkRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors?email=eq.${encodeURIComponent(cleanEmail)}&select=id`, {
        headers: {
          'apikey': SB_SERVICE_KEY,
          'Authorization': `Bearer ${SB_SERVICE_KEY}`
        }
      });
      const existing = await checkRes.json();
      if (existing && existing.length > 0) {
        return res.status(400).json({ error: 'Email ini sudah terdaftar. Silakan langsung masuk (Login).' });
      }

      // b. Cek cooldown kirim ulang OTP (60 detik)
      const nowIso = new Date().toISOString();
      const recentOtpRes = await fetch(`${SB_URL}/rest/v1/sortir_otps?email=eq.${encodeURIComponent(cleanEmail)}&is_used=eq.false&order=created_at.desc&limit=1`, {
        headers: {
          'apikey': SB_SERVICE_KEY,
          'Authorization': `Bearer ${SB_SERVICE_KEY}`
        }
      });
      const recentOtps = await recentOtpRes.json();
      if (recentOtps && recentOtps.length > 0) {
        const lastCreated = new Date(recentOtps[0].created_at).getTime();
        const elapsed = (Date.now() - lastCreated) / 1000;
        if (elapsed < 60) {
          const waitSec = Math.ceil(60 - elapsed);
          return res.status(429).json({ error: `Harap tunggu ${waitSec} detik sebelum meminta kode OTP baru.` });
        }
      }

      // c. Generate 6-Digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 menit

      // d. Simpan ke database sortir_otps
      await fetch(`${SB_URL}/rest/v1/sortir_otps`, {
        method: 'POST',
        headers: {
          'apikey': SB_SERVICE_KEY,
          'Authorization': `Bearer ${SB_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          email: cleanEmail,
          otp_code: otpCode,
          expires_at: expiresAt,
          is_used: false
        })
      });

      // e. Kirim Email OTP
      await sendOtpEmail(cleanEmail, vendorName, otpCode);

      return res.status(200).json({
        success: true,
        message: `Kode OTP 6-digit telah dikirim ke ${cleanEmail}. Silakan periksa kotak masuk/spam email Anda.`,
        email: cleanEmail
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ACTION: VERIFY OTP & REGISTER AKUN
    // ─────────────────────────────────────────────────────────────
    if (action === 'verify_register') {
      const { email, otpCode, vendorName, password, whatsappNumber } = req.body;
      const cleanEmail = (email || '').toLowerCase().trim();
      const cleanOtp = (otpCode || '').trim();

      if (!cleanEmail || !cleanOtp || !password) {
        return res.status(400).json({ error: 'Data registrasi tidak lengkap.' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password minimal 6 karakter.' });
      }

      // a. Verifikasi OTP di tabel sortir_otps
      const nowIso = new Date().toISOString();
      const otpRes = await fetch(`${SB_URL}/rest/v1/sortir_otps?email=eq.${encodeURIComponent(cleanEmail)}&otp_code=eq.${encodeURIComponent(cleanOtp)}&is_used=eq.false&expires_at=gt.${nowIso}&order=created_at.desc&limit=1`, {
        headers: {
          'apikey': SB_SERVICE_KEY,
          'Authorization': `Bearer ${SB_SERVICE_KEY}`
        }
      });
      const validOtps = await otpRes.json();

      if (!validOtps || validOtps.length === 0) {
        return res.status(400).json({ error: 'Kode OTP salah atau telah kadaluarsa (berlaku 5 menit).' });
      }

      const otpId = validOtps[0].id;

      // b. Tandai OTP sudah digunakan
      await fetch(`${SB_URL}/rest/v1/sortir_otps?id=eq.${otpId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SB_SERVICE_KEY,
          'Authorization': `Bearer ${SB_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_used: true })
      });

      // c. Insert vendor ke sortir_vendors (Free tier kuota 10)
      const pwdHash = hashPassword(password);
      const insertRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors`, {
        method: 'POST',
        headers: {
          'apikey': SB_SERVICE_KEY,
          'Authorization': `Bearer ${SB_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          vendor_name: (vendorName || cleanEmail.split('@')[0]).trim(),
          email: cleanEmail,
          password_hash: pwdHash,
          whatsapp_number: (whatsappNumber || '').trim(),
          free_quota_remaining: 10,
          subscription_plan: 'free',
          is_active: true
        })
      });

      if (!insertRes.ok) {
        const errText = await insertRes.text();
        return res.status(500).json({ error: 'Gagal membuat akun vendor.', detail: errText });
      }

      const createdVendors = await insertRes.json();
      const newVendor = createdVendors[0];

      return res.status(200).json({
        success: true,
        message: 'Registrasi berhasil! Kuota gratis 10x Event Culling telah aktif.',
        vendor: {
          id: newVendor.id,
          vendor_name: newVendor.vendor_name,
          email: newVendor.email,
          free_quota_remaining: newVendor.free_quota_remaining,
          subscription_plan: newVendor.subscription_plan,
          is_pro: false
        }
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. ACTION: LOGIN (Email & Password)
    // ─────────────────────────────────────────────────────────────
    if (action === 'login') {
      const { email, password } = req.body;
      const cleanEmail = (email || '').toLowerCase().trim();

      if (!cleanEmail || !password) {
        return res.status(400).json({ error: 'Email dan password wajib diisi.' });
      }

      const pwdHash = hashPassword(password);
      const vendorRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors?email=eq.${encodeURIComponent(cleanEmail)}&password_hash=eq.${pwdHash}&select=*`, {
        headers: {
          'apikey': SB_SERVICE_KEY,
          'Authorization': `Bearer ${SB_SERVICE_KEY}`
        }
      });

      const vendors = await vendorRes.json();
      if (!vendors || vendors.length === 0) {
        return res.status(401).json({ error: 'Email atau password salah.' });
      }

      const vendor = vendors[0];
      if (!vendor.is_active) {
        return res.status(403).json({ error: 'Akun vendor Anda sedang dinonaktifkan.' });
      }

      const isPro = vendor.subscription_expires_at && new Date(vendor.subscription_expires_at) > new Date();

      return res.status(200).json({
        success: true,
        message: 'Login berhasil.',
        vendor: {
          id: vendor.id,
          vendor_name: vendor.vendor_name,
          email: vendor.email,
          whatsapp_number: vendor.whatsapp_number,
          free_quota_remaining: vendor.free_quota_remaining,
          subscription_plan: vendor.subscription_plan,
          subscription_expires_at: vendor.subscription_expires_at,
          is_pro: !!isPro
        }
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. ACTION: GET PROFILE & QUOTA STATUS
    // ─────────────────────────────────────────────────────────────
    if (action === 'get_profile') {
      const { vendorId } = req.body;
      if (!vendorId) return res.status(400).json({ error: 'Missing vendorId' });

      const resVendor = await fetch(`${SB_URL}/rest/v1/sortir_vendors?id=eq.${vendorId}&select=*`, {
        headers: {
          'apikey': SB_SERVICE_KEY,
          'Authorization': `Bearer ${SB_SERVICE_KEY}`
        }
      });

      const data = await resVendor.json();
      if (!data || data.length === 0) return res.status(404).json({ error: 'Vendor tidak ditemukan.' });

      const v = data[0];
      const isPro = v.subscription_expires_at && new Date(v.subscription_expires_at) > new Date();

      return res.status(200).json({
        success: true,
        vendor: {
          id: v.id,
          vendor_name: v.vendor_name,
          email: v.email,
          free_quota_remaining: v.free_quota_remaining,
          subscription_plan: v.subscription_plan,
          subscription_expires_at: v.subscription_expires_at,
          is_pro: !!isPro
        }
      });
    }

    return res.status(400).json({ error: `Action '${action}' tidak dikenali.` });

  } catch (err) {
    console.error('sortir-auth handler error:', err);
    return res.status(500).json({ error: 'Internal Server Error', detail: err.message });
  }
}
