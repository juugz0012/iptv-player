import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="profiles" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="player" />
          <Stack.Screen name="admin" />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
