// api/sortir-session.js
// Lightweight endpoint to update vendor session token after login.
// Uses the user's own Supabase JWT to verify identity before updating.
// Bypasses RLS by using service role key server-side.

const SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Dynamic CORS headers
  const origin = req.headers.origin;
  if (origin && (origin === 'https://sortir.sapatamu.id' || origin.endsWith('.sortir.sapatamu.id') || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://sortir.sapatamu.id');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!SB_SERVICE_KEY) {
    return res.status(500).json({ error: 'Server config error: missing service key' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const userJwt = authHeader.replace('Bearer ', '');
  const { sessionToken } = req.body;

  if (!sessionToken) {
    return res.status(400).json({ error: 'Missing sessionToken' });
  }

  try {
    // 1. Verify user's JWT by calling Supabase /auth/v1/user
    const userRes = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: {
        'apikey': SB_SERVICE_KEY,
        'Authorization': `Bearer ${userJwt}`
      }
    });

    if (!userRes.ok) {
      return res.status(401).json({ error: 'Invalid or expired user token' });
    }

    const userData = await userRes.json();
    const userId = userData.id;

    // 2. Update session token using service role (bypasses RLS)
    const updateRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SB_SERVICE_KEY,
        'Authorization': `Bearer ${SB_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ active_session_token: sessionToken })
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error('Session token update failed:', errText);
      return res.status(500).json({ error: 'Failed to update session token', detail: errText });
    }

    return res.status(200).json({ success: true, userId });

  } catch (err) {
    console.error('sortir-session error:', err);
    return res.status(500).json({ error: err.message });
  }
}
