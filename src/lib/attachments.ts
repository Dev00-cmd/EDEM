// ═══════════════════════════════════════════════════════════════
//  PIÈCES JOINTES — photo du cahier, capture d'exercice, PDF
//
//  Parcours d'un fichier :
//    1. l'élève choisit (appareil photo, galerie ou document)
//    2. si c'est une image : on la réduit et on la convertit en JPEG
//       — indispensable, une photo brute de téléphone pèse 4-8 Mo,
//         impossible à envoyer sur un réseau haïtien lent, et le
//         HEIC de l'iPhone n'est pas lisible par le tuteur
//    3. envoi dans le bucket privé « attachments », dossier de l'élève
//    4. le tuteur lit le fichier côté serveur : il n'est jamais public
// ═══════════════════════════════════════════════════════════════

import { Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';
import { supabase } from './supabase';
import type { Lang } from '@/i18n';

/** Une pièce jointe choisie, prête à être envoyée. */
export interface PickedFile {
  uri: string;
  name: string;
  type: string; // type MIME
  /** true pour une image → on affiche un aperçu */
  isImage: boolean;
}

/** Une pièce jointe déposée sur le serveur. */
export interface UploadedFile {
  path: string; // "<user_id>/<horodatage>-<nom>"
  type: string;
  name: string;
}

// Au-delà, le tuteur refuse de lire le fichier.
export const MAX_BYTES = 5 * 1024 * 1024;

/** Côté le plus long d'une image après réduction. */
const MAX_IMAGE_SIDE = 1600;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const PDF_TYPE = 'application/pdf';

export const isSupportedType = (type: string) =>
  IMAGE_TYPES.includes(type) || type === PDF_TYPE;

// ─── Messages d'erreur ────────────────────────────────────────

export function attachmentError(kind: string, lang: Lang): string {
  const fr: Record<string, string> = {
    permissionCamera:
      "Ti Pwof a besoin de l'appareil photo pour prendre ton devoir en photo. Autorise-le dans les réglages du téléphone.",
    permissionGallery:
      "Ti Pwof a besoin d'accéder à tes photos. Autorise-le dans les réglages du téléphone.",
    tooBig: 'Ce fichier est trop lourd (5 Mo maximum).',
    badType: 'Format non accepté. Choisis une photo (JPG, PNG) ou un PDF.',
    upload: "L'envoi a échoué. Vérifie ta connexion et réessaie.",
  };
  const ht: Record<string, string> = {
    permissionCamera:
      'Ti Pwof bezwen kamera a pou pran foto devwa ou. Otorize l nan paramèt telefòn nan.',
    permissionGallery:
      'Ti Pwof bezwen wè foto ou yo. Otorize l nan paramèt telefòn nan.',
    tooBig: 'Fichye sa a twò lou (5 Mo maksimòm).',
    badType: 'Fòma sa a pa aksepte. Chwazi yon foto (JPG, PNG) oswa yon PDF.',
    upload: 'Voye a pa mache. Tcheke koneksyon ou epi eseye ankò.',
  };
  const dict = lang === 'ht' ? ht : fr;
  return dict[kind] ?? dict.upload;
}

// ─── Choix du fichier ─────────────────────────────────────────

/**
 * Le format de sortie des photos.
 *
 * WebP pèse environ 30 % de moins que le JPEG à qualité égale.
 * Sur un forfait payé au mégaoctet, ce n'est pas une optimisation
 * de confort : c'est de l'argent rendu à l'élève à chaque photo de
 * devoir, et une photo qui part au lieu d'expirer sur un réseau
 * lent.
 *
 * Android seulement, et c'est délibéré : l'encodeur WebP est
 * garanti par la plateforme Android, pas par iOS. Un iPhone reste
 * donc en JPEG — le parc haïtien est massivement Android, et un
 * format qui échoue à l'encodage coûterait la pièce jointe entière
 * pour économiser quelques kilo-octets.
 *
 * Les deux formats sont déjà acceptés partout ailleurs : `IMAGE_TYPES`
 * liste `image/webp`, `isImagePath` le reconnaît, `mimeDe` le rend,
 * et Gemini sait le lire.
 */
const SORTIE = Platform.OS === 'android'
  ? { format: SaveFormat.WEBP, type: 'image/webp', ext: 'webp' }
  : { format: SaveFormat.JPEG, type: 'image/jpeg', ext: 'jpg' };

/**
 * Réduit une image et la réencode.
 * C'est ce qui rend l'envoi possible sur un réseau lent.
 *
 * On passe par l'API contextuelle (`manipulate` → `renderAsync` →
 * `saveAsync`) et non par `manipulateAsync`, **déprécié depuis le
 * SDK 57**. Les deux vivent dans la même version du module natif
 * déjà installée : ce changement part donc en OTA sans nouvel APK.
 */
async function compressImage(uri: string): Promise<{ uri: string; type: string }> {
  const contexte = ImageManipulator.manipulate(uri);
  // `height: null` = calculé pour préserver le rapport d'origine.
  contexte.resize({ width: MAX_IMAGE_SIDE, height: null });

  const rendu = await contexte.renderAsync();
  const result = await rendu.saveAsync({ compress: 0.75, format: SORTIE.format });

  return { uri: result.uri, type: SORTIE.type };
}

/** Remplace l'extension d'un nom de fichier par celle du format de sortie. */
function renomme(nom: string): string {
  return `${nom.replace(/\.[^.]+$/, '')}.${SORTIE.ext}`;
}

/** Prend une photo avec l'appareil. */
export async function pickFromCamera(lang: Lang): Promise<PickedFile | string> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return attachmentError('permissionCamera', lang);

  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 1,
  });
  if (res.canceled || res.assets.length === 0) return '';

  const { uri, type } = await compressImage(res.assets[0].uri);
  return { uri, name: renomme(`photo-${Date.now()}`), type, isImage: true };
}

/** Choisit une image déjà dans la galerie. */
export async function pickFromGallery(lang: Lang): Promise<PickedFile | string> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return attachmentError('permissionGallery', lang);

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
  });
  if (res.canceled || res.assets.length === 0) return '';

  const asset = res.assets[0];
  const { uri, type } = await compressImage(asset.uri);
  return {
    uri,
    // Le nom SUIT le format réel. Sans ça, le HEIC d'un iPhone
    // gardait son extension d'origine sur un corps réencodé, et
    // `mimeDe` annonçait ensuite `image/heic` au lecteur du
    // téléphone pour un fichier qui n'en est pas un.
    name: renomme(asset.fileName ?? `image-${Date.now()}`),
    type,
    isImage: true,
  };
}

/** Choisit un document (PDF). */
export async function pickDocument(lang: Lang): Promise<PickedFile | string> {
  const res = await DocumentPicker.getDocumentAsync({
    type: [PDF_TYPE, 'image/*'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || res.assets.length === 0) return '';

  const asset = res.assets[0];
  const type = asset.mimeType ?? PDF_TYPE;

  if (!isSupportedType(type)) return attachmentError('badType', lang);

  // Une image passée par le sélecteur de documents mérite la même
  // réduction qu'une image de la galerie.
  if (IMAGE_TYPES.includes(type)) {
    const compressed = await compressImage(asset.uri);
    return {
      uri: compressed.uri,
      name: renomme(asset.name),
      type: compressed.type,
      isImage: true,
    };
  }

  if ((asset.size ?? 0) > MAX_BYTES) return attachmentError('tooBig', lang);

  return { uri: asset.uri, name: asset.name, type, isImage: false };
}

// ─── Envoi ────────────────────────────────────────────────────

/** Nettoie un nom de fichier pour qu'il tienne dans un chemin de stockage. */
function safeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .slice(-60);
}

/**
 * Dépose le fichier dans le dossier privé de l'élève.
 * Renvoie le chemin, ou un message d'erreur déjà traduit.
 */
export async function uploadAttachment(
  file: PickedFile,
  userId: string,
  lang: Lang,
  /**
   * Sous-dossier facultatif, à l'intérieur du dossier de l'élève.
   *
   * Sert aux remises de devoir : `classroom/{classe}/{devoir}`.
   * L'identifiant de l'élève reste le PREMIER segment — c'est sur
   * lui que reposent les policies Storage existantes. Le professeur
   * de la classe obtient un droit de lecture séparé, accordé par
   * `is_teacher_of_attachment`.
   */
  folder?: string,
): Promise<UploadedFile | string> {
  try {
    // On lit le fichier en mémoire : Supabase Storage attend des
    // octets, pas un chemin local.
    const buffer = await new File(file.uri).arrayBuffer();

    if (buffer.byteLength > MAX_BYTES) return attachmentError('tooBig', lang);

    const dossier = folder ? `${userId}/${folder}` : userId;
    const path = `${dossier}/${Date.now()}-${safeName(file.name)}`;

    const { error } = await supabase.storage
      .from('attachments')
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (error) return attachmentError('upload', lang);

    return { path, type: file.type, name: file.name };
  } catch {
    return attachmentError('upload', lang);
  }
}

/**
 * URL temporaire pour afficher une pièce jointe déjà envoyée.
 * Le bucket est privé : sans cette signature, le fichier n'est
 * lisible par personne.
 */
export async function signedUrlFor(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(path, 60 * 60); // une heure
  return error ? null : data.signedUrl;
}

/** Le nom de fichier seul, pour l'afficher. */
export const fileNameOf = (path: string) => path.split('/').pop() ?? '';

/** Une image s'affiche dans l'écran ; le reste part au lecteur. */
export const isImagePath = (path: string) =>
  /\.(jpe?g|png|webp|gif|heic)$/i.test(path);

/**
 * Le dossier où EDEM garde les fichiers téléchargés.
 *
 * `Paths.document` et non `Paths.cache` : le système vide le cache
 * dès qu'il manque de place, et un élève qui a téléchargé l'énoncé
 * la veille pour le faire sans réseau le retrouverait vide.
 */
function dossierLocal(): Directory {
  const d = new Directory(Paths.document, 'EDEM');
  if (!d.exists) d.create();
  return d;
}

/** Le fichier local correspondant à une pièce jointe, s'il existe. */
export function localFileFor(path: string): File | null {
  try {
    const f = new File(dossierLocal(), fileNameOf(path));
    return f.exists ? f : null;
  } catch {
    return null;
  }
}

/**
 * Télécharge une pièce jointe DANS L'APPLICATION.
 *
 * Le fichier atterrit dans le stockage de l'app et y reste : une
 * fois téléchargé, l'énoncé s'ouvre sans réseau. C'est tout
 * l'intérêt ici — un élève télécharge le matin à l'école, où il y a
 * du wifi, et travaille le soir chez lui où il n'y en a pas.
 *
 * La première version ouvrait simplement l'URL signée dans le
 * navigateur. Ça « marchait », mais ça jetait l'élève hors de
 * l'application sur une adresse `supabase.co` en lui demandant de
 * se débrouiller, et le fichier n'était nulle part quand le réseau
 * repartait.
 *
 * L'URL signée ne vit qu'une heure : elle sert au transfert, elle
 * n'est jamais donnée à l'élève ni gardée.
 */
export async function downloadAttachment(
  path: string,
): Promise<{ ok: boolean; file?: File; erreur?: string }> {
  const local = localFileFor(path);
  if (local) return { ok: true, file: local };

  const url = await signedUrlFor(path);
  if (!url) return { ok: false, erreur: 'lien' };

  try {
    // Destination explicite : sans elle, le nom serait déduit de
    // l'URL signée, qui traîne un jeton en paramètre.
    const cible = new File(dossierLocal(), fileNameOf(path));
    if (cible.exists) cible.delete();
    const fichier = await File.downloadFileAsync(url, cible);
    return { ok: true, file: fichier };
  } catch (e) {
    // On REND la cause au lieu de l'avaler. Un « ça ne marche pas »
    // sans message coûte un aller-retour entier à celui qui teste.
    return { ok: false, erreur: e instanceof Error ? e.message : String(e) };
  }
}

/** Le type MIME déduit de l'extension, pour l'intent Android. */
function mimeDe(nom: string): string {
  const ext = nom.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
}

/**
 * Ouvre un fichier déjà téléchargé avec le lecteur du téléphone.
 *
 * DEUX CHEMINS, ET LE PREMIER EST LE BON.
 *
 * `expo-sharing` construit l'intent correctement : il passe par le
 * FileProvider et accorde au lecteur la permission de lire le
 * fichier. C'est précisément ce que `Linking.openURL` ne fait PAS —
 * il ouvre bien une `content://`, mais sans
 * FLAG_GRANT_READ_URI_PERMISSION, et l'application d'en face se voit
 * refuser la lecture. D'où l'erreur à l'ouverture, alors que le
 * téléchargement, lui, avait réussi.
 *
 * `expo-sharing` est un module NATIF : il n'existe pas dans les APK
 * construits avant son ajout. On le charge donc à l'exécution, et
 * on retombe sur `Linking` si le module n'est pas là — sinon une
 * mise à jour OTA ferait planter au démarrage toutes les
 * installations existantes.
 */
export async function openLocalFile(file: File): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sharing = require('expo-sharing');
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: mimeDe(file.name) });
      return true;
    }
  } catch {
    // Module absent de ce binaire, ou partage refusé : on essaie
    // l'autre voie plutôt que d'abandonner.
  }

  try {
    const uri = Platform.OS === 'android' ? file.contentUri : file.uri;
    await Linking.openURL(uri);
    return true;
  } catch {
    return false;
  }
}

/** Supprime une pièce jointe (message effacé, conversation vidée). */
export async function removeAttachments(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from('attachments').remove(paths);
}
