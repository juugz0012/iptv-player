# 📺 Guide d'Optimisation Android TV pour IPTV Player

## 🎯 Objectif
Optimiser l'application pour une expérience Android TV parfaite avec navigation à la télécommande.

## ✅ Implémentations Terminées

### 1. Composant TVFocusable (`/components/TVFocusable.tsx`)
**Fonctionnalités :**
- ✅ État de focus visible avec bordure rouge (#E50914)
- ✅ Effet d'ombre et de grossissement au focus
- ✅ Propriétés TV natives (tvParallaxProperties)
- ✅ Support des touches directionnelles Android TV
- ✅ Animation smooth lors du changement de focus

**Utilisation :**
```tsx
import TVFocusable from '../components/TVFocusable';

<TVFocusable
  style={styles.button}
  onPress={handleAction}
  hasTVPreferredFocus={true} // Premier élément à recevoir le focus
>
  <Text>Mon Bouton</Text>
</TVFocusable>
```

### 2. Écran de Connexion (`/app/index.tsx`)
**Optimisations appliquées :**
- ✅ Boutons avec TVFocusable
- ✅ Tailles adaptées pour TV (Platform.isTV)
  - Logo : 72px (vs 48px mobile)
  - Texte subtitle : 28px (vs 18px mobile)
  - Input : 80px hauteur, 28px texte
  - Boutons : 80px hauteur, 24px texte
- ✅ Espacement optimisé (60px padding pour TV)
- ✅ Focus par défaut sur bouton "SE CONNECTER"

## 📋 Écrans à Optimiser

### Priorité 1 - Écrans Principaux
1. **Page de sélection des profils** (`/app/profiles.tsx`)
   - [ ] Appliquer TVFocusable aux cartes de profil
   - [ ] Agrandir les avatars et textes
   - [ ] Navigation horizontale/verticale fluide

2. **Onglets principaux** (`/app/(tabs)/`)
   - [ ] Live TV (`live.tsx`)
   - [ ] Films (`movies.tsx`)
   - [ ] Séries (`series.tsx`)
   - [ ] Appliquer TVFocusable aux cartes de contenu
   - [ ] Navigation dans les grilles de contenus
   - [ ] Focus visible sur la barre d'onglets

3. **Lecteur vidéo** (`/app/player.tsx`)
   - [ ] Controls optimisés pour TV
   - [ ] Boutons play/pause/avance/recule avec focus
   - [ ] Barre de progression navigable

### Priorité 2 - Écrans Secondaires
4. **Détails Film** (`/app/movie-details.tsx`)
   - [ ] Boutons "Lire" et "Ma Liste" avec TVFocusable
   - [ ] Navigation dans les infos du film

5. **Détails Série** (`/app/series-details.tsx`)
   - [ ] Liste des saisons et épisodes navigable
   - [ ] Focus visible sur épisodes

6. **Panel Admin** (`/app/admin/`)
   - [ ] Navigation dans les formulaires
   - [ ] Listes d'utilisateurs navigables

## 🎨 Standards de Design pour TV

### Tailles Recommandées
```tsx
const tvSizes = {
  // Textes
  title: Platform.isTV ? 72 : 48,
  subtitle: Platform.isTV ? 28 : 18,
  body: Platform.isTV ? 20 : 14,
  button: Platform.isTV ? 24 : 16,
  
  // Composants
  buttonHeight: Platform.isTV ? 80 : 56,
  cardWidth: Platform.isTV ? 300 : 200,
  cardHeight: Platform.isTV ? 450 : 300,
  
  // Espacements
  padding: Platform.isTV ? 60 : 20,
  margin: Platform.isTV ? 30 : 15,
};
```

### Couleurs de Focus
```tsx
const focusColors = {
  border: '#E50914',      // Rouge Netflix
  shadow: '#E50914',
  background: '#1a1a1a',  // Fond sombre
};
```

### Propriétés TV Obligatoires
```tsx
// Sur tous les éléments interactifs
tvParallaxProperties={{
  enabled: true,
  shiftDistanceX: 2,
  shiftDistanceY: 2,
  tiltAngle: 0.05,
  magnification: 1.1,
}}

// Sur le premier élément
hasTVPreferredFocus={true}
```

## 🎮 Navigation avec Télécommande

### Touches Support attendues
- ⬆️ ⬇️ ⬅️ ➡️ : Navigation directionnelle
- ⏎ (Select/Enter) : Validation
- ⬅️ (Back) : Retour
- ⏯️ (Play/Pause) : Contrôle média dans le player

### Ordre de Navigation Logique
1. Haut → Bas dans les listes verticales
2. Gauche → Droite dans les grilles horizontales
3. Focus automatique sur le premier élément important
4. Retour intuitif avec bouton Back

## 🧪 Tests Recommandés

### Tests Manuels sur Android TV
1. **Navigation générale**
   - [ ] Tous les boutons sont accessibles avec les flèches
   - [ ] Le focus est visible sur tous les éléments
   - [ ] L'ordre de navigation est logique
   - [ ] Le bouton Back fonctionne correctement

2. **Écran de connexion**
   - [ ] Focus par défaut sur "SE CONNECTER"
   - [ ] Navigation vers "Panneau Admin"
   - [ ] Saisie du code avec télécommande

3. **Contenu**
   - [ ] Navigation dans les grilles de films/séries
   - [ ] Accès aux détails avec Enter
   - [ ] Retour avec Back button

4. **Lecteur**
   - [ ] Controls accessibles
   - [ ] Play/Pause avec télécommande
   - [ ] Navigation dans la barre de progression

## 📝 Checklist d'Implémentation

Pour chaque écran à optimiser :
1. [ ] Importer TVFocusable
2. [ ] Remplacer tous les TouchableOpacity par TVFocusable
3. [ ] Ajouter `Platform.isTV` aux styles
4. [ ] Définir `hasTVPreferredFocus` sur le premier élément
5. [ ] Tester la navigation avec touches directionnelles
6. [ ] Vérifier la visibilité du focus
7. [ ] Ajuster les tailles si nécessaire

## 🚀 Prochaines Étapes

1. **Implémenter les optimisations sur les écrans principaux** (Priorité 1)
2. **Tester sur Android TV réel**
3. **Ajuster selon les retours utilisateur**
4. **Documenter les patterns spécifiques trouvés**

## 💡 Tips & Best Practices

- Toujours tester sur un vrai Android TV ou émulateur TV
- Les textes doivent être lisibles à 3 mètres de distance
- Les boutons doivent faire minimum 48dp (TV: 80dp recommandé)
- Utiliser des contrastes élevés pour la lisibilité
- Le focus doit être TRÈS visible (bordure 4px minimum)
- Prévoir des animations smooth (pas de lag)
- Tester avec différentes résolutions TV (1080p, 4K)

---

**Status:** 
- ✅ Écran de connexion optimisé
- ⏳ Autres écrans en attente d'implémentation
- 🎯 Objectif: 100% des écrans navigables à la télécommande
