// Exporte le référentiel scolaire haïtien de Supabase vers
// src/data/haiti.ts.
//
//   node scripts/dump_referentiel.mjs
//
// Pourquoi embarquer ces données dans l'application plutôt que de
// les lire en ligne : un élève haïtien paie sa data à l'unité.
// Télécharger 148 communes à chaque ouverture de l'onboarding,
// c'est lui prendre une gourde pour une liste qui ne change
// jamais. Embarquée, elle ne coûte rien et marche hors ligne.
//
// La base reste la source de vérité — c'est elle qui contraint
// profiles.section et schools.commune_id par clé étrangère. Ce
// script ne fait que recopier. Relance-le après toute migration
// qui touche au référentiel.
//
// Le jeton est lu dans .env.secrets, jamais passé en argument.

import fs from 'fs';

const REF = 'qoyebljuvrxhcroxapys';
const SORTIE = 'src/data/haiti.ts';

const token = (fs.readFileSync('.env.secrets', 'utf8').match(
  /^SUPABASE_ACCESS_TOKEN=(.+)$/m,
) || [])[1]?.trim();

if (!token || token.startsWith('COLLE')) {
  console.error('Jeton absent de .env.secrets');
  process.exit(1);
}

async function sql(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/database/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    },
  );
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || JSON.stringify(body).slice(0, 300));
  return body;
}

const [departements, communes, niveaux, series] = await Promise.all([
  sql(`select id, name from public.departements order by rank`),
  sql(`select id, name, departement_id from public.communes order by departement_id, name`),
  sql(`select id, label_fr, label_ht, cycle, has_exam, needs_section
         from public.school_levels order by rank`),
  sql(`select id, label_fr, label_ht from public.school_sections order by rank`),
]);

const s = (v) => JSON.stringify(v);

const fichier = `// ═══════════════════════════════════════════════════════════════
//  RÉFÉRENTIEL SCOLAIRE HAÏTIEN
//
//  FICHIER GÉNÉRÉ — ne le modifie pas à la main.
//    node scripts/dump_referentiel.mjs
//
//  La source de vérité est la base : ce sont ses clés étrangères
//  qui refusent une commune ou une série inventée. Ce fichier n'en
//  est qu'une copie embarquée, pour que l'élève n'ait pas à payer
//  le téléchargement d'une liste qui ne change jamais.
// ═══════════════════════════════════════════════════════════════

export interface Departement {
  id: string;
  name: string;
}

export interface Commune {
  id: string;
  name: string;
  departementId: string;
}

/** Niveau scolaire. \`id\` est la valeur écrite dans profiles.level. */
export interface SchoolLevel {
  id: string;
  labelFr: string;
  labelHt: string;
  cycle: 'fondamental' | 'secondaire' | 'autre';
  /** Année qui se termine par un examen d'État. */
  hasExam: boolean;
  /** Année où l'élève a déjà choisi sa série. */
  needsSection: boolean;
}

/** Série du Nouveau Secondaire, choisie à l'entrée en NS3. */
export interface SchoolSection {
  id: string;
  labelFr: string;
  labelHt: string;
}

// Classés par nombre d'élèves scolarisés : dans une liste sur un
// téléphone, ce qui compte est que la bonne réponse soit en haut.
export const DEPARTEMENTS: Departement[] = [
${departements.map((d) => `  { id: ${s(d.id)}, name: ${s(d.name)} },`).join('\n')}
];

export const COMMUNES: Commune[] = [
${communes
  .map(
    (c) =>
      `  { id: ${s(c.id)}, name: ${s(c.name)}, departementId: ${s(c.departement_id)} },`,
  )
  .join('\n')}
];

export const SCHOOL_LEVELS: SchoolLevel[] = [
${niveaux
  .map(
    (n) =>
      `  { id: ${s(n.id)}, labelFr: ${s(n.label_fr)}, labelHt: ${s(n.label_ht)}, ` +
      `cycle: ${s(n.cycle)}, hasExam: ${n.has_exam}, needsSection: ${n.needs_section} },`,
  )
  .join('\n')}
];

export const SCHOOL_SECTIONS: SchoolSection[] = [
${series
  .map((x) => `  { id: ${s(x.id)}, labelFr: ${s(x.label_fr)}, labelHt: ${s(x.label_ht)} },`)
  .join('\n')}
];

// ── Accès ─────────────────────────────────────────────────────

const PAR_ID = new Map(COMMUNES.map((c) => [c.id, c]));

/** Les communes d'un département, déjà triées. */
export const communesOf = (departementId: string): Commune[] =>
  COMMUNES.filter((c) => c.departementId === departementId);

export const communeById = (id: string | null | undefined): Commune | null =>
  (id ? PAR_ID.get(id) ?? null : null);

/**
 * Le département se DÉDUIT de la commune : c'est une question de
 * moins à poser, et une incohérence de moins à craindre. Personne
 * ne pourra être « à Jacmel, dans l'Artibonite ».
 */
export const departementOf = (communeId: string | null | undefined): Departement | null => {
  const commune = communeById(communeId);
  if (!commune) return null;
  return DEPARTEMENTS.find((d) => d.id === commune.departementId) ?? null;
};

export const levelById = (id: string): SchoolLevel | null =>
  SCHOOL_LEVELS.find((l) => l.id === id) ?? null;

/** L'élève de ce niveau a-t-il déjà une série à déclarer ? */
export const levelNeedsSection = (id: string): boolean =>
  levelById(id)?.needsSection ?? false;
`;

fs.writeFileSync(SORTIE, fichier, 'utf8');
console.log(
  `${SORTIE} — ${departements.length} départements, ${communes.length} communes, ` +
    `${niveaux.length} niveaux, ${series.length} séries`,
);
