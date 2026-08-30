// ═══════════════════════════════════════════════════════════════
//  LE FIL DE LA CLASSE
//
//  Chacun s'affiche sous son PSEUDONYME. Le professeur, et lui
//  seul, voit le vrai prénom de ses élèves — et porte un badge qui
//  le distingue dans le fil, pour que personne ne se demande à qui
//  il parle.
//
//  Sobriété en data, parce que l'élève paie à l'unité :
//    · vingt messages, puis pagination en remontant ;
//    · les images ne se téléchargent QU'AU CLIC — on affiche le nom
//      du fichier et rien d'autre tant qu'on n'a pas demandé ;
//    · l'abonnement temps réel s'ouvre à l'arrivée sur l'écran et
//      se COUPE en sortant. Un abonnement qui tourne en
//      arrière-plan, c'est de l'argent perdu par l'élève.
// ═══════════════════════════════════════════════════════════════

import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList, Image, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Icon } from '@/components/Icon';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { useKeyboard } from '@/theme/useKeyboard';
import { RADIUS } from '@/theme/colors';
import { type } from '@/theme/typography';
import { pickFromCamera, pickFromGallery, signedUrlFor, uploadAttachment } from '@/lib/attachments';
import {
  PAGE, deleteMessage, fetchMessages, postMessage,
  subscribeToClassroom, unsubscribe, type ChatMessage,
} from '@/lib/chat';
import { fetchClassrooms, fetchRoster, type Classroom } from '@/lib/classrooms';

export default function FilDeClasse() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, profile } = useApp();
  const { session } = useAuth();
  const { colors } = useTheme();
  const keyboard = useKeyboard();
  const router = useRouter();

  const [classe, setClasse] = useState<Classroom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [noms, setNoms] = useState<Record<string, { affiche: string; vrai: string | null }>>({});
  const [texte, setTexte] = useState('');
  const [piece, setPiece] = useState<{ path: string; name: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [encore, setEncore] = useState(true);
  const [erreur, setErreur] = useState('');
  const [aSupprimer, setASupprimer] = useState<ChatMessage | null>(null);
  const canal = useRef<RealtimeChannel | null>(null);

  const prof = classe?.is_teacher ?? false;

  // ── Arrivée sur l'écran : on charge et on s'abonne ──────────
  useFocusEffect(
    useCallback(() => {
      let vivant = true;

      (async () => {
        const [classes, page, roster] = await Promise.all([
          fetchClassrooms(),
          fetchMessages(id),
          fetchRoster(id),
        ]);
        if (!vivant) return;
        setClasse(classes.find((c) => c.id === id) ?? null);
        setMessages(page);
        setEncore(page.length === PAGE);
        setNoms(
          Object.fromEntries(
            roster.map((m) => [m.user_id, { affiche: m.affiche, vrai: m.vrai_nom }]),
          ),
        );

        canal.current = subscribeToClassroom(id, (ligne) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === ligne.id)) return prev;
            const connu = noms[ligne.user_id];
            return [
              {
                id: ligne.id,
                user_id: ligne.user_id,
                affiche: connu?.affiche ?? '…',
                vrai_nom: connu?.vrai ?? null,
                is_teacher: false,
                text: ligne.text,
                attachment_path: ligne.attachment_path,
                created_at: ligne.created_at,
                flagged: false,
                mine: ligne.user_id === session?.user.id,
              },
              ...prev,
            ];
          });
        });
      })();

      // ── Sortie de l'écran : on coupe. ────────────────────────
      return () => {
        vivant = false;
        unsubscribe(canal.current);
        canal.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, session?.user.id]),
  );

  const remonter = async () => {
    if (!encore || messages.length === 0) return;
    const suite = await fetchMessages(id, messages[messages.length - 1].created_at);
    setMessages((prev) => [...prev, ...suite]);
    setEncore(suite.length === PAGE);
  };

  const joindre = async (source: 'camera' | 'galerie') => {
    const f = source === 'camera' ? await pickFromCamera(profile.lang) : await pickFromGallery(profile.lang);
    if (typeof f === 'string') return setErreur(f);
    if (!session?.user.id) return;
    setEnvoi(true);
    const up = await uploadAttachment(f, session.user.id, profile.lang, `classroom/${id}/chat`);
    setEnvoi(false);
    if (typeof up === 'string') return setErreur(up);
    setPiece({ path: up.path, name: up.name });
    setErreur('');
  };

  const envoyer = async () => {
    const propre = texte.trim();
    if (propre === '' && !piece) return;
    setEnvoi(true);
    const r = await postMessage(id, propre || '📎', piece?.path);
    setEnvoi(false);
    if (!r.ok) return setErreur(t(`fil.err_${r.error ?? 'echec'}`));
    setTexte('');
    setPiece(null);
    setErreur('');
    // Le temps réel apporte le message ; on rafraîchit quand même
    // si la socket a été refusée pour une raison quelconque.
    if (!canal.current) setMessages(await fetchMessages(id));
  };

  return (
    <Screen scroll={false} padded={false} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={10}>
          <Icon name="arrow-left" size={20} color={colors.textSoft} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[type.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {classe?.name ?? t('fil.title')}
          </Text>
          <Text style={[type.caption, { color: colors.textFaint }]}>
            {t('fil.subtitle')}
          </Text>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        inverted
        contentContainerStyle={styles.liste}
        showsVerticalScrollIndicator={false}
        onEndReached={remonter}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={[type.caption, { color: colors.textFaint, textAlign: 'center', marginTop: 40 }]}>
            {t('fil.empty')}
          </Text>
        }
        renderItem={({ item }) => (
          <Bulle
            message={item}
            prof={prof}
            onLongPress={() => {
              if (item.mine || prof) setASupprimer(item);
            }}
          />
        )}
      />

      {/* ── La barre d'écriture ────────────────────────────── */}
      <View
        style={[
          styles.barre,
          { borderColor: colors.border, backgroundColor: colors.bg, marginBottom: keyboard.height },
        ]}
      >
        {piece ? (
          <View style={[styles.piece, { borderColor: colors.border }]}>
            <Icon name="paperclip" size={12} color={colors.accent} />
            <Text style={[type.caption, { color: colors.textSoft, flex: 1 }]} numberOfLines={1}>
              {piece.name}
            </Text>
            <Pressable onPress={() => setPiece(null)} hitSlop={8} accessibilityRole="button">
              <Icon name="close" size={13} color={colors.textFaint} />
            </Pressable>
          </View>
        ) : null}

        {erreur !== '' ? (
          <Text style={[type.caption, { color: colors.danger, marginBottom: 6 }]}>{erreur}</Text>
        ) : null}

        <View style={styles.saisie}>
          <Pressable onPress={() => joindre('camera')} hitSlop={8} accessibilityRole="button">
            <Icon name="camera" size={19} color={colors.textFaint} />
          </Pressable>
          <Pressable onPress={() => joindre('galerie')} hitSlop={8} accessibilityRole="button">
            <Icon name="image" size={19} color={colors.textFaint} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Input
              placeholder={t('fil.placeholder')}
              value={texte}
              onChangeText={setTexte}
              maxLength={2000}
              multiline
            />
          </View>
          <Button label="" icon="send" size="sm" loading={envoi} onPress={envoyer} />
        </View>
      </View>

      <ConfirmDialog
        visible={aSupprimer !== null}
        title={t('fil.deleteTitle')}
        message={aSupprimer?.mine ? t('fil.deleteMine') : t('fil.deleteOther')}
        confirmLabel={t('fil.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onCancel={() => setASupprimer(null)}
        onConfirm={async () => {
          const m = aSupprimer;
          setASupprimer(null);
          if (!m) return;
          if (await deleteMessage(m.id)) {
            setMessages((prev) => prev.filter((x) => x.id !== m.id));
          }
        }}
      />
    </Screen>
  );
}

function Bulle({
  message, prof, onLongPress,
}: {
  message: ChatMessage;
  prof: boolean;
  onLongPress: () => void;
}) {
  const { t } = useApp();
  const { colors } = useTheme();
  const [image, setImage] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const voir = async () => {
    if (!message.attachment_path) return;
    setChargement(true);
    setImage(await signedUrlFor(message.attachment_path));
    setChargement(false);
  };

  const heure = new Date(message.created_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <Pressable onLongPress={onLongPress} delayLongPress={400}>
      <View style={[styles.bulle, message.mine && styles.bulleMienne]}>
        <View
          style={[
            styles.contenu,
            {
              backgroundColor: message.mine ? colors.accent : colors.surface,
              borderColor: message.mine ? colors.accent : colors.border,
            },
          ]}
        >
          {!message.mine && (
            <View style={styles.auteur}>
              <Text
                style={[type.captionMedium, { color: message.is_teacher ? colors.sky : colors.textSoft }]}
              >
                {message.affiche}
              </Text>
              {/* Le badge distingue le professeur dans le fil. */}
              {message.is_teacher && (
                <View style={[styles.badge, { backgroundColor: colors.sky }]}>
                  <Text style={styles.badgeTexte}>{t('fil.teacherBadge')}</Text>
                </View>
              )}
              {/* Le vrai prénom n'arrive du serveur qu'au professeur. */}
              {prof && message.vrai_nom ? (
                <Text style={[type.caption, { color: colors.textFaint }]}>
                  · {message.vrai_nom}
                </Text>
              ) : null}
            </View>
          )}

          <Text style={[type.body, { color: message.mine ? '#FFFFFF' : colors.text }]}>
            {message.text}
          </Text>

          {message.attachment_path ? (
            image ? (
              <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
            ) : (
              // Rien ne se télécharge tant qu'on n'a pas demandé.
              <Pressable
                onPress={voir}
                accessibilityRole="button"
                style={[styles.vignette, { borderColor: message.mine ? 'rgba(255,255,255,0.4)' : colors.border }]}
              >
                <Icon
                  name="image"
                  size={14}
                  color={message.mine ? '#FFFFFF' : colors.accent}
                />
                <Text
                  style={[
                    type.caption,
                    { color: message.mine ? 'rgba(255,255,255,0.85)' : colors.accent, flex: 1 },
                  ]}
                  numberOfLines={1}
                >
                  {chargement ? t('common.loading') : t('fil.seeImage')}
                </Text>
              </Pressable>
            )
          ) : null}

          <Text
            style={[
              type.caption,
              { color: message.mine ? 'rgba(255,255,255,0.6)' : colors.textFaint, marginTop: 4 },
            ]}
          >
            {heure}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10,
  },
  liste: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  bulle: { alignItems: 'flex-start' },
  bulleMienne: { alignItems: 'flex-end' },
  contenu: {
    maxWidth: '86%', borderWidth: 1, borderRadius: RADIUS.lg,
    paddingHorizontal: 13, paddingVertical: 9,
  },
  auteur: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  badge: { borderRadius: RADIUS.pill, paddingHorizontal: 6, paddingVertical: 1 },
  badgeTexte: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  vignette: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: RADIUS.md,
    paddingHorizontal: 9, paddingVertical: 7, marginTop: 8,
  },
  image: { width: 220, height: 160, borderRadius: RADIUS.md, marginTop: 8 },
  barre: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  piece: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderRadius: RADIUS.md,
    paddingHorizontal: 10, paddingVertical: 7, marginBottom: 8,
  },
  saisie: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
});
