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
  FlatList,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../utils/api';

interface UserCode {
  code: string;
  created_at: string;
  is_active: boolean;
  max_profiles: number;
  profile_count: number;
}

export default function AdminScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [dnsUrl, setDnsUrl] = useState('');
  const [samsungLgDns, setSamsungLgDns] = useState('');
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [userCodes, setUserCodes] = useState<UserCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [maxProfiles, setMaxProfiles] = useState('5');
  const [generating, setGenerating] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    loadConfig();
    loadUserCodes();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await adminAPI.getXtreamConfig();
      if (response.data.configured) {
        setConfigured(true);
        setUsername(response.data.username);
        setDnsUrl(response.data.dns_url);
        setSamsungLgDns(response.data.samsung_lg_dns || '');
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadUserCodes = async () => {
    try {
      setLoadingCodes(true);
      const response = await adminAPI.listUserCodes();
      setUserCodes(response.data);
    } catch (error) {
      console.error('Error loading user codes:', error);
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!username || !password || !dnsUrl) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setSaving(true);
      await adminAPI.saveXtreamConfig({
        username,
        password,
        dns_url: dnsUrl,
        samsung_lg_dns: samsungLgDns || undefined,
      });
      Alert.alert('Succès', 'Configuration enregistrée avec succès');
      setConfigured(true);
    } catch (error: any) {
      console.error('Error saving config:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible d\'enregistrer la configuration'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateCode = async () => {
    const profileCount = parseInt(maxProfiles);
    if (isNaN(profileCount) || profileCount < 1 || profileCount > 10) {
      Alert.alert('Erreur', 'Le nombre de profils doit être entre 1 et 10');
      return;
    }

    try {
      setGenerating(true);
      const response = await adminAPI.createUserCode(profileCount);
      Alert.alert(
        'Code généré',
        `Nouveau code utilisateur : ${response.data.code}`,
        [{ text: 'OK', onPress: () => {
          setShowGenerateModal(false);
          setMaxProfiles('5');
          loadUserCodes();
        }}]
      );
    } catch (error: any) {
      console.error('Error generating code:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible de générer le code'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteCode = (code: string) => {
    Alert.alert(
      'Désactiver le code',
      `Êtes-vous sûr de vouloir désactiver le code ${code} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Désactiver',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminAPI.deleteUserCode(code);
              Alert.alert('Succès', 'Code désactivé avec succès');
              loadUserCodes();
            } catch (error) {
              console.error('Error deleting code:', error);
              Alert.alert('Erreur', 'Impossible de désactiver le code');
            }
          },
        },
      ]
    );
  };

  const renderUserCode = ({ item }: { item: UserCode }) => (
    <View style={styles.codeCard}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeText}>{item.code}</Text>
        <TouchableOpacity onPress={() => handleDeleteCode(item.code)}>
          <Ionicons name="trash" size={24} color="#E50914" />
        </TouchableOpacity>
      </View>
      <View style={styles.codeInfo}>
        <Text style={styles.codeInfoText}>
          Profils: {item.profile_count} / {item.max_profiles}
        </Text>
        <Text style={styles.codeInfoText}>
          Créé: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      {!item.is_active && (
        <Text style={styles.inactiveLabel}>INACTIF</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Panneau Admin</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration Xtream Codes</Text>
          
          <Text style={styles.label}>Nom d'utilisateur *</Text>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#666"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Mot de passe *</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.label}>DNS URL *</Text>
          <TextInput
            style={styles.input}
            placeholder="http://example.com"
            placeholderTextColor="#666"
            value={dnsUrl}
            onChangeText={setDnsUrl}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Samsung/LG DNS (optionnel)</Text>
          <TextInput
            style={styles.input}
            placeholder="http://example.com"
            placeholderTextColor="#666"
            value={samsungLgDns}
            onChangeText={setSamsungLgDns}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleSaveConfig}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {configured ? 'Mettre à jour' : 'Enregistrer'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Codes Utilisateurs</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowGenerateModal(true)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {loadingCodes ? (
            <ActivityIndicator size="large" color="#E50914" />
          ) : userCodes.length > 0 ? (
            <FlatList
              data={userCodes}
              keyExtractor={(item) => item.code}
              renderItem={renderUserCode}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.emptyText}>Aucun code utilisateur généré</Text>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showGenerateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGenerateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Générer un code</Text>

            <Text style={styles.label}>Nombre maximum de profils</Text>
            <TextInput
              style={styles.input}
              placeholder="5"
              placeholderTextColor="#666"
              value={maxProfiles}
              onChangeText={setMaxProfiles}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowGenerateModal(false);
                  setMaxProfiles('5');
                }}
              >
                <Text style={styles.modalButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleGenerateCode}
                disabled={generating}
              >
                {generating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Générer</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    marginTop: 12,
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
  button: {
    backgroundColor: '#E50914',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#E50914',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeCard: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  codeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  codeInfoText: {
    fontSize: 14,
    color: '#888',
  },
  inactiveLabel: {
    fontSize: 12,
    color: '#E50914',
    fontWeight: 'bold',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 32,
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
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
