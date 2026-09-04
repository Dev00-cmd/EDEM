-- ═══════════════════════════════════════════════════════════════
--  LA BANQUE DE QUESTIONS
--
--  Chaque quiz était généré de zéro : 15 secondes d'attente, et un
--  appel au modèle payé à chaque fois. Trente élèves de 9e AF qui
--  révisent les fractions le même soir, c'est trente générations
--  pour trente quiz qui se ressemblent.
--
--  Une question de maths de 9e AF en français, niveau moyen, vaut
--  pour N'IMPORTE QUEL élève de 9e AF. Elle est donc écrite une
--  fois, gardée, et resservie — à ceux qui ne l'ont pas encore vue.
--
--  Résultat pour l'élève : le quiz s'ouvre en une fraction de
--  seconde au lieu de quinze. Résultat pour la facture : la
--  génération est payée une fois pour des dizaines d'élèves.
--
--  ── LA CLÉ DE PARTAGE ─────────────────────────────────────────
--
--  (matière, classe, langue, difficulté). Ce sont exactement les
--  quatre choses qui entrent dans le prompt de génération : deux
--  élèves qui partagent ces quatre-là recevraient de toute façon
--  des questions interchangeables.
--
--  La classe et la langue sont lues dans `profiles` CÔTÉ SERVEUR,
--  pas envoyées par l'application. Une application modifiée
--  choisirait sinon la banque de la classe qu'elle veut — et un
--  élève de NS IV se ferait servir des questions de 6e AF pour
--  gonfler ses XP.
--
--  ── CE QUE ÇA NE DÉGRADE PAS ──────────────────────────────────
--
--  Deux élèves ne reçoivent pas le même quiz : le tirage est
--  aléatoire dans un ensemble qui s'agrandit, les questions déjà
--  vues sont exclues élève par élève, et l'ordre des options est
--  remélangé À CHAQUE SERVICE. Même question, deux élèves, deux
--  positions de bonne réponse.
--
--  La correction ne bouge pas d'un pouce : le serveur ouvre
--  toujours une `quiz_sessions` avec les bonnes réponses, et c'est
--  toujours lui qui corrige.
--
--  ── AUCUNE POLICY ─────────────────────────────────────────────
--
--  La table contient les bonnes réponses des futurs quiz. Comme
--  `quiz_sessions` et `review_queue`, elle n'est lisible que par
--  l'Edge Function, avec la clé de service.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.question_bank (
  id          uuid primary key default gen_random_uuid(),

  -- La clé de partage.
  subject_id  text not null,
  level       text not null,
  lang        text not null check (lang in ('fr', 'ht')),
  difficulty  text not null check (difficulty in ('facile', 'moyen', 'difficile')),

  topic       text,
  -- Question complète : {question, choices, answer, explanation, topic}.
  question    jsonb not null,

  -- Empreinte de l'énoncé, normalisée EXACTEMENT comme dans
  -- `quiz_seen_questions.qhash` : c'est ce qui permet de savoir
  -- qu'un élève a déjà vu cette question-là.
  qhash       text not null,

  -- Combien de fois elle a été servie. Sert à préférer les moins
  -- vues, pour que la banque tourne au lieu de resservir les
  -- premières écrites.
  uses        integer not null default 0,
  created_at  timestamptz not null default now(),

  unique (subject_id, level, lang, difficulty, qhash)
);

-- L'index qui porte le tirage : « que reste-t-il pour cette clé ? »
create index if not exists question_bank_cle
  on public.question_bank (subject_id, level, lang, difficulty, uses);

alter table public.question_bank enable row level security;

-- Aucune policy. Voir l'en-tête.

-- Le tirage exclut ce que l'élève a déjà vu : sans cet index, la
-- banque devient plus lente que la génération qu'elle remplace.
create index if not exists quiz_seen_questions_hash
  on public.quiz_seen_questions (user_id, subject_id, qhash);


-- ── Déposer ce que le modèle vient d'écrire ───────────────────

create or replace function public.bank_add(
  p_subject_id text,
  p_level      text,
  p_lang       text,
  p_difficulty text,
  p_questions  jsonb
)
returns integer
language plpgsql security definer set search_path to ''
as $$
declare
  n integer;
begin
  if p_questions is null or jsonb_typeof(p_questions) <> 'array' then
    return 0;
  end if;

  -- Une classe ou une langue vide ferait une clé de partage
  -- inutilisable : on préfère ne rien déposer.
  if coalesce(btrim(p_level), '') = '' or p_lang not in ('fr', 'ht') then
    return 0;
  end if;

  insert into public.question_bank
    (subject_id, level, lang, difficulty, topic, question, qhash)
  select p_subject_id,
         btrim(p_level),
         p_lang,
         p_difficulty,
         q ->> 'topic',
         q,
         md5(lower(btrim(regexp_replace(q ->> 'question', '\s+', ' ', 'g'))))
    from jsonb_array_elements(p_questions) q
   where coalesce(btrim(q ->> 'question'), '') <> ''
  -- La même question écrite deux fois par le modèle n'est déposée
  -- qu'une fois. C'est tout l'intérêt de l'empreinte.
  on conflict (subject_id, level, lang, difficulty, qhash) do nothing;

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.bank_add(text, text, text, text, jsonb)
  from public, anon, authenticated;


-- ── Tirer ce que cet élève n'a pas encore vu ──────────────────

create or replace function public.bank_draw(
  p_user_id    uuid,
  p_subject_id text,
  p_level      text,
  p_lang       text,
  p_difficulty text,
  p_limit      integer default 10
)
returns jsonb
language plpgsql security definer set search_path to ''
as $$
declare
  v_ids uuid[];
  v_out jsonb;
begin
  if p_limit is null or p_limit <= 0 then
    return '[]'::jsonb;
  end if;
  if coalesce(btrim(p_level), '') = '' or p_lang not in ('fr', 'ht') then
    return '[]'::jsonb;
  end if;

  select array_agg(b.id), jsonb_agg(b.question)
    into v_ids, v_out
    from (
      select q.id, q.question
        from public.question_bank q
       where q.subject_id = p_subject_id
         and q.level      = btrim(p_level)
         and q.lang       = p_lang
         and q.difficulty = p_difficulty
         -- Ce que l'élève a déjà vu ne revient pas. La révision
         -- espacée, elle, a sa propre file : ce n'est pas le rôle
         -- de la banque de faire réviser.
         and not exists (
           select 1
             from public.quiz_seen_questions s
            where s.user_id = p_user_id
              and s.subject_id = p_subject_id
              and s.qhash = q.qhash
         )
       -- Les moins servies d'abord, puis au hasard : la banque
       -- tourne au lieu de resservir éternellement les premières
       -- questions écrites, et deux élèves ne tombent pas sur le
       -- même tirage.
       order by q.uses, random()
       limit least(p_limit, 20)
    ) b;

  if v_out is null then
    return '[]'::jsonb;
  end if;

  update public.question_bank
     set uses = uses + 1
   where id = any (v_ids);

  return v_out;
end;
$$;

revoke execute on function public.bank_draw(uuid, text, text, text, text, integer)
  from public, anon, authenticated;


-- ── Ce que la banque contient, pour le suivi ──────────────────
--
-- Lisible par n'importe quel compte connecté : elle ne rend que
-- des COMPTES, jamais un énoncé ni une réponse.

create or replace function public.bank_stats()
returns jsonb
language sql security definer stable set search_path to ''
as $$
  select coalesce(jsonb_agg(t), '[]'::jsonb)
    from (
      select subject_id, level, lang, difficulty,
             count(*)      as questions,
             sum(uses)     as services
        from public.question_bank
       group by subject_id, level, lang, difficulty
       order by count(*) desc
    ) t;
$$;

revoke execute on function public.bank_stats() from public, anon;
grant  execute on function public.bank_stats() to authenticated;
