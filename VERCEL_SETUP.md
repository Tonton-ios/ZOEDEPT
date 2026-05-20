# 🚀 Configuration Vercel - ZOEDEPT

## ⚠️ ERREUR ACTUELLE
`Erè MonCash: Variables MonCash/Supabase manquantes sur Vercel.`

Cette erreur signifie que les variables d'environnement ne sont pas configurées sur Vercel.

---

## ✅ SOLUTION: Configuration sur Vercel

### Étape 1: Accédez à Vercel
1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous à votre compte
3. Sélectionnez le projet **ZOEDEPT**
4. Allez dans **Settings** → **Environment Variables**

### Étape 2: Ajoutez les variables Supabase
Ajoutez ces 2 variables:

| Variable | Valeur |
|----------|--------|
| `SUPABASE_URL` | `https://nvhfbzhlzchyclzzjtka.supabase.co` |
| `SUPABASE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52aGZiemhsemNoeWNsenpqdGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NjIzNzEsImV4cCI6MjA5NDUzODM3MX0.mQ2oyNbFDmCqEK5jSz2W7mjkBr5G3MNRXBG5WxiutG4` |

### Étape 3: Ajoutez les variables MonCash
Ajoutez ces 6 variables:

| Variable | Valeur |
|----------|--------|
| `MONCASH_CLIENT_ID` | `e35354596a4101eb1bec996e4b6dd7a9` |
| `MONCASH_CLIENT_SECRET` | `daHxwLN6arUGnPTYFSOqpC8mS7hOdoTEFLQXOFeOx-fzDZx5rqOy4LMWxGYwxOU_` |
| `MONCASH_BUSINESS_KEY` | `VFRCV1JXVXlXbk5pY2tFOSBYMk5ZY25aTk0wZFJTVVkxYzBWd2JYWnJSME5rUVQwOQ==` |
| `MONCASH_SECRET_API_KEY` | `MDwwDQYJKoZIhvcNAQEBBQADKwAwKAIhAKccDGZlObWQcB6qFmtyCZfckQCFFLZLB+8fTpYRfTMBAgMBAAE=` |
| `MONCASH_API_BASE_URL` | `https://sandbox.moncashbutton.digicelgroup.com/Api` |
| `MONCASH_GATEWAY_BASE_URL` | `https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware` |

### Étape 4: Optionnel - Ajouter URL Checkout
Si vous voulez un contrôle plus fin:

| Variable | Valeur |
|----------|--------|
| `MONCASH_CHECKOUT_BASE_URL` | `https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware/Checkout` |

---

## 🔒 Sécurité
⚠️ **NE JAMAIS** partager ces clés publiquement!
- Le fichier `.env.local` est déjà dans `.gitignore`
- Ces valeurs sont utilisées uniquement côté serveur (API)
- Les clés sont sûres ici car c'est du sandbox

---

## 🧪 Test Local
Pour tester localement avant de déployer sur Vercel:

1. Le fichier `.env.local` contient déjà toutes les variables
2. Lancez votre serveur local (Node.js/Vercel CLI)
3. Testez le paiement

```bash
# Installation Vercel CLI (optionnel)
npm install -g vercel

# Développement local avec Vercel
vercel dev
```

---

## ✨ Après Configuration Vercel
1. Une fois les variables ajoutées, **redéployez** sur Vercel
   - Allez dans **Deployments** → Redéployez la branche
   - Ou effectuez un `git push` si auto-deploy est activé

2. Testez le bouton "Peye kounya" à nouveau

3. Si l'erreur persiste:
   - Videz le cache de Vercel: **Settings** → **Git** → **Clear Build Cache**
   - Redéployez

---

## 🔄 Production (Futur)
Quand vous passerez en production:
- Remplacez les URLs sandbox par les URLs production MonCash
- Obtenez une clé `MONCASH_CLIENT_SECRET` production
- Mettez à jour `MONCASH_BUSINESS_KEY` production
