// api/sortir-payment-webhook.js — SapaTamu Sortir v3.5 Midtrans Webhook Handler
// Listens for Midtrans payment notifications, verifies signatures, and calls Supabase RPC activate_sortir_subscription.

import crypto from 'crypto';

const SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u";
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "Mid-server-YOUR-KEY";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const notification = req.body;
  const { order_id, status_code, gross_amount, signature_key, transaction_status } = notification;

  if (!order_id || !status_code || !gross_amount || !signature_key) {
    return res.status(400).json({ error: 'Payload notifikasi tidak valid.' });
  }

  try {
    // 1. Verifikasi Signature Midtrans (SHA512)
    const payloadString = order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY;
    const computedSignature = crypto.createHash('sha512').update(payloadString).digest('hex');

    if (computedSignature !== signature_key) {
      console.warn(`[Webhook Sortir] Signature mismatch for order: ${order_id}`);
      return res.status(401).json({ error: 'Signature mismatch' });
    }

    console.log(`[Webhook Sortir] Verified order: ${order_id}, Status: ${transaction_status}`);

    const isPaymentSuccess = transaction_status === 'settlement' || transaction_status === 'capture';

    if (isPaymentSuccess) {
      // 2. Query data transaksi dari sortir_transactions
      const trxRes = await fetch(`${SB_URL}/rest/v1/sortir_transactions?order_id=eq.${encodeURIComponent(order_id)}&select=*`, {
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`
        }
      });
      const transactions = await trxRes.json();

      if (!transactions || transactions.length === 0) {
        console.error(`[Webhook Sortir] Transaksi ${order_id} tidak ditemukan di database.`);
        return res.status(404).json({ error: 'Transaction not found' });
      }

      const trx = transactions[0];
      const vendorId = trx.vendor_id;
      const planType = trx.plan_type || 'monthly';

      // 3. Panggil RPC Supabase: activate_sortir_subscription (Atomic & Override Reset)
      const rpcRes = await fetch(`${SB_URL}/rest/v1/rpc/activate_sortir_subscription`, {
        method: 'POST',
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_vendor_id: vendorId,
          p_order_id: order_id,
          p_plan_type: planType
        })
      });

      if (!rpcRes.ok) {
        const rpcErr = await rpcRes.text();
        console.error(`[Webhook Sortir] Gagal mengaktifkan subscription via RPC:`, rpcErr);
        return res.status(500).json({ error: 'Failed to activate subscription via RPC', detail: rpcErr });
      }

      console.log(`[Webhook Sortir] Berhasil mengaktifkan paket ${planType} untuk vendor ${vendorId}.`);
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[Webhook Sortir] Handler error:', err);
    return res.status(500).json({ error: 'Internal Server Error', detail: err.message });
  }
}
