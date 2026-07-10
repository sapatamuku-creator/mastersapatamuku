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
    if (gasData.status !== 'success') {
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

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Admin API handler error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
