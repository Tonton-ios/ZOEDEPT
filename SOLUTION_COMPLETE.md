# ✅ SOLUTION COMPLÈTE - PAIEMENT ZOEDEPT

## 🎯 PROBLÈME RÉSOLU

**Erreur:** `Erè MonCash: Variables MonCash/Supabase manquantes sur Vercel.`

**Cause:** Les **tables Supabase n'existaient pas**

---

## 📋 ÉTAPE 1: Créer les tables Supabase (CRITIQUE!)

### ⚠️ IMPORTANT - À faire MAINTENANT:

1. Allez sur [app.supabase.com](https://app.supabase.com)
2. Sélectionnez votre projet **ZOEDEPT**
3. Allez dans **SQL Editor** (à gauche)
4. Cliquez **"New Query"**
5. **Ouvrez le fichier** `SQL_COMPLET.sql` (à côté de ce fichier)
6. **Copiez TOUT le contenu**
7. **Collez dans Supabase SQL Editor**
8. Cliquez **"Run"**

✅ **Les 8 tables seront créées automatiquement**

---

## 🔌 ÉTAPE 2: Ajouter Return URL à Vercel (IMPORTANTE!)

Vous devez configurer Vercel pour le **callback de paiement**.

### Sur Vercel:

Allez dans **Settings → Environment Variables** et ajoutez:

| Variable | Valeur |
|----------|--------|
| `VERCEL_PROJECT_URL` | votre_domaine_vercel.com (ex: zoedept-store.vercel.app) |

Ou laissez le code déterminer automatiquement via headers.

---

## 🧪 ÉTAPE 3: Tester localement (OPTIONNEL mais RECOMMANDÉ)

```bash
# Dans le dossier ZOEDEPT
vercel dev
```

Cela simule exactement l'environnement Vercel.

---

## 📝 ÉTAPE 4: Configuration MonCash complète

**Vous avez déjà les variables essentielles.**

Assurez-vous que le **Return URL est configuré** dans Digicel:

- **Return URL:** `https://votre-domaine.com/api/paiement-callback`
- **Alert URL:** `https://votre-domaine.com/api/paiement-callback` (identique pour sandbox)

---

## 🔄 FLUX DE PAIEMENT COMPLET

```
1. Client clique "Peye kounya"
       ↓
2. Création commande dans Supabase (table: orders)
       ↓
3. Création transaction en attente (table: transactions)
       ↓
4. Redirection vers MonCash avec Return URL
       ↓
5. Client paie sur MonCash
       ↓
6. MonCash redirige vers: /api/paiement-callback?transactionId=XXX
       ↓
7. Décryption du transactionId
       ↓
8. Récupération détails de la transaction MonCash
       ↓
9. Mise à jour table: transactions (statut: complete)
       ↓
10. Mise à jour table: orders (status: paid)
       ↓
11. Redirection vers confirmation.html ✅
```

---

## 📁 FICHIERS CRÉÉS/MODIFIÉS

| Fichier | Rôle | Statut |
|---------|------|--------|
| `SQL_COMPLET.sql` | 8 tables + indexes | ✅ À exécuter |
| `api/creer-paiement.js` | Crée commande & paiement | ✅ Opérationnel |
| `api/paiement-callback.js` | Callback MonCash | ✅ Nouveau |
| `api/verifier-paiement.js` | Vérification (optionnel) | ✅ Opérationnel |

---

## ⚙️ STRUCTURE DES TABLES

### `orders` - Commandes
```
id, user_id, customer_email, customer_phone, items,
subtotal_htg, shipping_htg, discount_htg, total_htg,
status (pending → paid → processing → shipped → delivered),
created_at, updated_at
```

### `transactions` - Paiements MonCash
```
id, order_id, supabase_order_id, montant, statut,
transaction_id, payer, trans_number, moncash_reference,
created_at, updated_at
```

### `preorders` - Pré-commandes
```
id, product_id, product_name, customer_email,
customer_phone, customer_address, status, preorder_ready_at
```

### `promo_codes` - Codes promotionnels
```
id, code, discount_percent, is_active, usage_limit,
used_count, expiry_date
```

---

## 🚨 SI L'ERREUR PERSISTE

### Checklist:

- [ ] SQL exécuté sur Supabase? (8 tables créées?)
  - Vérifiez: Supabase → Table Editor → Vous devez voir: orders, transactions, preorders, promo_codes, payment_notifications, products, users_profiles, user_addresses

- [ ] Variables Vercel correctes?
  - ✅ SUPABASE_URL
  - ✅ SUPABASE_KEY
  - ✅ MONCASH_CLIENT_ID
  - ✅ MONCASH_CLIENT_SECRET
  - ✅ MONCASH_BUSINESS_KEY
  - ✅ MONCASH_SECRET_API_KEY
  - ✅ MONCASH_API_BASE_URL
  - ✅ MONCASH_GATEWAY_BASE_URL
  - ✓ MONCASH_CHECKOUT_BASE_URL (optionnel)

- [ ] Vercel redéployé après ajout des variables?
  - Settings → Git → "Clear Build Cache"
  - Allez dans Deployments → Cliquez sur le latest → "Redeploy"

- [ ] Vérifiez les logs Vercel:
  - Deployments → Latest → "Runtime Logs"
  - Cherchez les erreurs

---

## 🎉 APRÈS CONFIGURATION

Testez le flux complet:
1. Visitez votre site
2. Ajouter un produit au panier
3. Cliquez **"Peye kounya"**
4. Remplissez le formulaire de commande
5. Cliquez **"Peye kounya"** (bouton de paiement)
6. Vous serez redirigé vers MonCash Sandbox

**Succès! ✅**

---

## 📞 DIGICEL DOCUMENTATION

La documentation fournie indique:
- ✅ Encryption RSA avec NO_PADDING (implémenté)
- ✅ Return URL avec transactionId encrypté (implémenté dans `paiement-callback.js`)
- ✅ Notification de paiement (système de notification en place)
- ✅ Endpoint pour récupérer détails transaction (intégré dans `paiement-callback.js`)

---

## 🎯 RÉSUMÉ DES ACTIONS

| Action | Priority | Status |
|--------|----------|--------|
| Exécuter SQL_COMPLET.sql | 🔴 URGENT | À faire NOW |
| Vérifier variables Vercel | 🟠 Important | Fait (sauf Return URL config) |
| Redéployer Vercel | 🟠 Important | À faire après SQL |
| Tester "Peye kounya" | 🟡 Optionnel | Après les deux points précédents |

---

**Commencez par le SQL! C'est la clé! 🔑**
