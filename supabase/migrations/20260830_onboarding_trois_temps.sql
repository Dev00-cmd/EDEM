-- ═══════════════════════════════════════════════════════════════
--  ONBOARDING EN TROIS TEMPS — le côté serveur
--
--  Appliqué le 30 août 2026 :
--    · profile_personalisation_fields_and_completion
--
--  ── Le découpage, et pourquoi ─────────────────────────────────
--
--  Moment 1 : inscription. Quatre champs, trente secondes — le
--             prénom, la langue, la classe, et la série pour ceux
--             qui en ont une. L'objectif et les matières ont été
--             RETIRÉS de cet écran : les demander là, c'était
--             trois écrans de formulaire entre un élève curieux et
--             sa première réponse.
--
--  Moment 2 : « Personnalise ton tuteur », après la première vraie
--             utilisation. Sautable, aucun champ obligatoire.
--
--  Moment 3 : topic_mastery, qui se remplit toute seule au fil des
--             quiz. C'est la personnalisation la plus fiable :
--             elle est mesurée, pas déclarée.
--
--  ── La règle appliquée à chaque question du moment 2 ──────────
--
--  Il faut pouvoir écrire en une phrase à quoi sert la réponse, et
--  cette phrase est AFFICHÉE à l'élève sous la question. Un élève
--  qui ne comprend pas pourquoi on demande répond au hasard, et
--  une réponse au hasard vaut moins que pas de réponse.
--
--  Un cas mérite d'être signalé, parce qu'il contredit le plan.
--  L'école et la commune ne passent PAS le test « l'IA s'en sert
--  pour X » : l'étape 9 interdit explicitement de les mettre dans
--  le prompt, et elles se retrouveraient dans les journaux du
--  fournisseur du modèle. Leur justification est autre, et c'est
--  celle qu'on affiche : elles servent à rattacher l'élève à la
--  classe que son professeur ouvrira. L'écran le dit en toutes
--  lettres — « jamais envoyé à M. Thomas ».
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles
  add column weak_subjects text[] not null default '{}',
  add column exam_year     integer,
  add column study_minutes integer;

alter table public.profiles
  add constraint profiles_exam_year_ck
    check (exam_year is null or exam_year between 2026 and 2040),
  add constraint profiles_study_minutes_ck
    check (study_minutes is null or study_minutes in (15, 30, 60, 120)),
  -- 'catchup' (rattraper le retard) est nouveau. Les autres valeurs
  -- sont celles déjà en base : aucun profil existant ne casse.
  add constraint profiles_goal_ck
    check (goal in ('', 'exams', 'grades', 'learn', 'english', 'catchup')),
  -- Cinq matières faibles au maximum. Au-delà, ce n'est plus une
  -- information : un élève faible partout est un élève sans
  -- priorité, et le tuteur ne saurait pas par où commencer.
  add constraint profiles_weak_subjects_ck
    check (cardinality(weak_subjects) <= 5);

-- Même régime que les autres colonnes : droits accordés colonne
-- par colonne, jamais sur la table.
grant insert (weak_subjects, exam_year, study_minutes) on public.profiles to authenticated;
grant update (weak_subjects, exam_year, study_minutes) on public.profiles to authenticated;


-- ── Le pourcentage de complétion, et le bonus ─────────────────
--
-- Calculé côté serveur, et pas dans l'application, pour une raison
-- simple : il accorde des XP. Depuis le verrouillage des écritures
-- (voir 20260830_verrouillage_ecritures_xp.sql), toute XP passe
-- par une fonction SECURITY DEFINER. Un pourcentage calculé sur le
-- téléphone serait un pourcentage négociable.
--
-- La fonction est idempotente : le bonus n'est versé qu'une fois,
-- `profile_completed_at` faisant office de reçu.
create function public.profile_completion()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  uid        uuid := (select auth.uid());
  c_bonus    constant integer := 50;  -- une lecture de notion vaut 8
  v_p        public.profiles;
  v_besoin   boolean;      -- ce niveau demande-t-il une série ?
  v_champs   jsonb := '[]'::jsonb;
  v_manque   jsonb := '[]'::jsonb;
  v_total    integer := 0;
  v_faits    integer := 0;
  v_pct      integer;
  v_bonus    integer := 0;

  procedure_champ record;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_p from public.profiles where id = uid;
  if not found then
    raise exception 'profil introuvable';
  end if;

  select coalesce(l.needs_section, false) into v_besoin
    from public.school_levels l where l.id = v_p.level;
  v_besoin := coalesce(v_besoin, false);

  -- Chaque ligne : (clé, applicable, rempli). Un champ qui ne
  -- s'applique pas ne compte ni au numérateur ni au dénominateur —
  -- sinon un élève de 5e AF plafonnerait à 80 % pour n'avoir pas
  -- choisi une série qui n'existe pas à son niveau.
  for procedure_champ in
    select * from (values
      ('name',          true,                       btrim(coalesce(v_p.name, '')) <> ''),
      ('level',         true,                       btrim(coalesce(v_p.level, '')) <> ''),
      ('section',       v_besoin,                   v_p.section is not null),
      ('favorites',     true,                       cardinality(v_p.favorites) > 0),
      ('weak_subjects', true,                       cardinality(v_p.weak_subjects) > 0),
      ('goal',          true,                       btrim(coalesce(v_p.goal, '')) <> ''),
      ('exam_year',     v_p.goal = 'exams',         v_p.exam_year is not null),
      ('study_minutes', true,                       v_p.study_minutes is not null),
      ('school_id',     true,                       v_p.school_id is not null),
      ('commune_id',    true,                       v_p.commune_id is not null)
    ) as f(cle, applicable, rempli)
  loop
    if procedure_champ.applicable then
      v_total := v_total + 1;
      if procedure_champ.rempli then
        v_faits  := v_faits + 1;
        v_champs := v_champs || to_jsonb(procedure_champ.cle);
      else
        v_manque := v_manque || to_jsonb(procedure_champ.cle);
      end if;
    end if;
  end loop;

  v_pct := case when v_total = 0 then 0
                else round((v_faits::numeric / v_total) * 100) end;

  -- Le bonus, une seule fois dans la vie du compte.
  if v_pct = 100 and v_p.profile_completed_at is null then
    update public.profiles set profile_completed_at = now() where id = uid;

    update public.progress
       set xp = xp + c_bonus, updated_at = now()
     where user_id = uid;

    insert into public.daily_activity (user_id, day, xp_gained)
    values (uid, current_date, c_bonus)
    on conflict (user_id, day) do update
      set xp_gained = public.daily_activity.xp_gained + c_bonus;

    v_bonus := c_bonus;
  end if;

  return jsonb_build_object(
    'pct',       v_pct,
    'done',      v_faits,
    'total',     v_total,
    'filled',    v_champs,
    'missing',   v_manque,
    'bonus',     v_bonus,
    'completed', v_p.profile_completed_at is not null or v_pct = 100
  );
end;
$$;

revoke execute on function public.profile_completion() from public, anon;
grant  execute on function public.profile_completion() to authenticated;
