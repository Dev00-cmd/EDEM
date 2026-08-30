// ═══════════════════════════════════════════════════════════════
//  UN DEVOIR
//
//  Deux écrans en un.
//
//  L'ÉLÈVE rend son travail : un texte, une photo de son cahier,
//  ou — pour un devoir de type quiz — il joue le quiz. La photo est
//  compressée avant l'envoi (1600 px de large) : c'est de la data
//  payée à l'unité par l'élève.
//
//  LE PROFESSEUR voit qui a rendu, lit les copies et note. Sur un
//  quiz, il voit les SCORES, jamais le détail des réponses — c'est
//  le serveur qui ne les lui rend pas.
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Icon } from '@/components/Icon';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { useKeyboard } from '@/theme/useKeyboard';
import { RADIUS } from '@/theme/colors';
import { type } from '@/theme/typography';
import {
  pickFromCamera, pickFromGallery, signedUrlFor, uploadAttachment,
} from '@/lib/attachments';
import {
  fetchClassAssignments, fetchMyAssignments, fetchSubmissions,
  gradeSubmission, publishAssignment, submitAssignment,
  type ClassAssignment, type MyAssignment, type SubmissionRow,
} from '@/lib/assignments';

export default function UnDevoir() {
  const { id, classroom } = useLocalSearchParams<{ id: string; classroom?: string }>();
  const { t, profile } = useApp();
  const { session } = useAuth();
  const { colors } = useTheme();
  const keyboard = useKeyboard();
  const router = useRouter();

  const lang = profile.lang;
  const [mien, setMien] = useState<MyAssignment | null>(null);
  const [duProf, setDuProf] = useState<ClassAssignment | null>(null);
  const [remises, setRemises] = useState<SubmissionRow[]>([]);
  const [texte, setTexte] = useState('');
  const [piece, setPiece] = useState<string | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState('');

  const estProf = duProf !== null;

  const recharger = useCallback(async () => {
    const [miens, remisesRows] = await Promise.all([
      fetchMyAssignments(),
      fetchSubmissions(id),
    ]);
    const m = miens.find((a) => a.id === id) ?? null;
    setMien(m);
    if (m) setTexte(m.feedback ? '' : texte);

    // `assignment_submissions` ne rend des lignes qu'au professeur :
    // s'il y en a, c'est qu'on en est un.
    if (remisesRows.length > 0 && classroom) {
      setRemises(remisesRows);
      const liste = await fetchClassAssignments(classroom);
      setDuProf(liste.find((a) => a.id === id) ?? null);
    } else if (classroom) {
      const liste = await fetchClassAssignments(classroom);
      const trouve = liste.find((a) => a.id === id) ?? null;
      setDuProf(trouve);
      setRemises(remisesRows);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, classroom]);

  useFocusEffect(
    useCallback(() => {
      recharger();
    }, [recharger]),
  );

  const joindre = async (source: 'camera' | 'galerie') => {
    const f = source === 'camera' ? await pickFromCamera(lang) : await pickFromGallery(lang);
    if (typeof f === 'string') return setMessage(f);
    if (!session?.user.id) return;
    setEnCours(true);
    const up = await uploadAttachment(
      f, session.user.id, lang,
      `classroom/${mien?.classroom_id ?? classroom}/${id}`,
    );
    setEnCours(false);
    if (typeof up === 'string') return setMessage(up);
    setPiece(up.path);
    setApercu(f.uri);
    setMessage('');
  };

  const rendre = async () => {
    if (texte.trim() === '' && !piece) return setMessage(t('assignment.emptySubmission'));
    setEnCours(true);
    const ok = await submitAssignment(id, texte, piece);
    setEnCours(false);
    if (!ok) return setMessage(t('assignment.failed'));
    setMessage(t('assignment.submitted'));
    recharger();
  };

  const titre = mien?.title ?? duProf?.title ?? t('assignment.title');

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
          <Text style={[type.title, { color: colors.text, flex: 1 }]} numberOfLines={2}>
            {titre}
          </Text>
        </View>

        {mien?.instructions ? (
          <Card style={{ marginTop: 16 }}>
            <Text style={[type.body, { color: colors.text }]}>{mien.instructions}</Text>
          </Card>
        ) : null}

        {mien?.due_at ? (
          <View style={[styles.row, { marginTop: 12 }]}>
            <Icon name="clock" size={13} color={colors.textFaint} />
            <Text style={[type.caption, { color: colors.textFaint }]}>
              {t('assignment.dueOn', {
                date: new Date(mien.due_at).toLocaleDateString(lang === 'ht' ? 'fr-FR' : 'fr-FR'),
              })}
            </Text>
          </View>
        ) : null}

        {/* ══ CÔTÉ ÉLÈVE ═══════════════════════════════════════ */}
        {mien && !estProf && (
          <>
            {mien.kind === 'quiz' ? (
              mien.submitted_at ? (
                <Card style={{ marginTop: 20 }}>
                  <Text style={[type.cardTitle, { color: colors.text }]}>
                    {t('assignment.quizDone', { pct: String(mien.score_pct ?? 0) })}
                  </Text>
                  <Text style={[type.caption, { color: colors.textSoft, marginTop: 6 }]}>
                    {t('assignment.quizOnce')}
                  </Text>
                </Card>
              ) : (
                <>
                  <Card style={{ marginTop: 20 }}>
                    <Text style={[type.caption, { color: colors.textSoft }]}>
                      {t('assignment.quizIntro')}
                    </Text>
                  </Card>
                  <Button
                    label={t('assignment.startQuiz')}
                    icon="quiz"
                    full
                    style={{ marginTop: 14 }}
                    onPress={() =>
                      router.push(
                        `/(tabs)/quiz?subject=${mien.subject_id}&assignment=${mien.id}`,
                      )
                    }
                  />
                </>
              )
            ) : mien.submitted_at ? (
              <Card style={{ marginTop: 20 }}>
                <View style={styles.row}>
                  <Icon name="check-circle" size={16} color={colors.success} />
                  <Text style={[type.cardTitle, { color: colors.text, flex: 1 }]}>
                    {t('assignment.alreadySubmitted')}
                  </Text>
                </View>
                {mien.grade !== null ? (
                  <>
                    <Text style={[type.display, { color: colors.accent, marginTop: 10 }]}>
                      {mien.grade}/100
                    </Text>
                    {mien.feedback ? (
                      <Text style={[type.body, { color: colors.textSoft, marginTop: 8 }]}>
                        {mien.feedback}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={[type.caption, { color: colors.textFaint, marginTop: 8 }]}>
                    {t('assignment.waitingGrade')}
                  </Text>
                )}
              </Card>
            ) : null}

            {mien.kind === 'devoir' && (
              <>
                <Text style={[type.eyebrow, styles.section, { color: colors.textFaint }]}>
                  {mien.submitted_at ? t('assignment.redo') : t('assignment.yourAnswer')}
                </Text>
                <Input
                  placeholder={t('assignment.answerPlaceholder')}
                  value={texte}
                  onChangeText={setTexte}
                  multiline
                  numberOfLines={5}
                />
                <View style={styles.piecesRow}>
                  <Button
                    label={t('assignment.photo')}
                    icon="camera"
                    variant="ghost"
                    size="sm"
                    onPress={() => joindre('camera')}
                  />
                  <Button
                    label={t('assignment.gallery')}
                    icon="image"
                    variant="ghost"
                    size="sm"
                    onPress={() => joindre('galerie')}
                  />
                </View>
                {apercu ? (
                  <Image source={{ uri: apercu }} style={styles.apercu} resizeMode="cover" />
                ) : null}
                <Button
                  label={t('assignment.submit')}
                  icon="send"
                  full
                  loading={enCours}
                  style={{ marginTop: 14 }}
                  onPress={rendre}
                />
              </>
            )}
          </>
        )}

        {/* ══ CÔTÉ PROFESSEUR ══════════════════════════════════ */}
        {estProf && (
          <>
            {!duProf.published && (
              <Card accent={colors.warning} style={{ marginTop: 16 }}>
                <Text style={[type.caption, { color: colors.textSoft }]}>
                  {t('assignment.draftNote')}
                </Text>
                <Button
                  label={t('assignment.publish')}
                  size="sm"
                  style={{ marginTop: 10 }}
                  loading={enCours}
                  onPress={async () => {
                    setEnCours(true);
                    await publishAssignment(id, true);
                    await recharger();
                    setEnCours(false);
                  }}
                />
              </Card>
            )}

            <Text style={[type.eyebrow, styles.section, { color: colors.textFaint }]}>
              {t('assignment.submissions', {
                n: String(remises.filter((r) => r.submitted_at).length),
                total: String(remises.length),
              })}
            </Text>

            {remises.map((r) => (
              <LigneRemise
                key={r.user_id}
                remise={r}
                quiz={duProf.kind === 'quiz'}
                onNote={async (note, retour) => {
                  if (!r.submission_id) return;
                  setEnCours(true);
                  await gradeSubmission(r.submission_id, note, retour);
                  await recharger();
                  setEnCours(false);
                }}
              />
            ))}
          </>
        )}

        {message !== '' && (
          <View style={styles.msg}>
            <Icon name="info" size={13} color={colors.textSoft} />
            <Text style={[type.caption, { color: colors.textSoft, flex: 1 }]}>{message}</Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function LigneRemise({
  remise, quiz, onNote,
}: {
  remise: SubmissionRow;
  quiz: boolean;
  onNote: (note: number, retour: string) => void;
}) {
  const { t } = useApp();
  const { colors } = useTheme();
  const [ouvert, setOuvert] = useState(false);
  const [note, setNote] = useState(remise.grade !== null ? String(remise.grade) : '');
  const [retour, setRetour] = useState(remise.feedback ?? '');
  const [lien, setLien] = useState<string | null>(null);

  const voirPiece = async () => {
    if (!remise.attachment_path) return;
    setLien(await signedUrlFor(remise.attachment_path));
  };

  return (
    <Card style={{ marginBottom: 8 }} onPress={quiz ? undefined : () => setOuvert(!ouvert)}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[type.bodyMedium, { color: colors.text }]}>{remise.affiche}</Text>
          {remise.vrai_nom ? (
            <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
              {remise.vrai_nom}
            </Text>
          ) : null}
        </View>
        {quiz ? (
          <Text
            style={[
              type.cardTitle,
              {
                color:
                  remise.score_pct === null
                    ? colors.textFaint
                    : remise.score_pct < 40
                      ? colors.danger
                      : remise.score_pct < 70
                        ? colors.warning
                        : colors.success,
              },
            ]}
          >
            {remise.score_pct === null ? '—' : `${remise.score_pct}%`}
          </Text>
        ) : (
          <Text
            style={[
              type.captionMedium,
              { color: remise.submitted_at ? colors.success : colors.textFaint },
            ]}
          >
            {remise.grade !== null
              ? `${remise.grade}/100`
              : remise.submitted_at
                ? t('assignment.toGrade')
                : t('assignment.notSubmitted')}
          </Text>
        )}
      </View>

      {ouvert && remise.submitted_at && (
        <View style={{ marginTop: 12 }}>
          {remise.text ? (
            <Text style={[type.body, { color: colors.textSoft }]}>{remise.text}</Text>
          ) : null}

          {remise.attachment_path ? (
            lien ? (
              <Image source={{ uri: lien }} style={styles.apercu} resizeMode="contain" />
            ) : (
              // On ne télécharge la photo qu'au clic : une pièce
              // jointe chargée d'office, c'est de la data prise à
              // l'élève ET au professeur.
              <Button
                label={t('assignment.seeAttachment')}
                variant="ghost"
                size="sm"
                icon="image"
                style={{ marginTop: 10 }}
                onPress={voirPiece}
              />
            )
          ) : null}

          <View style={{ marginTop: 12 }}>
            <Input
              label={t('assignment.gradeLabel')}
              placeholder="0 – 100"
              value={note}
              onChangeText={setNote}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ marginTop: 10 }}>
            <Input
              label={t('assignment.feedbackLabel')}
              placeholder={t('assignment.feedbackPlaceholder')}
              value={retour}
              onChangeText={setRetour}
              multiline
              numberOfLines={3}
            />
          </View>
          <Button
            label={t('assignment.saveGrade')}
            size="sm"
            full
            style={{ marginTop: 10 }}
            onPress={() => {
              const n = Math.max(0, Math.min(100, parseInt(note, 10) || 0));
              onNote(n, retour);
              setOuvert(false);
            }}
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 10 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  section: { marginTop: 26, marginBottom: 10 },
  piecesRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  apercu: { width: '100%', height: 200, borderRadius: RADIUS.lg, marginTop: 12 },
  msg: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
});
