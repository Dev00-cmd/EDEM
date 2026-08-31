// ═══════════════════════════════════════════════════════════════
//  LES BLOCS COMMUNS AUX DEUX PROFILS
//
//  L'élève et le professeur n'ont pas le même profil — l'un montre
//  ses XP et sa classe, l'autre ses salles et ses élèves — mais ils
//  partagent leur moitié basse : la langue, le thème, la mise à
//  jour, « à propos », et le bas de page qui déconnecte.
//
//  Ces blocs vivent donc ici plutôt que recopiés dans les deux
//  écrans. C'est le même choix que pour la barre d'onglets : deux
//  copies auraient divergé au premier oubli, et c'est le bouton de
//  mise à jour — celui par lequel passe TOUTE correction — qu'on
//  aurait laissé pourrir d'un côté.
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';
import { Card } from './Card';
import { Chip } from './Chip';
import { Icon } from './Icon';
import { LogoMark } from './LogoMark';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';
import { FONTS, type } from '@/theme/typography';
import { APP_NAME, APP_TAGLINE_FR, APP_TAGLINE_HT, APP_VERSION } from '@/config/app';
import type { Lang } from '@/i18n';
import type { ThemeMode } from '@/theme/colors';

/** Un titre de section, en petites capitales. */
export function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 24 }}>
      <Text style={[type.eyebrow, { color: colors.textFaint, marginBottom: 11 }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const THEMES: { id: ThemeMode; icon: 'sun' | 'moon' | 'settings'; key: string }[] = [
  { id: 'light', icon: 'sun', key: 'profile.light' },
  { id: 'dark', icon: 'moon', key: 'profile.dark' },
  { id: 'system', icon: 'settings', key: 'profile.system' },
];

/** Langue et thème. Identiques pour tout le monde. */
export function ReglagesCommuns() {
  const { t, profile, updateProfile } = useApp();
  const { colors } = useTheme();

  return (
    <Section label={t('profile.settings')}>
      <Card flush>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Icon name="language" size={18} color={colors.textSoft} />
            <Text style={[type.bodyMedium, { color: colors.text }]}>
              {t('profile.language')}
            </Text>
          </View>
          <View style={styles.settingChips}>
            {(['fr', 'ht'] as Lang[]).map((l) => (
              <Chip
                key={l}
                small
                label={l === 'fr' ? 'Français' : 'Kreyòl'}
                selected={profile.lang === l}
                onPress={() => updateProfile({ lang: l })}
              />
            ))}
          </View>
        </View>

        <View
          style={[
            styles.settingRow,
            { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
          ]}
        >
          <View style={styles.settingLeft}>
            <Icon name="moon" size={18} color={colors.textSoft} />
            <Text style={[type.bodyMedium, { color: colors.text }]}>
              {t('profile.theme')}
            </Text>
          </View>
          <View style={styles.settingChips}>
            {THEMES.map((th) => (
              <Chip
                key={th.id}
                small
                icon={th.icon}
                label={t(th.key)}
                selected={profile.theme === th.id}
                onPress={() => updateProfile({ theme: th.id })}
              />
            ))}
          </View>
        </View>
      </Card>
    </Section>
  );
}

type UpdateState = 'idle' | 'checking' | 'downloading' | 'uptodate' | 'error';

/**
 * Le bouton de mise à jour.
 *
 * C'est par lui que passe TOUTE correction : l'OTA ne s'applique pas
 * seul sur l'appareil, il faut venir la chercher ici. D'où les
 * identifiants affichés dessous — canal, runtime, build : ils disent
 * exactement quelle version tourne, et c'est la première chose à
 * demander quand quelqu'un signale un défaut déjà corrigé.
 */
export function BlocMiseAJour() {
  const { t } = useApp();
  const { colors } = useTheme();
  const [etat, setEtat] = useState<UpdateState>('idle');
  const [souci, setSouci] = useState('');

  const chercher = async () => {
    setSouci('');
    if (!Updates.isEnabled) {
      setEtat('error');
      setSouci(t('profile.updateUnavailable'));
      return;
    }
    try {
      setEtat('checking');
      const r = await Updates.checkForUpdateAsync();
      if (!r.isAvailable) {
        setEtat('uptodate');
        return;
      }
      setEtat('downloading');
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch {
      setEtat('error');
      setSouci(t('profile.updateUnavailable'));
    }
  };

  const libelle =
    etat === 'checking'
      ? t('profile.updateChecking')
      : etat === 'downloading'
        ? t('profile.updateDownloading')
        : etat === 'uptodate'
          ? t('profile.updateNone')
          : etat === 'error'
            ? souci
            : t('profile.updateHint');

  return (
    <Section label={t('profile.updates')}>
      <Card>
        <Pressable
          onPress={chercher}
          disabled={etat === 'checking' || etat === 'downloading'}
          accessibilityRole="button"
          style={styles.updateRow}
        >
          <View style={[styles.updateIcon, { backgroundColor: colors.accentSoft }]}>
            {etat === 'checking' || etat === 'downloading' ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Icon
                name={etat === 'uptodate' ? 'check-circle' : 'refresh'}
                size={18}
                color={etat === 'error' ? colors.danger : colors.accent}
              />
            )}
          </View>

          <View style={styles.flex}>
            <Text style={[type.bodyMedium, { color: colors.text }]}>
              {t('profile.checkUpdate')}
            </Text>
            <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
              {libelle}
            </Text>
          </View>

          {etat === 'idle' && (
            <Icon name="chevron-right" size={16} color={colors.textFaint} />
          )}
        </Pressable>

        <View style={[styles.updateMeta, { borderTopColor: colors.border }]}>
          <Text style={[type.caption, { color: colors.textFaint }]}>
            {t('profile.channel')} : {Updates.channel ?? '—'} · {t('profile.runtime')} :{' '}
            {Updates.runtimeVersion ?? '—'}
          </Text>
          <Text style={[type.caption, { color: colors.textFaint }]} numberOfLines={1}>
            {t('profile.build')} :{' '}
            {Updates.updateId ? Updates.updateId.slice(0, 8) : t('profile.embedded')}
          </Text>
        </View>
      </Card>
    </Section>
  );
}

/** « À propos ». */
export function BlocAPropos() {
  const { t, profile } = useApp();
  const { colors } = useTheme();

  return (
    <Section label={t('profile.about')}>
      <Card>
        <View style={styles.aboutHead}>
          <LogoMark size={36} />
          <View>
            <Text style={[type.cardTitle, { color: colors.text }]}>{APP_NAME}</Text>
            <Text style={[type.caption, { color: colors.textFaint }]}>
              {t('profile.version')} {APP_VERSION}
            </Text>
          </View>
        </View>
        <Text style={[type.captionMedium, { color: colors.accent, marginTop: 12 }]}>
          {profile.lang === 'ht' ? APP_TAGLINE_HT : APP_TAGLINE_FR}
        </Text>
        <Text style={[type.body, { color: colors.textSoft, marginTop: 8 }]}>
          {t('profile.aboutText')}
        </Text>
        <Text
          style={[
            type.caption,
            { color: colors.textFaint, marginTop: 14, textAlign: 'center' },
          ]}
        >
          {t('profile.madeWith')}
        </Text>
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 11, flexShrink: 1 },
  settingChips: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  updateRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  updateIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateMeta: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 10, gap: 2 },
  aboutHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarLetter: { fontFamily: FONTS.extrabold, fontSize: 32 },
});
