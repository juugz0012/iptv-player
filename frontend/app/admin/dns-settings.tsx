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
} from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminAPI } from '../../utils/api';

export default function DNSSettingsScreen() {
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const [newDns, setNewDns] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAdminAuth();
    fetchCurrentConfig();
  }, []);

  const checkAdminAuth = async () => {
    const isLoggedIn = await AsyncStorage.getItem('admin_logged_in');
    if (isLoggedIn !== 'true') {
      router.replace('/admin');
    }
  };

  const fetchCurrentConfig = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getXtreamConfig();
      if (response.data.configured) {
        setCurrentConfig(response.data);
        setNewDns(response.data.dns_url);
        setNewUsername(response.data.username);
        setNewPassword(response.data.password);
      }
    } catch (error: any) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    if (!newDns || !newUsername || !newPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    Alert.alert(
      'Confirmation',
      'Modifier la configuration Xtream pour TOUS les utilisateurs ?\n\nTous les utilisateurs utiliseront ces nouveaux identifiants.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              await adminAPI.saveXtreamConfig({
                dns_url: newDns.trim(),
                username: newUsername.trim(),
                password: newPassword.trim(),
              });
              
              Alert.alert(
                '✅ Succès',
                'Configuration mise à jour pour tous les utilisateurs'
              );
              fetchCurrentConfig();
            } catch (error: any) {
              console.error('Error updating config:', error);
              Alert.alert('Erreur', 'Impossible de mettre à jour la configuration');
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
        <Text style={styles.title}>Gestion DNS</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={24} color="#FFA500" />
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>Attention</Text>
            <Text style={styles.warningText}>
              La modification de cette configuration affectera **TOUS** les utilisateurs.
              Assurez-vous que les identifiants sont corrects.
            </Text>
          </View>
        </View>

        {currentConfig && (
          <View style={styles.currentConfigBox}>
            <Text style={styles.sectionTitle}>Configuration actuelle</Text>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>DNS :</Text>
              <Text style={styles.configValue}>{currentConfig.dns_url}</Text>
            </View>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Username :</Text>
              <Text style={styles.configValue}>{currentConfig.username}</Text>
            </View>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Date de création :</Text>
              <Text style={styles.configValue}>
                {new Date(currentConfig.created_at).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Nouvelle configuration</Text>

          <Text style={styles.label}>DNS / URL du serveur *</Text>
          <TextInput
            style={styles.input}
            placeholder="http://example.com"
            placeholderTextColor="#666"
            value={newDns}
            onChangeText={setNewDns}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Username *</Text>
          <TextInput
            style={styles.input}
            placeholder="Votre username"
            placeholderTextColor="#666"
            value={newUsername}
            onChangeText={setNewUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password *</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Votre password"
              placeholderTextColor="#666"
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.updateButton, updating && styles.buttonDisabled]}
          onPress={handleUpdateConfig}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="globe" size={24} color="#fff" />
              <Text style={styles.buttonText}>Mettre à jour pour tous les utilisateurs</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#2196F3" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Comment ça fonctionne ?</Text>
            <Text style={styles.infoText}>
              • Cette configuration est partagée par tous les utilisateurs{'\n'}
              • Seul le code utilisateur est unique{'\n'}
              • La modification prend effet immédiatement{'\n'}
              • Les utilisateurs devront se reconnecter
            </Text>
          </View>
        </View>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
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
    borderLeftColor: '#FFA500',
    marginBottom: 24,
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFA500',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  currentConfigBox: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  configRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  configLabel: {
    fontSize: 14,
    color: '#888',
    width: 120,
  },
  configValue: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  formContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#ccc',
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  eyeButton: {
    padding: 16,
  },
  updateButton: {
    flexDirection: 'row',
    backgroundColor: '#E50914',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
});
