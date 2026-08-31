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
4bis. [Deux interfaces, un seul compte](#4bis-deux-interfaces-un-seul-compte)
5. [Le design](#5-le-design)
6. [Adaptation à tous les écrans](#6-adaptation-à-tous-les-écrans)
7. [Comptes élèves](#7-comptes-élèves)
8. [Photos et documents](#8-photos-et-documents)
9. [Classes, devoirs et fil](#9-classes-devoirs-et-fil)
10. [Protection des mineurs et modération](#10-protection-des-mineurs-et-modération)
11. [La base de données](#11-la-base-de-données)
12. [Sécurité](#12-sécurité)
13. [Personnaliser l'app](#13-personnaliser-lapp)
14. [Livrer une modification](#14-livrer-une-modification)
15. [Résoudre les problèmes](#15-résoudre-les-problèmes)

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
| 🏫 | **Ton école, pas un champ libre** | Les **25 347 écoles d'Haïti** (source MENFP), les 146 communes et les 10 départements. On choisit la sienne dans une liste, on ne la tape pas |
| 👩‍🏫 | **Rôle professeur** | Obtenu en se déclarant — nom, école, matières, moyen de joindre — et accordé dans la seconde. Aucune file d'attente, aucune validation. Un compte prof reste un compte élève, avec des droits en plus |
| 🚪 | **Classes sur invitation** | Le prof ouvre une classe, distribue un code à 6 caractères, puis **valide chaque élève**. Écrire « Lycée X, NS3 » dans son profil n'ouvre aucune porte |
| 📝 | **Devoirs et quiz assignés** | Texte, photo du cahier, ou quiz généré pour chaque élève. Le prof note et commente |
| 🏫 | **Interface professeur** | Ses salles, son suivi de classe et ses devoirs, dans une barre d'onglets à lui. Même compte et même connexion que l'élève — [§4bis](#4bis-deux-interfaces-un-seul-compte) |
| 📊 | **Suivi de classe** | La maîtrise moyenne de sa classe notion par notion, et qui est sous 40 % — sans avoir corrigé une seule copie. C'est un onglet, plus un écran enfoui |
| 💬 | **Fil de classe** | Un chat en temps réel, uniquement à l'intérieur d'une classe où un professeur est présent. Pas de messages privés |
| 🛡️ | **Modération** | Filtre en français et en créole, bouton signaler en deux touches, le prof modère sa classe, et chaque geste est journalisé — [§10](#10-protection-des-mineurs-et-modération) |
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
                         L'ÉLÈVE                      │  clé API
                         · profil, XP, séries         │  gardée ici
                         · maîtrise par notion        │
                         · quiz + conversations       ▼
                         · 📎 fichiers (privés)    ✨ GEMINI
                                                      modèle choisi
                         LA CLASSE                    par question
                         · écoles, communes           · chat
                         · classes et adhésions       · quiz
                         · devoirs et remises         · modération
                         · fil de discussion            (2ᵉ temps)
                                    ▲
                         LA MODÉRATION
                         · filtre de termes FR + HT ── appliqué ici,
                         · signalements                à l'insertion,
                         · journal (illisible          gratuitement
                           depuis l'app)

              ────────── tout est chez Supabase ──────────
                  aucun serveur à héberger toi-même
```

**Pourquoi ce découpage ?** Quatre raisons concrètes :

1. **La clé API ne peut pas être volée.** Elle vit dans la fonction serveur, jamais dans l'APK. Quelqu'un qui décompile l'application ne trouve rien.
2. **Un élève ne peut pas tricher.** Les XP et la maîtrise sont calculés par des fonctions SQL sur le serveur, pas par l'app.
3. **Rien n'est perdu.** L'élève change de téléphone, se reconnecte, retrouve tout.
4. **La pédagogie s'améliore sans rien réinstaller.** La méthode d'enseignement et le choix du modèle vivent côté serveur : les retoucher ne demande aucune mise à jour de l'app.
5. **La modération ne dépend pas de l'app.** Le filtre s'applique à l'insertion, en SQL. Un client modifié qui contournerait l'écran se ferait refuser par la base — et sa tentative serait journalisée.

---

## 4. Où se trouve quoi

```
EDEM/
│
├── app.config.js               ⚙️ Retire runtimeVersion/updates pour Expo Go
│
├── app/                        LES ÉCRANS (routage par fichiers)
│   ├── _layout.tsx             Providers + aiguillage login/onboarding/app
│   ├── login.tsx               Connexion · inscription · mot de passe oublié
│   ├── onboarding.tsx          Classe, objectif, matières (3 étapes)
│   ├── tune-profile.tsx        « Personnalise ton tuteur » — école, commune, objectif
│   ├── teacher-request.tsx     Demander le rôle professeur
│   ├── classes.tsx             Mes classes · rejoindre par code
│   ├── classroom/new.tsx       Ouvrir une classe (professeur)
│   ├── classroom/[id].tsx      Une classe : membres, chapitre en cours, devoirs
│   ├── assignment/new.tsx      Donner un devoir ou un quiz
│   ├── assignment/[id].tsx     Un devoir : rendre, ou corriger
│   ├── dashboard/[id].tsx      📊 Tableau de bord du prof, notion par notion
│   ├── fil/[id].tsx            💬 Le fil de la classe, en temps réel
│   ├── moderation/[id].tsx     🛡️ La pile de modération du professeur
│   ├── (tabs)/                 L'INTERFACE ÉLÈVE
│   │   ├── _layout.tsx         Ses onglets
│   │   ├── index.tsx           🏠 Accueil — question rapide, plan du jour
│   │   ├── path.tsx            📈 Parcours & statistiques
│   │   ├── chat.tsx            ✦ Tuteur IA — le cœur de l'app
│   │   ├── quiz.tsx            🏆 Quiz — 3 niveaux, chrono par matière
│   │   ├── board.tsx           🥇 Classement de tous les élèves
│   │   └── profile.tsx         👤 Profil, réglages & mises à jour
│   │
│   ├── +not-found.tsx          Route inconnue → on rentre chez soi, dans sa langue
│   │
│   └── prof/                   L'INTERFACE PROFESSEUR (un vrai segment : /prof)
│       ├── _layout.tsx         Ses onglets — ni Quiz ni Classement
│       ├── index.tsx           🏫 Ses salles, codes et demandes en attente
│       ├── suivi.tsx           📊 OÙ EN EST SA CLASSE, notion par notion
│       ├── devoirs.tsx         📚 Toutes classes, file de correction
│       ├── tuteur.tsx          ✦ M. Thomas (le même écran que l'élève)
│       └── compte.tsx          👤 SON profil : salles, élèves, sa déclaration
│                                  (ni XP, ni classe, ni classement)
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
│   │   ├── CharteDialog.tsx    Les 5 règles, à la première entrée en classe
│   │   ├── ReportDialog.tsx    Signaler : le drapeau, puis le motif
│   │   ├── UpdateBanner.tsx    Bandeau « mise à jour prête »
│   │   ├── ChatBubble.tsx      Bulles de conversation + aperçu de fichier
│   │   ├── LogoMark.tsx        Le logo, en vectoriel
│   │   ├── TabBar.tsx          La barre d'onglets — partagée par les 2 interfaces
│   │   ├── ProfileBlocks.tsx   Langue, thème, mise à jour — partagés par les 2 profils
│   │   ├── SchoolPicker.tsx    Choisir l'école d'une salle (recherche nationale)
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
│   │   ├── schools.ts          Recherche dans les 25 347 écoles
│   │   ├── teacher.ts          Demande et état du rôle professeur
│   │   ├── classrooms.ts       Classes, adhésions, code d'invitation
│   │   ├── assignments.ts      Devoirs, remises, tableau de bord
│   │   ├── chat.ts             Fil de classe + abonnement temps réel
│   │   ├── moderation.ts       🛡️ Signalement, charte, pile du prof
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
├── supabase/migrations/        Les migrations SQL, commentées
│                                  (recopie exacte de ce qui a été appliqué)
│
├── scripts/
│   ├── migrate.mjs             Applique une migration SQL
│   ├── deploy_function.mjs     Déploie l'Edge Function
│   ├── dump_types.mjs          Régénère src/lib/database.types.ts
│   ├── smoke_test.mjs          Quiz, XP, quotas — bout en bout
│   ├── test_moderation.mjs     🛡️ Modération — 6 comptes, vraies requêtes REST
│   ├── check_i18n.mjs          Chaque clé existe en FR ET en HT
│   └── make_icons.py           Régénère toutes les icônes de l'app
├── assets/                     Icônes, logo, illustration
└── docs/
    ├── IA.md                   Régler l'IA, les modèles, les coûts
    └── DEPLOIEMENT.md          Livrer une modification, publier
```

> 📌 **Pourquoi la fonction serveur tient en un seul fichier ?** Parce qu'elle se déploie par copier-coller dans le dashboard Supabase. Chaque fichier supplémentaire est une occasion d'en oublier un et de casser le tuteur — c'est déjà arrivé.

---

## 4bis. Deux interfaces, un seul compte

L'application affiche deux choses très différentes selon `profiles.role`. **Ce n'est pas deux applications, ni deux comptes, ni deux connexions.**

```
                    UNE SEULE CONNEXION
                            │
                  profiles.role, décidé en base
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
   (tabs)  ÉLÈVE                          (prof)  PROFESSEUR
   Accueil · Parcours                     Mes salles · Suivi
   M. Thomas · Quiz                       Devoirs · M. Thomas
   Classement · Profil                    Profil
        ▲                                       │
        └───────── « voir comme élève » ────────┘
```

### Pourquoi pas deux comptes séparés

C'était l'idée de départ. Trois raisons de ne pas l'avoir retenue :

1. **Ça n'aurait rien protégé de plus.** Le rôle vit dans `profiles.role`, garanti par un trigger, et **44 vérifications `is_classroom_teacher`** gardent les données. Deux écrans de connexion devant la même table `auth.users`, c'est du décor — la sécurité est ailleurs, et elle est déjà là.
2. **Beaucoup de professeurs sont aussi des élèves**, en formation ou simplement pour faire préparer une explication par M. Thomas. Un compte prof **reste** un compte élève : il garde son profil, ses XP et son tuteur. La bascule dans son profil lui rend les onglets de l'élève.
3. **Deux mots de passe dans un pays où l'accès e-mail est peu fiable** — c'est déjà la raison pour laquelle l'inscription ne demande aucune vérification par courriel ([§7](#7-comptes-élèves)).

### Ce que le professeur voit, et pourquoi

| Onglet | Ce qu'il répond |
|---|---|
| **Mes salles** | Le code à donner, qui attend une validation, ce qu'il y a à corriger |
| **Suivi** | *Où en est ma classe ?* — maîtrise par notion, **élèves sous 40 % nommés**. Aucune saisie : tout vient de `topic_mastery`, qui se remplit au fil des quiz |
| **Devoirs** | Toutes classes confondues, **ce qui attend une correction d'abord** |
| **M. Thomas** | Le même tuteur — un prof s'en sert pour préparer |
| **Profil** | Les mêmes réglages, plus la bascule vers la vue élève |

Pas de **Quiz**, pas de **Classement**, pas de **Parcours** : ce sont la progression et les XP d'un élève. Ils restent accessibles par la bascule.

> 📊 **Le Suivi est la fonctionnalité qui décide un professeur à recommander EDEM ou à l'interdire dans sa classe** — bien plus que la messagerie. Il existait en base depuis les devoirs, et n'était atteignable qu'en quatre touches au fond d'une classe. C'est maintenant un onglet.

### Ce que ça a coûté côté serveur

Presque rien : deux fonctions d'agrégation, `teacher_overview()` et `teacher_assignments()`. Tout le reste existait déjà par classe. Elles évitent surtout de **boucler côté client** — dix appels pour dix classes, sur un forfait payé à l'unité.

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
| **Onboarding** | Langue → **élève ou professeur ?** → puis la classe (élève) ou la déclaration (professeur). Le chemin n'est pas le même, parce que les questions ne le sont pas |

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

## 9. Classes, devoirs et fil

EDEM a commencé comme un tuteur solo. Il sait maintenant vivre dans une vraie classe, avec un vrai professeur.

### La règle qui tient tout

> **L'appartenance à une classe ne se déclare pas, elle s'accorde.**

Avoir écrit « Lycée Alexandre Pétion, NS3 » dans son profil ne donne accès à **rien**. Pour entrer dans une classe il faut un code d'invitation du professeur, **puis** sa validation. Aucune règle de la base ne dit « même école + même niveau = accès » : ce serait une porte ouverte pour un adulte malveillant.

### Le chemin complet

```
1. Un professeur SE DÉCLARE               teacher-request.tsx
        ↓                                  nom, matières, école, moyen de le joindre
        ↓                                  declare_teacher_role() accorde le rôle
        ↓                                  DANS LA MÊME TRANSACTION — aucune attente
2. Il ouvre une classe, tout de suite      create_classroom() → code à 6 caractères
        ↓                                  sans 0/O/1/I/L : un code se recopie du tableau
        ↓                                  10 classes au maximum
3. Les élèves entrent avec le code         join_classroom() → statut « en attente »
        ↓                                  10 essais/heure : 887 millions de codes possibles,
        ↓                                  mais on ne les essaie pas
4. Le professeur valide chacun             approve_member() → statut « actif »
        ↓
5. Fil, devoirs, tableau de bord           60 membres maximum par classe
```

> 🔑 **Pourquoi personne ne valide le professeur.** Parce que ça ne protégeait rien. La question n'est pas « peut-on se déclarer professeur ? » mais « que peut faire un adulte malveillant qui s'est déclaré professeur ? » — et la réponse est *rien*, tant qu'aucun élève n'entre dans sa classe. Pour qu'un élève entre, il faut lui remettre un code à 6 caractères, et **EDEM n'offre aucun moyen de le remettre** : pas de fil public, pas de recherche d'utilisateurs, pas de messages privés. Un inconnu ne peut adresser la parole à personne. Le code se distribue dans le monde physique, et quelqu'un qui a déjà cet accès aux enfants ne gagnait rien à être validé — il écrivait un nom et un numéro plausibles. La validation coûtait des jours à chaque vrai professeur pour l'impression d'une protection.
>
> Ce qui protège reste en place : la déclaration est **obligatoire** et montrée aux élèves qui rejoignent, le plafond de 10 classes borne ce qu'un abus multiplie, la modération et son journal couvrent chaque geste, et [`revoke_teacher_role()`](supabase/migrations/20260830_classes_et_adhesions.sql) retire le rôle **et** archive toutes ses classes du même geste — un rôle retiré ne se reprend pas en remplissant le formulaire une seconde fois.
>
> Il n'y a **rien à relire, rien à approuver, aucune liste qui t'attend**. La seule file qui demande une réponse est celle des élèves qui veulent rejoindre une classe — et c'est le professeur qui la traite, dans l'app.

### Ce que chacun voit

| | L'élève | Le professeur |
|---|---|---|
| Les camarades | Leur **pseudonyme** | Le pseudonyme **et le vrai prénom**, dans sa classe seulement |
| Le code d'invitation | ❌ *(affiché à un élève, il circule hors de la classe en une récréation)* | ✅ |
| Les remises de devoir | La sienne | Toutes celles de sa classe |
| Le tableau de bord | ❌ | La maîtrise moyenne par notion, et qui est sous 40 % |
| La note pour l'IA | ❌ | ✅ *(le `focus_note` qu'il écrit pour le tuteur)* |

Ce n'est pas l'écran qui décide : **le serveur ne renvoie simplement pas ces champs** à un élève. Un client modifié n'y change rien.

### Le tableau de bord — la fonctionnalité qui décide un prof

Il ne demande **aucune saisie**. Tout vient de `topic_mastery`, qui se remplit toute seule au fil des quiz. C'est de la donnée **mesurée, pas déclarée** — et c'est ce qui la rend utile : un professeur voit où en est sa classe notion par notion sans avoir corrigé une seule copie.

Deux limites posées côté serveur : seulement **la matière de la classe**, et seulement **les notions du programme**. Un professeur de maths n'a pas à voir où en est son élève en créole.

### Le fil de classe

Un chat en temps réel, qui n'existe **qu'à l'intérieur d'une classe où un professeur est présent**.

| Ce qui existe | Ce qui n'existera pas |
|---|---|
| Le fil de la classe, avec le prof dedans | Messages privés élève à élève |
| Pièces jointes (photo du cahier) | Fil de l'école entière, fil public |
| Pseudonymes, badge **PROF** | Vocal, « qui est en ligne », accusés de lecture |

Ce n'est pas une liste de fonctionnalités à faire plus tard : **un mineur ne se retrouve jamais seul dans une conversation**, et c'est la protection qui coûte le moins cher de toutes.

### Sobriété en data — l'élève paie à l'unité

| Mesuré | Valeur |
|---|---|
| Ouvrir une classe et charger 20 messages | **7,0 Ko** *(plafond que l'on s'est fixé : 150 Ko)* |
| Pagination | 20 messages, **par date** — pas d'`OFFSET`, qui devient coûteux dès que le fil s'allonge |
| Images | Téléchargées **au clic seulement** ; sinon une vignette et le nom du fichier |
| Temps réel | Abonnement ouvert à l'arrivée sur l'écran, **coupé en sortant** |

> ⚠️ **Le piège du temps réel, attrapé en production.** Un membre légitime, abonné à sa propre classe, ne recevait **aucun** message — et l'abonnement annonçait pourtant « SUBSCRIBED », sans la moindre erreur. La table était bien publiée, le message bien inséré, la règle d'accès bonne. La cause était côté client : le jeton de l'élève n'atteignait pas la **socket** temps réel, qui restait anonyme, et les règles d'accès l'écartaient poliment sans rien signaler. La correction tient en une ligne — `supabase.realtime.setAuth(jeton)` dans [`AuthContext.tsx`](src/store/AuthContext.tsx) — et c'est le genre de panne qu'on ne trouve pas en relisant du code : tout a l'air correct, et rien ne marche.

---

## 10. Protection des mineurs et modération

**Les utilisateurs sont majoritairement des mineurs.** Ce n'est pas une note de bas de page, c'est ce qui décide de l'architecture.

### Ce qu'on ne collecte jamais

| Interdit | Pourquoi |
|---|---|
| Adresse précise | La localisation s'arrête à **la commune et au département** |
| Numéro de téléphone d'élève | Aucun besoin produit ne le justifie |
| Photo de profil | Un visage d'enfant n'a rien à faire dans une base |
| Date de naissance complète | L'année suffit si un jour c'est nécessaire |
| Nom des parents | — |

La seule donnée de contact de toute l'application est celle qu'un **adulte** fournit lui-même pour être vérifié, en demandant le rôle professeur. Elle n'est jamais montrée à un élève.

### Quatre lignes de défense, de la moins chère à la plus chère

```
1. LA STRUCTURE          Pas de messages privés. Un adulte est toujours
   coût : zéro           présent. La meilleure protection est celle qui
                         rend le problème impossible, pas celle qui le
                         détecte.
        ↓
2. LE FILTRE SQL         Une liste de termes en français ET en créole,
   coût : zéro           appliquée à l'insertion. Refuse le pire,
                         marque le douteux.
        ↓
3. LE PROFESSEUR         Il y a DÉJÀ un adulte responsable dans chaque
   coût : zéro           classe. Il supprime un message, retire un
                         membre, tranche sur un signalement.
        ↓
4. LE MODÈLE             Seulement sur ce que le filtre a marqué ou
   coût : quelques       qu'on a signalé. Jamais sur le fil entier.
   centimes
```

> 💡 **Pourquoi l'IA en dernier ?** Faire passer chaque message par un modèle serait la ligne la plus chère de la facture pour la fonctionnalité la moins rentable. Sur un fil de classe ordinaire, la file de relecture reste **vide** — et la modération ne coûte rien.

### Le filtre, et les trois pièges qu'il évite

| Piège | Ce qui se serait passé | La parade |
|---|---|---|
| **« disputer » contient « pute »** | « Ils se sont disputés » censuré | Comparaison **mot entier** pour les termes courts ; recherche dans le texte recollé réservée aux termes longs, ceux qu'on écrit espacés pour passer |
| **Le programme dit des mots crus** | Un cours de SVT sur la reproduction bloqué | « pénis », « vagin », « sexe » ne figurent **pas** dans la liste. « nèg » non plus : en créole, ça veut dire « type » |
| **`s a l o p e`, `$@l0pe`, `saloooope`** | Trois façons de passer au travers | Accents retirés, chiffres et symboles ramenés à leur lettre, lettres répétées réduites à une seule |

Le filtre **bloque** ce qui n'a aucun usage scolaire possible, et **marque** tout ce qui est ambigu — « kòk » est un coq, « koko » une noix de coco. Se tromper en bloquant, c'est empêcher un élève de poser sa question ; se tromper en marquant, c'est faire lire une ligne de plus au professeur. Le second coûte moins cher.

> 🔒 **Un ajout au plan : le numéro de téléphone.** Toute l'architecture repose sur « aucun échange hors d'une classe où un adulte est présent ». Il existe exactement une façon de la contourner : écrire dans le fil « ekri m sou whatsapp 3XXXXXXX ». Ces messages sont donc **marqués** — jamais bloqués — et montrés au professeur. Un numéro écrit `3712 4590` avec une espace est attrapé aussi : la recherche se fait sur les chiffres recollés.

### Signaler, en deux touches

Un drapeau discret sur chaque message des autres, puis le motif. C'est tout : pas de champ à remplir, pas de confirmation. **Un élève de 14 ans qui vient de lire quelque chose de blessant ne remplit pas un formulaire — il ferme l'application.**

Cinq motifs : insulte, harcèlement, contenu sexuel, triche, autre.

> ⚠️ **Trois signalements masquent un message — de trois personnes différentes.** Une contrainte d'unicité `(cible, signaleur)` le garantit. Sans elle, un seul élève cliquerait trois fois et ferait taire n'importe qui. Le masquage n'est pas une sanction : c'est une **mise en attente réversible**, et le professeur peut le rendre visible d'un bouton.

### Ce que le professeur voit — et ce qu'il ne voit pas

Sa pile de modération ne contient **que** les messages signalés, masqués, ou marqués par le filtre. Jamais le fil ordinaire : un outil de modération qui affiche toute la conversation n'est plus un outil de modération, c'est une surveillance.

Il ne voit **pas qui a signalé**. Sinon un élève qui signale son harceleur se retrouverait exposé au premier mot du professeur devant la classe.

Trois issues, et **« laisser » compte autant que les deux autres** — un outil qui ne sait que sanctionner pousse à sanctionner.

### Le journal — parce qu'un professeur aussi peut abuser

Suppressions, exclusions, masquages, messages refusés par le filtre : tout est enregistré dans `moderation_events`. La table a RLS active et **aucune règle d'accès** : personne ne la lit depuis l'application, professeur compris. On ne donne pas à quelqu'un le tableau de bord qui sert à le surveiller.

`moderation_audit()`, réservée au `service_role`, montre par acteur ses suppressions et ses exclusions sur une période. Un professeur qui supprime trois messages par mois modère ; un professeur qui en supprime quarante en deux jours fait autre chose.

### La charte

Cinq lignes, acceptées à la première entrée dans une classe, écrites pour un élève de 14 ans — pas une politique de confidentialité de trois pages, que personne ne lit.

Elle vit dans [`src/i18n`](src/i18n/fr.ts) en français et en créole, donc lisible hors ligne. Et elle n'est **pas décorative** : tant qu'elle n'est pas acceptée, le serveur refuse les messages de cet élève. L'écran n'est pas seul à garder la porte.

Le professeur n'y est pas soumis — elle est écrite pour les élèves (« ton professeur lit tout »). Ce qui l'engage, lui, c'est le journal qu'il ne peut pas effacer.

### Vérifié par de vraies requêtes

```bash
node scripts/test_moderation.mjs
```

Six comptes jetables — un professeur, l'auteur d'un message, trois camarades, un intrus — et **47 vérifications** en requêtes REST réelles : le filtre refuse, la charte bloque, trois signalements masquent, l'intrus ne lit rien, les écritures directes sont rejetées, le journal enregistre.

Le script teste **les deux chemins**, pas seulement l'attaque : qu'un élève de la classe puisse écrire, signaler et être lu compte autant que le fait qu'un intrus soit repoussé. Une régression qui bloque tout le monde passerait un test de sécurité les yeux fermés.

---

## 11. La base de données

Toutes les tables sont protégées par Row Level Security.

**L'élève**

| Table | Ce qu'elle garde |
|---|---|
| `profiles` | Prénom, langue, classe, école, commune, objectif, matières, thème, rôle |
| `progress` | XP, série de jours, compteurs de quiz |
| `topic_mastery` | Maîtrise 0-100 pour chaque notion |
| `quiz_results` · `quiz_sessions` | Historique des quiz, et la session que le serveur corrige |
| `quiz_seen_questions` | Questions déjà posées → jamais deux fois la même |
| `conversations` · `chat_messages` | Conversations avec le tuteur + pièces jointes |
| `daily_activity` | XP par jour → la courbe des statistiques |
| `usage_counters` | Quotas quotidiens, et les compteurs horaires anti-abus |

**Le référentiel scolaire** — figé, en lecture seule pour l'app

| Table | Contenu |
|---|---|
| `schools` | **25 347 écoles** (source MENFP), avec anti-doublon sur (commune, nom normalisé) |
| `communes` · `departements` | 146 communes, 10 départements |
| `school_levels` · `school_sections` | Niveaux du fondamental et du nouveau secondaire, séries du NS4 |
| `topics` | Les notions du programme, par matière et par niveau |

**La classe**

| Table | Ce qu'elle garde |
|---|---|
| `teacher_requests` · `role_events` | Demandes du rôle prof, et le journal des décisions |
| `classrooms` | Classe, code d'invitation, chapitre en cours, note pour l'IA |
| `classroom_members` | `pending` / `active` / `removed` — 60 membres actifs maximum |
| `assignments` · `submissions` | Devoirs et quiz assignés, remises, notes et retours |
| `classroom_messages` | Le fil, avec `deleted_at` et `flagged` |

**La modération** — [§10](#10-protection-des-mineurs-et-modération)

| Table | Ce qu'elle garde | Lisible par l'app ? |
|---|---|---|
| `reports` | Les signalements. Unicité **(cible, signaleur)** | Le sien, et le prof ceux de sa classe |
| `moderation_terms` | La liste de termes FR + HT | ❌ *(ce serait un mode d'emploi pour passer au travers)* |
| `moderation_events` | Le journal : suppressions, exclusions, refus du filtre | ❌ *(pas même par le professeur)* |
| `moderation_queue` | La file de relecture par le modèle | ❌ |

### Les calculs se font sur le serveur

Pas de logique de score dans l'app :

| Fonction | Rôle |
|---|---|
| `study_topic()` | L'élève étudie une notion → maîtrise, XP, série. **Le barème est dans la fonction**, plus dans le paramètre |
| `grade_quiz()` | Corrige la session ouverte par le serveur — une seule fois, anti-rejeu |
| `apply_quiz_results()` | Résultats d'un quiz → XP selon le **niveau choisi**, maîtrise, historique |
| `touch_activity()` | Met à jour la série de jours d'affilée |
| `leaderboard()` · `my_rank()` | Le classement, et la position de l'élève qui appelle |
| `search_schools()` · `propose_school()` | Recherche sans accents, par sigle ; proposition limitée à 3/jour |
| `create_classroom()` · `join_classroom()` | Ouvrir une classe, entrer par le code (10 essais/heure) |
| `approve_member()` · `remove_member()` | Le professeur décide qui entre et qui sort |
| `post_classroom_message()` | Charte, quota, **filtre de modération**, puis insertion |
| `report_content()` | Signaler — et masquer à trois signaleurs distincts |
| `moderate_message()` | La décision du professeur : supprimer, masquer, laisser |

> ⚠️ **Une leçon apprise deux fois : ces fonctions RENDENT une erreur, elles ne la LÈVENT pas.**
>
> Première version de `join_classroom` : on incrémentait le compteur d'essais, puis on levait une exception sur « code invalide ». Or une exception annule **toute** la transaction — l'incrément compris. Les tentatives ratées ne coûtaient donc rien, et la limite de dix par heure ne protégeait rien : exactement le cas qu'elle visait. Attrapé par le test — douze tentatives d'affilée, zéro refus.
>
> Deuxième bénéfice : elles rendent un **code**, pas une phrase. C'est l'application qui traduit en français ou en créole. Une exception SQL serait arrivée telle quelle sous les yeux d'un élève, en anglais et en jargon.

> 🔒 **Le barème des XP par niveau est appliqué par `apply_quiz_results()`, pas par l'app.** Les valeurs dans `src/config/app.ts` ne servent qu'à l'affichage : un élève ne peut donc pas s'attribuer les XP du niveau difficile en jouant en facile.
>
> Le classement passe par des fonctions `SECURITY DEFINER` qui ne renvoient que prénom, XP et rang — jamais l'e-mail ni les données d'un autre élève.

**Pourquoi côté serveur ?** Parce qu'un calcul fait dans l'app peut être modifié par n'importe qui, et parce que deux appareils utilisés en même temps s'écraseraient l'un l'autre.

### Régénérer les types après un changement de schéma

```bash
npx supabase gen types typescript --project-id qoyebljuvrxhcroxapys > src/lib/database.types.ts
```

---

## 12. Sécurité

| Garantie | Comment c'est obtenu |
|---|---|
| La clé API Gemini est invisible | Secret serveur. Décompiler l'APK ne donne rien |
| Un élève ne lit pas les données d'un autre | Row Level Security sur toutes les tables **et** sur le stockage |
| Un élève ne peut pas se donner des XP | Aucune écriture directe : `progress`, `topic_mastery`, `daily_activity` et `quiz_results` n'ont plus que des règles de **lecture** |
| Un élève ne peut pas se déclarer professeur | `role` ne fait pas partie des colonnes qu'il a le droit de modifier. Idem pour la charte |
| Un non-membre ne voit rien d'une classe | Aucune règle ne dit « même école = accès ». Tout passe par une adhésion validée |
| Le code d'invitation ne se devine pas | 6 caractères sur 31 symboles (887 millions), **10 essais par heure** |
| L'IA n'est accessible qu'aux inscrits | La fonction refuse tout appel sans jeton valide (401) |
| Un fichier joint reste privé | Bucket privé + vérification du propriétaire côté serveur |
| Une remise de devoir reste entre l'élève et son prof | Le chemin distingue `…/chat/…` (tous les membres) de `…/{devoir}/…` (le professeur seul) |

> 🔒 **Le principe qui revient partout : le client lit, seules des fonctions `SECURITY DEFINER` écrivent.** Toutes ont `SET search_path TO ''`, aucune n'est exécutable par `anon`.

**Vérifié** :

```bash
node scripts/smoke_test.mjs        # quiz, XP, quotas, anti-rejeu
node scripts/test_moderation.mjs   # 47 vérifications sur 6 comptes réels
npm run check                      # types + i18n FR/HT + routage de l'IA
```

Le linter de sécurité Supabase ne remonte **aucune erreur**. Il signale en `WARN` que les fonctions `SECURITY DEFINER` sont appelables par un utilisateur connecté — c'est précisément l'architecture voulue : chacune vérifie elle-même qui appelle avant d'agir.

### Ce qui est public — et pourquoi c'est normal

La clé `sb_publishable_...` présente dans `src/config/app.ts` est **faite pour vivre dans l'application**. Elle n'ouvre aucune donnée par elle-même : ce sont les règles RLS qui protègent tout. C'est le fonctionnement prévu par Supabase.

La vraie clé secrète — `GEMINI_API_KEY` — n'est **jamais** dans le dépôt.

---

## 13. Personnaliser l'app

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
| 🛡️ **Les termes filtrés** | La table `moderation_terms` (SQL uniquement — jamais lisible depuis l'app) |
| 📜 **La charte de classe** | `src/i18n/fr.ts` et `ht.ts`, section `charte` |
| 🤖 **Le prompt de modération** | `supabase/functions/tutor/index.ts`, `MODERATION_PROMPT` |

### Régénérer les icônes de l'app

```bash
python scripts/make_icons.py
```

Redessine les six fichiers (icône iOS, icône adaptative Android, monochrome, fond, écran de démarrage, favicon) à partir du même tracé que le logo.

---

## 14. Livrer une modification

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

## 15. Résoudre les problèmes

| Symptôme | Cause | Solution |
|---|---|---|
| Le tuteur ne répond pas | `GEMINI_API_KEY` absente | [§2](#2-démarrage-rapide-5-minutes) |
| `no longer available` | Modèle retiré par Google | Un repli automatique évite la panne ; poser `GEMINI_MODEL_*` — [`docs/IA.md`](docs/IA.md) §3 |
| **Expo Go refuse d'ouvrir le projet** | `runtimeVersion` incompatible | `npm run go`, pas `npx expo start` — [§2](#2-démarrage-rapide-5-minutes) |
| L'élève ne voit pas la mise à jour | L'OTA ne s'applique pas seul | Profil → Mises à jour — [§14](#14-livrer-une-modification) |
| Les fractions s'affichent `17/12` | La méthode n'est pas appliquée | Vérifier que l'Edge Function est bien déployée |
| Un quiz sort de sa matière | Contexte d'une autre matière | Corrigé — vérifier que l'app est à jour (OTA) |
| « Pas de connexion internet » | Réseau, ou projet Supabase en pause | Le tier gratuit se met en pause après 7 jours d'inactivité — un clic dans le dashboard le réveille |
| Le QR code ne marche pas | Téléphone et PC sur des réseaux différents | Même Wi-Fi, ou `npx expo start --tunnel` |
| Polices non chargées | Cache Metro | `npx expo start --clear` |
| Build échoue en C++ / worklets | Conflit `reanimated`/`worklets` | `.npmrc` contient `legacy-peer-deps=true` — **ne pas le supprimer** |
| Photo refusée | Permission caméra | Réglages Android → Applications → EDEM → Autorisations |
| Le fil ne reçoit rien en direct | Le jeton n'atteint pas la socket temps réel | `supabase.realtime.setAuth()` — [§9](#9-classes-devoirs-et-fil). L'abonnement dit « SUBSCRIBED » sans rien recevoir |
| « Lis les règles de la classe » en boucle | La charte n'est pas enregistrée | Elle s'écrit par `accept_charter()`, jamais par un update du profil |
| Un message normal est refusé | Faux positif du filtre | Regarder `moderation_terms` : le terme est probablement en `mot_entier = false` alors qu'il est court |
| Le prof ne voit pas un message signalé | Il n'est pas le professeur **de cette classe** | `classroom_moderation()` ne rend rien à quelqu'un d'autre, sans erreur |
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
- [x] ~~**Quota par élève**~~ — `usage_counters` + `bump_usage()`, quotidien pour le tuteur et les quiz, horaire pour les messages et les codes d'invitation
- [ ] **Révision espacée** — toute question ratée revient après 1, 3, 7 et 21 jours. Le plus gros levier pédagogique : c'est ce qui fait *retenir* au lieu de seulement *évaluer*
- [ ] **Mode « Examen d'État »** — épreuves blanches chronométrées 6e AF / 9e AF / Bac, au format réel
- [ ] **Photo de leçon → fiche + quiz** — l'élève photographie son cahier, reçoit une fiche de révision et 5 questions dessus
- [x] ~~Tableau de bord prof~~ — [§9](#9-classes-devoirs-et-fil)
- [ ] Tableau de bord parents
- [ ] Explications audio (synthèse vocale)
- [ ] Mode hors-ligne complet pour les notions déjà consultées

---

<div align="center">

Fait avec ❤ pour les élèves d'Haïti 🇭🇹

</div>
