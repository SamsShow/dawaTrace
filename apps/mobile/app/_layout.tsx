import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import '../src/i18n';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(chemist)" options={{ headerShown: false }} />
        <Stack.Screen name="(patient)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
