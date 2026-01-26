# IPTV Player - Application Multi-plateforme

Une application IPTV professionnelle compatible mobile et Android TV, utilisant l'API Xtream Codes.

## 🎯 Fonctionnalités Principales

### Application Mobile/TV
- **TV en Direct** : Accès à toutes les chaînes avec EPG intégré
- **Films & Séries** : Bibliothèque complète de VOD
- **Multi-Profils** : Créez jusqu'à 5 profils par code utilisateur
- **Profils Enfants** : Mode spécial pour les enfants avec contrôle parental
- **Interface Netflix** : Interface moderne et élégante inspirée de Netflix
- **Navigation Télécommande** : Optimisée pour la navigation TV
- **Regroupement Intelligent** : Les chaînes multiples (TF1 HD/FHD/4K) sont regroupées automatiquement

### Panneau Administrateur
- **Configuration Xtream Codes** : Interface pour configurer les credentials API
- **Génération de Codes** : Créez des codes uniques pour vos utilisateurs
- **Gestion des Utilisateurs** : Suivez l'utilisation de chaque code

## 🏗️ Architecture

### Backend (FastAPI + MongoDB)
- API RESTful complète
- Proxy pour les requêtes Xtream Codes
- Gestion des utilisateurs et profils
- Contrôle parental avec PIN

### Frontend (React Native + Expo)
- Application native iOS/Android
- Support Android TV
- Interface responsive et moderne
- Lecteur vidéo intégré

## 📝 Configuration Initiale

### 1. Accéder au Panneau Admin

Depuis l'écran de connexion, cliquez sur "Panneau Admin".

### 2. Configurer Xtream Codes

Remplissez les informations suivantes :
- **Nom d'utilisateur** : Votre username Xtream Codes
- **Mot de passe** : Votre password Xtream Codes
- **DNS URL** : L'URL principale de votre serveur
- **Samsung/LG DNS** : (Optionnel) URL alternative pour Samsung/LG TV

Exemple actuel configuré:
```
Username: GYNRNT4N
Password: WL29K25J
DNS: http://uvihkgki.leadernoob.xyz
Samsung/LG DNS: http://uvihkgki.meza.in
```

### 3. Générer des Codes Utilisateurs

1. Dans le panneau admin, cliquez sur le bouton "+"
2. Choisissez le nombre maximum de profils (1-10)
3. Un code unique sera généré (ex: 6VCSU76F)
4. Partagez ce code avec vos utilisateurs

## 👤 Utilisation pour les Utilisateurs

### Première Connexion

1. Lancez l'application
2. Entrez votre code utilisateur (8 caractères)
3. Créez votre profil (Adulte ou Enfant)
4. Profitez du contenu !

### Gestion des Profils

- **Ajouter un profil** : Max 5 profils par code
- **Profil Enfant** : Mode filtré pour les enfants
- **Code PIN** : Chaque profil a son propre PIN (défaut: 0000)
- **Changer de profil** : Depuis l'onglet Profil

### Navigation

- **Accueil** : Vue d'ensemble et accès rapide
- **TV en Direct** : Chaînes live avec EPG
- **Films** : Bibliothèque de films
- **Séries** : Catalogue de séries
- **Profil** : Paramètres et gestion du compte

### Lecture Vidéo

- Cliquez sur une chaîne/film/série pour lancer la lecture
- Touchez l'écran pour afficher les contrôles
- Utilisez le bouton retour pour quitter le lecteur

## 🔧 Fonctionnalités Techniques

### Regroupement de Chaînes

L'application regroupe automatiquement les variantes d'une même chaîne :
```
TF1 HD
TF1 FHD    →    TF1 (3 qualités disponibles)
TF1 4K
```

### Contrôle Parental

- PIN à 4 chiffres pour chaque profil
- Mode Enfant avec contenu filtré
- Personnalisable depuis les paramètres

### Compatibilité TV

- Support Android TV natif
- Navigation à la télécommande
- Grands boutons focusables
- Interface adaptée grand écran

## 🎨 Design

Interface inspirée de Netflix avec :
- Thème sombre (#141414)
- Couleur principale rouge (#E50914)
- Typographie moderne et lisible
- Animations fluides
- Icônes Ionicons

## 📱 Plateformes Supportées

- ✅ Android Mobile
- ✅ Android TV
- ✅ iOS (via Expo Go ou build)
- ✅ Web (panneau admin)

## 🚀 Démarrage Rapide

L'application est déjà configurée et en cours d'exécution.

### Code utilisateur de test : 6VCSU76F

Utilisez ce code pour tester l'application immédiatement.

## 📡 API Endpoints

### Admin
- `POST /api/admin/xtream-config` - Configurer Xtream Codes
- `GET /api/admin/xtream-config` - Récupérer la configuration
- `POST /api/admin/user-codes` - Générer un code utilisateur
- `GET /api/admin/user-codes` - Lister tous les codes
- `DELETE /api/admin/user-codes/{code}` - Désactiver un code

### Authentification
- `POST /api/auth/verify-code` - Vérifier un code utilisateur

### Profils
- `GET /api/profiles/{user_code}` - Lister les profils
- `POST /api/profiles/{user_code}` - Créer un profil
- `DELETE /api/profiles/{profile_id}` - Supprimer un profil
- `PUT /api/profiles/{profile_id}/parental-pin` - Modifier le PIN
- `POST /api/profiles/{profile_id}/verify-pin` - Vérifier le PIN

### Xtream Codes
- `GET /api/xtream/info` - Infos du compte
- `GET /api/xtream/live-categories` - Catégories TV
- `GET /api/xtream/live-streams` - Chaînes live
- `GET /api/xtream/vod-categories` - Catégories films
- `GET /api/xtream/vod-streams` - Liste des films
- `GET /api/xtream/series-categories` - Catégories séries
- `GET /api/xtream/series-streams` - Liste des séries
- `GET /api/xtream/epg/{stream_id}` - EPG pour une chaîne
- `GET /api/xtream/stream-url/{type}/{id}` - URL de lecture

## 🔐 Sécurité

- Codes utilisateurs uniques générés aléatoirement
- Codes PIN pour le contrôle parental
- Validation côté serveur pour toutes les opérations
- Pas de stockage des mots de passe en clair côté client

## 🎯 Prochaines Améliorations Possibles

- Intégration TMDB pour les métadonnées enrichies
- Système de favoris
- Historique de visionnage
- Reprise de lecture
- Mode hors ligne pour certains contenus
- Support Chromecast
- Picture-in-Picture
- Sous-titres

## 📞 Support

Pour toute question ou problème :
1. Vérifiez que vos credentials Xtream Codes sont corrects
2. Assurez-vous que votre code utilisateur est actif
3. Vérifiez votre connexion internet

---

**Version** : 1.0.0  
**Licence** : Propriétaire  
**Développé avec** : Expo, React Native, FastAPI, MongoDB
