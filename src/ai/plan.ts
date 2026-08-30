// ═══════════════════════════════════════════════════════════════
//  MOTEUR DE PARCOURS PERSONNALISÉ
//  Le plan de chaque élève découle de : sa classe, ses matières,
//  son objectif, et sa maîtrise réelle. L'IA (Gemini) détecte les
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
  /**
   * Pour un point d'étape : les notions qu'il révise.
   *
   * Sans cette liste, tous les « Quiz éclair » d'une matière
   * étaient indiscernables — même titre, et surtout même état
   * d'avancement : un seul quiz réussi les cochait tous d'un coup
   * et faisait bondir la progression sans que l'élève ait
   * réellement avancé.
   */
  covers?: string[];
  title: Record<Lang, string>;
}

export const topicKey = (subjectId: string, topicId: string) => `${subjectId}:${topicId}`;

/**
 * Matières de repli, quand l'élève n'en a pas encore choisi.
 *
 * Le choix des matières a quitté l'inscription : on veut que
 * l'élève pose sa première question en trente secondes, pas qu'il
 * remplisse un formulaire. Il ne doit donc plus jamais tomber sur
 * un parcours vide en attendant de les choisir.
 */
export const DEFAULT_SUBJECTS = ['math', 'histoire', 'svt'];

/** Les matières sur lesquelles le parcours travaille réellement. */
export const planSubjects = (profile: Profile): string[] =>
  profile.favorites.length > 0 ? profile.favorites : DEFAULT_SUBJECTS;

/** Liste complète du parcours (ordre pédagogique). */
export function buildPlan(profile: Profile): PlanItem[] {
  const subjects = planSubjects(profile);
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

      // Un point d'étape toutes les deux notions, qui NOMME les
      // deux notions qu'il révise. « Quiz éclair » répété trois
      // fois dans la même liste n'apprenait rien à l'élève sur ce
      // qui l'attendait.
      if ((i + 1) % 2 === 0) {
        const pair = topics.slice(i - 1, i + 1);
        items.push({
          id: `${subjectId}:${band}:quiz:${i}`,
          subjectId,
          kind: 'practice',
          covers: pair.map((tp) => tp.id),
          title: {
            fr: `Quiz : ${pair.map((tp) => tp.fr).join(' · ')}`,
            ht: `Kwiz : ${pair.map((tp) => tp.ht).join(' · ')}`,
          },
        });
      }
    });
  }
  return items;
}

/** Une notion est « faite » quand sa maîtrise ≥ 60. */
export const isLearnDone = (p: Progress, subjectId: string, topicId: string) =>
  (p.topics[topicKey(subjectId, topicId)] ?? 0) >= 60;

/**
 * Un point d'étape est « fait » quand les notions qu'il révise
 * sont acquises ET qu'un quiz de la matière a été réussi.
 *
 * La double condition est là pour que les points d'étape ne
 * basculent plus tous ensemble : le premier ne dépend que des
 * deux premières notions, le suivant des deux suivantes. La
 * progression affichée suit alors le travail réel.
 */
export const isPracticeDone = (p: Progress, item: PlanItem) => {
  if ((p.quizBest[item.subjectId] ?? 0) < 80) return false;
  const covers = item.covers ?? [];
  // Sans notions rattachées, on retombe sur l'ancien critère.
  if (covers.length === 0) return true;
  return covers.every((topicId) => isLearnDone(p, item.subjectId, topicId));
};

export const isItemDone = (p: Progress, item: PlanItem) =>
  item.kind === 'learn'
    ? item.topicId
      ? isLearnDone(p, item.subjectId, item.topicId)
      : false
    : isPracticeDone(p, item);

/**
 * Le plan du jour : les N prochaines actions non terminées.
 *
 * `onlySubject` restreint à une matière — indispensable pour les
 * suggestions du tuteur : filtré sur « Mathématiques », l'élève
 * se voyait proposer « Explique-moi l'ère Duvalier ».
 */
export function dailyPlan(
  profile: Profile,
  progress: Progress,
  count = 3,
  onlySubject?: string,
): PlanItem[] {
  return buildPlan(profile)
    .filter((item) => !onlySubject || item.subjectId === onlySubject)
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
  const subjects = onlySubject ? [onlySubject] : planSubjects(profile);
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
  const subjects = onlySubject ? [onlySubject] : planSubjects(profile);
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
 * Rattache un « topic » renvoyé par l'IA à une notion du programme.
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
