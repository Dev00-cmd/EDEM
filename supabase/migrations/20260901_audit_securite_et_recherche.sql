-- ═══════════════════════════════════════════════════════════════
--  AUDIT — DROITS FERMÉS, INDEX POSÉS, RECHERCHE RÉPARÉE
--
--  Appliqué le 1er septembre 2026, en trois migrations :
--    · audit_close_anon_grants_and_index_fkeys
--    · search_schools_uses_its_indexes
--    · search_schools_push_filters_into_branches
--
--  ── 1. `anon` n'écrit plus rien ───────────────────────────────
--
--  Signalé à l'étape 8, resté ouvert. Le rôle `anon` — un visiteur
--  NON CONNECTÉ — détenait des droits colonne INSERT/UPDATE sur
--  `profiles`, `role` compris.
--
--  Ce n'était pas exploitable : les quatre policies de `profiles`
--  visent `{authenticated}`, aucune ne vise `anon`, donc la RLS
--  l'écartait de toute façon. Mais une permission qui ne sert à rien
--  et qui, seule, suffirait à se faire professeur n'a pas à rester —
--  le jour où quelqu'un ajoute une policy un peu large, elle devient
--  la faille.
--
--  Vérifié APRÈS coup, parce que c'est ce type de resserrage qui a
--  dû être annulé en août : une inscription complète passe toujours,
--  le trigger crée le profil, l'élève modifie le sien, et `anon`
--  reçoit 401.
--
--  ── 2. Les clés étrangères sans index ─────────────────────────
--
--  Onze remontées par l'advisor, quatre indexées. Le critère : la
--  colonne sert-elle à FILTRER ? Les `*_by` (reviewed_by, graded_by,
--  deleted_by…) ne servent qu'à afficher un nom — les indexer
--  ralentirait chaque écriture pour rien, et cette base tourne sur
--  un tier gratuit.
--
--  ── 3. La recherche d'école n'utilisait plus ses index ────────
--
--  554 ms pour « petion » sur 25 347 écoles. La même condition
--  isolée, avec l'index trigramme : 18 ms.
--
--  Toutes les manières de trouver une école étaient réunies dans un
--  seul `OR`, dont une branche portant un `CASE`. Le planificateur
--  ne sait pas décomposer ça : il renonçait aux index et balayait la
--  table. L'advisor signalait d'ailleurs les deux index de `schools`
--  comme « jamais utilisés » — ils ne l'étaient pas parce qu'on les
--  rendait inutilisables, pas parce qu'ils étaient inutiles.
--
--  Une branche par manière de trouver, réunies par UNION, chacune
--  une condition simple que le planificateur rattache à un index.
--  Puis les filtres — commune et statut — DESCENDUS dans chaque
--  branche : au-dessus d'un UNION ils ne servent aucun index, et la
--  branche « pas de texte » ramenait les 25 347 écoles avant d'en
--  garder quarante.
--
--    « petion »            554 ms → 10,5 ms
--    « ica »                       →  9,0 ms
--    liste d'une commune    78 ms → 17,3 ms
--
--  Le comportement ne change pas : huit requêtes de référence
--  comparées avant/après, mêmes résultats et même ordre. Figé dans
--  scripts/test_recherche_ecoles.mjs, qui vérifie les DEUX — ce qui
--  est rendu, et en combien de temps. Une recherche rapide qui rend
--  n'importe quoi ne serait pas une amélioration.
-- ═══════════════════════════════════════════════════════════════

-- ═══ audit_close_anon_grants_and_index_fkeys ═══

revoke insert, update, delete on public.profiles       from anon;
revoke insert, update, delete on public.progress       from anon;
revoke insert, update, delete on public.topic_mastery  from anon;
revoke insert, update, delete on public.quiz_results   from anon;
revoke insert, update, delete on public.daily_activity from anon;
revoke insert, update, delete on public.chat_messages  from anon;
revoke insert, update, delete on public.conversations  from anon;
revoke insert, update, delete on public.quiz_sessions  from anon;
revoke insert, update, delete on public.quiz_seen_questions from anon;

create index if not exists classroom_messages_user_idx
  on public.classroom_messages (user_id);
create index if not exists submissions_quiz_session_idx
  on public.submissions (quiz_session_id) where quiz_session_id is not null;
create index if not exists profiles_commune_idx
  on public.profiles (commune_id) where commune_id is not null;
create index if not exists reports_reporter_idx
  on public.reports (reporter_id);

-- ═══ search_schools_push_filters_into_branches ═══
--
-- (Version finale, celle qui vit en base. Le corps complet est
--  celui appliqué par la migration du même nom.)
