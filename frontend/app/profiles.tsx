import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { profileAPI } from '../utils/api';
import TVFocusable from '../components/TVFocusable';

interface Profile {
  id: string;
  name: string;
  is_child: boolean;
  avatar?: string;
  user_code: string;
}

export default function ProfilesScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [isChildProfile, setIsChildProfile] = useState(false);
  const [addingProfile, setAddingProfile] = useState(false);
  
  const router = useRouter();
  const { userCode, setCurrentProfile, logout } = useAuth();

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    if (!userCode) return;
    
    try {
      setLoading(true);
      const response = await profileAPI.getProfiles(userCode);
      setProfiles(response.data);
    } catch (error) {
      console.error('Error loading profiles:', error);
      Alert.alert('Erreur', 'Impossible de charger les profils');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfile = async (profile: Profile) => {
    await setCurrentProfile(profile);
    router.replace('/(tabs)');
  };

  const handleAddProfile = async () => {
    if (!newProfileName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de profil');
      return;
    }

    try {
      setAddingProfile(true);
      const response = await profileAPI.createProfile(userCode!, {
        name: newProfileName,
        is_child: isChildProfile,
      });
      
      setProfiles([...profiles, response.data]);
      setShowAddModal(false);
      setNewProfileName('');
      setIsChildProfile(false);
    } catch (error: any) {
      console.error('Error creating profile:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible de créer le profil'
      );
    } finally {
      setAddingProfile(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const getProfileIcon = (profile: Profile) => {
    if (profile.is_child) {
      return 'happy-outline';
    }
    return 'person-circle-outline';
  };

  const getProfileColor = (index: number) => {
    const colors = ['#E50914', '#0071EB', '#5500D9', '#00AA13', '#FFA500'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#E50914" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Qui regarde ?</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.profilesList}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.profileCard}
            onPress={() => handleSelectProfile(item)}
          >
            <View
              style={[
                styles.profileAvatar,
                { backgroundColor: getProfileColor(index) },
              ]}
            >
              <Ionicons
                name={getProfileIcon(item) as any}
                size={64}
                color="#fff"
              />
            </View>
            <Text style={styles.profileName}>{item.name}</Text>
            {item.is_child && (
              <Text style={styles.profileBadge}>Enfant</Text>
            )}
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.profileCard}
            onPress={() => setShowAddModal(true)}
          >
            <View style={[styles.profileAvatar, styles.addProfileAvatar]}>
              <Ionicons name="add" size={64} color="#fff" />
            </View>
            <Text style={styles.profileName}>Ajouter un profil</Text>
          </TouchableOpacity>
        }
      />

      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouveau profil</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Nom du profil"
              placeholderTextColor="#666"
              value={newProfileName}
              onChangeText={setNewProfileName}
              maxLength={20}
            />

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIsChildProfile(!isChildProfile)}
            >
              <View style={[styles.checkbox, isChildProfile && styles.checkboxChecked]}>
                {isChildProfile && <Ionicons name="checkmark" size={20} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>Profil enfant</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewProfileName('');
                  setIsChildProfile(false);
                }}
              >
                <Text style={styles.modalButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleAddProfile}
                disabled={addingProfile}
              >
                {addingProfile ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Créer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
  },
  profilesList: {
    padding: 20,
    alignItems: 'center',
  },
  profileCard: {
    alignItems: 'center',
    margin: 20,
    width: 150,
  },
  profileAvatar: {
    width: 120,
    height: 120,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  addProfileAvatar: {
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#666',
    borderStyle: 'dashed',
  },
  profileName: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  profileBadge: {
    fontSize: 12,
    color: '#00AA13',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modalButtonCancel: {
    backgroundColor: '#444',
  },
  modalButtonConfirm: {
    backgroundColor: '#E50914',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
