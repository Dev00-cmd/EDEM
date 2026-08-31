// ═══════════════════════════════════════════════════════════════
//  LE PROFIL DU PROFESSEUR
//
//  C'était un ré-export du profil élève. Un professeur y voyait donc
//  ses XP, sa série de jours d'affilée, sa classe, sa série au NS4,
//  son objectif d'examen d'État et son pseudonyme au classement. Il
//  n'a rien à faire de tout ça.
//
//  Ce qui le concerne : combien de salles il tient, combien d'élèves
//  au total, ce qui attend d'être corrigé — et la déclaration qui
//  l'engage, avec son nom et son moyen de joindre.
//
//  Son compte reste un compte d'élève, avec ses XP et son tuteur :
//  la bascule « voir comme élève » les lui rend tous, et c'est là
//  qu'il retrouve son parcours.
//
//  La moitié basse — langue, thème, mise à jour, à propos — vient de
//  `ProfileBlocks`, partagée avec l'élève. Deux copies auraient
//  divergé, et c'est le bouton de mise à jour qu'on aurait laissé
//  pourrir d'un côté.
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  BlocAPropos, BlocMiseAJour, ReglagesCommuns, Section,
} from '@/components/ProfileBlocks';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';
import { FONTS, type } from '@/theme/typography';
import { getSubject } from '@/data/subjects';
import { fetchTeacherOverview, type TeacherClass } from '@/lib/assignments';
import { fetchTeacherRequest, type TeacherRequest } from '@/lib/teacher';

export default function CompteProf() {
  const { t, profile, updateProfile, vueEleve, basculerVue } = useApp();
  const { signOut } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const lang = profile.lang;
  const [salles, setSalles] = useState<TeacherClass[]>([]);
  const [declaration, setDeclaration] = useState<TeacherRequest | null>(null);
  const [editNom, setEditNom] = useState(false);
  const [nom, setNom] = useState(profile.name);
  const [quitter, setQuitter] = useState(false);
  const [enCours, setEnCours] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchTeacherOverview().then(setSalles);
      fetchTeacherRequest().then(setDeclaration);
    }, []),
  );

  const eleves = salles.reduce((n, s) => n + s.membres, 0);
  const aCorriger = salles.reduce((n, s) => n + s.a_corriger, 0);
  // Un professeur enseigne souvent dans plusieurs établissements :
  // on compte les écoles distinctes de ses salles, pas celle du
  // profil — elle n'a plus de raison d'être remplie.
  const ecoles = new Set(salles.map((s) => s.school)).size;

  const enregistrerNom = () => {
    const propre = nom.trim();
    if (propre !== '' && propre !== profile.name) updateProfile({ name: propre });
    else setNom(profile.name);
    setEditNom(false);
  };

  return (
    <Screen>
      {/* ── Qui il est ─────────────────────────────────────── */}
      <View style={styles.identite}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={[styles.avatarLettre, { color: '#FFFFFF' }]}>
            {(profile.name.trim()[0] ?? '‧').toUpperCase()}
          </Text>
        </View>

        {editNom ? (
          <View style={styles.nomEdit}>
            <TextInput
              value={nom}
              onChangeText={setNom}
              onBlur={enregistrerNom}
              onSubmitEditing={enregistrerNom}
              autoFocus
              style={[
                styles.nomInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            />
          </View>
        ) : (
          <Pressable
            onPress={() => setEditNom(true)}
            accessibilityRole="button"
            style={styles.nomLigne}
          >
            <Text style={[type.title, { color: colors.text }]}>{profile.name || '—'}</Text>
            <Icon name="edit" size={15} color={colors.textFaint} />
          </Pressable>
        )}

        <View style={[styles.badgeProf, { backgroundColor: colors.accentSoft }]}>
          <Icon name="landmark" size={12} color={colors.accent} />
          <Text style={[type.caption, { color: colors.accent }]}>
            {t('compte.badge')}
          </Text>
        </View>
      </View>

      {/* ── Ses chiffres, pas ceux d'un élève ──────────────── */}
      <View style={[styles.chiffres, { borderColor: colors.border }]}>
        <Chiffre valeur={String(salles.length)} label={t('compte.salles')} />
        <Chiffre valeur={String(eleves)} label={t('compte.eleves')} />
        <Chiffre
          valeur={String(aCorriger)}
          label={t('compte.aCorriger')}
          tint={aCorriger > 0 ? colors.danger : undefined}
        />
      </View>

      {/* ── Sa déclaration ─────────────────────────────────── */}
      <Section label={t('compte.declaration')}>
        <Card onPress={() => router.push('/teacher-request')}>
          <Ligne
            icone="user"
            libelle={t('teacher.nameLabel')}
            valeur={declaration?.full_name ?? '—'}
          />
          <Ligne
            icone="book"
            libelle={t('teacher.subjectsLabel')}
            valeur={
              declaration?.subjects?.length
                ? declaration.subjects.map((s) => getSubject(s).name[lang]).join(', ')
                : '—'
            }
          />
          <Ligne
            icone="mail"
            libelle={t('teacher.contactLabel')}
            valeur={declaration?.contact ?? '—'}
          />
          <Ligne
            icone="landmark"
            libelle={t('compte.ecoles')}
            valeur={ecoles === 0 ? t('compte.aucuneEcole') : t('compte.nEcoles', { n: String(ecoles) })}
            dernier
          />
          <Text style={[type.caption, { color: colors.textFaint, marginTop: 12 }]}>
            {t('compte.contactPrive')}
          </Text>
        </Card>
      </Section>

      {/* ── Le point de vue ────────────────────────────────── */}
      <Section label={t('prof.vueTitre')}>
        <Card onPress={() => basculerVue(!vueEleve)}>
          <View style={styles.ligne}>
            <Icon name={vueEleve ? 'landmark' : 'user'} size={18} color={colors.accent} />
            <View style={styles.flex}>
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

      <ReglagesCommuns />
      <BlocAPropos />
      <BlocMiseAJour />

      {/* ── Compte ─────────────────────────────────────────────
          Pas de « remettre la progression à zéro » ici : c'est la
          progression d'ÉLÈVE, et elle se réinitialise depuis la vue
          élève, là où elle a un sens. */}
      <View style={styles.bas}>
        <Pressable
          onPress={() => setQuitter(true)}
          accessibilityRole="button"
          style={[styles.bouton, { borderColor: colors.danger }]}
        >
          <Icon name="logout" size={15} color={colors.danger} />
          <Text style={[type.captionMedium, { color: colors.danger }]}>
            {t('profile.signOut')}
          </Text>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={quitter}
        icon="logout"
        destructive
        title={t('profile.signOut')}
        message={t('profile.signOutConfirm')}
        confirmLabel={t('profile.signOut')}
        cancelLabel={t('common.cancel')}
        busy={enCours}
        onConfirm={async () => {
          setEnCours(true);
          await signOut().catch(() => {});
          setEnCours(false);
          setQuitter(false);
        }}
        onCancel={() => setQuitter(false)}
      />
    </Screen>
  );
}

function Chiffre({ valeur, label, tint }: { valeur: string; label: string; tint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.chiffre}>
      <Text style={[type.cardTitle, { color: tint ?? colors.text }]}>{valeur}</Text>
      <Text style={[type.caption, { color: colors.textFaint, marginTop: 2 }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function Ligne({
  icone, libelle, valeur, dernier,
}: {
  icone: 'user' | 'book' | 'mail' | 'landmark';
  libelle: string;
  valeur: string;
  dernier?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.ligne,
        !dernier && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          paddingBottom: 11,
          marginBottom: 11,
        },
      ]}
    >
      <Icon name={icone} size={16} color={colors.textFaint} />
      <View style={styles.flex}>
        <Text style={[type.caption, { color: colors.textFaint }]}>{libelle}</Text>
        <Text style={[type.captionMedium, { color: colors.text, marginTop: 1 }]}>
          {valeur}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identite: { alignItems: 'center', marginTop: 8 },
  avatar: {
    width: 74, height: 74, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLettre: { fontFamily: FONTS.extrabold, fontSize: 32 },
  nomLigne: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  nomEdit: { marginTop: 12, width: '100%' },
  nomInput: {
    fontFamily: FONTS.regular, fontSize: 16, textAlign: 'center',
    borderWidth: 1, borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  badgeProf: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4,
    marginTop: 8,
  },
  chiffres: {
    flexDirection: 'row', borderWidth: 1, borderRadius: RADIUS.lg,
    paddingVertical: 14, marginTop: 22,
  },
  chiffre: { flex: 1, alignItems: 'center' },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  bas: { marginTop: 28, gap: 10 },
  bouton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderRadius: RADIUS.md, paddingVertical: 13,
  },
});
