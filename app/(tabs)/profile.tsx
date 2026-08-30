import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
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
  const { t, profile, progress, level, levelProgress, updateProfile, resetAll, completion } =
    useApp();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const lang = profile.lang;

  // Le pseudonyme s'édite localement et ne part qu'à la sortie du
  // champ : écrire en base à chaque lettre tapée enverrait une
  // requête par frappe, coûteux sur un réseau haïtien.
  const [alias, setAlias] = useState(profile.boardAlias);
  const saveAlias = () => {
    const clean = alias.trim();
    // La base refuse un pseudonyme d'une seule lettre.
    if (clean.length === 1) {
      setAlias(profile.boardAlias);
      return;
    }
    if (clean !== profile.boardAlias) updateProfile({ boardAlias: clean });
  };

  const [editingName, setEditingName] = useState(false);

  // Boîte de confirmation ouverte, et son état d'exécution.
  const [asking, setAsking] = useState<'reset' | 'signout' | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  // ── Mises à jour à distance ─────────────────────────────────
  type UpdateState = 'idle' | 'checking' | 'downloading' | 'uptodate' | 'error';
  const [updateState, setUpdateState] = useState<UpdateState>('idle');
  const [updateError, setUpdateError] = useState('');

  /**
   * Cherche, télécharge et applique une mise à jour à distance.
   *
   * Sans ce bouton, l'élève doit fermer et rouvrir l'app deux fois
   * en espérant que ça se fasse — et personne ne sait dire si ça a
   * marché. Ici, chaque étape est visible et l'app redémarre d'elle
   * même sur la nouvelle version.
   */
  const checkUpdate = async () => {
    setUpdateError('');

    if (!Updates.isEnabled) {
      setUpdateState('error');
      setUpdateError(t('profile.updateUnavailable'));
      return;
    }

    setUpdateState('checking');
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        setUpdateState('uptodate');
        return;
      }
      setUpdateState('downloading');
      await Updates.fetchUpdateAsync();
      // Redémarre immédiatement sur la nouvelle version.
      await Updates.reloadAsync();
    } catch (e) {
      setUpdateState('error');
      setUpdateError(e instanceof Error ? e.message : String(e));
    }
  };

  const updateLabel =
    updateState === 'checking'
      ? t('profile.updateChecking')
      : updateState === 'downloading'
        ? t('profile.updateDownloading')
        : updateState === 'uptodate'
          ? t('profile.updateNone')
          : updateState === 'error'
            ? updateError.slice(0, 90)
            : t('profile.updateHint');

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

      {/* ── Complétion du profil ────────────────────────────── */}
      {/* L'écran « Personnalise ton tuteur » est sautable. Sans
          ce point d'entrée, « Plus tard » voudrait dire « jamais » :
          l'élève n'aurait aucun moyen d'y revenir. */}
      {completion.total > 0 && (
        <Section label={t('profile.tuning')}>
          <Card onPress={completion.completed ? undefined : () => router.push('/tune-profile')}>
            {completion.completed ? (
              <View style={styles.settingLeft}>
                <Icon name="check-circle" size={18} color={colors.accent} />
                <Text style={[type.bodyMedium, { color: colors.text, flex: 1 }]}>
                  {t('tune.cardDone')}
                </Text>
              </View>
            ) : (
              <>
                <Text style={[type.cardTitle, { color: colors.text }]}>
                  {t('tune.cardTitle', { pct: String(completion.pct) })}
                </Text>
                <Text style={[type.caption, { color: colors.textFaint, marginTop: 6 }]}>
                  {t('tune.cardSub')}
                </Text>
                <View style={{ marginTop: 12 }}>
                  <ProgressBar value={completion.pct / 100} />
                </View>
                <View style={[styles.settingLeft, { marginTop: 12 }]}>
                  <Icon name="arrow-right" size={14} color={colors.accent} />
                  <Text style={[type.captionMedium, { color: colors.accent }]}>
                    {t('tune.cardOpen')}
                  </Text>
                </View>
              </>
            )}
          </Card>
        </Section>
      )}

      {/* ── Mes classes ─────────────────────────────────────── */}
      {/* Point d'entrée volontairement dans le profil et pas dans
          la barre d'onglets : tant qu'aucune classe n'existe, un
          onglet vide accueillerait tout le monde. Il deviendra un
          onglet quand de vraies classes tourneront. */}
      <Section label={t('classes.title')}>
        <Card onPress={() => router.push('/classes')}>
          <View style={styles.settingLeft}>
            <Icon name="path" size={18} color={colors.textSoft} />
            <View style={{ flex: 1 }}>
              <Text style={[type.bodyMedium, { color: colors.text }]}>
                {t('classes.title')}
              </Text>
              <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
                {profile.role === 'prof' ? t('classes.create') : t('classes.joinTitle')}
              </Text>
            </View>
            <Icon name="chevron-right" size={16} color={colors.textFaint} />
          </View>
        </Card>
      </Section>

      {/* ── Professeur ──────────────────────────────────────── */}
      {/* Sans point d'entrée, la demande de rôle serait
          injoignable : la RPC existerait sans que personne ne
          puisse l'appeler. */}
      <Section label={t('teacher.title')}>
        <Card onPress={() => router.push('/teacher-request')}>
          <View style={styles.settingLeft}>
            <Icon
              name={profile.role === 'prof' ? 'check-circle' : 'user'}
              size={18}
              color={profile.role === 'prof' ? colors.accent : colors.textSoft}
            />
            <View style={{ flex: 1 }}>
              <Text style={[type.bodyMedium, { color: colors.text }]}>
                {profile.role === 'prof' ? t('teacher.alreadyTitle') : t('teacher.cta')}
              </Text>
              <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
                {profile.role === 'prof' ? t('teacher.alreadySub') : t('teacher.ctaSub')}
              </Text>
            </View>
            <Icon name="chevron-right" size={16} color={colors.textFaint} />
          </View>
        </Card>
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

      {/* ── Classement : ce que les autres voient ───────────── */}
      <Section label={t('profile.boardPrivacy')}>
        <Card>
          <Text style={[type.caption, { color: colors.textSoft }]}>
            {t('profile.boardPrivacyHint')}
          </Text>

          <View style={styles.boardRow}>
            <View style={styles.settingLeft}>
              <Icon name="award" size={18} color={colors.textSoft} />
              <Text style={[type.bodyMedium, { color: colors.text }]}>
                {t('profile.boardVisible')}
              </Text>
            </View>
            <View style={styles.settingChips}>
              <Chip
                small
                label={t('common.yes')}
                selected={profile.boardVisible}
                onPress={() => updateProfile({ boardVisible: true })}
              />
              <Chip
                small
                label={t('common.no')}
                selected={!profile.boardVisible}
                onPress={() => updateProfile({ boardVisible: false })}
              />
            </View>
          </View>

          <Text style={[type.caption, styles.boardLabel, { color: colors.textFaint }]}>
            {t('profile.boardAlias')}
          </Text>
          <TextInput
            value={alias}
            onChangeText={setAlias}
            onBlur={saveAlias}
            placeholder={profile.name || t('profile.boardAliasPlaceholder')}
            placeholderTextColor={colors.textFaint}
            maxLength={24}
            autoCapitalize="none"
            style={[
              styles.aliasInput,
              {
                color: colors.text,
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
              },
            ]}
          />
          <Text style={[type.caption, { color: colors.textFaint, marginTop: 6 }]}>
            {t('profile.boardAliasHint')}
          </Text>
        </Card>
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

      {/* ── Mises à jour ────────────────────────────────────── */}
      <Section label={t('profile.updates')}>
        <Card>
          <Pressable
            onPress={checkUpdate}
            disabled={updateState === 'checking' || updateState === 'downloading'}
            accessibilityRole="button"
            style={styles.updateRow}
          >
            <View style={[styles.updateIcon, { backgroundColor: colors.accentSoft }]}>
              {updateState === 'checking' || updateState === 'downloading' ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Icon
                  name={updateState === 'uptodate' ? 'check-circle' : 'refresh'}
                  size={18}
                  color={updateState === 'error' ? colors.danger : colors.accent}
                />
              )}
            </View>

            <View style={styles.flex}>
              <Text style={[type.bodyMedium, { color: colors.text }]}>
                {t('profile.checkUpdate')}
              </Text>
              <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
                {updateLabel}
              </Text>
            </View>

            {updateState === 'idle' && (
              <Icon name="chevron-right" size={16} color={colors.textFaint} />
            )}
          </Pressable>

          {/* Ces identifiants servent au diagnostic : ils disent
              exactement quelle version tourne sur l'appareil. */}
          <View style={[styles.updateMeta, { borderTopColor: colors.border }]}>
            <Text style={[type.caption, { color: colors.textFaint }]}>
              {t('profile.channel')} : {Updates.channel ?? '—'} · {t('profile.runtime')}{' '}
              : {Updates.runtimeVersion ?? '—'}
            </Text>
            <Text style={[type.caption, { color: colors.textFaint }]} numberOfLines={1}>
              {t('profile.build')} :{' '}
              {Updates.updateId ? Updates.updateId.slice(0, 8) : t('profile.embedded')}
            </Text>
          </View>
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
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  boardLabel: { marginTop: 16, marginBottom: 6 },
  aliasInput: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
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

  updateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  updateIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateMeta: {
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },

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
