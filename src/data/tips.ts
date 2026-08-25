// ═══════════════════════════════════════════════════════════════
//  ASTUCES DU JOUR (affichées sur l'accueil, une par jour)
// ═══════════════════════════════════════════════════════════════

import type { Lang } from '@/i18n';

export const TIPS: Record<Lang, string>[] = [
  {
    fr: "Réexplique la leçon à voix haute comme si tu l'enseignais à un ami : c'est la meilleure façon de vérifier que tu as vraiment compris.",
    ht: 'Eksplike leson an byen fò tankou w ap montre yon zanmi: se pi bon fason pou w wè si w konprann vre.',
  },
  {
    fr: 'Révise 15 minutes chaque jour plutôt que 3 heures la veille de l’examen. Ta mémoire préfère les petites doses !',
    ht: 'Etidye 15 minit chak jou pase 3 èdtan vey egzamen an. Memwa ou renmen ti doz piti!',
  },
  {
    fr: 'Avant de dormir, relis rapidement ce que tu as appris dans la journée. Le sommeil enregistre les souvenirs.',
    ht: 'Anvan w dòmi, relii sa w te aprann nan jounen an vit. Dòmi anrejistre bagay yo nan tèt ou.',
  },
  {
    fr: 'Quand tu bloques sur un problème de maths, écris d’abord ce que tu connais : les données. La solution vient ensuite.',
    ht: 'Lè w bloke sou yon pwoblèm matematik, ekri dab sa w konnen: done yo. Solisyon an ap vini apre.',
  },
  {
    fr: 'Fais des fiches avec une question d’un côté et la réponse derrière. Teste-toi dans le tap-tap !',
    ht: 'Fè fich ak yon kesyon sou yon bò ak repons lan dèyè. Teste tèt ou nan taptap la!',
  },
  {
    fr: 'Pose toujours la question « pourquoi ? ». Comprendre pourquoi, c’est retenir dix fois plus longtemps.',
    ht: 'Toujou poze kesyon « poukisa? ». Konprann poukisa, se kenbe l dis fwa pi lontan.',
  },
  {
    fr: 'Les erreurs sont tes meilleures profs : quand tu rates un quiz, lis bien l’explication et refais-le demain.',
    ht: 'Erè yo se pi bon pwofesè w: lè w pèdi nan yon kwiz, li eksplikasyon an byen epi refè l demen.',
  },
  {
    fr: 'Téléphone en mode silencieux + 25 minutes de concentration + 5 minutes de pause. Ça s’appelle la méthode tomate 🍅',
    ht: 'Telefòn ou an silans + 25 minit konsantrasyon + 5 minit poze. Yo rele l metòd tomat 🍅',
  },
];

/** Retourne l'astuce déterministe du jour. */
export function tipOfToday(dayOfYear: number): Record<Lang, string> {
  return TIPS[dayOfYear % TIPS.length];
}
