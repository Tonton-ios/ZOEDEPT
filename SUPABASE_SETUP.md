# ZOE DEPT. - Configuration Backend avec Supabase

## Guide de Configuration

### Étape 1 : Créer un compte Supabase
1. Allez sur [https://app.supabase.com](https://app.supabase.com)
2. Créez un nouveau compte
3. Créez un nouveau projet

### Étape 2 : Récupérer les clés d'API
1. Ouvrez votre projet Supabase
2. Allez dans **Settings > API**
3. Trouvez:
   - **Project URL** (copiez l'URL complète)
   - **Anon Public Key** (la clé publique)

### Étape 3 : Configurer le fichier supabase.js
1. Ouvrez `supabase.js` dans le répertoire racine
2. Remplacez:
   - `YOUR_SUPABASE_URL` par votre Project URL
   - `YOUR_SUPABASE_ANON_KEY` par votre Anon Public Key

Exemple:
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### Étape 4 : Configurer l'authentification
1. Dans Supabase, allez dans **Authentication > Providers**
2. Assurez-vous que **Email** est activé
3. Personnalisez les emails de confirmation si désiré

### Étape 5 : Créer les tables de données
Dans Supabase SQL Editor, créez:

#### Table: users_profiles
```sql
CREATE TABLE users_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: user_addresses
```sql
CREATE TABLE user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  address TEXT,
  city TEXT,
  country TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: orders
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  total DECIMAL(10, 2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Étape 6 : Configurer les politiques RLS (Row Level Security)
Pour la sécurité, activez RLS sur vos tables et configurez les politiques.

### Pages Disponibles

- **login.html** - Page de connexion
- **signup.html** - Page d'inscription
- **account.html** - Page du compte utilisateur

### Textes en Créole Haïtien

- Koneksyon = Connexion
- Modpas = Mot de passe
- Adrès imèl = Adresse email
- Kreye yon kont = Créer un compte
- Kont Mwen = Mon compte
- Fèmen sesyon = Déconnexion
- Istwa Kòmand = Historique des commandes

### Notes Importantes

- Tous les fichiers d'images de produits ont été supprimés
- Le logo du site a été remplacé par du texte
- L'authentification utilise Supabase Auth
- Le stockage des données est sécurisé avec les politiques RLS
