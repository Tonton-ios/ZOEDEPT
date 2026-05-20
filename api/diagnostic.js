import { createClient } from '@supabase/supabase-js';

// Simple diagnostic endpoint
export default async function handler(req, res) {
  // Return all environment variables status (without showing values)
  const vars = {
    SUPABASE_URL: process.env.SUPABASE_URL ? '✓ Présente' : '✗ MANQUE',
    SUPABASE_KEY: process.env.SUPABASE_KEY ? '✓ Présente' : '✗ MANQUE',
    MONCASH_CLIENT_ID: process.env.MONCASH_CLIENT_ID ? '✓ Présente' : '✗ MANQUE',
    MONCASH_CLIENT_SECRET: process.env.MONCASH_CLIENT_SECRET ? '✓ Présente' : '✗ MANQUE',
    MONCASH_BUSINESS_KEY: process.env.MONCASH_BUSINESS_KEY ? '✓ Présente' : '✗ MANQUE',
    MONCASH_SECRET_API_KEY: process.env.MONCASH_SECRET_API_KEY ? '✓ Présente' : '✗ MANQUE',
    MONCASH_API_BASE_URL: process.env.MONCASH_API_BASE_URL ? '✓ Présente' : '✗ MANQUE',
    MONCASH_GATEWAY_BASE_URL: process.env.MONCASH_GATEWAY_BASE_URL ? '✓ Présente' : '✗ MANQUE',
    MONCASH_CHECKOUT_BASE_URL: process.env.MONCASH_CHECKOUT_BASE_URL ? '✓ Présente' : '✗ MANQUE'
  };

  // Test Supabase connection
  let supabaseStatus = '✗ ERREUR';
  try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
      const { data, error } = await supabase.from('orders').select('id').limit(1);
      supabaseStatus = error ? `✗ ERREUR: ${error.message}` : '✓ Connectée';
    }
  } catch (e) {
    supabaseStatus = `✗ ERREUR: ${e.message}`;
  }

  res.status(200).json({
    timestamp: new Date().toISOString(),
    environment_variables: vars,
    supabase_connection: supabaseStatus,
    message: 'Diagnostic complet'
  });
}
