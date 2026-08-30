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

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
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
 * Réduit et convertit une image en JPEG.
 * C'est ce qui rend l'envoi possible sur un réseau lent.
 */
async function compressImage(uri: string): Promise<{ uri: string; type: string }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_IMAGE_SIDE } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: result.uri, type: 'image/jpeg' };
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
  return { uri, name: `photo-${Date.now()}.jpg`, type, isImage: true };
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
    name: asset.fileName ?? `image-${Date.now()}.jpg`,
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
      name: asset.name,
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

/** Supprime une pièce jointe (message effacé, conversation vidée). */
export async function removeAttachments(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage.from('attachments').remove(paths);
}
