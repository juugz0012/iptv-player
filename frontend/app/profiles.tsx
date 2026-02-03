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
      let errorMessage = 'Impossible de créer le profil';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      Alert.alert('Erreur', errorMessage);
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
        <TVFocusable onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={Platform.isTV ? 32 : 24} color="#fff" />
        </TVFocusable>
      </View>

      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        numColumns={Platform.isTV ? 3 : 2}
        contentContainerStyle={styles.profilesList}
        renderItem={({ item, index }) => (
          <TVFocusable
            style={styles.profileCard}
            onPress={() => handleSelectProfile(item)}
            hasTVPreferredFocus={index === 0}
          >
            <View
              style={[
                styles.profileAvatar,
                { backgroundColor: getProfileColor(index) },
              ]}
            >
              <Ionicons
                name={getProfileIcon(item)}
                size={Platform.isTV ? 80 : 60}
                color="#fff"
              />
            </View>
            <Text style={styles.profileName}>{item.name}</Text>
            {item.is_child && (
              <Text style={styles.childBadge}>Enfant</Text>
            )}
          </TVFocusable>
        )}
      />

      {profiles.length < 5 && (
        <TVFocusable
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add-circle" size={Platform.isTV ? 32 : 24} color="#E50914" />
          <Text style={styles.addButtonText}>Ajouter un profil</Text>
        </TVFocusable>
      )}

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouveau profil</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nom du profil"
              placeholderTextColor="#666"
              value={newProfileName}
              onChangeText={setNewProfileName}
              maxLength={20}
            />

            <View style={styles.modalActions}>
              <TVFocusable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewProfileName('');
                  setIsChildProfile(false);
                }}
              >
                <Text style={styles.modalButtonText}>Annuler</Text>
              </TVFocusable>
              
              <TVFocusable
                style={[styles.modalButton, styles.createButton, addingProfile && styles.buttonDisabled]}
                onPress={handleAddProfile}
                disabled={addingProfile}
              >
                {addingProfile ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Créer</Text>
                )}
              </TVFocusable>
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
    padding: Platform.isTV ? 40 : 20,
    paddingTop: Platform.isTV ? 60 : 40,
  },
  title: {
    fontSize: Platform.isTV ? 48 : 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: Platform.isTV ? 15 : 10,
    borderRadius: 8,
  },
  profilesList: {
    padding: Platform.isTV ? 40 : 20,
    paddingBottom: Platform.isTV ? 100 : 80,
  },
  profileCard: {
    flex: 1,
    alignItems: 'center',
    margin: Platform.isTV ? 20 : 10,
    padding: Platform.isTV ? 30 : 20,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
  },
  profileAvatar: {
    width: Platform.isTV ? 160 : 120,
    height: Platform.isTV ? 160 : 120,
    borderRadius: Platform.isTV ? 80 : 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.isTV ? 20 : 15,
  },
  profileName: {
    fontSize: Platform.isTV ? 24 : 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  childBadge: {
    marginTop: 8,
    fontSize: Platform.isTV ? 16 : 12,
    color: '#00AA13',
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Platform.isTV ? 25 : 15,
    marginHorizontal: Platform.isTV ? 40 : 20,
    marginBottom: Platform.isTV ? 40 : 20,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#E50914',
    borderStyle: 'dashed',
  },
  addButtonText: {
    marginLeft: 10,
    fontSize: Platform.isTV ? 22 : 16,
    color: '#E50914',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: Platform.isTV ? '50%' : '85%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: Platform.isTV ? 40 : 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    fontSize: Platform.isTV ? 32 : 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: Platform.isTV ? 30 : 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: Platform.isTV ? 20 : 15,
    fontSize: Platform.isTV ? 22 : 16,
    color: '#fff',
    marginBottom: Platform.isTV ? 30 : 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Platform.isTV ? 20 : 12,
  },
  modalButton: {
    flex: 1,
    padding: Platform.isTV ? 20 : 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.isTV ? 60 : 50,
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  createButton: {
    backgroundColor: '#E50914',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    fontSize: Platform.isTV ? 20 : 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});