import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../utils/api';
import TVFocusable from '../components/TVFocusable';

export default function LoginScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUserCode, userCode, currentProfile } = useAuth();

  useEffect(() => {
    // If already logged in, redirect to profiles
    if (userCode && !currentProfile) {
      router.replace('/profiles');
    } else if (userCode && currentProfile) {
      router.replace('/(tabs)');
    }
  }, [userCode, currentProfile]);

  const handleLogin = async () => {
    if (!code.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre code utilisateur');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.verifyCode(code.toUpperCase());
      if (response.data.valid) {
        await setUserCode(code.toUpperCase());
        router.replace('/profiles');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert(
        'Code invalide',
        'Le code que vous avez entré est invalide ou inactif.'
      );
    } finally {
      setLoading(false);
    }
  };

  const goToAdmin = () => {
    router.push('/admin');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.logo}>IPTV Player</Text>
        <Text style={styles.subtitle}>Entrez votre code d'accès</Text>

        <TextInput
          style={styles.input}
          placeholder="CODE UTILISATEUR"
          placeholderTextColor="#666"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          maxLength={8}
          editable={!loading}
        />

        <TVFocusable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          hasTVPreferredFocus={true}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>SE CONNECTER</Text>
          )}
        </TVFocusable>

        <TVFocusable
          style={styles.adminButton}
          onPress={goToAdmin}
        >
          <Text style={styles.adminButtonText}>Panneau Admin</Text>
        </TVFocusable>
      </View>
    </KeyboardAvoidingView>
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
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#E50914',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 40,
  },
  input: {
    width: '100%',
    maxWidth: 400,
    height: 56,
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  button: {
    width: '100%',
    maxWidth: 400,
    height: 56,
    backgroundColor: '#E50914',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adminButton: {
    marginTop: 20,
  },
  adminButtonText: {
    color: '#888',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
