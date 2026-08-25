// ═══════════════════════════════════════════════════════════════
//  MATIÈRES DU PROGRAMME HAÏTIEN
// ═══════════════════════════════════════════════════════════════

import type { Lang } from '@/i18n';
import type { IconName } from '@/components/Icon';

export interface Subject {
  id: string;
  icon: IconName; // icône du jeu Ti Pwof
  /**
   * Secondes accordées par question de quiz.
   *
   * Le temps n'est pas le même partout : une équation demande
   * de poser un calcul, une date d'histoire se sait ou ne se
   * sait pas. Un chrono uniforme punirait les matières de
   * calcul et serait trop généreux ailleurs.
   */
  seconds: number;
  grad: [string, string]; // dégradé propre à la matière
  color: string;
  name: Record<Lang, string>;
  desc: Record<Lang, string>;
}

export const SUBJECTS: Subject[] = [
  {
    id: 'math',
    seconds: 90,
    icon: 'calculator',
    color: '#3B82F6',
    grad: ['#60A5FA', '#1D4ED8'],
    name: { fr: 'Mathématiques', ht: 'Matematik' },
    desc: { fr: 'Calculs, équations, géométrie', ht: 'Kalkil, ekwasyon, jeyometri' },
  },
  {
    id: 'histoire',
    seconds: 45,
    icon: 'landmark',
    color: '#F59E0B',
    grad: ['#FBBF24', '#D97706'],
    name: { fr: 'Histoire', ht: 'Istwa' },
    desc: { fr: "L'histoire d'Haïti et du monde", ht: 'Istwa Ayiti ak mond lan' },
  },
  {
    id: 'svt',
    seconds: 45,
    icon: 'leaf',
    color: '#10B981',
    grad: ['#34D399', '#059669'],
    name: { fr: 'SVT', ht: 'SVT (Byoloji)' },
    desc: { fr: 'Le vivant, le corps, la nature', ht: 'Lavi, kò moun, lanati' },
  },
  {
    id: 'francais',
    seconds: 60,
    icon: 'book',
    color: '#8B5CF6',
    grad: ['#A78BFA', '#7C3AED'],
    name: { fr: 'Français', ht: 'Franse' },
    desc: { fr: 'Grammaire, conjugaison, lecture', ht: 'Gramè, konjigezon, lekti' },
  },
  {
    id: 'physique',
    seconds: 90,
    icon: 'atom',
    color: '#06B6D4',
    grad: ['#22D3EE', '#0891B2'],
    name: { fr: 'Physique', ht: 'Fizik' },
    desc: { fr: 'Forces, énergie, électricité', ht: 'Fòs, enèji, elektrisite' },
  },
  {
    id: 'anglais',
    seconds: 45,
    icon: 'language',
    color: '#EC4899',
    grad: ['#F472B6', '#DB2777'],
    name: { fr: 'Anglais', ht: 'Anglè' },
    desc: { fr: 'English made easy', ht: 'Pale anglè fasil' },
  },
  {
    id: 'chimie',
    seconds: 75,
    icon: 'flask',
    color: '#F97316',
    grad: ['#FB923C', '#EA580C'],
    name: { fr: 'Chimie', ht: 'Chimi' },
    desc: { fr: 'Atomes, molécules, réactions', ht: 'Atòm, molekil, reyaksyon' },
  },
  {
    id: 'creole',
    seconds: 45,
    icon: 'tutor',
    color: '#EF4444',
    grad: ['#F87171', '#DC2626'],
    name: { fr: 'Créole', ht: 'Kreyòl' },
    desc: { fr: 'Notre langue, bien écrite', ht: 'Lang nou, byen ekri' },
  },
  {
    id: 'geo',
    seconds: 45,
    icon: 'globe',
    color: '#14B8A6',
    grad: ['#2DD4BF', '#0D9488'],
    name: { fr: 'Géographie', ht: 'Jewografi' },
    desc: { fr: 'La Terre, les pays, les séismes', ht: 'Latè, peyi yo, tranblemanntè' },
  },
  {
    id: 'info',
    seconds: 45,
    icon: 'laptop',
    color: '#6366F1',
    grad: ['#818CF8', '#4F46E5'],
    name: { fr: 'Informatique', ht: 'Enfòmatik' },
    desc: { fr: "L'ordinateur pas à pas", ht: 'Òdinatè a pa etap' },
  },
];

export const getSubject = (id: string): Subject =>
  SUBJECTS.find((s) => s.id === id) ?? SUBJECTS[0];
