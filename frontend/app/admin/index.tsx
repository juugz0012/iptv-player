import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_PASSWORD = 'admin123'; // Changez ce mot de passe !

export default function AdminLoginScreen() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const isLoggedIn = await AsyncStorage.getItem('admin_logged_in');
      if (isLoggedIn === 'true') {
        // Rediriger automatiquement vers le dashboard
        router.replace('/admin/dashboard');
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleLogin = async () => {
    if (!password) {
      Alert.alert('Erreur', 'Veuillez entrer le mot de passe administrateur');
      return;
    }

    setLoading(true);

    // Simuler un délai
    setTimeout(async () => {
      if (password === ADMIN_PASSWORD) {
        // Sauvegarder la session admin
        await AsyncStorage.setItem('admin_logged_in', 'true');
        router.replace('/admin/dashboard');
      } else {
        Alert.alert('Erreur', 'Mot de passe administrateur incorrect');
        setPassword('');
      }
      setLoading(false);
    }, 500);
  };

  // Afficher un loader pendant la vérification de session
  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={styles.checkingText}>Vérification...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Ionicons name="shield-checkmark" size={80} color="#E50914" />
          <Text style={styles.title}>Panel Administrateur</Text>
          <Text style={styles.subtitle}>Accès Réservé</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Mot de passe administrateur</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Entrez le mot de passe"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleLogin}
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

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="lock-open" size={24} color="#fff" />
                <Text style={styles.loginButtonText}>Connexion</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#666" />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.warningBox}>
          <Ionicons name="warning" size={24} color="#FFA500" />
          <Text style={styles.warningText}>
            Cet accès est réservé à l'administrateur uniquement.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#E50914',
    marginTop: 8,
    fontWeight: '600',
  },
  formContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 12,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 24,
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
  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#E50914',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    marginLeft: 8,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
    alignItems: 'center',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
    marginLeft: 12,
  },
});
