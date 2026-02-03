import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationAPI } from '../utils/api';
import TVFocusable from './TVFocusable';

export default function NotificationBanner() {
  const [notification, setNotification] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    loadNotification();
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

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
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: '#E50914',
    marginBottom: Platform.isTV ? 15 : 10,
  },
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Platform.isTV ? 20 : 12,
    paddingHorizontal: Platform.isTV ? 30 : 16,
  },
  icon: {
    marginRight: Platform.isTV ? 15 : 10,
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: Platform.isTV ? 20 : 14,
    fontWeight: '500',
  },
  closeButton: {
    padding: Platform.isTV ? 10 : 5,
    marginLeft: Platform.isTV ? 15 : 10,
  },
});