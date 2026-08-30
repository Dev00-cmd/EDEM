// ═══════════════════════════════════════════════════════════════
//  MOMENT 2 — « Personnalise ton tuteur »
//
//  Apparaît APRÈS la première vraie utilisation, jamais avant.
//  Entièrement sautable, aucun champ obligatoire.
//
//  RÈGLE APPLIQUÉE À CHAQUE QUESTION : on affiche à l'élève, en
//  une phrase, à quoi sert sa réponse. Si on ne sait pas écrire
//  cette phrase, on ne pose pas la question. Et un élève qui ne
//  comprend pas pourquoi on demande répond au hasard — une réponse
//  au hasard vaut moins que pas de réponse du tout.
//
//  Un cas honnête à signaler : l'école et la commune ne servent
//  PAS au tuteur. Elles ne sont jamais envoyées au modèle. Leur
//  raison d'être est le rattachement à la classe que le professeur
//  ouvrira. C'est exactement ce qui est écrit à l'élève.
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Input } from '@/components/Input';
import { Icon, type IconName } from '@/components/Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { useKeyboard } from '@/theme/useKeyboard';
import { RADIUS } from '@/theme/colors';
import { type } from '@/theme/typography';
import { SUBJECTS } from '@/data/subjects';
import { DEPARTEMENTS, communesOf, communeById, departementOf } from '@/data/haiti';
import { searchSchools, proposeSchool, MIN_QUERY, type School } from '@/lib/schools';

const GOALS: { id: string; icon: IconName }[] = [
  { id: 'exams', icon: 'award' },
  { id: 'grades', icon: 'chart' },
  { id: 'catchup', icon: 'refresh' },
  { id: 'learn', icon: 'bulb' },
];

const MINUTES = [15, 30, 60, 120];

/**
 * Années proposées pour l'examen visé.
 *
 * L'année scolaire haïtienne se termine en juin-juillet : passé
 * août, l'examen le plus proche est celui de l'année suivante.
 */
function examYears(): number[] {
  const now = new Date();
  const first = now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear();
  return [first, first + 1, first + 2];
}

/** Un bloc de question, avec la phrase qui le justifie. */
function Question({
  title,
  why,
  children,
}: {
  title: string;
  why: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.block}>
      <Text style={[type.title, { color: colors.text }]}>{title}</Text>
      <View style={styles.whyRow}>
        <Icon name="info" size={12} color={colors.accent} />
        <Text style={[type.caption, { color: colors.textFaint, flex: 1 }]}>{why}</Text>
      </View>
      {children}
    </View>
  );
}

export default function TuneProfile() {
  const { t, profile, updateProfile, completion, refreshCompletion, dismissTune } = useApp();
  const { colors } = useTheme();
  const keyboard = useKeyboard();
  const router = useRouter();

  const lang = profile.lang;

  // ── École ───────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<School[]>([]);
  const [searching, setSearching] = useState(false);
  const [manual, setManual] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [schoolError, setSchoolError] = useState('');
  const [chosen, setChosen] = useState<School | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Département ouvert dans le sélecteur de commune. */
  const [dep, setDep] = useState<string | null>(null);
  /** XP versés par le serveur, une fois le profil complet. */
  const [bonus, setBonus] = useState(0);

  const commune = communeById(profile.communeId);
  const departement = departementOf(profile.communeId);

  // Recherche différée : on n'interroge le serveur qu'une fois que
  // l'élève a fini de taper. Une requête par lettre, ce sont dix
  // allers-retours payés par lui pour un seul résultat utile.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < MIN_QUERY) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const found = await searchSchools(query, profile.communeId);
      setResults(found);
      setSearching(false);
    }, 450);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, profile.communeId]);

  const pickSchool = (school: School) => {
    setChosen(school);
    setQuery('');
    setResults([]);
    updateProfile({ schoolId: school.id, communeId: school.commune_id });
  };

  const addSchool = useCallback(async () => {
    if (!profile.communeId) {
      setSchoolError(t('tune.communeFirst'));
      return;
    }
    if (schoolName.trim().length < 3) {
      setSchoolError(t('tune.schoolTooShort'));
      return;
    }
    setSchoolError('');
    const { school, error } = await proposeSchool(schoolName, profile.communeId);
    if (error || !school) {
      setSchoolError(t('tune.schoolFailed'));
      return;
    }
    setManual(false);
    setSchoolName('');
    pickSchool(school);
  }, [profile.communeId, schoolName, t]);

  // ── Matières ────────────────────────────────────────────────
  const toggleFavorite = (id: string) => {
    const favorites = profile.favorites.includes(id)
      ? profile.favorites.filter((f) => f !== id)
      : [...profile.favorites, id];
    // Une matière retirée du parcours ne peut pas rester dans les
    // matières difficiles : l'élève ne la travaillerait plus.
    updateProfile({
      favorites,
      weakSubjects: profile.weakSubjects.filter((w) => favorites.includes(w)),
    });
  };

  const toggleWeak = (id: string) => {
    const already = profile.weakSubjects.includes(id);
    if (!already && profile.weakSubjects.length >= 5) return;
    updateProfile({
      weakSubjects: already
        ? profile.weakSubjects.filter((w) => w !== id)
        : [...profile.weakSubjects, id],
    });
  };

  const finish = async () => {
    const result = await refreshCompletion();
    if (result.bonus > 0) {
      // Le bonus est versé par le serveur : on le montre, on ne le
      // calcule pas.
      setBonus(result.bonus);
      return;
    }
    router.replace('/(tabs)');
  };

  const later = () => {
    dismissTune();
    router.replace('/(tabs)');
  };

  // ── Écran de félicitations, après le bonus ──────────────────
  if (bonus > 0) {
    return (
      <Screen>
        <View style={styles.done}>
          <View style={[styles.doneIcon, { backgroundColor: colors.accent }]}>
            <Icon name="check-circle" size={34} color="#FFFFFF" />
          </View>
          <Text style={[type.display, { color: colors.text, textAlign: 'center' }]}>
            {t('tune.doneTitle')}
          </Text>
          <Text
            style={[type.body, { color: colors.textSoft, textAlign: 'center', marginTop: 10 }]}
          >
            {t('tune.doneSub', { xp: String(bonus) })}
          </Text>
          <Button
            label={t('common.letsGo')}
            icon="arrow-right"
            iconRight
            full
            style={{ marginTop: 28 }}
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 60 + keyboard.height }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ══ En-tête et progression ═════════════════════════ */}
        <Text style={[type.eyebrow, { color: colors.accent }]}>
          {t('tune.eyebrow')}
        </Text>
        <Text style={[type.display, { color: colors.text, marginTop: 6 }]}>
          {t('tune.title')}
        </Text>
        <Text style={[type.body, { color: colors.textSoft, marginTop: 8 }]}>
          {t('tune.subtitle')}
        </Text>

        <View style={styles.barRow}>
          <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
            <View
              style={[
                styles.barFill,
                { backgroundColor: colors.accent, width: `${completion.pct}%` },
              ]}
            />
          </View>
          <Text style={[type.captionMedium, { color: colors.textSoft }]}>
            {completion.pct}%
          </Text>
        </View>

        {/* ══ Ce que les autres voient ═══════════════════════ */}
        {/* Cinq lignes, pas une politique de confidentialité. */}
        <Card style={styles.privacy}>
          <View style={styles.row6}>
            <Icon name="shield" size={13} color={colors.accent} />
            <Text style={[type.eyebrow, { color: colors.accent }]}>
              {t('tune.privacyTitle')}
            </Text>
          </View>
          <Text style={[type.caption, { color: colors.textSoft, marginTop: 8 }]}>
            {t('tune.privacyVisible')}
          </Text>
          <Text style={[type.caption, { color: colors.textSoft, marginTop: 6 }]}>
            {t('tune.privacyHidden')}
          </Text>
          <Text style={[type.caption, { color: colors.textFaint, marginTop: 6 }]}>
            {t('tune.privacyAlias')}
          </Text>
        </Card>

        {/* ══ Commune ════════════════════════════════════════ */}
        <Question title={t('tune.communeTitle')} why={t('tune.communeWhy')}>
          {!profile.communeId ? (
            <>
              <Text style={[type.caption, { color: colors.textFaint, marginTop: 10 }]}>
                {t('tune.departementLabel')}
              </Text>
              <View style={styles.chips}>
                {DEPARTEMENTS.map((d) => (
                  <Chip
                    key={d.id}
                    small
                    label={d.name}
                    selected={dep === d.id}
                    onPress={() => setDep(dep === d.id ? null : d.id)}
                  />
                ))}
              </View>

              {dep && (
                <View style={styles.chips}>
                  {communesOf(dep).map((c) => (
                    <Chip
                      key={c.id}
                      small
                      label={c.name}
                      selected={profile.communeId === c.id}
                      onPress={() => updateProfile({ communeId: c.id })}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <Pressable
              onPress={() => updateProfile({ communeId: null, schoolId: null })}
              style={[styles.picked, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Icon name="globe" size={14} color={colors.accent} />
              <Text style={[type.captionMedium, { color: colors.text, flex: 1 }]}>
                {commune?.name} · {departement?.name}
              </Text>
              <Text style={[type.caption, { color: colors.textFaint }]}>
                {t('common.change')}
              </Text>
            </Pressable>
          )}
        </Question>

        {/* ══ École ══════════════════════════════════════════ */}
        <Question title={t('tune.schoolTitle')} why={t('tune.schoolWhy')}>
          {profile.schoolId && chosen ? (
            <Pressable
              onPress={() => {
                setChosen(null);
                updateProfile({ schoolId: null });
              }}
              style={[styles.picked, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Icon name="landmark" size={14} color={colors.accent} />
              <Text style={[type.captionMedium, { color: colors.text, flex: 1 }]}>
                {chosen.name}
              </Text>
              <Text style={[type.caption, { color: colors.textFaint }]}>
                {t('common.change')}
              </Text>
            </Pressable>
          ) : manual ? (
            <View style={styles.manual}>
              <Input
                label={t('tune.schoolNameLabel')}
                placeholder={t('tune.schoolNamePlaceholder')}
                value={schoolName}
                onChangeText={setSchoolName}
                error={schoolError}
                autoCapitalize="words"
              />
              <View style={styles.manualRow}>
                <Button
                  label={t('common.cancel')}
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setManual(false);
                    setSchoolError('');
                  }}
                />
                <View style={styles.flex} />
                <Button label={t('tune.schoolAdd')} size="sm" onPress={addSchool} />
              </View>
            </View>
          ) : (
            <>
              <Input
                placeholder={t('tune.schoolSearchPlaceholder')}
                icon="search"
                value={query}
                onChangeText={setQuery}
                autoCapitalize="words"
              />

              {searching && (
                <View style={styles.searching}>
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              )}

              {results.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => pickSchool(s)}
                  style={[styles.result, { borderColor: colors.border }]}
                >
                  <Text style={[type.captionMedium, { color: colors.text }]}>{s.name}</Text>
                  <Text style={[type.caption, { color: colors.textFaint }]}>
                    {s.commune} · {s.departement}
                  </Text>
                </Pressable>
              ))}

              {query.trim().length >= MIN_QUERY && !searching && results.length === 0 && (
                <Text style={[type.caption, { color: colors.textFaint, marginTop: 10 }]}>
                  {t('tune.schoolNoResult')}
                </Text>
              )}

              <Pressable onPress={() => setManual(true)} style={styles.addRow}>
                <Icon name="plus" size={13} color={colors.accent} />
                <Text style={[type.captionMedium, { color: colors.accent }]}>
                  {t('tune.schoolMissing')}
                </Text>
              </Pressable>
            </>
          )}
        </Question>

        {/* ══ Matières travaillées ═══════════════════════════ */}
        <Question title={t('tune.subjectsTitle')} why={t('tune.subjectsWhy')}>
          <View style={styles.chips}>
            {SUBJECTS.map((s) => (
              <Chip
                key={s.id}
                label={s.name[lang]}
                icon={s.icon}
                tint={s.color}
                selected={profile.favorites.includes(s.id)}
                onPress={() => toggleFavorite(s.id)}
              />
            ))}
          </View>
        </Question>

        {/* ══ Matières difficiles ════════════════════════════ */}
        {/* Uniquement parmi celles qu'il travaille : lui proposer
            une matière qu'il n'a pas choisie n'aurait pas de sens. */}
        {profile.favorites.length > 0 && (
          <Question title={t('tune.weakTitle')} why={t('tune.weakWhy')}>
            <View style={styles.chips}>
              {SUBJECTS.filter((s) => profile.favorites.includes(s.id)).map((s) => (
                <Chip
                  key={s.id}
                  label={s.name[lang]}
                  icon={s.icon}
                  tint={colors.danger}
                  selected={profile.weakSubjects.includes(s.id)}
                  onPress={() => toggleWeak(s.id)}
                />
              ))}
            </View>
          </Question>
        )}

        {/* ══ Objectif ═══════════════════════════════════════ */}
        <Question title={t('tune.goalTitle')} why={t('tune.goalWhy')}>
          <View style={styles.goals}>
            {GOALS.map((g) => {
              const selected = profile.goal === g.id;
              return (
                <Pressable
                  key={g.id}
                  onPress={() =>
                    updateProfile({
                      goal: selected ? '' : g.id,
                      // Changer d'objectif fait tomber l'année :
                      // elle ne veut plus rien dire hors examens.
                      examYear: g.id === 'exams' ? profile.examYear : null,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.goalCard,
                    {
                      backgroundColor: selected ? colors.accent : colors.surface,
                      borderColor: selected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Icon name={g.icon} size={18} color={selected ? '#FFFFFF' : colors.textSoft} />
                  <Text
                    style={[type.captionMedium, { color: selected ? '#FFFFFF' : colors.text }]}
                  >
                    {t(`onboarding.goal_${g.id}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Question>

        {/* ══ Année d'examen — seulement si l'objectif l'est ══ */}
        {profile.goal === 'exams' && (
          <Question title={t('tune.examYearTitle')} why={t('tune.examYearWhy')}>
            <View style={styles.chips}>
              {examYears().map((y) => (
                <Chip
                  key={y}
                  label={String(y)}
                  selected={profile.examYear === y}
                  onPress={() =>
                    updateProfile({ examYear: profile.examYear === y ? null : y })
                  }
                />
              ))}
            </View>
          </Question>
        )}

        {/* ══ Temps disponible ═══════════════════════════════ */}
        <Question title={t('tune.minutesTitle')} why={t('tune.minutesWhy')}>
          <View style={styles.chips}>
            {MINUTES.map((m) => (
              <Chip
                key={m}
                label={t(`tune.minutes_${m}`)}
                selected={profile.studyMinutes === m}
                onPress={() =>
                  updateProfile({ studyMinutes: profile.studyMinutes === m ? null : m })
                }
              />
            ))}
          </View>
        </Question>

        {/* ══ Sortie ═════════════════════════════════════════ */}
        <Button
          label={t('tune.finish')}
          icon="check"
          full
          style={{ marginTop: 30 }}
          onPress={finish}
        />
        <Pressable onPress={later} style={styles.later} accessibilityRole="button">
          <Text style={[type.captionMedium, { color: colors.textFaint }]}>
            {t('tune.later')}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 14 },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  barTrack: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },

  privacy: { marginTop: 20 },
  row6: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  block: { marginTop: 30 },
  whyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },

  picked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginTop: 12,
  },

  manual: { marginTop: 12, gap: 12 },
  manualRow: { flexDirection: 'row', alignItems: 'center' },

  searching: { paddingVertical: 14, alignItems: 'center' },
  result: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 8,
    gap: 2,
  },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },

  goals: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  goalCard: {
    width: '47.5%',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
  },

  later: { alignItems: 'center', paddingVertical: 18 },

  done: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  doneIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
});
