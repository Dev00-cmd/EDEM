<div align="center">

# ✦ Ti Pwof

### *Pwof AI ou nan poch ou* — ton prof IA dans ta poche

Un tuteur **IA personnel**, **bilingue Français ↔ Kreyòl**, conçu pour les élèves haïtiens.
Il explique chaque notion du programme, construit un parcours sur mesure, génère des quiz à l'infini —
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
12. [Compiler l'APK](#12-compiler-lapk)
13. [Résoudre les problèmes](#13-résoudre-les-problèmes)

---

## 1. Ce que fait l'app

| | Fonctionnalité | Description |
|---|---|---|
| 🤖 | **Tuteur IA** | Explique n'importe quelle matière étape par étape, calibré à la classe de l'élève, avec des exemples de la vie haïtienne (gourdes, marché, tap-tap) |
| 📸 | **Photo du devoir** | L'élève photographie son exercice ou envoie un PDF — le tuteur le lit et l'explique |
| 🎓 | **Strictement scolaire** | Refuse poliment tout hors-sujet et recentre sur les études. Zéro dérive, parents rassurés |
| 👤 | **Compte élève** | E-mail + mot de passe. La progression suit l'élève d'un téléphone à l'autre |
| 🗺️ | **Parcours personnalisé** | Généré depuis la classe, l'objectif et les matières choisies ; il évolue avec la maîtrise réelle de chaque notion (0-100) |
| 📈 | **Statistiques** | Courbe des XP sur 7 jours, série de jours d'affilée, précision, maîtrise par matière |
| 🔍 | **Suivi automatique** | L'IA détecte la notion traitée dans chaque conversation → la maîtrise progresse toute seule |
| 🏆 | **Quiz IA** | Générés à la demande dans toutes les matières, avec explications ; bonus pour les 100 % |
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
npx expo start   # à chaque fois
```

Un **QR code** s'affiche dans le terminal. Scanne-le avec **Expo Go** (Android) ou l'appareil photo (iPhone).

> 💡 Ton téléphone et ton ordinateur doivent être sur le **même Wi-Fi**.
> Pour tester dans un navigateur : `npx expo start --web`

### ⚠️ Une seule chose à configurer : la clé de l'IA

Le tuteur ne répondra pas tant que la clé Anthropic n'est pas posée. **Tout le reste fonctionne déjà** (comptes, parcours, statistiques).

1. Crée une clé sur **https://console.anthropic.com** (elle commence par `sk-ant-`)
2. Va sur **[les secrets du projet Supabase](https://supabase.com/dashboard/project/qoyebljuvrxhcroxapys/settings/functions)**
3. **Add new secret** → nom `ANTHROPIC_API_KEY`, valeur : ta clé
4. C'est tout — rien à redéployer

Détails et choix du modèle : **[`docs/IA.md`](docs/IA.md)**

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
                         · XP, séries                 │  gardée ici
                         · maîtrise par notion        ▼
                         · quiz passés            🧠 CLAUDE
                         · conversations
                         · activité quotidienne
                         · 📎 fichiers joints
                              (stockage privé)

              ────────── tout est chez Supabase ──────────
                  aucun serveur à héberger toi-même
```

**Pourquoi ce découpage ?** Trois raisons concrètes :

1. **La clé API ne peut pas être volée.** Elle vit dans la fonction serveur, jamais dans l'APK. Quelqu'un qui décompile l'application ne trouve rien.
2. **Un élève ne peut pas tricher.** Les XP et la maîtrise sont calculés par des fonctions SQL sur le serveur, pas par l'app.
3. **Rien n'est perdu.** L'élève change de téléphone, se reconnecte, retrouve tout.

---

## 4. Où se trouve quoi

```
Ti pwof/
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
│       ├── quiz.tsx            🏆 Quiz générés par l'IA
│       └── profile.tsx         👤 Profil & réglages
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
│   │   ├── Button.tsx          Boutons (5 variantes)
│   │   ├── Card.tsx            Cartes + en-têtes de section + états vides
│   │   ├── Input.tsx           Champs de saisie
│   │   ├── Chip.tsx            Pastilles sélectionnables
│   │   ├── Stats.tsx           Tuiles, barres, anneaux, courbes
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
│       └── ThemeContext.tsx    Distribution du thème
│
├── supabase/functions/tutor/   ⚡ La fonction serveur qui parle à Claude
├── scripts/make_icons.py       Régénère toutes les icônes de l'app
├── assets/                     Icônes, logo, illustration
└── docs/
    ├── IA.md                   Brancher et régler l'IA
    └── DEPLOIEMENT.md          Publier sur les stores
```

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

Six tables, toutes protégées.

| Table | Ce qu'elle garde |
|---|---|
| `profiles` | Prénom, langue, classe, objectif, matières, thème |
| `progress` | XP, série de jours, compteurs de quiz |
| `topic_mastery` | Maîtrise 0-100 pour chaque notion |
| `quiz_results` | Historique des quiz passés |
| `chat_messages` | Conversations + pièces jointes |
| `daily_activity` | XP par jour → la courbe des statistiques |

### Les calculs se font sur le serveur

Quatre fonctions SQL, pas de logique de score dans l'app :

| Fonction | Rôle |
|---|---|
| `study_topic()` | L'élève étudie une notion → maîtrise +34, XP, série |
| `apply_quiz_results()` | Résultats d'un quiz → XP, maîtrise, historique, activité |
| `touch_activity()` | Met à jour la série de jours d'affilée |
| `reset_progress()` | Remet la progression à zéro |

**Pourquoi côté serveur ?** Parce qu'un calcul fait dans l'app peut être modifié par n'importe qui, et parce que deux appareils utilisés en même temps s'écraseraient l'un l'autre.

### Régénérer les types après un changement de schéma

```bash
npx supabase gen types typescript --project-id qoyebljuvrxhcroxapys > src/lib/database.types.ts
```

---

## 10. Sécurité

| Garantie | Comment c'est obtenu |
|---|---|
| La clé API Anthropic est invisible | Secret serveur. Décompiler l'APK ne donne rien |
| Un élève ne lit pas les données d'un autre | Row Level Security sur les 6 tables **et** sur le stockage |
| Un élève ne peut pas se donner des XP | Calculs en SQL, pas dans l'app |
| L'IA n'est accessible qu'aux inscrits | La fonction refuse tout appel sans jeton valide (401) |
| Un fichier joint reste privé | Bucket privé + vérification du propriétaire côté serveur |

**Vérifié** : le linter de sécurité Supabase ne remonte **aucune alerte**.

### Ce qui est public — et pourquoi c'est normal

La clé `sb_publishable_...` présente dans `src/config/app.ts` est **faite pour vivre dans l'application**. Elle n'ouvre aucune donnée par elle-même : ce sont les règles RLS qui protègent tout. C'est le fonctionnement prévu par Supabase.

La vraie clé secrète — `ANTHROPIC_API_KEY` — n'est **jamais** dans le dépôt.

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

## 12. Compiler l'APK

```bash
npx eas-cli login                                        # ton compte expo.dev
npx eas-cli init                                         # une seule fois
npx eas-cli build --platform android --profile preview   # → APK
```

⏱️ 10 à 20 minutes dans le cloud. Tu reçois un lien et un QR code — l'APK s'installe sur n'importe quel Android.

`eas.json` est **déjà configuré**, avec quatre profils :

| Profil | Résultat |
|---|---|
| `preview` | APK de test, à installer directement |
| `production` | `.aab` pour le Play Store |
| `production-apk` | APK de production, distribution hors store |
| `development` | Build de développement |

Guide complet de publication : **[`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md)**

---

## 13. Résoudre les problèmes

| Symptôme | Cause | Solution |
|---|---|---|
| Le tuteur répond « configuration » | Clé Anthropic absente | [§2](#2-démarrage-rapide-5-minutes) |
| « Pas de connexion internet » | Réseau, ou projet Supabase en pause | Le tier gratuit se met en pause après 7 jours d'inactivité — un clic dans le dashboard le réveille |
| Le QR code ne marche pas | Téléphone et PC sur des réseaux différents | Même Wi-Fi, ou `npx expo start --tunnel` |
| Polices non chargées | Cache Metro | `npx expo start --clear` |
| Erreur de build EAS | Configuration | `npx expo-doctor` doit afficher **21/21** |
| Photo refusée | Permission caméra | Réglages Android → Applications → Ti Pwof → Autorisations |
| Écran blanc au lancement | Erreur JavaScript | Regarde le terminal ; `npx expo start --clear` |

### Vérifier que tout est sain

```bash
npx tsc --noEmit    # types — doit être silencieux
npx expo-doctor     # configuration — doit afficher 21/21
```

---

## 🗺️ Feuille de route

- [ ] Notes de cours et agenda des devoirs
- [ ] Tableau de bord prof/parents
- [ ] Mode « examen blanc » 9e AF / Bac, avec minuterie
- [ ] Explications audio (synthèse vocale)
- [ ] Défis de classe entre camarades
- [ ] Mode hors-ligne complet pour les notions déjà consultées

---

<div align="center">

Fait avec ❤ pour les élèves d'Haïti 🇭🇹

</div>
