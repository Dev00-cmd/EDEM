import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  BlocAPropos, BlocMiseAJour, ReglagesCommuns, Section,
} from '@/components/ProfileBlocks';
import { Icon } from '@/components/Icon';
import { StatTile, ProgressBar } from '@/components/Stats';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { ON_ACCENT, RADIUS } from '@/theme/theme';
import { FONTS, type } from '@/theme/typography';
import { SCHOOL_SECTIONS, levelNeedsSection } from '@/data/haiti';
import { LEVELS } from '@/data/levels';
import { SUBJECTS } from '@/data/subjects';
import type { Lang } from '@/i18n';

const GOALS = ['exams', 'grades', 'learn', 'english'];

/** Un bloc de réglages avec son intitulé en capitales. */
export default function ProfileScreen() {
  const { t, profile, progress, level, levelProgress, updateProfile, resetAll, completion,
    vueEleve, basculerVue } =
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
            <Text style={[styles.avatarLetter, { color: colors.accentText }]}>
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
                style={[styles.nameInput, { backgroundColor: colors.surfaceAlt }]}
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
      {completion.total > 0 && profile.role !== 'prof' && (
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

                {/* CE QUI MANQUE, NOMMÉ. Le pourcentage seul laisse
                    chercher : quelqu'un bloqué à 89 % a cru que son
                    école ne s'enregistrait pas, alors qu'il lui
                    manquait la série. Un compteur qui ne dit pas ce
                    qu'il attend envoie chercher au mauvais endroit. */}
                {completion.missing.length > 0 && (
                  <Text style={[type.caption, { color: colors.textSoft, marginTop: 6 }]}>
                    {t('tune.cardMissing', {
                      champs: completion.missing
                        .map((c) => t(`tune.champ_${c}`))
                        .join(', '),
                    })}
                  </Text>
                )}

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
                {t('classes.joinTitle')}
              </Text>
            </View>
            <Icon name="chevron-right" size={16} color={colors.textFaint} />
          </View>
        </Card>
      </Section>

      {/* ── Le point de vue, pour un compte professeur ───────
          Son compte EST resté un compte d'élève : il garde son
          profil, ses XP et M. Thomas. La bascule lui rend les
          onglets de l'élève, et le chemin du retour. Ce n'est pas
          un changement de rôle — le rôle vit en base, et le serveur
          seul en décide. */}
      {profile.role === 'prof' && (
        <Section label={t('prof.vueTitre')}>
          <Card onPress={() => basculerVue(!vueEleve)}>
            <View style={styles.settingLeft}>
              <Icon
                name={vueEleve ? 'user' : 'landmark'}
                size={18}
                color={colors.accent}
              />
              <View style={{ flex: 1 }}>
                <Text style={[type.bodyMedium, { color: colors.text }]}>
                  {vueEleve ? t('prof.vueRevenirProf') : t('prof.vueVoirEleve')}
                </Text>
                <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
                  {vueEleve ? t('prof.vueRevenirSub') : t('prof.vueVoirSub')}
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.textFaint} />
            </View>
          </Card>
        </Section>
      )}

      {/* ── Professeur ───────────────────────────────────────
          RIEN POUR UN ÉLÈVE, et ce n'est pas du rangement.

          Depuis que la déclaration est instantanée, ce bouton
          proposait à chaque élève de se déclarer professeur et
          d'ouvrir une salle. Un adolescent de 14 ans obtenait en
          trois champs une pièce où faire entrer d'autres mineurs,
          sans qu'aucun adulte y soit — c'est exactement la chose
          contre laquelle tout le reste est construit.

          Le choix se fait maintenant à l'inscription, sur un écran
          qui le pose franchement. Un élève ne voit ici que sa
          classe, et il n'y entre que par le code de son professeur.

          Pour un professeur, la carte reste : elle confirme son
          statut et mène à sa déclaration — SAUF s'il regarde en
          « vue élève ». Une vue élève qui laisse traîner les cartes
          du professeur ne montre pas ce que voit un élève, et c'est
          pourtant la seule chose qu'on lui demande. Le bouton de
          bascule, lui, reste : c'est le chemin du retour. */}
      {profile.role === 'prof' && !vueEleve && (
        <Section label={t('teacher.title')}>
          <Card onPress={() => router.push('/teacher-request')}>
            <View style={styles.settingLeft}>
              <Icon name="check-circle" size={18} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[type.bodyMedium, { color: colors.text }]}>
                  {t('teacher.alreadyTitle')}
                </Text>
                <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
                  {t('teacher.alreadySub')}
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.textFaint} />
            </View>
          </Card>
        </Section>
      )}

      {/* ── Réglages ────────────────────────────────────────── */}
      <ReglagesCommuns />

      {/* ── Classe ──────────────────────────────────────────── */}
      <Section label={t('profile.yourClass')}>
        <View style={styles.chipsWrap}>
          {LEVELS.map((lv) => (
            <Chip
              key={lv}
              label={lv}
              selected={profile.level === lv}
              onPress={() =>
                updateProfile({
                  level: lv,
                  // Une série qui ne s'applique plus au nouveau
                  // niveau ne doit pas rester accrochée au profil.
                  section: levelNeedsSection(lv) ? profile.section : null,
                })
              }
            />
          ))}
        </View>
      </Section>

      {/* ── Série ───────────────────────────────────────────────
          Elle n'était demandée qu'à l'inscription. Résultat : un
          élève inscrit avant que le champ existe, ou qui change de
          classe pour le NS3/NS4 depuis cet écran, ne pouvait plus
          jamais la renseigner — et sa complétion plafonnait à 89 %
          sans qu'aucun écran ne lui dise pourquoi.

          Elle vit ici, juste sous la classe, parce que c'est ici que
          la classe change. */}
      {levelNeedsSection(profile.level) && (
        <Section label={t('profile.yourSection')}>
          <View style={styles.chipsWrap}>
            {SCHOOL_SECTIONS.map((sec) => (
              <Chip
                key={sec.id}
                label={lang === 'ht' ? sec.labelHt : sec.labelFr}
                selected={profile.section === sec.id}
                onPress={() =>
                  updateProfile({
                    section: profile.section === sec.id ? null : sec.id,
                  })
                }
              />
            ))}
          </View>
        </Section>
      )}

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
      <BlocAPropos />

      {/* ── Mises à jour ────────────────────────────────────── */}
      <BlocMiseAJour />

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
    color: ON_ACCENT,
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

  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingChips: { flexDirection: 'row', gap: 6, flexShrink: 1, flexWrap: 'wrap', justifyContent: 'flex-end' },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

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
