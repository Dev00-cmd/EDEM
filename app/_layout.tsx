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
import { ecouterNotifications } from '@/lib/push';

// Garde l'écran de démarrage tant que les polices ne sont pas
// prêtes : évite le clignotement d'une police de secours.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Aiguillage : décide où l'utilisateur doit se trouver.
 *
 *   pas de compte        → /login
 *   compte sans profil   → /onboarding
 *   professeur           → /prof     ses classes, son suivi
 *   élève                → /(tabs)   son parcours, son tuteur
 *
 * UN SEUL COMPTE, DEUX INTERFACES. Le rôle vit en base et le
 * serveur seul en décide ; ici on ne choisit que ce qui s'affiche.
 * Deux comptes séparés n'auraient rien protégé de plus — la
 * sécurité tient aux policies, pas à l'écran de connexion — et
 * auraient coûté deux mots de passe à des gens dont l'accès e-mail
 * est déjà peu fiable. Beaucoup de professeurs sont par ailleurs
 * des élèves, et gardent ici leur profil, leurs XP et leur tuteur.
 */
function Navigator() {
  const { session, ready: authReady } = useAuth();
  const { ready: appReady, profile, vueEleve } = useApp();
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

    // Un professeur qui a demandé à voir l'app « comme un élève »
    // reste du côté élève : c'est un point de vue, pas un rôle.
    const cotePro = profile.role === 'prof' && !vueEleve;
    // `/prof` est un VRAI segment d'URL, pas un groupe entre
    // parenthèses. Un groupe n'ajoute rien au chemin : `(prof)/index`
    // et `(tabs)/index` réclamaient donc tous les deux `/`, et la
    // racine devenait introuvable — « Unmatched Route » au
    // démarrage, pour tout le monde.
    const racine = cotePro ? '/prof' : '/(tabs)';

    if (inAuthScreen || inOnboarding) return router.replace(racine);

    // On ne déplace que si l'utilisateur est du mauvais côté : sans
    // ce garde, chaque navigation interne renverrait à la racine et
    // l'app se figerait sur le premier onglet.
    if (cotePro && group === '(tabs)') router.replace('/prof');
    if (!cotePro && group === 'prof') router.replace('/(tabs)');
  }, [ready, session, profile.onboarded, profile.role, vueEleve, segments, router]);

  /**
   * Toucher une notification ouvre l'écran qu'elle annonce.
   *
   * Sans ça, l'élève arrive sur l'accueil et doit retrouver seul le
   * devoir dont on vient de lui parler — ce qui annule à peu près
   * tout l'intérêt de l'avoir prévenu.
   *
   * On attend `session` : ouvrir un devoir avant que l'aiguillage
   * n'ait tranché renverrait aussitôt vers /login, et la
   * notification serait perdue.
   *
   * `push.ts` a déjà vérifié que la route est l'une des deux
   * permises — le contenu d'une notification vient du réseau, il
   * n'ouvre pas n'importe quel écran.
   */
  useEffect(() => {
    if (!ready || !session) return;
    return ecouterNotifications((route) => {
      router.push(route as Parameters<typeof router.push>[0]);
    });
  }, [ready, session, router]);

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
        <Stack.Screen name="classes" />
        <Stack.Screen name="classroom/new" />
        <Stack.Screen name="classroom/[id]" />
        <Stack.Screen name="assignment/new" />
        <Stack.Screen name="assignment/[id]" />
        <Stack.Screen name="dashboard/[id]" />
        <Stack.Screen name="fil/[id]" />
        <Stack.Screen name="moderation/[id]" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="prof" />
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
