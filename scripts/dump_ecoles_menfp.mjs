// Lit les dix registres départementaux du MENFP (recensement
// scolaire 2024-2025) et écrit la liste des écoles d'Haïti.
//
//   node scripts/dump_ecoles_menfp.mjs
//
// ── Pourquoi cette source ─────────────────────────────────────
//
// Les deux sources ouvertes (OCHA 2022, OpenStreetMap) donnaient
// 8 583 écoles, soit la moitié du pays. Elles ne pouvaient pas
// faire mieux : l'une ne couvre que quatre départements, l'autre
// dépend du bénévolat.
//
// La bonne source est le MINISTÈRE. La DPCE publie, pour chaque
// recensement, dix registres départementaux qui listent les écoles
// une par une, avec leur code officiel, leur adresse et leur
// niveau. Ce sont des PDF — 408 pages pour l'Ouest — mais ce sont
// des PDF de TABLEAU, donc lisibles proprement.
//
// ── Ce que le code d'établissement contient ───────────────────
//
//   0 5 1 3 | 0 2 | 2 | 0 8 2 4 3
//   └──┬──┘   └┬┘   │   └───┬───┘
//      │       │    │       └── numéro d'ordre
//      │       │    └────────── secteur : 1 public, 2 non public
//      │       └─────────────── section communale
//      └─────────────────────── P-CODE de la commune (HT0513)
//
// Les quatre premiers chiffres sont exactement le P-code officiel
// des communes. C'est donc le CODE qui donne la commune et le
// secteur — pas les en-têtes de page, qui se coupent en deux items
// et se prêtent mal au découpage. Le rattachement est exact.
//
// ── La difficulté : les noms sont coupés ──────────────────────
//
// Dans le tableau, un nom trop long passe à la ligne, au-dessus
// comme au-dessous de la ligne où figure le code. On rattache donc
// chaque fragment de la colonne NOM au code le plus proche
// verticalement, puis on les recolle de haut en bas.

import fs from 'fs';
import path from 'path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const BASE = 'https://docs.haitidocs.org/menfp-registre-ecoles-';
const ANNEE = '-2025.pdf';
const DEPARTEMENTS = [
  'ouest', 'artibonite', 'nord', 'nord-est', 'nord-ouest',
  'sud', 'sud-est', 'centre', 'nippes', 'grand-anse',
];

// Colonnes du tableau, relevées sur les registres.
const COL = { code: 132, nom: 262, niveau: 492 };
// Bandes d'en-tête et de pied de page, à ne jamais lire.
const HAUT = 655;
const BAS = 45;

const PARASITES = [
  /^NOM DE/i, /ETABLISSEMENT/i, /^CODE$/i, /^ADRESSE$/i, /^FONDATEUR/i,
  /^T[EÉ]L[EÉ]PHONE/i, /^NIVEAU/i, /D.ENSEIGNE/i, /^MENT$/i, /^NEMENT$/i,
  /Pr[ée]scolaire *=/i, /^Registre des [ée]coles/i, /^SECTEUR/i,
  /^ARRONDISSEMENT/i, /SECTION COMMUNALE/i, /^COMMUNE/i, /^ANCIEN NOM/i,
];

// On teste sans accents : « L'ÉTABLISSEMENT » ne contient pas la
// chaîne « ETABLISSEMENT », et passait au travers du filtre.
const nu = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
const estParasite = (s) => PARASITES.some((r) => r.test(nu(s)));

const CACHE = path.join('supabase', '.sources', 'menfp');
fs.mkdirSync(CACHE, { recursive: true });

async function telecharger(dep) {
  const cible = path.join(CACHE, `${dep}.pdf`);
  if (fs.existsSync(cible)) return cible;
  const res = await fetch(`${BASE}${dep}${ANNEE}`);
  if (!res.ok) throw new Error(`${dep} : HTTP ${res.status}`);
  fs.writeFileSync(cible, Buffer.from(await res.arrayBuffer()));
  return cible;
}

async function lire(fichier) {
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(fs.readFileSync(fichier)),
    useSystemFonts: true,
  }).promise;

  const ecoles = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const items = (await (await doc.getPage(p)).getTextContent()).items
      .filter((i) => i.str && i.str.trim())
      .map((i) => ({ x: i.transform[4], y: i.transform[5], s: i.str.trim() }))
      .filter((i) => i.y < HAUT && i.y > BAS && !estParasite(i.s));

    const codes = items
      .filter((i) => i.x < COL.code && /^\d{12}$/.test(i.s.replace(/\s/g, '')))
      .map((i) => ({ code: i.s.replace(/\s/g, ''), y: i.y }));
    if (codes.length === 0) continue;

    const fragments = items.filter((i) => i.x >= COL.code && i.x < COL.nom);
    const niveaux = items.filter(
      (i) => i.x >= COL.niveau && /^[123](,[123])*$/.test(i.s.replace(/\s/g, '')),
    );

    const parCode = new Map(codes.map((c) => [c.code, []]));
    for (const f of fragments) {
      let proche = null, dist = Infinity;
      for (const c of codes) {
        const d = Math.abs(c.y - f.y);
        if (d < dist) { dist = d; proche = c; }
      }
      if (proche && dist < 26) parCode.get(proche.code).push(f);
    }

    for (const c of codes) {
      const nom = (parCode.get(c.code) ?? [])
        .sort((a, b) => b.y - a.y || a.x - b.x)
        .map((f) => f.s).join(' ').replace(/\s+/g, ' ').trim();
      if (!nom) continue;

      let niveau = null, dn = Infinity;
      for (const n of niveaux) {
        const d = Math.abs(n.y - c.y);
        if (d < dn) { dn = d; niveau = n.s.replace(/\s/g, ''); }
      }

      ecoles.push({
        code: c.code,
        nom,
        pcode: 'HT' + c.code.slice(0, 4),
        secteur: c.code[6] === '1' ? 'publique' : 'privee',
        niveau: dn < 20 ? niveau : null,
      });
    }
  }
  return ecoles;
}

console.log('Lecture des registres du MENFP :');
const tout = new Map();
for (const dep of DEPARTEMENTS) {
  const f = await telecharger(dep);
  const e = await lire(f);
  for (const x of e) if (!tout.has(x.code)) tout.set(x.code, x);
  console.log(
    `  ${dep.padEnd(12)} ${String(e.length).padStart(6)} écoles  ` +
    `${String(new Set(e.map((x) => x.pcode)).size).padStart(3)} communes`,
  );
}

const liste = [...tout.values()];
const parSecteur = new Map();
for (const e of liste) parSecteur.set(e.secteur, (parSecteur.get(e.secteur) ?? 0) + 1);
const nonPublic = (parSecteur.get('privee') ?? 0) / liste.length;

console.log(`\n${liste.length} écoles distinctes, ${new Set(liste.map((e) => e.pcode)).size} communes.`);
console.log(`Répartition : ${Math.round(nonPublic * 100)} % non public — le ministère annonce 82 %.`);

const sortie = path.join('supabase', '.sources', 'menfp_ecoles.json');
fs.writeFileSync(sortie, JSON.stringify(liste));
console.log(`\nÉcrit dans ${sortie}.`);
console.log('Les migrations d\'import sont dans supabase/migrations/20260831_ecoles_menfp_*.sql.');
