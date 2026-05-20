import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

// Les URLs MonCash doivent être configurées correctement dans les variables d'environnement de Vercel.
const MONCASH_API_BASE_URL = 'https://moncashbutton.digicelgroup.com/Api';
const MONCASH_GATEWAY_BASE_URL = 'https://moncashbutton.digicelgroup.com/Moncash-middleware';

function getSupabase() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_KEY || '').trim();
  return createClient(url, key);
}

function createMoncashOrderId() {
  // Utilisation d'un préfixe et d'un timestamp plus long pour garantir l'unicité en production
  return 'Z' + Date.now().toString().slice(-10) + Math.floor(Math.random() * 1000);
}

async function getMoncashToken() {
  const clientId = (process.env.MONCASH_CLIENT_ID || '').trim();
  const clientSecret = (process.env.MONCASH_CLIENT_SECRET || '').trim();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
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

    const clientId = process.env.MONCASH_CLIENT_ID?.trim();
    const clientSecret = process.env.MONCASH_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) missingVars.push('MONCASH_CLIENT_ID/SECRET');
    
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

    const payment = await payRes.json();
    const token = payment?.payment_token?.token;

    if (payRes.ok && token) {
      redirectUrl = `${MONCASH_GATEWAY_BASE_URL}/Payment/Redirect?token=${encodeURIComponent(token)}`;
    } else {
      return res.status(502).json({ 
        error: payment?.message || "Erreur lors de la création du paiement MonCash.",
        details: payment 
      });
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
