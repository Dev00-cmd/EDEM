-- ═══════════════════════════════════════════════════════════════
--  RÉVISION ESPACÉE
--
--  Jusqu'ici les quiz ÉVALUAIENT. Ils ne faisaient pas RETENIR.
--  Une question ratée disparaissait : l'élève apprenait qu'il ne
--  savait pas, et rien de plus. Or c'est le retour d'une même
--  notion à intervalles croissants qui fait passer une chose de
--  « comprise sur le moment » à « sue ».
--
--  Une question ratée revient donc après 1, 3, 7 puis 21 jours.
--  Quatre bonnes réponses espacées, et elle sort de la file : elle
--  est apprise.
--
--  ── Ce que ça coûte : rien ─────────────────────────────────────
--
--  `quiz_sessions.questions` garde déjà la question COMPLÈTE —
--  énoncé, quatre options, bonne réponse, explication. Une
--  révision se REJOUE donc telle quelle, sans repasser par le
--  modèle. Zéro appel, zéro gourde, et c'est aussi ce que la
--  méthode exige : la révision espacée veut le MÊME item, pas un
--  item qui lui ressemble.
--
--  C'est la seule fonctionnalité de cette liste qui rende
--  l'application moins chère à faire tourner en la rendant
--  meilleure.
--
--  ── Ce que la table n'expose pas ──────────────────────────────
--
--  `review_queue` contient les BONNES RÉPONSES. Elle n'a donc
--  aucune policy — exactement comme `quiz_sessions`, et pour la
--  même raison : seule l'Edge Function y accède, avec la clé de
--  service. Un élève qui lirait sa propre file de révision y
--  lirait les réponses de son prochain quiz.
--
--  ── Une limite assumée ────────────────────────────────────────
--
--  Le barème de maîtrise de `apply_quiz_results` n'est pas touché :
--  une révision réussie fait progresser `topic_mastery` comme
--  n'importe quelle bonne réponse. C'est discutable — retrouver
--  une notion trois semaines après en dit plus long que la
--  réussir le jour même — mais toucher au barème des XP demande
--  de reprendre l'anti-triche avec, et ça ne se fait pas en
--  passant.
-- ═══════════════════════════════════════════════════════════════


-- pg_cron sert au ménage de fin de fichier. La migration des
-- notifications le pose déjà ; on ne suppose pas l'ordre.
create extension if not exists pg_cron;


-- ── La file ───────────────────────────────────────────────────

create table if not exists public.review_queue (
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- Empreinte de l'énoncé, normalisée EXACTEMENT comme dans
  -- `quiz_seen_questions.qhash` : deux formulations qui ne
  -- diffèrent que par les espaces sont la même question.
  qhash       text not null,
  subject_id  text not null,
  -- La question entière : {question, choices, answer, explanation,
  -- topic}. C'est ce qui permet de la rejouer sans le modèle.
  question    jsonb not null,
  -- 0 → ratée, revient demain. 1, 2, 3 → réussie 1, 2, 3 fois
  -- d'affilée. À 4, elle sort de la file.
  box         smallint not null default 0 check (box between 0 and 3),
  due_on      date not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, qhash)
);

-- L'index qui porte la seule lecture qui compte : « qu'est-ce qui
-- est dû aujourd'hui pour cet élève, dans cette matière ? »
create index if not exists review_queue_due
  on public.review_queue (user_id, subject_id, due_on);

alter table public.review_queue enable row level security;

-- Aucune policy. Voir l'en-tête : cette table contient les bonnes
-- réponses, et seule l'Edge Function la lit.


-- ── Le calendrier ─────────────────────────────────────────────

create or replace function public.review_interval(p_box smallint)
returns integer
language sql immutable
as $$
  -- 1, 3, 7, 21. Les paliers classiques : assez rapprochés pour
  -- rattraper avant l'oubli, assez espacés pour que le rappel
  -- coûte un effort — c'est l'effort qui ancre.
  select case p_box
           when 0 then 1
           when 1 then 3
           when 2 then 7
           else 21
         end;
$$;


-- ── Programmer les révisions à la correction ──────────────────
--
-- Déclencheur et non modification de `grade_quiz` : la correction
-- est le morceau le plus sensible de cette base — c'est elle qui
-- décide des XP — et on ne la rouvre pas pour ajouter une
-- fonctionnalité qui peut vivre à côté. Si ce déclencheur échoue,
-- il ne fait pas échouer la correction (voir le `exception` en
-- fin de fonction) : un élève ne doit jamais perdre ses points
-- parce que la planification d'une révision a buté.

create or replace function public.schedule_reviews()
returns trigger
language plpgsql security definer set search_path to ''
as $$
declare
  v_questions jsonb;
  v_total     integer;
  q           jsonb;
  v_pick      jsonb;
  v_ok        boolean;
  v_hash      text;
  v_texte     text;
  i           integer;
begin
  if new.graded_at is null or old.graded_at is not null then
    return new;
  end if;

  -- Un quiz de devoir est une ÉVALUATION, pas un entraînement. Ce
  -- que le professeur note n'a pas à nourrir la file personnelle
  -- de l'élève.
  if new.assignment_id is not null then
    return new;
  end if;

  v_questions := new.questions;
  if v_questions is null or jsonb_typeof(v_questions) <> 'array' then
    return new;
  end if;

  v_total := jsonb_array_length(v_questions);

  for i in 0 .. v_total - 1 loop
    q := v_questions -> i;
    v_texte := q ->> 'question';
    continue when v_texte is null or btrim(v_texte) = '';

    v_hash := md5(lower(btrim(regexp_replace(v_texte, '\s+', ' ', 'g'))));

    v_pick := new.picked -> i;
    v_ok := v_pick is not null
        and jsonb_typeof(v_pick) = 'number'
        and (v_pick)::text::integer = (q ->> 'answer')::integer;

    if not v_ok then
      -- Ratée : elle entre dans la file, ou y retombe au premier
      -- palier. Une question qu'on croyait sue et qu'on rate à
      -- nouveau n'est pas sue.
      insert into public.review_queue
        (user_id, qhash, subject_id, question, box, due_on)
      values
        (new.user_id, v_hash, new.subject_id, q, 0,
         current_date + public.review_interval(0::smallint))
      on conflict (user_id, qhash) do update
        set box        = 0,
            due_on     = current_date + public.review_interval(0::smallint),
            question   = excluded.question,
            updated_at = now();

    else
      -- Réussie. Elle n'entre PAS dans la file si elle n'y était
      -- pas : on ne fait réviser que ce qui a été raté une fois.
      -- Si elle y était, elle monte d'un palier — et sort au
      -- quatrième succès.
      delete from public.review_queue r
       where r.user_id = new.user_id
         and r.qhash = v_hash
         and r.box >= 3;

      update public.review_queue r
         set box        = (r.box + 1)::smallint,
             due_on     = current_date + public.review_interval((r.box + 1)::smallint),
             updated_at = now()
       where r.user_id = new.user_id
         and r.qhash = v_hash;
    end if;
  end loop;

  return new;

exception when others then
  -- Voir l'en-tête du déclencheur : la révision est un bonus, la
  -- correction est un dû. On note et on laisse passer.
  raise warning 'schedule_reviews: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_schedule_reviews on public.quiz_sessions;
create trigger trg_schedule_reviews
  after update of graded_at on public.quiz_sessions
  for each row execute function public.schedule_reviews();


-- ── Ce qui est dû ─────────────────────────────────────────────
--
-- Appelée par l'Edge Function avec la clé de service, jamais par
-- l'application : elle rend les bonnes réponses.

create or replace function public.review_due(
  p_user_id    uuid,
  p_subject_id text,
  p_limit      integer default 4
)
returns jsonb
language sql security definer stable set search_path to ''
as $$
  select coalesce(jsonb_agg(q.question order by q.due_on, q.box), '[]'::jsonb)
    from (
      select r.question, r.due_on, r.box
        from public.review_queue r
       where r.user_id = p_user_id
         and r.subject_id = p_subject_id
         and r.due_on <= current_date
       -- Le plus en retard d'abord, et à retard égal le palier le
       -- plus bas : ce qui est le moins su passe devant.
       order by r.due_on, r.box
       limit greatest(0, least(coalesce(p_limit, 4), 6))
    ) q;
$$;

revoke execute on function public.review_due(uuid, text, integer)
  from public, anon, authenticated;


-- ── Combien de révisions attendent ────────────────────────────
--
-- CELLE-CI est pour l'application : elle ne rend qu'un NOMBRE.
-- Un compteur ne révèle aucune réponse, et c'est ce qui permet
-- d'écrire « 3 questions t'attendent » sur l'écran des quiz.

create or replace function public.review_pending()
returns jsonb
language sql security definer stable set search_path to ''
as $$
  select coalesce(
    jsonb_object_agg(t.subject_id, t.n),
    '{}'::jsonb
  )
  from (
    select r.subject_id, count(*) as n
      from public.review_queue r
     where r.user_id = (select auth.uid())
       and r.due_on <= current_date
     group by r.subject_id
  ) t;
$$;

revoke execute on function public.review_pending() from public, anon;
grant  execute on function public.review_pending() to authenticated;


-- ── Ménage ────────────────────────────────────────────────────
--
-- Une file sans limite finirait par proposer des révisions d'il y
-- a six mois, sur un programme que l'élève a quitté. Ce qui n'a
-- pas été revu en 90 jours ne sera pas revu.

select cron.unschedule('edem-revision-menage')
 where exists (select 1 from cron.job where jobname = 'edem-revision-menage');

select cron.schedule(
  'edem-revision-menage',
  '31 3 * * *',
  $cron$ delete from public.review_queue where due_on < current_date - 90; $cron$
);
