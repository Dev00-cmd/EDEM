// ═══════════════════════════════════════════════════════════════
//  JEU D'ICÔNES TI PWOF — dessinées à la main, pas une librairie
//
//  Toutes suivent la même grammaire, c'est ce qui fait l'unité :
//    · grille 24×24
//    · trait de 1.75 (jamais de remplissage)
//    · extrémités et angles arrondis
//    · formes géométriques simples, épaules larges
//
//  Ajouter une icône = ajouter une entrée dans PATHS. Elle héritera
//  automatiquement du style commun.
// ═══════════════════════════════════════════════════════════════

import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect, Line } from 'react-native-svg';

export type IconName =
  // navigation principale
  | 'home' | 'path' | 'tutor' | 'quiz' | 'profile'
  // actions
  | 'search' | 'bell' | 'bookmark' | 'bookmark-filled' | 'settings' | 'logout'
  | 'plus' | 'send' | 'close' | 'menu' | 'more' | 'filter' | 'edit' | 'trash'
  | 'check' | 'check-circle' | 'refresh' | 'share'
  // flèches
  | 'chevron-right' | 'chevron-left' | 'chevron-down' | 'arrow-left' | 'arrow-right'
  // pédagogie & progression
  | 'flame' | 'star' | 'sparkles' | 'book' | 'calendar' | 'chart' | 'target'
  | 'bulb' | 'flash' | 'clock' | 'award'
  // formulaire & réglages
  | 'mail' | 'lock' | 'eye' | 'eye-off' | 'user' | 'globe' | 'sun' | 'moon'
  | 'alert' | 'info' | 'shield'
  // matières
  | 'calculator' | 'landmark' | 'leaf' | 'atom' | 'flask' | 'laptop' | 'language'
  // pièces jointes
  | 'camera' | 'image' | 'file' | 'paperclip';

/**
 * Chaque icône décrit sa géométrie. Le style (couleur, épaisseur,
 * arrondis) est appliqué une seule fois, plus bas.
 */
const PATHS: Record<IconName, ReactNode> = {
  // ── Navigation ────────────────────────────────────────────────
  home: (
    <>
      <Path d="M3.5 10.2 12 3.4l8.5 6.8V19a1.8 1.8 0 0 1-1.8 1.8H5.3A1.8 1.8 0 0 1 3.5 19Z" />
      <Path d="M9.6 20.8v-6.1h4.8v6.1" />
    </>
  ),
  path: (
    <>
      <Path d="M9 4.2 3.6 6.6v13.2L9 17.4l6 2.4 5.4-2.4V4.2L15 6.6Z" />
      <Line x1="9" y1="4.2" x2="9" y2="17.4" />
      <Line x1="15" y1="6.6" x2="15" y2="19.8" />
    </>
  ),
  tutor: (
    <>
      <Path d="M20.5 12.4c0 4-3.8 7.2-8.5 7.2a9.9 9.9 0 0 1-2.6-.34L4.2 20.8l1.3-3.8a6.9 6.9 0 0 1-1.999-4.6c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z" />
      <Circle cx="8.6" cy="12.4" r="0.95" fill="currentColor" stroke="none" />
      <Circle cx="12" cy="12.4" r="0.95" fill="currentColor" stroke="none" />
      <Circle cx="15.4" cy="12.4" r="0.95" fill="currentColor" stroke="none" />
    </>
  ),
  quiz: (
    <>
      <Path d="M7.5 3.6h9v5.2a4.5 4.5 0 0 1-9 0Z" />
      <Path d="M7.5 5.2H4.8v1.6a3.2 3.2 0 0 0 2.7 3.16" />
      <Path d="M16.5 5.2h2.7v1.6a3.2 3.2 0 0 1-2.7 3.16" />
      <Line x1="12" y1="13.3" x2="12" y2="17" />
      <Path d="M8.6 20.4h6.8l-.7-3.4H9.3Z" />
    </>
  ),
  profile: (
    <>
      <Circle cx="12" cy="8.4" r="3.9" />
      <Path d="M4.8 20.4a7.2 7.2 0 0 1 14.4 0" />
    </>
  ),

  // ── Actions ───────────────────────────────────────────────────
  search: (
    <>
      <Circle cx="10.8" cy="10.8" r="6.6" />
      <Line x1="15.6" y1="15.6" x2="20.4" y2="20.4" />
    </>
  ),
  bell: (
    <>
      <Path d="M18 9.6a6 6 0 1 0-12 0c0 4.2-1.8 5.4-1.8 5.4h15.6S18 13.8 18 9.6Z" />
      <Path d="M13.7 18.6a2 2 0 0 1-3.4 0" />
    </>
  ),
  bookmark: <Path d="M6.6 3.9h10.8v16.5L12 16.2l-5.4 4.2Z" />,
  'bookmark-filled': (
    <Path
      d="M6.6 3.9h10.8v16.5L12 16.2l-5.4 4.2Z"
      fill="currentColor"
    />
  ),
  settings: (
    <>
      <Circle cx="12" cy="12" r="3.1" />
      <Path d="M19.2 14.7a1.5 1.5 0 0 0 .3 1.65l.05.06a1.8 1.8 0 1 1-2.55 2.55l-.06-.06a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.9 1.37v.18a1.8 1.8 0 1 1-3.6 0v-.09a1.5 1.5 0 0 0-.99-1.37 1.5 1.5 0 0 0-1.65.3l-.06.06a1.8 1.8 0 1 1-2.55-2.55l.06-.06a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.37-.9H4.2a1.8 1.8 0 1 1 0-3.6h.09a1.5 1.5 0 0 0 1.37-.99 1.5 1.5 0 0 0-.3-1.65l-.06-.06A1.8 1.8 0 1 1 7.85 4.8l.06.06a1.5 1.5 0 0 0 1.65.3h.07a1.5 1.5 0 0 0 .9-1.37V3.6a1.8 1.8 0 1 1 3.6 0v.09a1.5 1.5 0 0 0 .9 1.37 1.5 1.5 0 0 0 1.65-.3l.06-.06a1.8 1.8 0 1 1 2.55 2.55l-.06.06a1.5 1.5 0 0 0-.3 1.65v.07a1.5 1.5 0 0 0 1.37.9h.18a1.8 1.8 0 1 1 0 3.6h-.09a1.5 1.5 0 0 0-1.37.9Z" />
    </>
  ),
  logout: (
    <>
      <Path d="M14.4 20.4H5.7a1.8 1.8 0 0 1-1.8-1.8V5.4a1.8 1.8 0 0 1 1.8-1.8h8.7" />
      <Path d="m15.6 16.2 4.5-4.2-4.5-4.2" />
      <Line x1="20.1" y1="12" x2="9" y2="12" />
    </>
  ),
  plus: (
    <>
      <Line x1="12" y1="5.4" x2="12" y2="18.6" />
      <Line x1="5.4" y1="12" x2="18.6" y2="12" />
    </>
  ),
  send: (
    <>
      <Line x1="12" y1="19.2" x2="12" y2="5.4" />
      <Path d="m6.3 11.1 5.7-5.7 5.7 5.7" />
    </>
  ),
  close: (
    <>
      <Line x1="6.6" y1="6.6" x2="17.4" y2="17.4" />
      <Line x1="17.4" y1="6.6" x2="6.6" y2="17.4" />
    </>
  ),
  menu: (
    <>
      <Line x1="4.2" y1="7.2" x2="19.8" y2="7.2" />
      <Line x1="4.2" y1="12" x2="19.8" y2="12" />
      <Line x1="4.2" y1="16.8" x2="13.8" y2="16.8" />
    </>
  ),
  more: (
    <>
      <Circle cx="12" cy="5.4" r="1.15" fill="currentColor" stroke="none" />
      <Circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <Circle cx="12" cy="18.6" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  filter: (
    <>
      <Line x1="4.5" y1="7.5" x2="19.5" y2="7.5" />
      <Line x1="7.2" y1="12" x2="16.8" y2="12" />
      <Line x1="10.2" y1="16.5" x2="13.8" y2="16.5" />
    </>
  ),
  edit: (
    <>
      <Path d="M11.1 5.4H5.4a1.8 1.8 0 0 0-1.8 1.8v11.4a1.8 1.8 0 0 0 1.8 1.8h11.4a1.8 1.8 0 0 0 1.8-1.8v-5.7" />
      <Path d="M17.1 4.05a1.9 1.9 0 0 1 2.7 2.7L12.6 14 9 15l.9-3.6Z" />
    </>
  ),
  trash: (
    <>
      <Line x1="3.9" y1="6.9" x2="20.1" y2="6.9" />
      <Path d="M8.7 6.9V5.1a1.8 1.8 0 0 1 1.8-1.8h3a1.8 1.8 0 0 1 1.8 1.8v1.8" />
      <Path d="M17.7 6.9v12.6a1.8 1.8 0 0 1-1.8 1.8H8.1a1.8 1.8 0 0 1-1.8-1.8V6.9" />
    </>
  ),
  check: <Path d="m5.1 12.6 4.5 4.5 9.3-9.9" />,
  'check-circle': (
    <>
      <Circle cx="12" cy="12" r="8.4" />
      <Path d="m8.1 12.3 2.7 2.7 5.1-5.7" />
    </>
  ),
  refresh: (
    <>
      <Path d="M20.1 12a8.1 8.1 0 1 1-2.37-5.73" />
      <Path d="M19.8 4.2v4.5h-4.5" />
    </>
  ),
  share: (
    <>
      <Circle cx="17.4" cy="5.7" r="2.4" />
      <Circle cx="6.6" cy="12" r="2.4" />
      <Circle cx="17.4" cy="18.3" r="2.4" />
      <Line x1="8.7" y1="10.8" x2="15.3" y2="6.9" />
      <Line x1="8.7" y1="13.2" x2="15.3" y2="17.1" />
    </>
  ),

  // ── Flèches ───────────────────────────────────────────────────
  'chevron-right': <Path d="m9.6 5.4 6.6 6.6-6.6 6.6" />,
  'chevron-left': <Path d="M14.4 5.4 7.8 12l6.6 6.6" />,
  'chevron-down': <Path d="m5.4 9.6 6.6 6.6 6.6-6.6" />,
  'arrow-left': (
    <>
      <Line x1="19.2" y1="12" x2="4.8" y2="12" />
      <Path d="m10.8 5.7-6 6.3 6 6.3" />
    </>
  ),
  'arrow-right': (
    <>
      <Line x1="4.8" y1="12" x2="19.2" y2="12" />
      <Path d="m13.2 5.7 6 6.3-6 6.3" />
    </>
  ),

  // ── Pédagogie & progression ───────────────────────────────────
  flame: (
    <>
      <Path d="M12 21.3c3.5 0 6.3-2.6 6.3-5.9 0-4.5-4.2-5.6-3.3-11.1-2.4.6-5.7 3.6-5.7 7.2 0 1.35-.9 2.1-1.8 1.5-.75-.5-.9-1.5-.9-1.5a7.4 7.4 0 0 0-1.2 3.9c0 3.3 2.8 5.9 6.3 5.9Z" />
    </>
  ),
  star: (
    <Path d="m12 3.6 2.65 5.55 5.75.78-4.2 4.2 1.02 5.97L12 17.28 6.78 20.1l1.02-5.97-4.2-4.2 5.75-.78Z" />
  ),
  sparkles: (
    <>
      <Path d="m12 3.9 1.72 4.68L18.3 10.2l-4.58 1.62L12 16.5l-1.72-4.68L5.7 10.2l4.58-1.62Z" />
      <Path d="m18 15.3.86 2.16L21 18.3l-2.14.84L18 21.3l-.86-2.16L15 18.3l2.14-.84Z" />
    </>
  ),
  book: (
    <>
      <Path d="M4.2 4.8a1.8 1.8 0 0 1 1.8-1.8h6.6v16.5H6a1.8 1.8 0 0 0-1.8 1.8Z" />
      <Path d="M19.8 4.8A1.8 1.8 0 0 0 18 3h-5.4v16.5H18a1.8 1.8 0 0 1 1.8 1.8Z" />
    </>
  ),
  calendar: (
    <>
      <Rect x="3.6" y="5.4" width="16.8" height="15" rx="2.4" />
      <Line x1="3.6" y1="10.2" x2="20.4" y2="10.2" />
      <Line x1="8.4" y1="3" x2="8.4" y2="7.2" />
      <Line x1="15.6" y1="3" x2="15.6" y2="7.2" />
    </>
  ),
  chart: (
    <>
      <Line x1="4.2" y1="20.4" x2="19.8" y2="20.4" />
      <Line x1="7.5" y1="20.4" x2="7.5" y2="13.2" />
      <Line x1="12" y1="20.4" x2="12" y2="7.8" />
      <Line x1="16.5" y1="20.4" x2="16.5" y2="10.8" />
    </>
  ),
  target: (
    <>
      <Circle cx="12" cy="12" r="8.4" />
      <Circle cx="12" cy="12" r="4.8" />
      <Circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  bulb: (
    <>
      <Path d="M9 18.3a6 6 0 1 1 6 0v1.2a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 19.5Z" />
      <Line x1="9.6" y1="18.3" x2="14.4" y2="18.3" />
    </>
  ),
  flash: <Path d="M13.5 2.7 4.8 13.5h6l-.3 7.8 8.7-10.8h-6Z" />,
  clock: (
    <>
      <Circle cx="12" cy="12" r="8.4" />
      <Path d="M12 7.2V12l3.3 1.95" />
    </>
  ),
  award: (
    <>
      <Circle cx="12" cy="9" r="5.4" />
      <Path d="m8.85 13.65-1.35 7.65L12 18.9l4.5 2.4-1.35-7.65" />
    </>
  ),

  // ── Formulaire & réglages ─────────────────────────────────────
  mail: (
    <>
      <Rect x="3" y="5.4" width="18" height="13.2" rx="2.4" />
      <Path d="m3.6 7.2 7.35 5.1a1.8 1.8 0 0 0 2.1 0l7.35-5.1" />
    </>
  ),
  lock: (
    <>
      <Rect x="4.8" y="10.5" width="14.4" height="10.2" rx="2.4" />
      <Path d="M8.4 10.5V7.8a3.6 3.6 0 1 1 7.2 0v2.7" />
    </>
  ),
  eye: (
    <>
      <Path d="M2.4 12S6 5.4 12 5.4 21.6 12 21.6 12 18 18.6 12 18.6 2.4 12 2.4 12Z" />
      <Circle cx="12" cy="12" r="3.15" />
    </>
  ),
  'eye-off': (
    <>
      <Path d="M10.2 6a8.1 8.1 0 0 1 1.8-.2c6 0 9.6 6.2 9.6 6.2a15 15 0 0 1-2.7 3.4" />
      <Path d="M6.3 7.5A15 15 0 0 0 2.4 12s3.6 6.6 9.6 6.6a8.7 8.7 0 0 0 3.9-.9" />
      <Path d="M10.05 10.05a2.8 2.8 0 0 0 3.9 3.9" />
      <Line x1="3.6" y1="3.6" x2="20.4" y2="20.4" />
    </>
  ),
  user: (
    <>
      <Circle cx="12" cy="8.4" r="3.9" />
      <Path d="M4.8 20.4a7.2 7.2 0 0 1 14.4 0" />
    </>
  ),
  globe: (
    <>
      <Circle cx="12" cy="12" r="8.4" />
      <Line x1="3.6" y1="12" x2="20.4" y2="12" />
      <Path d="M12 3.6a12.9 12.9 0 0 1 0 16.8 12.9 12.9 0 0 1 0-16.8Z" />
    </>
  ),
  sun: (
    <>
      <Circle cx="12" cy="12" r="4.2" />
      <Line x1="12" y1="2.4" x2="12" y2="4.5" />
      <Line x1="12" y1="19.5" x2="12" y2="21.6" />
      <Line x1="4.8" y1="4.8" x2="6.3" y2="6.3" />
      <Line x1="17.7" y1="17.7" x2="19.2" y2="19.2" />
      <Line x1="2.4" y1="12" x2="4.5" y2="12" />
      <Line x1="19.5" y1="12" x2="21.6" y2="12" />
      <Line x1="4.8" y1="19.2" x2="6.3" y2="17.7" />
      <Line x1="17.7" y1="6.3" x2="19.2" y2="4.8" />
    </>
  ),
  moon: <Path d="M20.4 13.65A8.4 8.4 0 1 1 10.35 3.6a6.6 6.6 0 0 0 10.05 10.05Z" />,
  alert: (
    <>
      <Circle cx="12" cy="12" r="8.4" />
      <Line x1="12" y1="7.8" x2="12" y2="12.6" />
      <Circle cx="12" cy="16.2" r="1.05" fill="currentColor" stroke="none" />
    </>
  ),
  info: (
    <>
      <Circle cx="12" cy="12" r="8.4" />
      <Line x1="12" y1="11.4" x2="12" y2="16.2" />
      <Circle cx="12" cy="8.1" r="1.05" fill="currentColor" stroke="none" />
    </>
  ),
  shield: (
    <>
      <Path d="M12 3 5.1 5.7v5.4c0 4.2 2.94 7.86 6.9 9 3.96-1.14 6.9-4.8 6.9-9V5.7Z" />
      <Path d="m9 12 2.1 2.1 4.2-4.5" />
    </>
  ),

  // ── Matières ──────────────────────────────────────────────────
  calculator: (
    <>
      <Rect x="5.4" y="2.7" width="13.2" height="18.6" rx="2.4" />
      <Rect x="8.1" y="5.7" width="7.8" height="3.3" rx="0.9" />
      <Circle cx="8.7" cy="12.6" r="0.95" fill="currentColor" stroke="none" />
      <Circle cx="12" cy="12.6" r="0.95" fill="currentColor" stroke="none" />
      <Circle cx="15.3" cy="12.6" r="0.95" fill="currentColor" stroke="none" />
      <Circle cx="8.7" cy="16.8" r="0.95" fill="currentColor" stroke="none" />
      <Circle cx="12" cy="16.8" r="0.95" fill="currentColor" stroke="none" />
      <Circle cx="15.3" cy="16.8" r="0.95" fill="currentColor" stroke="none" />
    </>
  ),
  landmark: (
    <>
      <Path d="m3.6 9 8.4-5.4L20.4 9Z" />
      <Line x1="6.6" y1="11.4" x2="6.6" y2="17.4" />
      <Line x1="12" y1="11.4" x2="12" y2="17.4" />
      <Line x1="17.4" y1="11.4" x2="17.4" y2="17.4" />
      <Line x1="3.6" y1="20.4" x2="20.4" y2="20.4" />
    </>
  ),
  leaf: (
    <>
      <Path d="M20.4 4.2c0 9-5.1 13.2-9.9 13.2a5.1 5.1 0 0 1-.9-10.14c4.2-.78 8.1-.66 10.8-3.06Z" />
      <Path d="M17.4 7.2C12.6 9 8.4 13.2 6.6 20.4" />
    </>
  ),
  atom: (
    <>
      <Circle cx="12" cy="12" r="2.1" />
      <Path d="M12 5.1c4.8 0 8.7 3.09 8.7 6.9s-3.9 6.9-8.7 6.9-8.7-3.09-8.7-6.9S7.2 5.1 12 5.1Z" />
      <Path d="M8.55 6c2.4-4.16 6.24-6.38 8.55-4.95 2.31 1.43 2.25 5.94-.15 10.1s-6.24 6.38-8.55 4.95" />
    </>
  ),
  flask: (
    <>
      <Path d="M9.6 3v6.3L4.8 17.7a2.1 2.1 0 0 0 1.8 3.15h10.8a2.1 2.1 0 0 0 1.8-3.15L14.4 9.3V3" />
      <Line x1="8.4" y1="3" x2="15.6" y2="3" />
      <Line x1="7.35" y1="14.4" x2="16.65" y2="14.4" />
    </>
  ),
  laptop: (
    <>
      <Rect x="4.2" y="5.1" width="15.6" height="10.8" rx="1.8" />
      <Line x1="2.4" y1="19.2" x2="21.6" y2="19.2" />
    </>
  ),
  language: (
    <>
      <Path d="M3.6 6h8.4" />
      <Line x1="7.8" y1="3.6" x2="7.8" y2="6" />
      <Path d="M10.2 6c0 4.2-2.7 7.8-6.6 9" />
      <Path d="M5.4 9.6c0 2.4 2.4 4.5 5.4 5.4" />
      <Path d="m13.2 20.4 4.2-9.6 4.2 9.6" />
      <Line x1="14.85" y1="16.8" x2="19.95" y2="16.8" />
    </>
  ),

  // ── Pièces jointes ────────────────────────────────────────────
  camera: (
    <>
      <Path d="M3.6 8.4a1.8 1.8 0 0 1 1.8-1.8h2.1l1.5-2.4h6l1.5 2.4h2.1a1.8 1.8 0 0 1 1.8 1.8v9.6a1.8 1.8 0 0 1-1.8 1.8H5.4a1.8 1.8 0 0 1-1.8-1.8Z" />
      <Circle cx="12" cy="13.2" r="3.6" />
    </>
  ),
  image: (
    <>
      <Rect x="3.6" y="4.8" width="16.8" height="14.4" rx="2.4" />
      <Circle cx="8.7" cy="9.6" r="1.5" />
      <Path d="m3.9 16.5 4.5-4.2a1.8 1.8 0 0 1 2.4 0l5.1 4.8" />
      <Path d="m14.4 13.8 1.8-1.65a1.8 1.8 0 0 1 2.4 0l1.8 1.65" />
    </>
  ),
  file: (
    <>
      <Path d="M13.8 3.3H6.9a1.8 1.8 0 0 0-1.8 1.8v13.8a1.8 1.8 0 0 0 1.8 1.8h10.2a1.8 1.8 0 0 0 1.8-1.8V8.1Z" />
      <Path d="M13.8 3.3V8.1h5.1" />
    </>
  ),
  paperclip: (
    <Path d="M19.2 11.1 12 18.3a4.5 4.5 0 0 1-6.36-6.36l7.5-7.5a3 3 0 0 1 4.24 4.24l-7.5 7.5a1.5 1.5 0 0 1-2.12-2.12l6.9-6.9" />
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** Petite pastille d'alerte en haut à droite (notifications). */
  badge?: boolean;
  badgeColor?: string;
  /** Épaisseur du trait — 1.75 par défaut, comme les maquettes. */
  strokeWidth?: number;
}

/**
 * Icône du jeu Ti Pwof.
 *
 * `currentColor` dans les tracés est résolu par la prop `color`,
 * donc une icône s'adapte au thème sans être redessinée.
 */
export function Icon({
  name,
  size = 22,
  color = '#0D1B2A',
  badge,
  badgeColor,
  strokeWidth = 1.75,
}: IconProps) {
  const glyph = PATHS[name];

  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        color={color}
      >
        {glyph}
      </Svg>
      {badge && (
        <View
          style={{
            position: 'absolute',
            top: -1,
            right: -1,
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: size * 0.15,
            backgroundColor: badgeColor ?? '#2563EB',
          }}
        />
      )}
    </View>
  );
}
