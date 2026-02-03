import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Chargement..." }: LoadingScreenProps) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animation de rotation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Animation de pulsation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.spinner,
          {
            transform: [{ rotate: spin }, { scale: pulseValue }],
          },
        ]}
      >
        <View style={styles.spinnerInner} />
      </Animated.View>
      
      <Text style={styles.logo}>IPTV Player</Text>
      <Text style={styles.message}>{message}</Text>
      
      {/* Barre de progression animée */}
      <View style={styles.progressBar}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              transform: [{ scaleX: pulseValue }],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.isTV ? 60 : 20,
  },
  spinner: {
    width: Platform.isTV ? 120 : 80,
    height: Platform.isTV ? 120 : 80,
    borderRadius: Platform.isTV ? 60 : 40,
    borderWidth: Platform.isTV ? 6 : 4,
    borderColor: 'transparent',
    borderTopColor: '#E50914',
    borderRightColor: '#E50914',
    marginBottom: Platform.isTV ? 40 : 30,
  },
  spinnerInner: {
    width: '100%',
    height: '100%',
    borderRadius: Platform.isTV ? 54 : 36,
    borderWidth: Platform.isTV ? 4 : 3,
    borderColor: 'transparent',
    borderBottomColor: '#ffffff40',
    borderLeftColor: '#ffffff40',
  },
  logo: {
    fontSize: Platform.isTV ? 56 : 40,
    fontWeight: 'bold',
    color: '#E50914',
    marginBottom: Platform.isTV ? 20 : 15,
    letterSpacing: 2,
  },
  message: {
    fontSize: Platform.isTV ? 24 : 18,
    color: '#fff',
    marginBottom: Platform.isTV ? 40 : 30,
    textAlign: 'center',
  },
  progressBar: {
    width: Platform.isTV ? 400 : 250,
    height: Platform.isTV ? 6 : 4,
    backgroundColor: '#333',
    borderRadius: Platform.isTV ? 3 : 2,
    overflow: 'hidden',
  },
  progressFill: {
    flex: 1,
    backgroundColor: '#E50914',
    borderRadius: Platform.isTV ? 3 : 2,
  },
});
