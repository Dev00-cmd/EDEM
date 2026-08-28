// Exporte le schéma complet de la base Supabase dans
// supabase/schema.sql.
//
//   node scripts/dump_schema.mjs
//
// Pourquoi ce script existe : tout le backend d'EDEM — sept
// tables, ses fonctions SQL, ses politiques RLS et ses triggers —
// n'existait QUE dans le projet en ligne. Rien dans le dépôt. Si
// le projet disparaissait, il aurait fallu tout réécrire de
// mémoire. C'est le même risque que perdre le keystore.
//
// Le jeton est lu dans .env.secrets, jamais passé en argument :
// un argument de ligne de commande est visible par les autres
// processus de la machine.

import fs from 'fs';

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
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || JSON.stringify(body).slice(0, 300));
  return body;
}

// ── Ce qu'on récupère, dans l'ordre où il faut le rejouer ──────

const QUERIES = {
  types: `
    select t.typname as name,
           string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder) as labels
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    group by t.typname order by t.typname`,

  tables: `
    select c.relname as table_name,
           string_agg(
             '  ' || quote_ident(a.attname) || ' ' ||
             format_type(a.atttypid, a.atttypmod) ||
             coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), '') ||
             case when a.attnotnull then ' not null' else '' end,
             E',\\n' order by a.attnum
           ) as columns
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
    where n.nspname = 'public' and c.relkind = 'r'
    group by c.relname order by c.relname`,

  constraints: `
    select conrelid::regclass::text as table_name,
           conname as name,
           pg_get_constraintdef(oid) as definition
    from pg_constraint
    where connamespace = 'public'::regnamespace
    order by conrelid::regclass::text, conname`,

  indexes: `
    select indexname as name, indexdef as definition
    from pg_indexes
    where schemaname = 'public'
      and indexname not in (
        select conname from pg_constraint where connamespace = 'public'::regnamespace
      )
    order by indexname`,

  functions: `
    select p.proname as name, pg_get_functiondef(p.oid) as definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
    order by p.proname`,

  rls: `
    select relname as table_name, relrowsecurity as enabled
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by relname`,

  policies: `
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies where schemaname = 'public'
    order by tablename, policyname`,

  triggers: `
    select c.relname as table_name, t.tgname as name,
           pg_get_triggerdef(t.oid) as definition
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal and n.nspname in ('public', 'auth')
    order by c.relname, t.tgname`,

  buckets: `select id, name, public, file_size_limit, allowed_mime_types
            from storage.buckets order by id`,

  storagePolicies: `
    select policyname, cmd, qual, with_check
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    order by policyname`,
};

const out = [];
const w = (s = '') => out.push(s);

w('-- ═══════════════════════════════════════════════════════════════');
w('--  EDEM — SCHÉMA COMPLET DE LA BASE');
w('--');
w('--  Généré par scripts/dump_schema.mjs. Ne pas éditer à la main :');
w('--  relancer le script après toute modification de la base.');
w('--');
w(`--  Projet   : ${REF}`);
w(`--  Exporté  : ${new Date().toISOString().slice(0, 10)}`);
w('--');
w("--  Ce fichier est la SEULE copie hors ligne du backend. Sans");
w('--  lui, un projet Supabase perdu serait irrécupérable.');
w('-- ═══════════════════════════════════════════════════════════════');
w();

const data = {};
for (const [key, query] of Object.entries(QUERIES)) {
  try {
    data[key] = await sql(query);
  } catch (e) {
    data[key] = [];
    console.error(`  ! ${key} : ${e.message}`);
  }
}

// ── Types ─────────────────────────────────────────────────────
if (data.types.length) {
  w('-- ── Types énumérés ───────────────────────────────────────────');
  for (const t of data.types) {
    w(`create type public.${t.name} as enum (${t.labels});`);
  }
  w();
}

// ── Tables ────────────────────────────────────────────────────
w('-- ── Tables ───────────────────────────────────────────────────');
w();
for (const t of data.tables) {
  w(`create table if not exists public.${t.table_name} (`);
  w(t.columns);
  w(');');
  w();
}

// ── Contraintes ───────────────────────────────────────────────
w('-- ── Contraintes (clés primaires, étrangères, unicité) ────────');
w();
for (const c of data.constraints) {
  w(`alter table ${c.table_name} add constraint ${c.name} ${c.definition};`);
}
w();

// ── Index ─────────────────────────────────────────────────────
if (data.indexes.length) {
  w('-- ── Index ────────────────────────────────────────────────────');
  w();
  for (const i of data.indexes) w(`${i.definition};`);
  w();
}

// ── Fonctions ─────────────────────────────────────────────────
w('-- ── Fonctions ────────────────────────────────────────────────');
w('--');
w('--  Le cœur des règles du jeu : XP, maîtrise, classement. Elles');
w("--  vivent ici et pas dans l'app, pour qu'un élève ne puisse pas");
w('--  s\'attribuer des points en modifiant le client.');
w();
for (const f of data.functions) {
  w(`${f.definition};`);
  w();
}

// ── RLS ───────────────────────────────────────────────────────
w('-- ── Row Level Security ───────────────────────────────────────');
w();
for (const r of data.rls) {
  if (r.enabled) w(`alter table public.${r.table_name} enable row level security;`);
}
w();
for (const p of data.policies) {
  // pg_policies renvoie les rôles en littéral de tableau Postgres
  // (« {authenticated} »). Recopié tel quel, le SQL serait
  // invalide au rejeu — c'est-à-dire le jour où ce fichier sert.
  const roles = Array.isArray(p.roles)
    ? p.roles.join(', ')
    : String(p.roles).replace(/^\{|\}$/g, '').split(',').join(', ');
  let stmt = `create policy ${JSON.stringify(p.policyname)} on public.${p.tablename}`;
  stmt += `\n  as ${p.permissive === 'PERMISSIVE' ? 'permissive' : 'restrictive'}`;
  stmt += `\n  for ${p.cmd.toLowerCase()}`;
  stmt += `\n  to ${roles}`;
  if (p.qual) stmt += `\n  using (${p.qual})`;
  if (p.with_check) stmt += `\n  with check (${p.with_check})`;
  w(`${stmt};`);
  w();
}

// ── Triggers ──────────────────────────────────────────────────
if (data.triggers.length) {
  w('-- ── Triggers ─────────────────────────────────────────────────');
  w();
  for (const t of data.triggers) w(`${t.definition};`);
  w();
}

// ── Stockage ──────────────────────────────────────────────────
w('-- ── Stockage (fichiers joints) ───────────────────────────────');
w();
for (const b of data.buckets) {
  const mimes = b.allowed_mime_types
    ? `array[${b.allowed_mime_types.map((m) => `'${m}'`).join(', ')}]`
    : 'null';
  w(
    `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)`,
  );
  w(
    `  values ('${b.id}', '${b.name}', ${b.public}, ${b.file_size_limit ?? 'null'}, ${mimes})`,
  );
  w(`  on conflict (id) do nothing;`);
  w();
}
for (const p of data.storagePolicies) {
  let stmt = `create policy ${JSON.stringify(p.policyname)} on storage.objects`;
  stmt += `\n  for ${p.cmd.toLowerCase()}`;
  if (p.qual) stmt += `\n  using (${p.qual})`;
  if (p.with_check) stmt += `\n  with check (${p.with_check})`;
  w(`${stmt};`);
  w();
}

fs.mkdirSync('supabase', { recursive: true });
fs.writeFileSync('supabase/schema.sql', out.join('\n'));

console.log('supabase/schema.sql écrit');
console.log(`  ${data.tables.length} tables`);
console.log(`  ${data.functions.length} fonctions`);
console.log(`  ${data.policies.length} politiques RLS`);
console.log(`  ${data.triggers.length} triggers`);
console.log(`  ${data.buckets.length} bucket(s) de stockage`);
console.log(`  ${data.storagePolicies.length} politiques de stockage`);
