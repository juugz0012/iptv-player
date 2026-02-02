# 🎬 Lecteur Vidéo - Documentation Technique

## 📋 Implémentation complète

Le lecteur vidéo a été entièrement réécrit avec **Expo AV** pour une compatibilité complète avec Expo et React Native.

---

## ✅ Fonctionnalités implémentées

### 1. **Lecture vidéo complète**
- ✅ Utilise `expo-av` (compatible Expo)
- ✅ Support des formats : HLS (m3u8), MP4, MKV
- ✅ Contrôles personnalisés overlay
- ✅ Play/Pause
- ✅ Retour/Avance rapide (10 secondes)
- ✅ Barre de progression en temps réel

### 2. **Gestion des différents types de streams**

#### **Format URLs Xtream Codes API :**

```
Live TV:     {dns_url}/live/{username}/{password}/{stream_id}.{extension}
Movies:      {dns_url}/movie/{username}/{password}/{stream_id}.{extension}
Series:      {dns_url}/series/{username}/{password}/{stream_id}.{extension}
```

**Extensions supportées** : `m3u8` (HLS), `ts`, `mp4`, `mkv`

Le lecteur utilise `xtreamAPI.getStreamUrl()` qui génère automatiquement l'URL correcte selon le type.

### 3. **Sauvegarde automatique de la progression**

#### Pour les films uniquement :
- ✅ Sauvegarde toutes les **10 secondes** pendant la lecture
- ✅ Sauvegarde à la **fermeture du lecteur**
- ✅ Sauvegarde quand le **film se termine**
- ✅ Stockage dans MongoDB via `progressAPI.updateProgress()`

#### Données sauvegardées :
```javascript
{
  user_code: string,
  profile_name: string,
  stream_id: string,
  stream_type: 'movie',
  current_time: number,    // en secondes
  duration: number,        // en secondes
  percentage: number,      // 0-100
  last_watched: datetime
}
```

### 4. **Reprise de lecture**

Le paramètre `resumePosition` est passé lors de la navigation :
```javascript
router.push({
  pathname: '/player',
  params: {
    streamId: '12345',
    streamType: 'movie',
    title: 'Nom du film',
    resumePosition: '120',  // En secondes
  }
});
```

Le lecteur reprend automatiquement à cette position après 1.5 secondes de chargement.

### 5. **Orientation de l'écran**

- ✅ Bascule automatiquement en **mode paysage** à l'ouverture
- ✅ Retour en mode portrait à la fermeture
- ✅ Utilise `expo-screen-orientation`

### 6. **Interface utilisateur**

#### Contrôles overlay (apparaissent pendant 4 secondes) :
- **Barre supérieure** :
  - Bouton retour (sauvegarde la progression)
  - Titre du film/série/chaîne
  
- **Centre** :
  - Bouton reculer 10s
  - Grand bouton Play/Pause (rouge Netflix)
  - Bouton avancer 10s

- **Barre inférieure** (pour les films uniquement) :
  - Temps actuel / Durée totale
  - Barre de progression visuelle

#### Indicateurs :
- ⏳ Indicateur de mise en mémoire tampon
- 🔄 Messages d'état (Chargement, Erreur)

### 7. **Gestion des erreurs**

- ✅ Timeout si le flux ne charge pas
- ✅ Message d'erreur convivial
- ✅ Bouton retour accessible
- ✅ Logs dans la console pour debug

---

## 📦 Packages installés

```json
{
  "expo-av": "^16.0.8",
  "expo-screen-orientation": "^9.0.8"
}
```

---

## 🎯 Utilisation

### Navigation vers le lecteur :

```javascript
// Pour un film
router.push({
  pathname: '/player',
  params: {
    streamId: '1332653',
    streamType: 'movie',
    title: 'Inception',
    resumePosition: '0',  // 0 pour démarrer au début
  }
});

// Pour une série (épisode)
router.push({
  pathname: '/player',
  params: {
    streamId: '98765',
    streamType: 'series',
    title: 'Breaking Bad - S01E01',
    resumePosition: '0',
  }
});

// Pour la TV en direct
router.push({
  pathname: '/player',
  params: {
    streamId: '12345',
    streamType: 'live',
    title: 'TF1 HD',
    resumePosition: '0',  // Ignoré pour le live
  }
});
```

---

## 🔧 Différences selon le type de contenu

| Fonctionnalité | Live TV | Movies | Series |
|---------------|---------|---------|--------|
| Barre de progression | ❌ | ✅ | ✅ |
| Sauvegarde progression | ❌ | ✅ | ⚠️ Future |
| Reprise lecture | ❌ | ✅ | ⚠️ Future |
| Contrôles avance/recul | ✅ | ✅ | ✅ |
| Play/Pause | ✅ | ✅ | ✅ |

---

## 🚀 Prochaines améliorations possibles

### Fonctionnalités avancées :
1. **Sous-titres** :
   - L'API Xtream fournit les sous-titres
   - Ajouter le sélecteur de sous-titres

2. **Qualité vidéo** :
   - Sélecteur de qualité (SD, HD, FHD)
   - Adaptation automatique selon le débit

3. **Gestion des séries** :
   - Auto-play de l'épisode suivant
   - Sauvegarde de la progression par épisode

4. **Contrôles tactiles** :
   - Double-tap gauche/droite pour reculer/avancer
   - Swipe vertical pour le volume/luminosité

5. **Picture-in-Picture (PiP)** :
   - Continuer à regarder en naviguant
   - Support Android TV

6. **Chromecast** :
   - Diffuser sur la TV
   - Intégration Google Cast

---

## 🐛 Debugging

### Logs utiles :
```javascript
console.log('Stream URL:', url);  // Vérifie l'URL générée
console.log('Playback status:', status);  // État de la lecture
console.error('Video error:', error);  // Erreurs de lecture
```

### Problèmes courants :

#### 1. "Impossible de charger le flux"
- Vérifier que les credentials Xtream sont corrects
- Vérifier la connexion Internet
- Tester l'URL directement dans VLC

#### 2. "Mise en mémoire tampon infinie"
- Connexion Internet trop lente
- Serveur IPTV surchargé
- Format vidéo non supporté

#### 3. "La progression ne se sauvegarde pas"
- Vérifier que `userCode` et `currentProfile` existent
- Vérifier les logs du backend
- Vérifier la connexion à MongoDB

---

## 📱 Compatibilité

| Platform | Support | Notes |
|----------|---------|-------|
| iOS | ✅ | Pleine compatibilité |
| Android | ✅ | Pleine compatibilité |
| Android TV | ✅ | Optimisé paysage |
| Web | ⚠️ | Limitée (pas d'orientation) |

---

## 🎬 Format Xtream Codes API

### Endpoints principaux :

```
Player API Base:     {dns}/player_api.php
Get VOD Info:        action=get_vod_info&vod_id={id}
Get Series Info:     action=get_series_info&series_id={id}
Get Live Streams:    action=get_live_streams
Stream URL Movie:    {dns}/movie/{user}/{pass}/{id}.m3u8
Stream URL Series:   {dns}/series/{user}/{pass}/{id}.m3u8
Stream URL Live:     {dns}/live/{user}/{pass}/{id}.m3u8
```

### Extensions courantes :
- `.m3u8` - HLS streaming (recommandé)
- `.ts` - Transport Stream
- `.mp4` - MP4
- `.mkv` - Matroska

---

## ✅ Tests recommandés

1. **Test de lecture basique** :
   - [ ] Le film démarre correctement
   - [ ] Les contrôles s'affichent
   - [ ] Play/Pause fonctionne

2. **Test de progression** :
   - [ ] La progression se sauvegarde
   - [ ] Le bouton "Reprendre" apparaît sur la page détails
   - [ ] La reprise fonctionne correctement

3. **Test de navigation** :
   - [ ] Le bouton retour fonctionne
   - [ ] L'orientation revient en portrait
   - [ ] La progression est sauvegardée en quittant

4. **Test réseau** :
   - [ ] Message d'erreur si pas de connexion
   - [ ] Indicateur de buffering s'affiche
   - [ ] Récupération automatique après coupure

---

**Date** : Juin 2025  
**Version** : 2.1 - Player complet avec progression
