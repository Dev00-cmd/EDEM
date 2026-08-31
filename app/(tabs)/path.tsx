import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, SectionHeader, EmptyState } from '@/components/Card';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ProgressBar, MasteryRing, Sparkline, StatTile } from '@/components/Stats';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/theme';
import { useResponsive, MAX_CONTENT_WIDTH } from '@/theme/responsive';
import { FONTS, type } from '@/theme/typography';
import { buildPlan, coachNote, isItemDone, masteryOf, planSubjects } from '@/ai/plan';
import { getSubject } from '@/data/subjects';
import { BAND_LABEL, bandOfLevel } from '@/data/curriculum';

/** Étiquettes courtes des 7 derniers jours, pour l'axe du graphique. */
const DAY_LETTERS: Record<string, string[]> = {
  fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  ht: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
};

export default function PathScreen() {
  const router = useRouter();
  const { t, profile, progress, activity, level, levelProgress, syncing, refresh } =
    useApp();
  const { colors } = useTheme();
  const { width, gutter } = useResponsive();
  const lang = profile.lang;

  const plan = useMemo(() => buildPlan(profile), [profile]);
  // Les matières ne sont plus demandées à l'inscription : le
  // parcours part sur des matières de repli tant que l'élève
  // n'a pas choisi les siennes. Le bloquer ici lui montrerait un
  // écran vide sans qu'il sache quoi faire.
  const ready = profile.level !== '';
  const subjects = planSubjects(profile);

  const doneCount = plan.filter((i) => isItemDone(progress, i)).length;
  const overall = plan.length > 0 ? doneCount / plan.length : 0;

  const accuracy =
    progress.answered > 0
      ? Math.round((progress.correct / progress.answered) * 100)
      : 0;

  // Les 7 derniers jours, trous compris : un jour sans activité
  // doit apparaître à zéro, sinon la courbe ment.
  const weekXp = useMemo(() => {
    const byDay = new Map(activity.map((a) => [a.day, a.xp]));
    const out: { label: string; xp: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
      // getDay() : 0 = dimanche → on ramène lundi en tête
      const idx = (d.getDay() + 6) % 7;
      out.push({ label: DAY_LETTERS[lang][idx], xp: byDay.get(key) ?? 0 });
    }
    return out;
  }, [activity, lang]);

  // Largeur du graphique = largeur utile de l'écran moins les
  // marges de l'écran et le padding de la carte. Calculée à chaque
  // rendu : elle suit la rotation et l'écran partagé.
  const usableWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const chartWidth = Math.max(200, usableWidth - gutter * 2 - 32);
  const weekTotal = weekXp.reduce((s, d) => s + d.xp, 0);

  return (
    <Screen onRefresh={refresh} refreshing={syncing}>
      <Text style={[type.display, { color: colors.text, marginTop: 4 }]}>
        {t('path.title')}
      </Text>
      <Text style={[type.caption, { color: colors.textSoft, marginTop: 2 }]}>
        {ready
          ? t('path.subtitle', { name: profile.name || '—', level: profile.level })
          : t('path.empty')}
      </Text>

      {!ready ? (
        <Card style={{ marginTop: 20 }}>
          <EmptyState icon="path" title={t('path.title')} message={t('path.empty')} />
          <Button
            label={t('path.emptyCta')}
            icon="settings"
            onPress={() => router.push('/(tabs)/profile')}
            full
          />
        </Card>
      ) : (
        <>
          {/* ── Note du coach ───────────────────────────────── */}
          <Card night style={{ marginTop: 18 }}>
            <View style={styles.coachHead}>
              <Icon name="sparkles" size={13} color={colors.sky} />
              <Text style={[type.eyebrow, { color: colors.sky }]}>
                {t('path.coachTitle')}
              </Text>
            </View>
            <Text style={[type.body, { color: colors.onNight, marginTop: 9 }]}>
              {coachNote(profile, progress)}
            </Text>
            <View style={styles.coachProgress}>
              <View style={styles.flex}>
                <ProgressBar value={overall} tint={colors.sky} height={6} />
              </View>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: colors.onNight }}>
                {Math.round(overall * 100)}%
              </Text>
            </View>
          </Card>

          {/* ── Statistiques ────────────────────────────────── */}
          <SectionHeader dash title={t('path.statsTitle')} style={styles.section} />

          <Card>
            <View style={styles.chartHead}>
              <View style={styles.flex}>
                <Text style={[type.caption, { color: colors.textFaint }]}>
                  {t('path.weekXp')}
                </Text>
                <Text style={[type.stat, { color: colors.text }]}>{weekTotal} XP</Text>
              </View>
              <MasteryRing value={levelProgress * 100} size={52} label={`${level}`} />
            </View>

            <Sparkline points={weekXp.map((d) => d.xp)} width={chartWidth} height={68} />

            <View style={[styles.axis, { width: chartWidth }]}>
              {weekXp.map((d, i) => (
                <Text
                  key={i}
                  style={[type.caption, { color: colors.textFaint, fontSize: 11 }]}
                >
                  {d.label}
                </Text>
              ))}
            </View>
          </Card>

          <View style={styles.statsRow}>
            <StatTile
              icon="flame"
              value={progress.streak}
              label={t('path.streakDays')}
              tint={colors.warning}
            />
            <StatTile
              icon="target"
              value={`${accuracy}%`}
              label={t('home.accuracy')}
              tint={colors.success}
            />
            <StatTile
              icon="award"
              value={progress.quizzesDone}
              label={t('path.quizzesDone')}
              tint={colors.sky}
            />
          </View>

          {/* ── Parcours par matière ────────────────────────── */}
          <SectionHeader
            dash
            title={t('path.bySubject')}
            subtitle={t('path.tapToLearn')}
            style={styles.section}
          />

          {subjects.map((subjectId) => {
            const subject = getSubject(subjectId);
            const items = plan.filter((i) => i.subjectId === subjectId);
            const mastery = masteryOf(progress, subjectId, profile.level);

            return (
              <View key={subjectId} style={styles.subjectBlock}>
                <View style={styles.subjectHead}>
                  <View style={[styles.subjectIcon, { backgroundColor: subject.color }]}>
                    <Icon name={subject.icon} size={16} color={colors.accentText} />
                  </View>
                  <Text style={[type.cardTitle, { color: colors.text, flex: 1 }]}>
                    {subject.name[lang]}
                  </Text>
                  <Text
                    style={{
                      fontFamily: FONTS.bold,
                      fontSize: 13,
                      color: mastery > 0 ? subject.color : colors.textFaint,
                    }}
                  >
                    {mastery}%
                  </Text>
                </View>

                <ProgressBar value={mastery / 100} tint={subject.color} height={5} />

                <Card flush style={styles.listCard}>
                  {items.map((item, idx) => {
                    const done = isItemDone(progress, item);
                    const isLast = idx === items.length - 1;

                    const onPress = () =>
                      item.kind === 'learn'
                        ? router.push({
                            pathname: '/(tabs)/chat',
                            params: {
                              subject: item.subjectId,
                              planTopic: item.topicId ?? '',
                              prefill:
                                lang === 'ht'
                                  ? `Esplike m « ${item.title.ht} » pou yon elèv ${profile.level}.`
                                  : `Explique-moi « ${item.title.fr} » pour un élève de ${profile.level}.`,
                            },
                          })
                        : router.push({
                            pathname: '/(tabs)/quiz',
                            params: { subject: item.subjectId },
                          });

                    return (
                      <Pressable
                        key={item.id}
                        onPress={onPress}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                          styles.itemRow,
                          pressed && { backgroundColor: colors.surfaceAlt },
                          !isLast && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: colors.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.checkDot,
                            {
                              backgroundColor: done ? colors.success : 'transparent',
                              borderColor: done ? colors.success : colors.border,
                            },
                          ]}
                        >
                          {done ? (
                            <Icon name="check" size={12} color={colors.accentText} strokeWidth={2.6} />
                          ) : (
                            <View
                              style={[styles.innerDot, { backgroundColor: subject.color }]}
                            />
                          )}
                        </View>

                        <View style={styles.flex}>
                          <Text
                            style={[
                              type.bodyMedium,
                              { color: done ? colors.textFaint : colors.text },
                              done && styles.itemDone,
                            ]}
                            numberOfLines={1}
                          >
                            {item.title[lang]}
                          </Text>
                          <Text style={[type.caption, { color: colors.textFaint }]}>
                            {item.kind === 'learn' ? t('path.learn') : t('path.practice')}
                          </Text>
                        </View>

                        <Icon name="chevron-right" size={15} color={colors.textFaint} />
                      </Pressable>
                    );
                  })}
                </Card>
              </View>
            );
          })}

          <Text style={[type.caption, styles.bandNote, { color: colors.textFaint }]}>
            {BAND_LABEL[bandOfLevel(profile.level)][lang]}
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  coachHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coachProgress: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },

  section: { marginTop: 22, marginBottom: 10 },

  chartHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },

  statsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },

  subjectBlock: { marginBottom: 22 },
  subjectHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  subjectIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listCard: { marginTop: 10 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  innerDot: { width: 7, height: 7, borderRadius: 4 },
  itemDone: { textDecorationLine: 'line-through' },

  bandNote: { textAlign: 'center', marginTop: 6 },
});
