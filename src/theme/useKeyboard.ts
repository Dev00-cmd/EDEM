// ═══════════════════════════════════════════════════════════════
//  SUIVI DU CLAVIER
//
//  Sur Android, deux comportements existent selon la version, le
//  constructeur et le mode edge-to-edge :
//
//    A. La fenêtre SE REDIMENSIONNE : elle rétrécit pour tenir
//       au-dessus du clavier. L'interface est déjà visible, il ne
//       faut RIEN décaler — sinon on la pousse deux fois.
//
//    B. La fenêtre NE BOUGE PAS (cas du edge-to-edge, par défaut
//       depuis Expo SDK 52). Le clavier recouvre le bas de l'écran
//       et c'est à nous de remonter l'interface.
//
//  Deviner lequel des deux s'applique est un pari perdu d'avance :
//  ça change d'un téléphone à l'autre. On MESURE donc.
//
//  `offset` est ce qu'il reste réellement à compenser : la hauteur
//  du clavier moins ce que la fenêtre a déjà absorbé. Il vaut 0
//  dans le cas A, la hauteur du clavier dans le cas B, et la
//  bonne valeur dans tous les cas intermédiaires.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';

export interface KeyboardState {
  /** Hauteur brute du clavier, 0 s'il est fermé. */
  height: number;
  /** Ce qu'il reste à décaler après le travail éventuel du système. */
  offset: number;
  visible: boolean;
}

export function useKeyboard(): KeyboardState {
  const [height, setHeight] = useState(0);
  const { height: windowHeight } = useWindowDimensions();

  // Hauteur de la fenêtre clavier FERMÉ : la référence à laquelle
  // on compare pour savoir si le système a rétréci la fenêtre.
  const fullHeight = useRef(windowHeight);

  useEffect(() => {
    // On ne met la référence à jour que clavier fermé, sinon on
    // enregistrerait la fenêtre déjà rétrécie et on croirait à tort
    // qu'il n'y a rien à compenser.
    if (height === 0 && windowHeight > 0) {
      fullHeight.current = windowHeight;
    }
  }, [height, windowHeight]);

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

  // Ce que la fenêtre a déjà absorbé toute seule.
  const absorbed = Math.max(0, fullHeight.current - windowHeight);

  // Ce qu'il nous reste à faire. La marge de 2 points évite qu'une
  // différence d'arrondi d'un pixel déclenche un décalage inutile.
  const remaining = height - absorbed;
  const offset = remaining > 2 ? remaining : 0;

  return { height, offset, visible: height > 0 };
}
