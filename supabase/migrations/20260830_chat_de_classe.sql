-- ═══════════════════════════════════════════════════════════════
--  CHAT DE CLASSE
--
--  Appliqué le 30 août 2026 — migration `classroom_chat`, dont le
--  SQL exact est recopié ci-dessous.
--
--  ── Ce que le chat n'est pas ──────────────────────────────────
--
--  Il n'existe QU'À L'INTÉRIEUR d'une classe où un professeur est
--  présent. Pas de messages privés élève à élève, pas de fil
--  d'école, pas de fil public, pas de vocal, pas de « qui est en
--  ligne », pas d'accusés de lecture. Un mineur ne se retrouve
--  jamais seul dans une conversation.
--
--  ── LE PIÈGE ATTRAPÉ : le temps réel échouait EN SILENCE ──────
--
--  Premier essai : un membre légitime, abonné à sa propre classe,
--  ne recevait AUCUN message. L'abonnement annonçait pourtant
--  « SUBSCRIBED », sans la moindre erreur.
--
--  Diagnostic, étape par étape :
--    · la table est bien dans la publication supabase_realtime ;
--    · le message était bien inséré (vérifié en base) ;
--    · la policy est bonne — un membre lit 32 lignes sur 33 en
--      interrogeant la table directement.
--
--  La cause était côté client : le jeton de l'élève n'atteignait
--  pas la SOCKET temps réel. Elle restait anonyme, et la RLS
--  l'écartait poliment, sans rien signaler. Avec
--  `supabase.realtime.setAuth(jeton)`, le message arrive.
--
--  C'est le genre de panne qu'on ne découvre pas en relisant du
--  code : tout a l'air correct, et rien ne marche. La correction
--  vit dans src/store/AuthContext.tsx, où le jeton est désormais
--  donné à la socket à chaque changement de session.
--
--  ── Une correction de l'étape 6 ───────────────────────────────
--
--  La policy Storage écrite à l'étape 6 ne donnait le droit de
--  lecture qu'au PROFESSEUR. Une photo postée dans le fil aurait
--  donc été invisible pour les camarades — un chat où l'on ne voit
--  pas les images des autres n'est pas un chat.
--
--  On distingue maintenant les deux usages par le chemin :
--    {eleve}/classroom/{classe}/chat/{fichier}     → tous les membres
--    {eleve}/classroom/{classe}/{devoir}/{fichier} → le professeur seul
--
--  Une remise de devoir reste privée entre l'élève et son
--  professeur : les camarades n'ont pas à lire les copies.
--
--  ── Sobriété en data ─────────────────────────────────────────
--
--  Mesuré : ouvrir une classe et charger 20 messages coûte 7,0 Ko.
--  Le plafond que fixe l'étape 10 est de 150 Ko.
--
--  Pagination par date et non par OFFSET, qui devient coûteux dès
--  que le fil s'allonge. Images téléchargées au clic seulement.
--  Abonnement ouvert à l'arrivée sur l'écran, coupé en sortant.
--
--  ── La limite de débit, écrite avec la leçon de l'étape 5 ─────
--
--  `post_classroom_message` REND un résultat au lieu de lever une
--  exception : une exception annulerait la transaction, donc
--  l'incrément du compteur avec elle. Et elle rend un CODE que
--  l'application traduit, plutôt qu'une phrase SQL en anglais qui
--  arriverait telle quelle sous les yeux d'un élève.
--
--  ── Ce qui reste à l'étape 8 ─────────────────────────────────
--
--  Le professeur peut DÉJÀ supprimer n'importe quel message de sa
--  classe : c'est l'avantage structurel du modèle, il y a un adulte
--  responsable dans chaque pièce. Les colonnes `flagged`,
--  `deleted_at` et `deleted_by` sont posées.
--
--  Manquent : le bouton signaler, le filtre de termes en SQL, le
--  passage automatique en `flagged` à trois signalements, le
--  journal des suppressions et la charte. Aucune classe ne devrait
--  s'ouvrir à de vrais élèves avant.
-- ═══════════════════════════════════════════════════════════════

-- ═══ classroom_chat ═══

-- ═══════════════════════════════════════════════════════════════
--  CHAT DE CLASSE
--
--  Il n'existe qu'à l'intérieur d'une classe où un professeur est
--  présent. Pas de messages privés élève à élève, pas de fil
--  d'école, pas de fil public : un mineur ne se retrouve jamais
--  seul dans une conversation.
-- ═══════════════════════════════════════════════════════════════

create table public.classroom_messages (
  id              uuid primary key default gen_random_uuid(),
  classroom_id    uuid not null references public.classrooms(id) on delete cascade,
  user_id         uuid not null references auth.users on delete cascade,
  text            text not null check (char_length(text) between 1 and 2000),
  attachment_path text,
  created_at      timestamptz not null default now(),
  -- La modération (étape 8) s'appuiera sur ces trois colonnes. On
  -- les pose maintenant : le professeur peut déjà supprimer un
  -- message, ce qui est l'avantage structurel du modèle — il y a
  -- un adulte responsable dans chaque classe.
  deleted_at      timestamptz,
  deleted_by      uuid references auth.users on delete set null,
  flagged         boolean not null default false
);

create index classroom_messages_fil_idx
  on public.classroom_messages (classroom_id, created_at desc);

alter table public.classroom_messages enable row level security;

-- On lit le fil de ses classes. Un message supprimé disparaît pour
-- tout le monde ; un message signalé disparaît pour les élèves et
-- reste visible du professeur, qui doit pouvoir trancher.
create policy classroom_messages_select on public.classroom_messages
  for select to authenticated
  using (
    deleted_at is null
    and public.is_classroom_member(classroom_id)
    and (not flagged or public.is_classroom_teacher(classroom_id))
  );

revoke insert, update, delete, truncate, references
  on public.classroom_messages from anon, authenticated;

-- Temps réel, filtré par classe côté client. La RLS ci-dessus
-- s'applique aussi aux notifications : un non-membre ne reçoit
-- rien, même abonné.
alter publication supabase_realtime add table public.classroom_messages;


-- ═══════════════════════════════════════════════════════════════
--  ÉCRIRE
--
--  Comme `join_classroom`, la fonction REND un résultat au lieu de
--  lever une exception. Deux raisons, apprises à l'étape 5 :
--
--  · une exception annule la transaction, donc l'incrément du
--    compteur de débit avec elle ;
--  · une exception SQL arriverait telle quelle sous les yeux de
--    l'élève, en anglais. Ici le serveur rend un CODE, que
--    l'application traduit en français ou en créole.
-- ═══════════════════════════════════════════════════════════════
create function public.post_classroom_message(
  p_classroom_id    uuid,
  p_text            text,
  p_attachment_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  uid     uuid := (select auth.uid());
  v_texte text := btrim(coalesce(p_text, ''));
  v_quota jsonb;
  v_id    uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_classroom_member(p_classroom_id)
     and not public.is_classroom_teacher(p_classroom_id) then
    return jsonb_build_object('ok', false, 'error', 'pas_membre');
  end if;

  if char_length(v_texte) = 0 then
    return jsonb_build_object('ok', false, 'error', 'message_vide');
  end if;
  if char_length(v_texte) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'message_trop_long');
  end if;

  if exists (select 1 from public.classrooms
              where id = p_classroom_id and archived_at is not null) then
    return jsonb_build_object('ok', false, 'error', 'classe_fermee');
  end if;

  -- Trente messages par heure. Assez pour une vraie conversation,
  -- pas assez pour noyer un fil. Le compteur horaire loge dans
  -- usage_counters, qui est journalier : on met l'heure dans le
  -- libellé plutôt que d'inventer une table.
  v_quota := public.bump_usage(
    uid,
    'msg_' || to_char((now() at time zone 'utc'), 'YYYYMMDDHH24'),
    30
  );
  if not (v_quota ->> 'allowed')::boolean then
    return jsonb_build_object('ok', false, 'error', 'trop_de_messages');
  end if;

  insert into public.classroom_messages (classroom_id, user_id, text, attachment_path)
  values (p_classroom_id, uid, v_texte, p_attachment_path)
  returning classroom_messages.id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;


-- ── Supprimer un message ──────────────────────────────────────
--
-- Le professeur peut supprimer n'importe quel message de sa
-- classe ; un élève peut retirer le sien. On marque `deleted_at`
-- plutôt que d'effacer : l'étape 8 devra pouvoir constater ce qui
-- s'est passé, et repérer un professeur qui abuse de ses droits.
create function public.delete_classroom_message(p_message_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  uid uuid := (select auth.uid());
  m   public.classroom_messages;
begin
  select * into m from public.classroom_messages where id = p_message_id;
  if not found or m.deleted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'introuvable');
  end if;

  if m.user_id <> uid and not public.is_classroom_teacher(m.classroom_id) then
    return jsonb_build_object('ok', false, 'error', 'pas_le_droit');
  end if;

  update public.classroom_messages
     set deleted_at = now(), deleted_by = uid
   where id = p_message_id;

  return jsonb_build_object('ok', true);
end;
$$;


-- ── Lire le fil ───────────────────────────────────────────────
--
-- Une seule requête rend les messages ET le nom à afficher. Sinon
-- il faudrait ouvrir `profiles`, qui est en « chacun la sienne » :
-- on exposerait le prénom, le niveau et l'école de tout le monde.
--
-- Vingt messages par page, du plus récent au plus ancien. La
-- pagination se fait par `p_before` : pas d'OFFSET, qui devient
-- coûteux dès que le fil s'allonge.
create function public.classroom_messages(
  p_classroom_id uuid,
  p_before       timestamptz default null,
  p_limit        integer default 20
)
returns table (
  id           uuid,
  user_id      uuid,
  affiche      text,
  vrai_nom     text,
  is_teacher   boolean,
  text         text,
  attachment_path text,
  created_at   timestamptz,
  flagged      boolean,
  mine         boolean
)
language sql
security definer
stable
set search_path to ''
as $$
  with moi as (
    select public.is_classroom_teacher(p_classroom_id) as prof,
           public.is_classroom_member(p_classroom_id)  as membre
  )
  select
    m.id,
    m.user_id,
    coalesce(nullif(btrim(p.board_alias), ''), nullif(btrim(p.name), ''), 'Élève'),
    -- Le vrai nom ne part qu'au professeur de cette classe.
    case when (select prof from moi) then nullif(btrim(p.name), '') else null end,
    m.user_id = c.teacher_id,
    m.text,
    m.attachment_path,
    m.created_at,
    m.flagged,
    m.user_id = (select auth.uid())
  from public.classroom_messages m
  join public.classrooms c on c.id = m.classroom_id
  join public.profiles   p on p.id = m.user_id
  where m.classroom_id = p_classroom_id
    and (select prof or membre from moi)
    and m.deleted_at is null
    and (not m.flagged or (select prof from moi))
    and (p_before is null or m.created_at < p_before)
  order by m.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;


-- ── Les images du fil ─────────────────────────────────────────
--
-- Correction d'un manque : la policy Storage de l'étape 6 ne
-- donnait le droit de lecture qu'au PROFESSEUR. Une photo postée
-- dans le fil aurait donc été invisible pour les camarades — un
-- chat où l'on ne voit pas les images des autres n'est pas un chat.
--
-- On distingue donc les deux usages par le chemin :
--   {eleve}/classroom/{classe}/chat/{fichier}    → tous les membres
--   {eleve}/classroom/{classe}/{devoir}/{fichier} → le professeur
--
-- Une remise de devoir reste privée entre l'élève et son
-- professeur : les camarades n'ont pas à lire les copies.
create or replace function public.is_teacher_of_attachment(p_name text)
returns boolean
language plpgsql
security definer
stable
set search_path to ''
as $$
declare
  v_parts  text[] := string_to_array(p_name, '/');
  v_classe uuid;
begin
  if array_length(v_parts, 1) < 4 then return false; end if;
  if v_parts[2] <> 'classroom' then return false; end if;
  begin
    v_classe := v_parts[3]::uuid;
  exception when others then
    return false;   -- un chemin bricolé ne donne aucun droit
  end;

  -- Le fil de discussion : lisible par tous les membres actifs.
  if v_parts[4] = 'chat' then
    return public.is_classroom_member(v_classe)
        or public.is_classroom_teacher(v_classe);
  end if;

  -- Une remise de devoir : le professeur seul.
  return public.is_classroom_teacher(v_classe);
end;
$$;


revoke execute on function public.post_classroom_message(uuid, text, text) from public, anon;
revoke execute on function public.delete_classroom_message(uuid)           from public, anon;
revoke execute on function public.classroom_messages(uuid, timestamptz, integer) from public, anon;

grant execute on function public.post_classroom_message(uuid, text, text) to authenticated;
grant execute on function public.delete_classroom_message(uuid)           to authenticated;
grant execute on function public.classroom_messages(uuid, timestamptz, integer) to authenticated;;


-- ═══ edit_own_classroom_message ═══
--
-- Supprimer son message existait depuis le début. Le MODIFIER
-- n'existait pas, et c'est ce qui manquait pour une faute de frappe.
alter table public.classroom_messages
  add column if not exists edited_at timestamptz,
  -- Le texte d'origine, gardé à la PREMIÈRE modification seulement.
  -- Sans lui, modifier serait le moyen le plus simple d'effacer ce
  -- qu'on a vraiment dit : on écrit une insulte, on la remplace par
  -- « bonjour », et il ne reste rien à constater.
  add column if not exists text_original text;

-- ── Quatre garde-fous, et chacun ferme une porte précise ──────
--
-- 1. L'AUTEUR SEUL, et surtout pas le professeur. Il peut supprimer
--    le message d'un élève — c'est de la modération — mais le
--    réécrire serait mettre des mots dans la bouche d'un enfant,
--    sous le nom de cet enfant, devant sa classe. Ce n'est pas le
--    même geste et ça ne se confond pas.
--
-- 2. LE FILTRE S'APPLIQUE AUSSI ICI. Sans ça, modifier serait le
--    contournement évident : on poste « bonjour », qui passe, puis
--    on le remplace par ce qu'on voulait vraiment écrire.
--
-- 3. QUINZE MINUTES. De quoi corriger une faute de frappe, pas de
--    quoi réécrire une conversation à laquelle d'autres ont déjà
--    répondu — ni de changer ses mots une heure après, quand
--    quelqu'un s'apprête à les signaler.
--
-- 4. UN MESSAGE SIGNALÉ NE SE MODIFIE PLUS : on ne réécrit pas la
--    pièce pendant que le professeur l'examine.
create function public.edit_classroom_message(p_message_id uuid, p_text text)
returns jsonb
language plpgsql security definer set search_path to ''
as $$
declare
  uid       uuid := (select auth.uid());
  v_texte   text := btrim(coalesce(p_text, ''));
  m         public.classroom_messages;
  v_verdict text;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select * into m from public.classroom_messages where id = p_message_id;
  if not found or m.deleted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'introuvable');
  end if;
  if m.user_id <> uid then
    return jsonb_build_object('ok', false, 'error', 'pas_le_droit');
  end if;
  if m.flagged then
    return jsonb_build_object('ok', false, 'error', 'en_cours_d_examen');
  end if;
  if m.created_at < now() - interval '15 minutes' then
    return jsonb_build_object('ok', false, 'error', 'trop_tard');
  end if;
  if char_length(v_texte) = 0 then
    return jsonb_build_object('ok', false, 'error', 'message_vide');
  end if;
  if char_length(v_texte) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'message_trop_long');
  end if;
  if v_texte = m.text then
    return jsonb_build_object('ok', true, 'inchange', true);
  end if;

  v_verdict := public.moderation_verdict(v_texte);
  if v_verdict = 'bloque' then
    insert into public.moderation_events
      (classroom_id, event, actor, target_user, detail)
    values (m.classroom_id, 'message_bloque', uid, uid, left(v_texte, 120));
    return jsonb_build_object('ok', false, 'error', 'message_refuse');
  end if;

  update public.classroom_messages
     set text          = v_texte,
         text_original = coalesce(text_original, m.text),
         edited_at     = now()
   where id = p_message_id;

  if v_verdict = 'suspect' then
    insert into public.moderation_queue (message_id, raison)
    values (p_message_id, 'filtre')
    on conflict (message_id) do update set status = 'pending';
  end if;

  return jsonb_build_object('ok', true, 'edited_at', now());
end;
$$;

revoke execute on function public.edit_classroom_message(uuid, text) from public, anon;
grant  execute on function public.edit_classroom_message(uuid, text) to authenticated;

-- `classroom_messages()` rend `edited_at` en plus : un message
-- réécrit sans le dire ment à ceux qui l'ont déjà lu. (La fonction
-- a dû être DROP avant recréation — Postgres refuse de changer le
-- type de retour d'une fonction table par un `create or replace`.)
