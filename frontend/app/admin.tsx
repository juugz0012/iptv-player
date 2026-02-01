import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../utils/api';
import axios from 'axios';

export default function AdminScreen() {
  const [dnsUrl, setDnsUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [maxProfiles, setMaxProfiles] = useState('5');
  const [userNote, setUserNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const router = useRouter();

  const handleCreateUser = async () => {
    // Validation
    if (!dnsUrl || !username || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires (DNS, Username, Password)');
      return;
    }

    const profiles = parseInt(maxProfiles);
    if (isNaN(profiles) || profiles < 1 || profiles > 10) {
      Alert.alert('Erreur', 'Le nombre de profils doit être entre 1 et 10');
      return;
    }

    try {
      setLoading(true);
      setGeneratedCode(null);
      setAccountInfo(null);

      // Step 1: Verify Xtream connection directly from app (bypasses Cloudflare)
      const verifyUrl = `${dnsUrl.trim()}/player_api.php`;
      const verifyResponse = await axios.get(verifyUrl, {
        params: {
          username: username.trim(),
          password: password.trim(),
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
        },
        timeout: 15000,
      });

      const userInfo = verifyResponse.data?.user_info;
      if (!userInfo) {
        Alert.alert('Erreur', 'Impossible de récupérer les informations du compte. Vérifiez vos identifiants.');
        return;
      }

      // Format expiration date
      const expirationTimestamp = userInfo.exp_date;
      let expirationDateStr = 'Inconnue';
      if (expirationTimestamp) {
        try {
          const expDate = new Date(parseInt(expirationTimestamp) * 1000);
          expirationDateStr = expDate.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch (e) {
          console.error('Error parsing date:', e);
        }
      }

      // Step 2: Save config to backend
      await adminAPI.saveXtreamConfig({
        dns_url: dnsUrl.trim(),
        username: username.trim(),
        password: password.trim(),
      });

      // Step 3: Generate user code with note
      const codeResponse = await adminAPI.createUserCode(profiles);

      setGeneratedCode(codeResponse.data.code);
      setAccountInfo({
        username: userInfo.username,
        status: userInfo.status,
        expiration_date: expirationDateStr,
        max_connections: userInfo.max_connections,
        active_connections: userInfo.active_cons,
        user_note: userNote.trim() || '',
      });

      Alert.alert(
        '✅ Utilisateur créé !',
        `✅ DNS vérifié : ${dnsUrl}\n\nCode généré: ${codeResponse.data.code}\n\nExpiration: ${expirationDateStr}\n\nConnexions max: ${userInfo.max_connections || 'N/A'}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let errorMessage = 'Erreur lors de la création de l\'utilisateur';
      
      if (error.response?.status === 401) {
        errorMessage = 'Erreur HTTP 401: Identifiants invalides ou DNS incorrect';
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Timeout: Le serveur IPTV ne répond pas. Vérifiez le DNS.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = `Erreur de connexion: ${error.message}`;
      }
      
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      Clipboard.setString(generatedCode);
      Alert.alert('✅ Copié', 'Le code a été copié dans le presse-papiers');
    }
  };

  const handleReset = () => {
    setGeneratedCode(null);
    setAccountInfo(null);
    setDnsUrl('');
    setUsername('');
    setPassword('');
    setMaxProfiles('5');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Panel Administrateur</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {!generatedCode ? (
          <>
            {/* Formulaire de création */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📡 Identifiants Xtream Codes</Text>
              
              <Text style={styles.label}>DNS / URL du serveur *</Text>
              <TextInput
                style={styles.input}
                placeholder="http://example.com"
                placeholderTextColor="#666"
                value={dnsUrl}
                onChangeText={setDnsUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>Username *</Text>
              <TextInput
                style={styles.input}
                placeholder="Votre username"
                placeholderTextColor="#666"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>Password *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Votre password"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={setPassword}
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

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👥 Configuration Utilisateur</Text>
              
              <Text style={styles.label}>Nombre max de profils</Text>
              <TextInput
                style={styles.input}
                placeholder="5"
                placeholderTextColor="#666"
                value={maxProfiles}
                onChangeText={setMaxProfiles}
                keyboardType="number-pad"
              />
              <Text style={styles.helpText}>
                Combien de profils cet utilisateur pourra créer (1-10)
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.createButton, loading && styles.buttonDisabled]}
              onPress={handleCreateUser}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.buttonText}>Créer l'utilisateur</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={24} color="#E50914" />
              <Text style={styles.infoText}>
                En cliquant sur "Créer", l'application va :{'\n'}
                • Vérifier la connexion au serveur IPTV{'\n'}
                • Récupérer la date d'expiration{'\n'}
                • Sauvegarder les identifiants{'\n'}
                • Générer un code unique
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* Résultat de la création */}
            <View style={styles.successSection}>
              <Ionicons name="checkmark-circle" size={64} color="#00AA13" />
              <Text style={styles.successTitle}>Utilisateur créé avec succès !</Text>
            </View>

            <View style={styles.codeSection}>
              <Text style={styles.codeLabel}>Code utilisateur :</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{generatedCode}</Text>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
                  <Ionicons name="copy" size={24} color="#fff" />
                  <Text style={styles.copyButtonText}>Copier</Text>
                </TouchableOpacity>
              </View>
            </View>

            {accountInfo && (
              <View style={styles.accountInfoSection}>
                <Text style={styles.accountInfoTitle}>Informations du compte :</Text>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Username :</Text>
                  <Text style={styles.infoValue}>{accountInfo.username}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Statut :</Text>
                  <Text style={[styles.infoValue, accountInfo.status === 'Active' && styles.statusActive]}>
                    {accountInfo.status || 'Inconnu'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date d'expiration :</Text>
                  <Text style={styles.infoValue}>
                    {accountInfo.expiration_date || 'Inconnue'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Connexions max :</Text>
                  <Text style={styles.infoValue}>
                    {accountInfo.max_connections || 'N/A'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Profils max :</Text>
                  <Text style={styles.infoValue}>{maxProfiles}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.buttonText}>Créer un autre utilisateur</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backHomeButton} onPress={() => router.push('/')}>
              <Ionicons name="home" size={24} color="#fff" />
              <Text style={styles.buttonText}>Retour à l'accueil</Text>
            </TouchableOpacity>
          </>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
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
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#E50914',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#E50914',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#ccc',
    marginLeft: 12,
    lineHeight: 20,
  },
  successSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00AA13',
    marginTop: 16,
    textAlign: 'center',
  },
  codeSection: {
    marginBottom: 24,
  },
  codeLabel: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 12,
  },
  codeBox: {
    flexDirection: 'row',
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E50914',
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: 'row',
    backgroundColor: '#E50914',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  accountInfoSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  accountInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  statusActive: {
    color: '#00AA13',
  },
  resetButton: {
    flexDirection: 'row',
    backgroundColor: '#E50914',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  backHomeButton: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
