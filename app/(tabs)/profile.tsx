import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Icon, type IconName } from '@/components/Icon';
import { LogoMark } from '@/components/LogoMark';
import { StatTile, ProgressBar } from '@/components/Stats';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';
import { FONTS, type } from '@/theme/typography';
import { LEVELS } from '@/data/levels';
import { SUBJECTS } from '@/data/subjects';
import { APP_NAME, APP_TAGLINE_FR, APP_TAGLINE_HT, APP_VERSION } from '@/config/app';
import type { Lang } from '@/i18n';
import type { ThemeMode } from '@/theme/colors';

const GOALS = ['exams', 'grades', 'learn', 'english'];

const THEMES: { id: ThemeMode; icon: IconName; key: string }[] = [
  { id: 'light', icon: 'sun', key: 'profile.light' },
  { id: 'dark', icon: 'moon', key: 'profile.dark' },
  { id: 'system', icon: 'settings', key: 'profile.system' },
];

/** Un bloc de réglages avec son intitulé en capitales. */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
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

export default function ProfileScreen() {
  const { t, profile, progress, level, levelProgress, updateProfile, resetAll } = useApp();
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const lang = profile.lang;

  const [editingName, setEditingName] = useState(false);

  // Boîte de confirmation ouverte, et son état d'exécution.
  const [asking, setAsking] = useState<'reset' | 'signout' | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  const accuracy =
    progress.answered > 0
      ? Math.round((progress.correct / progress.answered) * 100)
      : 0;

  const toggleFavorite = (id: string) => {
    const favorites = profile.favorites.includes(id)
      ? profile.favorites.filter((f) => f !== id)
      : [...profile.favorites, id];
    updateProfile({ favorites });
  };

  /**
   * Exécute l'action confirmée.
   *
   * Le résultat est surveillé : si la remise à zéro ou la
   * déconnexion échoue (réseau coupé), l'élève voit un message
   * plutôt qu'un bouton qui ne répond pas.
   */
  const runConfirmed = async () => {
    const action = asking;
    if (!action) return;

    setBusy(true);
    setFailure('');
    try {
      if (action === 'reset') await resetAll();
      else await signOut();
      setAsking(null);
    } catch {
      setFailure(
        lang === 'ht'
          ? 'Aksyon an pa mache. Tcheke koneksyon ou epi eseye ankò.'
          : "L'action n'a pas abouti. Vérifie ta connexion et réessaie.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      {/* ── Identité ────────────────────────────────────────── */}
      <Card night style={{ marginTop: 4 }}>
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={[styles.avatarLetter, { color: '#FFFFFF' }]}>
              {(profile.name.trim()[0] ?? '‧').toUpperCase()}
            </Text>
          </View>

          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                value={profile.name}
                onChangeText={(name) => updateProfile({ name })}
                autoFocus
                onBlur={() => setEditingName(false)}
                onSubmitEditing={() => setEditingName(false)}
                style={styles.nameInput}
                maxLength={20}
              />
              <Pressable
                onPress={() => setEditingName(false)}
                accessibilityRole="button"
                accessibilityLabel={t('common.done')}
              >
                <Icon name="check-circle" size={26} color={colors.sky} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setEditingName(true)}
              style={styles.nameRow}
              accessibilityRole="button"
            >
              <Text style={[type.title, { color: colors.onNight }]}>
                {profile.name || '—'}
              </Text>
              <Icon name="edit" size={14} color={colors.onNightSoft} />
            </Pressable>
          )}

          <Text style={[type.caption, { color: colors.onNightSoft, marginTop: 4 }]}>
            {profile.level || '—'} · {t('home.level')} {level}
          </Text>

          {user?.email && (
            <Text style={[type.caption, { color: colors.onNightSoft, marginTop: 2 }]}>
              {user.email}
            </Text>
          )}

          <View style={styles.identityProgress}>
            <View style={styles.flex}>
              <ProgressBar value={levelProgress} tint={colors.sky} height={6} />
            </View>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: colors.onNight }}>
              {progress.xp} XP
            </Text>
          </View>
        </View>
      </Card>

      {/* ── Statistiques ────────────────────────────────────── */}
      <Section label={t('profile.stats')}>
        <View style={styles.statsRow}>
          <StatTile
            icon="flame"
            value={progress.streak}
            label={t('profile.days')}
            tint={colors.warning}
          />
          <StatTile
            icon="target"
            value={`${accuracy}%`}
            label={t('profile.accuracy')}
            tint={colors.success}
          />
        </View>
        <View style={[styles.statsRow, { marginTop: 10 }]}>
          <StatTile
            icon="book"
            value={progress.studiedCount}
            label={t('profile.studied')}
            tint={colors.sky}
          />
          <StatTile
            icon="award"
            value={progress.quizzesDone}
            label={t('profile.quizzesDone')}
          />
        </View>
      </Section>

      {/* ── Réglages ────────────────────────────────────────── */}
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
                  selected={lang === l}
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

      {/* ── Classe ──────────────────────────────────────────── */}
      <Section label={t('profile.yourClass')}>
        <View style={styles.chipsWrap}>
          {LEVELS.map((lv) => (
            <Chip
              key={lv}
              label={lv}
              selected={profile.level === lv}
              onPress={() => updateProfile({ level: lv })}
            />
          ))}
        </View>
      </Section>

      {/* ── Objectif ────────────────────────────────────────── */}
      <Section label={t('profile.yourGoal')}>
        <View style={styles.chipsWrap}>
          {GOALS.map((g) => (
            <Chip
              key={g}
              label={t(`profile.goal_${g}`)}
              selected={profile.goal === g}
              onPress={() => updateProfile({ goal: g })}
            />
          ))}
        </View>
      </Section>

      {/* ── Matières ────────────────────────────────────────── */}
      <Section label={t('profile.yourSubjects')}>
        <View style={styles.chipsWrap}>
          {SUBJECTS.map((s) => (
            <Chip
              key={s.id}
              icon={s.icon}
              tint={s.color}
              label={s.name[lang]}
              selected={profile.favorites.includes(s.id)}
              onPress={() => toggleFavorite(s.id)}
            />
          ))}
        </View>
      </Section>

      {/* ── À propos ────────────────────────────────────────── */}
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
            {lang === 'ht' ? APP_TAGLINE_HT : APP_TAGLINE_FR}
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

      {/* ── Compte ──────────────────────────────────────────── */}
      <View style={styles.dangerZone}>
        {failure !== '' && (
          <View style={[styles.failure, { backgroundColor: `${colors.danger}18` }]}>
            <Icon name="alert" size={14} color={colors.danger} />
            <Text style={[type.caption, { color: colors.danger, flex: 1 }]}>
              {failure}
            </Text>
          </View>
        )}

        <Pressable
          onPress={() => {
            setFailure('');
            setAsking('reset');
          }}
          accessibilityRole="button"
          style={[styles.outlineBtn, { borderColor: colors.borderStrong }]}
        >
          <Icon name="refresh" size={15} color={colors.textSoft} />
          <Text style={[type.captionMedium, { color: colors.textSoft }]}>
            {t('profile.reset')}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setFailure('');
            setAsking('signout');
          }}
          accessibilityRole="button"
          style={[styles.outlineBtn, { borderColor: colors.danger }]}
        >
          <Icon name="logout" size={15} color={colors.danger} />
          <Text style={[type.captionMedium, { color: colors.danger }]}>
            {t('profile.signOut')}
          </Text>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={asking !== null}
        icon={asking === 'signout' ? 'logout' : 'refresh'}
        destructive
        title={asking === 'signout' ? t('profile.signOut') : t('profile.reset')}
        message={
          asking === 'signout' ? t('profile.signOutConfirm') : t('profile.resetConfirm')
        }
        confirmLabel={asking === 'signout' ? t('profile.signOut') : t('profile.reset')}
        cancelLabel={t('common.cancel')}
        busy={busy}
        onConfirm={runConfirmed}
        onCancel={() => setAsking(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  identity: { alignItems: 'center' },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontFamily: FONTS.extrabold, fontSize: 32 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  nameEditRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontFamily: FONTS.semibold,
    fontSize: 18,
    minWidth: 180,
    textAlign: 'center',
  },
  identityProgress: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },

  statsRow: { flexDirection: 'row', gap: 10 },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingChips: { flexDirection: 'row', gap: 6, flexShrink: 1, flexWrap: 'wrap', justifyContent: 'flex-end' },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  aboutHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  dangerZone: { gap: 10, marginTop: 28 },
  failure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: RADIUS.sm,
  },
  outlineBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: RADIUS.pill,
    paddingVertical: 13,
  },
});
