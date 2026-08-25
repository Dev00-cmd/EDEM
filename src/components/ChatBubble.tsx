import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Icon } from './Icon';
import { LogoMark } from './LogoMark';
import { useTheme } from '@/theme/ThemeContext';
import { FONTS, type } from '@/theme/typography';
import { signedUrlFor } from '@/lib/attachments';
import type { ChatMsg } from '@/store/AppContext';

// ── Mini formatage : **gras** ─────────────────────────────────

function renderFormatted(
  text: string,
  baseStyle: object,
  boldColor: string,
) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const isBold = part.startsWith('**') && part.endsWith('**');
    return (
      <Text
        key={i}
        style={
          isBold
            ? [baseStyle, { fontFamily: FONTS.bold, color: boldColor }]
            : baseStyle
        }
      >
        {isBold ? part.slice(2, -2) : part}
      </Text>
    );
  });
}

/**
 * Aperçu d'une pièce jointe.
 *
 * Le bucket est privé : on demande une URL signée pour afficher
 * l'image. Un PDF n'a pas d'aperçu, on montre son nom.
 */
function Attachment({ attachment }: { attachment: NonNullable<ChatMsg['attachment']> }) {
  const { colors } = useTheme();
  const [url, setUrl] = useState<string | null>(null);
  const isImage = attachment.type.startsWith('image/');

  useEffect(() => {
    if (!isImage) return;
    let alive = true;
    signedUrlFor(attachment.path).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [attachment.path, isImage]);

  if (!isImage) {
    return (
      <View style={[styles.fileChip, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
        <Icon name="file" size={15} color="#FFFFFF" />
        <Text style={[type.caption, { color: '#FFFFFF', flex: 1 }]} numberOfLines={1}>
          {attachment.name}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.imageWrap, { backgroundColor: colors.surfaceAlt }]}>
      {url ? (
        <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
      ) : (
        <ActivityIndicator color={colors.accent} style={styles.imageLoader} />
      )}
    </View>
  );
}

/** Bulle de conversation : l'élève à droite en bleu, le tuteur à gauche. */
export function ChatBubble({ msg }: { msg: ChatMsg }) {
  const { colors } = useTheme();
  const isUser = msg.role === 'user';
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [anim]);

  const animStyle = {
    opacity: anim,
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
    ],
  };

  if (isUser) {
    return (
      <Animated.View style={[styles.rowEnd, animStyle]}>
        <View
          style={[styles.bubble, styles.userBubble, { backgroundColor: colors.accent }]}
        >
          {msg.attachment && <Attachment attachment={msg.attachment} />}
          {msg.text.length > 0 &&
            renderFormatted(
              msg.text,
              [styles.text, { color: '#FFFFFF' }],
              '#FFFFFF',
            )}
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.rowStart, animStyle]}>
      <LogoMark size={28} />
      <View
        style={[
          styles.bubble,
          styles.tutorBubble,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {renderFormatted(
          msg.text,
          [styles.text, { color: colors.text }],
          colors.accent,
        )}
      </View>
    </Animated.View>
  );
}

/** Les trois points « Ti Pwof réfléchit… » */
export function TypingBubble({ label }: { label?: string }) {
  const { colors } = useTheme();

  const d1 = useRef(new Animated.Value(0.3)).current;
  const d2 = useRef(new Animated.Value(0.3)).current;
  const d3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const dots = [d1, d2, d3];
    const anims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 320, useNativeDriver: true }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [d1, d2, d3]);

  return (
    <View style={styles.rowStart}>
      <LogoMark size={28} />
      <View
        style={[
          styles.bubble,
          styles.tutorBubble,
          styles.typing,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {[d1, d2, d3].map((d, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { backgroundColor: colors.accent, opacity: d }]}
          />
        ))}
        {label && (
          <Text style={[type.caption, { color: colors.textFaint, marginLeft: 4 }]}>
            {label}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowEnd: { flexDirection: 'row', justifyContent: 'flex-end', marginVertical: 5 },
  rowStart: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 5,
    alignItems: 'flex-end',
    gap: 8,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  userBubble: { borderBottomRightRadius: 6 },
  tutorBubble: { borderBottomLeftRadius: 6, borderWidth: 1 },

  imageWrap: {
    width: 200,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  imageLoader: { position: 'absolute' },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    maxWidth: 220,
  },
  text: { fontFamily: FONTS.regular, fontSize: 14.8, lineHeight: 22 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 15 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
