// ═══════════════════════════════════════════════════════════════
//  NOTIFICATIONS
//
//  Le professeur pose un devoir, corrige une copie, écrit dans le
//  fil. Sans ce fichier, personne ne l'apprend avant d'ouvrir
//  l'application — un devoir donné le lundi se découvrait le
//  vendredi.
//
//  ── Ce que fait ce fichier, et ce qu'il ne fait pas ───────────
//
//  Il obtient le jeton de l'appareil et le confie à la base. C'est
//  tout. Ce qui DÉCLENCHE une notification vit en SQL
//  (`supabase/migrations/20260904_notifications.sql`), avec le reste
//  des règles : un client modifié ne peut donc ni s'en envoyer, ni
//  en envoyer à quelqu'un d'autre.
//
//  ── Un module NATIF : attention à la mise à jour OTA ──────────
//
//  `expo-notifications` n'existe pas dans les APK construits avant
//  son ajout. Une mise à jour OTA qui l'importerait en tête de
//  fichier ferait planter au démarrage TOUTES les installations
//  existantes — l'app ne s'ouvrirait plus du tout, et il n'y aurait
//  plus aucun moyen de leur livrer la correction.
//
//  Le module est donc chargé À L'EXÉCUTION, dans un try/catch. Sur
//  un ancien APK, `charge()` rend null et l'application fonctionne
//  exactement comme avant, en silence. C'est le même choix que pour
//  `expo-sharing` dans `attachments.ts`.
// ═══════════════════════════════════════════════════════════════

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

/** Le canal Android. Le SQL envoie `channelId: 'default'`. */
const CANAL = 'default';

/** Le jeton obtenu pendant cette session, pour pouvoir l'oublier. */
let jetonCourant: string | null = null;

/**
 * Les deux fonctions SQL des notifications, appelées sans le typage
 * généré.
 *
 * `src/lib/database.types.ts` est REGÉNÉRÉ depuis la base
 * (`node scripts/dump_types.mjs`) : tant que la migration
 * `20260904_notifications.sql` n'est pas appliquée, ces deux noms
 * n'y figurent pas et `supabase.rpc` les refuse.
 *
 * Le transtypage est donc volontairement enfermé ICI, sur ces deux
 * appels et rien d'autre. Une fois la migration appliquée et les
 * types régénérés, il peut disparaître sans rien changer d'autre.
 */
const rpc = supabase.rpc as unknown as (
  nom: 'register_push_token' | 'forget_push_token',
  args: Record<string, unknown>,
) => Promise<{ error: { message: string } | null }>;

// Le type minimal dont on se sert. On ne peut pas importer le vrai :
// le module peut être absent du binaire.
type ModuleNotifications = typeof import('expo-notifications');

/**
 * Charge `expo-notifications` s'il est présent dans ce binaire.
 * null sur un APK antérieur à son ajout — voir l'en-tête.
 */
function charge(): ModuleNotifications | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as ModuleNotifications;
  } catch {
    return null;
  }
}

/** Vrai si cet appareil peut recevoir des notifications distantes. */
export function pushDisponible(): boolean {
  return Platform.OS !== 'web' && charge() !== null;
}

/**
 * Demande l'autorisation, obtient le jeton, et le confie à la base.
 *
 * Rend `false` sans rien dire quand ce n'est pas possible — module
 * absent, autorisation refusée, pas de `projectId`. Un élève qui
 * refuse les notifications ne doit voir aucune erreur : il a fait un
 * choix, pas une faute.
 */
export async function enregistrerPush(): Promise<boolean> {
  const N = charge();
  if (!N || Platform.OS === 'web') return false;

  try {
    // ANDROID 13+ : le canal DOIT exister avant de demander
    // l'autorisation, sinon le système n'affiche jamais la demande
    // et l'on croit à un refus de l'élève.
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CANAL, {
        name: 'EDEM',
        importance: N.AndroidImportance.DEFAULT,
        // BRAND.blue — la même que l'icône et le plugin d'app.json.
        lightColor: '#3B82F6',
      });
    }

    const actuel = await N.getPermissionsAsync();
    let accorde = actuel.granted;
    if (!accorde && actuel.canAskAgain) {
      accorde = (await N.requestPermissionsAsync()).granted;
    }
    if (!accorde) return false;

    // Deux chemins : `app.json` d'abord, la configuration du build
    // EAS ensuite. Sans identifiant de projet, Expo ne sait pas à
    // quelle application appartient le jeton.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return false;

    const { data: jeton } = await N.getExpoPushTokenAsync({ projectId });
    if (!jeton) return false;

    const { error } = await rpc('register_push_token', {
      p_token: jeton,
      p_platform: Platform.OS,
    });
    if (error) return false;

    jetonCourant = jeton;
    return true;
  } catch {
    // Un émulateur sans Google Play, un appareil hors ligne au
    // premier lancement : rien de tout cela ne mérite d'interrompre
    // l'élève.
    return false;
  }
}

/**
 * Détache cet appareil du compte, à la déconnexion.
 *
 * Indispensable, et pas seulement par propreté : en Haïti un
 * téléphone se partage entre frères et sœurs. Sans cet oubli, le
 * suivant recevrait les devoirs du précédent.
 */
export async function oublierPush(): Promise<void> {
  if (!jetonCourant) return;
  const jeton = jetonCourant;
  jetonCourant = null;
  try {
    await rpc('forget_push_token', { p_token: jeton });
  } catch {
    // La base tranchera de toute façon au prochain enregistrement :
    // le jeton est réattribué à qui se connecte.
  }
}

/**
 * Les seules destinations qu'une notification a le droit d'ouvrir.
 *
 * Le contenu d'une notification vient du réseau. Le passer tel quel
 * à `router.push` laisserait n'importe quelle route de l'app —
 * y compris un écran de professeur — s'ouvrir sur commande d'un
 * message forgé. On n'accepte donc que ces deux formes, et
 * uniquement suivies d'un identifiant.
 */
const ROUTES_PERMISES = /^\/(assignment|fil)\/[0-9a-f-]{36}$/i;

/** La route à ouvrir pour cette notification, ou null. */
export function routeDeNotification(donnees: unknown): string | null {
  if (!donnees || typeof donnees !== 'object') return null;
  const route = (donnees as { route?: unknown }).route;
  if (typeof route !== 'string') return null;
  return ROUTES_PERMISES.test(route) ? route : null;
}

/**
 * Branche l'affichage en premier plan et l'ouverture au toucher.
 *
 * `ouvrir` reçoit la route validée. Rend une fonction de nettoyage,
 * ou une fonction vide si le module n'est pas là.
 */
export function ecouterNotifications(ouvrir: (route: string) => void): () => void {
  const N = charge();
  if (!N) return () => {};

  try {
    // Sans ce réglage, une notification reçue pendant que l'élève
    // utilise l'app n'apparaît nulle part : elle est livrée, et il
    // ne la voit jamais.
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // L'app a été LANCÉE en touchant une notification : l'événement
    // est déjà passé, il n'y a plus d'écouteur pour l'attraper.
    const dernier = N.getLastNotificationResponse();
    if (dernier?.notification) {
      const route = routeDeNotification(dernier.notification.request.content.data);
      if (route) ouvrir(route);
    }

    const abonnement = N.addNotificationResponseReceivedListener((reponse) => {
      const route = routeDeNotification(reponse.notification.request.content.data);
      if (route) ouvrir(route);
    });

    return () => abonnement.remove();
  } catch {
    return () => {};
  }
}
