# 📦 Déploiement — Livrer EDEM

Comment publier une modification, selon ce qu'elle touche. **La plupart des changements ne demandent aucun nouvel APK.**

---

## 0. La question à se poser d'abord

Avant toute chose : **qu'est-ce qui a changé ?** La réponse détermine tout le reste.

| Ce qui change | Comment livrer | Délai | L'élève doit… |
|---|---|---|---|
| **Prompts, pédagogie, choix du modèle** | Redéployer l'Edge Function | ~1 min | **rien du tout** |
| **Base de données, XP, classement** | Migration SQL | ~1 min | **rien du tout** |
| **Écrans, textes, couleurs, logique de l'app** | `eas update` (OTA) | ~5 min | Profil → Mises à jour |
| **Nom, permissions, dépendance native, `app.json`** | Nouveau build EAS | 15-20 min | Réinstaller l'APK |

> 💡 Les deux premières lignes sont la raison pour laquelle la méthode d'enseignement vit côté serveur : on peut améliorer le tuteur sans que personne n'ait à mettre à jour quoi que ce soit.

---

## 1. Changement côté serveur (le plus fréquent)

### L'IA — prompts, méthode, difficulté, modèles

Tout est dans `supabase/functions/tutor/index.ts`, en un seul fichier.
Procédure complète : **[`docs/IA.md`](IA.md) §4**.

En résumé : pousser sur GitHub, puis Dashboard → Edge Functions → `tutor` → `index.ts` → Ctrl+A → coller → **Deploy updates**.

### La base de données

**Dashboard → SQL Editor**, ou :

```bash
npx supabase db push --project-ref qoyebljuvrxhcroxapys
```

**Aucune mise à jour de l'app n'est nécessaire** dans les deux cas.

---

## 2. Mise à jour OTA (code de l'app, sans recompiler)

```bash
npx eas-cli update --branch preview --environment preview \
  --message "Ce que tu as changé"
```

⏱️ 3 à 5 minutes. Aucun store, aucune réinstallation.

### ⚠️ Le piège vérifié — l'OTA ne s'applique pas tout seul

Sur l'appareil de l'auteur, **l'application automatique des mises à jour ne se fait pas**, alors que toute la chaîne est correcte : URL, canal `preview`, `runtimeVersion`, et l'asset bien présent dans le manifeste servi (vérifié jusqu'à la décompilation de l'APK). La cause n'a jamais été identifiée.

**Donc :** ne jamais dire à un élève de « fermer et rouvrir l'app ». Le dire ainsi :

> **Profil → Mises à jour → « Rechercher une mise à jour »**

Ce bouton télécharge et redémarre l'app immédiatement. Il existe précisément pour ça.

---

## 3. Nouvel APK (seulement si nécessaire)

```bash
npx eas-cli build --platform android --profile preview          # APK de test
npx eas-cli build --platform android --profile production       # .aab Play Store
npx eas-cli build --platform android --profile production-apk   # APK hors store
```

⏱️ 15 à 20 minutes dans le cloud. `eas.json` est déjà configuré.

> Le lien de téléchargement de l'APK **expire au bout de 14 jours**. Télécharge le fichier et garde-le si tu comptes le distribuer.

### ⚠️ `runtimeVersion` : à monter avec `version`

`app.json` fixe `"runtimeVersion": "1.1.0"` en clair, plutôt que la politique automatique `appVersion`. Raison : sur Windows, le CLI d'`expo-updates` que cette politique déclenche à chaque requête du serveur de développement plante par intermittence (`0xC0000142`), et le manifeste ne se sert plus du tout.

**Conséquence :** quand tu changes la version native, incrémente **les deux** :

```json
"version": "1.1.1",
"runtimeVersion": "1.1.1"
```

Le `runtimeVersion` garantit qu'une mise à jour OTA n'atterrit que sur des builds capables de l'exécuter. Le laisser en arrière enverrait du code neuf à une app native trop ancienne — et l'app planterait au démarrage.

---

## 4. Tester avant de livrer

### Sur téléphone, via Expo Go

```bash
npm run go
```

Puis scanner le QR code, ou saisir `exp://<ip-du-pc>:8081` dans Expo Go. **Même Wi-Fi** que l'ordinateur.

> **Pourquoi `npm run go` et pas `npx expo start` ?**
> Expo Go n'embarque pas `expo-updates` et n'accepte que les runtimes `exposdk:<version>`. Or `app.json` déclare `runtimeVersion: "1.1.0"` — Expo Go refuse alors d'ouvrir le projet.
> `app.config.js` retire `runtimeVersion` et `updates` **uniquement** quand `EXPO_GO=1`, ce que fait le script `go`. Les builds EAS et les mises à jour OTA reçoivent la configuration d'`app.json` intacte.
>
> Dans Expo Go, le bouton *Profil → Mises à jour* affiche « indisponible » : c'est normal et voulu.

### Vérifications automatiques

```bash
npm run check                      # types + i18n FR/HT + routage de l'IA
npx expo-doctor                    # configuration

node scripts/smoke_test.mjs        # quiz, XP, quotas, anti-rejeu
node scripts/test_moderation.mjs   # modération : 6 comptes, 47 vérifications REST
```

> 💡 **`npm run check` avant chaque livraison.** Une clé de traduction absente ne plante pas : elle s'affiche telle quelle à l'écran (« moderation.entrySub »), ce qui passe inaperçu en développement et saute aux yeux de l'élève.
>
> Les deux scripts de test créent de vrais comptes, font de vraies requêtes REST, et suppriment tout à la fin. Ils tournent contre la base **de production** : c'est volontaire, c'est la seule façon de vérifier les règles d'accès telles qu'elles sont réellement appliquées.

---

## 5. La clé de signature Android — à protéger absolument

Le keystore prouve à Google que les mises à jour viennent bien de toi. **Sans lui, tu ne pourras plus jamais mettre à jour l'app sur le Play Store** : il faudrait republier sous un autre nom et repartir de zéro. Il n'existe aucun recours.

Il est sauvegardé dans `Documents\TiPwof-Keystore\` :

- `tipwof-upload-key.jks` — la clé
- `LISEZ-MOI-IMPORTANT.txt` — mots de passe, alias, empreintes, hash d'intégrité

**Vérifier qu'il est intact :**

```bash
cd ~/Documents/TiPwof-Keystore
sha256sum tipwof-upload-key.jks     # doit correspondre au hash du LISEZ-MOI
```

**Le mettre à l'abri — au moins deux endroits, jamais un seul disque :**

- un gestionnaire de mots de passe (Bitwarden, 1Password…)
- une clé USB rangée ailleurs que près du PC
- un cloud privé chiffré

Ne jamais l'envoyer par e-mail ou messagerie, ne jamais le versionner. `.gitignore` bloque déjà `*.jks`, `*.key`, `*.p12`, `*.p8`.

> EAS en garde une copie côté serveur (`npx eas-cli credentials`), mais **ne compte pas dessus** : ton compte peut être perdu ou fermé.

---

## 6. Publier sur Google Play

| Compte | Prix | Pour |
|---|---|---|
| **Expo** | Gratuit | Builds et OTA |
| **Google Play Console** | **25 $** une fois à vie | Play Store |
| **Apple Developer** | **99 $/an** | App Store |

> 💡 Commence par Android : moins cher, validation plus rapide, et la quasi-totalité des élèves haïtiens sont sur Android.

1. **play.google.com/console** → Créer une application
2. Nom : **EDEM** · Catégorie : **Éducation**
3. Visuels : icône 512×512 (`python scripts/make_icons.py`), bannière 1024×500, captures d'écran
4. **Production → Nouvelle version → téléverser le `.aab`**
5. Questionnaire contenu : pas de pubs ; déclarer honnêtement le public visé (13+ conseillé)
6. Envoyer en validation → ⏱️ quelques jours

```bash
npx eas-cli submit --platform android     # soumission automatique
```

---

## 7. Checklist avant une ouverture publique ✅

- [ ] `GEMINI_API_KEY` posée dans les secrets Supabase
- [ ] Le tuteur répond, et un quiz de 10 questions se génère
- [ ] Les fractions s'affichent dessinées, pas en `17/12`
- [ ] Un quiz d'histoire ne contient que de l'histoire (pas de fuite entre matières)
- [ ] Envoi d'une photo de devoir testé (caméra **et** galerie)
- [ ] Inscription + connexion testées sur un vrai téléphone
- [ ] Les deux langues fonctionnent partout (FR / HT)
- [ ] Testé avec la taille de police système à 130 %
- [ ] Testé sur un Android d'entrée de gamme
- [ ] Mode avion : l'app s'ouvre et affiche les données en cache
- [ ] Page **Politique de confidentialité** en ligne (obligatoire — e-mail et progression collectés)
- [x] **Quota par élève en place** — `usage_counters`, quotidien pour l'IA, horaire pour les messages et les codes
- [ ] Budget Google surveillé le premier mois

**Avant qu'une classe de vrais élèves entre** — le public est mineur, ces lignes ne se reportent pas :

- [ ] `node scripts/test_moderation.mjs` passe intégralement
- [ ] La charte s'affiche à la première entrée dans une classe, en français **et** en créole
- [ ] Un message insultant est refusé ; « ils se sont disputés » passe
- [ ] Trois signalements de trois élèves différents masquent bien un message
- [ ] Le professeur voit sa pile de modération, et « laisser » remet le message en ligne
- [ ] `node scripts/test_prof_autonome.mjs` passe intégralement
- [ ] `node scripts/test_pieces_jointes.mjs` passe intégralement
- [ ] `node scripts/test_completion.mjs` passe intégralement
- [ ] Un compte **professeur** ouvre bien sur ses salles, un compte **élève** sur son accueil
- [ ] La bascule « voir comme élève » va et revient sans redémarrer l'app
- [ ] Protection contre les mots de passe compromis activée dans Auth
- [ ] Décision prise sur `auto_confirm_email` : un compte non vérifié peut demander à rejoindre une classe d'enfants
- [ ] Keystore sauvegardé à **deux** endroits (§5)
- [ ] `version` et `runtimeVersion` incrémentées ensemble (§3)

---

## 🆘 Problèmes fréquents

| Symptôme | Cause | Solution |
|---|---|---|
| Le tuteur ne répond pas | `GEMINI_API_KEY` absente | [`docs/IA.md`](IA.md) §3 |
| `no longer available` | Modèle retiré par Google | Repli automatique en place ; poser `GEMINI_MODEL_*` |
| L'élève ne voit pas la mise à jour | L'OTA ne s'applique pas seul | Profil → Mises à jour (§2) |
| Expo Go refuse d'ouvrir le projet | `runtimeVersion` incompatible | `npm run go` (§4) |
| « Pas de connexion internet » | Projet Supabase en pause | Le tier gratuit se met en pause après 7 jours — un clic le réveille |
| Build échoue en C++ / worklets | Conflit `reanimated`/`worklets` | `.npmrc` contient `legacy-peer-deps=true` — ne pas le supprimer |
| Polices non chargées | Cache Metro | `npx expo start --clear` |
| App rejetée (public enfant) | Questionnaire | Compléter honnêtement « Public cible » |
