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
CREATE TABLE IF NOT EXISTS users_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  user_id UUID REFERENCES auth.users(id),
  customer_email TEXT,
  customer_phone TEXT,
  customer_first_name TEXT,
  customer_last_name TEXT,
  customer_address TEXT,
  customer_country TEXT DEFAULT 'Haiti',
  payment_method TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal_htg DECIMAL(10, 2),
  shipping_htg DECIMAL(10, 2) DEFAULT 0,
  discount_htg DECIMAL(10, 2) DEFAULT 0,
  total_htg DECIMAL(10, 2),
  promo_code TEXT,
  total DECIMAL(10, 2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Si `orders` existe deja:

```sql
ALTER TABLE orders
ALTER COLUMN user_id DROP NOT NULL,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_first_name TEXT,
ADD COLUMN IF NOT EXISTS customer_last_name TEXT,
ADD COLUMN IF NOT EXISTS customer_address TEXT,
ADD COLUMN IF NOT EXISTS customer_country TEXT DEFAULT 'Haiti',
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS subtotal_htg DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS shipping_htg DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_htg DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_htg DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS promo_code TEXT;
```

#### Table: products
Si votre table `products` existe deja, ajoutez ces colonnes pour profiter de toutes les options admin:

```sql
ALTER TABLE products
ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS color_variants JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS collection TEXT,
ADD COLUMN IF NOT EXISTS product_type TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS material TEXT,
ADD COLUMN IF NOT EXISTS fit TEXT,
ADD COLUMN IF NOT EXISTS care TEXT,
ADD COLUMN IF NOT EXISTS stock_qty INTEGER,
ADD COLUMN IF NOT EXISTS compare_at_usd DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS preorder_ready_at DATE,
ADD COLUMN IF NOT EXISTS preorder_note TEXT;
```

#### Table: preorders
Pour recevoir les demandes de pre commande dans le panel admin:

```sql
CREATE TABLE IF NOT EXISTS preorders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID,
  product_name TEXT,
  product_image_url TEXT,
  selected_size TEXT,
  selected_color TEXT,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  price_usd DECIMAL(10, 2),
  status TEXT DEFAULT 'preorder',
  preorder_ready_at DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Si `preorders` existe deja, ajoutez simplement la colonne size:

```sql
ALTER TABLE preorders
ADD COLUMN IF NOT EXISTS selected_size TEXT,
ADD COLUMN IF NOT EXISTS selected_color TEXT;
```

#### Table: promo_codes
Pour creer des rabais depuis le panel admin:

```sql
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER NOT NULL,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Si RLS est active sur `preorders`, ajoutez au minimum une policy pour permettre aux visiteurs de creer une pre commande:

```sql
ALTER TABLE preorders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visitors can create preorders"
ON preorders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can read their own preorders"
ON preorders
FOR SELECT
TO authenticated
USING (customer_email = auth.jwt() ->> 'email');

CREATE POLICY "Admin can read all preorders"
ON preorders
FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' = 'zoedept2026@gmail.com');

CREATE POLICY "Visitors can create orders"
ON orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can read their own orders"
ON orders
FOR SELECT
TO authenticated
USING (customer_email = auth.jwt() ->> 'email' OR user_id = auth.uid());

CREATE POLICY "Admin can manage all orders"
ON orders
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' = 'zoedept2026@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'zoedept2026@gmail.com');

CREATE POLICY "Visitors can read active promo codes"
ON promo_codes
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Visitors can update promo usage"
ON promo_codes
FOR UPDATE
TO anon, authenticated
USING (is_active = true)
WITH CHECK (is_active = true);

CREATE POLICY "Admin can manage promo codes"
ON promo_codes
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' = 'zoedept2026@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'zoedept2026@gmail.com');
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
