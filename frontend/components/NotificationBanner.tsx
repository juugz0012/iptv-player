import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationAPI } from '../utils/api';
import TVFocusable from './TVFocusable';

export default function NotificationBanner() {
  const [notification, setNotification] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    loadNotification();
  }, []);

  const loadNotification = async () => {
    try {
      const response = await notificationAPI.getNotification();
      if (response.data.has_notification) {
        setNotification(response.data.message);
        setVisible(true);
      }
    } catch (error) {
      console.log('No notification to display');
    }
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!notification || !visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons
          name="information-circle"
          size={Platform.isTV ? 28 : 20}
          color="#E50914"
          style={styles.icon}
        />
        <Text style={styles.text} numberOfLines={2}>
          {notification}
        </Text>
        <TVFocusable onPress={handleDismiss} style={styles.closeButton}>
          <Ionicons
            name="close"
            size={Platform.isTV ? 28 : 20}
            color="#fff"
          />
        </TVFocusable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E50914',
    borderRadius: 12,
    marginHorizontal: Platform.isTV ? 30 : 15,
    marginVertical: Platform.isTV ? 20 : 15,
    padding: Platform.isTV ? 25 : 20,
    elevation: 15,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: Platform.isTV ? 15 : 12,
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: Platform.isTV ? 24 : 18,
    fontWeight: 'bold',
    lineHeight: Platform.isTV ? 32 : 24,
  },
  closeButton: {
    padding: Platform.isTV ? 12 : 8,
    marginLeft: Platform.isTV ? 15 : 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: Platform.isTV ? 20 : 16,
  },
});
