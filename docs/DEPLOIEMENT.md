# 📦 Déploiement — Mettre Ti Pwof sur les stores

Guide pas à pas pour transformer ce projet en **vraie application publiée**, avec EAS (Expo Application Services).

---

## 0. Avant tout : le backend est-il prêt ?

Le backend (Supabase) est **déjà déployé** : base de données, comptes élèves, stockage des fichiers et Edge Function du tuteur.

### Une seule chose à faire : poser la clé Anthropic

**Dashboard → Edge Functions → Secrets** → ajouter `ANTHROPIC_API_KEY`.
Détails et choix du modèle : [`docs/IA.md`](IA.md).

Sans elle, tout fonctionne **sauf** les réponses du tuteur et la génération de quiz.

### L'inscription : rien à régler

Les comptes sont confirmés d'office par un trigger de base : l'inscription est instantanée et **n'envoie aucun e-mail**. Aucune limite d'envoi ne peut donc bloquer un élève.

> Si un jour tu veux vraiment vérifier les adresses e-mail, il faudra retirer le trigger `on_auth_user_auto_confirm` **et** brancher un vrai service d'envoi (Resend, SendGrid…) dans **Authentication → Emails → SMTP Settings**. Le service d'envoi intégré de Supabase plafonne à quelques e-mails par heure et ne convient pas à une vraie mise en production.

---

## 1. Prérequis pour publier

| Compte | Prix | Obligatoire pour |
|---|---|---|
| **Expo** (expo.dev) | Gratuit | Tout |
| **Google Play Console** | **25 $** (une fois à vie) | Play Store |
| **Apple Developer** | **99 $/an** | App Store |

> 💡 Commence par **Android** : moins cher, validation plus rapide, et la majorité des élèves haïtiens sont sur Android.

---

## 2. Se connecter à EAS

```bash
npx eas-cli login          # ton compte expo.dev
npx eas-cli init           # relie le dossier à un projet EAS
```

`eas.json` est **déjà configuré** — inutile de lancer `eas build:configure`.

---

## 3. Premier APK de test

```bash
npx eas-cli build --platform android --profile preview
```

- ⏱️ 10–20 minutes dans le cloud ☁️
- Tu reçois un **lien + QR code** → télécharge le `.apk` et installe-le sur n'importe quel Android (parfait pour tester en famille, à l'école)

> Les identifiants sont déjà définis dans `app.json` : `com.tipwof.app` (Android et iOS).

---

## 4. Build de production

```bash
# Android — .aab, le format exigé par le Play Store
npx eas-cli build --platform android --profile production

# Android — .apk de production (distribution directe, hors store)
npx eas-cli build --platform android --profile production-apk

# iOS (nécessite le compte Apple Developer)
npx eas-cli build --platform ios --profile production
```

---

## 5. Publier sur Google Play

1. **play.google.com/console** → Créer une application
2. Nom : **Ti Pwof** · Catégorie : **Éducation**
3. Visuels demandés :
   - Icône 512×512 → régénère avec `python scripts/make_icons.py` puis redimensionne `assets/icon.png`
   - Bannière 1024×500 → à créer (Canva)
   - Captures d'écran → depuis un vrai téléphone ou l'émulateur
4. **Production → Nouvelle version → téléverse le `.aab`**
5. Questionnaire contenu : pas de pubs ; **déclare honnêtement le public visé** (13+ conseillé)
6. Envoie en validation → ⏱️ quelques jours

### Soumission automatique

```bash
npx eas-cli submit --platform android
```

---

## 6. Mettre à jour après publication

| Type de changement | Comment |
|---|---|
| Code JS/TS, textes, couleurs, écrans | `eas update` → mise à jour **instantanée** OTA, sans repasser par le store 🚀 |
| Base de données, prompts IA | Migration Supabase / redéploiement de la fonction — **aucune** mise à jour de l'app requise |
| Version native (permissions, icône, dépendance native) | Nouveau `eas build` + soumission |

```bash
npx eas-cli update --branch production --message "Amélioration du tuteur"
```

---

## 7. Checklist avant le lancement public ✅

- [ ] `ANTHROPIC_API_KEY` posée dans les secrets Supabase (§0)
- [ ] Inscription + connexion testées sur un vrai téléphone
- [ ] Le tuteur répond et un quiz se génère
- [ ] Envoi d'une photo de devoir testé (caméra **et** galerie)
- [ ] Testé avec la taille de police système à 130 %
- [ ] Les deux langues fonctionnent partout (FR / HT)
- [ ] Testé sur un Android d'entrée de gamme (fluidité, tailles de texte)
- [ ] Mode avion testé : l'app s'ouvre et affiche les données en cache
- [ ] Une page **Politique de confidentialité** existe (obligatoire — l'app collecte e-mail et progression)
- [ ] Budget Anthropic surveillé, et `ANTHROPIC_MODEL` choisi en conscience ([`docs/IA.md`](IA.md) §3)
- [ ] `version` incrémentée dans `app.json`

---

## 🆘 Problèmes fréquents

| Erreur | Solution |
|---|---|
| « credentials » Android | Laisse EAS générer la clé de signature : réponds *yes* |
| Build iOS échoue | Compte Apple Developer actif + termes acceptés sur developer.apple.com |
| App rejetée (public enfant) | Complète honnêtement le questionnaire « Public cible » |
| Le tuteur répond « configuration » | `ANTHROPIC_API_KEY` absente → §0 |
| Photo refusée sur l'appareil | Permission caméra retirée → Réglages Android → Ti Pwof → Autorisations |
