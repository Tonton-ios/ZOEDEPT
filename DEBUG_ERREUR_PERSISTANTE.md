# 🔧 DEBUGGING - "Variables MonCash/Supabase manquantes"

## ⚠️ CE GUIDE RÉSOUT L'ERREUR PERSISTANTE

Si vous recevez toujours cette erreur, suivez **EXACTEMENT** les étapes ci-dessous.

---

## 🔍 DIAGNOSTIC COMPLET

### ✅ ÉTAPE 1: Vérifier que le SQL a été exécuté dans Supabase

1. Allez sur [app.supabase.com](https://app.supabase.com)
2. Sélectionnez **ZOEDEPT**
3. Menu gauche → **Table Editor**
4. Vous devez voir **EXACTEMENT** ces 8 tables:

```
✓ orders
✓ transactions
✓ preorders
✓ promo_codes
✓ payment_notifications
✓ products
✓ users_profiles
✓ user_addresses
```

**❌ Si ces tables n'existent pas:**
- Allez dans **SQL Editor**
- Créez **New Query**
- Ouvrez le fichier `SQL_COMPLET.sql`
- Copiez TOUT
- Collez dans SQL Editor de Supabase
- Cliquez **"Run"**
- ✅ Attendez que les tables apparaissent

---

### ✅ ÉTAPE 2: Vérifier TOUTES les variables Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Sélectionnez **ZOEDEPT**
3. Allez dans **Settings** → **Environment Variables**

**VOUS DEVEZ VOIR EXACTEMENT CES 9 VARIABLES:**

```
SUPABASE_URL              ••••••• (toutes les variables affichent ••••)
SUPABASE_KEY              •••••••
MONCASH_CLIENT_ID         •••••••
MONCASH_CLIENT_SECRET     •••••••
MONCASH_BUSINESS_KEY      •••••••
MONCASH_SECRET_API_KEY    •••••••
MONCASH_API_BASE_URL      •••••••
MONCASH_GATEWAY_BASE_URL  •••••••
MONCASH_CHECKOUT_BASE_URL ••••••• (optionnel, mais ajoutez-le)
```

**❌ Si l'une manque:**

Allez voir [CONFIG_FINAL.md](./CONFIG_FINAL.md) pour les valeurs exactes et ajoutez-les.

**Noms EXACTS (attention à la casse!):**
```
SUPABASE_URL
SUPABASE_KEY
MONCASH_CLIENT_ID
MONCASH_CLIENT_SECRET
MONCASH_BUSINESS_KEY
MONCASH_SECRET_API_KEY
MONCASH_API_BASE_URL
MONCASH_GATEWAY_BASE_URL
MONCASH_CHECKOUT_BASE_URL
```

---

### ✅ ÉTAPE 3: Vider le cache Vercel et redéployer

**C'EST CRITIQUE!**

1. Allez dans **Settings** → **Git**
2. Cherchez **"Build & Development Settings"**
3. Cliquez **"Clear Build Cache"**
4. Attendez confirmation

Puis:

1. Allez dans **Deployments**
2. Trouvez le **dernier déploiement** (tout en haut)
3. Cliquez dessus pour l'ouvrir
4. Cliquez le bouton **"Redeploy"** (en haut à droite)
5. ✅ Attendez que le status passe à **"Ready"** (vert)

---

### ✅ ÉTAPE 4: Vérifier que l'API existe et répond

Ouvrez **directement** dans navigateur:

```
https://zoedept-store.vercel.app/api/creer-paiement
```

*(Remplacez `zoedept-store.vercel.app` par votre vrai domaine)*

**Vous devriez voir:**

```json
{"error":"Méthode non autorisée."}
```

✅ Si vous voyez ça → L'API répond (bon signe!)

**❌ Si vous voyez:**
- **404** → L'API n'existe pas ou n'est pas déployée
- **Page vide** → Problème de déploiement
- **Erreur 500** → Les variables manquent vraiment

---

### ✅ ÉTAPE 5: Vérifier les logs Vercel

1. Allez dans **Deployments**
2. Ouvrez le **dernier déploiement**
3. Cliquez **"Runtime Logs"** (onglet)
4. Cherchez les messages d'erreur

**Vous cherchez:**
- ❌ `ENOENT` → Fichier n'existe pas
- ❌ `SyntaxError` → Erreur dans le code
- ❌ `Variables manquantes` → Les variables ne passent pas

**Si vous trouvez une erreur, copiez-la et consultez la section TROUBLESHOOTING ci-dessous.**

---

### ✅ ÉTAPE 6: Tester localement d'abord

Avant de tester sur Vercel, testez **localement**:

```bash
cd /Users/Ernston/Documents/mai2026/ZOEDEPT

# Installez Vercel CLI (une seule fois)
npm install -g vercel

# Lancez le serveur local (simule Vercel)
vercel dev
```

Ouvrez `http://localhost:3000` et essayez "Peye kounya".

**Si ça marche localement mais pas sur Vercel** → Problème de déploiement
**Si ça ne marche pas non plus localement** → Problème dans le code ou SQL

---

## 🚨 TROUBLESHOOTING SPÉCIFIQUE

### ❌ Erreur: "Table 'orders' does not exist"

**Solution:**
- SQL n'a PAS été exécuté dans Supabase
- Allez dans Supabase → SQL Editor
- Exécutez `SQL_COMPLET.sql`
- Vérifiez que les 8 tables apparaissent

---

### ❌ Erreur: "SUPABASE_URL is undefined"

**Solution:**
1. Une variable manque sur Vercel
2. Vérifiez que SUPABASE_URL est bien listée dans Environment Variables
3. Vérifiez le **nom exact** (pas de typo!)
4. Clear Build Cache + Redeploy

---

### ❌ Erreur: "Cannot read property 'crypto'"

**Solution:**
- Le fichier `api/creer-paiement.js` a un problème
- Vérifiez qu'il importe correctement `crypto`
- La première ligne doit être: `import crypto from 'node:crypto';`

---

### ❌ Erreur: "500 Internal Server Error"

**Solutions:**

1. Vérifiez les logs Vercel (Deployments → Runtime Logs)

2. Si les logs disent "Variables MonCash manquantes":
   - Toutes les 9 variables doivent être sur Vercel
   - Les noms doivent être EXACTS
   - Clear Build Cache + Redeploy

3. Si les logs disent "Table does not exist":
   - Exécutez SQL dans Supabase

4. Si les logs ne montrent rien:
   - C'est un problème silencieux
   - Testez localement avec `vercel dev` pour voir les erreurs

---

### ❌ Erreur: "404 Not Found"

**Solution:**
- L'API n'existe pas ou n'a pas été déployée
- Vérifiez que le fichier `api/creer-paiement.js` existe
- Redéployez Vercel

---

## 📋 CHECKLIST COMPLÈTE

- [ ] **8 tables créées dans Supabase** (vérifiez Table Editor)
- [ ] **9 variables sur Vercel** (Settings → Environment Variables)
- [ ] **Cache Vercel vidé** (Settings → Git → Clear Build Cache)
- [ ] **Redéployé** (Deployments → Redeploy latest)
- [ ] **Attendu 2-3 min** pour que le déploiement se termine
- [ ] **Vérifié que l'API répond** (ouvrez /api/creer-paiement dans navigateur)
- [ ] **Vérifiez les logs** (Deployments → Runtime Logs)
- [ ] **Testé localement** (`vercel dev`)

---

## 🎯 ORDRE EXACT D'EXÉCUTION

1. **SQL d'abord** (Supabase)
   ```
   Allez dans SQL Editor → New Query → Collez SQL_COMPLET.sql → Run
   ```

2. **Variables ensuite** (Vercel)
   ```
   Settings → Environment Variables → Ajoutez les 9 variables
   ```

3. **Videz cache + redéployez** (Vercel)
   ```
   Settings → Git → Clear Build Cache
   Deployments → Redeploy
   ```

4. **Attendez** (5 minutes)
   ```
   Le déploiement doit passer à "Ready"
   ```

5. **Testez** (Navigateur)
   ```
   https://zoedept-store.vercel.app/api/creer-paiement
   Vous devez voir: {"error":"Méthode non autorisée."}
   ```

---

## 🆘 SI APRÈS TOUT ÇA ÇA NE MARCHE TOUJOURS PAS

Faites ceci:

1. **Prenez une capture d'écran** de:
   - Supabase Table Editor (montrant les 8 tables)
   - Vercel Environment Variables (les 9 variables)
   - Erreur exacte que vous recevez
   - URL du projet Vercel

2. **Testez localement**:
   ```bash
   vercel dev
   ```
   Et notez exactement quelle erreur vous voyez

3. **Vérifiez les logs Vercel**:
   - Deployments → Latest → Runtime Logs
   - Copiez l'erreur exacte

4. **Envoyez-moi** tout ça et je diagnostiquerai le problème exact

---

## ✅ RÉSUMÉ RAPIDE

L'erreur "Variables MonCash/Supabase manquantes" signifie qu'**une ou plusieurs variables ne sont pas accessible** dans Vercel.

**Causes principales:**
1. SQL jamais exécuté → Tables n'existent pas
2. Variables jamais ajoutées → Vercel ne les voit pas
3. Cache de Vercel → Les anciennes variables sont en cache
4. API non redéployée → Vercel utilise l'ancienne version

**Solution:** Suivez la checklist ci-dessus dans l'ordre exact.

---

**Vous êtes capable de résoudre ça! 💪 Envoyez-moi des détails si ça ne marche pas.**
