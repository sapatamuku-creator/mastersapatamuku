// api/sortir-get-email.js
// Vercel serverless function to resolve a vendor's username to their recovery email.

const SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Missing username' });
  }

  if (!SB_KEY) {
    return res.status(500).json({ error: 'Configuration Error: SUPABASE_SERVICE_ROLE_KEY is missing' });
  }

  try {
    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    
    const dbRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors?username=eq.${cleanUsername}&select=email_recovery`, {
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`
      }
    });

    if (!dbRes.ok) {
      const errText = await dbRes.text();
      console.error('Lookup vendor error:', errText);
      return res.status(500).json({ error: 'Database lookup failed' });
    }

    const data = await dbRes.json();
    if (data.length === 0) {
      return res.status(404).json({ error: 'Username vendor tidak ditemukan.' });
    }

    return res.status(200).json({ email: data[0].email_recovery });

  } catch (error) {
    console.error('API get-email error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
