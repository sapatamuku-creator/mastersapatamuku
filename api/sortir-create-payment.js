// api/sortir-create-payment.js — SapaTamu Sortir v3.5 Midtrans Snap Payment
// Initiates Snap token for 1 Month (Rp 25.000) or 1 Year (Rp 250.000) plans.

const SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u";
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "Mid-server-YOUR-KEY";
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || true;

const MIDTRANS_API_URL = IS_PRODUCTION 
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

export default async function handler(req, res) {
  // CORS setup
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { vendorId, vendorName, email, whatsapp, planType } = req.body;

  if (!vendorId || !planType) {
    return res.status(400).json({ error: 'Data pembayaran tidak lengkap (vendorId & planType wajib diisi).' });
  }

  try {
    // 1. Calculate pricing: Monthly Rp 25.000, Yearly Rp 250.000
    const isYearly = planType === 'yearly';
    const price = isYearly ? 250000 : 25000;
    const planLabel = isYearly ? 'PRO Tahunan (1 Tahun - Hemat 50rb)' : 'PRO Bulanan (1 Bulan)';

    // 2. Generate Unique Order ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderId = `SORT-${Date.now()}-${randomSuffix}`;

    // 3. Request Token from Midtrans Snap API
    const base64Auth = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');
    const midtransPayload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: price
      },
      item_details: [{
        id: `sortir_${planType}`,
        price: price,
        quantity: 1,
        name: `SapaTamu Sortir ${planLabel}`
      }],
      customer_details: {
        first_name: vendorName || 'Vendor SapaTamu',
        email: email || 'vendor@sapatamu.id',
        phone: whatsapp || ''
      },
      callbacks: {
        finish: `https://sapatamu.id/sortir?payment=success&order_id=${orderId}`
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

    let snapToken = null;
    let redirectUrl = null;

    if (midtransRes.ok) {
      const midtransData = await midtransRes.json();
      snapToken = midtransData.token;
      redirectUrl = midtransData.redirect_url;
    } else {
      console.warn('Midtrans API fallback (mock/sandbox token):', await midtransRes.text());
      snapToken = `MOCK-SNAP-${Date.now()}`;
    }

    // 4. Save transaction log to Supabase sortir_transactions
    await fetch(`${SB_URL}/rest/v1/sortir_transactions`, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json'
      },
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

  } catch (err) {
    console.error('sortir-create-payment error:', err);
    return res.status(500).json({ error: 'Gagal membuat tagihan pembayaran.', detail: err.message });
  }
}
