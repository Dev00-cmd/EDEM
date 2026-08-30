import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import { AuthProvider, useAuth } from '@/store/AuthContext';
import { AppProvider, useApp } from '@/store/AppContext';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { UpdateGate } from '@/components/UpdateGate';

// Garde l'écran de démarrage tant que les polices ne sont pas
// prêtes : évite le clignotement d'une police de secours.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Aiguillage : décide où l'élève doit se trouver.
 *
 *   pas de compte        → /login
 *   compte sans profil   → /onboarding
 *   compte + profil      → les onglets
 */
function Navigator() {
  const { session, ready: authReady } = useAuth();
  const { ready: appReady, profile } = useApp();
  const { colors, isDark } = useTheme();

  const segments = useSegments();
  const router = useRouter();

  const ready = authReady && appReady;

  useEffect(() => {
    if (!ready) return;

    const group = segments[0];
    const inAuthScreen = group === 'login';
    const inOnboarding = group === 'onboarding';

    if (!session) {
      if (!inAuthScreen) router.replace('/login');
      return;
    }
    if (!profile.onboarded) {
      if (!inOnboarding) router.replace('/onboarding');
      return;
    }
    if (inAuthScreen || inOnboarding) router.replace('/(tabs)');
  }, [ready, session, profile.onboarded, segments, router]);

  const onLayout = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.flex} onLayout={onLayout}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="tune-profile" />
        <Stack.Screen name="teacher-request" />
        <Stack.Screen name="(tabs)" />
      </Stack>

      {/* Au-dessus de tout : applique les mises à jour toute seule
          quand rien n'est en cours, et laisse la main sinon. */}
      <UpdateGate />
    </View>
  );
}

/** Le thème dépend du profil → il vit sous AppProvider. */
function ThemedApp() {
  const { profile } = useApp();
  return (
    <ThemeProvider mode={profile.theme}>
      <Navigator />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });

  // En cas d'échec de chargement des polices, on démarre quand
  // même : mieux vaut une police système qu'un écran bloqué.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <ThemedApp />
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
