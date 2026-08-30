// ═══════════════════════════════════════════════════════════════
//  TRADUCTIONS — FRANÇAIS 🇫🇷
//  (le fichier ht.ts doit avoir exactement les mêmes clés)
// ═══════════════════════════════════════════════════════════════

export type Lang = 'fr' | 'ht';

export const fr = {
  common: {
    appName: 'EDEM',
    next: 'Continuer',
    back: 'Retour',
    letsGo: "C'est parti !",
    cancel: 'Annuler',
    save: 'Enregistrer',
    done: 'Terminé',
    close: 'Fermer',
    questions: 'questions',
    all: 'Tout',
    yes: 'Oui',
    no: 'Non',
    retry: 'Réessayer',
    change: 'Changer',
    loading: 'Chargement…',
  },

  tabs: {
    home: 'Accueil',
    path: 'Parcours',
    tutor: 'M. Thomas',
    quiz: 'Quiz',
    board: 'Classement',
    profile: 'Profil',
  },

  login: {
    title: 'Bienvenue',
    subtitle: 'Ton espace pour apprendre plus intelligemment.',
    signUpTitle: 'Créer ton compte',
    signUpSubtitle: 'Quelques secondes, et ton prof IA est à toi.',
    name: 'Prénom',
    namePlaceholder: 'Comment on t’appelle ?',
    email: 'Adresse e-mail',
    emailPlaceholder: 'exemple@email.com',
    password: 'Mot de passe',
    passwordPlaceholder: 'Ton mot de passe',
    passwordHint: 'Au moins 6 caractères.',
    submit: 'Se connecter',
    submitSignUp: 'Créer mon compte',
    forgot: 'Mot de passe oublié ?',
    noAccount: 'Tu n’as pas encore de compte ?',
    haveAccount: 'Tu as déjà un compte ?',
    create: 'Créer un compte',
    signIn: 'Se connecter',
    schoolOnly: 'Un tuteur scolaire, pensé pour les jeunes Haïtiens.',
    invalid: 'Entre ton e-mail et ton mot de passe pour continuer.',
    nameRequired: 'Dis-nous ton prénom.',
    checkEmail:
      'Compte créé ! Ouvre ta boîte mail et clique sur le lien pour confirmer, puis reviens te connecter.',
    resetSent:
      'Si un compte existe avec cet e-mail, un lien de réinitialisation vient d’être envoyé.',
    resetNeedEmail: 'Entre d’abord ton e-mail, puis touche « Mot de passe oublié ».',
  },

  sync: {
    offline: 'Hors ligne — tes progrès seront envoyés au retour du réseau.',
    syncing: 'Synchronisation…',
  },

  onboarding: {
    welcome: 'EDEM.',
    welcomeSub:
      "Ton professeur IA personnel — 100 % scolaire, 100 % pour toi. Il construit ton parcours, explique chaque notion et crée tes quiz. En français ou en créole.",
    badgeAI: 'IA scolaire',
    badgePersonal: 'Sur mesure',
    badgeBilingual: 'FR · Kreyòl',
    chooseLang: 'Choisis ta langue',
    french: 'Français',
    creole: 'Kreyòl Ayisyen',
    whatsName: "Comment tu t'appelles ?",
    namePlaceholder: 'Écris ton prénom…',
    whatsLevel: 'En quelle classe es-tu ?',
    whatsLevelSub: 'Les explications seront calibrées exactement à ton niveau',
    whatsGoal: 'Quel est ton objectif ?',
    goal_exams: "Réussir mes examens d'État",
    goal_grades: 'Améliorer mes notes',
    goal_learn: 'Découvrir de nouvelles choses',
    goal_english: 'Parler mieux anglais',
    whatsSubjects: 'Quelles matières veux-tu travailler ?',
    whatsSubjectsSub: 'Au moins 1 matière — ton parcours sera construit dessus',
    nameNeeded: 'Écris ton prénom pour continuer',
    levelNeeded: 'Choisis ta classe pour continuer',
    subjectsNeeded: 'Choisis au moins une matière',
    ready: 'Tout est prêt, {name} !',
    readySub:
      'Ton parcours personnalisé est généré. Chaque jour, M. Thomas te dira quoi étudier — et suivra ta progression pas à pas.',
    stepOf: 'ÉTAPE {n}/{total}',
    whatsSection: 'Quelle est ta série ?',
    whatsSectionSub:
      "Tu l'as choisie en entrant en NS3. Elle décide de ce que M. Thomas révise avec toi.",
    goal_catchup: 'Rattraper mon retard',
  },

  tune: {
    eyebrow: 'PERSONNALISATION',
    title: 'Personnalise ton tuteur',
    subtitle:
      "Deux minutes, et M. Thomas travaillera sur ce dont TU as besoin. Rien n'est obligatoire — tu peux tout sauter.",

    privacyTitle: 'CE QUE LES AUTRES VOIENT',
    privacyVisible:
      'Au classement, les autres élèves voient ton pseudonyme et tes XP. Rien d\'autre.',
    privacyHidden:
      'Ton école, ta commune, tes scores de quiz et tes discussions avec M. Thomas ne sont vus par personne.',
    privacyAlias:
      "Sans pseudonyme, c'est ton prénom qui s'affiche. Tu peux en choisir un dans ton profil.",

    communeTitle: 'Tu es dans quelle commune ?',
    communeWhy:
      'Sert à retrouver ton école, et plus tard ta classe. Jamais envoyé à M. Thomas.',
    departementLabel: "D'ABORD LE DÉPARTEMENT",
    communeFirst: "Choisis d'abord ta commune",

    schoolTitle: 'Quelle est ton école ?',
    schoolWhy:
      'Sert à te rattacher à ta classe quand ton professeur en ouvrira une. Jamais envoyé à M. Thomas.',
    schoolSearchPlaceholder: 'Écris le nom de ton école…',
    schoolNoResult: 'Aucune école trouvée. Tu peux l\'ajouter ci-dessous.',
    schoolMissing: "Mon école n'est pas dans la liste",
    schoolNameLabel: "Nom de l'école",
    schoolNamePlaceholder: 'Ex. Lycée Alexandre Pétion',
    schoolAdd: 'Ajouter',
    schoolTooShort: 'Écris le nom complet de ton école',
    schoolFailed: "Impossible d'ajouter l'école. Réessaie plus tard.",

    subjectsTitle: 'Quelles matières veux-tu travailler ?',
    subjectsWhy: 'Ton parcours et ton plan du jour sont construits dessus.',

    weakTitle: 'Lesquelles sont les plus difficiles ?',
    weakWhy:
      "M. Thomas y revient plus souvent et t'y propose plus de quiz. 5 au maximum.",

    goalTitle: 'Quel est ton objectif ?',
    goalWhy: "Change le ton de M. Thomas et l'ordre de ton parcours.",

    examYearTitle: 'Quel examen vises-tu ?',
    examYearWhy:
      "Sert à doser l'urgence : réviser pour juin prochain n'est pas réviser pour dans deux ans.",

    minutesTitle: 'Combien de temps par jour ?',
    minutesWhy:
      'Taille ton plan du jour. Trois notions quand tu as dix minutes, ça décourage.',
    minutes_15: '15 minutes',
    minutes_30: '30 minutes',
    minutes_60: '1 heure',
    minutes_120: '2 heures ou plus',

    finish: 'Enregistrer',
    later: 'Plus tard',
    doneTitle: 'Profil complet !',
    doneSub: 'M. Thomas te connaît maintenant. +{xp} XP pour la peine.',

    cardTitle: 'Profil complété à {pct} %',
    cardSub: 'Complète-le pour que M. Thomas travaille sur ce qu\'il te faut.',
    cardDone: 'Profil complet. M. Thomas te connaît.',
    cardOpen: 'Continuer',
  },

  teacher: {
    title: 'Je suis professeur',
    intro:
      "Un compte professeur reste ton compte d'élève : tu gardes ton profil, tes XP et M. Thomas. Le rôle ajoute le droit d'ouvrir une classe.",

    whyTitle: 'POURQUOI ON VÉRIFIE',
    whyBody:
      "Une classe met un adulte en contact avec des élèves mineurs. On lit chaque demande à la main, et on rappelle avant d'accorder le rôle. Ça prend quelques jours.",

    nameLabel: 'Ton nom complet',
    namePlaceholder: 'Prénom et nom',
    nameNeeded: 'Écris ton nom complet',

    contactLabel: 'Comment te joindre pour vérifier',
    contactPlaceholder: "Numéro professionnel, mail de l'école, ou un référent",
    contactWhy:
      "C'est la seule coordonnée que l'application demande, et elle ne sert qu'à cette vérification. Elle n'est jamais montrée aux élèves.",
    contactNeeded: 'Donne un moyen de te joindre',

    subjectsLabel: 'Les matières que tu enseignes',
    subjectsNeeded: 'Choisis au moins une matière',

    schoolLabel: 'Ton école',
    schoolFromProfile: "Reprise de ton profil. Tu peux la changer dans « Personnalisation ».",
    schoolMissing: "Choisir mon école dans mon profil",

    messageLabel: 'Un mot pour nous (facultatif)',
    messagePlaceholder: 'Ta classe, ton niveau, ce que tu veux faire avec EDEM…',

    send: 'Envoyer la demande',
    failed: "La demande n'est pas partie. Réessaie plus tard.",

    pendingTitle: 'Demande envoyée',
    pendingSub:
      "Elle est lue par un humain, pas par un robot. On te recontacte au moyen que tu as donné. En attendant, tu continues à utiliser EDEM normalement.",

    rejectedTitle: "Ta demande n'a pas été retenue",
    rejectedSub: 'Tu peux la renvoyer avec des informations plus précises.',

    alreadyTitle: 'Tu es professeur',
    alreadySub:
      "Tu peux ouvrir une classe et y inviter tes élèves. Ton compte d'élève, lui, n'a pas changé.",

    cta: 'Je suis professeur',
    ctaSub: 'Ouvrir une classe pour mes élèves',
  },

  classes: {
    title: 'Mes classes',
    joinTitle: 'Rejoindre une classe',
    joinSub:
      "Ton professeur te donne un code de 6 caractères. Il valide ensuite ton entrée : personne n'entre dans une classe sans son accord.",
    codePlaceholder: 'Ex. TVT36F',
    codeLength: 'Le code fait 6 caractères',
    join: 'Entrer',
    joined: 'Demande envoyée à {teacher} pour « {name} ». Il doit encore la valider.',
    create: 'Ouvrir une classe',
    mine: 'MES CLASSES',
    empty: "Tu n'es dans aucune classe pour l'instant. Demande son code à ton professeur.",
    waiting: 'En attente',
    membersN: '{n} élèves',
    pendingN: '{n} en attente',
    privacy:
      "Dans une classe, les autres voient ton pseudonyme, jamais ton nom. Seul ton professeur voit ton vrai prénom.",

    err_code_invalide: "Ce code ne correspond à aucune classe ouverte. Vérifie-le avec ton professeur.",
    err_trop_de_tentatives: 'Trop de tentatives. Réessaie dans une heure.',
    err_deja_membre: 'Tu es déjà dans cette classe.',
    err_deja_en_attente: 'Ta demande est déjà partie. Ton professeur doit la valider.',
    err_tu_es_le_professeur: 'C\'est ta propre classe.',
    err_classe_complete: 'Cette classe est complète.',
    err_echec: "Ça n'a pas marché. Réessaie.",
  },

  classroom: {
    title: 'Classe',
    newTitle: 'Ouvrir une classe',
    nameLabel: 'Nom de la classe',
    namePlaceholder: 'Ex. NS3 A — Mathématiques',
    nameNeeded: 'Donne un nom à ta classe',
    subjectLabel: 'La matière',
    subjectNeeded: 'Choisis une matière',
    levelLabel: 'Le niveau',
    levelNeeded: 'Choisis un niveau',
    schoolNeeded: 'Choisis ton école avant',
    schoolMissing: "Ton profil n'indique pas encore ton école. Une classe doit être rattachée à un établissement.",
    chooseSchool: 'Choisir mon école',
    create: 'Ouvrir la classe',
    failed: "La classe n'a pas pu être créée.",
    created: 'Classe ouverte',
    codeLabel: "CODE D'INVITATION",
    codeHint: "Donne ce code à tes élèves. Chacun devra quand même être validé par toi. Tu peux le changer à tout moment s'il a trop circulé.",
    backToClasses: 'Voir mes classes',

    youTeach: 'Tu es le professeur de cette classe.',
    taughtBy: 'Professeur : {name}',
    pendingYou: "Ta demande est partie. Ton professeur doit encore la valider avant que tu voies la classe.",

    focusTitle: 'CHAPITRE EN COURS',
    focusLabel: 'Sur quoi travaille la classe',
    focusPlaceholder: 'Ex. Les fonctions affines',
    noFocus: "Ton professeur n'a pas encore indiqué le chapitre en cours.",
    noteLabel: 'Précision pour M. Thomas',
    notePlaceholder: 'Ex. On utilise la notation f(x) = ax + b, pas y = mx + p',
    noteWhy:
      "Ces deux champs servent à M. Thomas : il alignera ses explications sur ton cours plutôt que sur une convention étrangère. Tes élèves ne voient que le chapitre, pas la précision.",

    codeSection: "CODE D'INVITATION",
    rotate: 'Changer le code',

    pendingSection: '{n} DEMANDE(S) EN ATTENTE',
    approve: 'Accepter',
    refuse: 'Refuser',

    membersSection: '{n} ÉLÈVE(S)',
    noMembers: "Personne n'a encore rejoint.",
    removeTitle: 'Retirer cet élève ?',
    removeBody: '{name} ne verra plus la classe et ne pourra pas y revenir avec le code.',
    remove: 'Retirer',
    privacy:
      'Les élèves se voient entre eux sous leur pseudonyme. Toi seul, comme professeur, vois leur vrai prénom.',
  },

  assignment: {
    section: 'DEVOIRS',
    add: 'Donner',
    title: 'Devoir',
    newTitle: 'Donner un devoir',
    emptyTeacher: "Aucun devoir pour l'instant.",
    emptyStudent: 'Rien à rendre pour le moment.',
    draft: 'Brouillon — la classe ne le voit pas encore',
    handedIn: '{n} remise(s)',
    todo: 'À rendre',
    done: 'Rendu',

    kind_devoir: 'Devoir',
    kind_devoir_sub: 'Un texte ou une photo du cahier',
    kind_quiz: 'Quiz',
    kind_quiz_sub: 'Chaque élève reçoit le sien',

    titleLabel: 'Titre',
    titlePlaceholder_devoir: 'Ex. Exercices 12 à 18, page 47',
    titlePlaceholder_quiz: 'Ex. Contrôle sur les fonctions',
    titleNeeded: 'Donne un titre au devoir',
    instructionsLabel: 'Consignes',
    instructionsPlaceholder: "Ce que l'élève doit faire, et comment le rendre.",

    topicsDevoir: 'Les notions travaillées',
    topicsQuiz: 'Les notions du quiz',
    topicsWhy:
      "Ce sont les notions du programme, pour la matière et le niveau de ta classe. C'est par elles que le tableau de bord te dira où en est chacun.",
    topicsNeeded: 'Choisis au moins une notion',
    difficultyLabel: 'Difficulté',
    dueLabel: 'À rendre pour',
    due_tomorrow: 'Demain',
    due_threeDays: 'Dans 3 jours',
    due_oneWeek: 'Dans une semaine',
    due_none: "Pas d'échéance",
    dueOn: 'À rendre pour le {date}',

    quizNote:
      "Chaque élève recevra SON quiz, généré sur ces notions : ce n'est pas le même questionnaire recopié. Les XP suivent le barème habituel, sans bonus.",
    saveAndPublish: 'Publier le devoir',
    saveDraft: 'Garder en brouillon',
    draftNote: "Ce devoir est encore un brouillon : tes élèves ne le voient pas.",
    publish: 'Publier maintenant',
    failed: "Ça n'a pas marché. Réessaie.",

    yourAnswer: 'TA RÉPONSE',
    redo: 'MODIFIER TA REMISE',
    answerPlaceholder: 'Écris ta réponse ici…',
    photo: 'Photo du cahier',
    gallery: 'Depuis mes images',
    submit: 'Rendre le devoir',
    submitted: 'Devoir rendu. Ton professeur le verra.',
    emptySubmission: 'Écris quelque chose ou ajoute une photo',
    alreadySubmitted: 'Tu as rendu ce devoir',
    waitingGrade: "Ton professeur ne l'a pas encore corrigé.",

    quizIntro:
      "Ce devoir est un quiz. Tu ne le joues qu'une fois : la première tentative compte.",
    startQuiz: 'Commencer le quiz',
    quizDone: 'Tu as fait ce quiz : {pct} %',
    quizOnce: 'Un devoir-quiz ne se rejoue pas.',

    submissions: '{n} REMISE(S) SUR {total}',
    toGrade: 'À corriger',
    notSubmitted: 'Pas rendu',
    seeAttachment: 'Voir la photo',
    gradeLabel: 'Note sur 100',
    feedbackLabel: 'Ton retour à l\'élève',
    feedbackPlaceholder: 'Ce qui est réussi, ce qui reste à travailler…',
    saveGrade: 'Enregistrer la note',
  },

  dashboard: {
    title: 'Tableau de bord',
    entry: 'Où en est ta classe, notion par notion',
    members: 'élèves',
    toGrade: 'à corriger',
    pending: 'en attente',
    inactive: 'inactifs 7 jours',
    byTopic: 'PAR NOTION',
    byTopicSub:
      "Calculé sur les quiz déjà joués par tes élèves. Aucune saisie de ta part : c'est mesuré, pas déclaré.",
    measured: 'mesuré sur {n} élève(s)',
    struggling: 'Sous 40 % :',
    empty:
      "Pas encore assez de quiz joués dans cette matière. Donne un quiz à ta classe : le tableau se remplira tout seul.",
    notYet: 'PAS ENCORE TRAVAILLÉ',
    notYetSub: "Aucun élève n'a encore été évalué sur ces notions.",
    privacy:
      "Tu ne vois que la matière de cette classe. Ce que tes élèves travaillent ailleurs ne te regarde pas.",
  },





  home: {
    morning: 'Bonjour',
    afternoon: 'Bon après-midi',
    evening: 'Bonsoir',
    heroEyebrow: 'Ton tuteur IA · 100% scolaire',
    heroTitle: 'Qu’est-ce qu’on\napprend aujourd’hui ?',
    askPlaceholder: 'Pose ta question de cours…',
    todayPlan: 'Plan du jour',
    todayPlanSub: 'Généré pour toi ✦',
    seePath: 'Mon parcours',
    streak: 'jours de série',
    level: 'Niveau',
    studied: 'notions',
    accuracy: 'précision',
    tipOfDay: 'Astuce du jour',
  },

  path: {
    title: 'Mon parcours',
    subtitle: 'Pour {name} · {level}',
    coachTitle: 'Ton coach',
    mastery: 'Maîtrise',
    learn: 'Comprendre',
    practice: 'Quiz éclair',
    empty: 'Choisis tes matières et ta classe pour générer ton parcours',
    emptyCta: 'Configurer mon parcours',
    tapToLearn: 'Touche une notion → M. Thomas te l’explique en direct',
    statsTitle: 'Ta progression',
    bySubject: 'Matière par matière',
    weekXp: 'Cette semaine',
    streakDays: 'Jours d’affilée',
    quizzesDone: 'Quiz faits',
  },

  update: {
    ready: 'Une mise à jour est prête',
    tap: 'Touche ici pour l’installer',
    applying: 'Redémarrage…',
  },

  history: {
    title: 'Historique des quiz',
    recent: 'Tes derniers quiz',
    seeAll: 'Voir tout',
    count: '{count} quiz passés',
    reviewTitle: 'Correction',
    correctOf: '{correct} bonnes réponses sur {total}',
    yourAnswer: 'ta réponse',
    noAnswer: 'Temps écoulé — tu n’as pas répondu.',
    emptyTitle: 'Aucun quiz pour l’instant',
    emptyBody: 'Passe ton premier quiz : tu pourras le revoir ici, avec les explications.',
    goneTitle: 'Quiz introuvable',
    goneBody: 'Ce quiz n’est plus disponible. Il a peut-être été effacé avec ta progression.',
  },

  board: {
    title: 'Classement',
    subtitle: 'Les élèves les plus assidus d’EDEM',
    yourRank: 'Ta position',
    outOf: 'sur {total} élèves classés',
    you: 'toi',
    keepGoing: 'Continue : chaque quiz et chaque notion étudiée te fait monter.',
    emptyTitle: 'Le classement est vide',
    emptyBody: 'Personne n’a encore gagné d’XP. Sois le premier : fais un quiz !',
    errorTitle: 'Classement indisponible',
    errorBody: 'Vérifie ta connexion, puis tire vers le bas pour réessayer.',
    privacy: 'Seul ton prénom ({name}) est visible. Ni e-mail, ni contact.',
  },

  chat: {
    title: 'M. Thomas',
    subtitle: 'Tuteur IA · sujets scolaires',
    greeting:
      "Bonjour ! Je suis M. Thomas, ton tuteur IA scolaire.\n\nPose-moi ta question — maths, histoire, sciences, langues… Je t'explique étape par étape, à TON niveau.",
    schoolOnly: 'Je suis spécialisé école : je garde nos discussions sur tes études 🎓',
    placeholder: 'Ta question de cours…',
    tryThese: 'Pour commencer :',
    attach: 'Joindre un fichier',
    takePhoto: 'Photographier mon devoir',
    fromGallery: 'Choisir une photo',
    chooseFile: 'Choisir un document (PDF)',
    uploading: 'Envoi en cours…',
    readyToSend: 'Prêt à envoyer',
    typing: 'M. Thomas écrit…',
    clear: 'Effacer',
    clearConfirm: 'Effacer toute la conversation ?',
    setupTitle: 'Serveur IA non configuré',
    setupBody:
      "Le tuteur fonctionne avec Claude via ton petit serveur (5 min à mettre en place).\n\n1. Ouvre le dossier server/ et suis son README\n2. Mets EXPO_PUBLIC_API_URL dans le fichier .env\n3. Relance l'app — et c'est parti ✦\n\nGuide complet : docs/IA.md",
    errorTitle: 'Impossible de joindre le serveur IA',
    errorBody: 'Vérifie ta connexion et que le serveur tourne, puis réessaie.',
    xpGained: 'notion étudiée',
    newConversation: 'Nouvelle discussion',
    history: 'Mes discussions',
    historyCount: '{count} discussions',
    historyEmptyTitle: 'Aucune discussion',
    historyEmptyBody: 'Pose ta première question à M. Thomas : tu retrouveras la discussion ici.',
    untitled: 'Nouvelle discussion',
    messageCount: '{count} messages',
    deleteConversation: 'Supprimer',
    deleteConfirm: 'Cette discussion et ses fichiers seront effacés. C’est définitif.',
  },

  quiz: {
    title: 'Quiz',
    subtitle: 'Générés par l’IA · adaptés à ton niveau',
    heroEyebrow: 'Quiz IA',
    heroTitle: 'Prouve-toi 🏆',
    heroSub: 'Chaque quiz est unique, créé pour toi par l’IA. 100 % = +20 XP de bonus.',
    chooseLevel: 'Choisis ton niveau',
    chooseSubject: 'Choisis ta matière',
    level_facile: 'Facile',
    level_moyen: 'Intermédiaire',
    level_difficile: 'Difficile',
    levelHint_facile: 'Questions directes, une seule étape. Pour réviser sereinement.',
    levelHint_moyen: 'Niveau d’un contrôle ordinaire. Deux étapes de raisonnement.',
    levelHint_difficile: 'Plusieurs notions à la fois, niveau examen d’État. Rapporte le plus d’XP.',
    difficulty: 'Niveau',
    question: 'Question',
    correct: 'Bonne réponse !',
    wrong: 'Pas tout à fait…',
    timeUp: 'Temps écoulé !',
    theAnswerWas: 'La bonne réponse : ',
    explanation: 'Explication',
    nextQuestion: 'Question suivante',
    seeResults: 'Voir mes résultats',
    results: 'Résultats',
    youScored: 'Ton score',
    perfect: 'Parfait ! +20 XP de bonus',
    xpEarned: 'XP gagnés',
    newQuiz: 'Nouveau quiz',
    otherSubject: 'Changer de matière',
    bestScore: 'Record',
    generating: 'L’IA prépare ton quiz…',
    genErrorTitle: 'Quiz indisponible',
    genErrorBody: 'L’IA n’a pas pu générer le quiz. Vérifie le serveur IA puis réessaie.',
    back: 'Retour aux matières',
    byAi: 'généré par IA',
  },

  profile: {
    tuning: 'Personnalisation',
    title: 'Profil',
    stats: 'Tes statistiques',
    xpTotal: 'XP totaux',
    studied: 'Notions étudiées',
    quizzesDone: 'Quiz terminés',
    accuracy: 'Précision',
    streak: 'Série',
    days: 'jours',
    settings: 'Réglages',
    language: 'Langue',
    theme: 'Thème',
    light: 'Clair',
    dark: 'Sombre',
    system: 'Auto',
    yourClass: 'Ta classe',
    yourGoal: 'Ton objectif',
    yourSubjects: 'Tes matières',
    goal_exams: "Réussir mes examens d'État",
    goal_grades: 'Améliorer mes notes',
    goal_learn: 'Découvrir de nouvelles choses',
    goal_english: 'Parler mieux anglais',
    about: 'À propos',
    aboutText:
      "EDEM est un tuteur IA conçu pour les élèves haïtiens : français et créole, parcours sur mesure, quiz générés à l'infini, et des conversations strictement scolaires pour rester concentré. Fait pour que chaque jeune — à Port-au-Prince, aux Cayes ou ailleurs — ait un vrai prof dans sa poche. 🇭🇹",
    madeWith: 'Fait avec ❤ pour les élèves d’Haïti',
    boardPrivacy: 'Ta place au classement',
    boardPrivacyHint: 'Le classement montre ton nom aux autres élèves. Tu décides de ce qu’ils voient.',
    boardVisible: 'Apparaître dans la liste',
    boardAlias: 'Nom affiché',
    boardAliasPlaceholder: 'Ton prénom',
    boardAliasHint: 'Laisse vide pour afficher ton prénom. De 2 à 24 caractères.',
    updates: 'Mises à jour',
    checkUpdate: 'Rechercher une mise à jour',
    updateHint: 'Touche pour vérifier maintenant',
    updateChecking: 'Recherche en cours…',
    updateDownloading: 'Téléchargement… l’app va redémarrer',
    updateNone: 'EDEM est déjà à jour ✓',
    updateUnavailable: 'Mises à jour indisponibles sur cette version.',
    channel: 'Canal',
    runtime: 'Base',
    build: 'Version installée',
    embedded: 'celle du fichier d’installation',
    signOut: 'Se déconnecter',
    signOutConfirm:
      'Tes progrès restent enregistrés sur ton compte. Tu les retrouveras à la prochaine connexion.',
    reset: 'Réinitialiser ma progression',
    resetConfirm: 'Toute ta progression (XP, maîtrise, quiz) sera effacée. Continuer ?',
    version: 'Version',
  },
};

export type Messages = typeof fr;
