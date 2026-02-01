import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminAPI } from '../../utils/api';
import axios from 'axios';

export default function UsersManagementScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [verifyingUser, setVerifyingUser] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<{ [key: string]: { status: boolean; message: string; details?: any } }>({});
  const [loadingPlaylist, setLoadingPlaylist] = useState<string | null>(null);
  const [playlistProgress, setPlaylistProgress] = useState<{ [key: string]: number }>({});
  const router = useRouter();

  useEffect(() => {
    checkAdminAuth();
    fetchUsers();
  }, []);

  const checkAdminAuth = async () => {
    const isLoggedIn = await AsyncStorage.getItem('admin_logged_in');
    if (isLoggedIn !== 'true') {
      router.replace('/admin');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.listUserCodes();
      setUsers(response.data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      Alert.alert('Erreur', 'Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleDeleteUser = (code: string) => {
    Alert.alert(
      'Supprimer l\'utilisateur',
      `Voulez-vous vraiment supprimer le code ${code} ?\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminAPI.deleteUserCode(code);
              Alert.alert('✅ Succès', 'Utilisateur supprimé');
              fetchUsers();
            } catch (error: any) {
              console.error('Error deleting user:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'utilisateur');
            }
          },
        },
      ]
    );
  };

  const handleEditUser = (user: any) => {
    setEditingUser({
      ...user,
      editMaxProfiles: user.max_profiles.toString(),
      editNote: user.user_note || '',
      editDns: user.dns_url || '',
      editUsername: user.xtream_username || '',
      editPassword: user.xtream_password || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    const maxProfiles = parseInt(editingUser.editMaxProfiles);
    if (isNaN(maxProfiles) || maxProfiles < 1 || maxProfiles > 20) {
      Alert.alert('Erreur', 'Le nombre de profils doit être entre 1 et 20');
      return;
    }

    if (!editingUser.editDns || !editingUser.editUsername || !editingUser.editPassword) {
      Alert.alert('Erreur', 'DNS, Username et Password sont obligatoires');
      return;
    }

    try {
      await adminAPI.updateUserCode(
        editingUser.code,
        maxProfiles,
        editingUser.editNote.trim(),
        editingUser.editDns.trim(),
        editingUser.editUsername.trim(),
        editingUser.editPassword.trim()
      );
      Alert.alert('✅ Succès', 'Utilisateur modifié');
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      Alert.alert('Erreur', 'Impossible de modifier l\'utilisateur');
    }
  };

  const handleVerifyDNS = async (user: any) => {
    try {
      setVerifyingUser(user.code);
      
      if (!user.dns_url || !user.xtream_username || !user.xtream_password) {
        Alert.alert('Erreur', 'Identifiants Xtream incomplets pour cet utilisateur');
        setVerifyingUser(null);
        return;
      }

      // Vérifier la connexion avec les identifiants propres de l'utilisateur
      const verifyUrl = `${user.dns_url}/player_api.php`;
      const response = await axios.get(verifyUrl, {
        params: { 
          username: user.xtream_username, 
          password: user.xtream_password 
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
        },
        timeout: 15000,
      });

      const userInfo = response.data?.user_info;
      const serverInfo = response.data?.server_info;
      
      if (userInfo) {
        // Formater la date d'expiration
        let expirationDate = 'Inconnue';
        if (userInfo.exp_date) {
          try {
            const expDate = new Date(parseInt(userInfo.exp_date) * 1000);
            expirationDate = expDate.toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
          } catch (e) {
            expirationDate = userInfo.exp_date;
          }
        }

        // Déterminer le statut
        const isActive = userInfo.status === 'Active';
        const statusMessage = isActive ? 'IPTV OK' : `${userInfo.status || 'Inactif'}`;

        setVerificationStatus({
          ...verificationStatus,
          [user.code]: { 
            status: isActive,
            message: statusMessage,
            details: {
              expiration: expirationDate,
              maxConnections: userInfo.max_connections || 'N/A',
              activeConnections: userInfo.active_cons || '0',
              accountStatus: userInfo.status || 'Inconnu',
              isTrial: userInfo.is_trial || '0',
              createdAt: userInfo.created_at || 'Inconnu',
            }
          },
        });
        
        // Construire le message d'alerte avec toutes les infos
        const alertMessage = `
✅ Connexion réussie !

📊 Statut: ${userInfo.status || 'Inconnu'}
📅 Expiration: ${expirationDate}
🔗 Connexions max: ${userInfo.max_connections || 'N/A'}
⚡ Connexions actives: ${userInfo.active_cons || '0'}
${userInfo.is_trial === '1' ? '🎁 Compte Trial' : ''}
        `.trim();
        
        Alert.alert('✅ DNS OK', alertMessage);
      } else {
        setVerificationStatus({
          ...verificationStatus,
          [user.code]: { status: false, message: 'Aucune info', details: null },
        });
        Alert.alert('⚠️ Réponse incomplète', 'Impossible de récupérer les informations du compte');
      }
    } catch (error: any) {
      console.error('Error verifying DNS:', error);
      setVerificationStatus({
        ...verificationStatus,
        [user.code]: { status: false, message: 'Erreur', details: null },
      });
      
      if (error.response?.status === 401) {
        Alert.alert('❌ Erreur', 'Identifiants Xtream invalides');
      } else if (error.code === 'ECONNABORTED') {
        Alert.alert('❌ Timeout', 'Le serveur IPTV ne répond pas');
      } else {
        Alert.alert('❌ Erreur', 'Impossible de vérifier le DNS');
      }
    } finally {
      setVerifyingUser(null);
    }
  };

  const handleCopyCode = (code: string) => {
    Clipboard.setString(code);
    Alert.alert('✅ Copié', `Le code ${code} a été copié`);
  };

  const handleLoadPlaylist = async (user: any) => {
    try {
      setLoadingPlaylist(user.code);
      setPlaylistProgress({ ...playlistProgress, [user.code]: 0 });

      if (!user.dns_url || !user.xtream_username || !user.xtream_password) {
        Alert.alert('Erreur', 'Identifiants Xtream incomplets');
        setLoadingPlaylist(null);
        return;
      }

      const baseUrl = `${user.dns_url}/player_api.php`;
      const params = {
        username: user.xtream_username,
        password: user.xtream_password,
      };
      const headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
      };

      let totalProgress = 0;
      const updateProgress = (step: number) => {
        totalProgress = step;
        setPlaylistProgress({ ...playlistProgress, [user.code]: step });
      };

      // Étape 1: Charger les catégories Live (10%)
      updateProgress(10);
      const liveCategories = await axios.get(baseUrl, {
        params: { ...params, action: 'get_live_categories' },
        headers,
        timeout: 30000,
      });

      // Étape 2: Charger les catégories VOD (20%)
      updateProgress(20);
      const vodCategories = await axios.get(baseUrl, {
        params: { ...params, action: 'get_vod_categories' },
        headers,
        timeout: 30000,
      });

      // Étape 3: Charger les catégories Séries (30%)
      updateProgress(30);
      const seriesCategories = await axios.get(baseUrl, {
        params: { ...params, action: 'get_series_categories' },
        headers,
        timeout: 30000,
      });

      // Étape 4: Charger les streams Live (60%)
      updateProgress(40);
      const liveStreams = await axios.get(baseUrl, {
        params: { ...params, action: 'get_live_streams' },
        headers,
        timeout: 60000,
      });
      updateProgress(60);

      // Étape 5: Charger les streams VOD (80%)
      const vodStreams = await axios.get(baseUrl, {
        params: { ...params, action: 'get_vod_streams' },
        headers,
        timeout: 60000,
      });
      updateProgress(80);

      // Étape 6: Charger les séries (100%)
      const series = await axios.get(baseUrl, {
        params: { ...params, action: 'get_series' },
        headers,
        timeout: 60000,
      });
      updateProgress(100);

      // Résumé
      const totalLive = liveStreams.data?.length || 0;
      const totalVod = vodStreams.data?.length || 0;
      const totalSeries = series.data?.length || 0;
      const totalCategories = (liveCategories.data?.length || 0) + (vodCategories.data?.length || 0) + (seriesCategories.data?.length || 0);

      Alert.alert(
        '✅ Playlist chargée !',
        `📊 Résumé :\n\n📺 Chaînes Live : ${totalLive}\n🎬 Films : ${totalVod}\n📺 Séries : ${totalSeries}\n📁 Catégories : ${totalCategories}`,
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('Error loading playlist:', error);
      Alert.alert('❌ Erreur', 'Impossible de charger la playlist. Vérifiez les identifiants.');
    } finally {
      setLoadingPlaylist(null);
      setPlaylistProgress({ ...playlistProgress, [user.code]: 0 });
    }
  };

  const filteredUsers = users.filter(user =>
    user.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.user_note && user.user_note.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={styles.loadingText}>Chargement des utilisateurs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Gérer les Utilisateurs</Text>
          <Text style={styles.subtitle}>{users.length} utilisateur(s)</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par code ou note..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E50914" />
        }
      >
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur créé'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.createFirstButton}
                onPress={() => router.push('/admin/create-user')}
              >
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={styles.createFirstButtonText}>Créer le premier utilisateur</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredUsers.map((user) => (
            <View key={user.code} style={styles.userCard}>
              {editingUser?.code === user.code ? (
                // Mode édition
                <View style={styles.editMode}>
                  <View style={styles.editHeader}>
                    <Ionicons name="create" size={24} color="#E50914" />
                    <Text style={styles.editTitle}>Modifier {user.code}</Text>
                  </View>

                  <Text style={styles.editLabel}>Nombre de profils max</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editingUser.editMaxProfiles}
                    onChangeText={(text) =>
                      setEditingUser({ ...editingUser, editMaxProfiles: text })
                    }
                    keyboardType="number-pad"
                  />

                  <Text style={styles.editLabel}>Note</Text>
                  <TextInput
                    style={[styles.editInput, styles.editTextArea]}
                    value={editingUser.editNote}
                    onChangeText={(text) =>
                      setEditingUser({ ...editingUser, editNote: text })
                    }
                    multiline
                    numberOfLines={3}
                  />

                  <Text style={styles.editLabel}>DNS / URL du serveur *</Text>
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

                  <Text style={styles.editLabel}>Username Xtream *</Text>
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

                  <Text style={styles.editLabel}>Password Xtream *</Text>
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

                  <View style={styles.editButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setEditingUser(null)}
                    >
                      <Text style={styles.cancelButtonText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.saveButtonText}>Enregistrer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
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

                  {/* Informations IPTV (après vérification) */}
                  {verificationStatus[user.code]?.details && (
                    <View style={styles.iptvDetailsBox}>
                      <Text style={styles.iptvDetailsTitle}>📊 Informations IPTV :</Text>
                      <View style={styles.xtreamRow}>
                        <Text style={styles.xtreamLabel}>Statut:</Text>
                        <Text style={[
                          styles.xtreamValue,
                          verificationStatus[user.code].status ? styles.statusActiveText : styles.statusInactiveText
                        ]}>
                          {verificationStatus[user.code].details.accountStatus}
                        </Text>
                      </View>
                      <View style={styles.xtreamRow}>
                        <Text style={styles.xtreamLabel}>Expiration:</Text>
                        <Text style={styles.xtreamValue}>{verificationStatus[user.code].details.expiration}</Text>
                      </View>
                      <View style={styles.xtreamRow}>
                        <Text style={styles.xtreamLabel}>Connexions max:</Text>
                        <Text style={styles.xtreamValue}>{verificationStatus[user.code].details.maxConnections}</Text>
                      </View>
                      <View style={styles.xtreamRow}>
                        <Text style={styles.xtreamLabel}>Actives maintenant:</Text>
                        <Text style={[
                          styles.xtreamValue,
                          parseInt(verificationStatus[user.code].details.activeConnections) > 0 ? styles.statusOnlineText : {}
                        ]}>
                          {verificationStatus[user.code].details.activeConnections}
                          {parseInt(verificationStatus[user.code].details.activeConnections) > 0 ? ' 🟢 En ligne' : ' ⚫ Hors ligne'}
                        </Text>
                      </View>
                      {verificationStatus[user.code].details.isTrial === '1' && (
                        <View style={styles.trialBadge}>
                          <Ionicons name="gift" size={16} color="#FFA500" />
                          <Text style={styles.trialText}>Compte Trial</Text>
                        </View>
                      )}
                    </View>
                  )}

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

                  {/* Bouton Charger Playlist */}
                  <TouchableOpacity
                    style={styles.loadPlaylistButton}
                    onPress={() => handleLoadPlaylist(user)}
                    disabled={loadingPlaylist === user.code}
                  >
                    {loadingPlaylist === user.code ? (
                      <View style={styles.loadingPlaylistContainer}>
                        <View style={styles.progressBarContainer}>
                          <View style={[styles.progressBar, { width: `${playlistProgress[user.code] || 0}%` }]} />
                        </View>
                        <Text style={styles.loadingPlaylistText}>
                          Chargement... {playlistProgress[user.code] || 0}%
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Ionicons name="download" size={20} color="#fff" />
                        <Text style={styles.loadPlaylistButtonText}>Charger la Playlist</Text>
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
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#141414',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  createFirstButton: {
    flexDirection: 'row',
    backgroundColor: '#E50914',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  createFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  userCard: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 14,
    color: '#888',
    marginRight: 8,
  },
  codeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E50914',
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    marginRight: 6,
  },
  statusDotActive: {
    backgroundColor: '#00AA13',
  },
  statusText: {
    fontSize: 12,
    color: '#ccc',
  },
  userInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 8,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  deleteButton: {
    backgroundColor: '#1a1a1a',
  },
  deleteButtonText: {
    color: '#E50914',
  },
  editMode: {
    padding: 8,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  editLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
    marginTop: 12,
  },
  editInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
  },
  editTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#00AA13',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6,
  },
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
  iptvDetailsBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  iptvDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  statusActiveText: {
    color: '#00AA13',
    fontWeight: 'bold',
  },
  statusInactiveText: {
    color: '#E50914',
    fontWeight: 'bold',
  },
  statusOnlineText: {
    color: '#00AA13',
    fontWeight: 'bold',
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA50020',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    gap: 6,
  },
  trialText: {
    fontSize: 13,
    color: '#FFA500',
    fontWeight: '600',
  },
  loadPlaylistButton: {
    flexDirection: 'row',
    backgroundColor: '#E50914',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loadPlaylistButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  loadingPlaylistContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#33001a',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  loadingPlaylistText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
