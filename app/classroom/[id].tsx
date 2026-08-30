// ═══════════════════════════════════════════════════════════════
//  UNE CLASSE
//
//  Deux écrans en un, selon qui regarde.
//
//  L'élève voit le chapitre en cours et ses camarades sous leur
//  PSEUDONYME. Le professeur, et lui seul, voit les vrais noms, le
//  code d'invitation, les demandes en attente et sa note pour l'IA.
//
//  Ce n'est pas l'écran qui décide de tout ça : le serveur ne rend
//  simplement pas ces champs à un élève. Un client modifié n'y
//  changerait rien.
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Icon } from '@/components/Icon';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { useKeyboard } from '@/theme/useKeyboard';
import { RADIUS } from '@/theme/colors';
import { type } from '@/theme/typography';
import { getSubject } from '@/data/subjects';
import {
  approveMember, fetchClassrooms, fetchRoster, removeMember,
  rotateJoinCode, setClassroomFocus,
  type Classroom, type RosterEntry,
} from '@/lib/classrooms';
import {
  fetchClassAssignments, fetchMyAssignments,
  type ClassAssignment, type MyAssignment,
} from '@/lib/assignments';

export default function UneClasse() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, profile } = useApp();
  const { colors } = useTheme();
  const keyboard = useKeyboard();
  const router = useRouter();

  const lang = profile.lang;
  const [classe, setClasse] = useState<Classroom | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [focus, setFocus] = useState('');
  const [note, setNote] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [aRetirer, setARetirer] = useState<RosterEntry | null>(null);
  const [devoirs, setDevoirs] = useState<(ClassAssignment | MyAssignment)[]>([]);

  const recharger = useCallback(async () => {
    const [classes, membres] = await Promise.all([fetchClassrooms(), fetchRoster(id)]);
    const c = classes.find((x) => x.id === id) ?? null;
    setClasse(c);
    setRoster(membres);
    if (c) {
      setFocus(c.current_focus ?? '');
      setNote(c.focus_note ?? '');
      // Le professeur voit l'avancement de sa classe ; l'élève voit
      // ce qu'il a à rendre. Deux fonctions, une seule liste.
      setDevoirs(
        c.is_teacher
          ? await fetchClassAssignments(id)
          : (await fetchMyAssignments()).filter((a) => a.classroom_id === id),
      );
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      recharger();
    }, [recharger]),
  );

  if (!classe) {
    return (
      <Screen>
        <Entete titre={t('classroom.title')} onBack={() => router.back()} />
        <Text style={[type.caption, { color: colors.textFaint, marginTop: 20 }]}>
          {t('common.loading')}
        </Text>
      </Screen>
    );
  }

  const matiere = getSubject(classe.subject_id);
  const prof = classe.is_teacher;
  const attente = roster.filter((m) => m.status === 'pending');
  const actifs = roster.filter((m) => m.status === 'active');

  const agir = async (fn: () => Promise<boolean>) => {
    setEnCours(true);
    await fn();
    await recharger();
    setEnCours(false);
  };

  return (
    <Screen scroll={false} padded={false} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 60 + keyboard.height }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Entete titre={classe.name} onBack={() => router.back()} />

        <View style={[styles.row, { marginTop: 12 }]}>
          <View style={[styles.pastille, { backgroundColor: matiere.color }]}>
            <Icon name={matiere.icon} size={15} color="#FFFFFF" />
          </View>
          <Text style={[type.caption, { color: colors.textSoft, flex: 1 }]}>
            {matiere.name[lang]} · {classe.grade_level} · {classe.school}
          </Text>
        </View>
        <Text style={[type.caption, { color: colors.textFaint, marginTop: 6 }]}>
          {prof ? t('classroom.youTeach') : t('classroom.taughtBy', { name: classe.teacher })}
        </Text>

        {classe.my_status === 'pending' && (
          <Card accent={colors.sky} style={{ marginTop: 16 }}>
            <Text style={[type.caption, { color: colors.textSoft }]}>
              {t('classroom.pendingYou')}
            </Text>
          </Card>
        )}

        {/* ── Le chapitre en cours ───────────────────────────── */}
        <Text style={[type.eyebrow, styles.section, { color: colors.textFaint }]}>
          {t('classroom.focusTitle')}
        </Text>
        {prof ? (
          <Card>
            <Input
              label={t('classroom.focusLabel')}
              placeholder={t('classroom.focusPlaceholder')}
              value={focus}
              onChangeText={setFocus}
            />
            <View style={{ marginTop: 12 }}>
              <Input
                label={t('classroom.noteLabel')}
                placeholder={t('classroom.notePlaceholder')}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
              />
            </View>
            <Text style={[type.caption, { color: colors.textFaint, marginTop: 8 }]}>
              {t('classroom.noteWhy')}
            </Text>
            <Button
              label={t('common.save')}
              size="sm"
              full
              loading={enCours}
              style={{ marginTop: 12 }}
              onPress={() => agir(() => setClassroomFocus(classe.id, focus, note))}
            />
          </Card>
        ) : (
          <Card>
            <Text style={[type.body, { color: colors.text }]}>
              {classe.current_focus || t('classroom.noFocus')}
            </Text>
          </Card>
        )}

        {/* ── Le code, professeur seulement ──────────────────── */}
        {prof && classe.join_code && (
          <>
            <Text style={[type.eyebrow, styles.section, { color: colors.textFaint }]}>
              {t('classroom.codeSection')}
            </Text>
            <Card night>
              <Text style={[styles.code, { color: colors.onNight }]}>{classe.join_code}</Text>
              <Text style={[type.caption, { color: 'rgba(255,255,255,0.7)', marginTop: 8 }]}>
                {t('classroom.codeHint')}
              </Text>
              <Button
                label={t('classroom.rotate')}
                variant="ghost"
                size="sm"
                icon="refresh"
                style={{ marginTop: 12 }}
                loading={enCours}
                onPress={() => agir(() => rotateJoinCode(classe.id))}
              />
            </Card>
          </>
        )}

        {/* ── Les demandes en attente ────────────────────────── */}
        {prof && attente.length > 0 && (
          <>
            <Text style={[type.eyebrow, styles.section, { color: colors.warning }]}>
              {t('classroom.pendingSection', { n: String(attente.length) })}
            </Text>
            {attente.map((m) => (
              <Card key={m.user_id} style={{ marginBottom: 8 }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.bodyMedium, { color: colors.text }]}>{m.affiche}</Text>
                    {m.vrai_nom ? (
                      <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
                        {m.vrai_nom}
                      </Text>
                    ) : null}
                  </View>
                  <Button
                    label={t('classroom.approve')}
                    size="sm"
                    loading={enCours}
                    onPress={() => agir(() => approveMember(classe.id, m.user_id))}
                  />
                  <Button
                    label={t('classroom.refuse')}
                    size="sm"
                    variant="ghost"
                    loading={enCours}
                    onPress={() => agir(() => removeMember(classe.id, m.user_id))}
                  />
                </View>
              </Card>
            ))}
          </>
        )}

        {/* ── Le tableau de bord, professeur seulement ───────── */}
        {prof && (
          <Card style={{ marginTop: 24 }} onPress={() => router.push(`/dashboard/${classe.id}`)}>
            <View style={styles.row}>
              <Icon name="chart" size={18} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[type.cardTitle, { color: colors.text }]}>
                  {t('dashboard.title')}
                </Text>
                <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
                  {t('dashboard.entry')}
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.textFaint} />
            </View>
          </Card>
        )}

        {/* ── Les devoirs ────────────────────────────────────── */}
        <View style={styles.entete}>
          <Text style={[type.eyebrow, { color: colors.textFaint, flex: 1 }]}>
            {t('assignment.section')}
          </Text>
          {prof && (
            <Button
              label={t('assignment.add')}
              size="sm"
              variant="ghost"
              icon="plus"
              onPress={() => router.push(`/assignment/new?classroom=${classe.id}`)}
            />
          )}
        </View>

        {devoirs.length === 0 ? (
          <Card>
            <Text style={[type.caption, { color: colors.textSoft }]}>
              {prof ? t('assignment.emptyTeacher') : t('assignment.emptyStudent')}
            </Text>
          </Card>
        ) : (
          devoirs.map((d) => {
            const duProf = 'published' in d;
            const rendu = !duProf && (d as MyAssignment).submitted_at !== null;
            return (
              <Card
                key={d.id}
                style={{ marginBottom: 8 }}
                onPress={() => router.push(`/assignment/${d.id}?classroom=${classe.id}`)}
              >
                <View style={styles.row}>
                  <Icon
                    name={d.kind === 'quiz' ? 'quiz' : 'file'}
                    size={16}
                    color={rendu ? colors.success : colors.textSoft}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[type.bodyMedium, { color: colors.text }]}>{d.title}</Text>
                    <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
                      {duProf
                        ? ((d as ClassAssignment).published
                            ? t('assignment.handedIn', {
                                n: String((d as ClassAssignment).rendus),
                              })
                            : t('assignment.draft'))
                        : rendu
                          ? t('assignment.done')
                          : t('assignment.todo')}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={colors.textFaint} />
                </View>
              </Card>
            );
          })
        )}

        {/* ── Le trombinoscope ───────────────────────────────── */}
        <Text style={[type.eyebrow, styles.section, { color: colors.textFaint }]}>
          {t('classroom.membersSection', { n: String(actifs.length) })}
        </Text>
        {actifs.length === 0 ? (
          <Card>
            <Text style={[type.caption, { color: colors.textSoft }]}>{t('classroom.noMembers')}</Text>
          </Card>
        ) : (
          actifs.map((m) => (
            <Card key={m.user_id} style={{ marginBottom: 8 }}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.bodyMedium, { color: colors.text }]}>{m.affiche}</Text>
                  {/* Le vrai nom n'arrive du serveur que si celui qui
                      regarde est le professeur de cette classe. */}
                  {m.vrai_nom ? (
                    <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
                      {m.vrai_nom}
                    </Text>
                  ) : null}
                </View>
                {prof && (
                  <Pressable onPress={() => setARetirer(m)} accessibilityRole="button" hitSlop={8}>
                    <Icon name="close" size={16} color={colors.textFaint} />
                  </Pressable>
                )}
              </View>
            </Card>
          ))
        )}

        <Text style={[type.caption, { color: colors.textFaint, marginTop: 18 }]}>
          {t('classroom.privacy')}
        </Text>
      </ScrollView>

      <ConfirmDialog
        visible={aRetirer !== null}
        title={t('classroom.removeTitle')}
        message={t('classroom.removeBody', { name: aRetirer?.affiche ?? '' })}
        confirmLabel={t('classroom.remove')}
        cancelLabel={t('common.cancel')}
        destructive
        onCancel={() => setARetirer(null)}
        onConfirm={() => {
          const m = aRetirer;
          setARetirer(null);
          if (m) agir(() => removeMember(classe.id, m.user_id));
        }}
      />
    </Screen>
  );
}

function Entete({ titre, onBack }: { titre: string; onBack: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} accessibilityRole="button" hitSlop={10}>
        <Icon name="arrow-left" size={20} color={colors.textSoft} />
      </Pressable>
      <Text style={[type.title, { color: colors.text, flex: 1 }]} numberOfLines={1}>
        {titre}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pastille: {
    width: 30, height: 30, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  section: { marginTop: 26, marginBottom: 10 },
  entete: { flexDirection: 'row', alignItems: 'center', marginTop: 26, marginBottom: 10 },
  code: { fontSize: 34, letterSpacing: 7, fontWeight: '800' },
});
