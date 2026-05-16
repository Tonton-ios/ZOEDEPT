// Configuration Supabase
// Ajoute ton URL Supabase ak Public Key isit la
const SUPABASE_URL = 'sb_publishable_y4CgZLnoKIxAPtpUmv_Mtw_zyWpBVjE';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52aGZiemhsemNoeWNsenpqdGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NjIzNzEsImV4cCI6MjA5NDUzODM3MX0.mQ2oyNbFDmCqEK5jSz2W7mjkBr5G3MNRXBG5WxiutG4';

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
