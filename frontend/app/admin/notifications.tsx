import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../../utils/api';
import TVFocusable from '../../components/TVFocusable';

export default function NotificationsScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<string | null>(null);
  const [hasNotification, setHasNotification] = useState(false);

  useEffect(() => {
    loadCurrentNotification();
  }, []);

  const loadCurrentNotification = async () => {
    try {
      const response = await adminAPI.getAdminNotification();
      if (response.data.has_notification) {
        setHasNotification(true);
        setCurrentNotification(response.data.message);
        setMessage(response.data.message);
      } else {
        setHasNotification(false);
        setCurrentNotification(null);
        setMessage('');
      }
    } catch (error) {
      console.error('Error loading notification:', error);
    }
  };

  const handleSave = async () => {
    if (!message.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un message de notification');
      return;
    }

    try {
      setLoading(true);
      await adminAPI.createNotification(message);
      Alert.alert('Succès', 'Notification publiée avec succès');
      await loadCurrentNotification();
    } catch (error: any) {
      console.error('Error creating notification:', error);
      Alert.alert('Erreur', 'Impossible de créer la notification');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer la notification',
      'Voulez-vous vraiment supprimer la notification actuelle ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await adminAPI.deleteNotification();
              Alert.alert('Succès', 'Notification supprimée');
              await loadCurrentNotification();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la notification');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TVFocusable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={Platform.isTV ? 32 : 24} color="#fff" />
        </TVFocusable>
        <Text style={styles.headerTitle}>Gestion des Notifications</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={Platform.isTV ? 28 : 20} color="#E50914" />
            <Text style={styles.infoText}>
              La notification sera affichée en haut de l'écran d'accueil pour tous les utilisateurs.
            </Text>
          </View>

          {hasNotification && currentNotification && (
            <View style={styles.currentNotificationBox}>
              <Text style={styles.currentNotificationLabel}>Notification actuelle :</Text>
              <Text style={styles.currentNotificationText}>{currentNotification}</Text>
            </View>
          )}

          <Text style={styles.label}>Message de notification</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Entrez votre message ici..."
            placeholderTextColor="#666"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            maxLength={200}
          />
          <Text style={styles.charCount}>{message.length}/200 caractères</Text>

          <View style={styles.buttonRow}>
            <TVFocusable
              style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={Platform.isTV ? 28 : 20} color="#fff" />
                  <Text style={styles.buttonText}>Publier</Text>
                </>
              )}
            </TVFocusable>

            {hasNotification && (
              <TVFocusable
                style={[styles.button, styles.deleteButton, loading && styles.buttonDisabled]}
                onPress={handleDelete}
                disabled={loading}
              >
                <Ionicons name="trash" size={Platform.isTV ? 28 : 20} color="#fff" />
                <Text style={styles.buttonText}>Supprimer</Text>
              </TVFocusable>
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Platform.isTV ? 30 : 20,
    paddingTop: Platform.isTV ? 50 : 40,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: Platform.isTV ? 15 : 10,
    marginRight: Platform.isTV ? 20 : 15,
  },
  headerTitle: {
    fontSize: Platform.isTV ? 32 : 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Platform.isTV ? 30 : 20,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: Platform.isTV ? 30 : 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#252525',
    padding: Platform.isTV ? 20 : 15,
    borderRadius: 8,
    marginBottom: Platform.isTV ? 30 : 20,
    borderLeftWidth: 4,
    borderLeftColor: '#E50914',
  },
  infoText: {
    flex: 1,
    marginLeft: Platform.isTV ? 15 : 10,
    fontSize: Platform.isTV ? 18 : 14,
    color: '#ccc',
    lineHeight: Platform.isTV ? 26 : 20,
  },
  currentNotificationBox: {
    backgroundColor: '#252525',
    padding: Platform.isTV ? 20 : 15,
    borderRadius: 8,
    marginBottom: Platform.isTV ? 30 : 20,
    borderWidth: 1,
    borderColor: '#E50914',
  },
  currentNotificationLabel: {
    fontSize: Platform.isTV ? 18 : 14,
    fontWeight: 'bold',
    color: '#E50914',
    marginBottom: Platform.isTV ? 12 : 8,
  },
  currentNotificationText: {
    fontSize: Platform.isTV ? 20 : 16,
    color: '#fff',
    lineHeight: Platform.isTV ? 28 : 22,
  },
  label: {
    fontSize: Platform.isTV ? 20 : 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: Platform.isTV ? 15 : 10,
  },
  textArea: {
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: Platform.isTV ? 20 : 15,
    fontSize: Platform.isTV ? 20 : 16,
    color: '#fff',
    minHeight: Platform.isTV ? 150 : 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#333',
  },
  charCount: {
    textAlign: 'right',
    fontSize: Platform.isTV ? 16 : 12,
    color: '#666',
    marginTop: Platform.isTV ? 10 : 8,
    marginBottom: Platform.isTV ? 25 : 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Platform.isTV ? 20 : 15,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Platform.isTV ? 20 : 15,
    borderRadius: 8,
    gap: Platform.isTV ? 12 : 8,
    minHeight: Platform.isTV ? 70 : 50,
  },
  saveButton: {
    backgroundColor: '#00AA13',
  },
  deleteButton: {
    backgroundColor: '#E50914',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: Platform.isTV ? 20 : 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});