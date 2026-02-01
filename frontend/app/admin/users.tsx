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
  const [verificationStatus, setVerificationStatus] = useState<{ [key: string]: { status: boolean; message: string } }>({});
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

    try {
      await adminAPI.updateUserCode(
        editingUser.code,
        maxProfiles,
        editingUser.editNote.trim()
      );
      Alert.alert('✅ Succès', 'Utilisateur modifié');
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      Alert.alert('Erreur', 'Impossible de modifier l\'utilisateur');
    }
  };

  const handleVerifyDNS = async (userCode: string) => {
    try {
      setVerifyingUser(userCode);
      
      // Récupérer la config Xtream
      const configResponse = await adminAPI.getXtreamConfig();
      if (!configResponse.data.configured) {
        Alert.alert('Erreur', 'Configuration Xtream non trouvée');
        setVerifyingUser(null);
        return;
      }

      const { dns_url, username, password } = configResponse.data;

      // Vérifier la connexion
      const verifyUrl = `${dns_url}/player_api.php`;
      const response = await axios.get(verifyUrl, {
        params: { username, password },
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
        },
        timeout: 15000,
      });

      const userInfo = response.data?.user_info;
      if (userInfo && userInfo.status === 'Active') {
        setVerificationStatus({
          ...verificationStatus,
          [userCode]: { status: true, message: 'IPTV OK' },
        });
        Alert.alert('✅ DNS OK', 'Le DNS et les identifiants sont valides !');
      } else {
        setVerificationStatus({
          ...verificationStatus,
          [userCode]: { status: false, message: 'Inactif' },
        });
        Alert.alert('⚠️ Compte inactif', 'Le compte IPTV est inactif ou expiré');
      }
    } catch (error: any) {
      console.error('Error verifying DNS:', error);
      setVerificationStatus({
        ...verificationStatus,
        [userCode]: { status: false, message: 'Erreur' },
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
                  <View style={styles.userHeader}>
                    <View style={styles.codeContainer}>
                      <Text style={styles.codeLabel}>Code:</Text>
                      <Text style={styles.codeText}>{user.code}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <View style={[styles.statusDot, user.is_active && styles.statusDotActive]} />
                      <Text style={styles.statusText}>
                        {user.is_active ? 'Actif' : 'Inactif'}
                      </Text>
                    </View>
                  </View>

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
                      <View style={styles.infoRow}>
                        <Ionicons name="document-text" size={16} color="#888" />
                        <Text style={styles.infoText} numberOfLines={2}>
                          {user.user_note}
                        </Text>
                      </View>
                    )}
                  </View>

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
});
