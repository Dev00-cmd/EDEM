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
//
//  Modération (étape 8) :
//    · la charte se lit AVANT d'entrer, une fois pour toutes les
//      classes. Le serveur refuse les messages tant qu'elle n'est
//      pas acceptée : l'écran n'est pas seul à garder la porte ;
//    · un drapeau discret sur chaque message des autres. Deux
//      touches : le drapeau, puis le motif. Une protection qu'il
//      faut chercher n'en est pas une ;
//    · le professeur voit les messages masqués, les élèves non.
//      C'est la base qui le décide, pas cet écran.
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
import { CharteDialog } from '@/components/CharteDialog';
import { ReportDialog } from '@/components/ReportDialog';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { useKeyboard } from '@/theme/useKeyboard';
import { RADIUS } from '@/theme/colors';
import { type } from '@/theme/typography';
import {
  downloadAttachment, fileNameOf, isImagePath,
  pickDocument, pickFromCamera, pickFromGallery, signedUrlFor, uploadAttachment,
} from '@/lib/attachments';
import {
  PAGE, clearClassroomChat, deleteMessage, fetchMessages, postMessage,
  subscribeToClassroom, unsubscribe, type ChatMessage,
} from '@/lib/chat';
import { fetchClassrooms, fetchRoster, type Classroom } from '@/lib/classrooms';
import { reportContent, type ReportReason } from '@/lib/moderation';

export default function FilDeClasse() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, profile } = useApp();
  const { session } = useAuth();
  const { colors } = useTheme();
  const keyboard = useKeyboard();
  const router = useRouter();

  const [classe, setClasse] = useState<Classroom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [noms, setNoms] = useState<
    Record<string, { affiche: string; vrai: string | null; prof: boolean }>
  >({});
  const [texte, setTexte] = useState('');
  const [piece, setPiece] = useState<{ path: string; name: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [encore, setEncore] = useState(true);
  const [erreur, setErreur] = useState('');
  const [aSupprimer, setASupprimer] = useState<ChatMessage | null>(null);
  const [aSignaler, setASignaler] = useState<ChatMessage | null>(null);
  const [aVider, setAVider] = useState(false);
  const [info, setInfo] = useState('');
  const canal = useRef<RealtimeChannel | null>(null);

  // La charte se lit une fois, et vaut pour toutes les classes.
  const [charteVue, setCharteVue] = useState(profile.charterAcceptedAt !== null);

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
        // Le trombinoscope sert à nommer les messages qui arrivent
        // en temps réel : la socket ne transporte que la ligne
        // brute, sans jointure, donc sans pseudonyme. On garde
        // aussi qui est le professeur, pour le badge.
        setNoms(
          Object.fromEntries(
            roster.map((m) => [
              m.user_id,
              { affiche: m.affiche, vrai: m.vrai_nom, prof: m.is_teacher },
            ]),
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
                // Se lit dans le trombinoscope, où le professeur
                // figure désormais. C'était `false` en dur : un
                // message du professeur arrivait sans son badge.
                is_teacher: connu?.prof ?? false,
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

  // Le document compte autant que la photo : un professeur a
  // souvent sa feuille d'exercices déjà en PDF, et la reprendre en
  // photo serait absurde.
  const joindre = async (source: 'camera' | 'galerie' | 'document') => {
    const f =
      source === 'camera' ? await pickFromCamera(profile.lang)
      : source === 'galerie' ? await pickFromGallery(profile.lang)
      : await pickDocument(profile.lang);
    // Chaîne vide = l'utilisateur a fermé le sélecteur. Ce n'est
    // pas une erreur, et l'afficher en rouge le laisserait croire
    // que quelque chose a échoué.
    if (typeof f === 'string') return f === '' ? undefined : setErreur(f);
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
    if (!r.ok) {
      // Le serveur vérifie la charte lui aussi : s'il la refuse,
      // c'est que l'écran l'a laissée passer. On la remontre.
      if (r.error === 'charte_non_acceptee') setCharteVue(false);
      return setErreur(t(`fil.err_${r.error ?? 'echec'}`));
    }
    setTexte('');
    setPiece(null);
    setErreur('');

    // Son propre message s'affiche TOUT DE SUITE, sans attendre la
    // socket. L'ancienne version ne rafraîchissait que si le canal
    // n'existait pas — donc quand le temps réel était ouvert mais
    // muet, on écrivait dans le vide. C'est exactement ce qui est
    // arrivé au professeur, écarté de son propre fil par la RLS.
    //
    // On ajoute la ligne localement plutôt que de relire une page :
    // on connaît déjà tout ce qu'il faut, et une page de plus est
    // de la data payée par l'élève. Le temps réel rapportera le
    // même message, et l'identifiant évitera le doublon.
    const moi = session?.user.id;
    if (r.id && moi) {
      setMessages((prev) =>
        prev.some((m) => m.id === r.id)
          ? prev
          : [
              {
                id: r.id!,
                user_id: moi,
                affiche: noms[moi]?.affiche ?? profile.boardAlias ?? profile.name,
                vrai_nom: noms[moi]?.vrai ?? null,
                is_teacher: prof,
                text: propre || '📎',
                attachment_path: piece?.path ?? null,
                created_at: new Date().toISOString(),
                flagged: false,
                mine: true,
              },
              ...prev,
            ],
      );
    }
  };

  // ── Signaler ────────────────────────────────────────────────
  //
  // Le motif choisi part immédiatement : deux touches en tout. On
  // ne retire PAS le message de l'écran de celui qui signale — il
  // faut trois personnes pour le masquer, et le faire disparaître
  // ici laisserait croire que le signalement l'a effacé.
  const signaler = async (reason: ReportReason) => {
    const m = aSignaler;
    setASignaler(null);
    if (!m) return;
    const r = await reportContent('message', m.id, reason);
    setErreur('');
    setInfo('');
    if (r.ok) setInfo(t('fil.reportSent'));
    else setErreur(t(`fil.err_${r.error ?? 'echec'}`));
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

        {/* Vider le fil : le PROFESSEUR seul, et le serveur le
            vérifie. Si un élève pouvait le faire, le premier usage
            en serait d'effacer ses propres insultes avant qu'on les
            signale. */}
        {prof && messages.length > 0 && (
          <Pressable
            onPress={() => setAVider(true)}
            accessibilityRole="button"
            hitSlop={10}
          >
            <Icon name="trash" size={18} color={colors.textFaint} />
          </Pressable>
        )}
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
            onReport={() => setASignaler(item)}
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

        {info !== '' ? (
          <Text style={[type.caption, { color: colors.accent, marginBottom: 6 }]}>{info}</Text>
        ) : null}

        <View style={styles.saisie}>
          <Pressable onPress={() => joindre('camera')} hitSlop={8} accessibilityRole="button">
            <Icon name="camera" size={19} color={colors.textFaint} />
          </Pressable>
          <Pressable onPress={() => joindre('galerie')} hitSlop={8} accessibilityRole="button">
            <Icon name="image" size={19} color={colors.textFaint} />
          </Pressable>
          <Pressable onPress={() => joindre('document')} hitSlop={8} accessibilityRole="button">
            <Icon name="file" size={19} color={colors.textFaint} />
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

      <ReportDialog
        visible={aSignaler !== null}
        onPick={signaler}
        onCancel={() => setASignaler(null)}
      />

      {/* La charte, avant tout le reste. « Plus tard » ne fait pas
          entrer à moitié : on ressort de l'écran. */}
      <CharteDialog
        visible={!charteVue}
        onAccepted={() => setCharteVue(true)}
        onDecline={() => router.back()}
      />

      <ConfirmDialog
        visible={aVider}
        title={t('fil.clearTitle')}
        message={t('fil.clearBody')}
        confirmLabel={t('fil.clear')}
        cancelLabel={t('common.cancel')}
        destructive
        onCancel={() => setAVider(false)}
        onConfirm={async () => {
          setAVider(false);
          const r = await clearClassroomChat(id);
          if (r.ok) setMessages([]);
          else setErreur(t('fil.err_echec'));
        }}
      />

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
  message, prof, onReport, onLongPress,
}: {
  message: ChatMessage;
  prof: boolean;
  onReport: () => void;
  onLongPress: () => void;
}) {
  const { t } = useApp();
  const { colors } = useTheme();
  const [image, setImage] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const chemin = message.attachment_path;
  const estImage = chemin ? isImagePath(chemin) : false;

  // Une image s'affiche dans le fil ; un document part directement
  // au téléphone — on ne prévisualise pas un PDF dans une bulle.
  const voir = async () => {
    if (!chemin) return;
    if (!estImage) return void downloadAttachment(chemin);
    setChargement(true);
    setImage(await signedUrlFor(chemin));
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
              {/* Masqué aux élèves : la base ne rend ce message
                  qu'au professeur, il doit savoir pourquoi il est
                  le seul à le lire. */}
              {message.flagged && (
                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                  <Text style={styles.badgeTexte}>{t('fil.hiddenBadge')}</Text>
                </View>
              )}
            </View>
          )}

          <Text style={[type.body, { color: message.mine ? '#FFFFFF' : colors.text }]}>
            {message.text}
          </Text>

          {chemin ? (
            image ? (
              <>
                <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
                {/* Regarder une photo et la GARDER pour la revoir ce
                    soir sans réseau ne sont pas le même geste. */}
                <Pressable
                  onPress={() => downloadAttachment(chemin)}
                  accessibilityRole="button"
                  style={[
                    styles.vignette,
                    { borderColor: message.mine ? 'rgba(255,255,255,0.4)' : colors.border },
                  ]}
                >
                  <Icon
                    name="download"
                    size={13}
                    color={message.mine ? '#FFFFFF' : colors.accent}
                  />
                  <Text
                    style={[
                      type.caption,
                      { color: message.mine ? 'rgba(255,255,255,0.85)' : colors.accent, flex: 1 },
                    ]}
                  >
                    {t('fil.download')}
                  </Text>
                </Pressable>
              </>
            ) : (
              // Rien ne se télécharge tant qu'on n'a pas demandé.
              <Pressable
                onPress={voir}
                accessibilityRole="button"
                style={[styles.vignette, { borderColor: message.mine ? 'rgba(255,255,255,0.4)' : colors.border }]}
              >
                <Icon
                  name={estImage ? 'image' : 'download'}
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
                  {chargement
                    ? t('common.loading')
                    : estImage
                      ? t('fil.seeImage')
                      : fileNameOf(chemin)}
                </Text>
              </Pressable>
            )
          ) : null}

          <View style={styles.pied}>
            <Text
              style={[
                type.caption,
                { color: message.mine ? 'rgba(255,255,255,0.6)' : colors.textFaint },
              ]}
            >
              {heure}
            </Text>

            {/* Le drapeau, sur les messages des autres uniquement.
                Discret, mais toujours là : une protection qu'il
                faut chercher n'en est pas une. Une touche ici, une
                touche sur le motif, c'est fait. */}
            {!message.mine && (
              <Pressable
                onPress={onReport}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('fil.report')}
              >
                <Icon name="flag" size={13} color={colors.textFaint} />
              </Pressable>
            )}
          </View>
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
  pied: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 12, marginTop: 4,
  },
  barre: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  piece: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderRadius: RADIUS.md,
    paddingHorizontal: 10, paddingVertical: 7, marginBottom: 8,
  },
  saisie: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
});
