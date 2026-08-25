import React, { type ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { useResponsive, MAX_CONTENT_WIDTH } from '@/theme/responsive';

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
  /** Espace réservé sous le contenu pour la barre d'onglets. */
  bottomInset?: number;
}

/**
 * Conteneur de tous les écrans.
 *
 * Il porte trois responsabilités que chaque écran n'a plus à
 * gérer : le fond thémé, la zone sûre (encoches, barre système),
 * et l'adaptation à la taille de l'écran — marges resserrées sur
 * petit téléphone, colonne centrée et bornée sur tablette.
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
  bottomInset = 104,
}: ScreenProps) {
  const { colors } = useTheme();
  const { gutter, isTablet } = useResponsive();

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

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.flex, { backgroundColor: colors.bg }, style]}
    >
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: bottomInset, flexGrow: 1 }}
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
              />
            ) : undefined
          }
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
