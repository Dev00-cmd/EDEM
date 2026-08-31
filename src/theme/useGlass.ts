// ═══════════════════════════════════════════════════════════════
//  LE VERRE, ET QUAND IL FAUT Y RENONCER
//
//  « Réduire la transparence » est un réglage d'accessibilité :
//  on l'active parce que le texte posé sur un fond flouté devient
//  illisible — vision basse, forte myopie, écran bon marché lu en
//  plein soleil. Ignorer ce réglage, c'est rendre la barre
//  d'onglets inutilisable exactement pour ceux qui l'ont demandé.
//
//  Quand il est actif, le verre est remplacé par un aplat opaque.
//  Rien d'autre ne bouge : mêmes positions, mêmes tailles, même
//  liseré. Seul le flou disparaît.
//
//  Android ne propose pas ce réglage et répond toujours « faux » :
//  le code marche là-bas sans cas particulier.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** `true` quand on a le droit de flouter. */
export function useGlass(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let alive = true;

    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then((v) => {
        if (alive) setReduce(!!v);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      (v) => setReduce(!!v),
    );

    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  return !reduce;
}
