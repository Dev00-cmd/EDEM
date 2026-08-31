// ═══════════════════════════════════════════════════════════════
//  MATIÈRES DU PROGRAMME HAÏTIEN
// ═══════════════════════════════════════════════════════════════

import type { Lang } from '@/i18n';
import type { IconName } from '@/components/Icon';

// Le dégradé par matière a disparu du type : plus aucune surface
// de l'app n'en affiche. Le laisser déclaré aurait invité à le
// rebrancher, et un dégradé est exactement ce que cette interface
// ne veut plus — « aucun dégradé décoratif ».
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
  color: string;
  name: Record<Lang, string>;
  desc: Record<Lang, string>;
}

export const SUBJECTS: Subject[] = [
  {
    id: 'math',
    seconds: 90,
    icon: 'calculator',
    color: '#3E8AE8',
    name: { fr: 'Mathématiques', ht: 'Matematik' },
    desc: { fr: 'Calculs, équations, géométrie', ht: 'Kalkil, ekwasyon, jeyometri' },
  },
  {
    id: 'histoire',
    seconds: 45,
    icon: 'landmark',
    color: '#D6A22E',
    name: { fr: 'Histoire', ht: 'Istwa' },
    desc: { fr: "L'histoire d'Haïti et du monde", ht: 'Istwa Ayiti ak mond lan' },
  },
  {
    id: 'svt',
    seconds: 45,
    icon: 'leaf',
    color: '#4FBF87',
    name: { fr: 'SVT', ht: 'SVT (Byoloji)' },
    desc: { fr: 'Le vivant, le corps, la nature', ht: 'Lavi, kò moun, lanati' },
  },
  {
    id: 'francais',
    seconds: 60,
    icon: 'book',
    color: '#8B5CD6',
    name: { fr: 'Français', ht: 'Franse' },
    desc: { fr: 'Grammaire, conjugaison, lecture', ht: 'Gramè, konjigezon, lekti' },
  },
  {
    id: 'physique',
    seconds: 90,
    icon: 'atom',
    color: '#3E8AE8',
    name: { fr: 'Physique', ht: 'Fizik' },
    desc: { fr: 'Forces, énergie, électricité', ht: 'Fòs, enèji, elektrisite' },
  },
  {
    id: 'anglais',
    seconds: 45,
    icon: 'language',
    color: '#E5484D',
    name: { fr: 'Anglais', ht: 'Anglè' },
    desc: { fr: 'English made easy', ht: 'Pale anglè fasil' },
  },
  {
    id: 'chimie',
    seconds: 75,
    icon: 'flask',
    color: '#D6A22E',
    name: { fr: 'Chimie', ht: 'Chimi' },
    desc: { fr: 'Atomes, molécules, réactions', ht: 'Atòm, molekil, reyaksyon' },
  },
  {
    id: 'creole',
    seconds: 45,
    icon: 'tutor',
    color: '#E5484D',
    name: { fr: 'Créole', ht: 'Kreyòl' },
    desc: { fr: 'Notre langue, bien écrite', ht: 'Lang nou, byen ekri' },
  },
  {
    id: 'geo',
    seconds: 45,
    icon: 'globe',
    color: '#4FBF87',
    name: { fr: 'Géographie', ht: 'Jewografi' },
    desc: { fr: 'La Terre, les pays, les séismes', ht: 'Latè, peyi yo, tranblemanntè' },
  },
  {
    id: 'info',
    seconds: 45,
    icon: 'laptop',
    color: '#8B5CD6',
    name: { fr: 'Informatique', ht: 'Enfòmatik' },
    desc: { fr: "L'ordinateur pas à pas", ht: 'Òdinatè a pa etap' },
  },
];

export const getSubject = (id: string): Subject =>
  SUBJECTS.find((s) => s.id === id) ?? SUBJECTS[0];
