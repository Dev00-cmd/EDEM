import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS } from '@/theme/colors';

/**
 * Le logo d'EDUCARE, la structure derrière Ti Pwof.
 *
 * Affiché dans l'en-tête de l'accueil : c'est la signature de
 * l'organisation, là où l'élève ouvre l'app chaque jour.
 *
 * L'image d'origine est un carré plein (bleu #19479F, sans coins
 * arrondis) : on l'arrondit ici via le conteneur, pour qu'elle
 * s'accorde au reste de l'interface sans retoucher le fichier
 * de marque.
 */
export function EducareMark({ size = 44 }: { size?: number }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: size * 0.26,
          // Une bordure très fine détache le bleu du logo du bleu
          // nuit du fond, sans jamais dominer la marque.
          borderColor: colors.border,
        },
      ]}
    >
      <Image
        source={require('../../assets/educare-logo.png')}
        style={styles.image}
        resizeMode="cover"
        accessibilityLabel="EDUCARE"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  image: { width: '100%', height: '100%' },
});
