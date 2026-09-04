-- ═══════════════════════════════════════════════════════════════
--  NOTIFICATIONS
--
--  Le manque le plus coûteux de l'application jusqu'ici : le
--  professeur pose un devoir, corrige une copie, écrit dans le
--  fil — et PERSONNE n'est prévenu. Toute la vie de classe
--  reposait sur l'élève qui pense à ouvrir l'app. Un devoir donné
--  le lundi se découvrait le vendredi.
--
--  ── Trois décisions, et leurs raisons ─────────────────────────
--
--  1. LE TEXTE DES MESSAGES NE SORT JAMAIS.
--
--     Une notification de fil dit « Nouveau message dans 9e A »,
--     jamais ce qui a été écrit. Deux raisons, toutes les deux
--     sérieuses : l'écran verrouillé d'un téléphone se lit
--     par-dessus l'épaule, et un message que la modération
--     retirera dix secondes plus tard aurait déjà été affiché à
--     toute la classe. Une notification ne se rappelle pas.
--
--  2. LE DÉCLENCHEUR N'APPELLE PAS INTERNET.
--
--     Il écrit une ligne dans `notifications`, et c'est tout.
--     C'est `push_flush()` qui parle à Expo, plus tard, à part.
--     Un déclencheur qui ferait l'appel HTTP lui-même lierait
--     l'envoi d'un message d'élève à la disponibilité d'un
--     service tiers : Expo indisponible, et le fil de classe
--     cesserait de fonctionner. Ce n'est pas un compromis
--     acceptable.
--
--  3. AUCUN SECRET N'EST NÉCESSAIRE.
--
--     L'API de notification d'Expo accepte un jeton d'appareil
--     sans clé de service. Il n'y a donc rien à mettre dans le
--     Vault, rien à faire tourner, et rien à faire fuiter. C'est
--     ce qui permet à tout ceci de tenir dans la base.
--
--  ── Le jeton appartient à l'APPAREIL, pas au compte ───────────
--
--  `push_tokens` a pour clé primaire le JETON, pas l'élève. En
--  Haïti un téléphone se partage entre frères et sœurs : si le
--  jeton restait attaché au premier compte connecté, le second
--  recevrait les devoirs du premier. Se connecter réattribue donc
--  le jeton, et se déconnecter l'efface.
--
--  ── Ce que ça n'ouvre pas ─────────────────────────────────────
--
--  Aucune écriture directe : `notifications` n'a qu'une policy de
--  LECTURE, et seulement sur ses propres lignes. Tout ce qui écrit
--  est `security definer` et vérifie qui appelle. C'est le même
--  principe que partout ailleurs dans cette base.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pg_net;
create extension if not exists pg_cron;


-- ── Les appareils ─────────────────────────────────────────────

create table if not exists public.push_tokens (
  -- Clé primaire : l'APPAREIL. Voir l'en-tête — un téléphone qui
  -- change de main change de propriétaire, il ne s'en ajoute pas
  -- un second.
  token       text primary key
              check (char_length(token) between 10 and 200),
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text not null default 'android'
              check (platform in ('android', 'ios', 'web')),
  updated_at  timestamptz not null default now()
);

create index if not exists push_tokens_user on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- L'élève voit ses propres appareils. Il n'écrit rien directement :
-- `register_push_token` est le seul chemin.
create policy push_tokens_select on public.push_tokens
  for select to authenticated
  using (user_id = (select auth.uid()));


-- ── La file d'envoi ───────────────────────────────────────────
--
-- Une ligne = une notification pour UN élève, déjà écrite dans SA
-- langue. La traduction se fait à l'insertion, où l'on sait à qui
-- l'on parle ; `push_flush` n'a plus qu'à envoyer.

create table if not exists public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null
              check (kind in ('devoir', 'note', 'fil', 'classe')),
  title       text not null check (char_length(title) <= 100),
  body        text not null check (char_length(body) <= 200),
  -- De quoi ouvrir le bon écran quand l'élève touche la
  -- notification. Jamais de contenu, seulement des identifiants.
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  -- Compté pour ne pas réessayer indéfiniment un jeton mort.
  attempts    smallint not null default 0
);

create index if not exists notifications_pending
  on public.notifications (created_at)
  where sent_at is null;

create index if not exists notifications_user
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Lecture seule, et seulement les siennes : l'élève peut ainsi
-- retrouver dans l'app ce qu'il a manqué pendant la coupure.
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));


-- ── Enregistrer et oublier un appareil ────────────────────────

create or replace function public.register_push_token(
  p_token    text,
  p_platform text default 'android'
)
returns void
language plpgsql security definer set search_path to ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    return;
  end if;

  if p_token is null or char_length(p_token) not between 10 and 200 then
    return;
  end if;

  -- Le conflit porte sur le JETON : un appareil qui change de main
  -- change de propriétaire. Voir l'en-tête.
  insert into public.push_tokens (token, user_id, platform)
  values (
    p_token,
    uid,
    case when p_platform in ('android', 'ios', 'web') then p_platform else 'android' end
  )
  on conflict (token) do update
    set user_id    = excluded.user_id,
        platform   = excluded.platform,
        updated_at = now();
end;
$$;

create or replace function public.forget_push_token(p_token text)
returns void
language plpgsql security definer set search_path to ''
as $$
begin
  -- La condition sur `user_id` compte : sans elle, n'importe qui
  -- pourrait désabonner l'appareil de n'importe qui d'autre en
  -- devinant un jeton.
  delete from public.push_tokens
   where token = p_token
     and user_id = (select auth.uid());
end;
$$;

revoke execute on function public.register_push_token(text, text) from public, anon;
revoke execute on function public.forget_push_token(text)         from public, anon;
grant  execute on function public.register_push_token(text, text) to authenticated;
grant  execute on function public.forget_push_token(text)         to authenticated;


-- ── Poser une notification ────────────────────────────────────
--
-- Interne. Aucun client ne l'appelle : elle sert aux déclencheurs.
-- La langue de chaque destinataire est lue ici, une fois.

create or replace function public.push_notify(
  p_users    uuid[],
  p_kind     text,
  p_title_fr text,
  p_body_fr  text,
  p_title_ht text,
  p_body_ht  text,
  p_data     jsonb default '{}'::jsonb
)
returns integer
language plpgsql security definer set search_path to ''
as $$
declare
  n integer;
begin
  if p_users is null or cardinality(p_users) = 0 then
    return 0;
  end if;

  insert into public.notifications (user_id, kind, title, body, data)
  select p.id,
         p_kind,
         case when p.lang = 'ht' then p_title_ht else p_title_fr end,
         case when p.lang = 'ht' then p_body_ht  else p_body_fr  end,
         coalesce(p_data, '{}'::jsonb)
    from public.profiles p
   where p.id = any (p_users)
     -- Un élève sans appareil enregistré ne remplit pas la file
     -- pour rien. Il retrouvera l'information en ouvrant l'app.
     and exists (select 1 from public.push_tokens t where t.user_id = p.id);

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.push_notify(uuid[], text, text, text, text, text, jsonb)
  from public, anon, authenticated;


-- ═══════════════════════════════════════════════════════════════
--  LES TROIS MOMENTS QUI MÉRITENT UNE NOTIFICATION
--
--  Trois, et pas davantage. Une application qui sonne pour tout
--  se fait désactiver en une semaine, et on perd alors AUSSI le
--  devoir à rendre demain.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Un devoir est publié ───────────────────────────────────
--
-- À la publication, pas à la création : un professeur prépare son
-- devoir en plusieurs fois, et chaque enregistrement ne doit pas
-- réveiller la classe.

create or replace function public.notify_assignment_published()
returns trigger
language plpgsql security definer set search_path to ''
as $$
declare
  v_classe text;
  v_membres uuid[];
begin
  if not new.published or (tg_op = 'UPDATE' and old.published) then
    return new;
  end if;

  select c.name into v_classe from public.classrooms c where c.id = new.classroom_id;

  select array_agg(m.user_id) into v_membres
    from public.classroom_members m
   where m.classroom_id = new.classroom_id
     and m.status = 'active'
     and m.user_id <> new.created_by;

  perform public.push_notify(
    v_membres,
    'devoir',
    case when new.kind = 'quiz' then 'Nouveau quiz' else 'Nouveau devoir' end,
    -- Le titre du devoir, lui, est écrit par le professeur POUR la
    -- classe : il n'a rien de confidentiel, contrairement au texte
    -- d'un message d'élève.
    -- Borné à 200 : c'est la contrainte de la colonne, et un titre
    -- de 120 suivi d'un nom de classe de 80 la dépassait. Une
    -- contrainte violée ici ferait échouer la PUBLICATION du devoir,
    -- pas seulement sa notification.
    left(left(new.title, 120) || coalesce(' · ' || v_classe, ''), 200),
    case when new.kind = 'quiz' then 'Yon nouvo quiz' else 'Yon nouvo devwa' end,
    left(left(new.title, 120) || coalesce(' · ' || v_classe, ''), 200),
    jsonb_build_object('route', '/assignment/' || new.id::text)
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_assignment on public.assignments;
create trigger trg_notify_assignment
  after insert or update of published on public.assignments
  for each row execute function public.notify_assignment_published();


-- ── 2. Une copie est corrigée ─────────────────────────────────
--
-- C'est la notification que l'élève ATTEND. Elle est la seule des
-- trois qui ne concerne qu'une personne.

create or replace function public.notify_submission_graded()
returns trigger
language plpgsql security definer set search_path to ''
as $$
declare
  v_titre text;
begin
  if new.graded_at is null or old.graded_at is not null then
    return new;
  end if;

  select a.title into v_titre from public.assignments a where a.id = new.assignment_id;

  perform public.push_notify(
    array[new.user_id],
    'note',
    'Ton devoir est corrigé',
    left(left(coalesce(v_titre, 'Devoir'), 100)
      || coalesce(' · ' || new.grade::text || '/100', ''), 200),
    'Devwa ou korije',
    left(left(coalesce(v_titre, 'Devwa'), 100)
      || coalesce(' · ' || new.grade::text || '/100', ''), 200),
    jsonb_build_object('route', '/assignment/' || new.assignment_id::text)
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_graded on public.submissions;
create trigger trg_notify_graded
  after update of graded_at on public.submissions
  for each row execute function public.notify_submission_graded();


-- ── 3. Le fil de classe bouge ─────────────────────────────────
--
-- La seule des trois qui puisse arriver en rafale. Un échange de
-- vingt messages entre deux élèves ne doit pas faire vingt
-- notifications à toute la classe : on n'en pose qu'UNE par classe
-- et par élève tous les quarts d'heure. Celui qui est déjà dans
-- l'app n'a de toute façon pas besoin qu'on le prévienne — le
-- temps réel lui montre le message.

create or replace function public.notify_classroom_message()
returns trigger
language plpgsql security definer set search_path to ''
as $$
declare
  v_classe text;
  v_membres uuid[];
begin
  -- Un message que le filtre a marqué n'a rien à faire dans une
  -- notification : il est peut-être en route vers la corbeille.
  if new.flagged or new.deleted_at is not null then
    return new;
  end if;

  select c.name into v_classe from public.classrooms c where c.id = new.classroom_id;

  select array_agg(m.user_id) into v_membres
    from public.classroom_members m
   where m.classroom_id = new.classroom_id
     and m.status = 'active'
     and m.user_id <> new.user_id
     -- Le silence de quinze minutes, par élève et par classe.
     and not exists (
       select 1
         from public.notifications n
        where n.user_id = m.user_id
          and n.kind = 'fil'
          and n.data ->> 'classroom' = new.classroom_id::text
          and n.created_at > now() - interval '15 minutes'
     );

  perform public.push_notify(
    v_membres,
    'fil',
    coalesce(v_classe, 'Ta classe'),
    -- Pas le message. Voir l'en-tête, décision 1.
    'Nouveaux messages dans le fil',
    coalesce(v_classe, 'Klas ou'),
    'Gen nouvo mesaj nan fil la',
    jsonb_build_object(
      'route', '/fil/' || new.classroom_id::text,
      'classroom', new.classroom_id::text
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_fil on public.classroom_messages;
create trigger trg_notify_fil
  after insert on public.classroom_messages
  for each row execute function public.notify_classroom_message();


-- ═══════════════════════════════════════════════════════════════
--  L'ENVOI
--
--  Vide la file vers l'API d'Expo, cent messages au plus par
--  appel — c'est la limite qu'elle documente.
--
--  Marque les lignes AVANT l'appel : `net.http_post` est
--  asynchrone et rend un identifiant, pas un résultat. Si on
--  attendait une confirmation qui n'arrive jamais dans la même
--  transaction, le prochain passage renverrait les mêmes
--  notifications, et l'élève recevrait deux fois le même devoir.
--
--  `attempts` est là pour le cas inverse : une ligne qu'on n'a
--  jamais réussi à marquer ne tourne pas en boucle éternellement.
-- ═══════════════════════════════════════════════════════════════

create or replace function public.push_flush()
returns integer
language plpgsql security definer set search_path to ''
as $$
declare
  v_messages jsonb;
  v_ids bigint[];
  n integer;
begin
  -- Pas de verrou explicite : pg_cron ne lance jamais deux fois le
  -- même travail en parallèle, et le marquage qui suit se fait dans
  -- la même transaction que la lecture.
  with a_envoyer as (
    select n.id, n.title, n.body, n.data, t.token, t.platform
      from public.notifications n
      join public.push_tokens t on t.user_id = n.user_id
     where n.sent_at is null
       and n.attempts < 3
       and n.created_at > now() - interval '2 days'
     order by n.created_at
     limit 100
  )
  select jsonb_agg(
           jsonb_build_object(
             'to', token,
             'title', title,
             'body', body,
             'data', data,
             'sound', 'default',
             'channelId', 'default',
             'priority', 'high'
           )
         ),
         array_agg(distinct id)
    into v_messages, v_ids
    from a_envoyer;

  if v_messages is null then
    return 0;
  end if;

  update public.notifications
     set sent_at  = now(),
         attempts = attempts + 1
   where id = any (v_ids);

  perform net.http_post(
    url     := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Accept', 'application/json'
               ),
    body    := v_messages
  );

  n := cardinality(v_ids);
  return n;
end;
$$;

revoke execute on function public.push_flush() from public, anon, authenticated;


-- ── Le battement ──────────────────────────────────────────────
--
-- Toutes les minutes. Une notification de devoir qui arrive
-- soixante secondes plus tard ne change rien pour un élève ; un
-- déclencheur qui attend une réponse HTTP, si.

select cron.unschedule('edem-push')
 where exists (select 1 from cron.job where jobname = 'edem-push');

select cron.schedule('edem-push', '* * * * *', $cron$ select public.push_flush(); $cron$);


-- ── Ménage ────────────────────────────────────────────────────
--
-- La file n'est pas une archive. Ce qui a plus de trente jours ne
-- sert plus à personne et alourdit chaque passage.

select cron.unschedule('edem-push-menage')
 where exists (select 1 from cron.job where jobname = 'edem-push-menage');

select cron.schedule(
  'edem-push-menage',
  '17 3 * * *',
  $cron$ delete from public.notifications where created_at < now() - interval '30 days'; $cron$
);
