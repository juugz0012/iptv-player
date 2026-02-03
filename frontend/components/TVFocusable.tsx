import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, Platform } from 'react-native';

interface TVFocusableProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  focusedStyle?: ViewStyle;
  hasTVPreferredFocus?: boolean;
}

/**
 * Composant optimisé pour la navigation TV avec télécommande
 * Affiche un état de focus visible pour Android TV
 */
export default function TVFocusable({
  children,
  onPress,
  disabled = false,
  style,
  focusedStyle,
  hasTVPreferredFocus = false,
}: TVFocusableProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const combinedStyle = [
    style,
    isFocused && styles.focused,
    isFocused && focusedStyle,
  ];

  return (
    <TouchableOpacity
      style={combinedStyle}
      onPress={onPress}
      disabled={disabled}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={0.8}
      // Android TV properties
      hasTVPreferredFocus={hasTVPreferredFocus}
      tvParallaxProperties={{
        enabled: true,
        shiftDistanceX: 2,
        shiftDistanceY: 2,
        tiltAngle: 0.05,
        magnification: 1.1,
        pressMagnification: 1.0,
      }}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  focused: {
    borderWidth: 4,
    borderColor: '#E50914',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
    transform: [{ scale: 1.05 }],
  },
});
