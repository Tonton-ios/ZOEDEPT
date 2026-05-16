// Configuration Supabase
// Ajoute ton URL Supabase ak Public Key isit la
const SUPABASE_URL = 'https://YOUR_SUPABASE_URL.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Inisyalize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fonksyon aidè pou otentifikasyon
async function getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
}

async function logoutUser() {
    const { error } = await supabase.auth.signOut();
    return error;
}

// Ekspoze fonksyon globalment pou itilize nan lòt paj
window.supabaseHelpers = {
    getCurrentUser,
    logoutUser
};
