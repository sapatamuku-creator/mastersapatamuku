// api/sortir-admin.js
// Vercel serverless function for Sortir Super Admin Dashboard actions.
// Secured using SapaTamu owner password verified via GAS.

const SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GAS_SYNC_URL = "https://script.google.com/macros/s/AKfycbz5zBOJIO-b0MP-oqWhIUehqQaPbQt5pK9cMpTOYlj1pyT19LFD4VwynyJt_EAayBE/exec";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { pass, action, vendorId, updates } = req.body;

  if (!SB_KEY) {
    return res.status(500).json({ error: 'Konfigurasi Vercel Belum Lengkap: Environment Variable SUPABASE_SERVICE_ROLE_KEY belum ditambahkan atau kosong.' });
  }

  if (!pass || !action) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // 1. Verify owner password with GAS
    const gasRes = await fetch(`${GAS_SYNC_URL}?action=verifyOwnerPass&pass=${encodeURIComponent(pass)}`);
    if (!gasRes.ok) {
      return res.status(401).json({ error: 'Failed to verify admin password' });
    }

    const gasData = await gasRes.json();

    // Defense-in-depth: jika action verifyOwnerPass belum terpasang di GAS,
    // endpoint/doGet lama mengembalikan {status:"success", message:"API Ready"}.
    // Tolak agar sembarang pass tidak pernah lolos.
    const readyMsg = (gasData && gasData.message) || '';
    if (gasData.status !== 'success' || /API Ready/i.test(readyMsg)) {
      return res.status(401).json({ error: 'Unauthorized: Incorrect password' });
    }

    // 2. Perform actions on Supabase using admin service key (bypassing RLS)
    if (action === 'get_vendors') {
      const dbRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors?select=*,sortir_events(id,event_name)&order=created_at.desc`, {
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!dbRes.ok) {
        const errText = await dbRes.text();
        console.error('Supabase fetch error:', errText);
        return res.status(500).json({ error: 'Failed to retrieve vendors list' });
      }

      const vendors = await dbRes.json();
      return res.status(200).json(vendors);

    } else if (action === 'update_vendor') {
      if (!vendorId || !updates) {
        return res.status(400).json({ error: 'Missing vendor ID or update data' });
      }

      const dbRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors?id=eq.${vendorId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updates)
      });

      if (!dbRes.ok) {
        const errText = await dbRes.text();
        console.error('Supabase update error:', errText);
        return res.status(500).json({ error: 'Failed to update vendor' });
      }

      const updated = await dbRes.json();
      return res.status(200).json(updated[0] || null);

    } else if (action === 'reset_vendor_password') {
      const { newPassword } = req.body;
      if (!vendorId || !newPassword) {
        return res.status(400).json({ error: 'Missing vendor ID or new password' });
      }

      const authRes = await fetch(`${SB_URL}/auth/v1/admin/users/${vendorId}`, {
        method: 'PUT',
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: newPassword
        })
      });

      if (!authRes.ok) {
        const errText = await authRes.text();
        console.error('Supabase Auth User update error:', errText);
        let errorMsg = 'Failed to reset password';
        try {
          const parsed = JSON.parse(errText);
          if (parsed.msg) errorMsg = parsed.msg;
        } catch(e){}
        return res.status(500).json({ error: errorMsg });
      }

      return res.status(200).json({ message: 'Password successfully updated' });

    } else if (action === 'link_vendor_auth') {
      // Memperbaiki vendor yang ada (dibuat sebelum Phase 2 auth) yang `user_id`-nya null.
      // Tidak menghapus/duplikasi vendor atau pricelist-nya — hanya membuat/diperbaiki
      // akun Supabase Auth lalu menautkan user_id ke baris mp_vendors yang sudah ada.
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Missing email or password' });
      }
      const cleanEmail = String(email).toLowerCase().trim();
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password minimal 6 karakter' });
      }

      // 1. Temukan vendor by email (table mp_vendors, bukan sortir_vendors)
      const findRes = await fetch(`${SB_URL}/rest/v1/mp_vendors?email=ilike.${encodeURIComponent(cleanEmail)}&select=id,email,user_id,business_name&limit=1`, {
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }
      });
      const rows = findRes.ok ? await findRes.json() : [];
      const vendor = Array.isArray(rows) && rows[0] ? rows[0] : null;
      if (!vendor) {
        return res.status(404).json({ error: `Vendor dengan email ${cleanEmail} tidak ditemukan di mp_vendors` });
      }

      // Yakin akun auth (confirmed) ADA untuk email ini:
      const ensureAuth = async () => {
        // Pakai password yang valid di semua jalur (satu-satunya cara pasti).
        const body = JSON.stringify({ email: cleanEmail, password, email_confirm: true });

        // Jalur A: user_id sudah ter-link → update akun itu
        if (vendor.user_id) {
          const upd = await fetch(`${SB_URL}/auth/v1/admin/users/${vendor.user_id}`, {
            method: 'PUT',
            headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, email_confirm: true })
          });
          if (upd.ok) return vendor.user_id;
          console.error('[auth update error]', await upd.text());
          throw new Error('Gagal memperbarui akun auth');
        }

        // Jalur B: cek user existing by email (bisa dari tes signup sebelumnya)
        let existing = null;
        try {
          const listRes = await fetch(`${SB_URL}/auth/v1/admin/users?filter=email:eq:${encodeURIComponent(cleanEmail)}`, {
            headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
          });
          if (listRes.ok) {
            const listJson = await listRes.json();
            const userList = Array.isArray(listJson) ? listJson : (listJson.users || []);
            existing = userList.find(u => (u.email || '').toLowerCase() === cleanEmail) || null;
          } else {
            console.error('[auth list filter]', listRes.status, await listRes.text());
          }
        } catch (e) {
          console.error('[auth list filter err]', e.message);
        }
        // Fallback: list semua user bila filter tak didukung
        if (!existing) {
          try {
            const allRes = await fetch(`${SB_URL}/auth/v1/admin/users?per_page=1000`, {
              headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
            });
            if (allRes.ok) {
              const allJson = await allRes.json();
              const userList = Array.isArray(allJson) ? allJson : (allJson.users || []);
              existing = userList.find(u => (u.email || '').toLowerCase() === cleanEmail) || null;
            }
          } catch (e) {
            console.error('[auth list all err]', e.message);
          }
        }
        if (existing) {
          const upd = await fetch(`${SB_URL}/auth/v1/admin/users/${existing.id}`, {
            method: 'PUT',
            headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, email_confirm: true })
          });
          if (!upd.ok) console.error('[auth update existing]', await upd.text());
          return existing.id;
        }

        // Jalur C: buat akun baru (confirmed)
        const createRes = await fetch(`${SB_URL}/auth/v1/admin/users`, {
          method: 'POST',
          headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
          body
        });
        if (!createRes.ok) {
          const errText = await createRes.text();
          console.error('[auth create error]', errText);
          let errorMsg = 'Failed to create user account';
          try { const parsed = JSON.parse(errText); if (parsed.msg) errorMsg = parsed.msg; } catch(e){}
          throw new Error(errorMsg);
        }
        const created = await createRes.json();
        return created.id || null;
      };

      const authUserId = await ensureAuth();
      if (!authUserId) {
        return res.status(500).json({ error: 'Tidak dapat memastikan akun auth untuk vendor ini' });
      }

      // 3. Tautkan user_id ke mp_vendors (hanya baris vendor ini, pricelist tak disentuh)
      const patchRes = await fetch(`${SB_URL}/rest/v1/mp_vendors?id=eq.${vendor.id}`, {
        method: 'PATCH',
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ user_id: authUserId })
      });
      if (!patchRes.ok) {
        const errText = await patchRes.text();
        console.error('[vendor link error]', errText);
        return res.status(500).json({ error: 'Akun auth dibuat, tapi gagal menautkan user_id ke vendor' });
      }
      const patched = await patchRes.json();

      return res.status(200).json({
        success: true,
        message: `Akun auth untuk ${cleanEmail} disiapkan & user_id ditautkan ke vendor "${vendor.business_name}". Pricelist tetap utuh.`,
        user_id: authUserId,
        vendor_id: vendor.id,
        email_linked: !!vendor.user_id
      });

    } else if (action === 'register_vendor_manual') {
      const { username, vendorName, whatsappAdmin, emailRecovery, password, clientName, driveFolderUrl, driveFolderId, quotaLimit } = req.body;

      if (!username || !vendorName || !whatsappAdmin || !emailRecovery || !password) {
        return res.status(400).json({ error: 'Missing required vendor parameters' });
      }

      // 1. Create auth user in Supabase
      const authRes = await fetch(`${SB_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: emailRecovery,
          password: password,
          email_confirm: true
        })
      });

      if (!authRes.ok) {
        const errText = await authRes.text();
        console.error('Supabase Auth User creation error:', errText);
        let errorMsg = 'Failed to create user account';
        try {
          const parsed = JSON.parse(errText);
          if (parsed.msg) errorMsg = parsed.msg;
        } catch(e){}
        return res.status(500).json({ error: errorMsg });
      }

      const authUser = await authRes.json();
      const userId = authUser.id;

      // 2. Insert vendor profile (subscription_expires_at = null, is_active = true)
      const vendorPayload = {
        id: userId,
        username: username.toLowerCase().replace(/[^a-z0-9]/g, ''),
        vendor_name: vendorName,
        whatsapp_admin: whatsappAdmin,
        email_recovery: emailRecovery,
        is_active: true,
        billing_cycle: 'monthly',
        subscription_expires_at: null
      };

      const dbVendorRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors`, {
        method: 'POST',
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(vendorPayload)
      });

      if (!dbVendorRes.ok) {
        const errText = await dbVendorRes.text();
        console.error('Supabase Vendor insert error:', errText);
        return res.status(500).json({ error: 'Vendor account created, but profile setup failed.' });
      }

      // 3. Optional: Create client/event if provided
      if (clientName && driveFolderUrl && driveFolderId) {
        const slug = clientName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random()*10000);
        const eventPayload = {
          vendor_id: userId,
          event_name: clientName,
          event_slug: slug,
          quota_limit: parseInt(quotaLimit) || 50,
          drive_folder_url: driveFolderUrl,
          drive_folder_id: driveFolderId
        };

        const dbEventRes = await fetch(`${SB_URL}/rest/v1/sortir_events`, {
          method: 'POST',
          headers: {
            'apikey': SB_KEY,
            'Authorization': `Bearer ${SB_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventPayload)
        });

        if (!dbEventRes.ok) {
          const errText = await dbEventRes.text();
          console.error('Supabase Event insert error:', errText);
        }
      }

      return res.status(200).json({ message: 'Vendor manually registered successfully!', vendorId: userId });

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Admin API handler error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
