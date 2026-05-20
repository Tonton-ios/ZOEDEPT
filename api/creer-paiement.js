import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const MONCASH_API_BASE_URL = (process.env.MONCASH_API_BASE_URL || 'https://moncashbutton.digicelgroup.com/Api').trim();
const MONCASH_GATEWAY_BASE_URL = (process.env.MONCASH_GATEWAY_BASE_URL || 'https://moncashbutton.digicelgroup.com/Moncash-middleware').trim();
const MONCASH_CHECKOUT_BASE_URL = (process.env.MONCASH_CHECKOUT_BASE_URL || 'https://moncashbutton.digicelgroup.com/Moncash-middleware/Checkout').trim();

function getSupabase() {
  return createClient(process.env.SUPABASE_URL.trim(), process.env.SUPABASE_KEY.trim());
}

function createMoncashOrderId() {
  // Utilisation d'un préfixe et d'un timestamp plus long pour garantir l'unicité en production
  return 'Z' + Date.now().toString().slice(-10) + Math.floor(Math.random() * 1000);
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
  const businessKey = process.env.MONCASH_BUSINESS_KEY?.trim();
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
  const auth = Buffer.from(`${process.env.MONCASH_CLIENT_ID.trim()}:${process.env.MONCASH_CLIENT_SECRET.trim()}`).toString('base64');
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
    if (!process.env.SUPABASE_URL?.trim()) missingVars.push('SUPABASE_URL');
    if (!process.env.SUPABASE_KEY?.trim()) missingVars.push('SUPABASE_KEY');

    const hasRest = !!(process.env.MONCASH_CLIENT_ID?.trim() && process.env.MONCASH_CLIENT_SECRET?.trim());
    const hasMiddleware = !!(process.env.MONCASH_BUSINESS_KEY?.trim() && process.env.MONCASH_SECRET_API_KEY?.trim());

    console.log(`Diagnostic: REST=${hasRest}, Middleware=${hasMiddleware}`);
    console.log(`URL utilisée: ${MONCASH_API_BASE_URL}`);

    if (!hasRest && !hasMiddleware) {
      missingVars.push('MONCASH_CLIENT_ID/SECRET ou BUSINESS_KEY');
    }
    
    if (missingVars.length > 0) {
      const missing = missingVars.join(', ');
      return res.status(500).json({ 
        error: `Erè: Variables d'environnement manquantes sur Vercel (${missing}).`,
        missing: missingVars
      });
    }

    // Nettoyage robuste du montant
    const parseSafeNum = (val) => {
      if (typeof val === 'number') return val;
      const cleaned = String(val || '').replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    };

    const amount = Math.round(parseSafeNum(req.body?.amount)) || 0;
    const orderPayload = req.body?.order && typeof req.body.order === 'object' ? req.body.order : null;
    let supabaseOrderId = req.body?.orderId ? String(req.body.orderId) : '';
    if (amount <= 0) return res.status(400).json({ error: 'Montant invalide.' });

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
          // Correction : Utilisation d'une priorité stricte pour éviter les valeurs null/NaN
          subtotal: Number(orderPayload.subtotal_htg ?? orderPayload.subtotal ?? amount ?? 0),
          subtotal_htg: Number(orderPayload.subtotal_htg ?? orderPayload.subtotal ?? amount ?? 0),
          shipping: Number(orderPayload.shipping_htg ?? orderPayload.shipping ?? 0),
          shipping_htg: Number(orderPayload.shipping_htg ?? orderPayload.shipping ?? 0),
          discount: Number(orderPayload.discount_htg ?? orderPayload.discount ?? 0),
          discount_htg: Number(orderPayload.discount_htg ?? orderPayload.discount ?? 0),
          total: Number(orderPayload.total_htg ?? orderPayload.total ?? amount ?? 0),
          total_htg: Number(orderPayload.total_htg ?? orderPayload.total ?? amount ?? 0),
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
    let apiErrors = [];

    // PRIORITÉ 1: Tentative via REST API (Plus stable)
    if (hasRest) {
      try {
        console.log('Tentative de paiement via REST API...');
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

        const payment = await payRes.json().catch(() => ({}));
        const token = payment?.payment_token?.token;

        if (payRes.ok && token) {
          console.log('Succès REST API: Token généré.');
          redirectUrl = `${MONCASH_GATEWAY_BASE_URL}/Payment/Redirect?token=${encodeURIComponent(token)}`;
        } else {
          const errorMsg = payment?.message || payment?.error_description || 'Erreur inconnue';
          console.error('Échec REST API:', errorMsg);
          apiErrors.push({ error: errorMsg, step: 'moncash_rest', details: payment });
        }
      } catch (e) {
        console.error('Exception REST API:', e.message);
        apiErrors.push({ error: e.message, step: 'moncash_rest_exception' });
      }
    }

    // PRIORITÉ 2: Fallback via Middleware (Si REST a échoué ou n'est pas configuré)
    if (!redirectUrl && hasMiddleware) {
      try {
        console.log('Tentative de secours via Middleware...');
        const middlewarePayment = await createMiddlewareCheckoutPayment({ amount, orderId: moncashOrderId });
        if (middlewarePayment?.redirectUrl) {
          redirectUrl = middlewarePayment.redirectUrl;
        } else {
          console.error('MonCash Middleware Error Response:', middlewarePayment);
          apiErrors.push(middlewarePayment);
        }
      } catch (e) {
        apiErrors.push({ error: e.message, step: 'moncash_middleware_exception' });
      }
    }

    if (!redirectUrl) {
      return res.status(502).json({ 
        error: "MonCash rejette la transaction (System Error). Vérifiez vos clés de production et le montant.",
        details: apiErrors 
      });
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
