# 🎨 NOUVEAU PANEL ADMINISTRATEUR - Documentation

## ✨ CE QUI A ÉTÉ AMÉLIORÉ

Le panel administrateur a été **complètement refait** pour simplifier la création d'utilisateurs.

### **Avant** ❌
- 2 écrans séparés (config Xtream + création de codes)
- Pas de vérification de la connexion
- Pas d'information sur l'expiration
- Workflow compliqué

### **Maintenant** ✅
- **1 seul écran** tout-en-un
- **Vérification automatique** de la connexion Xtream
- **Affichage de la date d'expiration** du compte
- **Copier/coller facile** du code généré
- **Workflow simplifié** : Remplir → Créer → Copier le code

---

## 🚀 COMMENT UTILISER LE NOUVEAU PANEL

### **Étape 1 : Accéder au panel**
Ouvrez : `https://iptv-player-48.preview.emergentagent.com/admin`

### **Étape 2 : Remplir le formulaire**

#### 📡 Identifiants Xtream Codes
- **DNS / URL du serveur** : L'adresse de votre serveur IPTV (ex: `http://example.com`)
- **Username** : Votre identifiant Xtream
- **Password** : Votre mot de passe Xtream

#### 👥 Configuration Utilisateur
- **Nombre max de profils** : Combien de profils cet utilisateur pourra créer (1-10)
  - Par défaut : **5 profils**

### **Étape 3 : Créer l'utilisateur**
Cliquez sur **"Créer l'utilisateur"**

L'application va automatiquement :
1. ✅ Se connecter au serveur IPTV
2. ✅ Vérifier que les identifiants sont valides
3. ✅ Récupérer la date d'expiration du compte
4. ✅ Sauvegarder la configuration
5. ✅ Générer un code unique (8 caractères)

### **Étape 4 : Copier le code**
Une fois créé, vous verrez :
- 🎯 Le **code utilisateur** en gros caractères rouges
- 📋 Un bouton **"Copier"** pour copier dans le presse-papiers
- 📊 Les **informations du compte** :
  - Username
  - Statut (Active/Expired)
  - Date d'expiration
  - Nombre de connexions max
  - Nombre de profils max

### **Étape 5 : Donner le code à votre utilisateur**
Envoyez simplement le code (ex: **AB12CD34**) à votre utilisateur final.

Il pourra :
1. Se connecter avec ce code sur l'application
2. Créer jusqu'à X profils (selon ce que vous avez configuré)
3. Profiter de l'IPTV !

---

## 🎯 EXEMPLE D'UTILISATION

### Scénario : Créer un utilisateur avec 3 profils

1. Vous remplissez :
   - DNS : `http://uvihkgki.leadernoob.xyz`
   - Username : `GYNRNT4N`
   - Password : `WL29K25J`
   - Profils max : `3`

2. Vous cliquez sur "Créer l'utilisateur"

3. L'app vérifie → ✅ Connexion OK !

4. Vous obtenez :
   ```
   Code utilisateur : XY12AB34
   
   Informations :
   - Username : GYNRNT4N
   - Statut : Active ✅
   - Expiration : 25/12/2026 23:59
   - Connexions max : 1
   - Profils max : 3
   ```

5. Vous copiez le code **XY12AB34** et l'envoyez à votre client

6. Le client se connecte avec ce code et peut créer 3 profils

---

## 🔄 CRÉER PLUSIEURS UTILISATEURS

Après avoir créé un utilisateur, vous pouvez :
- Cliquer sur **"Créer un autre utilisateur"** pour recommencer
- Utiliser les **mêmes identifiants Xtream** mais changer le nombre de profils
- Créer autant d'utilisateurs que nécessaire

Chaque utilisateur aura :
- Son propre code unique
- Sa propre limite de profils
- Les mêmes identifiants Xtream (en arrière-plan)

---

## ⚠️ GESTION DES ERREURS

### Si le DNS est incorrect :
```
❌ Erreur : Timeout: Le serveur IPTV ne répond pas. Vérifiez le DNS.
```
→ Vérifiez que l'URL commence par `http://` ou `https://`

### Si les identifiants sont invalides :
```
❌ Erreur HTTP 401: Identifiants invalides ou DNS incorrect
```
→ Vérifiez votre username et password

### Si le serveur ne répond pas :
```
❌ Erreur : Erreur de connexion: ...
```
→ Le serveur IPTV est peut-être temporairement indisponible

---

## 🆕 NOUVEAUX ENDPOINTS BACKEND

Un nouveau endpoint a été créé : `/api/admin/create-user-with-xtream`

### **Requête**
```json
POST /api/admin/create-user-with-xtream?max_profiles=5
{
  "dns_url": "http://example.com",
  "username": "user123",
  "password": "pass123"
}
```

### **Réponse (succès)**
```json
{
  "success": true,
  "code": "AB12CD34",
  "max_profiles": 5,
  "xtream_info": {
    "username": "user123",
    "status": "Active",
    "expiration_date": "25/12/2026 23:59",
    "expiration_timestamp": 1798329600,
    "max_connections": 1,
    "active_connections": 0
  }
}
```

### **Réponse (erreur)**
```json
{
  "detail": "Erreur HTTP 401: Identifiants invalides"
}
```

---

## 📱 INTERFACE UTILISATEUR

### **Écran de création**
- Formulaire clair avec tous les champs
- Bouton principal rouge (style Netflix)
- Encadré informatif expliquant les étapes
- Loading spinner pendant la vérification

### **Écran de résultat**
- Icône de succès verte (✅)
- Code en gros caractères rouges
- Bouton "Copier" bien visible
- Tableau récapitulatif des informations
- Boutons d'action :
  - "Créer un autre utilisateur"
  - "Retour à l'accueil"

---

## 🎨 DESIGN

- **Couleurs** :
  - Fond : Noir Netflix (#141414)
  - Primaire : Rouge Netflix (#E50914)
  - Succès : Vert (#00AA13)
  - Texte : Blanc / Gris

- **Typographie** :
  - Titres : Bold, 18-24px
  - Labels : 14px
  - Inputs : 16px
  - Code : 24px, Bold, Letterspaced

---

## 🔗 LIENS RAPIDES

- **Panel Admin** : https://iptv-player-48.preview.emergentagent.com/admin
- **App** : https://iptv-player-48.preview.emergentagent.com
- **Test API** : https://iptv-player-48.preview.emergentagent.com/test-api

---

## 📋 FICHIERS MODIFIÉS

1. **Backend** : `/app/backend/server.py`
   - Ajout de l'endpoint `create_user_with_xtream`
   - Vérification de connexion intégrée
   - Récupération des infos du compte

2. **Frontend** : `/app/frontend/app/admin.tsx`
   - Refonte complète de l'interface
   - Workflow simplifié
   - Affichage des informations du compte

3. **API** : `/app/frontend/utils/api.ts`
   - Ajout de `adminAPI.createUserWithXtream()`

---

**TESTEZ LE NOUVEAU PANEL ET DONNEZ VOS RETOURS !** 🚀
