import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Chip } from '@/components/Chip';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/components/Icon';
import { ChatBubble, TypingBubble } from '@/components/ChatBubble';
import { LogoMark } from '@/components/LogoMark';
import { useApp, type ChatMsg } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import {
  attachmentError,
  pickDocument,
  pickFromCamera,
  pickFromGallery,
  uploadAttachment,
  type PickedFile,
  type UploadedFile,
} from '@/lib/attachments';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';
import { FONTS, type } from '@/theme/typography';
import { askTutor } from '@/ai/tutor';
import { studentContextOf, dailyPlan } from '@/ai/plan';
import { isBackendConfigured } from '@/config/app';
import { SUBJECTS, getSubject } from '@/data/subjects';

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    subject?: string;
    prefill?: string;
    planTopic?: string;
  }>();

  const {
    t,
    profile,
    progress,
    threads,
    addChatMessages,
    clearChat,
    studyTopic,
    touchActivity,
  } = useApp();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { colors } = useTheme();

  const [subject, setSubject] = useState<string>(params.subject ?? 'general');
  const threadKey = subject ?? 'general';
  const messages = useMemo(() => threads[threadKey] ?? [], [threads, threadKey]);

  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList<ChatMsg>>(null);
  const bootstrapped = useRef<string | null>(null);

  // Pièce jointe en attente d'envoi (photo du devoir, PDF…)
  const [pending, setPending] = useState<PickedFile | null>(null);
  const [attachBusy, setAttachBusy] = useState(false);
  const [attachError, setAttachError] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const lang = profile.lang;
  const online = isBackendConfigured();

  // Suggestions tirées du plan du jour — l'élève n'a pas à trouver
  // quoi demander devant une page vide.
  const suggestions = useMemo(() => {
    const items = dailyPlan(profile, progress, 3);
    const s = items
      .filter((i) => i.kind === 'learn')
      .map((i) =>
        lang === 'ht' ? `Esplike m « ${i.title.ht} »` : `Explique-moi « ${i.title.fr} »`,
      );
    if (subject === 'math' || subject === 'general') {
      s.push(lang === 'ht' ? 'Rezoud 2x + 3 = 9' : 'Résous 2x + 3 = 9');
    }
    return s.slice(0, 3);
  }, [profile, progress, lang, subject]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      const file = pending;

      // On peut envoyer un fichier seul : une photo de devoir se
      // suffit à elle-même comme question.
      if ((!text && !file) || typing) return;

      setInput('');
      setAttachError('');
      touchActivity();

      // Le fichier part d'abord : le message ne doit pas apparaître
      // dans la conversation si l'envoi échoue.
      let uploaded: UploadedFile | null = null;
      if (file) {
        // Sans session, impossible de déposer le fichier : on le
        // dit plutôt que de l'envoyer sans sa pièce jointe.
        if (!userId) {
          setAttachError(attachmentError('upload', lang));
          setInput(raw);
          return;
        }
        setAttachBusy(true);
        const result = await uploadAttachment(file, userId, lang);
        setAttachBusy(false);

        if (typeof result === 'string') {
          setAttachError(result);
          setInput(raw);
          return;
        }
        uploaded = result;
        setPending(null);
      }

      const userMsg: ChatMsg = {
        id: uid(),
        role: 'user',
        text: text || (lang === 'ht' ? 'Gade fichye sa a.' : 'Regarde ce fichier.'),
        ts: Date.now(),
        attachment: uploaded,
      };
      addChatMessages(threadKey, [userMsg]);
      scrollToEnd();

      if (!online) {
        addChatMessages(threadKey, [
          {
            id: uid(),
            role: 'tutor',
            text: `**${t('chat.setupTitle')}**\n\n${t('chat.setupBody')}`,
            ts: Date.now(),
          },
        ]);
        scrollToEnd();
        return;
      }

      setTyping(true);
      try {
        const history = [...messages, userMsg].slice(-12).map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.text,
        }));
        const ctx = studentContextOf(
          profile,
          progress,
          subject === 'general' ? undefined : subject,
        );
        const reply = await askTutor(
          history,
          ctx,
          { profile, subjectIds: profile.favorites },
          uploaded ? { path: uploaded.path, type: uploaded.type } : null,
        );

        addChatMessages(threadKey, [
          { id: uid(), role: 'tutor', text: reply.text, ts: Date.now() },
        ]);

        // La notion détectée par l'IA fait progresser la maîtrise.
        if (reply.subjectDetected && reply.topicDetected) {
          studyTopic(reply.subjectDetected, reply.topicDetected);
        } else if (params.planTopic && params.subject && params.subject !== 'general') {
          studyTopic(params.subject, params.planTopic);
        }
      } catch {
        addChatMessages(threadKey, [
          {
            id: uid(),
            role: 'tutor',
            text: `⚠️ **${t('chat.errorTitle')}**\n\n${t('chat.errorBody')}`,
            ts: Date.now(),
          },
        ]);
      } finally {
        setTyping(false);
        scrollToEnd();
      }
    },
    [
      typing,
      messages,
      profile,
      progress,
      subject,
      threadKey,
      online,
      params,
      pending,
      userId,
      lang,
      addChatMessages,
      studyTopic,
      touchActivity,
      scrollToEnd,
      t,
    ],
  );

  // ── Choix d'une pièce jointe ────────────────────────────────
  const choose = async (source: 'camera' | 'gallery' | 'document') => {
    setSheetOpen(false);
    setAttachError('');

    const picker =
      source === 'camera'
        ? pickFromCamera
        : source === 'gallery'
          ? pickFromGallery
          : pickDocument;

    try {
      const result = await picker(lang);
      // Chaîne vide = l'élève a annulé, ce n'est pas une erreur.
      if (result === '') return;
      if (typeof result === 'string') {
        setAttachError(result);
        return;
      }
      setPending(result);
    } catch {
      setAttachError(attachmentError('upload', lang));
    }
  };

  // Arrivée avec une question déjà écrite (accueil, parcours).
  useEffect(() => {
    if (params.prefill && bootstrapped.current !== params.prefill) {
      bootstrapped.current = params.prefill;
      if (params.subject) setSubject(params.subject);
      const timer = setTimeout(() => send(params.prefill!), 350);
      return () => clearTimeout(timer);
    }
    if (params.subject && !params.prefill) setSubject(params.subject);
  }, [params.prefill, params.subject, send]);

  useEffect(() => {
    scrollToEnd();
  }, [messages.length, typing, scrollToEnd]);

  const [askingClear, setAskingClear] = useState(false);

  const canSend = !typing && !attachBusy && (input.trim().length > 0 || !!pending);

  return (
    <Screen scroll={false} padded={false}>
      {/* ── En-tête ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <LogoMark size={38} />
        <View style={styles.flex}>
          <Text style={[type.section, { color: colors.text }]}>{t('chat.title')}</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: online ? colors.success : colors.warning },
              ]}
            />
            <Text style={[type.caption, { color: colors.textSoft }]}>
              {online ? t('chat.subtitle') : t('chat.setupTitle')}
            </Text>
          </View>
        </View>
        {messages.length > 0 && (
          <Pressable
            onPress={() => setAskingClear(true)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('chat.clear')}
          >
            <Icon name="trash" size={19} color={colors.textFaint} />
          </Pressable>
        )}
      </View>

      {/* ── Filtre par matière ──────────────────────────────── */}
      <View style={styles.chipsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip
            label={t('common.all')}
            small
            icon="sparkles"
            selected={subject === 'general'}
            onPress={() => setSubject('general')}
          />
          {SUBJECTS.map((s) => (
            <Chip
              key={s.id}
              label={s.name[lang]}
              small
              icon={s.icon}
              tint={s.color}
              selected={subject === s.id}
              onPress={() => setSubject(s.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Conversation ────────────────────────────────────── */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <ChatBubble msg={item} />}
        contentContainerStyle={styles.list}
        onContentSizeChange={scrollToEnd}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <LogoMark size={74} />
            <Text style={[type.body, styles.greeting, { color: colors.text }]}>
              {t('chat.greeting')}
            </Text>

            <View
              style={[
                styles.ruleChip,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Icon name="shield" size={13} color={colors.success} />
              <Text style={[type.caption, { color: colors.textSoft, flexShrink: 1 }]}>
                {t('chat.schoolOnly')}
              </Text>
            </View>

            {subject !== 'general' && (
              <View style={[styles.ctxBadge, { backgroundColor: colors.accentSoft }]}>
                <Text style={[type.captionMedium, { color: colors.accent }]}>
                  {getSubject(subject).name[lang]}
                </Text>
              </View>
            )}

            <Text style={[type.eyebrow, styles.tryLabel, { color: colors.textFaint }]}>
              {t('chat.tryThese')}
            </Text>

            <View style={styles.suggestWrap}>
              {suggestions.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => send(s)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.suggest,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Icon name="sparkles" size={14} color={colors.accent} />
                  <Text
                    style={[type.bodyMedium, { color: colors.text, flex: 1 }]}
                    numberOfLines={2}
                  >
                    {s}
                  </Text>
                  <Icon name="arrow-right" size={14} color={colors.textFaint} />
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListFooterComponent={typing ? <TypingBubble /> : null}
      />

      {/* ── Barre de saisie ─────────────────────────────────── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* Erreur de pièce jointe */}
        {attachError !== '' && (
          <View style={[styles.attachError, { backgroundColor: `${colors.danger}18` }]}>
            <Icon name="alert" size={14} color={colors.danger} />
            <Text style={[type.caption, { color: colors.danger, flex: 1 }]}>
              {attachError}
            </Text>
            <Pressable onPress={() => setAttachError('')} hitSlop={8}>
              <Icon name="close" size={14} color={colors.danger} />
            </Pressable>
          </View>
        )}

        {/* Aperçu du fichier prêt à partir */}
        {pending && (
          <View
            style={[
              styles.pendingBar,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {pending.isImage ? (
              <Image source={{ uri: pending.uri }} style={styles.pendingThumb} />
            ) : (
              <View style={[styles.pendingThumb, styles.pendingFile, { backgroundColor: colors.accentSoft }]}>
                <Icon name="file" size={18} color={colors.accent} />
              </View>
            )}

            <View style={styles.flex}>
              <Text style={[type.captionMedium, { color: colors.text }]} numberOfLines={1}>
                {pending.name}
              </Text>
              <Text style={[type.caption, { color: colors.textFaint }]}>
                {attachBusy ? t('chat.uploading') : t('chat.readyToSend')}
              </Text>
            </View>

            {attachBusy ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Pressable
                onPress={() => setPending(null)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
              >
                <Icon name="close" size={18} color={colors.textFaint} />
              </Pressable>
            )}
          </View>
        )}

        {/* Menu : appareil photo, galerie, document */}
        {sheetOpen && (
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {(
              [
                { id: 'camera', icon: 'camera', key: 'chat.takePhoto' },
                { id: 'gallery', icon: 'image', key: 'chat.fromGallery' },
                { id: 'document', icon: 'file', key: 'chat.chooseFile' },
              ] as const
            ).map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => choose(opt.id)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.sheetRow,
                  pressed && { backgroundColor: colors.surfaceAlt },
                ]}
              >
                <View style={[styles.sheetIcon, { backgroundColor: colors.accentSoft }]}>
                  <Icon name={opt.icon} size={17} color={colors.accent} />
                </View>
                <Text style={[type.bodyMedium, { color: colors.text }]}>
                  {t(opt.key)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.inputBar}>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: colors.shadow,
                shadowOpacity: colors.shadowOpacity,
              },
            ]}
          >
            <Pressable
              onPress={() => setSheetOpen((v) => !v)}
              disabled={typing || attachBusy}
              accessibilityRole="button"
              accessibilityLabel={t('chat.attach')}
              hitSlop={6}
              style={styles.attachBtn}
            >
              <Icon
                name={sheetOpen ? 'close' : 'paperclip'}
                size={20}
                color={sheetOpen ? colors.accent : colors.textSoft}
              />
            </Pressable>

            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={colors.textFaint}
              multiline
              style={[styles.input, { color: colors.text }]}
              onSubmitEditing={() => send(input)}
            />
            <Pressable
              onPress={() => send(input)}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel={t('chat.placeholder')}
              style={[
                styles.send,
                { backgroundColor: colors.accent, opacity: canSend ? 1 : 0.35 },
              ]}
            >
              <Icon name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={askingClear}
        icon="trash"
        destructive
        title={t('chat.clear')}
        message={t('chat.clearConfirm')}
        confirmLabel={t('chat.clear')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          clearChat(threadKey);
          setAskingClear(false);
        }}
        onCancel={() => setAskingClear(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },

  chipsRow: { height: 42 },
  chips: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },

  list: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, flexGrow: 1 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  greeting: { textAlign: 'center', marginTop: 18, maxWidth: 330 },
  ruleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 13,
    paddingVertical: 8,
    maxWidth: 340,
  },
  ctxBadge: {
    marginTop: 12,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
  },
  tryLabel: { marginTop: 26, marginBottom: 11 },
  suggestWrap: { gap: 8, width: '100%', maxWidth: 360 },
  suggest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    paddingHorizontal: 13,
  },

  attachError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    padding: 10,
    borderRadius: RADIUS.sm,
  },

  pendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 6,
    padding: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  pendingThumb: { width: 42, height: 42, borderRadius: 9 },
  pendingFile: { alignItems: 'center', justifyContent: 'center' },

  sheet: {
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  sheetIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputBar: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 21,
    maxHeight: 110,
    paddingTop: 8,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
