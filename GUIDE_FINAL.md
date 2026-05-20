# 🚀 GUIDE FINAL - PAIEMENT ZOEDEPT OPÉRATIONNEL

**Date:** 20 mai 2026  
**Objectif:** Rendre le bouton "Peye kounya" 100% fonctionnel

---

## ⚠️ ÉTAPES CRITIQUES (DANS CET ORDRE)

### ✅ ÉTAPE 1: Créer les Tables Supabase (URGENT!)

**Durée:** 2 minutes

1. Allez sur [app.supabase.com](https://app.supabase.com)
2. Sélectionnez **ZOEDEPT**
3. Menu gauche → **SQL Editor**
4. Cliquez **"New Query"**
5. Ouvrez [SQL_COMPLET.sql](./SQL_COMPLET.sql)
6. **Copiez TOUT**
7. **Collez** dans Supabase
8. Cliquez **"Run"** 

✅ **Attendez que les 8 tables apparaissent dans "Table Editor"**

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

---

### ✅ ÉTAPE 2: Vérifier les Variables Vercel

**Durée:** 2 minutes

Allez sur [vercel.com](https://vercel.com) → ZOEDEPT → **Settings** → **Environment Variables**

**Ces 9 variables doivent être présentes:**

| ✓ | Variable | Status |
|---|----------|--------|
| ✓ | SUPABASE_URL | Présente |
| ✓ | SUPABASE_KEY | Présente |
| ✓ | MONCASH_CLIENT_ID | Présente |
| ✓ | MONCASH_CLIENT_SECRET | Présente |
| ✓ | MONCASH_BUSINESS_KEY | Présente |
| ✓ | MONCASH_SECRET_API_KEY | Présente |
| ✓ | MONCASH_API_BASE_URL | Présente |
| ✓ | MONCASH_GATEWAY_BASE_URL | Présente |
| ? | MONCASH_CHECKOUT_BASE_URL | *(Optionnel)* |

Si une manque → ajoutez-la (voir [CONFIG_FINAL.md](./CONFIG_FINAL.md))

---

### ✅ ÉTAPE 3: Redéployer Vercel

**Durée:** 1-2 minutes

1. Dans Vercel → **Settings** → **Git**
2. Cliquez **"Clear Build Cache"**
3. Allez dans **Deployments** (onglet)
4. Trouvez le dernier déploiement
5. Cliquez **"Redeploy"**

✅ **Attendez que le déploiement soit ✓ Ready**

---

### ✅ ÉTAPE 4: Configurer le Return URL chez Digicel

**Durée:** 5 minutes

⚠️ **À faire une seule fois dans votre account Digicel:**

1. Allez sur votre **Digicel MonCash Dashboard**
2. Sélectionnez votre **Business Account**
3. Allez dans **Settings** ou **Configuration**
4. Cherchez **"Return URL"** ou **"Callback URL"**
5. Mettez:

```
https://YOUR_DOMAIN/api/paiement-callback
```

**Remplacer `YOUR_DOMAIN` par:**
- Si vous testez localement: `http://localhost:3000` (avec `vercel dev`)
- Si c'est sur Vercel: `https://votre-domaine.vercel.app`

Exemple réel:
```
https://zoedept-store.vercel.app/api/paiement-callback
```

6. **Sauvegardez**

---

## 🧪 ÉTAPE 5: Tester Localement (RECOMMANDÉ)

**Durée:** 5-10 minutes

```bash
cd /Users/Ernston/Documents/mai2026/ZOEDEPT

# Installation Vercel CLI (une seule fois)
npm install -g vercel

# Développement local simulant Vercel
vercel dev
```

Puis:
1. Ouvrez `http://localhost:3000`
2. Naviguez vers un produit
3. Cliquez **"Achte kounya"** (ajouter au panier)
4. Cliquez **"Peye kounya"** (paiement)
5. Remplissez le formulaire
6. Cliquez **"Peye kounya"** (bouton de paiement)

✅ **Vous devriez être redirigé vers MonCash Sandbox**

---

## ✅ ÉTAPE 6: Tester sur Vercel

1. Visitez: `https://votre-domaine.vercel.app`
2. Répétez l'étape 5

✅ **Succès! Le paiement fonctionne!**

---

## 🔄 FLUX COMPLET DE PAIEMENT

```
┌─────────────────────────────────────┐
│ 1. Client clique "Peye kounya"      │
│    (shop-products.js → /api/creer-paiement)
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 2. Créer ordre dans Supabase        │
│    Table: orders (status: pending)  │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 3. Créer transaction d'attente      │
│    Table: transactions              │
│    (statut: en_attente)             │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 4. Envoyer requête à MonCash        │
│    URL: Middleware Checkout         │
│    Paramètres chiffrés RSA          │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 5. Redirection vers MonCash         │
│    Client effectue paiement         │
│    Appel OTP reçu par SMS           │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 6. Client confirme OTP              │
│    MonCash valide paiement          │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 7. MonCash redirige vers:           │
│    /api/paiement-callback           │
│    ?transactionId=ENCRYPTED_VALUE   │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 8. Décoder transactionId            │
│    Appel API MonCash pour détails   │
│    (verifier paiement réussi)       │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 9. Mettre à jour BD:                │
│    - transactions (statut: complete)│
│    - orders (status: paid)          │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 10. Redirection confirmation        │
│     /confirmation.html              │
│     ✅ Succès!                      │
└─────────────────────────────────────┘
```

---

## 📁 FICHIERS MODIFIÉS/CRÉÉS

| Fichier | Description | Status |
|---------|-------------|--------|
| `SQL_COMPLET.sql` | 8 tables + indexes | ✅ À exécuter |
| `api/creer-paiement.js` | Créer commande & paiement | ✅ Mis à jour |
| `api/paiement-callback.js` | Callback MonCash | ✅ Nouveau |
| `api/verifier-paiement.js` | Vérification (optionnel) | ✅ Fonctionnel |
| `.env.local` | Vars locales | ✅ Complet |
| `vercel.json` | Config Vercel | ✅ Complet |

---

## 🚨 TROUBLESHOOTING

### ❌ Erreur: "Variables MonCash/Supabase manquantes"

**Solution:**
1. Vérifiez que SQL a été exécuté dans Supabase ✓
2. Vérifiez toutes 9 variables sur Vercel ✓
3. Cliquez "Clear Build Cache" sur Vercel ✓
4. Redéployez ✓

### ❌ Erreur: "Table 'orders' n'existe pas"

**Solution:**
- SQL n'a pas été exécuté
- Allez dans Supabase → SQL Editor
- Exécutez `SQL_COMPLET.sql`

### ❌ Redirection MonCash ne fonctionne pas

**Solution:**
1. Vérifiez Return URL configuré chez Digicel ✓
2. Testez localement avec `vercel dev` ✓
3. Vérifiez logs Vercel (Deployments → Runtime Logs)

### ❌ "Décryption MonCash échouée"

**Solution:**
- Vérifiez que `MONCASH_SECRET_API_KEY` est correct
- Assurez-vous qu'il n'y a pas d'espaces avant/après

---

## 📞 SUPPORT DIGICEL

Si vous avez des questions sur MonCash Sandbox:
- **Email:** support@digicelgroup.com
- **Documentation:** Consultez le fichier joint (DIGICEL_MONCASH_DOC.txt)

---

## ✨ APRÈS SUCCÈS

Une fois "Peye kounya" opérationnel:

1. **Testez plusieurs commandes** pour valider
2. **Consultez Supabase** pour voir les commandes enregistrées
3. **Quand prêt pour production:**
   - Contactez Digicel pour Business Account Production
   - Mettez à jour les URLs MonCash (production)
   - Changez MONCASH_BUSINESS_KEY & SECRET_API_KEY

---

## ✅ CHECKLIST FINAL

- [ ] SQL exécuté dans Supabase (8 tables créées)
- [ ] 9 variables Vercel présentes et correctes
- [ ] Cache Vercel cleared
- [ ] Vercel redéployé
- [ ] Return URL configuré chez Digicel
- [ ] Test local avec `vercel dev` réussi
- [ ] Test sur Vercel réussi
- [ ] Bouton "Peye kounya" fonctionne ✅

---

**Vous êtes prêt! Bon paiement! 🎉**
