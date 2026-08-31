// ═══════════════════════════════════════════════════════════════
//  LA BARRE D'ONGLETS, PARTAGÉE PAR LES DEUX INTERFACES
//
//  L'élève et le professeur n'ont pas les mêmes onglets, mais ils
//  ont la même barre. Elle vivait dans `app/(tabs)/_layout.tsx` ;
//  la recopier pour le professeur aurait donné deux barres à
//  corriger à chaque retouche, et elles auraient divergé au premier
//  oubli.
//
//  Elle ne connaît aucun onglet : elle lit le nom de la route dans
//  deux tables. Ajouter un onglet, c'est ajouter deux lignes.
//
//  ─── CE QUI A CHANGÉ D'APPARENCE ───────────────────────────────
//  Elle était posée à plat contre le bord, opaque, avec un trait
//  de séparation au-dessus. Elle FLOTTE désormais : détachée de
//  10 px sur les côtés, 12 px au-dessus de la zone sûre, en verre
//  flouté. Le contenu défile DESSOUS, et c'est ce défilement vu au
//  travers qui fait l'effet — pas le flou, qui sur un fond
//  immobile ne se distingue pas d'un gris.
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { useApp } from '@/store/AppContext';
import { useTheme } from '@/theme/ThemeContext';
import { FONT_CAP } from '@/theme/responsive';
import { BLUR, FLOAT, RADIUS, SHADOW } from '@/theme/theme';
import { useGlass } from '@/theme/useGlass';
import { useKeyboard } from '@/theme/useKeyboard';
import { type } from '@/theme/typography';

export interface TabStateLike {
  index: number;
  routes: { key: string; name: string }[];
}

/** Élève et professeur réunis : les noms de route ne se croisent pas. */
const ICONS: Record<string, IconName> = {
  // Élève
  index: 'home',
  path: 'chart',
  chat: 'tutor',
  quiz: 'quiz',
  board: 'award',
  profile: 'profile',
  // Professeur
  suivi: 'chart',
  devoirs: 'book',
  tuteur: 'tutor',
  compte: 'profile',
};

const LABEL_KEYS: Record<string, string> = {
  index: 'tabs.home',
  path: 'tabs.path',
  chat: 'tabs.tutor',
  quiz: 'tabs.quiz',
  board: 'tabs.board',
  profile: 'tabs.profile',
  suivi: 'tabs.suivi',
  devoirs: 'tabs.devoirs',
  tuteur: 'tabs.tutor',
  compte: 'tabs.profile',
};

/**
 * L'onglet actif est une PASTILLE PLEINE en accent, pas seulement
 * une icône colorée. C'est important au-delà du style : une couleur
 * seule n'est pas lisible pour un daltonien, une forme remplie
 * l'est. C'est le même rôle que tenait le point sous l'étiquette,
 * en plus visible — le point est donc éteint.
 */
export function TabBar({
  state,
  navigation,
  /** L'onglet d'accueil, dont le libellé change selon l'interface. */
  homeLabelKey = 'tabs.home',
}: {
  state: TabStateLike;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  homeLabelKey?: string;
}) {
  const { colors } = useTheme();
  const { t } = useApp();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboard();
  const glass = useGlass();

  // Clavier ouvert : la barre s'efface. Elle volerait de la place à
  // ce que l'élève écrit, et l'écran de conversation calcule son
  // décalage en supposant qu'elle n'est plus là.
  if (keyboard.visible) return null;

  const libelle = (route: string) =>
    route === 'index' ? homeLabelKey : (LABEL_KEYS[route] ?? 'tabs.home');

  return (
    <BlurView
      intensity={glass ? BLUR.intensity : 0}
      tint={colors.isDark ? BLUR.tint : BLUR.tintLight}
      style={[
        styles.bar,
        SHADOW.float,
        {
          bottom: Math.max(insets.bottom, 8) + FLOAT.bottom,
          // Sous le flou, un fond très dilué donne sa densité au
          // verre. Réglage d'accessibilité actif : il devient opaque.
          backgroundColor: glass ? colors.glass : colors.surface,
          borderColor: colors.glassBorder,
          borderTopColor: colors.glassHighlight,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const color = focused ? colors.accentText : colors.textSoft;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={[
              styles.tab,
              focused && {
                backgroundColor: colors.accent,
                borderTopColor: colors.glassHighlight,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={t(libelle(route.name))}
          >
            <Icon
              name={ICONS[route.name] ?? 'home'}
              size={22}
              color={color}
              strokeWidth={focused ? 2 : 1.7}
            />
            <Text
              style={[type.tabLabel, { color }]}
              numberOfLines={1}
              // Cinq étiquettes côte à côte : c'est l'endroit le plus
              // contraint de l'app, le plafond y est le plus bas.
              maxFontSizeMultiplier={FONT_CAP.tight}
            >
              {t(libelle(route.name))}
            </Text>
            {/* Le point sous l'étiquette : la pastille pleine le
                remplace, et deux marqueurs pour un même état font du
                bruit. Éteint plutôt que retiré — le retirer aurait
                touché à la structure. */}
            <View style={styles.dot} />
          </Pressable>
        );
      })}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: FLOAT.side,
    right: FLOAT.side,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: FLOAT.radius,
    borderWidth: 1,
    // Le liseré clair de l'arête supérieure : c'est ce détail, et
    // pas le flou, qui fait lire la barre comme du verre.
    borderTopWidth: 1,
    padding: 6,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingTop: 7,
    paddingBottom: 6,
    borderRadius: RADIUS.xl,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  dot: { width: 4, height: 0 },
});
