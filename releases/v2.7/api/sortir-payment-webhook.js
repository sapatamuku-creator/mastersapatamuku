// api/sortir-payment-webhook.js
// Vercel serverless function to receive payment notifications from Midtrans and activate vendor accounts.

const crypto = require('crypto');

const SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const notification = req.body;
  const { order_id, status_code, gross_amount, signature_key, transaction_status } = notification;

  if (!order_id || !status_code || !gross_amount || !signature_key) {
    return res.status(400).json({ error: 'Invalid notification payload' });
  }

  try {
    // 1. Verify Midtrans Signature
    // Signature Key = SHA512(order_id + status_code + gross_amount + ServerKey)
    const payloadString = order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY;
    const computedSignature = crypto.createHash('sha512').update(payloadString).digest('hex');

    if (computedSignature !== signature_key) {
      console.warn('Unauthorized payment webhook notification: signature mismatch.');
      return res.status(401).json({ error: 'Signature mismatch' });
    }

    console.log(`Payment webhook verified for order: ${order_id}. Status: ${transaction_status}`);

    // 2. Check if payment is successful
    const isPaymentSuccess = transaction_status === 'settlement' || transaction_status === 'capture';

    if (isPaymentSuccess) {
      // Order ID format: sortir_USERID_TIMESTAMP
      // Example: sortir_a1b2c3d4-e5f6..._1625890201
      const parts = order_id.split('_');
      if (parts.length < 3) {
        console.error('Invalid order_id format in webhook:', order_id);
        return res.status(400).json({ error: 'Invalid order ID format' });
      }

      // We need to find the vendor record matching the prefix of user ID, or fetch user details.
      // Wait, order ID contains the first 8 characters of UUID or similar, but what if we query the sortir_vendors by username or ID?
      // Wait, let's see. In api/sortir-create-payment.js, we wrote:
      // const orderId = `sortir_${userId.substring(0, 8)}_${Date.now()}`;
      // Ah! `userId.substring(0, 8)` is not a full UUID, so we can't query directly by id.
      // To make it 100% reliable, we can change the orderId format in api/sortir-create-payment.js to contain the FULL userId!
      // Yes! A UUID is 36 characters. A Midtrans order ID can be up to 50 characters.
      // So `sortir_USERID` (7 + 36 = 43 characters) fits perfectly within Midtrans' 50-character limit!
      // Let's modify api/sortir-create-payment.js orderId generation to be:
      // const orderId = `sort_${userId}`; // "sort_" (5) + UUID (36) = 41 characters! This is perfect!
      // Let's assume orderId is `sort_${userId}`. Then `parts[1]` is the exact full UUID!
      // Let's write the webhook code expecting `sort_${userId}` format, and we will update create-payment script to match this.

      const userId = order_id.substring(5); // Strips "sort_" prefix
      
      // Fetch current vendor profile to get billing cycle
      const vendorRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors?id=eq.${userId}&select=billing_cycle`, {
        headers: {
          'apikey': SB_KEY || '',
          'Authorization': `Bearer ${SB_KEY}`
        }
      });

      if (!vendorRes.ok) {
        console.error(`Vendor ${userId} not found in database.`);
        return res.status(404).json({ error: 'Vendor not found' });
      }

      const vendors = await vendorRes.json();
      if (vendors.length === 0) {
        console.error(`Vendor ${userId} profile is empty.`);
        return res.status(404).json({ error: 'Vendor profile empty' });
      }

      const cycle = vendors[0].billing_cycle || 'monthly';
      const interval = cycle === 'yearly' ? '1 year' : '1 month';

      // Update sortir_vendors: set active and add interval to subscription expiration
      // subscription_expires_at = now() + interval
      const updatePayload = {
        is_active: true,
        subscription_expires_at: new Date(Date.now() + (cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString()
      };

      const updateRes = await fetch(`${SB_URL}/rest/v1/sortir_vendors?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SB_KEY || '',
          'Authorization': `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });

      if (!updateRes.ok) {
        const updateError = await updateRes.text();
        console.error(`Failed to activate vendor ${userId}:`, updateError);
        return res.status(500).json({ error: 'Failed to update database' });
      }

      console.log(`Successfully activated vendor ${userId} for ${cycle} access.`);
    }

    return res.status(200).send('OK');

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
