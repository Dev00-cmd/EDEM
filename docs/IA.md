# 🤖 Brancher l'IA (Claude) — Guide complet

Ti Pwof est une app **100 % IA** : le tuteur et les quiz fonctionnent via **Claude** (Anthropic), appelé depuis une **Edge Function Supabase**. Ce guide explique le fonctionnement et la mise en route.

---

## 1. Architecture

```
📱 App Ti Pwof
      │
      │  1. l'élève se connecte (Supabase Auth)
      │  2. l'app appelle la fonction avec SON jeton
      ▼
🔒 Edge Function « tutor »  ──API──▶  🧠 Claude
   (clé API SECRÈTE ici)
```

**Trois garanties par construction :**

| Garantie | Comment |
|---|---|
| La clé API ne peut pas être volée | Elle est un *secret Supabase*, jamais livrée dans l'APK |
| Seuls les élèves inscrits utilisent l'IA | La fonction est en `verify_jwt: true` : sans compte, 401 |
| La réponse a toujours la bonne forme | *Structured outputs* : Claude répond selon un schéma JSON imposé, pas du texte à deviner |

**Ce que l'app envoie** : la conversation + le profil de l'élève (prénom, classe, objectif, notions faibles/fortes, matière). Le prompt système est construit dans `src/ai/prompts.ts`.

**Ce que la fonction renvoie** :
- `action: "chat"` → `{ reply, topic }` — `topic` est la notion détectée, qui fait progresser la maîtrise automatiquement.
- `action: "quiz"` → `{ questions: [{ question, choices[4], answer, explanation, topic }] }`

---

## 2. Mise en route (5 minutes)

### Étape unique : donner sa clé API à la fonction

1. Crée une clé sur **https://console.anthropic.com** (`sk-ant-...`)
2. Va sur **https://supabase.com/dashboard/project/qoyebljuvrxhcroxapys/settings/functions**
3. Section **Secrets** → **Add new secret** :

   | Name | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | `sk-ant-...` (ta clé) |

4. C'est tout. La fonction est déjà déployée.

### Vérifier que ça marche

```bash
curl -X POST "https://qoyebljuvrxhcroxapys.supabase.co/functions/v1/tutor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <clé publishable>" \
  -d '{"action":"chat","messages":[{"role":"user","content":"Explique les fractions"}]}'
```

- `{"error":"ANTHROPIC_API_KEY manquante…"}` → le secret n'est pas encore posé
- `{"reply":"...","topic":"les-fractions"}` → ✅ tout fonctionne

---

## 3. Choisir le modèle (et maîtriser le coût)

Par défaut la fonction utilise **`claude-opus-5`**, le modèle le plus capable. Pour une app scolaire à grand volume, un modèle moins cher suffit largement et divise la facture.

Ajoute un second secret `ANTHROPIC_MODEL` :

| Modèle | Prix (entrée / sortie par million de jetons) | Pour qui |
|---|---|---|
| `claude-opus-5` *(défaut)* | 5 $ / 25 $ | Qualité maximale des explications |
| `claude-sonnet-5` | 2 $ / 10 $ | **Recommandé en production** — 2,5× moins cher |
| `claude-haiku-4-5` | 1 $ / 5 $ | Le moins cher, explications plus courtes |

> 💡 Ordre de grandeur : une question de tuteur coûte quelques centimes au plus. Avec Sonnet 5, quelques centaines d'élèves actifs tiennent dans un budget modeste — mais surveille la console Anthropic le premier mois.

---

## 4. Modifier le comportement du tuteur

| Ce que tu veux changer | Où |
|---|---|
| Le ton, les règles, le périmètre scolaire | `src/ai/prompts.ts` → `buildSystemPrompt` |
| Le style des quiz générés | `src/ai/prompts.ts` → `buildQuizPrompt` |
| Le format de réponse imposé au modèle | `supabase/functions/tutor/index.ts` → `CHAT_SCHEMA` / `QUIZ_SCHEMA` |
| Le rattachement notion ↔ programme | `src/ai/plan.ts` → `matchTopicId` |

### Redéployer la fonction après modification

```bash
npx supabase functions deploy tutor --project-ref qoyebljuvrxhcroxapys
```

---

## 5. Voir les erreurs

**Dashboard → Edge Functions → tutor → Logs**

| Message | Cause | Solution |
|---|---|---|
| `ANTHROPIC_API_KEY manquante` | Secret absent | Étape 2 ci-dessus |
| `401` côté app | Élève non connecté | La session a expiré : se reconnecter |
| `authentication_error` | Clé invalide ou révoquée | Régénérer la clé sur console.anthropic.com |
| `rate_limit_error` | Trop d'appels d'un coup | Normal en pic ; le message d'erreur de l'app invite à réessayer |
| `credit balance is too low` | Compte Anthropic sans crédit | Recharger sur console.anthropic.com |
