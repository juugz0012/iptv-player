# 🎨 MODIFICATIONS INTERFACE USERS.TSX

## ✅ FONCTIONS DÉJ À MODIFIÉES

1. `handleEditUser()` - Inclut maintenant DNS, username, password
2. `handleSaveEdit()` - Envoie tous les champs Xtream
3. `handleVerifyDNS()` - Utilise les identifiants propres de chaque utilisateur

## 🔴 CE QUI RESTE À MODIFIER DANS LE JSX

### **DANS LE MODE ÉDITION** (ligne ~260-300)

Ajouter les champs Xtream après le champ "Nombre de profils max" :

```tsx
<Text style={styles.editLabel}>DNS / URL du serveur</Text>
<TextInput
  style={styles.editInput}
  value={editingUser.editDns}
  onChangeText={(text) =>
    setEditingUser({ ...editingUser, editDns: text })
  }
  placeholder="http://example.com"
  placeholderTextColor="#666"
  autoCapitalize="none"
/>

<Text style={styles.editLabel}>Username Xtream</Text>
<TextInput
  style={styles.editInput}
  value={editingUser.editUsername}
  onChangeText={(text) =>
    setEditingUser({ ...editingUser, editUsername: text })
  }
  placeholder="Username"
  placeholderTextColor="#666"
  autoCapitalize="none"
/>

<Text style={styles.editLabel}>Password Xtream</Text>
<TextInput
  style={styles.editInput}
  value={editingUser.editPassword}
  onChangeText={(text) =>
    setEditingUser({ ...editingUser, editPassword: text })
  }
  placeholder="Password"
  placeholderTextColor="#666"
  autoCapitalize="none"
  secureTextEntry
/>
```

### **DANS LE MODE AFFICHAGE** (ligne ~310-370)

Remplacer tout le bloc "Mode affichage" par :

```tsx
              ) : (
                // Mode affichage
                <>
                  {/* Header avec Code et Statut */}
                  <View style={styles.userHeader}>
                    <View style={styles.codeContainer}>
                      <Text style={styles.codeLabel}>Code:</Text>
                      <Text style={styles.codeText}>{user.code}</Text>
                      <TouchableOpacity
                        style={styles.copyIconButton}
                        onPress={() => handleCopyCode(user.code)}
                      >
                        <Ionicons name="copy-outline" size={20} color="#2196F3" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.statusColumn}>
                      <View style={styles.statusBadge}>
                        <View style={[styles.statusDot, user.is_active && styles.statusDotActive]} />
                        <Text style={styles.statusText}>
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </Text>
                      </View>
                      {verificationStatus[user.code] && (
                        <View style={[
                          styles.iptvStatusBadge,
                          verificationStatus[user.code].status ? styles.iptvStatusOK : styles.iptvStatusKO
                        ]}>
                          <Ionicons 
                            name={verificationStatus[user.code].status ? 'checkmark-circle' : 'close-circle'}
                            size={14} 
                            color={verificationStatus[user.code].status ? '#00AA13' : '#E50914'} 
                          />
                          <Text style={[
                            styles.iptvStatusText,
                            verificationStatus[user.code].status ? styles.iptvStatusTextOK : styles.iptvStatusTextKO
                          ]}>
                            {verificationStatus[user.code].message}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Identifiants Xtream */}
                  <View style={styles.xtreamInfoBox}>
                    <Text style={styles.xtreamInfoTitle}>Identifiants Xtream :</Text>
                    <View style={styles.xtreamRow}>
                      <Text style={styles.xtreamLabel}>DNS:</Text>
                      <Text style={styles.xtreamValue} numberOfLines={1}>{user.dns_url || 'Non configuré'}</Text>
                    </View>
                    <View style={styles.xtreamRow}>
                      <Text style={styles.xtreamLabel}>Username:</Text>
                      <Text style={styles.xtreamValue}>{user.xtream_username || 'Non configuré'}</Text>
                    </View>
                    <View style={styles.xtreamRow}>
                      <Text style={styles.xtreamLabel}>Password:</Text>
                      <Text style={styles.xtreamValue}>{'•'.repeat(Math.min((user.xtream_password || '').length, 12))}</Text>
                    </View>
                  </View>

                  {/* Informations utilisateur */}
                  <View style={styles.userInfo}>
                    <View style={styles.infoRow}>
                      <Ionicons name="calendar" size={16} color="#888" />
                      <Text style={styles.infoText}>Créé le: {formatDate(user.created_at)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="people" size={16} color="#888" />
                      <Text style={styles.infoText}>Profils max: {user.max_profiles}</Text>
                    </View>
                    {user.user_note && (
                      <View style={styles.noteBox}>
                        <View style={styles.noteHeader}>
                          <Ionicons name="document-text" size={16} color="#E50914" />
                          <Text style={styles.noteLabel}>Note:</Text>
                        </View>
                        <Text style={styles.noteText}>{user.user_note}</Text>
                      </View>
                    )}
                  </View>

                  {/* Bouton Vérifier DNS */}
                  <TouchableOpacity
                    style={styles.verifyButton}
                    onPress={() => handleVerifyDNS(user)}
                    disabled={verifyingUser === user.code}
                  >
                    {verifyingUser === user.code ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark" size={20} color="#fff" />
                        <Text style={styles.verifyButtonText}>Vérifier DNS IPTV</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Actions */}
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditUser(user)}
                    >
                      <Ionicons name="create-outline" size={20} color="#2196F3" />
                      <Text style={styles.actionButtonText}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteUser(user.code)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#E50914" />
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                        Supprimer
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
```

### **STYLES À AJOUTER** (à la fin de StyleSheet.create)

```typescript
  copyIconButton: {
    marginLeft: 12,
    padding: 4,
  },
  statusColumn: {
    alignItems: 'flex-end',
    gap: 8,
  },
  iptvStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  iptvStatusOK: {
    backgroundColor: '#00AA1320',
    borderWidth: 1,
    borderColor: '#00AA13',
  },
  iptvStatusKO: {
    backgroundColor: '#E5091420',
    borderWidth: 1,
    borderColor: '#E50914',
  },
  iptvStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  iptvStatusTextOK: {
    color: '#00AA13',
  },
  iptvStatusTextKO: {
    color: '#E50914',
  },
  xtreamInfoBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  xtreamInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  xtreamRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  xtreamLabel: {
    fontSize: 13,
    color: '#888',
    width: 90,
  },
  xtreamValue: {
    flex: 1,
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  noteBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E50914',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  noteLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E50914',
  },
  noteText: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 18,
  },
  verifyButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
```

---

## 📝 RÉSUMÉ

**BACKEND** : ✅ Terminé  
**FONCTIONS FRONTEND** : ✅ Terminé  
**INTERFACE FRONTEND** : 🔴 À finaliser manuellement

Le fichier `users.tsx` est trop grand pour être modifié automatiquement sans risque.  
Suivez les instructions ci-dessus pour compléter l'interface.

Ou demandez-moi de créer un nouveau fichier complet !
