// Déploie l'Edge Function « tutor » sur Supabase.
//
//   node scripts/deploy_function.mjs
//
// Remplace le copier-coller dans le dashboard, qui était jusqu'ici
// la seule voie possible — et la source de plusieurs incidents :
// un fichier oublié, une version qui diverge du dépôt.
//
// Le jeton est lu dans .env.secrets, jamais passé en argument.

import fs from 'fs';

const REF = 'qoyebljuvrxhcroxapys';
const SLUG = 'tutor';
const ENTRY = 'supabase/functions/tutor/index.ts';

const token = (fs.readFileSync('.env.secrets', 'utf8').match(
  /^SUPABASE_ACCESS_TOKEN=(.+)$/m,
) || [])[1]?.trim();

if (!token || token.startsWith('COLLE')) {
  console.error('Jeton absent de .env.secrets');
  process.exit(1);
}

// Tout le dossier part, pas seulement index.ts : la fonction
// importe désormais topics.json, et un fichier oublié se voit à
// l'exécution — c'est-à-dire chez l'élève.
const DOSSIER = 'supabase/functions/tutor';
const fichiers = fs
  .readdirSync(DOSSIER)
  .filter((f) => /\.(ts|js|json)$/.test(f))
  .sort((a, b) => (a === 'index.ts' ? -1 : b === 'index.ts' ? 1 : a.localeCompare(b)));

const source = fs.readFileSync(ENTRY, 'utf8');
console.log(`${ENTRY} — ${source.split('\n').length} lignes`);
for (const f of fichiers) if (f !== 'index.ts') console.log(`  + ${f}`);

const metadata = {
  entrypoint_path: 'index.ts',
  name: SLUG,
  // La fonction refuse tout appel sans jeton d'élève valide.
  verify_jwt: true,
};

const form = new FormData();
form.append(
  'metadata',
  new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
);
for (const nom of fichiers) {
  const contenu = fs.readFileSync(`${DOSSIER}/${nom}`, 'utf8');
  form.append(
    'file',
    new Blob([contenu], {
      type: nom.endsWith('.json') ? 'application/json' : 'application/typescript',
    }),
    nom,
  );
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${REF}/functions/deploy?slug=${SLUG}`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  },
);

const body = await res.text();
if (!res.ok) {
  console.error(`ÉCHEC (${res.status})\n${body.slice(0, 800)}`);
  process.exit(1);
}

const info = JSON.parse(body);
console.log(`déployée ✓  version ${info.version}  ${info.status}`);
