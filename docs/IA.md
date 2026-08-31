# 🤖 L'IA d'EDEM — Gemini, et comment la régler

EDEM est une app **100 % IA** : le tuteur **M. Thomas** et les quiz passent par **Gemini** (Google), appelé depuis une **Edge Function Supabase**. Ce guide explique le fonctionnement, le déploiement et le réglage.

> **Historique.** Le projet a d'abord tourné sur Claude (Anthropic). Le coût était trop élevé pour un usage scolaire quotidien : la migration vers Gemini a eu lieu en août 2026. L'offre gratuite de Gemini couvre déjà un usage de classe.

---

## 1. Architecture

```
📱 App EDEM
      │
      │  1. l'élève se connecte (Supabase Auth)
      │  2. l'app appelle la fonction avec SON jeton
      ▼
🔒 Edge Function « tutor »  ──API──▶  ✨ GEMINI
   (clé API SECRÈTE ici)              (modèle choisi
                                       par question)
```

**Trois garanties par construction :**

| Garantie | Comment |
|---|---|
| La clé API ne peut pas être volée | Elle est un *secret Supabase*, jamais livrée dans l'APK |
| Seuls les élèves inscrits utilisent l'IA | La fonction est en `verify_jwt: true` : sans compte, 401 |
| Un élève ne lit pas le fichier d'un autre | Le chemin de la pièce jointe doit commencer par son propre identifiant — vérifié côté serveur |

**Ce que l'app envoie** : la conversation, le profil de l'élève (prénom, classe, objectif, notions faibles/fortes) et la matière. Le prompt système est construit dans `src/ai/prompts.ts`.

**Ce que la fonction renvoie** :

- `action: "chat"` → `{ reply, topic }` — `topic` est la notion détectée, qui fait progresser la maîtrise automatiquement
- `action: "quiz"` → `{ questions: [{ question, choices[4], answer, explanation, topic }] }`
- `action: "moderate"` → `{ reviewed }` — relecture des messages signalés, réservée au professeur de la classe

### Le troisième appel : la modération

C'est le **deuxième temps** du filtre. Le modèle ne voit **que** les messages que la liste de termes SQL a marqués, ou qu'un élève a signalés — jamais le fil de discussion.

| | |
|---|---|
| Qui déclenche | Le **professeur**, en ouvrant son écran de modération |
| Ce qui part au modèle | Un message à la fois, 1000 caractères maximum |
| Ce qui revient | `{"verdict": "...", "score": 0-100}`, 120 jetons de sortie |
| Ce que ça déclenche | Au-delà de 70 : le message est **masqué** en attendant la décision du professeur |
| Quota | `QUOTA_MODERATION`, 20 relectures par jour et par professeur |

**Rien ne tourne en arrière-plan.** Pas de tâche planifiée à surveiller, et aucune dépense tant que personne ne regarde. Sur un fil de classe ordinaire, la file reste vide.

> 🔒 **Une machine met en attente, elle ne tranche pas.** Le verdict ne supprime jamais rien : il masque, et c'est le professeur qui décide. Sur le message d'un enfant, c'est la seule limite tenable.

Le prompt (`MODERATION_PROMPT`) porte trois précautions apprises en l'écrivant :

1. **Le créole.** Un modèle entraîné surtout sur du français lit « bouzen » comme du charabia s'il ne sait pas de quelle langue il s'agit. On le lui dit.
2. **Le programme scolaire.** Un cours de SVT parle de reproduction, un cours d'histoire d'Haïti parle de massacres et d'esclavage. Un modérateur qui l'ignore signale la moitié du programme.
3. **La taquinerie.** Des adolescents qui se chambrent ne se harcèlent pas. Confondre les deux apprend au professeur à ignorer les alertes — et le jour où il y a un vrai problème, il l'ignore aussi.

---

## 2. Le modèle est choisi par question

C'est le point le plus important du fichier.

Toutes les questions ne se valent pas. *« Qui a proclamé l'indépendance ? »* se répond de mémoire ; *« résous 2x + 3 = 9 et vérifie »* demande un raisonnement suivi. Envoyer les deux au même modèle avec le même effort, c'est choisir entre payer trop cher la première ou bâcler la seconde.

`routeChat()` regarde donc **avant** d'appeler :

| Ce que demande l'élève | Réflexion | Déclencheur |
|---|---|---|
| Date, définition, vocabulaire, conjugaison | *minimal* | par défaut |
| Calcul, maths, physique, chimie | *low* | matière de calcul, ou chiffres/opérateurs/mots-clés dans la question |
| Photo de devoir ou PDF | *low* | pièce jointe présente |
| Génération d'un quiz | *medium* | toujours |

La détection de calcul reconnaît le français **et** le créole, avec ou sans accents (`equation` comme `équation`, `kalkil`, `rezoud`) : un élève tape vite.

**Le levier de vitesse, c'est la réflexion**, pas le modèle. Les jetons de raisonnement sont invisibles à l'écran mais bien présents dans l'attente. Une question simple part donc avec la réflexion au minimum.

### Mesures réelles (août 2026)

| Tâche | Temps |
|---|---|
| Question d'histoire | **2,8 s** |
| Calcul de fractions | **2,7 s** |
| Quiz de 10 questions | 15 s |
| Relecture de modération | ~1 s par message, et seulement sur les messages marqués |

---

## 3. Les secrets

**Dashboard → Edge Functions → Secrets**

| Nom | Obligatoire | Défaut | Rôle |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ **oui** | — | La clé, créée sur [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL_FAST` | non | `gemini-3.5-flash-lite` | Questions simples |
| `GEMINI_MODEL_REASON` | non | `gemini-3.5-flash-lite` | Calculs, sciences, photos |
| `GEMINI_MODEL_QUIZ` | non | `gemini-3.5-flash-lite` | Quiz |

Les trois derniers existent pour **changer de modèle sans toucher au code** — Google fait évoluer sa gamme vite, et un retrait de modèle ne doit pas demander un redéploiement.

### Tarifs (par million de jetons)

| Modèle | Entrée | Sortie | Remarque |
|---|---|---|---|
| `gemini-3.5-flash-lite` | 0,30 $ | 2,50 $ | **Défaut** — bon rapport qualité/prix |
| `gemini-3.7-flash` | 0,75 $ | 3,75 $ | Meilleur en maths. À poser sur `GEMINI_MODEL_REASON` si les explications de maths te déçoivent |

> ⚠️ `gemini-2.5-flash-lite` (0,10 $ / 0,40 $) était le premier choix. **Google l'a retiré aux nouveaux comptes** en août 2026. Ne pas le remettre.

---

## 4. Déployer la fonction

> ⚠️ **Tout tient dans un seul fichier** : `supabase/functions/tutor/index.ts`. C'est délibéré — le déploiement s'est longtemps fait par copier-coller dans le dashboard, et chaque fichier supplémentaire était une occasion d'en oublier un et de casser la fonction. C'est déjà arrivé.

### En une commande

```bash
node scripts/deploy_function.mjs
```

Le jeton d'accès est lu dans `.env.secrets` (jamais versionné, jamais passé en argument de ligne de commande — un argument est visible par les autres processus de la machine).

Si `.env.secrets` n'existe pas : créer un jeton sur
[supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
et l'y déposer sous la forme `SUPABASE_ACCESS_TOKEN=sbp_…`.

### Par le dashboard, en secours

1. **Dashboard → Edge Functions → `tutor` → onglet Code → `index.ts`**
2. Copier le fichier depuis GitHub, bouton **« Copy raw file »** :
   `https://github.com/Dev00-cmd/EDEM/blob/main/supabase/functions/tutor/index.ts`
3. Dans l'éditeur : **Ctrl+A**, coller, **Deploy updates**

Ne pas créer d'autres fichiers. Laisser `deno.json` tel quel.

> La CLI `supabase` n'est pas utilisable ici : le paquet npm n'a pas de binaire Windows fonctionnel, et `supabase login` exige un terminal interactif. Tout passe donc par l'API de gestion, ce que font les scripts.

---

## 5. Vérifier que ça marche

Le test le plus fiable est d'appeler la fonction directement — plus sûr qu'un diff de code.

```bash
curl -X POST "https://qoyebljuvrxhcroxapys.supabase.co/functions/v1/tutor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sb_publishable_n6OP5Pk7jd-537IPq0UoKg_DJuB-6rv" \
  -H "apikey: sb_publishable_n6OP5Pk7jd-537IPq0UoKg_DJuB-6rv" \
  -d '{"action":"chat","subjectId":"math","messages":[{"role":"user","content":"Calcule 3/4 + 4/6"}]}'
```

| Réponse | Signification |
|---|---|
| `{"reply":"...","topic":"les-fractions"}` | ✅ tout fonctionne |
| `{"error":"GEMINI_API_KEY manquante…"}` | Le secret n'est pas posé — §3 |
| `{"error":"...no longer available..."}` | Modèle retiré par Google — poser `GEMINI_MODEL_*` sur un modèle actuel |

Une réponse de maths doit contenir des fractions en LaTeX : `$\frac{17}{12}$`. Si tu vois `17/12` en ligne, la méthode d'enseignement n'est pas appliquée.

---

## 6. Modifier le comportement du tuteur

| Ce que tu veux changer | Où |
|---|---|
| Le ton, les règles, le périmètre scolaire | `src/ai/prompts.ts` → `buildSystemPrompt` *(app → OTA)* |
| Le style des quiz demandés | `src/ai/prompts.ts` → `buildQuizPrompt` *(app → OTA)* |
| **La méthode d'enseignement, la notation mathématique** | `index.ts` → `TEACHING_METHOD` *(serveur seul)* |
| **La difficulté adaptative des quiz** | `index.ts` → `quizGuidance`, `difficultyTier` *(serveur seul)* |
| Le choix du modèle par question | `index.ts` → `routeChat`, `REASONING_HINTS` *(serveur seul)* |
| Le rattachement notion ↔ programme | `src/ai/plan.ts` → `matchTopicId` *(app → OTA)* |

> 💡 Tout ce qui est marqué *(serveur seul)* se change **sans que les élèves aient à mettre à jour l'app**. C'est la raison pour laquelle la pédagogie vit côté serveur.

---

## 7. Deux détails qui ont coûté cher

### Le schéma JSON de Gemini n'est pas celui d'Anthropic

Gemini **refuse** `additionalProperties` et les types en tableau (`type: ["string","null"]`). Une version recopiée telle quelle d'Anthropic renvoyait :

```
Unknown name "additionalProperties": Cannot find field
Proto field is not repeating, cannot start list
```

C'est pourquoi le **chat n'utilise plus de schéma du tout** : il renvoie du texte brut, et la notion arrive sur une première ligne `#NOTION:` retirée avant affichage. En JSON, chaque `\frac{}{}` devait être ré-échappé en `\\frac` — plus de jetons, plus lent, et une occasion de plus de casser l'affichage des fractions. Seul le quiz garde un schéma.

### Les filtres de sécurité bloquaient l'histoire d'Haïti

Le programme haïtien passe par l'esclavage, la révolution de 1804 et les massacres coloniaux. En réglage standard, Gemini refuse une partie de ces questions pourtant parfaitement scolaires.

Les `safetySettings` sont donc sur **`BLOCK_ONLY_HIGH`**. Le cadre scolaire reste posé par le prompt système, qui refuse tout ce qui sort de l'école.

---

## 8. Voir les erreurs

**Dashboard → Edge Functions → tutor → Logs**

Les journaux indiquent le modèle choisi et pourquoi : `chat → gemini-3.5-flash-lite (question-calcul)`.

| Message | Cause | Solution |
|---|---|---|
| `GEMINI_API_KEY manquante` | Secret absent | §3 |
| `no longer available` | Modèle retiré par Google | Un repli automatique évite la panne ; poser `GEMINI_MODEL_*` pour choisir |
| `401` côté app | Session expirée | Se reconnecter |
| `Question refusée par le filtre` | Contenu bloqué en amont | Rare depuis `BLOCK_ONLY_HIGH` |
| `Réponse trop longue, coupée` | `maxOutputTokens` atteint | Question plus courte, ou monter la limite |
| `RESOURCE_EXHAUSTED` | Quota gratuit épuisé | Attendre, ou activer la facturation Google |
