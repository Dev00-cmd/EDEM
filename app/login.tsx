import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Icon } from '@/components/Icon';
import { LogoMark } from '@/components/LogoMark';
import { useAuth } from '@/store/AuthContext';
import { useKeyboard } from '@/theme/useKeyboard';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';
import { type } from '@/theme/typography';
import { APP_NAME, APP_TAGLINE_FR, APP_TAGLINE_HT } from '@/config/app';
import type { Lang } from '@/i18n';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const { t, profile, updateProfile } = useApp();
  const { colors } = useTheme();
  const keyboard = useKeyboard();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const lang = profile.lang;
  const isSignUp = mode === 'signup';

  const switchMode = () => {
    setMode(isSignUp ? 'signin' : 'signup');
    setError('');
    setNotice('');
  };

  const setLang = (next: Lang) => updateProfile({ lang: next });

  // ── Validation locale avant d'appeler le serveur ───────────
  const validate = (): string | null => {
    if (isSignUp && name.trim().length === 0) return t('login.nameRequired');
    if (!email.trim() || !password) return t('login.invalid');
    if (isSignUp && password.length < 6) return t('login.passwordHint');
    return null;
  };

  const submit = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setError('');
    setNotice('');
    setBusy(true);

    const result = isSignUp
      ? await signUp(email, password, name, lang)
      : await signIn(email, password, lang);

    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? '');
      return;
    }

    // Le compte est créé mais Supabase attend la confirmation
    // d'email : on le dit clairement plutôt que de laisser
    // l'élève devant un écran qui ne bouge pas.
    if (result.needsEmailConfirmation) {
      setNotice(t('login.checkEmail'));
      setMode('signin');
      setPassword('');
      return;
    }

    // Succès : l'aiguillage du layout racine prend le relais.
  };

  const forgot = async () => {
    if (!email.trim()) {
      setError(t('login.resetNeedEmail'));
      return;
    }
    setError('');
    setBusy(true);
    await sendPasswordReset(email, lang);
    setBusy(false);
    // Message volontairement neutre : il ne révèle pas si
    // l'adresse existe dans la base.
    setNotice(t('login.resetSent'));
  };

  return (
    <Screen scroll={false} padded={false} edges={['top', 'bottom']}>
      <View style={styles.flex}>
        {/* Le contenu est rallongé de la hauteur du clavier : c'est
            ce qui permet de faire défiler jusqu'au champ masqué.
            KeyboardAvoidingView ne suffit pas — en edge-to-edge
            (Android par défaut), la fenêtre ne se redimensionne
            plus et il reste sans effet. */}
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 32 + keyboard.height },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Sélecteur de langue ─────────────────────────── */}
          <View style={styles.langRow}>
            {(['fr', 'ht'] as Lang[]).map((l) => {
              const active = lang === l;
              return (
                <Pressable
                  key={l}
                  onPress={() => setLang(l)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.langChip,
                    {
                      backgroundColor: active ? colors.accentSoft : 'transparent',
                      borderColor: active ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      type.captionMedium,
                      { color: active ? colors.accent : colors.textFaint },
                    ]}
                  >
                    {l === 'fr' ? 'Français' : 'Kreyòl'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── Marque ──────────────────────────────────────── */}
          <View style={styles.brand}>
            <LogoMark size={68} />
            <Text style={[type.display, { color: colors.text, marginTop: 18 }]}>
              {isSignUp ? t('login.signUpTitle') : t('login.title')}
            </Text>
            <Text style={[type.body, { color: colors.textSoft, marginTop: 6 }]}>
              {isSignUp ? t('login.signUpSubtitle') : t('login.subtitle')}
            </Text>
          </View>

          {/* ── Message d'information ───────────────────────── */}
          {notice.length > 0 && (
            <View
              style={[
                styles.notice,
                { backgroundColor: colors.accentSoft, borderColor: colors.accent },
              ]}
            >
              <Icon name="info" size={17} color={colors.accent} />
              <Text style={[type.caption, { color: colors.text, flex: 1 }]}>
                {notice}
              </Text>
            </View>
          )}

          {/* ── Formulaire ──────────────────────────────────── */}
          <View style={styles.form}>
            {isSignUp && (
              <Input
                label={t('login.name')}
                placeholder={t('login.namePlaceholder')}
                icon="user"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
              />
            )}

            <Input
              label={t('login.email')}
              placeholder={t('login.emailPlaceholder')}
              icon="mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />

            <Input
              label={t('login.password')}
              placeholder={t('login.passwordPlaceholder')}
              icon="lock"
              value={password}
              onChangeText={setPassword}
              password
              autoCapitalize="none"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              textContentType={isSignUp ? 'newPassword' : 'password'}
              returnKeyType="go"
              onSubmitEditing={submit}
              error={error || undefined}
            />

            {isSignUp && !error && (
              <Text style={[type.caption, { color: colors.textFaint, marginLeft: 2 }]}>
                {t('login.passwordHint')}
              </Text>
            )}

            {!isSignUp && (
              <Pressable onPress={forgot} hitSlop={8} style={styles.forgot}>
                <Text style={[type.captionMedium, { color: colors.accent }]}>
                  {t('login.forgot')}
                </Text>
              </Pressable>
            )}

            <Button
              label={isSignUp ? t('login.submitSignUp') : t('login.submit')}
              onPress={submit}
              loading={busy}
              size="lg"
              full
              icon="arrow-right"
              iconRight
              style={{ marginTop: 4 }}
            />
          </View>

          {/* ── Bascule connexion / inscription ─────────────── */}
          <View style={styles.switchRow}>
            <Text style={[type.caption, { color: colors.textSoft }]}>
              {isSignUp ? t('login.haveAccount') : t('login.noAccount')}
            </Text>
            <Pressable onPress={switchMode} hitSlop={8}>
              <Text style={[type.captionMedium, { color: colors.accent }]}>
                {isSignUp ? t('login.signIn') : t('login.create')}
              </Text>
            </Pressable>
          </View>

          {/* ── Promesse produit ────────────────────────────── */}
          <View style={[styles.promise, { borderColor: colors.border }]}>
            <Icon name="shield" size={16} color={colors.success} />
            <Text style={[type.caption, { color: colors.textFaint, flex: 1 }]}>
              {t('login.schoolOnly')}
            </Text>
          </View>

          <Text style={[type.caption, styles.tagline, { color: colors.textFaint }]}>
            {APP_NAME} · {lang === 'ht' ? APP_TAGLINE_HT : APP_TAGLINE_FR}
          </Text>
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, flexGrow: 1 },

  langRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', paddingTop: 8 },
  langChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },

  brand: { alignItems: 'flex-start', marginTop: 28, marginBottom: 26 },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 13,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 18,
  },

  form: { gap: 16 },
  forgot: { alignSelf: 'flex-end', marginTop: -4 },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
  },

  promise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 'auto',
    paddingTop: 18,
    borderTopWidth: 1,
  },
  tagline: { textAlign: 'center', marginTop: 14 },
});
