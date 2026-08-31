// ═══════════════════════════════════════════════════════════════
//  « JE SUIS PROFESSEUR »
//
//  Quatre champs, et la classe s'ouvre dans la minute. Il n'y a ni
//  file d'attente, ni vérification, ni relecture : le rôle est
//  accordé par la déclaration elle-même. Le professeur crée sa
//  salle, un point c'est tout.
//
//  Le moyen de joindre reste obligatoire, mais il a changé de
//  raison d'être. Il ne sert plus à AUTORISER — il sert à
//  RÉPONDRE : un adulte responsable d'une salle de mineurs doit
//  pouvoir être joint s'il s'y passe quelque chose. C'est la seule
//  donnée de contact de toute l'application, elle ne concerne qu'un
//  adulte qui la donne lui-même, et elle n'est jamais montrée à un
//  élève.
//
//  L'écran finit sur « Ouvrir ma classe », pas sur « on te
//  recontacte ». C'est tout ce qui a changé, et c'est tout ce qui
//  comptait.
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Input } from '@/components/Input';
import { Icon } from '@/components/Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { useKeyboard } from '@/theme/useKeyboard';
import { type } from '@/theme/typography';
import { SUBJECTS } from '@/data/subjects';
import {
  declareTeacherRole,
  fetchTeacherRequest,
  type TeacherRequest,
} from '@/lib/teacher';

export default function TeacherRequestScreen() {
  const { t, profile, refresh } = useApp();
  const { colors } = useTheme();
  const keyboard = useKeyboard();
  const router = useRouter();

  const lang = profile.lang;

  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<TeacherRequest | null>(null);

  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchTeacherRequest().then((r) => {
      if (!alive) return;
      setExisting(r);
      if (r) {
        setFullName(r.full_name);
        setContact(r.contact);
        setSubjects(r.subjects ?? []);
        setMessage(r.message ?? '');
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const toggle = (id: string) =>
    setSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  const send = async () => {
    if (fullName.trim().length < 3) return setError(t('teacher.nameNeeded'));
    if (contact.trim().length < 5) return setError(t('teacher.contactNeeded'));
    if (subjects.length === 0) return setError(t('teacher.subjectsNeeded'));

    setError('');
    setSending(true);
    const r = await declareTeacherRole({
      fullName,
      contact,
      subjects,
      schoolId: profile.schoolId,
      message,
    });
    setSending(false);
    if (!r.ok) return setError(t(`teacher.err_${r.error ?? 'echec'}`));

    // Le rôle vient d'être accordé côté serveur. On relit le profil
    // plutôt que de le supposer : c'est lui qui commande l'accès à
    // la création de classe, et le supposer serait le seul endroit
    // de l'app où l'écran devancerait la base.
    await refresh();
    setSent(true);
  };

  // ── C'est fait : professeur, tout de suite ──────────────────
  //
  // Un seul écran pour « tu viens de te déclarer » et « tu l'étais
  // déjà » : dans les deux cas la seule chose à faire ensuite est
  // d'ouvrir une classe, et c'est le bouton qu'on met sous le
  // pouce. Un écran de félicitations sans porte de sortie est un
  // cul-de-sac.
  if (sent || profile.role === 'prof') {
    return (
      <Screen>
        <Header onBack={() => router.back()} title={t('teacher.title')} />
        <Card style={{ marginTop: 20 }}>
          <View style={styles.row8}>
            <Icon name="check-circle" size={18} color={colors.accent} />
            <Text style={[type.cardTitle, { color: colors.text, flex: 1 }]}>
              {sent ? t('teacher.doneTitle') : t('teacher.alreadyTitle')}
            </Text>
          </View>
          <Text style={[type.caption, { color: colors.textSoft, marginTop: 10 }]}>
            {sent ? t('teacher.doneSub') : t('teacher.alreadySub')}
          </Text>
        </Card>

        <Button
          label={t('teacher.openClass')}
          style={{ marginTop: 20 }}
          onPress={() => router.replace('/classroom/new')}
          full
        />
        <Button
          label={t('common.back')}
          variant="ghost"
          style={{ marginTop: 8 }}
          onPress={() => router.back()}
        />
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
        <Header onBack={() => router.back()} title={t('teacher.title')} />

        <Text style={[type.body, { color: colors.textSoft, marginTop: 14 }]}>
          {t('teacher.intro')}
        </Text>

        {/* Ce que la déclaration engage. Plus « pourquoi on te
            fait attendre » — on ne fait plus attendre — mais
            « ce à quoi tu t'engages en ouvrant une salle de
            mineurs ». C'est plus court, et c'est plus vrai. */}
        <Card style={{ marginTop: 18 }}>
          <View style={styles.row8}>
            <Icon name="shield" size={13} color={colors.accent} />
            <Text style={[type.eyebrow, { color: colors.accent }]}>
              {t('teacher.whyTitle')}
            </Text>
          </View>
          <Text style={[type.caption, { color: colors.textSoft, marginTop: 8 }]}>
            {t('teacher.whyBody')}
          </Text>
        </Card>

        {/* Rôle retiré : la déclaration ne se rejoue pas, sinon la
            révocation ne servirait à rien. Le serveur refuse ; on
            le dit ici plutôt que de laisser remplir le formulaire
            pour rien. */}
        {existing?.status === 'rejected' && (
          <Card accent={colors.danger} style={{ marginTop: 16 }}>
            <Text style={[type.captionMedium, { color: colors.text }]}>
              {t('teacher.rejectedTitle')}
            </Text>
            {existing.review_note ? (
              <Text style={[type.caption, { color: colors.textSoft, marginTop: 6 }]}>
                {existing.review_note}
              </Text>
            ) : null}
            <Text style={[type.caption, { color: colors.textFaint, marginTop: 6 }]}>
              {t('teacher.rejectedSub')}
            </Text>
          </Card>
        )}

        <View style={styles.field}>
          <Input
            label={t('teacher.nameLabel')}
            placeholder={t('teacher.namePlaceholder')}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.field}>
          <Input
            label={t('teacher.contactLabel')}
            placeholder={t('teacher.contactPlaceholder')}
            value={contact}
            onChangeText={setContact}
            autoCapitalize="none"
          />
          <Text style={[type.caption, { color: colors.textFaint, marginTop: 6 }]}>
            {t('teacher.contactWhy')}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={[type.captionMedium, { color: colors.textSoft }]}>
            {t('teacher.subjectsLabel')}
          </Text>
          <View style={styles.chips}>
            {SUBJECTS.map((s) => (
              <Chip
                key={s.id}
                label={s.name[lang]}
                icon={s.icon}
                tint={s.color}
                selected={subjects.includes(s.id)}
                onPress={() => toggle(s.id)}
              />
            ))}
          </View>
        </View>

        {/* L'école vient du profil : pas de deuxième recherche. */}
        <View style={styles.field}>
          <Text style={[type.captionMedium, { color: colors.textSoft }]}>
            {t('teacher.schoolLabel')}
          </Text>
          {profile.schoolId ? (
            <Text style={[type.caption, { color: colors.textSoft, marginTop: 6 }]}>
              {t('teacher.schoolFromProfile')}
            </Text>
          ) : (
            <Pressable onPress={() => router.push('/tune-profile')} style={styles.link}>
              <Icon name="arrow-right" size={13} color={colors.accent} />
              <Text style={[type.captionMedium, { color: colors.accent }]}>
                {t('teacher.schoolMissing')}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.field}>
          <Input
            label={t('teacher.messageLabel')}
            placeholder={t('teacher.messagePlaceholder')}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
          />
        </View>

        {error !== '' && (
          <View style={styles.errorRow}>
            <Icon name="alert" size={14} color={colors.danger} />
            <Text style={[type.captionMedium, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        <Button
          label={t('teacher.send')}
          icon="send"
          full
          loading={sending || loading}
          style={{ marginTop: 24 }}
          onPress={send}
        />
      </ScrollView>
    </Screen>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} accessibilityRole="button" hitSlop={10}>
        <Icon name="arrow-left" size={20} color={colors.textSoft} />
      </Pressable>
      <Text style={[type.title, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  row8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: { marginTop: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },
});
