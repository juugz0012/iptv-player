import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminAPI } from '../../utils/api';

export default function DNSSettingsScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [newDns, setNewDns] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
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
    }
  };

  const toggleUserSelection = (code: string) => {
    if (selectedUsers.includes(code)) {
      setSelectedUsers(selectedUsers.filter(c => c !== code));
    } else {
      setSelectedUsers([...selectedUsers, code]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.code));
    }
  };

  const handleUpdateDNS = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un utilisateur');
      return;
    }

    if (!newDns.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer le nouveau DNS');
      return;
    }

    Alert.alert(
      'Confirmation',
      `Modifier le DNS pour ${selectedUsers.length} utilisateur(s) ?\n\nNouveau DNS: ${newDns}\n\nLe username et password de chaque utilisateur resteront inchangés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              const response = await adminAPI.bulkUpdateDNS(selectedUsers, newDns.trim());
              
              Alert.alert(
                '✅ Succès',
                `DNS mis à jour pour ${response.data.modified_count} utilisateur(s)`
              );
              
              setSelectedUsers([]);
              setNewDns('');
              fetchUsers();
            } catch (error: any) {
              console.error('Error updating DNS:', error);
              Alert.alert('Erreur', 'Impossible de mettre à jour le DNS');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={styles.loadingText}>Chargement...</Text>
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
          <Text style={styles.title}>Gestion DNS</Text>
          <Text style={styles.subtitle}>
            {selectedUsers.length} / {users.length} sélectionné(s)
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.warningBox}>
          <Ionicons name="information-circle" size={24} color="#2196F3" />
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>Modification du DNS uniquement</Text>
            <Text style={styles.warningText}>
              Le username et password de chaque utilisateur restent inchangés.
              Seul le DNS sera modifié pour les utilisateurs sélectionnés.
            </Text>
          </View>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Nouveau DNS</Text>
          <TextInput
            style={styles.input}
            placeholder="http://example.com"
            placeholderTextColor="#666"
            value={newDns}
            onChangeText={setNewDns}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.selectionHeader}>
          <Text style={styles.sectionTitle}>Sélectionner les utilisateurs</Text>
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={toggleSelectAll}
          >
            <Ionicons
              name={selectedUsers.length === users.length ? 'checkbox' : 'square-outline'}
              size={24}
              color="#2196F3"
            />
            <Text style={styles.selectAllText}>Tout sélectionner</Text>
          </TouchableOpacity>
        </View>

        {users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>Aucun utilisateur</Text>
          </View>
        ) : (
          users.map((user) => (
            <TouchableOpacity
              key={user.code}
              style={[
                styles.userCard,
                selectedUsers.includes(user.code) && styles.userCardSelected
              ]}
              onPress={() => toggleUserSelection(user.code)}
            >
              <View style={styles.checkboxContainer}>
                <Ionicons
                  name={selectedUsers.includes(user.code) ? 'checkbox' : 'square-outline'}
                  size={28}
                  color={selectedUsers.includes(user.code) ? '#2196F3' : '#666'}
                />
              </View>
              <View style={styles.userInfoContainer}>
                <View style={styles.userRow}>
                  <Text style={styles.userCode}>{user.code}</Text>
                  {user.user_note && (
                    <Text style={styles.userNote} numberOfLines={1}>
                      {user.user_note}
                    </Text>
                  )}
                </View>
                <Text style={styles.userDNS} numberOfLines={1}>
                  📡 {user.dns_url || 'DNS non configuré'}
                </Text>
                <Text style={styles.userDetails}>
                  👤 {user.xtream_username || 'N/A'} • 👥 {user.max_profiles} profils
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={[
            styles.updateButton,
            (updating || selectedUsers.length === 0) && styles.buttonDisabled
          ]}
          onPress={handleUpdateDNS}
          disabled={updating || selectedUsers.length === 0}
        >
          {updating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={24} color="#fff" />
              <Text style={styles.buttonText}>
                Mettre à jour le DNS ({selectedUsers.length} utilisateur{selectedUsers.length > 1 ? 's' : ''})
              </Text>
            </>
          )}
        </TouchableOpacity>
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    marginBottom: 24,
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  formContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
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
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#333',
  },
  userCardSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#2196F3' + '10',
  },
  checkboxContainer: {
    marginRight: 16,
    justifyContent: 'center',
  },
  userInfoContainer: {
    flex: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  userCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E50914',
  },
  userNote: {
    flex: 1,
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  userDNS: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 6,
  },
  userDetails: {
    fontSize: 13,
    color: '#888',
  },
  updateButton: {
    flexDirection: 'row',
    backgroundColor: '#E50914',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});