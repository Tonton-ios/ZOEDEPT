// Configuration Supabase
const SUPABASE_URL = 'https://nvhfbzhlzchyclzzjtka.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52aGZiemhsemNoeWNsenpqdGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NjIzNzEsImV4cCI6MjA5NDUzODM3MX0.mQ2oyNbFDmCqEK5jSz2W7mjkBr5G3MNRXBG5WxiutG4';               // À remplacer par votre clé

// Inisyalize Supabase
let supabaseClient;
try {
    // On vérifie que les clés ne sont pas les valeurs par défaut pour éviter de planter
    if (SUPABASE_URL.includes('YOUR-SUPABASE-URL')) {
        console.warn("Supabase n'est pas encore configuré. L'accès admin local fonctionnera uniquement.");
        supabaseClient = { auth: { signInWithPassword: () => Promise.resolve({ error: { message: "Supabase non configuré" } }), getSession: () => Promise.resolve({ data: { session: null } }) } };
    } else {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.error("Erè inisyalizasyon Supabase:", e);
}


const ADMIN_EMAIL = 'zoedept2026@gmail.com'; 
// Fonksyon pou rekupere itilizatè ki konekte a
async function getCurrentUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session?.user || null;
}

// Fonksyon pou enskripsyon (Kreye yon kont)
async function signUpUser(email, password, firstName, lastName) {
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName
            }
        }
    });
    return { data, error };
}

// Fonksyon pou koneksyon (Konekte)
async function signInUser(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Essayer l'authentification réelle Supabase
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
        
        if (error) return { data, error };

        // Redireksyon: si se admin nan, ale panel admin; sinon ale kont kliyan
        window.location.href = (cleanEmail === ADMIN_EMAIL.toLowerCase()) ? 'admin.html' : 'account.html';
        return { data, error };
    } catch (err) {
        console.error("Erè koneksyon:", err);
        return { data: null, error: { message: "Sèvè a pa reponn. Verifye koneksyon ou." } };
    }
}

async function logoutUser() {
    const { error } = await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
    return error;
}

// Listener d'auth: utile pour redirect automatique ou mise à jour UI
function onAuthChange(callback) {
    return supabaseClient.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

// Fonksyon pou uploade imaj nan Storage
async function uploadImage(file) {
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabaseClient.storage
        .from('product-images')
        .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: urlData } = supabaseClient.storage.from('product-images').getPublicUrl(data.path);
    return urlData.publicUrl;
}

// Expose helpers globally for pages
window.supabaseHelpers = {
    supabase: supabaseClient,
    getCurrentUser,
    signUpUser,
    signInUser,
    logoutUser,
    onAuthChange,
    ADMIN_EMAIL,
    uploadImage
};
