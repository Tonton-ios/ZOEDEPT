# 📝 CONFIGURATION RETURN URL DIGICEL - COPIER/COLLER

## 🎯 RÉSUMÉ RAPIDE

Le **Return URL** c'est l'adresse où MonCash te renvoie **après** que le client paie.

Nous avons créé un endpoint `api/paiement-callback.js` qui traite ce retour.

---

## ✅ ÉTAPE 1: Déterminer votre domaine

### **CAS 1: Vous testez localement**

Utilisez:
```
http://localhost:3000/api/paiement-callback
```

Pour cela, lancez:
```bash
cd /Users/Ernston/Documents/mai2026/ZOEDEPT
vercel dev
```

### **CAS 2: Vous testez sur Vercel (PRODUCTION)**

Votre domaine est probablement:
```
https://zoedept-store.vercel.app
```

Remplacez dans:
```
https://zoedept-store.vercel.app/api/paiement-callback
```

**Trouver votre domaine Vercel:**
- Allez sur vercel.com
- Sélectionnez ZOEDEPT
- Cherchez en haut à droite le lien principal (ex: zoedept-store.vercel.app)

---

## 🌐 ÉTAPE 2: Configurer chez Digicel

### **Option A: Si vous avez un Digicel Business Portal**

1. Allez sur le **Digicel MonCash Merchant Portal**
   - Adresse: `https://moncashbutton.digicelgroup.com` (ou domaine fourni par Digicel)

2. **Connectez-vous** avec vos identifiants

3. Allez dans **Settings** ou **Configuration** (cherchez ce menu)

4. Cherchez **"Return URL"**, **"Callback URL"**, **"Success URL"**, ou **"Notification URL"**

5. **Collez votre URL:**

**Pour local:**
```
http://localhost:3000/api/paiement-callback
```

**Pour Vercel:**
```
https://zoedept-store.vercel.app/api/paiement-callback
```

6. **Sauvegardez** (bouton Save/Valider)

---

### **Option B: Contact Digicel (Si pas de portal)**

Si vous n'avez pas accès au portal, **envoyez un email à:**

```
support@digicelgroup.com
```

**Sujet:**
```
Configuration Return URL pour Business Key: VFRCV1JXVXlXbk5pY2tFOSBYMk5ZY25aTk0wZFJTVVkxYzBWd2JYWnJSME5rUVQwOQ==
```

**Message:**
```
Bonjour,

Je dois configurer le Return URL pour mon intégration MonCash.

Return URL demandé:
https://zoedept-store.vercel.app/api/paiement-callback

Business Key: VFRCV1JXVXlXbk5pY2tFOSBYMk5ZY25aTk0wZFJTVVkxYzBWd2JYWnJSME5rUVQwOQ==

Merci de confirmer.

Cordialement
```

---

## 🔄 ÉTAPE 3: Ajouter aussi l'Alert URL (Optionnel mais recommandé)

**Alert URL** = C'est l'URL pour les notifications en arrière-plan (sans redirection)

Collez la même URL:
```
https://zoedept-store.vercel.app/api/paiement-callback
```

---

## ✅ ÉTAPE 4: Vérifier que ça fonctionne

### **Test Local:**

1. Ouvrez terminal:
```bash
cd /Users/Ernston/Documents/mai2026/ZOEDEPT
vercel dev
```

2. Ouvrez `http://localhost:3000`

3. Cliquez **"Achte kounya"** sur un produit

4. Remplissez le formulaire

5. Cliquez **"Peye kounya"** (bouton paiement)

6. Sur MonCash Sandbox, complétez le paiement

7. Vous devriez être redirigé vers `/confirmation.html`

✅ **Si ça marche** → C'est bon!

### **Test Vercel:**

1. Visitez `https://zoedept-store.vercel.app`

2. Répétez les étapes 3-7 ci-dessus

✅ **Si ça marche** → C'est 100% opérationnel!

---

## 🚨 TROUBLESHOOTING

### ❌ "Callback never received"

**Solutions:**

1. Vérifiez que le domaine est **EXACT** (pas de typo)
   
2. Vérifiez que `api/paiement-callback.js` existe

3. Redéployez sur Vercel:
   - Settings → Git → "Clear Build Cache"
   - Deployments → Redeploy

4. Vérifiez les logs:
   - Vercel → Deployments → Latest → "Runtime Logs"
   - Cherchez les erreurs

### ❌ "URL not accessible"

**Solutions:**

1. Testez l'URL directement dans le navigateur:
   ```
   https://zoedept-store.vercel.app/api/paiement-callback?transactionId=test
   ```
   
   Vous devriez voir une erreur JSON (c'est normal)

2. Si page vide → URL incorrect

3. Si erreur 404 → le fichier n'existe pas

---

## 📋 RÉSUMÉ CONFIG

### **Sandbox (Développement)**

| Configuration | Valeur |
|---|---|
| Return URL | `https://zoedept-store.vercel.app/api/paiement-callback` |
| Alert URL | `https://zoedept-store.vercel.app/api/paiement-callback` |
| Business Key | `VFRCV1JXVXlXbk5pY2tFOSBYMk5ZY25aTk0wZFJTVVkxYzBWd2JYWnJSME5rUVQwOQ==` |
| Secret API Key | `MDwwDQYJKoZIhvcNAQEBBQADKwAwKAIhAKccDGZlObWQcB6qFmtyCZfckQCFFLZLB+8fTpYRfTMBAgMBAAE=` |

### **Production (Quand vous serez prêt)**

Contactez Digicel pour:
- Production Business Key
- Production Secret API Key
- Production URLs
- Mise à jour Return URL en production

---

## 🎯 PROCHAINES ÉTAPES

1. ✅ Exécuter SQL_COMPLET.sql dans Supabase
2. ✅ Variables Vercel configurées
3. ✅ Redéployer Vercel
4. **➡️ MAINTENANT: Configurer Return URL (ce fichier)**
5. Tester "Peye kounya"

---

## 📞 CONTACTS

**Digicel Support:**
- Email: `support@digicelgroup.com`
- Tél: À obtenir via votre account manager

**Problèmes techniques:**
- Vérifiez les logs Vercel
- Testez localement avec `vercel dev`
- Consultez la documentation Digicel jointe

---

**Vous êtes prêt! 🚀**
