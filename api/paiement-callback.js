import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const MONCASH_API_BASE_URL = process.env.MONCASH_API_BASE_URL || 'https://sandbox.moncashbutton.digicelgroup.com/Api';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
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

function decryptForMoncash(encryptedValue) {
  // Le transactionId de MonCash est généralement envoyé en base64
  // On le décode simplement sans décryption RSA (MonCash n'utilise pas RSA pour le return)
  try {
    // Si c'est du base64, décodez
    if (typeof encryptedValue === 'string') {
      const decoded = Buffer.from(encryptedValue, 'base64').toString('utf8');
      return decoded;
    }
    return String(encryptedValue);
  } catch (err) {
    // Si le décodage échoue, retournez la valeur originale
    return String(encryptedValue);
  }
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

async function getTransactionDetails(transactionId) {
  const businessKey = process.env.MONCASH_BUSINESS_KEY;
  if (!businessKey) throw new Error('MONCASH_BUSINESS_KEY manquant.');

  const middlewareBaseUrl = process.env.MONCASH_GATEWAY_BASE_URL || 'https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware';

  // Encrypt the transactionId as per Digicel documentation
  const encryptedTransactionId = encryptForMoncash(transactionId);

  const detailsRes = await fetch(
    `${middlewareBaseUrl}/Checkout/${encodeURIComponent(businessKey)}/Payment/Transaction/`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        transactionId: encryptedTransactionId
      }).toString()
    }
  );

  const details = await detailsRes.json();
  return details;
}

export default async function handler(req, res) {
  // Accept both GET and POST for callback
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  try {
    const missingVars = [];
    if (!process.env.MONCASH_BUSINESS_KEY) missingVars.push('MONCASH_BUSINESS_KEY');
    if (!process.env.MONCASH_SECRET_API_KEY) missingVars.push('MONCASH_SECRET_API_KEY');
    if (!process.env.MONCASH_CLIENT_ID) missingVars.push('MONCASH_CLIENT_ID');
    if (!process.env.MONCASH_CLIENT_SECRET) missingVars.push('MONCASH_CLIENT_SECRET');
    if (!process.env.SUPABASE_URL) missingVars.push('SUPABASE_URL');
    if (!process.env.SUPABASE_KEY) missingVars.push('SUPABASE_KEY');

    if (missingVars.length > 0) {
      console.error('Variables manquantes:', missingVars);
      return res.status(500).json({ 
        error: `Variables manquantes: ${missingVars.join(', ')}`,
        missing: missingVars
      });
    }

    // Get encrypted transactionId from query or body
    const encryptedTransactionId = req.query.transactionId || req.body?.transactionId;
    
    if (!encryptedTransactionId) {
      return res.status(400).json({ error: 'transactionId manquant.' });
    }

    // Decrypt the transactionId
    let transactionId;
    try {
      transactionId = decryptForMoncash(encryptedTransactionId);
    } catch (decryptErr) {
      console.error('Décryption échouée:', decryptErr.message);
      return res.status(400).json({ error: 'Impossible de décrypter transactionId.', details: decryptErr.message });
    }

    // Get transaction details from MonCash
    const transactionDetails = await getTransactionDetails(transactionId);

    if (!transactionDetails.success) {
      return res.status(400).json({ 
        error: transactionDetails.msg || 'Paiement non trouvé.',
        moncashResponse: transactionDetails
      });
    }

    const supabase = getSupabase();

    // Store notification
    const { error: notifError } = await supabase
      .from('payment_notifications')
      .insert([{
        transaction_id: transactionId,
        notification_type: 'return',
        payload: transactionDetails,
        processed: false
      }]);

    if (notifError) console.warn('Erreur notification:', notifError);

    // Use reference (orderId) from MonCash details to find transaction
    const moncashOrderId = transactionDetails.reference;

    // Update transaction in DB (search by order_id which we sent to MonCash)
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        transaction_id: transactionId,
        transaction_msg: transactionDetails.payment_msg,
        statut: transactionDetails.payment_status ? 'complete' : 'error',
        payer: transactionDetails.payer,
        trans_number: transactionDetails.transNumber,
        moncash_reference: moncashOrderId,
        updated_at: new Date()
      })
      .eq('order_id', moncashOrderId);

    if (updateError) console.warn('Erreur mise à jour transaction:', updateError);

    // If payment successful, update order status
    if (transactionDetails.payment_status) {
      const { data: transaction } = await supabase
        .from('transactions')
        .select('supabase_order_id')
        .eq('order_id', moncashOrderId)
        .single();

      if (transaction?.supabase_order_id) {
        await supabase
          .from('orders')
          .update({ 
            status: 'paid',
            updated_at: new Date()
          })
          .eq('id', transaction.supabase_order_id);
      }
    }

    // Redirect to confirmation or payment page
    const returnUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
    const confirmationUrl = transactionDetails.payment_status 
      ? `${returnUrl}/confirmation.html?transactionId=${encodeURIComponent(transactionId)}`
      : `${returnUrl}/merci.html?error=1&transactionId=${encodeURIComponent(transactionId)}`;

    return res.redirect(302, confirmationUrl);

  } catch (error) {
    console.error('Erreur callback paiement:', error);
    return res.status(500).json({ 
      error: error.message || 'Erreur lors du traitement du paiement.',
      timestamp: new Date()
    });
  }
}
