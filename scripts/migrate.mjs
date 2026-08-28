// Applique un fichier de migration SQL sur la base Supabase.
//
//   node scripts/migrate.mjs supabase/migrations/<fichier>.sql
//   node scripts/migrate.mjs --check   (liste les migrations vues)
//
// Chaque migration appliquée est enregistrée dans la table
// schema_migrations : la relancer ne fait rien. Sans ce garde-fou,
// rejouer un fichier par mégarde pourrait détruire des données.
//
// Le jeton est lu dans .env.secrets, jamais passé en argument :
// un argument de ligne de commande est visible par les autres
// processus de la machine.

import fs from 'fs';
import path from 'path';

const REF = 'qoyebljuvrxhcroxapys';

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
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || JSON.stringify(body).slice(0, 500));
  }
  return body;
}

await sql(`
  create table if not exists public.schema_migrations (
    name       text primary key,
    applied_at timestamptz not null default now()
  )
`);

const arg = process.argv[2];

if (!arg || arg === '--check') {
  const rows = await sql(
    'select name, applied_at from public.schema_migrations order by applied_at',
  );
  if (rows.length === 0) console.log('Aucune migration appliquée.');
  for (const r of rows) {
    console.log(`  ${r.applied_at.slice(0, 19).replace('T', ' ')}  ${r.name}`);
  }
  process.exit(0);
}

const file = arg;
const name = path.basename(file);

const already = await sql(
  `select 1 from public.schema_migrations where name = ${JSON.stringify(name).replace(/"/g, "'")}`,
);
if (already.length > 0) {
  console.log(`${name} : déjà appliquée, rien à faire.`);
  process.exit(0);
}

const content = fs.readFileSync(file, 'utf8');

console.log(`${name} : application…`);
try {
  await sql(content);
} catch (e) {
  console.error(`\nÉCHEC — la base n'a pas été modifiée :\n  ${e.message}`);
  process.exit(1);
}

await sql(
  `insert into public.schema_migrations (name) values (${JSON.stringify(name).replace(/"/g, "'")})`,
);
console.log(`${name} : appliquée ✓`);
