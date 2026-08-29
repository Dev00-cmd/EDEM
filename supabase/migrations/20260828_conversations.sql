-- ═══════════════════════════════════════════════════════════════
--  CONVERSATIONS AVEC M. THOMAS
--
--  L'élève n'avait qu'UNE conversation par matière, écrasée au fil
--  du temps. Poser une nouvelle question effaçait le fil de la
--  veille, et retrouver l'explication d'un exercice passé était
--  impossible : il fallait la redemander, et repayer l'appel.
--
--  On passe à de vraies conversations, comme dans ChatGPT :
--  autant qu'on veut, nommées, reprises quand on veut.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- La matière sert de contexte au tuteur, et de pastille de
  -- couleur dans la liste.
  subject_id text not null default 'general',
  -- Reprise du premier message de l'élève. Nulle tant qu'il n'a
  -- rien écrit : la conversation est alors « Nouvelle discussion ».
  title      text,
  created_at timestamptz not null default now(),
  -- Date du dernier message : c'est l'ordre de la liste.
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_recent_idx
  on public.conversations (user_id, updated_at desc);

alter table public.conversations enable row level security;

create policy "conversations_select_own" on public.conversations
  as permissive for select to authenticated
  using (user_id = (select auth.uid()));

create policy "conversations_insert_own" on public.conversations
  as permissive for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "conversations_update_own" on public.conversations
  as permissive for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "conversations_delete_own" on public.conversations
  as permissive for delete to authenticated
  using (user_id = (select auth.uid()));


-- ── Rattacher les messages ───────────────────────────────────

alter table public.chat_messages
  add column if not exists conversation_id uuid
    references public.conversations (id) on delete cascade;

create index if not exists chat_messages_conversation_idx
  on public.chat_messages (conversation_id, created_at);


-- ── Reprendre l'existant ─────────────────────────────────────
--
-- Les messages déjà écrits ne doivent pas disparaître de l'écran
-- de l'élève. Chaque ancien fil (un par matière) devient une
-- conversation, titrée par son premier message.

do $$
declare
  r record;
  v_id uuid;
begin
  for r in
    select user_id, thread, min(created_at) as debut, max(created_at) as fin
      from public.chat_messages
     where conversation_id is null
     group by user_id, thread
  loop
    insert into public.conversations (user_id, subject_id, title, created_at, updated_at)
    values (
      r.user_id,
      r.thread,
      (select left(btrim(m.text), 60)
         from public.chat_messages m
        where m.user_id = r.user_id
          and m.thread = r.thread
          and m.role = 'user'
        order by m.created_at
        limit 1),
      r.debut,
      r.fin
    )
    returning id into v_id;

    update public.chat_messages
       set conversation_id = v_id
     where user_id = r.user_id
       and thread = r.thread
       and conversation_id is null;
  end loop;
end $$;


-- ── La liste, avec son aperçu ────────────────────────────────

/**
 * Les conversations de l'élève, de la plus récente à la plus
 * ancienne.
 *
 * Renvoie le nombre de messages et un extrait du dernier, pour que
 * la liste soit lisible sans charger les conversations entières —
 * ce qui coûterait cher sur un réseau haïtien.
 */
create or replace function public.conversation_list(p_limit integer default 50)
returns table(
  id         uuid,
  subject_id text,
  title      text,
  updated_at timestamptz,
  message_count integer,
  preview    text
)
language sql
security definer
set search_path to ''
as $$
  select
    c.id,
    c.subject_id,
    c.title,
    c.updated_at,
    (select count(*)::integer from public.chat_messages m
      where m.conversation_id = c.id),
    (select left(btrim(m.text), 120) from public.chat_messages m
      where m.conversation_id = c.id
      order by m.created_at desc limit 1)
  from public.conversations c
  where c.user_id = (select auth.uid())
  order by c.updated_at desc
  limit least(greatest(p_limit, 1), 200);
$$;

revoke all on function public.conversation_list(integer) from public, anon;
grant execute on function public.conversation_list(integer) to authenticated;


-- ── Garder la liste à jour toute seule ───────────────────────
--
-- L'ordre de la liste dépend de `updated_at`. Le faire mettre à
-- jour par l'application demanderait une requête de plus à chaque
-- message, et une conversation reprise depuis un autre appareil
-- remonterait mal. Un trigger le fait de façon fiable.

create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.conversation_id is not null then
    update public.conversations
       set updated_at = greatest(updated_at, new.created_at)
     where id = new.conversation_id;
  end if;
  return new;
end;
$$;

drop trigger if exists chat_messages_touch_conversation on public.chat_messages;
create trigger chat_messages_touch_conversation
  after insert on public.chat_messages
  for each row execute function public.touch_conversation();
