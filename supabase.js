// Configuration Supabase
// Remplacez par vos vraies valeurs (URL complète et clé anon)
const SUPABASE_URL = 'https://YOUR-SUPABASE-URL.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

// Inisyalize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Option: identifiants admin (si vous voulez un accès admin simple côté client)
// ATTENTION: stocker des secrets côté client n'est pas sécurisé en production.
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_CODE = 'ZOE2024ADMIN'; // Ton code spécial

// Fonksyon pou rekupere itilizatè ki konekte a
async function getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
}

// Fonksyon pou enskripsyon (Kreye yon kont)
async function signUpUser(email, password, firstName, lastName) {
    const { data, error } = await supabase.auth.signUp({
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) return { data, error };

    // Si c'est l'admin (Email spécial + Password qui sert de Code spécial)
    if (email === ADMIN_EMAIL && password === ADMIN_CODE) {
        localStorage.setItem('adminAccess', '1');
        window.location.href = 'admin.html';
    } else {
        // Sinon redirection normale
        window.location.href = 'account.html'; // Redireksyon vè kont itilizatè
    }
    
    return { data, error };
}

async function logoutUser() {
    const { error } = await supabase.auth.signOut();
    window.location.href = 'index.html';
    return error;
}

// Listener d'auth: utile pour redirect automatique ou mise à jour UI
function onAuthChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

// Expose helpers globally for pages
window.supabaseHelpers = {
    supabase,
    getCurrentUser,
    signUpUser,
    signInUser,
    logoutUser,
    onAuthChange,
    ADMIN_EMAIL,
    ADMIN_CODE
};
