// ═══════════════════════════════════════════════════════════════
//  MISES À JOUR AUTOMATIQUES
//
//  Pourquoi ce fichier existe, parce que ça a coûté des heures :
//
//  Par défaut, expo-updates télécharge la mise à jour en arrière-
//  plan et l'applique « au prochain démarrage à froid ». Sur
//  Android, fermer une app ne tue presque jamais son processus :
//  la rouvrir est une reprise à chaud, pas un démarrage à froid.
//  Ce prochain démarrage n'arrivait donc jamais, et l'élève
//  restait indéfiniment sur l'ancienne version.
//
//  Rien n'était cassé — ni l'URL, ni le canal, ni le manifeste.
//  C'était le comportement par défaut, simplement inadapté.
//
//  On ne s'y fie donc plus : on applique nous-mêmes, mais jamais
//  au milieu du travail de l'élève.
//
//    · au lancement, si une mise à jour est prête → on redémarre
//      tout de suite. Rien n'est en cours, c'est invisible.
//    · plus tard, l'élève travaille : on ne coupe rien. Un
//      bandeau propose de l'appliquer, et on l'applique tout seul
//      au retour d'une vraie absence — moment où plus rien n'est
//      en cours.
//
//  `isUpdatePending` n'existe QUE via le hook useUpdates() : ce
//  n'est pas une constante du module, contrairement à isEnabled
//  ou channel. C'est la méthode que documente Expo.
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Updates from 'expo-updates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { LogoMark } from './LogoMark';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { ON_ACCENT, ON_ACCENT_SOFT, RADIUS } from '@/theme/theme';
import { type } from '@/theme/typography';

/**
 * Fenêtre pendant laquelle un redémarrage est indolore. Au-delà,
 * l'élève a eu le temps de commencer quelque chose : on ne lui
 * reprend pas la main.
 */
const STARTUP_WINDOW_MS = 12_000;

/**
 * Absence minimale avant d'appliquer au retour.
 *
 * Un aller-retour rapide n'est PAS une absence : l'élève qui ouvre
 * l'appareil photo pour photographier son devoir revient en
 * quelques secondes, et redémarrer lui ferait perdre sa pièce
 * jointe. Une minute écoulée signifie qu'il a vraiment quitté.
 */
const AWAY_ENOUGH_MS = 60_000;

/**
 * Hors build EAS — Expo Go, mode développement — expo-updates est
 * inactif. On ne monte alors rien du tout : ni hook, ni écouteur.
 */
export function UpdateGate() {
  if (!Updates.isEnabled) return null;
  return <Gate />;
}

function Gate() {
  const { t } = useApp();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Passe à `true` dès qu'une mise à jour est téléchargée et prête
  // — y compris par le téléchargement automatique du démarrage.
  const { isUpdatePending } = Updates.useUpdates();

  const [offered, setOffered] = useState(false);
  const [applying, setApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const mountedAt = useRef(Date.now());
  const backgroundedAt = useRef<number | null>(null);
  // Une seule tentative par session : si la mise à jour était
  // mauvaise, on ne veut pas d'une boucle de démarrage.
  const restarting = useRef(false);

  const apply = useCallback(async () => {
    if (restarting.current) return;
    restarting.current = true;
    setApplying(true);
    try {
      await Updates.reloadAsync();
    } catch {
      // Échec du redémarrage : l'app reste utilisable sur la
      // version actuelle, et l'élève garde la main.
      restarting.current = false;
      setApplying(false);
      setOffered(true);
    }
  }, []);

  // ── Une mise à jour est prête ───────────────────────────────
  useEffect(() => {
    if (!isUpdatePending) return;

    if (Date.now() - mountedAt.current < STARTUP_WINDOW_MS) {
      apply();
      return;
    }
    setOffered(true);
  }, [isUpdatePending, apply]);

  // ── Recherche explicite, en secours ─────────────────────────
  // Le téléchargement automatique du démarrage peut ne pas avoir
  // eu lieu : réglage WIFI_ONLY, session reprise sans démarrage,
  // réseau revenu depuis. On vérifie donc nous-mêmes aussi.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable || !alive) return;
        // Le téléchargement fait basculer isUpdatePending, que
        // l'effet ci-dessus prend en charge.
        await Updates.fetchUpdateAsync();
      } catch {
        // Pas de réseau, serveur injoignable : on reste discret.
        // L'élève garde la version qui fonctionne.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ── Application au retour d'une vraie absence ───────────────
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAt.current = Date.now();
        return;
      }
      if (state !== 'active') return;

      const since = backgroundedAt.current;
      backgroundedAt.current = null;
      if (since === null) return;

      if (Date.now() - since > AWAY_ENOUGH_MS && isUpdatePending) apply();
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [isUpdatePending, apply]);

  // ── Écran de redémarrage ────────────────────────────────────
  // Sans lui, l'app se fige une seconde sans explication et
  // l'élève croit qu'elle a planté.
  if (applying) {
    return (
      <View style={[styles.full, { backgroundColor: colors.bg }]}>
        <LogoMark size={64} />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[type.bodyMedium, { color: colors.text }]}>
          {t('update.applying')}
        </Text>
      </View>
    );
  }

  if (!offered || dismissed) return null;

  // ── Bandeau : l'élève travaille, on lui laisse la main ──────
  return (
    <View
      style={[styles.wrap, { top: insets.top + 6, shadowColor: colors.shadow }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={apply}
        accessibilityRole="button"
        accessibilityLabel={t('update.ready')}
        style={[styles.banner, { backgroundColor: colors.accent }]}
      >
        <Icon name="refresh" size={17} color={colors.accentText} />

        <View style={styles.flex}>
          <Text style={[type.captionMedium, styles.title]}>
            {t('update.ready')}
          </Text>
          <Text style={[type.caption, styles.sub]}>{t('update.tap')}</Text>
        </View>

        <Pressable
          onPress={() => setDismissed(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <Icon name="close" size={16} color={colors.accentTextSoft} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  full: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },

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
  title: { color: ON_ACCENT },
  sub: { color: ON_ACCENT_SOFT, marginTop: 1 },
});
