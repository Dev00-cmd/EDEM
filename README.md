<div align="center">

# ✦ EDEM

### *Pwof AI ou nan poch ou* — ton prof IA dans ta poche

Un tuteur **IA personnel** nommé **M. Thomas**, **bilingue Français ↔ Kreyòl**, conçu pour les élèves haïtiens.
Il explique chaque notion du programme MENFP, construit un parcours sur mesure, génère des quiz à l'infini —
et sait **lire la photo d'un devoir** pour l'expliquer pas à pas.

*« Chak jenn gen dwa a yon pwof nan poch li. »*

</div>

---

## 📖 Table des matières

1. [Ce que fait l'app](#1-ce-que-fait-lapp)
2. [Démarrage rapide](#2-démarrage-rapide-5-minutes)
3. [Comment tout est branché](#3-comment-tout-est-branché)
4. [Où se trouve quoi](#4-où-se-trouve-quoi)
5. [Le design](#5-le-design)
6. [Adaptation à tous les écrans](#6-adaptation-à-tous-les-écrans)
7. [Comptes élèves](#7-comptes-élèves)
8. [Photos et documents](#8-photos-et-documents)
9. [La base de données](#9-la-base-de-données)
10. [Sécurité](#10-sécurité)
11. [Personnaliser l'app](#11-personnaliser-lapp)
12. [Livrer une modification](#12-livrer-une-modification)
13. [Résoudre les problèmes](#13-résoudre-les-problèmes)

---

## 1. Ce que fait l'app

| | Fonctionnalité | Description |
|---|---|---|
| 🤖 | **M. Thomas, le tuteur** | Explique n'importe quelle matière étape par étape, calibré à la classe de l'élève, avec des exemples de la vie haïtienne (gourdes, marché, tap-tap) |
| ➗ | **Vraies mathématiques** | Fractions dessinées avec leur barre, exposants surélevés, racines — un rendu LaTeX maison, sans WebView |
| 📸 | **Photo du devoir** | L'élève photographie son exercice ou envoie un PDF — le tuteur le lit et l'explique |
| 🎓 | **Strictement scolaire** | Refuse poliment tout hors-sujet et recentre sur les études. Zéro dérive, parents rassurés |
| 👤 | **Compte élève** | E-mail + mot de passe. La progression suit l'élève d'un téléphone à l'autre |
| 🗺️ | **Parcours personnalisé** | Généré depuis la classe, l'objectif et les matières choisies ; il évolue avec la maîtrise réelle de chaque notion (0-100) |
| 📈 | **Statistiques** | Courbe des XP sur 7 jours, série de jours d'affilée, précision, maîtrise par matière |
| 🔍 | **Suivi automatique** | L'IA détecte la notion traitée dans chaque conversation → la maîtrise progresse toute seule |
| 🏆 | **Quiz IA** | 10 questions générées à la demande, **3 niveaux au choix** (facile / intermédiaire / difficile) avec des XP différents, chrono adapté à la matière, et jamais deux fois la même question |
| 🥇 | **Classement** | Palmarès de tous les élèves de la base, avec la position de l'élève |
| 🔄 | **Mise à jour intégrée** | Bouton dans le Profil : cherche, télécharge et applique une mise à jour sans passer par un store |
| 🌗 | **Clair & sombre** | Deux thèmes complets, cohérents jusqu'au dernier détail |
| 🇭🇹 | **Bilingue** | Français et Kreyòl ayisyen, partout, changeable à tout moment |

---

## 2. Démarrage rapide (5 minutes)

### Ce qu'il te faut

| Outil | Pourquoi | Où |
|---|---|---|
| **Node.js** (version LTS) | Pour lancer le projet | https://nodejs.org |
| **Expo Go** | Pour voir l'app sur ton téléphone | App Store / Play Store |

### Lancer

```bash
npm install      # une seule fois
npm run go       # à chaque fois — démarre pour Expo Go
```

Un **QR code** s'affiche dans le terminal. Scanne-le avec **Expo Go** (Android) ou l'appareil photo (iPhone).

> 💡 Ton téléphone et ton ordinateur doivent être sur le **même Wi-Fi**.
> Pour tester dans un navigateur : `npx expo start --web`

> ⚠️ **`npm run go`, pas `npx expo start`.** Expo Go n'embarque pas `expo-updates` et refuse les projets qui déclarent un `runtimeVersion` maison — ce que fait `app.json` pour les mises à jour OTA. Le script `go` pose `EXPO_GO=1`, et [`app.config.js`](app.config.js) retire alors ces clés. Les builds EAS et les mises à jour OTA, eux, reçoivent `app.json` intact.

### ⚠️ Une seule chose à configurer : la clé de l'IA

Le tuteur ne répondra pas tant que la clé Gemini n'est pas posée. **Tout le reste fonctionne déjà** (comptes, parcours, statistiques, classement).

1. Crée une clé — gratuite — sur **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)**
2. Va sur **[les secrets du projet Supabase](https://supabase.com/dashboard/project/qoyebljuvrxhcroxapys/settings/functions)**
3. **Add new secret** → nom `GEMINI_API_KEY`, valeur : ta clé
4. C'est tout — rien à redéployer

Détails, choix du modèle et coûts : **[`docs/IA.md`](docs/IA.md)**

---

## 3. Comment tout est branché

```
                    📱  APPLICATION (Expo / React Native)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   🔐 AUTH               🗄️ BASE DE DONNÉES     ⚡ EDGE FUNCTION
   comptes élèves        PostgreSQL             « tutor »
   e-mail + mot de passe                              │
                         · profil                     │  clé API
                         · XP, séries, classement     │  gardée ici
                         · maîtrise par notion        ▼
                         · quiz passés + déjà vus  ✨ GEMINI
                         · conversations              modèle choisi
                         · activité quotidienne       par question
                         · 📎 fichiers joints
                              (stockage privé)

              ────────── tout est chez Supabase ──────────
                  aucun serveur à héberger toi-même
```

**Pourquoi ce découpage ?** Quatre raisons concrètes :

1. **La clé API ne peut pas être volée.** Elle vit dans la fonction serveur, jamais dans l'APK. Quelqu'un qui décompile l'application ne trouve rien.
2. **Un élève ne peut pas tricher.** Les XP et la maîtrise sont calculés par des fonctions SQL sur le serveur, pas par l'app.
3. **Rien n'est perdu.** L'élève change de téléphone, se reconnecte, retrouve tout.
4. **La pédagogie s'améliore sans rien réinstaller.** La méthode d'enseignement et le choix du modèle vivent côté serveur : les retoucher ne demande aucune mise à jour de l'app.

---

## 4. Où se trouve quoi

```
Ti pwof/
│
├── app.config.js               ⚙️ Retire runtimeVersion/updates pour Expo Go
│
├── app/                        LES ÉCRANS (routage par fichiers)
│   ├── _layout.tsx             Providers + aiguillage login/onboarding/app
│   ├── login.tsx               Connexion · inscription · mot de passe oublié
│   ├── onboarding.tsx          Classe, objectif, matières (3 étapes)
│   └── (tabs)/
│       ├── _layout.tsx         La barre d'onglets du bas
│       ├── index.tsx           🏠 Accueil — question rapide, plan du jour
│       ├── path.tsx            📈 Parcours & statistiques
│       ├── chat.tsx            ✦ Tuteur IA — le cœur de l'app
│       ├── quiz.tsx            🏆 Quiz — 3 niveaux, chrono par matière
│       ├── board.tsx           🥇 Classement de tous les élèves
│       └── profile.tsx         👤 Profil, réglages & mises à jour
│
├── src/
│   ├── ai/
│   │   ├── prompts.ts          🎭 LA PERSONNALITÉ DU TUTEUR
│   │   ├── plan.ts             Moteur de parcours + détection de notion
│   │   ├── tutor.ts            Façade — le reste de l'app ne parle qu'à ça
│   │   └── remoteTutor.ts      Appel de la fonction serveur
│   │
│   ├── components/
│   │   ├── Icon.tsx            🎨 LES ~65 ICÔNES, dessinées à la main
│   │   ├── MathText.tsx        ➗ RENDU DES MATHS — fractions, exposants
│   │   ├── Button.tsx          Boutons (5 variantes)
│   │   ├── Card.tsx            Cartes + en-têtes de section + états vides
│   │   ├── Input.tsx           Champs de saisie
│   │   ├── Chip.tsx            Pastilles sélectionnables
│   │   ├── Stats.tsx           Tuiles, barres, anneaux, courbes
│   │   ├── Countdown.tsx       Anneau de chrono par question de quiz
│   │   ├── ConfirmDialog.tsx   Confirmation (Alert.alert n'existe pas sur web)
│   │   ├── UpdateBanner.tsx    Bandeau « mise à jour prête »
│   │   ├── ChatBubble.tsx      Bulles de conversation + aperçu de fichier
│   │   ├── LogoMark.tsx        Le logo, en vectoriel
│   │   └── Screen.tsx          Conteneur commun à tous les écrans
│   │
│   ├── config/app.ts           ⚙️ Nom, XP, connexion Supabase
│   ├── data/
│   │   ├── curriculum.ts       📚 LES NOTIONS PAR NIVEAU (MENFP)
│   │   ├── subjects.ts         Les 10 matières
│   │   ├── levels.ts           Les classes
│   │   └── tips.ts             Astuce du jour
│   │
│   ├── i18n/                   🌍 fr.ts + ht.ts — TOUS LES TEXTES
│   ├── lib/
│   │   ├── supabase.ts         Client + traduction des erreurs
│   │   ├── attachments.ts      📎 Photos et documents
│   │   └── database.types.ts   Types générés depuis la base
│   │
│   ├── store/
│   │   ├── AuthContext.tsx     Session de l'élève
│   │   └── AppContext.tsx      Profil, progression, conversations
│   │
│   └── theme/
│       ├── colors.ts           🎨 LA PALETTE (clair + sombre)
│       ├── typography.ts       L'échelle typographique (Sora)
│       ├── responsive.ts       📐 Adaptation aux tailles d'écran
│       ├── useKeyboard.ts      ⌨️ Le clavier ne masque plus la saisie
│       └── ThemeContext.tsx    Distribution du thème
│
├── supabase/functions/tutor/
│   └── index.ts                ⚡ TOUT LE SERVEUR IA en un seul fichier :
│                                  méthode d'enseignement, choix du modèle,
│                                  difficulté adaptative, appel à Gemini
│
├── scripts/make_icons.py       Régénère toutes les icônes de l'app
├── assets/                     Icônes, logo, illustration
└── docs/
    ├── IA.md                   Régler l'IA, les modèles, les coûts
    └── DEPLOIEMENT.md          Livrer une modification, publier
```

> 📌 **Pourquoi la fonction serveur tient en un seul fichier ?** Parce qu'elle se déploie par copier-coller dans le dashboard Supabase. Chaque fichier supplémentaire est une occasion d'en oublier un et de casser le tuteur — c'est déjà arrivé.

---

## 5. Le design

L'identité tient en **trois fichiers**. Changer l'apparence de l'app ne demande de toucher à **aucun écran**.

### 🎨 La palette — `src/theme/colors.ts`

Bleu nuit profond, bleu électrique, papier très clair.

| | Couleur | Rôle |
|---|---|---|
| ⬛ | `#0D1B2A` | Nuit la plus profonde — fond en thème sombre |
| 🟦 | `#132640` | Nuit — les cartes |
| 🔵 | `#1E3A8A` | Bleu profond |
| 🔷 | `#2563EB` | **Bleu électrique — l'action principale** |
| 🩵 | `#38BDF8` | Cyan lumineux — accent secondaire |
| 🤍 | `#E0F2FE` | Brume bleutée |
| ⬜ | `#F5F7FA` | Papier — fond en thème clair |

**La règle qui tient tout** : un composant ne code **jamais** une couleur en dur. Il demande un *rôle* — `colors.accent`, `colors.surface`, `colors.textSoft` — et le thème actif décide. C'est ce qui garantit que les modes clair et sombre restent parfaitement alignés, sans double travail.

### ✍️ La typographie — `src/theme/typography.ts`

Une seule famille : **Sora**, en cinq graisses. Les gros titres sont volontairement serrés (`letterSpacing` négatif) — c'est ce qui donne le côté net et affirmé.

> ⚠️ On n'utilise **jamais** `fontWeight` : sur Android il ne fonctionne pas avec les polices chargées. On choisit la famille (`Sora_700Bold`) — c'est elle qui porte la graisse.

### 🎯 Les icônes — `src/components/Icon.tsx`

**~65 icônes dessinées à la main**, pas une librairie tierce. Toutes suivent la même grammaire :

- grille 24 × 24
- trait de **1.75**, jamais de remplissage
- extrémités et angles **arrondis**
- formes géométriques simples

C'est ce qui donne son unité visuelle à l'app — des icônes empruntées à une librairie généraliste se voient tout de suite.

**Ajouter une icône :**

```tsx
// 1. Ajoute son nom au type IconName
| 'ma-nouvelle-icone'

// 2. Ajoute son tracé dans PATHS
'ma-nouvelle-icone': (
  <>
    <Circle cx="12" cy="12" r="8" />
    <Path d="M8 12h8" />
  </>
),
```

Elle hérite automatiquement de la couleur, de l'épaisseur et des arrondis. Utilisation :

```tsx
<Icon name="ma-nouvelle-icone" size={22} color={colors.accent} />
```

---

## 6. Adaptation à tous les écrans

Le parc Android haïtien va du téléphone d'entrée de gamme (**320 dp**, écran 4,5 pouces) à la tablette scolaire. Trois choses cassent une interface sur ce parc — les trois sont traitées dans `src/theme/responsive.ts`.

### Pourquoi rien n'est flou

| Élément | Format | Résultat |
|---|---|---|
| Les ~65 icônes | **SVG vectoriel** | Net à l'infini, quelle que soit la densité |
| Le logo | **SVG vectoriel** | Net à toutes les tailles |
| Icône de l'app | PNG **1024²** | Net jusqu'aux écrans 4x |
| Illustration d'accueil | PNG **1024²**, affichée à ~200 dp | 5× la taille nécessaire |

Aucun élément d'interface n'est une image étirée. C'est la garantie qu'il n'y a **rien de flou**, sur aucun écran.

### Les trois adaptations

**1. Les petites tailles d'écran**

```ts
const { isSmall, gutter, scale } = useResponsive();
```

Les marges se resserrent (16 dp au lieu de 20), les espacements suivent la largeur. L'illustration d'accueil est calculée en pourcentage de l'écran — jamais figée — sinon elle écraserait le texte sur un petit téléphone.

**2. La taille de police système**

Un élève malvoyant peut régler son téléphone à 130 %. Sans plafond, les cinq étiquettes d'onglets se chevauchent et les boutons éclatent.

On plafonne **là où la mise en page est contrainte** (onglets, boutons, pastilles) et on laisse le texte grandir librement **là où il a de la place** (corps de texte, explications du tuteur). L'accessibilité est préservée, la mise en page tient.

```ts
FONT_CAP.tight   // 1.15 — onglets, boutons, pastilles
FONT_CAP.display // 1.30 — titres
FONT_CAP.body    // 1.50 — corps de texte
```

**3. Les grands écrans et la rotation**

Sur tablette, une colonne de texte pleine largeur devient pénible à lire : elle est bornée à 620 dp et centrée.

> 💡 On utilise `useWindowDimensions()` et **jamais** `Dimensions.get()` : la première se met à jour à la rotation et en écran partagé, la seconde non. C'est la cause classique d'une interface figée de travers après avoir tourné le téléphone.

---

## 7. Comptes élèves

**E-mail + mot de passe. Pas de vérification par e-mail.**

Si l'élève connaît son adresse et son mot de passe, il entre. C'est un choix assumé : beaucoup d'élèves haïtiens n'ont pas d'accès e-mail fiable, et exiger un clic dans une boîte mail les exclurait.

Techniquement, un trigger de base marque chaque nouveau compte comme confirmé dès sa création. L'inscription est **instantanée** et n'envoie aucun e-mail — donc aucune limite d'envoi ne peut la bloquer.

| Écran | Ce qui s'y passe |
|---|---|
| **Inscription** | Prénom, e-mail, mot de passe (6 caractères minimum) → compte créé et connecté d'un coup |
| **Connexion** | E-mail + mot de passe |
| **Mot de passe oublié** | Envoie un lien de réinitialisation. Le message reste volontairement neutre : il ne révèle pas si l'adresse existe |
| **Onboarding** | Classe → objectif → matières. Le prénom et la langue viennent déjà de l'inscription |

Les messages d'erreur sont **traduits en français et en créole** — un élève ne devrait jamais lire « Invalid login credentials ».

---

## 8. Photos et documents

L'élève bloque sur un exercice ? Il le photographie, le tuteur l'explique.

### Le parcours d'un fichier

```
1. L'élève choisit          appareil photo · galerie · document PDF
        ↓
2. L'app réduit l'image     1600 px max, JPEG qualité 75 %
        ↓                   ⤷ une photo brute pèse 4-8 Mo : impossible
                              à envoyer sur un réseau lent. Et le HEIC
                              de l'iPhone n'est pas lisible par le tuteur.
        ↓
3. Envoi                    bucket PRIVÉ, dossier de l'élève
        ↓
4. Le tuteur lit            le serveur récupère le fichier et vérifie
                            qu'il appartient bien à cet élève
```

| Règle | Valeur |
|---|---|
| Formats acceptés | JPG, PNG, WebP, GIF, **PDF** |
| Taille maximale | 5 Mo après réduction |
| Visibilité | **Aucune URL publique.** L'affichage passe par une URL signée valable 1 heure |
| Suppression | Vider la conversation efface aussi les fichiers |

> 🔒 **Le point de sécurité qui compte** : le serveur lit les fichiers avec une clé d'administration, qui ignore les règles d'accès. Il vérifie donc explicitement que le chemin demandé commence par l'identifiant de l'élève qui appelle. Sans cette vérification, un élève pourrait faire lire le devoir d'un autre.

---

## 9. La base de données

Toutes les tables sont protégées par Row Level Security.

| Table | Ce qu'elle garde |
|---|---|
| `profiles` | Prénom, langue, classe, objectif, matières, thème |
| `progress` | XP, série de jours, compteurs de quiz |
| `topic_mastery` | Maîtrise 0-100 pour chaque notion |
| `quiz_results` | Historique des quiz passés |
| `quiz_seen_questions` | Questions déjà posées → jamais deux fois la même |
| `chat_messages` | Conversations + pièces jointes |
| `daily_activity` | XP par jour → la courbe des statistiques |

### Les calculs se font sur le serveur

Pas de logique de score dans l'app :

| Fonction | Rôle |
|---|---|
| `study_topic()` | L'élève étudie une notion → maîtrise +34, XP, série |
| `apply_quiz_results()` | Résultats d'un quiz → XP selon le **niveau choisi**, maîtrise, historique |
| `touch_activity()` | Met à jour la série de jours d'affilée |
| `reset_progress()` | Remet la progression à zéro |
| `leaderboard()` | Le classement de tous les élèves |
| `my_rank()` | La position de l'élève qui appelle |

> 🔒 **Le barème des XP par niveau est appliqué par `apply_quiz_results()`, pas par l'app.** Les valeurs dans `src/config/app.ts` ne servent qu'à l'affichage : un élève ne peut donc pas s'attribuer les XP du niveau difficile en jouant en facile.
>
> Le classement passe par des fonctions `SECURITY DEFINER` qui ne renvoient que prénom, XP et rang — jamais l'e-mail ni les données d'un autre élève.

**Pourquoi côté serveur ?** Parce qu'un calcul fait dans l'app peut être modifié par n'importe qui, et parce que deux appareils utilisés en même temps s'écraseraient l'un l'autre.

### Régénérer les types après un changement de schéma

```bash
npx supabase gen types typescript --project-id qoyebljuvrxhcroxapys > src/lib/database.types.ts
```

---

## 10. Sécurité

| Garantie | Comment c'est obtenu |
|---|---|
| La clé API Gemini est invisible | Secret serveur. Décompiler l'APK ne donne rien |
| Un élève ne lit pas les données d'un autre | Row Level Security sur toutes les tables **et** sur le stockage |
| Un élève ne peut pas se donner des XP | Calculs en SQL, pas dans l'app |
| L'IA n'est accessible qu'aux inscrits | La fonction refuse tout appel sans jeton valide (401) |
| Un fichier joint reste privé | Bucket privé + vérification du propriétaire côté serveur |

**Vérifié** : le linter de sécurité Supabase ne remonte **aucune alerte**.

### Ce qui est public — et pourquoi c'est normal

La clé `sb_publishable_...` présente dans `src/config/app.ts` est **faite pour vivre dans l'application**. Elle n'ouvre aucune donnée par elle-même : ce sont les règles RLS qui protègent tout. C'est le fonctionnement prévu par Supabase.

La vraie clé secrète — `GEMINI_API_KEY` — n'est **jamais** dans le dépôt.

---

## 11. Personnaliser l'app

| Ce que tu veux changer | Fichier |
|---|---|
| 🎭 **Le ton et les règles du tuteur** | `src/ai/prompts.ts` |
| 📚 **Les notions du programme** | `src/data/curriculum.ts` |
| 🎨 **Les couleurs** | `src/theme/colors.ts` |
| 🔤 **Les textes** (FR et HT) | `src/i18n/fr.ts` et `src/i18n/ht.ts` |
| 📖 **Les matières** | `src/data/subjects.ts` |
| ⭐ **Les points d'XP** | `src/config/app.ts` **et** les fonctions SQL |
| 🖼️ **Le logo et les icônes** | `src/components/LogoMark.tsx`, puis `python scripts/make_icons.py` |
| 🏷️ **Le nom de l'app** | `src/config/app.ts` **et** `app.json` |

### Régénérer les icônes de l'app

```bash
python scripts/make_icons.py
```

Redessine les six fichiers (icône iOS, icône adaptative Android, monochrome, fond, écran de démarrage, favicon) à partir du même tracé que le logo.

---

## 12. Livrer une modification

**La plupart des changements ne demandent aucun nouvel APK.** La question à se poser d'abord : *qu'est-ce qui a changé ?*

| Ce qui change | Comment livrer | Délai | L'élève doit… |
|---|---|---|---|
| **Prompts, pédagogie, modèles** | Redéployer l'Edge Function | ~1 min | **rien du tout** |
| **Base de données, XP, classement** | Migration SQL | ~1 min | **rien du tout** |
| **Écrans, textes, couleurs, logique** | `eas update` (OTA) | ~5 min | Profil → Mises à jour |
| **Nom, permissions, `app.json`** | Nouveau build EAS | 15-20 min | Réinstaller l'APK |

### Mise à jour OTA — sans recompiler

```bash
npx eas-cli update --branch preview --environment preview --message "Ce que tu as changé"
```

> ⚠️ **L'OTA ne s'applique pas tout seul sur l'appareil de l'auteur** — vérifié jusqu'à la décompilation de l'APK, cause jamais identifiée. Ne jamais dire « ferme et rouvre l'app ». Dire : **Profil → Mises à jour → « Rechercher une mise à jour »**.

### Nouvel APK — seulement si nécessaire

```bash
npx eas-cli build --platform android --profile preview   # → APK
```

⏱️ 15 à 20 minutes dans le cloud. `eas.json` est déjà configuré, avec quatre profils :

| Profil | Résultat |
|---|---|
| `preview` | APK de test, à installer directement |
| `production` | `.aab` pour le Play Store |
| `production-apk` | APK de production, distribution hors store |
| `development` | Build de développement |

> ⚠️ En changeant la version native, incrémente **`version` ET `runtimeVersion` ensemble** dans `app.json`. Le lien de téléchargement de l'APK expire au bout de **14 jours**.

### 🔑 Le keystore — à protéger absolument

`Documents\TiPwof-Keystore\` contient la clé de signature Android. **Sans elle, plus aucune mise à jour de l'app n'est possible sur le Play Store** — il faudrait republier sous un autre nom et repartir de zéro. Garde-en une copie sur **au moins deux supports**.

Guide complet : **[`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md)**

---

## 13. Résoudre les problèmes

| Symptôme | Cause | Solution |
|---|---|---|
| Le tuteur ne répond pas | `GEMINI_API_KEY` absente | [§2](#2-démarrage-rapide-5-minutes) |
| `no longer available` | Modèle retiré par Google | Un repli automatique évite la panne ; poser `GEMINI_MODEL_*` — [`docs/IA.md`](docs/IA.md) §3 |
| **Expo Go refuse d'ouvrir le projet** | `runtimeVersion` incompatible | `npm run go`, pas `npx expo start` — [§2](#2-démarrage-rapide-5-minutes) |
| L'élève ne voit pas la mise à jour | L'OTA ne s'applique pas seul | Profil → Mises à jour — [§12](#12-livrer-une-modification) |
| Les fractions s'affichent `17/12` | La méthode n'est pas appliquée | Vérifier que l'Edge Function est bien déployée |
| Un quiz sort de sa matière | Contexte d'une autre matière | Corrigé — vérifier que l'app est à jour (OTA) |
| « Pas de connexion internet » | Réseau, ou projet Supabase en pause | Le tier gratuit se met en pause après 7 jours d'inactivité — un clic dans le dashboard le réveille |
| Le QR code ne marche pas | Téléphone et PC sur des réseaux différents | Même Wi-Fi, ou `npx expo start --tunnel` |
| Polices non chargées | Cache Metro | `npx expo start --clear` |
| Build échoue en C++ / worklets | Conflit `reanimated`/`worklets` | `.npmrc` contient `legacy-peer-deps=true` — **ne pas le supprimer** |
| Photo refusée | Permission caméra | Réglages Android → Applications → EDEM → Autorisations |
| Écran blanc au lancement | Erreur JavaScript | Regarde le terminal ; `npx expo start --clear` |

### Vérifier que tout est sain

```bash
npx tsc --noEmit    # types — doit être silencieux
npx expo-doctor     # configuration — doit afficher 21/21
```

---

## 🗺️ Feuille de route

Par ordre d'utilité réelle. Les deux premières ne demandent **aucune mise à jour de l'app**.

- [ ] **Cache de quiz partagé** — un quiz devient instantané au lieu de 15 s, et la génération n'est payée qu'une fois pour des dizaines d'élèves *(serveur seul)*
- [ ] **Quota par élève** — sans lui, rien n'empêche 300 quiz dans la journée *(SQL seul)*
- [ ] **Révision espacée** — toute question ratée revient après 1, 3, 7 et 21 jours. Le plus gros levier pédagogique : c'est ce qui fait *retenir* au lieu de seulement *évaluer*
- [ ] **Mode « Examen d'État »** — épreuves blanches chronométrées 6e AF / 9e AF / Bac, au format réel
- [ ] **Photo de leçon → fiche + quiz** — l'élève photographie son cahier, reçoit une fiche de révision et 5 questions dessus
- [ ] Tableau de bord prof/parents
- [ ] Explications audio (synthèse vocale)
- [ ] Mode hors-ligne complet pour les notions déjà consultées

---

<div align="center">

Fait avec ❤ pour les élèves d'Haïti 🇭🇹

</div>
