// Reconstruit le référentiel des écoles d'Haïti à partir des
// sources ouvertes, et écrit les migrations SQL correspondantes.
//
//   node scripts/dump_ecoles.mjs
//
// ── Pourquoi ce script existe ─────────────────────────────────
//
// L'extrait OpenStreetMap est republié tous les mois. Un
// référentiel scolaire qu'on ne sait pas régénérer vieillit et
// devient faux ; celui-ci se refait en une commande.
//
// ── Les sources, et ce qu'elles valent ────────────────────────
//
// 1. OCHA Haïti — « Cartographie des institutions scolaires »,
//    2022. Le type public / non public y est fiable. Mais elle ne
//    couvre QUE le Sud, l'Ouest, les Nippes et la Grand'Anse : la
//    zone du séisme d'août 2021. Son titre laisse croire à un
//    recensement national, il n'en est rien.
//
// 2. HOT / OpenStreetMap — couverture nationale, fraîche, avec les
//    limites administratives déjà jointes : chaque école porte le
//    P-code de sa commune, calculé géographiquement. Mais les noms
//    sont saisis par des bénévoles, donc inégaux, et un tiers des
//    entités n'a pas de nom du tout.
//
// 3. COD-AB — limites administratives officielles d'Haïti. C'est
//    l'arbitre : 10 départements, 140 communes, 570 sections, avec
//    les P-codes qui permettent de recouper avec n'importe quelle
//    autre source haïtienne.
//
// Aucune n'est complète seule. Croisées, elles couvrent 131 des
// 140 communes. Le reste se remplira par `propose_school`.

import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const SOURCES = {
  ocha: 'https://data.humdata.org/dataset/ab56e126-aeff-4c34-9778-2c75a61e41b9/resource/7e7103ed-ac09-4d44-b0b2-9f3345897407/download/haiti-2022-cartographie-des-institutions-scolaires.xls',
  osm: 'https://production-raw-data-api.s3.amazonaws.com/ISO3/HTI/education_facilities/hotosm_hti_education_facilities_osm_geojson.zip',
  adm: 'https://data.humdata.org/dataset/777e8b06-337f-4295-80bc-ca1515244215/resource/08d3ec12-d827-4fd2-8f18-67a5dd08f421/download/hti_admin_boundaries.xlsx',
};

const CACHE = path.join('supabase', '.sources');
fs.mkdirSync(CACHE, { recursive: true });

async function telecharger(nom, url) {
  const cible = path.join(CACHE, nom);
  if (fs.existsSync(cible)) {
    console.log(`  ${nom} — déjà en cache`);
    return cible;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${nom} : HTTP ${res.status}`);
  fs.writeFileSync(cible, Buffer.from(await res.arrayBuffer()));
  console.log(`  ${nom} — ${Math.round(fs.statSync(cible).size / 1024)} Ko`);
  return cible;
}

console.log('Téléchargement des sources :');
const fOcha = await telecharger('ocha_ecoles.xls', SOURCES.ocha);
const fAdm = await telecharger('cod_ab.xlsx', SOURCES.adm);
const fOsm = await telecharger('osm_education.zip', SOURCES.osm);

const norm = (s) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();

const slug = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// ── Les communes, arbitrées par le COD-AB ─────────────────────

const DEP = {
  HT01: 'ouest', HT02: 'sud-est', HT03: 'nord', HT04: 'nord-est', HT05: 'artibonite',
  HT06: 'centre', HT07: 'sud', HT08: 'grandanse', HT09: 'nord-ouest', HT10: 'nippes',
};

// Là où le COD écrit sans accent, ou avec une coquille, on garde le
// français correct — celui que l'élève lit. Le P-code, lui, reste
// celui du COD : c'est lui qui fait foi.
const ORTHOGRAPHE = {
  HT0511: 'Les Gonaïves',
  HT0914: 'Chansolme',          // le COD écrit « Chamsolme »
  HT0134: 'Cornillon',          // officiel : « Cornillon / Grand Bois »
  HT0741: 'Les Côteaux',
  HT0743: 'Roche-à-Bateaux',
  HT0234: 'Anse-à-Pitres',
  HT0214: 'La Vallée-de-Jacmel',
};

// Des localités que les gens nomment spontanément et qui ne sont
// pas des communes. Chacune porte le P-code de sa commune de
// rattachement, vérifié dans la table des sections communales.
const LOCALITES = [
  { name: 'Liancourt', pcode: 'HT0532' },
  { name: 'Montrouis', pcode: 'HT0141' },
  { name: 'Marfranc', pcode: 'HT0811' },
  { name: 'Grand-Bassin', pcode: 'HT0433' },
  { name: 'Lapointe', pcode: 'HT0911' },
  { name: 'Fond-des-Blancs', pcode: 'HT0731' },
  { name: 'Baptiste', pcode: 'HT0632' },
];

const wbAdm = XLSX.readFile(fAdm);
const a2 = XLSX.utils.sheet_to_json(wbAdm.Sheets.hti_admin2, { defval: null });

const communes = a2.map((c) => ({
  id: slug(ORTHOGRAPHE[c.adm2_pcode] ?? c.adm2_name),
  dep: DEP[c.adm1_pcode],
  name: ORTHOGRAPHE[c.adm2_pcode] ?? c.adm2_name,
  pcode: c.adm2_pcode,
  official: true,
}));

const parPcode = new Map(communes.map((c) => [c.pcode, c]));
for (const l of LOCALITES) {
  const parent = parPcode.get(l.pcode);
  if (!parent) throw new Error('commune parente introuvable : ' + l.pcode);
  communes.push({ id: slug(l.name), dep: parent.dep, name: l.name, pcode: l.pcode, official: false });
}

console.log(`\nCommunes : ${communes.filter((c) => c.official).length} officielles + ${communes.length - 140} localités`);

// ── Nettoyage des noms d'écoles ───────────────────────────────

const PETITS = new Set([
  'de','du','des','d','la','le','les','l','et','à','a','au','aux','en','sur',
  'sous','pour','par','the','of','ak','nan','ou',
]);

const ACCENTS = new Map([
  ['ecole', 'École'], ['ecoles', 'Écoles'], ['lycee', 'Lycée'], ['lycees', 'Lycées'],
  ['college', 'Collège'], ['colleges', 'Collèges'], ['communautaire', 'Communautaire'],
  ['presbyterale', 'Presbytérale'], ['evangelique', 'Évangélique'],
  ['methodiste', 'Méthodiste'], ['mixte', 'Mixte'], ['freres', 'Frères'],
  ['soeurs', 'Sœurs'], ['sacre', 'Sacré'], ['coeur', 'Cœur'], ['eglise', 'Église'],
  ['elementaire', 'Élémentaire'], ['secondaire', 'Secondaire'],
]);

const sansAccent = (m) =>
  m.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

function nettoyer(brut) {
  let s = String(brut ?? '').replace(/\s+/g, ' ').trim();

  // « Institut Bon Départ /Kindergarten » : la seconde moitié
  // décrit le cycle, pas l'établissement.
  const barre = s.split(/\s*\/\s*/);
  if (barre.length > 1 && barre[0].trim().length >= 8) s = barre[0].trim();

  s = s.replace(/^["'«»\-–—.\s]+|["'«»\-–—.\s]+$/g, '').trim();
  if (!s) return '';

  // Faute d'accord très répandue chez les contributeurs OSM — mais
  // seulement après « école », qui est féminin. « Lycée National »
  // et « Collège National » sont corrects et ne se touchent pas.
  s = s.replace(/(Écoles?|Ecoles?)(\s+)National(\s+(?:de|du|des|d'|l'))/gi,
                (_, e, sp, suite) => `${e}${sp}Nationale${suite}`);

  const lettres = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
  const majuscules = (s.match(/[A-ZÀ-Þ]/g) ?? []).length;
  const toutMaj = lettres.length > 0 && majuscules / lettres.length > 0.85;

  const sortie = s.split(' ').map((mot, i) => {
    const n = sansAccent(mot);
    if (!toutMaj && mot === mot.toUpperCase() && mot.length <= 6) return mot; // sigles
    if (ACCENTS.has(n)) {
      const acc = ACCENTS.get(n);
      return i === 0 ? acc : PETITS.has(n) ? acc.toLowerCase() : acc;
    }
    const bas = toutMaj ? mot.toLowerCase() : mot;
    if (i > 0 && PETITS.has(n)) return bas.toLowerCase();
    if (toutMaj) return bas.charAt(0).toUpperCase() + bas.slice(1);
    // Casse mixte : on ne touche qu'aux mots laissés tout en
    // minuscules, sinon « Lycée alexandre petion » reste tel quel.
    if (mot === mot.toLowerCase() && n)
      return mot.replace(/(^|['’])([a-zà-ÿ])/g, (_, p, c) => p + c.toUpperCase());
    return mot;
  });

  const fini = sortie.join(' ').replace(/\s+/g, ' ').trim();
  return fini.charAt(0).toUpperCase() + fini.slice(1);
}

// En Haïti, « École Nationale » et « Lycée » désignent des
// établissements de l'État : la règle couvre l'immense majorité des
// cas où la source ne dit rien.
function typeDe(nom, source) {
  if (source) return source;
  const n = norm(nom);
  // « EPGC » = École Publique à Gestion Communautaire : financée par
  // l'État, gérée localement. C'est bien du public, et le sigle est
  // très répandu dans les zones rurales.
  if (/^(ecole national|ecole publique|lycee|nationale |national |centre national)/.test(n))
    return 'publique';
  if (/epgc/.test(n)) return 'publique';
  if (/(college|institution|petit seminaire|seminaire)/.test(n)) return 'privee';
  return 'autre';
}

const REJET = new Set([
  'ecole', 'school', 'lycee', 'college', 'universite', 'university', 'kindergarten',
  'ecole nationale', 'ecole primaire', 'ecole mixte', 'jardin d enfants', 'na', 'n a',
  'inconnu', 'sans nom', 'no name', 'test',
]);

// Ce que les sources contiennent et qui n'est pas un établissement.
const PAS_UNE_ECOLE =
  /(association des|anciens eleves|anciennes eleves|^garderie|^gaderie|^kindergarten$|^creche|^terrain|^cour de recreation)/;

const acceptable = (nom) => {
  const n = norm(nom);
  return (
    n.length >= 4 && !REJET.has(n) && !PAS_UNE_ECOLE.test(n) &&
    /[a-z]{3}/.test(n) && nom.length <= 120
  );
};

// ── Fusion ────────────────────────────────────────────────────

const ocha = XLSX.utils.sheet_to_json(XLSX.readFile(fOcha).Sheets.Ecole, { defval: null });

// Décompression du GeoJSON sans dépendance supplémentaire :
// l'archive ne contient qu'un fichier utile, on le sort avec
// l'outil du système.
const dossierOsm = path.join(CACHE, 'osm');
if (!fs.existsSync(path.join(dossierOsm, 'education_facilities.geojson'))) {
  fs.mkdirSync(dossierOsm, { recursive: true });
  const { execFileSync } = await import('node:child_process');
  execFileSync('powershell', [
    '-NoProfile', '-Command',
    `Expand-Archive -LiteralPath '${path.resolve(fOsm)}' -DestinationPath '${path.resolve(dossierOsm)}' -Force`,
  ]);
}
const osm = JSON.parse(
  fs.readFileSync(path.join(dossierOsm, 'education_facilities.geojson'), 'utf8'),
).features;

const TYPE_OSM = {
  government: 'publique', public: 'publique', community: 'autre',
  private: 'privee', religious: 'congreganiste',
};

const parPcodeOfficiel = new Map(communes.filter((c) => c.official).map((c) => [c.pcode, c]));
const retenues = new Map();

function ajouter(nomBrut, pcode, type, source) {
  const nom = nettoyer(nomBrut);
  if (!acceptable(nom)) return;
  const commune = parPcodeOfficiel.get(pcode);
  if (!commune) return;
  const cle = `${commune.id}|${norm(nom)}`;
  const deja = retenues.get(cle);
  if (deja) {
    if (deja.type === 'autre' && type !== 'autre') deja.type = type;
    if (nom.length > deja.name.length) deja.name = nom;
    deja.sources.add(source);
    return;
  }
  retenues.set(cle, { name: nom, communeId: commune.id, type, sources: new Set([source]) });
}

for (const r of ocha) {
  const t = String(r.Type ?? '').toLowerCase();
  const type = t.startsWith('public') ? 'publique' : t.includes('non') ? 'privee' : null;
  ajouter(r.Nom, r.Adm2_Pcode, typeDe(r.Nom, type), 'ocha');
}

for (const f of osm) {
  const p = f.properties ?? {};
  if (!['school', 'college'].includes(p.amenity ?? p.building ?? '')) continue;
  const nom = p.name ?? p.name_fr ?? p.name_latin ?? '';
  if (!String(nom).trim()) continue;
  ajouter(nom, p.adm2_pcode, typeDe(nom, TYPE_OSM[p.operator_type] ?? null), 'osm');
}

const ecoles = [...retenues.values()]
  .map((e) => ({ ...e, sources: [...e.sources].sort().join('+') }))
  .sort((a, b) => a.communeId.localeCompare(b.communeId) || a.name.localeCompare(b.name));

const couvertes = new Set(ecoles.map((e) => e.communeId));
console.log(`Écoles   : ${ecoles.length} dans ${couvertes.size} des 140 communes`);
const parType = new Map();
for (const e of ecoles) parType.set(e.type, (parType.get(e.type) ?? 0) + 1);
console.log('  types  :', [...parType].map(([k, v]) => `${k} ${v}`).join(' · '));

fs.writeFileSync(path.join(CACHE, 'ecoles.json'), JSON.stringify({ communes, ecoles }, null, 1));
console.log(`\nÉcrit dans ${path.join(CACHE, 'ecoles.json')}.`);
console.log("Les migrations d'origine sont dans supabase/migrations/20260830_ecoles_haiti_*.sql.");
