import { createClient } from '@supabase/supabase-js';

const MONCASH_API_BASE_URL = (process.env.MONCASH_API_BASE_URL || 'https://moncashbutton.digicelgroup.com/Api').trim(); // Doit être configuré sur Vercel

function getSupabase() {
  return createClient(process.env.SUPABASE_URL.trim(), process.env.SUPABASE_KEY.trim());
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
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  try {
    const missingVars = [];
    if (!process.env.MONCASH_CLIENT_ID?.trim()) missingVars.push('MONCASH_CLIENT_ID');
    if (!process.env.MONCASH_CLIENT_SECRET?.trim()) missingVars.push('MONCASH_CLIENT_SECRET');
    if (!process.env.SUPABASE_URL?.trim()) missingVars.push('SUPABASE_URL');
    if (!process.env.SUPABASE_KEY?.trim()) missingVars.push('SUPABASE_KEY');
    
    if (missingVars.length > 0) {
      const missing = missingVars.join(', ');
      return res.status(500).json({ 
        error: `Erè: Variables d'environnement manquantes sur Vercel (${missing}).`,
        missing: missingVars
      });
    }

    const transactionId = req.query.transactionId || req.query.transaction_id;
    const orderId = req.query.orderId || req.query.order_id;

    if (!transactionId && !orderId) {
      return res.status(400).json({ error: 'transactionId ou orderId requis.' });
    }

    const accessToken = await getMoncashToken();
    const verifyPath = transactionId ? 'RetrieveTransactionPayment' : 'RetrieveOrderPayment';
    const verifyRes = await fetch(`${MONCASH_API_BASE_URL}/v1/${verifyPath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionId ? { transactionId } : { orderId })
    });

    const result = await verifyRes.json();
    const payment = result?.payment || {};
    const success = String(payment.message || '').toLowerCase() === 'successful';
    const savedOrderId = orderId || payment.reference;
    const savedTransactionId = transactionId || payment.transaction_id || null;

    if (savedOrderId) {
      const supabase = getSupabase();
      await supabase.from('transactions')
        .update({
          statut: success ? 'paye' : 'echoue',
          transaction_id: savedTransactionId
        })
        .eq('order_id', savedOrderId);

      const { data: transaction } = await supabase
        .from('transactions')
        .select('supabase_order_id')
        .eq('order_id', savedOrderId)
        .maybeSingle();

      const supabaseOrderId = transaction?.supabase_order_id || savedOrderId;
      await supabase.from('orders')
        .update({ status: success ? 'paid' : 'payment_failed' })
        .eq('id', supabaseOrderId);
    }

    return res.status(200).json({ success, payment });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erreur vérification MonCash.' });
  }
}
