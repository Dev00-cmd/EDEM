// ═══════════════════════════════════════════════════════════════
//  LES JETONS — LA SOURCE UNIQUE DE L'APPARENCE
//
//  Deux références assumées :
//
//   • TELEGRAM en thème sombre, pour la STRUCTURE. Plat, dense,
//     un seul accent. Des listes pleine largeur séparées par un
//     filet d'un pixel aligné sur le texte — pas des cartes
//     empilées qui gaspillent la moitié d'un écran de 320 dp.
//
//   • iOS 26, pour les BARRES. En-tête, onglets et zone de saisie
//     deviennent du verre flouté qui flotte au-dessus du contenu.
//
//  L'effet de verre ne vient PAS du flou : il vient de ce que le
//  contenu défile visiblement dessous. Une barre floutée posée sur
//  un fond immobile ne se distingue pas d'un aplat gris.
//
//  RÈGLE : aucun fichier de l'app ne code une couleur en dur. Il
//  lit un jeton ici, ou un rôle de `colors.ts` qui en découle.
// ═══════════════════════════════════════════════════════════════

/** Le thème sombre — celui de la maquette, celui par défaut. */
export const DARK = {
  background: '#0E1621',
  surface: '#17212B',
  elevated: '#232E3C',

  glass: 'rgba(23,33,43,0.62)',
  glassBorder: 'rgba(255,255,255,0.10)',
  glassHighlight: 'rgba(255,255,255,0.16)',
  separator: 'rgba(255,255,255,0.07)',

  /** Le seul accent de l'app : l'interactif et l'actif, rien d'autre. */
  accent: '#2E7DF7',
  accentPressed: '#2568D0',
  accentSoft: 'rgba(46,125,247,0.16)',

  bubbleOut: 'rgba(43,82,120,0.85)',
  bubbleIn: 'rgba(35,46,60,0.78)',

  success: '#4FBF87',
  warning: '#D6A22E',
  danger: '#E5484D',

  textPrimary: '#FFFFFF',
  textSecondary: '#7E8FA3',

  onAccent: '#FFFFFF',
  /**
   * Texte de second rang posé SUR un aplat saturé — la ligne de
   * détail sous le titre d'une pastille sélectionnée.
   * `textSecondary` y serait illisible : il est calibré pour le
   * fond de la page, pas pour un aplat bleu.
   */
  onAccentSoft: 'rgba(255,255,255,0.75)',
  /** Voile derrière une boîte de dialogue. */
  scrim: 'rgba(5,12,24,0.62)',
} as const;

/**
 * Le thème clair — le même système, retourné.
 *
 * La maquette est sombre, mais le sélecteur clair/sombre/système
 * existe dans le Profil et l'élève s'en sert. Le laisser sans effet
 * aurait été un bouton mort, pas un choix de design.
 */
export const LIGHT = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  elevated: '#F1F4F7',

  glass: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(0,0,0,0.08)',
  glassHighlight: 'rgba(255,255,255,0.90)',
  separator: 'rgba(0,0,0,0.08)',

  accent: '#2E7DF7',
  accentPressed: '#2568D0',
  accentSoft: 'rgba(46,125,247,0.10)',

  bubbleOut: 'rgba(46,125,247,0.92)',
  bubbleIn: '#F1F4F7',

  success: '#2F9E68',
  warning: '#B4841F',
  danger: '#D33B40',

  textPrimary: '#0E1621',
  textSecondary: '#6B7A8C',

  onAccent: '#FFFFFF',
  onAccentSoft: 'rgba(255,255,255,0.75)',
  scrim: 'rgba(5,12,24,0.45)',
} as const;

/** Les deux jeux ont exactement les mêmes clés — le compilateur y veille. */
export type Tokens = { [K in keyof typeof DARK]: string };

// ═══════════════════════════════════════════════════════════════
//  LE VERRE
// ═══════════════════════════════════════════════════════════════

/**
 * Réglages de BlurView.
 *
 * `expo-blur` est déjà dans le binaire installé — vérifié avant
 * d'écrire une ligne : un module natif absent de l'APK fait planter
 * au démarrage TOUTES les installations existantes, et une mise à
 * jour OTA ne peut pas en ajouter un.
 */
export const BLUR = {
  intensity: 50,
  tint: 'dark' as const,
  tintLight: 'light' as const,
};

/**
 * Les barres flottantes : détachées des bords, jamais collées.
 * C'est l'écart qui laisse voir le contenu défiler derrière.
 */
export const FLOAT = {
  side: 10,
  bottom: 12,
  radius: 26,
  /** Hauteur réservée sous une liste pour la barre d'onglets. */
  tabsHeight: 62,
  /** Hauteur réservée sous une liste pour la barre de saisie. */
  inputHeight: 58,
} as const;

/**
 * Le filet de séparation ne part pas du bord : il s'aligne sur le
 * texte, après l'avatar. C'est ce décalage qui fait lire une liste
 * comme une liste, et non comme des lignes empilées.
 */
export const SEPARATOR_INSET = 60;

/**
 * Réserve à laisser au bas d'une liste pour que la barre d'onglets,
 * qui FLOTTE désormais par-dessus le contenu, ne recouvre pas sa
 * dernière ligne.
 *
 * L'ancienne barre occupait sa place dans la mise en page : les
 * listes n'avaient rien à réserver, et 40 px de respiration
 * suffisaient. C'est la contrepartie exacte du flottement, et
 * l'oublier fait disparaître le dernier élément de chaque écran.
 */
export const TABS_CLEARANCE = FLOAT.tabsHeight + FLOAT.bottom + 40;

/**
 * Blanc posé sur un aplat saturé — accent, rouge, couleur de
 * matière. Il vaut la même chose dans les deux thèmes : c'est ce
 * qui permet de l'écrire dans un `StyleSheet.create`, là où le
 * thème actif n'est pas connu.
 */
export const ON_ACCENT = '#FFFFFF';
export const ON_ACCENT_SOFT = 'rgba(255,255,255,0.75)';

// ═══════════════════════════════════════════════════════════════
//  RYTHME
// ═══════════════════════════════════════════════════════════════

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

/** Rayons resserrés : le plat de Telegram, pas des cartes bombées. */
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  /** Les barres flottantes et l'onglet actif. */
  float: 26,
  pill: 999,
} as const;

/**
 * Les ombres ne sont JAMAIS teintées, et n'existent que sous ce qui
 * flotte. Une ombre bleue sous un bouton bleu était la signature de
 * l'ancien design ; elle salit un fond sombre.
 */
export const SHADOW = {
  float: {
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
} as const;
