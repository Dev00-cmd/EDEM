// ═══════════════════════════════════════════════════════════════
//  SUIVI DU CLAVIER
//
//  Historique de ce fichier, parce qu'il explique sa forme :
//
//  J'ai d'abord supposé qu'Android ne redimensionnait pas la
//  fenêtre (vrai en edge-to-edge), puis j'ai comparé les hauteurs
//  de fenêtre pour le deviner. Les deux ont échoué sur l'appareil
//  réel : ce comportement varie selon le constructeur, la version
//  d'Android et le mode de navigation.
//
//  On ne déduit donc plus rien. On MESURE où se trouve vraiment
//  l'élément à l'écran, et où se trouve vraiment le haut du
//  clavier. S'ils se chevauchent, on décale de l'écart exact.
//
//  Cette approche est juste par construction : elle observe le
//  rendu réel au lieu de faire un pari sur la plateforme.
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, type View } from 'react-native';

export interface KeyboardState {
  /** Hauteur brute du clavier, 0 s'il est fermé. */
  height: number;
  visible: boolean;
}

/** Suivi simple, pour masquer la barre d'onglets par exemple. */
export function useKeyboard(): KeyboardState {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e) =>
      setHeight(e.endCoordinates?.height ?? 0),
    );
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return { height, visible: height > 0 };
}

/** Marge entre le bas de l'élément et le haut du clavier. */
const GAP = 6;

export interface KeyboardShift {
  /** À appliquer en `marginBottom` (ou `bottom`) sur l'élément suivi. */
  shift: number;
  visible: boolean;
  /** À poser sur l'élément à protéger, pour qu'il puisse se mesurer. */
  ref: React.RefObject<View | null>;
}

/**
 * Remonte un élément juste au-dessus du clavier, quoi qu'il arrive.
 *
 * Fonctionnement : à l'ouverture du clavier, on demande à l'élément
 * sa position ABSOLUE à l'écran (`measureInWindow`). Le clavier,
 * lui, annonce le Y de son bord supérieur (`endCoordinates.screenY`)
 * — dans le même repère. S'il y a chevauchement, l'écart est
 * exactement ce qu'il faut remonter.
 *
 * La mesure a lieu alors que le décalage vaut encore 0 (le clavier
 * venait d'être fermé), donc on observe bien la position au repos :
 * pas de boucle où le décalage s'ajouterait à lui-même.
 */
export function useKeyboardShift(): KeyboardShift {
  const ref = useRef<View | null>(null);
  const [shift, setShift] = useState(0);
  const [visible, setVisible] = useState(false);

  const measureAgainst = useCallback((keyboardTop: number) => {
    const node = ref.current;
    if (!node || keyboardTop <= 0) return;

    node.measureInWindow((_x, y, _w, h) => {
      const bottom = y + h;
      const overlap = bottom + GAP - keyboardTop;
      // Chevauchement négatif : le système a déjà fait le travail
      // (fenêtre redimensionnée). On ne touche à rien.
      setShift(overlap > 0 ? overlap : 0);
    });
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e) => {
      setVisible(true);
      const top = e.endCoordinates?.screenY ?? 0;

      // Une première mesure tout de suite, une seconde juste après :
      // sur Android la fenêtre peut encore bouger au moment où
      // l'événement arrive, et la seconde mesure corrige la première.
      measureAgainst(top);
      setTimeout(() => measureAgainst(top), 120);
    });

    const hide = Keyboard.addListener(hideEvent, () => {
      setVisible(false);
      setShift(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [measureAgainst]);

  return { shift, visible, ref };
}
