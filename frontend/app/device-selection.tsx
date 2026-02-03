import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import TVFocusable from '../components/TVFocusable';
import { useDevice } from '../contexts/DeviceContext';

export default function DeviceSelectionScreen() {
  const { setDeviceMode } = useDevice();

  const handleSelectTV = async () => {
    await setDeviceMode('tv');
  };

  const handleSelectMobile = async () => {
    await setDeviceMode('mobile');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        <Text style={styles.logo}>IPTV Player</Text>
        <Text style={styles.title}>Choisissez votre appareil</Text>
        <Text style={styles.subtitle}>
          Sélectionnez le type d'appareil pour optimiser votre expérience
        </Text>

        <View style={styles.optionsContainer}>
          {/* Option TV */}
          <TVFocusable
            style={styles.option}
            onPress={handleSelectTV}
            hasTVPreferredFocus={true}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="tv" size={80} color="#E50914" />
            </View>
            <Text style={styles.optionTitle}>Téléviseur</Text>
            <Text style={styles.optionDescription}>
              Android TV, Box TV{'\n'}
              Navigation avec télécommande
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Optimisé TV</Text>
            </View>
          </TVFocusable>

          {/* Option Mobile */}
          <TVFocusable
            style={styles.option}
            onPress={handleSelectMobile}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="phone-portrait" size={80} color="#E50914" />
            </View>
            <Text style={styles.optionTitle}>Mobile / Tablette</Text>
            <Text style={styles.optionDescription}>
              iPhone, iPad, Android{'\n'}
              Navigation tactile
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Standard</Text>
            </View>
          </TVFocusable>
        </View>

        <Text style={styles.hint}>
          Vous pourrez changer ce choix plus tard dans les paramètres
        </Text>
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
    alignItems: 'center',
    padding: 40,
  },
  logo: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#E50914',
    marginBottom: 20,
    letterSpacing: 2,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#ccc',
    marginBottom: 60,
    textAlign: 'center',
    maxWidth: 600,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 40,
  },
  option: {
    width: 320,
    height: 420,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  iconContainer: {
    width: 140,
    height: 140,
    backgroundColor: '#252525',
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  optionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
  },
  badge: {
    backgroundColor: '#E50914',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    maxWidth: 500,
  },
});
