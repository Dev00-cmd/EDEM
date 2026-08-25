// ═══════════════════════════════════════════════════════════════
//  SUIVI DU CLAVIER
//
//  Pourquoi ce fichier existe : depuis qu'Android est en mode
//  « edge-to-edge » (par défaut sur Expo SDK 52+), la fenêtre ne
//  se redimensionne PLUS quand le clavier s'ouvre. Le réglage
//  historique `adjustResize` est ignoré, et `KeyboardAvoidingView`
//  n'a aucun effet sur Android — le champ de saisie se retrouve
//  caché derrière le clavier.
//
//  La seule méthode fiable est donc de mesurer le clavier
//  nous-mêmes et de décaler l'interface d'autant.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export interface KeyboardState {
  /** Hauteur du clavier en points, 0 s'il est fermé. */
  height: number;
  visible: boolean;
}

/**
 * Donne la hauteur courante du clavier.
 *
 * Sur iOS on écoute `keyboardWillShow` : l'événement arrive avant
 * l'animation, le décalage suit donc le clavier au lieu de sauter
 * après coup. Android n'expose pas cet événement, on utilise
 * `keyboardDidShow`.
 */
export function useKeyboard(): KeyboardState {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e) => {
      setHeight(e.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return { height, visible: height > 0 };
}
