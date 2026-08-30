// ═══════════════════════════════════════════════════════════════
//  DONNER UN DEVOIR
//
//  Deux formes. Un DEVOIR se rend par un texte ou une photo de
//  cahier. Un QUIZ réutilise le moteur existant : chaque élève
//  reçoit SA session, générée sur les notions et la difficulté
//  choisies ici — pas le même questionnaire recopié, ce qui
//  rendrait la triche triviale.
//
//  Le devoir naît en brouillon. La classe ne le voit qu'une fois
//  publié : un professeur doit pouvoir le préparer tranquillement.
// ═══════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Input } from '@/components/Input';
import { Icon } from '@/components/Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { useKeyboard } from '@/theme/useKeyboard';
import { RADIUS } from '@/theme/colors';
import { type } from '@/theme/typography';
import { topicsFor } from '@/data/curriculum';
import { DIFFICULTIES, type Difficulty } from '@/config/app';
import { publishAssignment, saveAssignment, type AssignmentKind } from '@/lib/assignments';
import { fetchClassrooms } from '@/lib/classrooms';

const ECHEANCES = [
  { jours: 1, cle: 'tomorrow' },
  { jours: 3, cle: 'threeDays' },
  { jours: 7, cle: 'oneWeek' },
  { jours: 0, cle: 'none' },
];

export default function NouveauDevoir() {
  const { classroom } = useLocalSearchParams<{ classroom: string }>();
  const { t, profile } = useApp();
  const { colors } = useTheme();
  const keyboard = useKeyboard();
  const router = useRouter();

  const lang = profile.lang;
  const [kind, setKind] = useState<AssignmentKind>('devoir');
  const [titre, setTitre] = useState('');
  const [consignes, setConsignes] = useState('');
  const [notions, setNotions] = useState<string[]>([]);
  const [difficulte, setDifficulte] = useState<Difficulty>('moyen');
  const [echeance, setEcheance] = useState(3);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  // Les notions proposées sont celles du programme, pour la matière
  // et le niveau DE LA CLASSE. C'est ce qui permettra au tableau de
  // bord d'agréger : un devoir sur une notion inventée ne
  // s'y rattacherait à rien.
  const [matiere, setMatiere] = useState('');
  const [niveau, setNiveau] = useState('');
  React.useEffect(() => {
    fetchClassrooms().then((cs) => {
      const c = cs.find((x) => x.id === classroom);
      if (c) {
        setMatiere(c.subject_id);
        setNiveau(c.grade_level);
      }
    });
  }, [classroom]);

  const auProgramme = useMemo(
    () => (matiere && niveau ? topicsFor(matiere, niveau) : []),
    [matiere, niveau],
  );

  const basculer = (id: string) =>
    setNotions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 8 ? prev : [...prev, id],
    );

  const enregistrer = async (publier: boolean) => {
    if (titre.trim().length < 2) return setErreur(t('assignment.titleNeeded'));
    if (kind === 'quiz' && notions.length === 0) return setErreur(t('assignment.topicsNeeded'));

    setErreur('');
    setEnvoi(true);
    const id = await saveAssignment({
      classroomId: classroom,
      kind,
      title: titre,
      instructions: consignes,
      topicIds: notions,
      difficulty: kind === 'quiz' ? difficulte : null,
      dueAt:
        echeance > 0 ? new Date(Date.now() + echeance * 864e5).toISOString() : null,
    });
    if (id && publier) await publishAssignment(id, true);
    setEnvoi(false);
    if (!id) return setErreur(t('assignment.failed'));
    router.replace(`/classroom/${classroom}`);
  };

  return (
    <Screen scroll={false} padded={false} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 70 + keyboard.height }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={10}>
            <Icon name="arrow-left" size={20} color={colors.textSoft} />
          </Pressable>
          <Text style={[type.title, { color: colors.text }]}>{t('assignment.newTitle')}</Text>
        </View>

        {/* ── La forme ───────────────────────────────────────── */}
        <View style={styles.formes}>
          {(['devoir', 'quiz'] as AssignmentKind[]).map((k) => {
            const actif = kind === k;
            return (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                accessibilityRole="button"
                accessibilityState={{ selected: actif }}
                style={[
                  styles.forme,
                  {
                    backgroundColor: actif ? colors.accent : colors.surface,
                    borderColor: actif ? colors.accent : colors.border,
                  },
                ]}
              >
                <Icon
                  name={k === 'devoir' ? 'file' : 'quiz'}
                  size={18}
                  color={actif ? '#FFFFFF' : colors.textSoft}
                />
                <Text style={[type.captionMedium, { color: actif ? '#FFFFFF' : colors.text }]}>
                  {t(`assignment.kind_${k}`)}
                </Text>
                <Text
                  style={[
                    type.caption,
                    { color: actif ? 'rgba(255,255,255,0.75)' : colors.textFaint },
                  ]}
                >
                  {t(`assignment.kind_${k}_sub`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.field}>
          <Input
            label={t('assignment.titleLabel')}
            placeholder={t(`assignment.titlePlaceholder_${kind}`)}
            value={titre}
            onChangeText={setTitre}
          />
        </View>

        {kind === 'devoir' && (
          <View style={styles.field}>
            <Input
              label={t('assignment.instructionsLabel')}
              placeholder={t('assignment.instructionsPlaceholder')}
              value={consignes}
              onChangeText={setConsignes}
              multiline
              numberOfLines={4}
            />
          </View>
        )}

        {/* ── Les notions ────────────────────────────────────── */}
        <View style={styles.field}>
          <Text style={[type.captionMedium, { color: colors.textSoft }]}>
            {t(kind === 'quiz' ? 'assignment.topicsQuiz' : 'assignment.topicsDevoir')}
          </Text>
          <Text style={[type.caption, { color: colors.textFaint, marginTop: 4 }]}>
            {t('assignment.topicsWhy')}
          </Text>
          <View style={styles.chips}>
            {auProgramme.map((n) => (
              <Chip
                key={n.id}
                label={lang === 'ht' ? n.ht : n.fr}
                selected={notions.includes(n.id)}
                onPress={() => basculer(n.id)}
              />
            ))}
          </View>
          {auProgramme.length === 0 && (
            <Text style={[type.caption, { color: colors.textFaint, marginTop: 8 }]}>
              {t('common.loading')}
            </Text>
          )}
        </View>

        {kind === 'quiz' && (
          <View style={styles.field}>
            <Text style={[type.captionMedium, { color: colors.textSoft }]}>
              {t('assignment.difficultyLabel')}
            </Text>
            <View style={styles.chips}>
              {DIFFICULTIES.map((d) => (
                <Chip
                  key={d.id}
                  label={t(`quiz.diff_${d.id}`)}
                  selected={difficulte === d.id}
                  onPress={() => setDifficulte(d.id)}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.field}>
          <Text style={[type.captionMedium, { color: colors.textSoft }]}>
            {t('assignment.dueLabel')}
          </Text>
          <View style={styles.chips}>
            {ECHEANCES.map((e) => (
              <Chip
                key={e.cle}
                label={t(`assignment.due_${e.cle}`)}
                selected={echeance === e.jours}
                onPress={() => setEcheance(e.jours)}
              />
            ))}
          </View>
        </View>

        {kind === 'quiz' && (
          <Card style={{ marginTop: 20 }}>
            <View style={styles.row}>
              <Icon name="info" size={13} color={colors.sky} />
              <Text style={[type.caption, { color: colors.textSoft, flex: 1 }]}>
                {t('assignment.quizNote')}
              </Text>
            </View>
          </Card>
        )}

        {erreur !== '' && (
          <View style={styles.msg}>
            <Icon name="alert" size={14} color={colors.danger} />
            <Text style={[type.captionMedium, { color: colors.danger }]}>{erreur}</Text>
          </View>
        )}

        <Button
          label={t('assignment.saveAndPublish')}
          icon="send"
          full
          loading={envoi}
          style={{ marginTop: 24 }}
          onPress={() => enregistrer(true)}
        />
        <Button
          label={t('assignment.saveDraft')}
          variant="ghost"
          full
          style={{ marginTop: 10 }}
          onPress={() => enregistrer(false)}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  formes: { flexDirection: 'row', gap: 10, marginTop: 18 },
  forme: { flex: 1, borderWidth: 1.5, borderRadius: RADIUS.lg, padding: 14, gap: 6 },
  field: { marginTop: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  msg: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 18,
  },
});
