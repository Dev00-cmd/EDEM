// ═══════════════════════════════════════════════════════════════
//  BANNIÈRE DE MISE À JOUR
//
//  Sans elle, une mise à jour à distance arrive en silence : elle
//  se télécharge au lancement et ne s'applique qu'au SUIVANT.
//  L'élève ne sait pas qu'il y a du neuf, ni qu'il doit relancer
//  l'app — il continue simplement sur l'ancienne version.
//
//  Ici, dès qu'une mise à jour est prête, une bande apparaît en
//  haut de l'écran. Un appui, l'app redémarre dessus.
//
//  On ne demande AUCUNE permission : c'est une notification dans
//  l'app, pas une notification système. Elle marche donc partout,
//  y compris quand l'élève a refusé les notifications d'Android.
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';
import { type } from '@/theme/typography';

export function UpdateBanner() {
  const { t } = useApp();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [ready, setReady] = useState(false);
  const [applying, setApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!Updates.isEnabled) return;

    let alive = true;

    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable || !alive) return;

        // On télécharge tout de suite : quand l'élève appuie, il ne
        // doit pas attendre — surtout sur une connexion lente.
        await Updates.fetchUpdateAsync();
        if (alive) setReady(true);
      } catch {
        // Pas de réseau, ou serveur injoignable : on reste discret.
        // L'élève garde la version qui fonctionne.
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!ready || dismissed) return null;

  const apply = async () => {
    setApplying(true);
    try {
      await Updates.reloadAsync();
    } catch {
      setApplying(false);
      setDismissed(true);
    }
  };

  return (
    <View
      style={[
        styles.wrap,
        { top: insets.top + 6, shadowColor: colors.shadow },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={apply}
        disabled={applying}
        accessibilityRole="button"
        accessibilityLabel={t('update.ready')}
        style={[styles.banner, { backgroundColor: colors.accent }]}
      >
        {applying ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Icon name="refresh" size={17} color="#FFFFFF" />
        )}

        <View style={styles.flex}>
          <Text style={[type.captionMedium, styles.title]}>
            {t('update.ready')}
          </Text>
          <Text style={[type.caption, styles.sub]}>
            {applying ? t('update.applying') : t('update.tap')}
          </Text>
        </View>

        {!applying && (
          <Pressable
            onPress={() => setDismissed(true)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <Icon name="close" size={16} color="rgba(255,255,255,0.8)" />
          </Pressable>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 100,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  flex: { flex: 1 },
  title: { color: '#FFFFFF' },
  sub: { color: 'rgba(255,255,255,0.85)', marginTop: 1 },
});
