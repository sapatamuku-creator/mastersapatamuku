// api/sortir-create-payment.js
// Vercel serverless function to initiate a Midtrans Snap payment for Sortir SaaS.

const SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Requires service role to read/write all data
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const IS_PRODUCTION = true; // User requested production directly

const MIDTRANS_API_URL = IS_PRODUCTION 
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, username, vendorName, whatsappAdmin, emailRecovery, billingCycle, referralCode } = req.body;

  if (!userId || !username || !billingCycle) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // 1. Calculate pricing
    let price = 25000; // Monthly
    let referralApplied = false;

    if (billingCycle === 'yearly') {
      price = 150000;
      if (referralCode) {
        // Query Supabase check_active_referral function
        const referralRes = await fetch(`${SB_URL}/rest/v1/rpc/check_active_referral`, {
          method: 'POST',
          headers: {
            'apikey': SB_KEY || '',
            'Authorization': `Bearer ${SB_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ p_username: referralCode })
        });

        if (referralRes.ok) {
          const isValidReferral = await referralRes.json();
          if (isValidReferral) {
            price = 100000; // Rp 50,000 discount
            referralApplied = true;
          }
        }
      }
    }

    // 2. Prepare database entry for the vendor (set is_active = false initially)
    // We upsert the vendor info to sortir_vendors table
    const cleanSubdomain = username.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const vendorData = {
      id: userId,
      username: username,
      subdomain: cleanSubdomain,
      vendor_name: vendorName || username,
      whatsapp_admin: whatsappAdmin || '',
      email_recovery: emailRecovery || '',
      is_active: false,
      billing_cycle: billingCycle,
      referred_by: referralApplied ? referralCode : null
    };

    const upsertRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors`, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY || '',
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(vendorData)
    });

    if (!upsertRes.ok) {
      const errMsg = await upsertRes.text();
      console.error('Failed to create/update vendor in DB:', errMsg);
      return res.status(500).json({ error: 'Failed to initialize vendor profile' });
    }

    // 3. Call Midtrans Snap API
    const orderId = `sort_${userId}`;
    const base64Auth = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');

    const midtransPayload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: price
      },
      item_details: [{
        id: `sortir_${billingCycle}`,
        price: price,
        quantity: 1,
        name: `SapaTamu Sortir - Akses ${billingCycle === 'yearly' ? 'Tahunan' : 'Bulanan'}`
      }],
      customer_details: {
        first_name: vendorName || username,
        email: emailRecovery,
        phone: whatsappAdmin
      },
      callbacks: {
        finish: `https://sortir.sapatamu.id/sortir_login.html?checkout=success`
      }
    };

    const midtransRes = await fetch(MIDTRANS_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${base64Auth}`
      },
      body: JSON.stringify(midtransPayload)
    });

    if (!midtransRes.ok) {
      const midtransError = await midtransRes.text();
      console.error('Midtrans API Error:', midtransError);
      return res.status(500).json({ error: 'Failed to create transaction token with Midtrans' });
    }

    const midtransData = await midtransRes.json();
    return res.status(200).json({
      token: midtransData.token,
      redirectUrl: midtransData.redirect_url,
      orderId: orderId,
      amount: price
    });

  } catch (error) {
    console.error('Create payment error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
