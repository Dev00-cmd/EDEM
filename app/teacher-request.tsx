// ═══════════════════════════════════════════════════════════════
//  « JE SUIS PROFESSEUR »
//
//  L'écran est volontairement sobre et lent à remplir. Il ne
//  promet rien d'immédiat : la demande est lue par un humain, et
//  c'est écrit en toutes lettres.
//
//  Ce n'est pas de la friction gratuite. Un rôle prof accordé à la
//  légère, c'est un adulte malveillant seul avec une salle de
//  mineurs. Le moyen de vérification est obligatoire pour cette
//  raison, et pour elle seule — c'est la seule donnée de contact
//  que l'application collecte, elle ne concerne qu'un adulte, et
//  elle sert à l'appeler avant de lui confier une classe.
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
  fetchTeacherRequest,
  requestTeacherRole,
  type TeacherRequest,
} from '@/lib/teacher';

export default function TeacherRequestScreen() {
  const { t, profile } = useApp();
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
    const { ok } = await requestTeacherRole({
      fullName,
      contact,
      subjects,
      schoolId: profile.schoolId,
      message,
    });
    setSending(false);
    if (!ok) return setError(t('teacher.failed'));
    setSent(true);
  };

  // ── Déjà professeur ─────────────────────────────────────────
  if (profile.role === 'prof') {
    return (
      <Screen>
        <Header onBack={() => router.back()} title={t('teacher.title')} />
        <Card style={{ marginTop: 20 }}>
          <View style={styles.row8}>
            <Icon name="check-circle" size={18} color={colors.accent} />
            <Text style={[type.cardTitle, { color: colors.text, flex: 1 }]}>
              {t('teacher.alreadyTitle')}
            </Text>
          </View>
          <Text style={[type.caption, { color: colors.textSoft, marginTop: 10 }]}>
            {t('teacher.alreadySub')}
          </Text>
        </Card>
      </Screen>
    );
  }

  // ── Demande envoyée ─────────────────────────────────────────
  if (sent || (existing?.status === 'pending' && !error)) {
    return (
      <Screen>
        <Header onBack={() => router.back()} title={t('teacher.title')} />
        <Card style={{ marginTop: 20 }}>
          <View style={styles.row8}>
            <Icon name="clock" size={18} color={colors.sky} />
            <Text style={[type.cardTitle, { color: colors.text, flex: 1 }]}>
              {t('teacher.pendingTitle')}
            </Text>
          </View>
          <Text style={[type.caption, { color: colors.textSoft, marginTop: 10 }]}>
            {t('teacher.pendingSub')}
          </Text>
        </Card>
        <Button
          label={t('common.back')}
          variant="ghost"
          style={{ marginTop: 20 }}
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

        {/* Pourquoi c'est long, dit avant qu'on le subisse. */}
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
