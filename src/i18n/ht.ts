// ═══════════════════════════════════════════════════════════════
//  TRADIKSON — KREYÒL AYISYEN 🇭🇹
//  (fichye fr.ts la dwe gen menm kle yo egzakteman)
// ═══════════════════════════════════════════════════════════════

import type { Messages } from './fr';

export const ht: Messages = {
  common: {
    appName: 'EDEM',
    next: 'Kontinye',
    back: 'Retounen',
    letsGo: 'An n kòmanse !',
    cancel: 'Anile',
    save: 'Anrejistre',
    done: 'Fini',
    close: 'Fèmen',
    questions: 'kesyon',
    all: 'Tout',
    yes: 'Wi',
    no: 'Non',
    retry: 'Eseye ankò',
    change: 'Chanje',
    loading: 'L ap chaje…',
  },

  tabs: {
    home: 'Akèy',
    path: 'Chemen',
    tutor: 'M. Thomas',
    quiz: 'Kwiz',
    board: 'Klasman',
    profile: 'Pwofil',
  },

  login: {
    title: 'Byenveni',
    subtitle: 'Espas pa w pou aprann pi byen.',
    signUpTitle: 'Kreye kont ou',
    signUpSubtitle: 'Kèk segond, epi pwof AI ou pare.',
    name: 'Non',
    namePlaceholder: 'Kijan yo rele w?',
    email: 'Adrès imel',
    emailPlaceholder: 'egzanp@email.com',
    password: 'Modpas',
    passwordPlaceholder: 'Modpas ou',
    passwordHint: 'Omwen 6 karaktè.',
    submit: 'Konekte',
    submitSignUp: 'Kreye kont mwen',
    forgot: 'Ou bliye modpas la?',
    noAccount: 'Ou poko gen yon kont?',
    haveAccount: 'Ou gen yon kont deja?',
    create: 'Kreye yon kont',
    signIn: 'Konekte',
    schoolOnly: 'Yon pwofesè lekòl, fèt pou jèn Ayisyen yo.',
    invalid: 'Mete imel ak modpas ou pou kontinye.',
    nameRequired: 'Di nou non ou.',
    checkEmail:
      'Kont lan kreye! Louvri bwat imel ou, klike sou lyen an pou konfime, epi tounen konekte.',
    resetSent:
      'Si gen yon kont ak imel sa a, nou fèk voye yon lyen pou chanje modpas la.',
    resetNeedEmail: 'Mete imel ou anvan, apre sa peze « Ou bliye modpas la ».',
  },

  sync: {
    offline: 'Ou pa sou entènèt — pwogrè ou ap voye lè rezo a tounen.',
    syncing: 'Ap senkronize…',
  },

  onboarding: {
    welcome: 'EDEM.',
    welcomeSub:
      'Pwofesè AI pèsonèl ou — 100 % lekòl, 100 % pou ou. Li bati chemen ou, esplike chak notion, kreye kwiz ou. An franse oswa an kreyòl.',
    badgeAI: 'AI lekòl',
    badgePersonal: 'Sou mezi',
    badgeBilingual: 'FR · Kreyòl',
    chooseLang: 'Chwazi lang ou',
    french: 'Français',
    creole: 'Kreyòl Ayisyen',
    whatsName: 'Kijan yo rele ou?',
    namePlaceholder: 'Ekri non ou…',
    whatsLevel: 'Nan ki klas ou ye?',
    whatsLevelSub: 'Eksplikasyon yo ap kalkile egzakteman sou nivo w',
    whatsGoal: 'Ki objektif ou?',
    goal_exams: 'Pase egzamen eta m yo',
    goal_grades: 'Monte nòt m yo',
    goal_learn: 'Dekouvri nouvo bagay',
    goal_english: 'Pale anglè pi byen',
    whatsSubjects: 'Ki matyè ou vle travay?',
    whatsSubjectsSub: 'Omwens 1 matyè — chemen ou a ap bati sou li',
    nameNeeded: 'Ekri non ou pou w kontinye',
    levelNeeded: 'Chwazi klas ou pou w kontinye',
    subjectsNeeded: 'Chwazi omwen yon matyè',
    ready: 'Tout bagay pare, {name} !',
    readySub:
      'Chemen pèsonèl ou a pare. Chak jou, M. Thomas ap di w kisa pou w etidye — epi li swiv pwogrè w pa etap.',
    stepOf: 'ETAP {n}/{total}',
    whatsSection: 'Ki seri ou ?',
    whatsSectionSub:
      "Ou te chwazi l lè ou t ap antre nan NS3. Se li ki deside sa M. Thomas revize ak ou.",
    goal_catchup: 'Ratrape reta mwen',
  },

  tune: {
    eyebrow: 'PÈSONALIZASYON',
    title: 'Pèsonalize pwofesè ou',
    subtitle:
      'De minit, epi M. Thomas ap travay sou sa OU bezwen. Anyen pa obligatwa — ou ka sote tout.',

    privacyTitle: 'SA LÒT MOUN WÈ',
    privacyVisible:
      'Nan klasman an, lòt elèv yo wè ti non ou ak XP ou. Anyen ankò.',
    privacyHidden:
      'Lekòl ou, komin ou, nòt kwiz ou ak diskisyon ou ak M. Thomas, pèsonn pa wè yo.',
    privacyAlias:
      'Si ou pa chwazi yon ti non, se prenon ou ki parèt. Ou ka chwazi youn nan pwofil ou.',

    communeTitle: 'Nan ki komin ou ye ?',
    communeWhy:
      'Li sèvi pou jwenn lekòl ou, epi pita klas ou. Li pa janm voye bay M. Thomas.',
    departementLabel: 'DABÒ DEPATMAN AN',
    communeFirst: 'Chwazi komin ou dabò',

    schoolTitle: 'Ki lekòl ou ?',
    schoolWhy:
      'Li sèvi pou mete ou nan klas la lè pwofesè ou louvri youn. Li pa janm voye bay M. Thomas.',
    schoolSearchPlaceholder: 'Ekri non lekòl ou…',
    schoolNoResult: 'Nou pa jwenn okenn lekòl. Ou ka ajoute l anba a.',
    schoolMissing: 'Lekòl mwen pa nan lis la',
    schoolNameLabel: 'Non lekòl la',
    schoolNamePlaceholder: 'Egzanp : Lycée Alexandre Pétion',
    schoolAdd: 'Ajoute',
    schoolTooShort: 'Ekri non konplè lekòl ou',
    schoolFailed: 'Nou pa ka ajoute lekòl la. Eseye pita.',

    subjectsTitle: 'Ki matyè ou vle travay ?',
    subjectsWhy: 'Se sou yo nou bati chemen ou ak plan jounen an.',

    weakTitle: 'Kilès ki pi difisil pou ou ?',
    weakWhy:
      'M. Thomas ap tounen sou yo pi souvan epi ba ou plis kwiz. 5 omaksimòm.',

    goalTitle: 'Ki objektif ou ?',
    goalWhy: 'Li chanje jan M. Thomas pale ak lòd chemen ou.',

    examYearTitle: 'Ki egzamen w ap vize ?',
    examYearWhy:
      'Li sèvi pou konnen si sa prese : revize pou jen k ap vini an pa menm ak revize pou nan de zan.',

    minutesTitle: 'Konbyen tan chak jou ?',
    minutesWhy:
      'Li bay plan jounen an gwosè li. Twa nosyon lè ou gen dis minit, sa dekouraje.',
    minutes_15: '15 minit',
    minutes_30: '30 minit',
    minutes_60: '1 èdtan',
    minutes_120: '2 èdtan ou plis',

    finish: 'Anrejistre',
    later: 'Pita',
    doneTitle: 'Pwofil konplè !',
    doneSub: 'M. Thomas konnen ou kounye a. +{xp} XP pou sa.',

    cardTitle: 'Pwofil konplete a {pct} %',
    cardSub: 'Konplete l pou M. Thomas travay sou sa ou bezwen.',
    cardDone: 'Pwofil konplè. M. Thomas konnen ou.',
    cardOpen: 'Kontinye',
  },

  teacher: {
    title: 'Mwen se yon pwofesè',
    intro:
      'Yon kont pwofesè rete kont elèv ou : ou kenbe pwofil ou, XP ou ak M. Thomas. Wòl la ajoute dwa pou louvri yon klas.',

    whyTitle: 'POUKISA NOU VERIFYE',
    whyBody:
      'Yon klas mete yon granmoun an kontak ak elèv ki minè. Nou li chak demann ak men nou, epi nou rele anvan nou bay wòl la. Sa pran kèk jou.',

    nameLabel: 'Non konplè ou',
    namePlaceholder: 'Prenon ak siyati',
    nameNeeded: 'Ekri non konplè ou',

    contactLabel: 'Kijan pou nou jwenn ou pou verifye',
    contactPlaceholder: 'Nimewo pwofesyonèl, imèl lekòl la, oswa yon referan',
    contactWhy:
      'Se sèl kowòdone aplikasyon an mande, epi li sèvi sèlman pou verifikasyon sa a. Elèv yo pa janm wè l.',
    contactNeeded: 'Bay yon fason pou nou jwenn ou',

    subjectsLabel: 'Matyè ou anseye',
    subjectsNeeded: 'Chwazi omwen yon matyè',

    schoolLabel: 'Lekòl ou',
    schoolFromProfile: 'Nou pran l nan pwofil ou. Ou ka chanje l nan « Pèsonalizasyon ».',
    schoolMissing: 'Chwazi lekòl mwen nan pwofil mwen',

    messageLabel: 'Yon mo pou nou (si ou vle)',
    messagePlaceholder: 'Klas ou, nivo a, sa ou vle fè ak EDEM…',

    send: 'Voye demann lan',
    failed: 'Demann lan pa pati. Eseye pita.',

    pendingTitle: 'Demann voye',
    pendingSub:
      'Se yon moun ki li l, pa yon robo. N ap kontakte ou nan fason ou te bay la. Pandan tan an, ou kontinye sèvi ak EDEM nòmalman.',

    rejectedTitle: 'Nou pa t kenbe demann ou',
    rejectedSub: 'Ou ka voye l ankò ak enfòmasyon pi klè.',

    alreadyTitle: 'Ou se yon pwofesè',
    alreadySub:
      'Ou ka louvri yon klas epi envite elèv ou yo. Kont elèv ou a pa chanje.',

    cta: 'Mwen se yon pwofesè',
    ctaSub: 'Louvri yon klas pou elèv mwen yo',
  },

  classes: {
    title: 'Klas mwen yo',
    joinTitle: 'Antre nan yon klas',
    joinSub:
      'Pwofesè ou ba ou yon kòd 6 karaktè. Apre sa li valide antre ou : pèsonn pa antre nan yon klas san akò li.',
    codePlaceholder: 'Egz. TVT36F',
    codeLength: 'Kòd la gen 6 karaktè',
    join: 'Antre',
    joined: 'Demann voye bay {teacher} pou « {name} ». Li dwe valide l toujou.',
    create: 'Louvri yon klas',
    mine: 'KLAS MWEN YO',
    empty: 'Ou pa nan okenn klas pou kounye a. Mande pwofesè ou kòd li.',
    waiting: 'N ap tann',
    membersN: '{n} elèv',
    pendingN: '{n} k ap tann',
    privacy:
      'Nan yon klas, lòt moun wè non jwèt ou, pa non ou. Se sèlman pwofesè ou ki wè vre prenon ou.',

    err_code_invalide: 'Kòd sa a pa koresponn ak okenn klas ki louvri. Verifye l ak pwofesè ou.',
    err_trop_de_tentatives: 'Twòp eseye. Eseye ankò nan yon èdtan.',
    err_deja_membre: 'Ou deja nan klas sa a.',
    err_deja_en_attente: 'Demann ou deja pati. Pwofesè ou dwe valide l.',
    err_tu_es_le_professeur: 'Se pwòp klas ou.',
    err_classe_complete: 'Klas sa a konplè.',
    err_echec: 'Sa pa mache. Eseye ankò.',
  },

  classroom: {
    title: 'Klas',
    newTitle: 'Louvri yon klas',
    nameLabel: 'Non klas la',
    namePlaceholder: 'Egz. NS3 A — Matematik',
    nameNeeded: 'Bay klas ou a yon non',
    subjectLabel: 'Matyè a',
    subjectNeeded: 'Chwazi yon matyè',
    levelLabel: 'Nivo a',
    levelNeeded: 'Chwazi yon nivo',
    schoolNeeded: 'Chwazi lekòl ou anvan',
    schoolMissing: 'Pwofil ou poko di ki lekòl ou. Yon klas dwe mare ak yon etablisman.',
    chooseSchool: 'Chwazi lekòl mwen',
    create: 'Louvri klas la',
    failed: 'Nou pa t ka kreye klas la.',
    created: 'Klas louvri',
    codeLabel: 'KÒD ENVITASYON',
    codeHint: 'Bay elèv ou yo kòd sa a. Chak moun ap toujou bezwen ou valide l. Ou ka chanje l nenpòt kilè si l twò gaye.',
    backToClasses: 'Wè klas mwen yo',

    youTeach: 'Se ou ki pwofesè klas sa a.',
    taughtBy: 'Pwofesè : {name}',
    pendingYou: 'Demann ou pati. Pwofesè ou dwe valide l anvan ou wè klas la.',

    focusTitle: 'CHAPIT K AP FÈT',
    focusLabel: 'Sou kisa klas la ap travay',
    focusPlaceholder: 'Egz. Fonksyon afin yo',
    noFocus: 'Pwofesè ou poko di ki chapit k ap fèt.',
    noteLabel: 'Presizyon pou M. Thomas',
    notePlaceholder: 'Egz. Nou sèvi ak notasyon f(x) = ax + b, pa y = mx + p',
    noteWhy:
      'De chan sa yo sèvi M. Thomas : l ap kadre esplikasyon l sou kou ou olye sou yon konvansyon etranje. Elèv ou yo wè chapit la sèlman, pa presizyon an.',

    codeSection: 'KÒD ENVITASYON',
    rotate: 'Chanje kòd la',

    pendingSection: '{n} DEMANN K AP TANN',
    approve: 'Aksepte',
    refuse: 'Refize',

    membersSection: '{n} ELÈV',
    noMembers: 'Pèsonn poko antre.',
    removeTitle: 'Retire elèv sa a ?',
    removeBody: '{name} p ap wè klas la ankò e li p ap ka retounen ak kòd la.',
    remove: 'Retire',
    privacy:
      'Elèv yo wè youn lòt sou non jwèt yo. Se ou menm sèl, kòm pwofesè, ki wè vre prenon yo.',
  },




  home: {
    morning: 'Bonjou',
    afternoon: 'Bon apremidi',
    evening: 'Bonswa',
    heroEyebrow: 'Pwofesè AI ou · 100% lekòl',
    heroTitle: 'Kisa n ap aprann\njodi a?',
    askPlaceholder: 'Poze kesyon lekòl ou…',
    todayPlan: 'Plan jodi a',
    todayPlanSub: 'Li jenere pou ou ✦',
    seePath: 'Chemen mwen',
    streak: 'jou deye',
    level: 'Nivo',
    studied: 'notion',
    accuracy: 'presizyon',
    tipOfDay: 'Konsèy jodi a',
  },

  path: {
    title: 'Chemen mwen',
    subtitle: 'Pou {name} · {level}',
    coachTitle: 'Pwofesè ou',
    mastery: 'Metriz',
    learn: 'Konprann',
    practice: 'Kwiz rapid',
    empty: 'Chwazi matyè ou yo ak klas ou pou n jenere chemen ou',
    emptyCta: 'Mete chemen mwen an sou pye',
    tapToLearn: 'Peze yon notion → M. Thomas esplike w li tousuit',
    statsTitle: 'Pwogrè ou',
    bySubject: 'Matyè pa matyè',
    weekXp: 'Semèn sa a',
    streakDays: 'Jou youn dèyè lòt',
    quizzesDone: 'Kwiz ou fè',
  },

  update: {
    ready: 'Gen yon mizajou ki pare',
    tap: 'Peze la a pou enstale l',
    applying: 'Ap rekòmanse…',
  },

  history: {
    title: 'Istorik kwiz yo',
    recent: 'Dènye kwiz ou yo',
    seeAll: 'Wè tout',
    count: '{count} kwiz ou fè',
    reviewTitle: 'Koreksyon',
    correctOf: '{correct} bon repons sou {total}',
    yourAnswer: 'repons ou',
    noAnswer: 'Tan an fini — ou pa reponn.',
    emptyTitle: 'Poko gen kwiz',
    emptyBody: 'Fè premye kwiz ou : w ap ka tounen gade l isit la, ak esplikasyon yo.',
    goneTitle: 'Nou pa jwenn kwiz la',
    goneBody: 'Kwiz sa a pa disponib ankò. Petèt li efase ak pwogrè ou.',
  },

  board: {
    title: 'Klasman',
    subtitle: 'Elèv ki pi asidi nan EDEM',
    yourRank: 'Pozisyon ou',
    outOf: 'sou {total} elèv klase',
    you: 'ou',
    keepGoing: 'Kontinye : chak kwiz ak chak notion ou etidye fè w monte.',
    emptyTitle: 'Klasman an vid',
    emptyBody: 'Pèsonn poko genyen pwen. Se ou ki premye : fè yon kwiz !',
    errorTitle: 'Klasman an pa disponib',
    errorBody: 'Tcheke koneksyon ou, apre rale desann pou eseye ankò.',
    privacy: 'Se sèlman non ou ({name}) ki parèt. Ni imel, ni kontak.',
  },

  chat: {
    title: 'M. Thomas',
    subtitle: 'Pwofesè AI · sije lekòl',
    greeting:
      'Bonjou! Mwen se M. Thomas, pwofesè AI lekòl ou.\n\nPoze m kesyon ou — matematik, istwa, syans, lang… M ap esplike w li pa etap, sou NIVO PA W.',
    schoolOnly: 'Mwen mete tout sou lekòl: diskisyon nou yo rete sou etid ou 🎓',
    placeholder: 'Kesyon lekòl ou…',
    tryThese: 'Pou kòmanse:',
    attach: 'Mete yon fichye',
    takePhoto: 'Pran foto devwa mwen',
    fromGallery: 'Chwazi yon foto',
    chooseFile: 'Chwazi yon dokiman (PDF)',
    uploading: 'K ap voye…',
    readyToSend: 'Pare pou voye',
    typing: 'M. Thomas ap ekri…',
    clear: 'Efase',
    clearConfirm: 'Efase tout konvèsasyon an?',
    setupTitle: 'Sèvè AI a poko konfigire',
    setupBody:
      'Pwofesè a mache ak Claude atravè ti sèvè ou a (5 minit pou mete l sou pye).\n\n1. Louvri katab server/ la epi swiv README li a\n2. Mete EXPO_PUBLIC_API_URL nan fichye .env lan\n3. Rekòmanse app lan — epi an n ale ✦\n\nGid konplè: docs/IA.md',
    errorTitle: 'Nou pa ka kontakte sèvè AI a',
    errorBody: 'Verifye koneksyon ou ak si sèvè a ap travay, apre eseye ankò.',
    xpGained: 'notion etidye',
    newConversation: 'Nouvo diskisyon',
    history: 'Diskisyon mwen yo',
    historyCount: '{count} diskisyon',
    historyEmptyTitle: 'Pa gen diskisyon',
    historyEmptyBody: 'Poze premye kesyon ou bay M. Thomas : w ap jwenn diskisyon an isit la.',
    untitled: 'Nouvo diskisyon',
    messageCount: '{count} mesaj',
    deleteConversation: 'Efase',
    deleteConfirm: 'Diskisyon sa a ak fichye li yo ap efase. Se definitif.',
  },

  quiz: {
    title: 'Kwiz',
    subtitle: 'AI a jenere yo · li adapte ak nivo w',
    heroEyebrow: 'Kwiz AI',
    heroTitle: 'Montre m 🏆',
    heroSub: 'Chak kwiz inik, AI a kreye l pou ou. 100 % = +20 pwen anplis.',
    chooseLevel: 'Chwazi nivo ou',
    chooseSubject: 'Chwazi matyè ou',
    level_facile: 'Fasil',
    level_moyen: 'Mwayen',
    level_difficile: 'Difisil',
    levelHint_facile: 'Kesyon dirèk, yon sèl etap. Pou revize trankil.',
    levelHint_moyen: 'Nivo yon kontwòl òdinè. De etap rezònman.',
    levelHint_difficile: 'Plizyè notion ansanm, nivo egzamen eta. Li bay plis pwen.',
    difficulty: 'Nivo',
    question: 'Kesyon',
    correct: 'Bon repons !',
    wrong: 'Pa sa non…',
    timeUp: 'Tan an fini !',
    theAnswerWas: 'Bon repons lan: ',
    explanation: 'Eksplikasyon',
    nextQuestion: 'Kesyon swivan',
    seeResults: 'Wè rezilta m',
    results: 'Rezilta',
    youScored: 'Nòt ou',
    perfect: 'Pafè ! +20 pwen anplis',
    xpEarned: 'Pwen ou genyen',
    newQuiz: 'Nouvo kwiz',
    otherSubject: 'Chwazi yon lòt matyè',
    bestScore: 'Rekò',
    generating: 'AI a ap pare kwiz ou a…',
    genErrorTitle: 'Kwiz la pa disponib',
    genErrorBody: 'AI a pa t ka jenere kwiz la. Verifye sèvè AI a, apre eseye ankò.',
    back: 'Retounen nan matyè yo',
    byAi: 'AI a jenere l',
  },

  profile: {
    tuning: 'Pèsonalizasyon',
    title: 'Pwofil',
    stats: 'Estatistik ou yo',
    xpTotal: 'Total pwen',
    studied: 'Notion w etidye',
    quizzesDone: 'Kwiz ou fè',
    accuracy: 'Presizyon',
    streak: 'Seri',
    days: 'jou',
    settings: 'Anviwònman',
    language: 'Lang',
    theme: 'Tèm',
    light: 'Kle',
    dark: 'Fonse',
    system: 'Oto',
    yourClass: 'Klas ou',
    yourGoal: 'Objektif ou',
    yourSubjects: 'Matyè w yo',
    goal_exams: 'Pase egzamen eta m yo',
    goal_grades: 'Monte nòt m yo',
    goal_learn: 'Dekouvri nouvo bagay',
    goal_english: 'Pale anglè pi byen',
    about: 'Konsènan',
    aboutText:
      'EDEM se yon pwofesè AI li fèt pou elèv ayisyen: franse ak kreyòl, chemen sou mezi, kwiz san limit, konvèsasyon ki rete sou sije lekòl pou w rete konsantre. Li fèt pou chak jenn — Pòtoprens, Okay, oswa kèlkeswa kote — gen yon vrè pwof nan poch li. 🇭🇹',
    madeWith: 'Yo fè l ak ❤ pou elèv Ayiti',
    boardPrivacy: 'Plas ou nan klasman an',
    boardPrivacyHint: 'Klasman an montre non ou bay lòt elèv yo. Se ou ki deside sa yo wè.',
    boardVisible: 'Parèt nan lis la',
    boardAlias: 'Non yo afiche',
    boardAliasPlaceholder: 'Ti non ou',
    boardAliasHint: 'Kite l vid pou montre ti non ou. Ant 2 ak 24 karaktè.',
    updates: 'Mizajou',
    checkUpdate: 'Chèche yon mizajou',
    updateHint: 'Peze pou tcheke kounye a',
    updateChecking: 'N ap chèche…',
    updateDownloading: 'N ap telechaje… app la ap rekòmanse',
    updateNone: 'EDEM deja ajou ✓',
    updateUnavailable: 'Mizajou pa disponib sou vèsyon sa a.',
    channel: 'Kanal',
    runtime: 'Baz',
    build: 'Vèsyon ki enstale',
    embedded: 'sa ki nan fichye enstalasyon an',
    signOut: 'Dekonekte',
    signOutConfirm:
      'Pwogrè ou yo rete anrejistre sou kont ou. W ap jwenn yo lè w konekte ankò.',
    reset: 'Efase pwogrè m',
    resetConfirm: 'Tout pwogrè w (pwen, metriz, kwiz) ap disparèt. Kontinye?',
    version: 'Vèsyon',
  },
};
