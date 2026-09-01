// api/sortir.js — Unified Serverless Dispatcher for SapaTamu Sortir (Vercel Free Tier Monolith)
// Consolidates all Sortir SaaS backend tools into 1 single file to stay within Vercel Free Tier 12-function limit.

import crypto from 'crypto';

const SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u";
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "Mid-server-YOUR-KEY";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GAS_URL = process.env.GAS_URL || "https://script.google.com/macros/s/AKfycbz5zBOJIO-b0MP-oqWhIUehqQaPbQt5pK9cMpTOYlj1pyT19LFD4VwynyJt_EAayBE/exec";
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || true;

const MIDTRANS_API_URL = IS_PRODUCTION 
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

const FONNTE_TOKEN = process.env.FONNTE_TOKEN || "fRx1Canf4GYroBZZNfo7";

// Helper: Hash password
function hashPassword(password) {
  const salt = 'sapatamu_sortir_salt_2026';
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// Helper: Format and sanitize WhatsApp phone number to standard E.164 (default: 62)
function formatWhatsappNumber(phone, defaultCountry = '62') {
  if (!phone) return '';
  let clean = phone.toString().replace(/[^\d]/g, '');
  if (clean.startsWith('0')) {
    clean = defaultCountry + clean.substring(1);
  } else if (clean.startsWith('8')) {
    clean = defaultCountry + clean;
  }
  return clean;
}

// Helper: Send WhatsApp message via Fonnte API
async function sendFonnteWA(targetPhone, message) {
  if (!targetPhone || !message) return { status: false, reason: 'Target or message missing' };
  try {
    const cleanTarget = formatWhatsappNumber(targetPhone);
    const formData = new URLSearchParams();
    formData.append('target', cleanTarget);
    formData.append('message', message);
    formData.append('countryCode', '62');

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': FONNTE_TOKEN
      },
      body: formData
    });
    const resData = await response.json();
    return resData;
  } catch (err) {
    console.error('Fonnte send error:', err);
    return { status: false, reason: err.message };
  }
}

// Helper: Write audit activity to sortir_logs
async function logSortirActivity(vendorId, actionType, channel, target, status, details = {}) {
  try {
    await fetch(`${SB_URL}/rest/v1/sortir_logs`, {
      method: 'POST',
      headers: {
        'apikey': SB_SERVICE_KEY,
        'Authorization': `Bearer ${SB_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vendor_id: vendorId || null,
        action_type: actionType,
        channel: channel,
        target: target || '-',
        status: status,
        details: details
      })
    });
  } catch (e) {
    console.warn('Logging to sortir_logs failed:', e.message);
  }
}

// Helper: Send OTP email via Google Apps Script Mailer / SMTP
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

// Helper: Send PRO Reminder Email
async function sendReminderEmail(email, vendorName, daysLeft, expiresAtFormatted) {
  const htmlBody = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #FFF9F5; border: 1px solid #F0E6DE; border-radius: 20px; color: #4A3F35;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #C8962E; margin: 0; font-size: 24px; font-weight: 800;">👑 SapaTamu Sortir PRO</h2>
        <p style="color: #8C7560; font-size: 13px; margin: 4px 0 0 0;">Pengingat Masa Aktif Paket PRO</p>
      </div>
      <div style="background: #FFFFFF; border-radius: 16px; padding: 24px; box-shadow: 0 4px 16px rgba(74,63,53,0.06);">
        <p style="font-size: 14px; margin-top: 0; color: #4A3F35;">Halo <strong>${vendorName || 'Kak'}</strong>,</p>
        <p style="font-size: 13px; color: #8C7560; line-height: 1.6;">
          Masa aktif paket <strong>SapaTamu Sortir PRO</strong> Anda akan berakhir dalam <strong style="color: #E07B7B;">${daysLeft} hari lagi</strong> (pada <strong>${expiresAtFormatted}</strong>).
        </p>
        <p style="font-size: 13px; color: #8C7560; line-height: 1.6;">
          Agar fitur <strong>Unlimited Culling Event</strong> dan akses seleksi foto klien Anda tetap aktif tanpa batas kuota, yuk lakukan perpanjangan paket Anda sekarang.
        </p>
        <div style="text-align: center; margin: 28px 0 16px;">
          <a href="https://sapatamu.id/sortir" style="background: linear-gradient(135deg, #2E7D32, #4CAF50); color: white; padding: 14px 28px; border-radius: 30px; text-decoration: none; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 6px 18px rgba(76,175,80,0.3);">
            Perpanjang Paket PRO Sekarang 💳
          </a>
        </div>
      </div>
      <p style="text-align: center; font-size: 11px; color: #B0A090; margin-top: 24px;">
        &copy; ${new Date().getFullYear()} SapaTamu.id — Platform Alur Culling Foto Modern
      </p>
    </div>
  `;

  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendCustomEmail',
        recipient: email,
        subject: `[Pengingat] Paket SapaTamu Sortir PRO Anda berakhir dalam ${daysLeft} hari`,
        htmlBody: htmlBody
      })
    });
    return await res.json();
  } catch (err) {
    console.error('Reminder email send error:', err);
    return { success: false, error: err.message };
  }
}

// Helper: Send Reset Password Email
async function sendResetPasswordEmail(email, vendorName, resetUrl) {
  const htmlBody = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #FFF9F5; border: 1px solid #F0E6DE; border-radius: 20px; color: #4A3F35;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #C8962E; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">SapaTamu Sortir</h2>
        <p style="color: #8C7560; font-size: 13px; margin: 4px 0 0 0;">Pengaturan Ulang Kata Sandi Akun</p>
      </div>
      <div style="background: #FFFFFF; border-radius: 16px; padding: 24px; box-shadow: 0 4px 16px rgba(74,63,53,0.06); text-align: center;">
        <p style="font-size: 14px; margin-top: 0; color: #4A3F35;">Halo <strong>${vendorName || 'Fotografer'}</strong>,</p>
        <p style="font-size: 13px; color: #8C7560; line-height: 1.6;">
          Kami menerima permintaan untuk mengatur ulang kata sandi akun SapaTamu Sortir Anda. Klik tombol di bawah ini untuk membuat kata sandi baru:
        </p>
        <div style="margin: 28px 0 20px;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #E07B7B, #C8962E); color: white; padding: 14px 28px; border-radius: 30px; text-decoration: none; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 6px 18px rgba(224,123,123,0.3);">
            Atur Ulang Kata Sandi 🔐
          </a>
        </div>
        <p style="font-size: 12px; color: #A89584; margin-bottom: 0; line-height: 1.5;">
          ⏱️ Tautan ini aman dan hanya berlaku selama <strong>15 menit</strong>.<br>
          Jika Anda tidak meminta perubahan kata sandi, silakan abaikan email ini.
        </p>
      </div>
      <p style="text-align: center; font-size: 11px; color: #B0A090; margin-top: 24px;">
        &copy; ${new Date().getFullYear()} SapaTamu.id — All rights reserved.
      </p>
    </div>
  `;

  try {
    const gasPayload = {
      action: 'sendCustomEmail',
      recipient: email,
      subject: `[SapaTamu Sortir] Permintaan Reset Kata Sandi Akun`,
      htmlBody: htmlBody
    };

    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gasPayload)
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to send reset email via GAS mailer:', err);
    return false;
  }
}

// Drive helpers for recursive folder listing
async function driveList(q, pageToken = null) {
  const fields = 'nextPageToken,files(id,name,mimeType,parents,thumbnailLink)';
  let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&key=${GOOGLE_API_KEY}&fields=${encodeURIComponent(fields)}&pageSize=1000&orderBy=name`;
  if (pageToken) url += `&pageToken=${pageToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Drive API error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function collectFiles(folderId, depth = 0) {
  if (depth > 5) return [];
  const results = [];
  let pageToken = null;

  do {
    const data = await driveList(`'${folderId}' in parents and trashed = false`, pageToken);
    const items = data.files || [];

    for (const item of items) {
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        const subFiles = await collectFiles(item.id, depth + 1);
        results.push(...subFiles);
      } else {
        results.push(item);
      }
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ROUTER / DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Normalize action name from query param or body or sub-path endpoint
  let action = req.query.action || req.query.endpoint || (req.body && req.body.action) || '';
  if (action.startsWith('/')) action = action.substring(1);
  action = action.replace(/-/g, '_').toLowerCase();

  try {
    // 1. ACTION: SEND OTP
    if (action === 'send_otp') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
      const { email, vendorName, whatsapp } = req.body;
      const cleanEmail = (email || '').toLowerCase().trim();

      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        return res.status(400).json({ error: 'Format email tidak valid.' });
      }

      // Check existing vendor
      const checkRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors?email=eq.${encodeURIComponent(cleanEmail)}&select=id`, {
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
      });
      const existing = await checkRes.json();
      if (existing && existing.length > 0) {
        return res.status(400).json({ error: 'Email ini sudah terdaftar. Silakan langsung masuk (Login).' });
      }

      // Cooldown 60s
      const recentOtpRes = await fetch(`${SB_URL}/rest/v1/sortir_otps?email=eq.${encodeURIComponent(cleanEmail)}&is_used=eq.false&order=created_at.desc&limit=1`, {
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
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

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await fetch(`${SB_URL}/rest/v1/sortir_otps`, {
        method: 'POST',
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ email: cleanEmail, otp_code: otpCode, expires_at: expiresAt, is_used: false })
      });

      // Send OTP via WhatsApp if phone is provided
      if (whatsapp) {
        const cleanPhone = formatWhatsappNumber(whatsapp, '62');
        const waMsg = `*KODE VERIFIKASI OTP SAPATAMU SORTIR*\n\nKode OTP Anda adalah: *${otpCode}*\n\nKode ini berlaku selama 5 menit untuk aktivasi akun SapaTamu Sortir Anda (Free 10x Event Culling). Jangan bagikan kode ini kepada siapapun.`;
        sendFonnteWA(cleanPhone, waMsg).catch(() => {});
      }

      // Send OTP via Email
      sendOtpEmail(cleanEmail, vendorName, otpCode).catch(() => {});

      return res.status(200).json({
        success: true,
        message: `Kode OTP 6-digit telah dikirim ke WhatsApp / Email ${cleanEmail}. Silakan periksa pesan Anda.`,
        email: cleanEmail
      });
    }

    // 1b. ACTION: FORGOT PASSWORD (REQUEST RESET LINK VIA WHATSAPP & EMAIL)
    if (action === 'forgot_password') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
      const { email, identifier } = req.body;
      const rawInput = (email || identifier || '').trim();

      if (!rawInput) return res.status(400).json({ error: 'Email atau No. WhatsApp wajib diisi.' });

      let vendor = null;

      if (rawInput.includes('@')) {
        const cleanEmail = rawInput.toLowerCase();
        const checkRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors?email=eq.${encodeURIComponent(cleanEmail)}&select=*`, {
          headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
        });
        const existing = await checkRes.json();
        if (existing && existing.length > 0) vendor = existing[0];
      } else {
        const cleanPhone = formatWhatsappNumber(rawInput, '62');
        const checkRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors?or=(whatsapp_number.eq.${encodeURIComponent(cleanPhone)},whatsapp_number.eq.${encodeURIComponent(rawInput)})&select=*`, {
          headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
        });
        const existing = await checkRes.json();
        if (existing && existing.length > 0) vendor = existing[0];
      }

      if (!vendor) {
        return res.status(404).json({ error: 'Akun dengan email / nomor WhatsApp tersebut tidak terdaftar sebagai vendor fotografer.' });
      }

      const cleanEmail = vendor.email.toLowerCase();
      const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      // Store token in sortir_otps (valid for 15 minutes)
      await fetch(`${SB_URL}/rest/v1/sortir_otps`, {
        method: 'POST',
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ email: cleanEmail, otp_code: resetToken, expires_at: expiresAt, is_used: false })
      });

      const resetUrl = `https://sapatamu.id/sortir?action=reset_password&token=${resetToken}&email=${encodeURIComponent(cleanEmail)}`;

      // 1. Send via WhatsApp (Fonnte) — Instant delivery
      let waSent = false;
      if (vendor.whatsapp_number) {
        const waMsg = `🔐 *Reset Kata Sandi SapaTamu Sortir*\n\nHalo Kak *${vendor.vendor_name || 'Fotografer'}*!\nKami menerima permintaan untuk mengatur ulang kata sandi akun SapaTamu Sortir Anda (*${vendor.email}*).\n\nSilakan klik tautan berikut untuk membuat password baru:\n👉 ${resetUrl}\n\n⏱️ _Tautan ini aman dan hanya berlaku selama 15 menit. Jika bukan Anda yang meminta, abaikan pesan ini._`;
        const waRes = await sendFonnteWA(vendor.whatsapp_number, waMsg);
        waSent = waRes && waRes.status === true;
      }

      // 2. Send via Email (GAS)
      sendResetPasswordEmail(cleanEmail, vendor.vendor_name, resetUrl).catch(() => {});

      // Audit log
      await logSortirActivity(vendor.id, 'AUTH_FORGOT_PASSWORD_REQUEST', waSent ? 'WA+EMAIL' : 'EMAIL', cleanEmail, 'SUCCESS');

      const maskedPhone = vendor.whatsapp_number 
        ? vendor.whatsapp_number.replace(/(\d{4})\d+(\d{4})/, '$1****$2')
        : '';

      const returnMsg = maskedPhone 
        ? `Tautan reset kata sandi telah dikirim ke WhatsApp (${maskedPhone}) dan Email Anda. Silakan periksa pesan masuk Anda (berlaku 15 menit).`
        : `Tautan reset kata sandi telah dikirim ke email Anda. Silakan periksa kotak masuk atau spam (berlaku 15 menit).`;

      return res.status(200).json({
        success: true,
        message: returnMsg,
        email: cleanEmail,
        phone: maskedPhone
      });
    }

    // 1c. ACTION: VERIFY RESET PASSWORD (SAVE NEW PASSWORD WITH PREVIOUS CHECK)
    if (action === 'verify_reset_password') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
      const { email, token, newPassword } = req.body;
      const cleanEmail = (email || '').toLowerCase().trim();
      const cleanToken = (token || '').trim();

      if (!cleanEmail || !cleanToken || !newPassword) {
        return res.status(400).json({ error: 'Data reset password tidak lengkap.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
      }

      // Check token in sortir_otps
      const nowIso = new Date().toISOString();
      const otpRes = await fetch(`${SB_URL}/rest/v1/sortir_otps?email=eq.${encodeURIComponent(cleanEmail)}&otp_code=eq.${encodeURIComponent(cleanToken)}&is_used=eq.false&expires_at=gt.${nowIso}&order=created_at.desc&limit=1`, {
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
      });
      const validTokens = await otpRes.json();

      if (!validTokens || validTokens.length === 0) {
        return res.status(400).json({ error: 'Tautan reset password tidak valid atau telah kadaluarsa (berlaku 15 menit). Silakan minta tautan baru.' });
      }

      // Fetch current vendor
      const vRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors?email=eq.${encodeURIComponent(cleanEmail)}&select=*`, {
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
      });
      const vendors = await vRes.json();
      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ error: 'Akun vendor tidak ditemukan.' });
      }

      const vendor = vendors[0];
      const newPwdHash = hashPassword(newPassword);

      // FORBID USING PREVIOUS PASSWORD
      if (vendor.password_hash && vendor.password_hash === newPwdHash) {
        return res.status(400).json({ error: 'Password baru tidak boleh sama dengan password sebelumnya. Silakan gunakan password yang berbeda.' });
      }

      // Update password hash
      const updateRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors?id=eq.${vendor.id}`, {
        method: 'PATCH',
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password_hash: newPwdHash,
          updated_at: nowIso
        })
      });

      if (!updateRes.ok) {
        return res.status(500).json({ error: 'Gagal memperbarui password akun.' });
      }

      // Invalidate token
      await fetch(`${SB_URL}/rest/v1/sortir_otps?id=eq.${validTokens[0].id}`, {
        method: 'PATCH',
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_used: true })
      });

      // Audit log
      await logSortirActivity(vendor.id, 'AUTH_RESET_PASSWORD_SUCCESS', 'SYSTEM', cleanEmail, 'SUCCESS');

      return res.status(200).json({
        success: true,
        message: 'Kata sandi Anda berhasil diperbarui! Silakan masuk kembali menggunakan kata sandi baru Anda.'
      });
    }

    // 2. ACTION: VERIFY REGISTER
    if (action === 'verify_register') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
      const { email, otpCode, vendorName, password, whatsappNumber } = req.body;
      const cleanEmail = (email || '').toLowerCase().trim();
      const cleanOtp = (otpCode || '').trim();

      if (!cleanEmail || !cleanOtp || !password) return res.status(400).json({ error: 'Data registrasi tidak lengkap.' });
      if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter.' });

      const nowIso = new Date().toISOString();
      const otpRes = await fetch(`${SB_URL}/rest/v1/sortir_otps?email=eq.${encodeURIComponent(cleanEmail)}&otp_code=eq.${encodeURIComponent(cleanOtp)}&is_used=eq.false&expires_at=gt.${nowIso}&order=created_at.desc&limit=1`, {
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
      });
      const validOtps = await otpRes.json();

      if (!validOtps || validOtps.length === 0) {
        return res.status(400).json({ error: 'Kode OTP salah atau telah kadaluarsa (berlaku 5 menit).' });
      }

      await fetch(`${SB_URL}/rest/v1/sortir_otps?id=eq.${validOtps[0].id}`, {
        method: 'PATCH',
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_used: true })
      });

      const pwdHash = hashPassword(password);
      const cleanWa = formatWhatsappNumber(whatsappNumber);

      const insertRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors`, {
        method: 'POST',
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({
          vendor_name: (vendorName || cleanEmail.split('@')[0]).trim(),
          email: cleanEmail,
          password_hash: pwdHash,
          whatsapp_number: cleanWa,
          free_quota_remaining: 10,
          subscription_plan: 'free',
          is_active: true
        })
      });

      if (!insertRes.ok) {
        return res.status(500).json({ error: 'Gagal membuat akun vendor.', detail: await insertRes.text() });
      }

      const created = await insertRes.json();
      const newVendor = created[0];

      // Record audit log
      await logSortirActivity(newVendor.id, 'AUTH_REGISTER', 'SYSTEM', cleanEmail, 'SUCCESS', {
        vendor_name: newVendor.vendor_name,
        whatsapp_number: newVendor.whatsapp_number
      });

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

    // 3. ACTION: LOGIN
    if (action === 'login') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
      const { email, password } = req.body;
      const cleanEmail = (email || '').toLowerCase().trim();

      if (!cleanEmail || !password) return res.status(400).json({ error: 'Email dan password wajib diisi.' });

      const pwdHash = hashPassword(password);
      const vendorRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors?email=eq.${encodeURIComponent(cleanEmail)}&password_hash=eq.${pwdHash}&select=*`, {
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
      });

      const vendors = await vendorRes.json();
      if (!vendors || vendors.length === 0) return res.status(401).json({ error: 'Email atau password salah.' });

      const vendor = vendors[0];
      if (!vendor.is_active) return res.status(403).json({ error: 'Akun vendor Anda sedang dinonaktifkan.' });

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

    // 4. ACTION: GET PROFILE
    if (action === 'get_profile') {
      const { vendorId } = req.method === 'POST' ? req.body : req.query;
      if (!vendorId) return res.status(400).json({ error: 'Missing vendorId' });

      const resVendor = await fetch(`${SB_URL}/rest/v1/sortir_vendors?id=eq.${vendorId}&select=*`, {
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
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

    // 5. ACTION: CREATE PAYMENT (MIDTRANS SNAP)
    if (action === 'create_payment') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
      const { vendorId, vendorName, email, whatsapp, planType } = req.body;

      if (!vendorId || !planType) return res.status(400).json({ error: 'Missing vendorId or planType' });

      const isYearly = planType === 'yearly';
      const price = isYearly ? 250000 : 25000;
      const planLabel = isYearly ? 'PRO Tahunan (1 Tahun - Hemat 50rb)' : 'PRO Bulanan (1 Bulan)';

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const orderId = `SORT-${Date.now()}-${randomSuffix}`;
      const base64Auth = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');

      const midtransPayload = {
        transaction_details: { order_id: orderId, gross_amount: price },
        item_details: [{ id: `sortir_${planType}`, price: price, quantity: 1, name: `SapaTamu Sortir ${planLabel}` }],
        customer_details: { first_name: vendorName || 'Vendor SapaTamu', email: email || 'vendor@sapatamu.id', phone: whatsapp || '' },
        callbacks: { finish: `https://sapatamu.id/sortir?payment=success&order_id=${orderId}` }
      };

      const midtransRes = await fetch(MIDTRANS_API_URL, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Basic ${base64Auth}` },
        body: JSON.stringify(midtransPayload)
      });

      let snapToken = null;
      let redirectUrl = null;

      if (midtransRes.ok) {
        const midtransData = await midtransRes.json();
        snapToken = midtransData.token;
        redirectUrl = midtransData.redirect_url;
      } else {
        console.warn('Midtrans API fallback (mock token):', await midtransRes.text());
        snapToken = `MOCK-SNAP-${Date.now()}`;
      }

      await fetch(`${SB_URL}/rest/v1/sortir_transactions`, {
        method: 'POST',
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          order_id: orderId,
          plan_type: planType,
          gross_amount: price,
          payment_status: 'pending',
          snap_token: snapToken
        })
      });

      return res.status(200).json({
        success: true,
        orderId: orderId,
        token: snapToken,
        redirectUrl: redirectUrl,
        amount: price,
        planType: planType
      });
    }

    // 6. ACTION: PAYMENT WEBHOOK (MIDTRANS CALLBACK)
    if (action === 'payment_webhook') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
      const notification = req.body;
      const { order_id, status_code, gross_amount, signature_key, transaction_status } = notification;

      if (!order_id || !status_code || !gross_amount || !signature_key) {
        return res.status(400).json({ error: 'Invalid notification payload' });
      }

      const payloadString = order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY;
      const computedSignature = crypto.createHash('sha512').update(payloadString).digest('hex');

      if (computedSignature !== signature_key) {
        console.warn(`[Webhook Sortir] Signature mismatch for order: ${order_id}`);
        return res.status(401).json({ error: 'Signature mismatch' });
      }

      const isPaymentSuccess = transaction_status === 'settlement' || transaction_status === 'capture';

      if (isPaymentSuccess) {
        const trxRes = await fetch(`${SB_URL}/rest/v1/sortir_transactions?order_id=eq.${encodeURIComponent(order_id)}&select=*`, {
          headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
        });
        const transactions = await trxRes.json();

        if (transactions && transactions.length > 0) {
          const trx = transactions[0];
          await fetch(`${SB_URL}/rest/v1/rpc/activate_sortir_subscription`, {
            method: 'POST',
            headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              p_vendor_id: trx.vendor_id,
              p_order_id: order_id,
              p_plan_type: trx.plan_type || 'monthly'
            })
          });
          console.log(`[Webhook Sortir] Subscription activated for order ${order_id}`);
        }
      }

      return res.status(200).json({ success: true });
    }

    // 6b. ACTION: CHECK / VERIFY PAYMENT (CLIENT-SIDE SYNC AFTER SNAP)
    if (action === 'check_payment' || action === 'verify_payment') {
      const { orderId, vendorId } = req.method === 'POST' ? req.body : req.query;
      const targetOrderId = (orderId || '').trim();

      if (!targetOrderId && !vendorId) {
        return res.status(400).json({ error: 'Missing orderId or vendorId' });
      }

      // Query latest transaction
      let queryUrl = `${SB_URL}/rest/v1/sortir_transactions?order=created_at.desc&limit=1`;
      if (targetOrderId) queryUrl += `&order_id=eq.${encodeURIComponent(targetOrderId)}`;
      else if (vendorId) queryUrl += `&vendor_id=eq.${encodeURIComponent(vendorId)}`;

      const trxRes = await fetch(queryUrl, {
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
      });
      const transactions = await trxRes.json();

      if (!transactions || transactions.length === 0) {
        return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
      }

      const trx = transactions[0];

      // Check with Midtrans API directly if server key configured
      let isSettled = trx.payment_status === 'settlement' || trx.payment_status === 'capture';
      if (!isSettled && MIDTRANS_SERVER_KEY && MIDTRANS_SERVER_KEY !== 'Mid-server-YOUR-KEY') {
        try {
          const authHeader = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');
          const midtransStatusRes = await fetch(`https://api.midtrans.com/v2/${trx.order_id}/status`, {
            headers: { 'Accept': 'application/json', 'Authorization': `Basic ${authHeader}` }
          });
          if (midtransStatusRes.ok) {
            const mData = await midtransStatusRes.json();
            if (mData.transaction_status === 'settlement' || mData.transaction_status === 'capture') {
              isSettled = true;
            }
          }
        } catch (err) {
          console.warn('Midtrans status check error:', err);
        }
      }

      if (isSettled) {
        // Activate subscription via RPC
        const rpcRes = await fetch(`${SB_URL}/rest/v1/rpc/activate_sortir_subscription`, {
          method: 'POST',
          headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            p_vendor_id: trx.vendor_id,
            p_order_id: trx.order_id,
            p_plan_type: trx.plan_type || 'monthly'
          })
        });
        const rpcData = await rpcRes.json();

        // Get fresh vendor profile
        const vRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors?id=eq.${trx.vendor_id}&select=*`, {
          headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
        });
        const vData = await vRes.json();
        const v = (vData && vData[0]) || {};

        return res.status(200).json({
          success: true,
          is_settled: true,
          vendor: {
            id: v.id,
            vendor_name: v.vendor_name,
            email: v.email,
            free_quota_remaining: v.free_quota_remaining,
            subscription_plan: v.subscription_plan,
            subscription_expires_at: v.subscription_expires_at,
            is_pro: true
          }
        });
      }

      return res.status(200).json({
        success: true,
        is_settled: false,
        payment_status: trx.payment_status
      });
    }

    // 6c. ACTION: RUN PRO EXPIRATION REMINDER CRON (H-7, H-3, H-1 NOTIFICATIONS)
    if (action === 'run_reminder_cron' || action === 'check_pro_reminders') {
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Query active PRO vendors expiring in <= 7 days
      const vRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors?subscription_plan=neq.free&subscription_expires_at=gt.${now.toISOString()}&subscription_expires_at=lte.${in7Days.toISOString()}&select=*`, {
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
      });
      const vendors = await vRes.json();

      const results = [];

      for (const v of (vendors || [])) {
        const expDate = new Date(v.subscription_expires_at);
        const daysLeft = Math.max(1, Math.ceil((expDate - now) / (1000 * 60 * 60 * 24)));
        const expFormatted = expDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        // Cooldown check: prevent sending duplicate reminder within 20 hours
        if (v.last_reminder_sent_at) {
          const lastSent = new Date(v.last_reminder_sent_at);
          const hoursSinceLast = (now - lastSent) / (1000 * 60 * 60);
          if (hoursSinceLast < 20) {
            results.push({ vendor_id: v.id, vendor_name: v.vendor_name, status: 'SKIPPED_COOLDOWN', days_left: daysLeft });
            continue;
          }
        }

        // 1. Send WhatsApp Notification via Fonnte
        let waResult = null;
        if (v.whatsapp_number) {
          const waMsg = `Halo Kak *${v.vendor_name || 'Fotografer'}*! 👋\n\nKami ingin menginformasikan bahwa paket *SapaTamu Sortir PRO* Anda akan berakhir dalam *${daysLeft} hari lagi* (pada tanggal *${expFormatted}*).\n\nAgar klien Anda tetap dapat melakukan seleksi foto secara lancar tanpa hambatan kuota, yuk perpanjang paket Anda sekarang:\n👉 https://sapatamu.id/sortir\n\nTerima kasih telah mempercayakan alur culling foto Anda bersama SapaTamu! ✨`;
          waResult = await sendFonnteWA(v.whatsapp_number, waMsg);
          await logSortirActivity(v.id, `REMINDER_PRO_H${daysLeft}`, 'WHATSAPP', v.whatsapp_number, waResult && waResult.status ? 'SUCCESS' : 'FAILED', waResult);
        }

        // 2. Send Email Notification
        let emailResult = null;
        if (v.email) {
          emailResult = await sendReminderEmail(v.email, v.vendor_name, daysLeft, expFormatted);
          await logSortirActivity(v.id, `REMINDER_PRO_H${daysLeft}`, 'EMAIL', v.email, emailResult && emailResult.status === 'success' ? 'SUCCESS' : 'SENT', emailResult);
        }

        // 3. Update last_reminder_sent_at on vendor record
        await fetch(`${SB_URL}/rest/v1/sortir_vendors?id=eq.${v.id}`, {
          method: 'PATCH',
          headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ last_reminder_sent_at: now.toISOString() })
        });

        results.push({
          vendor_id: v.id,
          vendor_name: v.vendor_name,
          email: v.email,
          whatsapp: v.whatsapp_number,
          days_left: daysLeft,
          wa_result: waResult,
          email_result: emailResult
        });
      }

      return res.status(200).json({
        success: true,
        checked_count: (vendors || []).length,
        results: results
      });
    }

    // 6d. ACTION: GET SORTIR LOGS (FOR OWNER/ADMIN AUDIT)
    if (action === 'get_sortir_logs') {
      const limit = parseInt(req.query.limit || '50');
      const logRes = await fetch(`${SB_URL}/rest/v1/sortir_logs?order=created_at.desc&limit=${limit}&select=*,sortir_vendors(vendor_name,email)`, {
        headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
      });
      const logs = await logRes.json();
      return res.status(200).json({ success: true, logs: logs || [] });
    }

    // 7. ACTION: DRIVE IMAGE PROXY
    if (action === 'drive_img') {
      const { id, sz = 'w1600' } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing id parameter' });

      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
      const urlsToTry = [
        `https://lh3.googleusercontent.com/d/${id}=${sz}`,
        `https://lh3.googleusercontent.com/d/${id}`,
        `https://drive.google.com/thumbnail?id=${id}&sz=${sz}`,
        `https://drive.google.com/uc?export=download&id=${id}`
      ];

      for (const targetUrl of urlsToTry) {
        try {
          const response = await fetch(targetUrl, {
            redirect: 'follow',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          });
          if (response.ok) {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.toLowerCase().startsWith('image/')) {
              res.setHeader('Content-Type', contentType);
              const arrayBuffer = await response.arrayBuffer();
              return res.status(200).send(Buffer.from(arrayBuffer));
            }
          }
        } catch (e) {
          console.error(`Proxy fetch error for ${targetUrl}:`, e);
        }
      }
      return res.status(500).json({ error: 'Failed to fetch image from Google Drive' });
    }

    // 8. ACTION: LIST DRIVE RECURSIVE
    if (action === 'list_drive') {
      const { folderId } = req.query;
      if (!folderId) return res.status(400).json({ error: 'Missing folderId parameter' });
      if (!GOOGLE_API_KEY) return res.status(500).json({ error: 'GOOGLE_API_KEY not configured' });

      const files = await collectFiles(folderId);
      const imageExts = /\.(jpg|jpeg|png|gif|webp|heic|tif|tiff|cr2|cr3|nef|arw|dng|raf|rw2|orf|raw)$/i;
      const imageFiles = files.filter(f => imageExts.test(f.name) || (f.mimeType && f.mimeType.startsWith('image/')));

      return res.status(200).json(imageFiles);
    }

    // Default fallback
    return res.status(400).json({ error: `Action '${action}' tidak dikenali pada endpoint sortir.` });

  } catch (err) {
    console.error('Unified sortir handler error:', err);
    return res.status(500).json({ error: 'Internal Server Error', detail: err.message });
  }
}
