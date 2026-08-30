// Régénère src/lib/database.types.ts depuis Supabase.
//
//   node scripts/dump_types.mjs
//
// Ces types étaient jusqu'ici copiés à la main depuis le
// dashboard. Une colonne ajoutée en migration et oubliée ici, et
// TypeScript valide un code qui échouera en production — le
// compilateur ne peut vérifier que ce qu'on lui a dit.
//
// Le jeton est lu dans .env.secrets, jamais passé en argument.

import fs from 'fs';

const REF = 'qoyebljuvrxhcroxapys';
const SORTIE = 'src/lib/database.types.ts';

const token = (fs.readFileSync('.env.secrets', 'utf8').match(
  /^SUPABASE_ACCESS_TOKEN=(.+)$/m,
) || [])[1]?.trim();

if (!token || token.startsWith('COLLE')) {
  console.error('Jeton absent de .env.secrets');
  process.exit(1);
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${REF}/types/typescript`,
  { headers: { Authorization: `Bearer ${token}` } },
);

const body = await res.json();
if (!res.ok) {
  console.error(`ÉCHEC (${res.status}) ${body.message ?? JSON.stringify(body).slice(0, 300)}`);
  process.exit(1);
}

if (typeof body.types !== 'string' || body.types.length < 500) {
  console.error('Réponse inattendue : pas de types dans le corps.');
  process.exit(1);
}

fs.writeFileSync(SORTIE, body.types, 'utf8');
console.log(`${SORTIE} — ${body.types.split('\n').length} lignes`);
