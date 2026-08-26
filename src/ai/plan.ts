// ═══════════════════════════════════════════════════════════════
//  MOTEUR DE PARCOURS PERSONNALISÉ
//  Le plan de chaque élève découle de : sa classe, ses matières,
//  son objectif, et sa maîtrise réelle. L'IA (Claude) détecte les
//  notions travaillées en conversation → la maîtrise progresse.
// ═══════════════════════════════════════════════════════════════

import type { Profile, Progress } from '@/store/AppContext';
import { bandOfLevel, topicsFor, type Topic } from '@/data/curriculum';
import type { Lang } from '@/i18n';
import type { StudentContext } from './types';

export interface PlanItem {
  id: string; // stable, ex. "math:college:fractions"
  subjectId: string;
  kind: 'learn' | 'practice';
  topicId?: string;
  title: Record<Lang, string>;
}

export const topicKey = (subjectId: string, topicId: string) => `${subjectId}:${topicId}`;

/** Liste complète du parcours (ordre pédagogique). */
export function buildPlan(profile: Profile): PlanItem[] {
  const subjects = profile.favorites.length > 0 ? profile.favorites : ['math', 'histoire', 'svt'];
  const band = bandOfLevel(profile.level);
  const items: PlanItem[] = [];

  for (const subjectId of subjects) {
    const topics = topicsFor(subjectId, profile.level);
    topics.forEach((topic, i) => {
      items.push({
        id: topicKey(subjectId, topic.id),
        subjectId,
        kind: 'learn',
        topicId: topic.id,
        title: { fr: topic.fr, ht: topic.ht },
      });
      if ((i + 1) % 2 === 0) {
        items.push({
          id: `${subjectId}:${band}:quiz:${i}`,
          subjectId,
          kind: 'practice',
          title: { fr: 'Quiz éclair', ht: 'Kwiz rapid' },
        });
      }
    });
  }
  return items;
}

/** Une notion est « faite » quand sa maîtrise ≥ 60. */
export const isLearnDone = (p: Progress, subjectId: string, topicId: string) =>
  (p.topics[topicKey(subjectId, topicId)] ?? 0) >= 60;

/** Un entraînement est « fait » quand le meilleur score ≥ 80 %. */
export const isPracticeDone = (p: Progress, subjectId: string) => (p.quizBest[subjectId] ?? 0) >= 80;

export const isItemDone = (p: Progress, item: PlanItem) =>
  item.kind === 'learn'
    ? item.topicId
      ? isLearnDone(p, item.subjectId, item.topicId)
      : false
    : isPracticeDone(p, item.subjectId);

/** Le plan du jour : les N prochaines actions non terminées. */
export function dailyPlan(profile: Profile, progress: Progress, count = 3): PlanItem[] {
  return buildPlan(profile)
    .filter((item) => !isItemDone(progress, item))
    .slice(0, count);
}

/** Maîtrise d'une matière = moyenne des notions (0-100). */
export function masteryOf(progress: Progress, subjectId: string, level: string): number {
  const topics = topicsFor(subjectId, level);
  if (topics.length === 0) return 0;
  const sum = topics.reduce((acc, t: Topic) => acc + (progress.topics[topicKey(subjectId, t.id)] ?? 0), 0);
  return Math.round(sum / topics.length);
}

/**
 * Notions faibles (travaillées mais < 60) — priorisent le plan IA.
 *
 * `onlySubject`, quand fourni, restreint aux notions de CETTE
 * matière. Indispensable pour un quiz ou une conversation ciblée :
 * sans ce filtre, un élève faible en informatique voyait ses
 * lacunes d'informatique citées comme « notions prioritaires »
 * dans un quiz d'histoire ou de créole, et le modèle finissait
 * par y répondre au lieu de rester sur la bonne matière.
 */
export function weakTopicsOf(
  profile: Profile,
  progress: Progress,
  onlySubject?: string,
): string[] {
  const out: string[] = [];
  const subjects = onlySubject ? [onlySubject] : profile.favorites;
  for (const subjectId of subjects) {
    for (const t of topicsFor(subjectId, profile.level)) {
      const score = progress.topics[topicKey(subjectId, t.id)] ?? 0;
      if (score > 0 && score < 60) out.push(`${t[profile.lang]} (${subjectId})`);
    }
  }
  return out;
}

/** Notions solides (≥ 80). Même filtre que {@link weakTopicsOf}. */
export function strongTopicsOf(
  profile: Profile,
  progress: Progress,
  onlySubject?: string,
): string[] {
  const out: string[] = [];
  const subjects = onlySubject ? [onlySubject] : profile.favorites;
  for (const subjectId of subjects) {
    for (const t of topicsFor(subjectId, profile.level)) {
      const score = progress.topics[topicKey(subjectId, t.id)] ?? 0;
      if (score >= 80) out.push(`${t[profile.lang]} (${subjectId})`);
    }
  }
  return out;
}

/** Assemble le contexte élève envoyé à l'IA. */
export function studentContextOf(
  profile: Profile,
  progress: Progress,
  subject?: string,
): StudentContext {
  // Une matière précise (quiz, ou chat filtré) ne doit voir QUE
  // ses propres notions faibles/fortes — jamais celles des autres
  // matières favorites de l'élève.
  const scope = subject && subject !== 'general' ? subject : undefined;
  return {
    name: profile.name,
    lang: profile.lang,
    level: profile.level,
    goal: profile.goal,
    subject,
    weakTopics: weakTopicsOf(profile, progress, scope).slice(0, 4),
    strongTopics: strongTopicsOf(profile, progress, scope).slice(0, 4),
  };
}

/** Note de coach personnalisée (carte en haut du parcours). */
export function coachNote(profile: Profile, progress: Progress): string {
  const weak = weakTopicsOf(profile, progress);
  const strong = strongTopicsOf(profile, progress);
  if (profile.lang === 'ht') {
    if (weak.length > 0)
      return `Semèn sa a, ann ranfòse: ${weak.slice(0, 2).join(' ak ')}. Ou metrize deja ${strong.length} notion — kontinye konsa!`;
    return `Bonjou ${profile.name}! Men chemen ou pou semèn nan. Yon ti pa chak jou, w ap wè pwogrè a rapid.`;
  }
  if (weak.length > 0)
    return `Cette semaine, on renforce : ${weak.slice(0, 2).join(' et ')}. Tu maîtrises déjà ${strong.length} notion(s) — continue comme ça !`;
  return `Bonjour ${profile.name} ! Voici ton plan de la semaine. Un petit pas chaque jour, et les progrès viendront vite.`;
}

// ── Détection de notion (réponse IA → curriculum) ─────────────

export interface CurriculumContext {
  profile: Profile;
  subjectIds: string[];
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Rattache un « topic » renvoyé par Claude à une notion du programme.
 * Retourne l'id de la notion (ex. "fractions") ou undefined.
 */
export function matchTopicId(
  ctx: CurriculumContext,
  subjectId: string,
  raw: string,
): string | undefined {
  const topics = topicsFor(subjectId, ctx.profile.level);
  const n = normalize(raw);
  if (!n) return undefined;

  // 1) correspondance exacte sur l'id
  const exact = topics.find((t) => normalize(t.id) === n || normalize(t.id.replace(/-/g, ' ')) === n);
  if (exact) return exact.id;

  // 2) le topic contient le titre (fr ou ht) ou vice versa
  const byTitle = topics.find(
    (t) => n.includes(normalize(t.fr)) || n.includes(normalize(t.ht)) || normalize(t.fr).includes(n),
  );
  if (byTitle) return byTitle.id;

  // 3) intersection de mots significatifs (≥ 2 mots communs)
  const words = n.split(' ').filter((w) => w.length > 3);
  let best: string | undefined;
  let bestScore = 1;
  for (const t of topics) {
    const tWords = new Set([
      ...normalize(t.fr).split(' '),
      ...normalize(t.ht).split(' '),
      ...t.id.split('-'),
    ]);
    const score = words.filter((w) => tWords.has(w)).length;
    if (score > bestScore) {
      bestScore = score;
      best = t.id;
    }
  }
  return best;
}
