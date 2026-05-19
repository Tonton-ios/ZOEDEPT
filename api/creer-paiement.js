import { createClient } from '@supabase/supabase-js';

const MONCASH_API_BASE_URL = process.env.MONCASH_API_BASE_URL || 'https://sandbox.moncashbutton.digicelgroup.com/Api';
const MONCASH_GATEWAY_BASE_URL = process.env.MONCASH_GATEWAY_BASE_URL || 'https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
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
    if (!process.env.MONCASH_CLIENT_ID || !process.env.MONCASH_CLIENT_SECRET || !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      return res.status(500).json({ error: 'Variables MonCash/Supabase manquantes sur Vercel.' });
    }

    const amount = Number(req.body?.amount || 0);
    const orderId = String(req.body?.orderId || `CMD-${Date.now()}`);

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide.' });
    }

    const accessToken = await getMoncashToken();
    const payRes = await fetch(`${MONCASH_API_BASE_URL}/v1/CreatePayment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount, orderId })
    });

    const payment = await payRes.json();
    const token = payment?.payment_token?.token;
    if (!payRes.ok || !token) {
      throw new Error(payment?.message || payment?.error || 'Paiement MonCash impossible.');
    }

    const supabase = getSupabase();
    const { error: dbError } = await supabase.from('transactions').upsert({
      order_id: orderId,
      montant: amount,
      statut: 'en_attente'
    }, { onConflict: 'order_id' });

    if (dbError) throw dbError;

    const redirectUrl = `${MONCASH_GATEWAY_BASE_URL}/Payment/Redirect?token=${encodeURIComponent(token)}`;
    return res.status(200).json({ redirectUrl, orderId });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erreur MonCash.' });
  }
}
