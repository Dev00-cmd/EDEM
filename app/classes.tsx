// ═══════════════════════════════════════════════════════════════
//  MES CLASSES
//
//  Un élève peut appartenir à plusieurs classes — une par matière —
//  et c'est le cas normal, pas l'exception : l'écran est une liste
//  dès le premier jour, jamais une classe unique.
//
//  Le code d'invitation ne s'affiche qu'au professeur. Montré à un
//  élève, il aurait fait le tour de la cour à la récréation
//  suivante, et n'importe qui serait entré dans la classe.
//
//  L'écran ne montre pas la même chose aux deux : le professeur
//  voit d'abord « Créer une salle », l'élève d'abord le champ du
//  code. Chacun a son geste principal sous le pouce, et celui de
//  l'autre plus bas — un professeur ne rejoint pas sa propre
//  classe, mais il peut très bien être élève dans celle d'un
//  collègue, donc on ne retire rien.
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Icon } from '@/components/Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { useKeyboard } from '@/theme/useKeyboard';
import { RADIUS } from '@/theme/colors';
import { type } from '@/theme/typography';
import { getSubject } from '@/data/subjects';
import { fetchClassrooms, joinClassroom, type Classroom } from '@/lib/classrooms';

export default function ClassesScreen() {
  const { t, profile } = useApp();
  const { colors } = useTheme();
  const keyboard = useKeyboard();
  const router = useRouter();

  const lang = profile.lang;
  const prof = profile.role === 'prof';
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [chargement, setChargement] = useState(true);
  const [code, setCode] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  const recharger = useCallback(async () => {
    const rows = await fetchClassrooms();
    setClasses(rows);
    setChargement(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      recharger();
    }, [recharger]),
  );

  const rejoindre = async () => {
    const propre = code.trim().toUpperCase();
    if (propre.length !== 6) {
      setErreur(t('classes.codeLength'));
      return;
    }
    setErreur('');
    setSucces('');
    setEnvoi(true);
    const r = await joinClassroom(propre);
    setEnvoi(false);

    if (!r.ok) {
      // Le serveur rend un code ; c'est ici qu'il devient une
      // phrase, dans la langue de l'élève.
      setErreur(t(`classes.err_${r.error ?? 'echec'}`));
      return;
    }
    setCode('');
    setSucces(t('classes.joined', { name: r.name ?? '', teacher: r.teacher ?? '' }));
    recharger();
  };

  return (
    <Screen scroll={false} padded={false} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 60 + keyboard.height }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={recharger} tintColor={colors.accent} />
        }
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={10}>
            <Icon name="arrow-left" size={20} color={colors.textSoft} />
          </Pressable>
          <Text style={[type.title, { color: colors.text }]}>{t('classes.title')}</Text>
        </View>

        {/* ── Créer une salle : le geste principal du professeur ─
            Il passe AVANT le code d'invitation, qui ne le concerne
            pas : un professeur ne rejoint pas sa propre classe. Il
            peut en ouvrir autant qu'il veut, jusqu'à dix. */}
        {prof && (
          <Card style={{ marginTop: 18 }}>
            <Text style={[type.cardTitle, { color: colors.text }]}>
              {t('classes.createTitle')}
            </Text>
            <Text style={[type.caption, { color: colors.textSoft, marginTop: 6 }]}>
              {t('classes.createSub')}
            </Text>
            <Button
              label={t('classes.create')}
              icon="plus"
              full
              style={{ marginTop: 12 }}
              onPress={() => router.push('/classroom/new')}
            />
          </Card>
        )}

        {/* ── Rejoindre ──────────────────────────────────────── */}
        <Card style={{ marginTop: 18 }}>
          <Text style={[type.cardTitle, { color: colors.text }]}>{t('classes.joinTitle')}</Text>
          <Text style={[type.caption, { color: colors.textSoft, marginTop: 6 }]}>
            {t('classes.joinSub')}
          </Text>
          <View style={{ marginTop: 12 }}>
            <Input
              placeholder={t('classes.codePlaceholder')}
              value={code}
              onChangeText={(v: string) => setCode(v.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
            />
          </View>
          <Button
            label={t('classes.join')}
            icon="arrow-right"
            iconRight
            full
            loading={envoi}
            style={{ marginTop: 10 }}
            onPress={rejoindre}
          />
          {erreur !== '' && (
            <View style={styles.msg}>
              <Icon name="alert" size={13} color={colors.danger} />
              <Text style={[type.caption, { color: colors.danger, flex: 1 }]}>{erreur}</Text>
            </View>
          )}
          {succes !== '' && (
            <View style={styles.msg}>
              <Icon name="check-circle" size={13} color={colors.accent} />
              <Text style={[type.caption, { color: colors.textSoft, flex: 1 }]}>{succes}</Text>
            </View>
          )}
        </Card>

        {/* ── La liste ───────────────────────────────────────── */}
        <Text style={[type.eyebrow, { color: colors.textFaint, marginTop: 28, marginBottom: 10 }]}>
          {t('classes.mine')}
        </Text>

        {chargement ? (
          <Text style={[type.caption, { color: colors.textFaint }]}>{t('common.loading')}</Text>
        ) : classes.length === 0 ? (
          <Card>
            <Text style={[type.caption, { color: colors.textSoft }]}>{t('classes.empty')}</Text>
          </Card>
        ) : (
          classes.map((c) => {
            const matiere = getSubject(c.subject_id);
            const attente = c.my_status === 'pending';
            return (
              <Card key={c.id} style={{ marginBottom: 10 }} onPress={() => router.push(`/classroom/${c.id}`)}>
                <View style={styles.row}>
                  <View style={[styles.pastille, { backgroundColor: matiere.color }]}>
                    <Icon name={matiere.icon} size={15} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.cardTitle, { color: colors.text }]}>{c.name}</Text>
                    <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]}>
                      {c.school} · {c.teacher}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={colors.textFaint} />
                </View>

                {c.current_focus ? (
                  <View style={[styles.focus, { borderColor: colors.border }]}>
                    <Icon name="bookmark" size={12} color={colors.sky} />
                    <Text style={[type.caption, { color: colors.textSoft, flex: 1 }]}>
                      {c.current_focus}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.badges}>
                  {attente && (
                    <Badge label={t('classes.waiting')} tint={colors.sky} />
                  )}
                  {c.is_teacher && (
                    <>
                      <Badge label={t('classes.membersN', { n: String(c.members) })} tint={colors.textFaint} />
                      {c.pending > 0 && (
                        <Badge label={t('classes.pendingN', { n: String(c.pending) })} tint={colors.warning} />
                      )}
                    </>
                  )}
                </View>
              </Card>
            );
          })
        )}

        <Text style={[type.caption, { color: colors.textFaint, marginTop: 20 }]}>
          {t('classes.privacy')}
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Badge({ label, tint }: { label: string; tint: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { borderColor: colors.border }]}>
      <Text style={[type.caption, { color: tint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  pastille: {
    width: 32, height: 32, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  focus: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderTopWidth: 1, marginTop: 10, paddingTop: 9,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  badge: {
    borderWidth: 1, borderRadius: RADIUS.pill,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  msg: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
});
