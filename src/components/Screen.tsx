import React, { type ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { useResponsive, MAX_CONTENT_WIDTH } from '@/theme/responsive';
import { BLUR, FLOAT } from '@/theme/theme';
import { useGlass } from '@/theme/useGlass';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Ajoute le « tirer pour rafraîchir ». */
  onRefresh?: () => void;
  refreshing?: boolean;
  /**
   * Espace réservé sous le contenu pour la barre d'onglets.
   * Par défaut : sa hauteur réelle, zone sûre comprise — elle
   * flotte par-dessus le contenu et masquerait la dernière ligne.
   */
  bottomInset?: number;
}

/**
 * Conteneur de tous les écrans.
 *
 * Il porte trois responsabilités que chaque écran n'a plus à
 * gérer : le fond thémé, la zone sûre (encoches, barre système),
 * et l'adaptation à la taille de l'écran — marges resserrées sur
 * petit téléphone, colonne centrée et bornée sur tablette.
 *
 * ─── LE VERRE DU HAUT ────────────────────────────────────────────
 * Quand c'est LUI qui tient le défilement, la marge d'encoche passe
 * du conteneur au contenu, et une bande de verre est posée par
 * dessus. Le résultat : le texte glisse SOUS la barre d'état au
 * lieu de s'arrêter dessous.
 *
 * Quand l'écran apporte son propre ScrollView (`scroll={false}` —
 * la conversation, les devoirs, les classes), la zone sûre reste
 * gérée comme avant et aucune bande n'est posée. Déplacer la marge
 * dans un défilement qu'on ne contrôle pas aurait glissé le premier
 * élément de ces écrans sous l'encoche.
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ['top'],
  style,
  contentStyle,
  onRefresh,
  refreshing,
  bottomInset,
}: ScreenProps) {
  const { colors } = useTheme();
  const { gutter, isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const glass = useGlass();

  // La zone sûre varie du simple au double entre un téléphone à
  // trois boutons et un à navigation gestuelle : une réserve figée
  // laissait la dernière ligne sous la barre sur la moitié du parc.
  const reserve =
    bottomInset ?? Math.max(insets.bottom, 8) + FLOAT.bottom + FLOAT.tabsHeight + 16;

  const inner = (
    <View
      style={[
        styles.flex,
        padded && { paddingHorizontal: gutter },
        // Sur grand écran, une colonne pleine largeur devient
        // pénible à lire : on la borne et on la centre.
        isTablet && { maxWidth: MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  if (!scroll) {
    return (
      <SafeAreaView
        edges={edges}
        style={[styles.flex, { backgroundColor: colors.bg }, style]}
      >
        {inner}
      </SafeAreaView>
    );
  }

  // La marge d'encoche descend dans le contenu : c'est ce qui laisse
  // le texte passer sous la bande de verre au défilement.
  const topEdge = edges.includes('top');

  return (
    <SafeAreaView
      edges={edges.filter((e) => e !== 'top')}
      style={[styles.flex, { backgroundColor: colors.bg }, style]}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          paddingTop: topEdge ? insets.top : 0,
          paddingBottom: reserve,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
              progressBackgroundColor={colors.surface}
              progressViewOffset={topEdge ? insets.top : 0}
            />
          ) : undefined
        }
      >
        {inner}
      </ScrollView>

      {/* La bande de verre de la barre d'état. Collée au bord haut :
          pas de liseré clair ici, il tomberait sous l'encoche et ne
          se verrait pas. C'est le filet du BAS qui la détache. */}
      {topEdge && insets.top > 0 && (
        <BlurView
          intensity={glass ? BLUR.intensity : 0}
          tint={colors.isDark ? BLUR.tint : BLUR.tintLight}
          style={[
            styles.topGlass,
            {
              height: insets.top,
              backgroundColor: glass ? colors.glass : colors.bg,
              borderBottomColor: colors.glassBorder,
            },
          ]}
          pointerEvents="none"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topGlass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: 1,
  },
});
