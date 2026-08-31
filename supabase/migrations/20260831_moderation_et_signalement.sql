-- ═══════════════════════════════════════════════════════════════
--  MODÉRATION ET SIGNALEMENT
--
--  Appliqué le 31 août 2026, en quatre migrations Supabase :
--    · moderation_charter_terms_and_reports
--    · moderation_rpcs_and_journal
--    · moderation_ai_queue
--    · moderation_phone_detection_on_condensed_digits
--    · charter_applies_to_students_not_the_teacher
--    · moderation_batch_scoped_to_one_classroom
--
--  ── Pourquoi cette étape ne se reporte pas ────────────────────
--
--  Une messagerie entre mineurs sans modération n'est pas un
--  produit inachevé, c'est un produit dangereux. Le chat de
--  l'étape 7 existe déjà en base ; aucune vraie classe ne doit
--  s'ouvrir avant ce fichier.
--
--  ── Les quatre lignes de défense, de la moins chère à la plus ─
--
--  1. La STRUCTURE. Il n'y a pas de messages privés : un mineur
--     n'est jamais seul dans une conversation. C'est l'étape 7 qui
--     l'a garanti, et c'est la protection qui coûte zéro.
--  2. Le FILTRE SQL, gratuit, appliqué à l'insertion. Une liste de
--     termes en français et en créole. Il refuse le pire et marque
--     le douteux.
--  3. Le PROFESSEUR, premier modérateur. Il y a déjà un adulte
--     responsable dans chaque classe : c'est l'avantage structurel
--     du modèle. Tout le reste n'est qu'un moyen de lui montrer
--     vite ce qui mérite son attention.
--  4. LE MODÈLE, en dernier et jamais avant. Il ne voit que les
--     messages que le filtre a marqués ou que quelqu'un a
--     signalés. Faire passer chaque message par l'IA serait la
--     ligne la plus chère de la facture pour la fonctionnalité la
--     moins rentable.
--
--  ── Trois pièges attrapés en écrivant ce fichier ──────────────
--
--  1. « disputer » contient « pute ». Un filtre qui cherche ses
--     termes n'importe où dans le texte censure « ils se sont
--     disputés ». D'où deux formes de comparaison : mot entier
--     pour les termes courts, et recherche dans le texte recollé
--     UNIQUEMENT pour les termes longs et sans ambiguïté, ceux
--     qu'on écrit espacés pour passer au travers.
--
--  2. Le programme scolaire dit des mots crus. Un cours de SVT
--     traite la reproduction humaine : « pénis », « vagin »,
--     « sexe », « rapport sexuel » appartiennent au programme.
--     Les bloquer ferait de la modération un obstacle au cours.
--     Aucun ne figure dans la liste. De même « nèg » en créole
--     veut simplement dire « type » : le filtrer serait absurde.
--
--  3. Trois signalements masquent un message — mais trois
--     signalements de TROIS PERSONNES différentes. Sans la
--     contrainte d'unicité (cible, signaleur), un seul élève
--     cliquerait trois fois et ferait taire n'importe qui.
--
--  ── Un ajout au plan : le numéro de téléphone ─────────────────
--
--  Le plan ne le demande pas. Mais toute l'architecture repose sur
--  « aucun échange hors d'une classe où un adulte est présent », et
--  il existe exactement une façon de la contourner : écrire dans
--  le fil « ekri m sou whatsapp 3XXXXXXX ». Le filtre marque donc
--  en SUSPECT tout message contenant un numéro haïtien à huit
--  chiffres ou le nom d'une messagerie. Il ne bloque pas, il
--  montre au professeur.
--
--  ── Ce qui est volontairement absent ──────────────────────────
--
--  Pas de bannissement automatique, pas de score de réputation,
--  pas de suppression automatique par l'IA. Une machine peut
--  MASQUER en attendant, jamais trancher : c'est le professeur qui
--  décide, et sa décision est journalisée.
-- ═══════════════════════════════════════════════════════════════


-- ═══ moderation_charter_terms_and_reports ═══

-- ── La charte ─────────────────────────────────────────────────
--
-- Cinq lignes acceptées à la première entrée dans une classe. Le
-- TEXTE vit dans src/i18n (fr.ts et ht.ts) : il doit rester
-- lisible hors ligne et dans les deux langues, et une charte
-- stockée en base coûterait une requête à chaque ouverture d'écran
-- pour un texte qui ne change jamais.
--
-- La colonne n'est PAS ajoutée aux droits colonne de
-- `authenticated` : comme `role` et `profile_completed_at`, elle
-- n'est écrite que par une fonction DEFINER. Accepter une charte
-- en modifiant soi-même sa ligne n'aurait aucun sens.
alter table public.profiles
  add column if not exists charter_accepted_at timestamptz;


-- ── La normalisation, et pourquoi elle est agressive ──────────
--
-- Un élève qui veut insulter écrit « s a l o p e », « $alope »,
-- « saloooope » ou « salope ». Les quatre doivent donner la même
-- chose. D'où, dans l'ordre :
--   · minuscules et accents retirés (norm_text, déjà en place) ;
--   · chiffres et symboles ramenés à leur lettre (0→o, 3→e, $→s) ;
--   · tout ce qui n'est pas une lettre ou un chiffre devient une
--     espace ;
--   · les lettres répétées sont réduites à une seule.
--
-- IMMUTABLE, parce qu'elle sert à une colonne générée.
--
-- Attention : ce traitement DÉTRUIT les nombres — les chiffres
-- deviennent des lettres. La détection de numéro de téléphone,
-- plus bas, travaille donc sur le texte AVANT ce passage.
create or replace function public.norm_moderation(p_text text)
returns text
language sql
immutable
parallel safe
set search_path to ''
as $$
  select btrim(
    regexp_replace(
      regexp_replace(
        translate(public.norm_text(p_text), '0134578@$!|', 'oieastbasii'),
        '[^a-z0-9]+', ' ', 'g'),
      '(.)\1+', '\1', 'g')
  )
$$;


-- ── La liste de termes ────────────────────────────────────────
--
-- RLS active SANS aucune policy : personne ne lit cette table via
-- l'API. Une liste de mots interdits lisible par les élèves est un
-- mode d'emploi pour passer au travers.
create table public.moderation_terms (
  id         bigint generated always as identity primary key,
  terme      text not null,
  -- La forme comparée. Générée, donc jamais désynchronisée du
  -- terme saisi : ajouter un mot ne demande pas de penser à le
  -- normaliser à la main.
  terme_norm text generated always as (public.norm_moderation(terme)) stored,
  lang       text not null default 'fr' check (lang in ('fr', 'ht', 'xx')),
  gravite    text not null check (gravite in ('bloque', 'suspect')),
  -- true  : comparé comme un mot entier (« pute » ne doit pas
  --         déclencher sur « disputer »).
  -- false : cherché aussi dans le texte recollé, réservé aux
  --         termes longs qu'on écrit espacés pour passer.
  mot_entier boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index moderation_terms_unique
  on public.moderation_terms (terme_norm, gravite);

alter table public.moderation_terms enable row level security;
revoke all on public.moderation_terms from anon, authenticated;


-- ── Le journal ────────────────────────────────────────────────
--
-- « Un prof qui abuse de ses droits doit être repérable. » On ne
-- reconstitue pas après coup un historique qu'on n'a pas gardé.
-- Comme `role_events` : RLS active, aucune policy, seuls postgres
-- et le service_role y accèdent. Un professeur ne lit pas le
-- journal qui sert à le surveiller.
create table public.moderation_events (
  id           bigint generated always as identity primary key,
  classroom_id uuid references public.classrooms(id) on delete set null,
  event        text not null check (event in (
                 'message_bloque',    -- le filtre a refusé l'envoi
                 'message_signale',   -- un élève a signalé
                 'message_masque',    -- 3 signalements, ou l'IA
                 'message_demasque',  -- le prof a jugé que c'était bon
                 'message_supprime',
                 'membre_retire',
                 'charte_acceptee'
               )),
  actor        uuid,   -- qui a agi
  target_user  uuid,   -- l'auteur du message, ou le membre retiré
  target_id    uuid,   -- le message ou le signalement concerné
  detail       text,
  created_at   timestamptz not null default now()
);

create index moderation_events_acteur_idx
  on public.moderation_events (actor, created_at desc);
create index moderation_events_classe_idx
  on public.moderation_events (classroom_id, created_at desc);

alter table public.moderation_events enable row level security;
revoke all on public.moderation_events from anon, authenticated;


-- ── Les signalements ──────────────────────────────────────────
create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  target_type  text not null check (target_type in ('message', 'submission', 'profile')),
  target_id    uuid not null,
  classroom_id uuid references public.classrooms(id) on delete cascade,
  reporter_id  uuid not null references auth.users on delete cascade,
  reason       text not null check (reason in
                 ('insulte', 'harcelement', 'contenu_sexuel', 'triche', 'autre')),
  detail       text check (detail is null or char_length(detail) <= 500),
  status       text not null default 'open'
               check (status in ('open', 'handled', 'dismissed')),
  handled_by   uuid references auth.users on delete set null,
  handled_at   timestamptz,
  created_at   timestamptz not null default now(),
  -- LA contrainte qui fait tenir la règle des trois signalements :
  -- un signalement par personne et par cible. Sans elle, un seul
  -- élève cliquerait trois fois et ferait taire n'importe qui.
  unique (target_type, target_id, reporter_id)
);

create index reports_classe_idx
  on public.reports (classroom_id, status, created_at desc);
create index reports_cible_idx
  on public.reports (target_type, target_id) where status = 'open';

alter table public.reports enable row level security;

-- L'élève voit ses propres signalements — il doit savoir que le
-- sien est bien parti. Le professeur voit ceux de ses classes.
-- Personne ne voit qui d'autre a signalé quoi.
create policy reports_select on public.reports
  for select to authenticated
  using (
    reporter_id = (select auth.uid())
    or public.is_classroom_teacher(classroom_id)
  );

revoke insert, update, delete, truncate, references
  on public.reports from anon, authenticated;


-- ── Le verdict ────────────────────────────────────────────────
--
-- Rend 'ok', 'suspect' ou 'bloque'. C'est tout : ce qu'on en fait
-- appartient à l'appelant.
--
-- La table entière est parcourue à chaque message. Avec quelques
-- dizaines de termes tenus en cache par Postgres, c'est moins cher
-- que la moindre jointure — et sans commune mesure avec un appel à
-- un modèle.
create or replace function public.moderation_verdict(p_text text)
returns text
language plpgsql
stable
set search_path to ''
as $$
declare
  v_brut  text;   -- accents retirés, CHIFFRES INTACTS
  v_mots  text;   -- normalisé, entouré d'espaces
  v_colle text;   -- normalisé, espaces retirés
  v_pire  text := 'ok';
  r       record;
begin
  if coalesce(btrim(p_text), '') = '' then return 'ok'; end if;

  v_brut  := public.norm_text(p_text);
  v_mots  := ' ' || public.norm_moderation(p_text) || ' ';
  v_colle := replace(v_mots, ' ', '');

  for r in select terme_norm, gravite, mot_entier from public.moderation_terms loop
    if r.mot_entier then
      -- Mot entier : « pute » ne déclenche pas sur « disputer ».
      if position(' ' || r.terme_norm || ' ' in v_mots) > 0 then
        if r.gravite = 'bloque' then return 'bloque'; end if;
        v_pire := 'suspect';
      end if;
    else
      -- Texte recollé : attrape « s a l o p e ». Réservé aux
      -- termes longs, sinon les faux positifs explosent.
      if position(replace(r.terme_norm, ' ', '') in v_colle) > 0 then
        if r.gravite = 'bloque' then return 'bloque'; end if;
        v_pire := 'suspect';
      end if;
    end if;
  end loop;

  -- Un numéro haïtien à huit chiffres (mobile : 3 ou 4 en tête).
  -- Jamais bloquant — un exercice peut contenir un grand nombre —
  -- mais toujours montré au professeur. C'est la seule façon de
  -- contourner « aucun échange hors de la classe ».
  --
  -- La recherche se fait sur les CHIFFRES RECOLLÉS. Première
  -- version : on cherchait huit chiffres d'affilée dans le texte,
  -- et « appelle-moi au 3712 4590 » passait tranquillement. Une
  -- espace suffisait à défaire le filtre.
  if v_pire = 'ok'
     and regexp_replace(v_brut, '[^0-9]', '', 'g') ~ '(^|[^0-9])?[34][0-9]{7}' then
    v_pire := 'suspect';
  end if;

  return v_pire;
end;
$$;


-- ── La liste, en français et en créole ────────────────────────
--
-- Choix assumé : on BLOQUE ce qui n'a aucun usage scolaire
-- possible, et on marque SUSPECT tout ce qui est ambigu — « kòk »
-- est un coq, « koko » une noix de coco, « chatte » un animal. Se
-- tromper en bloquant, c'est empêcher un élève de poser sa
-- question ; se tromper en marquant, c'est faire lire une ligne de
-- plus au professeur. Le second coûte moins cher.
insert into public.moderation_terms (terme, lang, gravite, mot_entier) values
  -- Insultes françaises sans usage scolaire
  ('pute', 'fr', 'bloque', true),
  ('putain', 'fr', 'bloque', true),
  ('salope', 'fr', 'bloque', false),
  ('salaud', 'fr', 'bloque', true),
  ('connard', 'fr', 'bloque', false),
  ('connasse', 'fr', 'bloque', false),
  ('encule', 'fr', 'bloque', false),
  ('enfoire', 'fr', 'bloque', true),
  ('fils de pute', 'fr', 'bloque', false),
  ('nique ta mere', 'fr', 'bloque', false),
  ('ntm', 'fr', 'bloque', true),
  ('fdp', 'fr', 'bloque', true),
  ('batard', 'fr', 'bloque', true),
  ('pedale', 'fr', 'bloque', true),
  ('pede', 'fr', 'bloque', true),
  ('tapette', 'fr', 'bloque', true),
  ('salopard', 'fr', 'bloque', true),
  ('couillon', 'fr', 'bloque', true),
  -- Sexuel explicite. Ni « sexe », ni « pénis », ni « vagin » :
  -- ce sont des mots du programme de SVT.
  ('porno', 'fr', 'bloque', false),
  ('bite', 'fr', 'bloque', true),
  ('nudes', 'xx', 'bloque', true),
  ('sextape', 'xx', 'bloque', false),
  ('suce moi', 'fr', 'bloque', false),
  ('nique moi', 'fr', 'bloque', false),
  -- Insultes créoles sans usage scolaire
  ('bouzen', 'ht', 'bloque', false),
  ('langet', 'ht', 'bloque', false),
  ('langet manman', 'ht', 'bloque', false),
  ('masisi', 'ht', 'bloque', false),
  ('madivin', 'ht', 'bloque', false),
  ('zozo', 'ht', 'bloque', false),
  ('makorel', 'ht', 'bloque', false),
  ('makrel', 'ht', 'bloque', true),
  ('kounan', 'ht', 'bloque', true),
  ('salte', 'ht', 'suspect', true),
  ('sanzave', 'ht', 'suspect', true),
  ('bouda', 'ht', 'suspect', true),
  ('kaka', 'ht', 'suspect', true),
  -- Ambigus : un coq, une noix de coco, un animal. Marqués, pas
  -- bloqués — le professeur tranche en un coup d'œil.
  ('kok', 'ht', 'suspect', true),
  ('koko', 'ht', 'suspect', true),
  ('chatte', 'fr', 'suspect', true),
  ('couilles', 'fr', 'suspect', true),
  -- Menaces et harcèlement
  ('je vais te tuer', 'fr', 'bloque', false),
  ('va te tuer', 'fr', 'bloque', false),
  ('tue toi', 'fr', 'bloque', false),
  ('suicide toi', 'fr', 'bloque', false),
  ('m ap touye w', 'ht', 'bloque', false),
  ('ou ap mouri', 'ht', 'suspect', false),
  ('m ap bat ou', 'ht', 'suspect', false),
  ('je vais te frapper', 'fr', 'suspect', false),
  ('ferme ta gueule', 'fr', 'suspect', false),
  ('ta gueule', 'fr', 'suspect', false),
  ('pe bouch ou', 'ht', 'suspect', false),
  ('personne t aime', 'fr', 'suspect', false),
  ('pesonn pa renmen w', 'ht', 'suspect', false),
  -- Sortir de la classe : la seule façon de contourner
  -- « aucun échange privé entre élèves ».
  ('whatsapp', 'xx', 'suspect', false),
  ('wasap', 'xx', 'suspect', false),
  ('telegram', 'xx', 'suspect', false),
  ('snapchat', 'xx', 'suspect', false),
  ('instagram', 'xx', 'suspect', false),
  ('ekri m sou', 'ht', 'suspect', false),
  ('mon numero', 'fr', 'suspect', false),
  ('nimewo m', 'ht', 'suspect', false),
  -- Triche
  ('donne moi les reponses', 'fr', 'suspect', false),
  ('ban m repons yo', 'ht', 'suspect', false)
on conflict (terme_norm, gravite) do nothing;

revoke execute on function public.norm_moderation(text)    from public, anon, authenticated;
revoke execute on function public.moderation_verdict(text) from public, anon, authenticated;


-- ═══════════════════════════════════════════════════════════════
--  LA FILE DE RELECTURE — le deuxième temps du filtre
--
--  Le modèle ne voit QUE ce que le filtre a marqué ou que
--  quelqu'un a signalé. Sur un fil de classe ordinaire, cette file
--  reste vide, et la modération ne coûte rien.
--
--  Elle est volontairement asynchrone. Faire attendre l'élève
--  pendant qu'un modèle relit son message ajouterait deux secondes
--  à chaque envoi pour les 99 % de messages qui n'ont rien à se
--  reprocher — et rendrait le chat inutilisable dès que l'API du
--  fournisseur tousse.
--
--  Le professeur, lui, voit la pile immédiatement : l'avis de l'IA
--  est un avis qui arrive, jamais une condition pour agir.
--
--  La table est créée ici, avant les fonctions : `classroom_moderation`
--  est en `language sql`, et Postgres résout les noms d'une fonction
--  SQL dès sa création — contrairement au plpgsql, qui attend
--  l'exécution.
-- ═══════════════════════════════════════════════════════════════
create table public.moderation_queue (
  message_id  uuid primary key
              references public.classroom_messages(id) on delete cascade,
  raison      text not null check (raison in ('filtre', 'signalement')),
  status      text not null default 'pending'
              check (status in ('pending', 'done', 'error')),
  verdict     text check (verdict in
              ('ok', 'insulte', 'harcelement', 'contenu_sexuel', 'triche', 'autre')),
  score       smallint check (score between 0 and 100),
  model       text,
  essais      smallint not null default 0,
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);

create index moderation_queue_pending_idx
  on public.moderation_queue (created_at) where status = 'pending';

-- RLS active, aucune policy : la file est une affaire de serveur.
alter table public.moderation_queue enable row level security;
revoke all on public.moderation_queue from anon, authenticated;


-- ═══ moderation_rpcs_and_journal ═══

-- ── Accepter la charte ────────────────────────────────────────
create or replace function public.accept_charter()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  uid  uuid := (select auth.uid());
  v_at timestamptz;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  -- On garde la PREMIÈRE acceptation : la réafficher un jour ne
  -- doit pas effacer la date qui prouve qu'elle a été lue.
  update public.profiles
     set charter_accepted_at = coalesce(charter_accepted_at, now())
   where id = uid
  returning charter_accepted_at into v_at;

  insert into public.moderation_events (event, actor, target_user)
  select 'charte_acceptee', uid, uid
  where v_at is not null
    and not exists (select 1 from public.moderation_events
                     where event = 'charte_acceptee' and actor = uid);

  return jsonb_build_object('ok', v_at is not null, 'accepted_at', v_at);
end;
$$;


-- ═══════════════════════════════════════════════════════════════
--  ÉCRIRE UN MESSAGE — la version filtrée
--
--  Trois ajouts à la fonction de l'étape 7, dans cet ordre précis :
--
--  1. La charte doit avoir été acceptée. Une charte que seule
--     l'application vérifierait ne serait qu'une décoration : un
--     client modifié la sauterait.
--  2. Le filtre. 'bloque' → le message n'existe jamais, et la
--     tentative est journalisée. 'suspect' → le message part
--     normalement mais entre dans la file de relecture.
--  3. Rien n'est masqué par le filtre seul. Un mot marqué n'est
--     pas une faute ; c'est au professeur de lire.
--
--  Comme avant : la fonction REND un code d'erreur au lieu de
--  lever. Une exception annulerait la transaction — donc le
--  compteur de débit ET la trace de la tentative bloquée avec elle.
--  C'est exactement le piège de l'étape 5.
-- ═══════════════════════════════════════════════════════════════
create or replace function public.post_classroom_message(
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
  uid       uuid := (select auth.uid());
  v_texte   text := btrim(coalesce(p_text, ''));
  v_prof    boolean;
  v_quota   jsonb;
  v_id      uuid;
  v_verdict text;
  v_charte  timestamptz;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  v_prof := public.is_classroom_teacher(p_classroom_id);

  if not public.is_classroom_member(p_classroom_id) and not v_prof then
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

  -- La charte est écrite POUR LES ÉLÈVES : « ton professeur lit
  -- tout et peut effacer un message ». Demander à un professeur de
  -- l'accepter n'aurait aucun sens. Ce qui l'engage, lui, c'est le
  -- journal des suppressions et des exclusions, qu'il ne peut pas
  -- effacer.
  if not v_prof then
    select charter_accepted_at into v_charte from public.profiles where id = uid;
    if v_charte is null then
      return jsonb_build_object('ok', false, 'error', 'charte_non_acceptee');
    end if;
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

  v_verdict := public.moderation_verdict(v_texte);

  if v_verdict = 'bloque' then
    -- Le message n'est écrit nulle part. On garde en revanche la
    -- trace de la tentative : un élève qui en accumule dix dans
    -- l'après-midi est une information que le professeur doit
    -- avoir, et l'extrait est ce qui lui permet d'en juger.
    insert into public.moderation_events
      (classroom_id, event, actor, target_user, detail)
    values (p_classroom_id, 'message_bloque', uid, uid, left(v_texte, 120));
    return jsonb_build_object('ok', false, 'error', 'message_refuse');
  end if;

  insert into public.classroom_messages (classroom_id, user_id, text, attachment_path)
  values (p_classroom_id, uid, v_texte, p_attachment_path)
  returning classroom_messages.id into v_id;

  -- Deuxième temps du filtre : le message est parti, mais il ira
  -- au modèle. Il n'est PAS masqué — un mot ambigu n'est pas une
  -- faute, et masquer sur un doute reviendrait à censurer.
  if v_verdict = 'suspect' then
    insert into public.moderation_queue (message_id, raison)
    values (v_id, 'filtre')
    on conflict (message_id) do nothing;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;


-- ═══════════════════════════════════════════════════════════════
--  SIGNALER
--
--  Deux touches côté élève, une fonction ici. Elle vérifie que
--  celui qui signale VOIT réellement ce qu'il signale : sans ça,
--  n'importe qui enverrait des identifiants au hasard pour faire
--  masquer les messages d'une classe où il n'est pas.
-- ═══════════════════════════════════════════════════════════════
create function public.report_content(
  p_target_type text,
  p_target_id   uuid,
  p_reason      text,
  p_detail      text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  uid       uuid := (select auth.uid());
  v_classe  uuid;
  v_auteur  uuid;
  v_quota   jsonb;
  v_nb      integer;
  v_id      uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  if p_target_type not in ('message', 'submission', 'profile') then
    return jsonb_build_object('ok', false, 'error', 'cible_inconnue');
  end if;
  if p_reason not in ('insulte', 'harcelement', 'contenu_sexuel', 'triche', 'autre') then
    return jsonb_build_object('ok', false, 'error', 'raison_inconnue');
  end if;

  -- Dix signalements par heure. Signaler doit rester facile ; en
  -- faire une arme doit rester impossible.
  v_quota := public.bump_usage(
    uid, 'report_' || to_char((now() at time zone 'utc'), 'YYYYMMDDHH24'), 10);
  if not (v_quota ->> 'allowed')::boolean then
    return jsonb_build_object('ok', false, 'error', 'trop_de_signalements');
  end if;

  -- ── La cible existe-t-elle, et la vois-tu ? ────────────────
  if p_target_type = 'message' then
    select m.classroom_id, m.user_id into v_classe, v_auteur
      from public.classroom_messages m
     where m.id = p_target_id and m.deleted_at is null;
  elsif p_target_type = 'submission' then
    select a.classroom_id, s.user_id into v_classe, v_auteur
      from public.submissions s
      join public.assignments a on a.id = s.assignment_id
     where s.id = p_target_id;
  else
    -- Un pseudonyme injurieux se signale aussi. On rattache le
    -- signalement à une classe commune, sinon aucun professeur ne
    -- pourrait le traiter.
    select cm.classroom_id, p_target_id into v_classe, v_auteur
      from public.classroom_members cm
     where cm.user_id = p_target_id
       and cm.status = 'active'
       and public.is_classroom_member(cm.classroom_id)
     limit 1;
  end if;

  if v_classe is null then
    return jsonb_build_object('ok', false, 'error', 'introuvable');
  end if;
  if not public.is_classroom_member(v_classe)
     and not public.is_classroom_teacher(v_classe) then
    return jsonb_build_object('ok', false, 'error', 'introuvable');
  end if;
  if v_auteur = uid then
    return jsonb_build_object('ok', false, 'error', 'ton_propre_contenu');
  end if;

  insert into public.reports
    (target_type, target_id, classroom_id, reporter_id, reason, detail)
  values
    (p_target_type, p_target_id, v_classe, uid, p_reason,
     nullif(btrim(coalesce(p_detail, '')), ''))
  on conflict (target_type, target_id, reporter_id) do nothing
  returning reports.id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'deja_signale');
  end if;

  insert into public.moderation_events
    (classroom_id, event, actor, target_user, target_id, detail)
  values (v_classe, 'message_signale', uid, v_auteur, p_target_id, p_reason);

  -- ── Trois personnes différentes → on masque ────────────────
  --
  -- L'unicité (cible, signaleur) garantit que ce compte est bien
  -- un compte de PERSONNES. Le message devient invisible aux
  -- élèves et reste visible du professeur, qui tranche. Ce n'est
  -- pas une sanction, c'est une mise en attente réversible.
  select count(*) into v_nb from public.reports
   where target_type = p_target_type and target_id = p_target_id
     and status = 'open';

  if p_target_type = 'message' and v_nb >= 3 then
    update public.classroom_messages
       set flagged = true
     where id = p_target_id and not flagged;

    if found then
      insert into public.moderation_events
        (classroom_id, event, actor, target_user, target_id, detail)
      values (v_classe, 'message_masque', null, v_auteur, p_target_id,
              v_nb || ' signalements');

      insert into public.moderation_queue (message_id, raison)
      values (p_target_id, 'signalement')
      on conflict (message_id) do update set raison = 'signalement',
                                             status = 'pending';
    end if;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id, 'signalements', v_nb);
end;
$$;


-- ═══════════════════════════════════════════════════════════════
--  CE QUE LE PROFESSEUR DOIT VOIR
--
--  Une seule fonction, une seule requête : la liste de ce qui
--  attend une décision. Signalements ouverts et messages masqués
--  arrivent ensemble — pour le professeur c'est la même pile.
--
--  Le vrai nom de l'élève est rendu, comme partout ailleurs dans
--  SA classe : modérer sans savoir qui a écrit n'aurait aucun sens.
-- ═══════════════════════════════════════════════════════════════
create function public.classroom_moderation(p_classroom_id uuid)
returns table (
  message_id    uuid,
  auteur_id     uuid,
  affiche       text,
  vrai_nom      text,
  extrait       text,
  attachment    boolean,
  flagged       boolean,
  raisons       text[],
  signalements  integer,
  details       text[],
  verdict_ia    text,
  score_ia      smallint,
  created_at    timestamptz
)
language sql
security definer
stable
set search_path to ''
as $$
  select
    m.id,
    m.user_id,
    coalesce(nullif(btrim(p.board_alias), ''), nullif(btrim(p.name), ''), 'Élève'),
    nullif(btrim(p.name), ''),
    left(m.text, 300),
    m.attachment_path is not null,
    m.flagged,
    coalesce(r.raisons, '{}'),
    coalesce(r.nb, 0),
    coalesce(r.details, '{}'),
    q.verdict,
    q.score,
    m.created_at
  from public.classroom_messages m
  join public.profiles p on p.id = m.user_id
  left join lateral (
    select array_agg(distinct x.reason)            as raisons,
           count(*)::integer                       as nb,
           array_remove(array_agg(x.detail), null) as details
      from public.reports x
     where x.target_type = 'message' and x.target_id = m.id and x.status = 'open'
  ) r on true
  left join public.moderation_queue q on q.message_id = m.id
  where m.classroom_id = p_classroom_id
    and public.is_classroom_teacher(p_classroom_id)
    and m.deleted_at is null
    -- Ce qui attend une décision : signalé, masqué, ou marqué par
    -- le filtre. Le reste du fil ne concerne pas cet écran.
    and (m.flagged or coalesce(r.nb, 0) > 0 or q.message_id is not null)
  order by m.flagged desc, coalesce(r.nb, 0) desc, m.created_at desc
  limit 50;
$$;


-- ── Les tentatives bloquées, par élève ────────────────────────
--
-- Le filtre refuse en silence : l'élève voit un refus, le fil ne
-- garde rien. Sans cette fonction, un élève qui essaie dix fois
-- par jour d'insulter un camarade serait parfaitement invisible.
-- Agrégat seulement — le professeur n'a pas besoin de relire les
-- insultes une par une, il a besoin de savoir chez qui regarder.
create function public.classroom_blocked_attempts(p_classroom_id uuid, p_days integer default 7)
returns table (user_id uuid, affiche text, vrai_nom text, tentatives integer, derniere timestamptz)
language sql
security definer
stable
set search_path to ''
as $$
  select
    e.target_user,
    coalesce(nullif(btrim(p.board_alias), ''), nullif(btrim(p.name), ''), 'Élève'),
    nullif(btrim(p.name), ''),
    count(*)::integer,
    max(e.created_at)
  from public.moderation_events e
  join public.profiles p on p.id = e.target_user
  where e.classroom_id = p_classroom_id
    and e.event = 'message_bloque'
    and public.is_classroom_teacher(p_classroom_id)
    and e.created_at > now() - make_interval(days => greatest(coalesce(p_days, 7), 1))
  group by 1, 2, 3
  order by 4 desc;
$$;


-- ═══════════════════════════════════════════════════════════════
--  LA DÉCISION DU PROFESSEUR
--
--  Un seul point d'entrée pour les trois issues possibles. Chacune
--  clôt les signalements ouverts sur la cible : sinon le message
--  resterait dans la pile après avoir été traité, et la pile ne
--  voudrait plus rien dire.
--
--  'laisser' existe autant que 'supprimer'. Un outil de modération
--  qui ne sait que sanctionner pousse à sanctionner.
-- ═══════════════════════════════════════════════════════════════
create function public.moderate_message(p_message_id uuid, p_decision text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  uid    uuid := (select auth.uid());
  m      public.classroom_messages;
begin
  if p_decision not in ('supprimer', 'masquer', 'laisser') then
    return jsonb_build_object('ok', false, 'error', 'decision_inconnue');
  end if;

  select * into m from public.classroom_messages where id = p_message_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'introuvable');
  end if;
  if not public.is_classroom_teacher(m.classroom_id) then
    return jsonb_build_object('ok', false, 'error', 'pas_le_droit');
  end if;

  if p_decision = 'supprimer' then
    update public.classroom_messages
       set deleted_at = coalesce(deleted_at, now()), deleted_by = uid
     where id = p_message_id;
    insert into public.moderation_events
      (classroom_id, event, actor, target_user, target_id, detail)
    values (m.classroom_id, 'message_supprime', uid, m.user_id, p_message_id,
            left(m.text, 120));

  elsif p_decision = 'masquer' then
    update public.classroom_messages set flagged = true where id = p_message_id;
    insert into public.moderation_events
      (classroom_id, event, actor, target_user, target_id)
    values (m.classroom_id, 'message_masque', uid, m.user_id, p_message_id);

  else
    update public.classroom_messages set flagged = false where id = p_message_id;
    insert into public.moderation_events
      (classroom_id, event, actor, target_user, target_id)
    values (m.classroom_id, 'message_demasque', uid, m.user_id, p_message_id);
  end if;

  update public.reports
     set status = case when p_decision = 'laisser' then 'dismissed' else 'handled' end,
         handled_by = uid, handled_at = now()
   where target_type = 'message' and target_id = p_message_id and status = 'open';

  -- Le message est jugé : la file de relecture n'a plus de raison
  -- de le tenir, et surtout plus de raison de le payer.
  delete from public.moderation_queue where message_id = p_message_id;

  return jsonb_build_object('ok', true, 'decision', p_decision);
end;
$$;


-- ── Supprimer : la version journalisée ────────────────────────
--
-- Même fonction qu'à l'étape 7, avec la trace en plus. Un élève
-- qui retire son propre message est journalisé aussi : c'est une
-- ligne, et c'est ce qui permet de reconstituer un fil vidé.
create or replace function public.delete_classroom_message(p_message_id uuid)
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

  insert into public.moderation_events
    (classroom_id, event, actor, target_user, target_id, detail)
  values (m.classroom_id, 'message_supprime', uid, m.user_id, p_message_id,
          case when m.user_id = uid then 'auteur' else 'professeur' end);

  update public.reports
     set status = 'handled', handled_by = uid, handled_at = now()
   where target_type = 'message' and target_id = p_message_id and status = 'open';

  delete from public.moderation_queue where message_id = p_message_id;

  return jsonb_build_object('ok', true);
end;
$$;


-- ── Retirer un membre : la version journalisée ────────────────
--
-- Exclure un élève d'une classe est le geste le plus lourd dont
-- dispose un professeur. C'est précisément celui qu'il faut
-- pouvoir relire.
create or replace function public.remove_member(p_classroom_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not public.is_classroom_teacher(p_classroom_id) then
    raise exception 'reserve au professeur de la classe';
  end if;
  -- On marque « removed » plutôt que de supprimer : la ligne
  -- empêche de revenir par le code, et le journal a besoin de
  -- savoir qu'une exclusion a eu lieu.
  update public.classroom_members set status = 'removed'
   where classroom_id = p_classroom_id and user_id = p_user_id;
  if not found then raise exception 'membre introuvable'; end if;

  insert into public.moderation_events
    (classroom_id, event, actor, target_user)
  values (p_classroom_id, 'membre_retire', (select auth.uid()), p_user_id);

  return jsonb_build_object('user_id', p_user_id, 'status', 'removed');
end;
$$;


-- ── L'audit, réservé au service_role ──────────────────────────
--
-- « Un prof qui abuse de ses droits doit être repérable. » Voici
-- comment le repérer : ses suppressions et ses exclusions, par
-- classe, sur une période. Un professeur qui supprime trois
-- messages par mois modère ; un professeur qui en supprime
-- quarante en deux jours fait autre chose.
--
-- Cette fonction n'est PAS accessible aux professeurs : on ne
-- donne pas à quelqu'un le tableau de bord qui sert à le
-- surveiller.
create function public.moderation_audit(p_days integer default 30)
returns table (
  actor        uuid,
  nom          text,
  role         text,
  classes      integer,
  suppressions integer,
  exclusions   integer,
  masquages    integer,
  derniere     timestamptz
)
language sql
security definer
stable
set search_path to ''
as $$
  select
    e.actor,
    coalesce(nullif(btrim(p.name), ''), '—'),
    coalesce(p.role, '—'),
    count(distinct e.classroom_id)::integer,
    count(*) filter (where e.event = 'message_supprime')::integer,
    count(*) filter (where e.event = 'membre_retire')::integer,
    count(*) filter (where e.event = 'message_masque')::integer,
    max(e.created_at)
  from public.moderation_events e
  left join public.profiles p on p.id = e.actor
  where e.actor is not null
    and e.event in ('message_supprime', 'membre_retire', 'message_masque')
    and e.created_at > now() - make_interval(days => greatest(coalesce(p_days, 30), 1))
  group by 1, 2, 3
  order by 5 desc, 6 desc;
$$;


revoke execute on function public.accept_charter()                          from public, anon;
revoke execute on function public.report_content(text, uuid, text, text)    from public, anon;
revoke execute on function public.classroom_moderation(uuid)               from public, anon;
revoke execute on function public.classroom_blocked_attempts(uuid, integer) from public, anon;
revoke execute on function public.moderate_message(uuid, text)             from public, anon;
revoke execute on function public.moderation_audit(integer)   from public, anon, authenticated;

grant execute on function public.accept_charter()                          to authenticated;
grant execute on function public.report_content(text, uuid, text, text)    to authenticated;
grant execute on function public.classroom_moderation(uuid)               to authenticated;
grant execute on function public.classroom_blocked_attempts(uuid, integer) to authenticated;
grant execute on function public.moderate_message(uuid, text)             to authenticated;
grant execute on function public.moderation_audit(integer)                to service_role;


-- ═══ moderation_ai_queue ═══

-- ── Ce que le serveur vient chercher ──────────────────────────
-- Bornée à UNE classe, parce que c'est le professeur qui déclenche
-- la relecture en ouvrant son écran de modération. Personne ne
-- draine la file en arrière-plan : l'IA est un avis qui arrive
-- quand quelqu'un regarde, pas une facture qui court toute seule.
--
-- `essais` protège du message qui fait échouer le modèle en
-- boucle : trois tentatives, puis on laisse le professeur trancher
-- sans avis. Il n'en a jamais eu besoin pour décider.
create function public.moderation_next_batch(
  p_classroom_id uuid default null,
  p_limit        integer default 10
)
returns table (message_id uuid, texte text, raison text, lang text)
language sql
security definer
volatile
set search_path to ''
as $$
  update public.moderation_queue q
     set essais = q.essais + 1
   where q.message_id in (
     select x.message_id
       from public.moderation_queue x
       join public.classroom_messages m on m.id = x.message_id
      where x.status = 'pending'
        and x.essais < 3
        and m.deleted_at is null
        and (p_classroom_id is null or m.classroom_id = p_classroom_id)
      order by x.created_at
      limit least(greatest(coalesce(p_limit, 10), 1), 20)
   )
  returning
    q.message_id,
    (select left(m.text, 1000) from public.classroom_messages m where m.id = q.message_id),
    q.raison,
    (select coalesce(p.lang, 'fr') from public.classroom_messages m
       join public.profiles p on p.id = m.user_id where m.id = q.message_id);
$$;


-- ── Ce que le serveur rapporte ────────────────────────────────
--
-- Le seuil est à 70. En dessous, l'avis est enregistré et le
-- professeur le voit à côté du message ; au-dessus, le message est
-- masqué en attendant sa décision. Une machine met en attente,
-- elle ne tranche pas.
create function public.moderation_record_verdict(
  p_message_id uuid,
  p_verdict    text,
  p_score      smallint,
  p_model      text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  m public.classroom_messages;
begin
  update public.moderation_queue
     set status = 'done', verdict = p_verdict, score = p_score,
         model = p_model, reviewed_at = now()
   where message_id = p_message_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'introuvable');
  end if;

  if coalesce(p_score, 0) >= 70 and p_verdict is distinct from 'ok' then
    select * into m from public.classroom_messages where id = p_message_id;
    if found and not m.flagged and m.deleted_at is null then
      update public.classroom_messages set flagged = true where id = p_message_id;
      insert into public.moderation_events
        (classroom_id, event, actor, target_user, target_id, detail)
      values (m.classroom_id, 'message_masque', null, m.user_id, p_message_id,
              'ia:' || p_verdict || ' ' || p_score);
    end if;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.moderation_next_batch(uuid, integer)
  from public, anon, authenticated;
revoke execute on function public.moderation_record_verdict(uuid, text, smallint, text)
  from public, anon, authenticated;

grant execute on function public.moderation_next_batch(uuid, integer) to service_role;
grant execute on function public.moderation_record_verdict(uuid, text, smallint, text)
  to service_role;


-- ═══ teacher_can_read_own_classroom_messages ═══
--
-- Le professeur n'est PAS dans `classroom_members` : il EST la
-- classe, il ne la rejoint pas. La policy de l'étape 7 exigeait
-- pourtant `is_classroom_member`, et l'écartait donc de son propre
-- fil.
--
-- Le défaut était masqué par la RPC `classroom_messages()`, qui est
-- DEFINER et teste « prof OU membre » : au chargement de l'écran,
-- tout s'affichait. Mais le TEMPS RÉEL, lui, applique la policy. Le
-- professeur ne recevait donc AUCUNE notification, pas même pour
-- ses propres messages. Il écrivait, et rien n'apparaissait.
--
-- Deux leçons plutôt qu'une :
--   · une RPC DEFINER qui double une policy peut cacher un trou
--     dans cette policy pendant des semaines ;
--   · un test qui interroge la RPC ne teste pas ce que voit le
--     temps réel. Il faut interroger la TABLE. Le test de l'étape 7
--     vérifiait un élève membre, jamais le professeur.
drop policy if exists classroom_messages_select on public.classroom_messages;

create policy classroom_messages_select on public.classroom_messages
  for select to authenticated
  using (
    deleted_at is null
    and (
      public.is_classroom_member(classroom_id)
      or public.is_classroom_teacher(classroom_id)
    )
    and (not flagged or public.is_classroom_teacher(classroom_id))
  );


-- ═══ teacher_appears_in_classroom_roster ═══
--
-- Même cause, autre conséquence : le professeur n'étant dans aucun
-- trombinoscope, la liste des membres ne montrait pas l'adulte de
-- la salle — la première chose qu'un élève veut y voir — et, dans
-- le fil, ses messages arrivés en temps réel s'affichaient « … »,
-- sans nom ni badge. La socket ne transporte que la ligne brute :
-- c'est l'application qui complète depuis le trombinoscope.
create or replace function public.classroom_roster(p_classroom_id uuid)
returns table (
  user_id uuid, affiche text, vrai_nom text,
  status text, is_teacher boolean, joined_at timestamptz)
language sql security definer stable set search_path to ''
as $$
  with moi as (
    select public.is_classroom_teacher(p_classroom_id) as prof,
           public.is_classroom_member(p_classroom_id)  as membre
  )
  select
    c.teacher_id,
    coalesce(nullif(btrim(t.full_name), ''), nullif(btrim(p.board_alias), ''),
             nullif(btrim(p.name), ''), 'Professeur'),
    case when (select prof from moi) then nullif(btrim(p.name), '') else null end,
    'active', true, c.created_at
  from public.classrooms c
  join public.profiles p on p.id = c.teacher_id
  left join public.teacher_requests t on t.user_id = c.teacher_id
  where c.id = p_classroom_id
    and (select prof or membre from moi)

  union all

  select
    m.user_id,
    coalesce(nullif(btrim(p.board_alias), ''), nullif(btrim(p.name), ''), 'Élève'),
    case when (select prof from moi) then nullif(btrim(p.name), '') else null end,
    m.status, false, m.joined_at
  from public.classroom_members m
  join public.profiles p on p.id = m.user_id
  where (select prof or membre from moi)
    and m.classroom_id = p_classroom_id
    and (m.status = 'active' or (select prof from moi))
    and m.status <> 'removed'

  order by 5 desc, 4, 2;
$$;


-- ═══ clear_chat_and_delete_classroom ═══
--
-- Deux gestes de plus pour le professeur, et deux traces de plus au
-- journal : vider un fil et fermer une salle sont exactement le
-- genre d'actes dont on veut pouvoir constater qu'ils ont eu lieu.
alter table public.moderation_events
  drop constraint if exists moderation_events_event_check;

alter table public.moderation_events
  add constraint moderation_events_event_check
  check (event in (
    'message_bloque', 'message_signale', 'message_masque', 'message_demasque',
    'message_supprime', 'membre_retire', 'charte_acceptee',
    'fil_vide', 'salle_supprimee'
  ));

-- ── Vider le fil ──────────────────────────────────────────────
--
-- LE PROFESSEUR SEUL. Si un élève pouvait vider le fil, le premier
-- usage en serait d'effacer ses propres insultes avant que
-- quelqu'un ne les signale : la modération de l'étape 8 aurait un
-- bouton « annuler » posé à côté d'elle.
--
-- On marque `deleted_at`, on n'efface pas — la règle depuis l'étape
-- 7. Le fil quitte tous les écrans, et le journal garde de quoi
-- comprendre. Une seule ligne de journal pour tout le geste, avec
-- le compte : une par message noierait le journal le jour où il
-- sert.
create function public.clear_classroom_chat(p_classroom_id uuid)
returns jsonb
language plpgsql security definer set search_path to ''
as $$
declare
  uid uuid := (select auth.uid());
  v_n integer;
begin
  if not public.is_classroom_teacher(p_classroom_id) then
    return jsonb_build_object('ok', false, 'error', 'pas_le_droit');
  end if;

  update public.classroom_messages
     set deleted_at = now(), deleted_by = uid
   where classroom_id = p_classroom_id and deleted_at is null;
  get diagnostics v_n = row_count;

  insert into public.moderation_events (classroom_id, event, actor, detail)
  values (p_classroom_id, 'fil_vide', uid, v_n || ' message(s)');

  return jsonb_build_object('ok', true, 'supprimes', v_n);
end;
$$;

revoke execute on function public.clear_classroom_chat(uuid) from public, anon;
grant  execute on function public.clear_classroom_chat(uuid) to authenticated;

-- ── Fermer la salle ───────────────────────────────────────────
--
-- On archive plutôt qu'on ne supprime, et la différence n'est pas
-- visible du professeur : la salle disparaît de son écran comme de
-- celui de ses élèves, et personne ne peut plus y entrer ni y
-- écrire. Ce qui reste est en base, hors de portée de l'API.
--
-- Pourquoi le garder : les messages, les remises et les
-- signalements d'une salle où quelque chose s'est mal passé sont
-- précisément ce qu'il faut pouvoir consulter APRÈS. Un `delete` en
-- cascade emporterait toutes les preuves, sur commande du seul
-- adulte de la pièce.
--
-- La fonction REND un résultat au lieu de lever : l'écran doit
-- pouvoir dire « déjà supprimée » sans afficher une phrase SQL.
create or replace function public.archive_classroom(p_classroom_id uuid)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare
  uid uuid := (select auth.uid());
  v_membres integer;
begin
  if not public.is_classroom_teacher(p_classroom_id) then
    return jsonb_build_object('ok', false, 'error', 'pas_le_droit');
  end if;

  select count(*)::integer into v_membres
    from public.classroom_members
   where classroom_id = p_classroom_id and status = 'active';

  update public.classrooms
     set archived_at = now(), is_open = false
   where id = p_classroom_id and archived_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'deja_supprimee');
  end if;

  insert into public.moderation_events (classroom_id, event, actor, detail)
  values (p_classroom_id, 'salle_supprimee', uid, v_membres || ' eleve(s)');

  return jsonb_build_object('ok', true, 'eleves', v_membres);
end;
$$;
