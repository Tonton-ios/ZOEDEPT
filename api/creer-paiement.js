import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const MONCASH_API_BASE_URL = process.env.MONCASH_API_BASE_URL || 'https://sandbox.moncashbutton.digicelgroup.com/Api';
const MONCASH_GATEWAY_BASE_URL = process.env.MONCASH_GATEWAY_BASE_URL || 'https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware';
const MONCASH_CHECKOUT_BASE_URL = process.env.MONCASH_CHECKOUT_BASE_URL || 'https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware/Checkout';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

function createMoncashOrderId() {
  const seconds = Math.floor(Date.now() / 1000).toString();
  return seconds.slice(-9) + Math.floor(Math.random() * 10);
}

function moncashPublicKey() {
  const rawKey = process.env.MONCASH_SECRET_API_KEY;
  if (!rawKey) return null;

  const normalized = rawKey.includes('BEGIN PUBLIC KEY')
    ? rawKey
    : `-----BEGIN PUBLIC KEY-----\n${rawKey.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;

  return normalized;
}

function encryptForMoncash(value) {
  const keyPem = moncashPublicKey();
  if (!keyPem) throw new Error('MONCASH_SECRET_API_KEY manquant.');

  const publicKey = crypto.createPublicKey(keyPem);
  const keyBytes = Math.ceil((publicKey.asymmetricKeyDetails?.modulusLength || 2048) / 8);
  const plain = Buffer.from(String(value), 'utf8');
  if (plain.length > keyBytes) {
    throw new Error('Valeur MonCash trop longue pour le chiffrement.');
  }

  const noPaddingBlock = Buffer.alloc(keyBytes);
  plain.copy(noPaddingBlock, keyBytes - plain.length);

  return crypto.publicEncrypt({
    key: publicKey,
    padding: crypto.constants.RSA_NO_PADDING
  }, noPaddingBlock).toString('base64');
}

async function createMiddlewareCheckoutPayment({ amount, orderId }) {
  const businessKey = process.env.MONCASH_BUSINESS_KEY;
  if (!businessKey) return null;

  const body = new URLSearchParams({
    amount: encryptForMoncash(amount),
    orderId: encryptForMoncash(orderId)
  });

  const checkoutRes = await fetch(`${MONCASH_CHECKOUT_BASE_URL}/Rest/${encodeURIComponent(businessKey)}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const checkoutText = await checkoutRes.text();
  let checkout;
  try {
    checkout = JSON.parse(checkoutText);
  } catch {
    checkout = { raw: checkoutText };
  }

  if (!checkoutRes.ok || !checkout.success || !checkout.token) {
    return {
      error: checkout.error || checkout.msg || 'Paiement MonCash middleware impossible.',
      step: 'moncash_checkout_rest',
      moncashStatus: checkoutRes.status,
      moncashResponse: checkout
    };
  }

  return {
    redirectUrl: `${MONCASH_CHECKOUT_BASE_URL}/Payment/Redirect/${encodeURIComponent(checkout.token)}`
  };
}

async function getMoncashToken() {
  const auth = Buffer.from(`${process.env.MONCASH_CLIENT_ID}:${process.env.MONCASH_CLIENT_SECRET}`).toString('base64');
  const tokenRes = await fetch(`${MONCASH_API_BASE_URL}/oauth/token?scope=read,write&grant_type=client_credentials`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json'
    }
  });

  const token = await tokenRes.json();
  if (!tokenRes.ok || !token.access_token) {
    throw new Error(token.error_description || token.error || 'Token MonCash impossible.');
  }

  return token.access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  try {
    const missingVars = [];
    if (!process.env.SUPABASE_URL) missingVars.push('SUPABASE_URL');
    if (!process.env.SUPABASE_KEY) missingVars.push('SUPABASE_KEY');

    const hasRest = process.env.MONCASH_CLIENT_ID && process.env.MONCASH_CLIENT_SECRET;
    const hasMiddleware = process.env.MONCASH_BUSINESS_KEY && process.env.MONCASH_SECRET_API_KEY;

    if (!hasRest && !hasMiddleware) {
      missingVars.push('MONCASH_CREDENTIALS');
    }
    
    if (missingVars.length > 0) {
      const missing = missingVars.join(', ');
      return res.status(500).json({ 
        error: `Erè: Variables d'environnement manquantes sur Vercel (${missing}).`,
        missing: missingVars
      });
    }

    const amount = Math.round(Number(req.body?.amount || 0));
    const orderPayload = req.body?.order && typeof req.body.order === 'object' ? req.body.order : null;
    let supabaseOrderId = req.body?.orderId ? String(req.body.orderId) : '';

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide.' });
    }

    const supabase = getSupabase();
    if (!supabaseOrderId && orderPayload) {
      const { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: orderPayload.user_id || null,
          customer_email: orderPayload.customer_email || null,
          customer_phone: orderPayload.customer_phone || null,
          customer_first_name: orderPayload.customer_first_name || null,
          customer_last_name: orderPayload.customer_last_name || null,
          customer_address: orderPayload.customer_address || null,
          customer_country: orderPayload.customer_country || 'Haiti',
          payment_method: orderPayload.payment_method || 'Mon Cash',
          items: Array.isArray(orderPayload.items) ? orderPayload.items : [],
          subtotal: orderPayload.subtotal_htg || amount,
          shipping: orderPayload.shipping_htg || 0,
          discount: orderPayload.discount_htg || 0,
          total: orderPayload.total_htg || amount,
          promo_code: orderPayload.promo_code || null,
          status: 'pending'
        }])
        .select('id')
        .single();

      if (orderError) throw orderError;
      supabaseOrderId = createdOrder.id;
    }

    const moncashOrderId = createMoncashOrderId();

    let redirectUrl = '';
    const middlewarePayment = await createMiddlewareCheckoutPayment({ amount, orderId: moncashOrderId });

    if (middlewarePayment?.error) {
      return res.status(502).json(middlewarePayment);
    }

    if (middlewarePayment?.redirectUrl) {
      redirectUrl = middlewarePayment.redirectUrl;
    } else {
      const accessToken = await getMoncashToken();
      const payRes = await fetch(`${MONCASH_API_BASE_URL}/v1/CreatePayment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount, orderId: moncashOrderId })
      });

      const paymentText = await payRes.text();
      let payment;
      try {
        payment = JSON.parse(paymentText);
      } catch {
        payment = { raw: paymentText };
      }
      const token = payment?.payment_token?.token;
      if (!payRes.ok || !token) {
        return res.status(502).json({
          error: payment?.message || payment?.error_description || payment?.error || 'Paiement MonCash impossible.',
          step: 'moncash_create_payment',
          moncashStatus: payRes.status,
          moncashResponse: payment
        });
      }

      redirectUrl = `${MONCASH_GATEWAY_BASE_URL}/Payment/Redirect?token=${encodeURIComponent(token)}`;
    }

    const { error: dbError } = await supabase.from('transactions').upsert({
      order_id: moncashOrderId,
      supabase_order_id: supabaseOrderId || null,
      montant: amount,
      statut: 'en_attente'
    }, { onConflict: 'order_id' });

    if (dbError) throw dbError;

    return res.status(200).json({ redirectUrl, orderId: moncashOrderId, supabaseOrderId });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erreur MonCash.' });
  }
}
