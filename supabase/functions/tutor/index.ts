// ═══════════════════════════════════════════════════════════════
//  EDEM — Edge Function « tutor »
//
//  La clé API vit ici, côté serveur, jamais dans l'APK.
//  Protégée par JWT : seul un élève connecté peut appeler l'IA.
//
//  POST { action: "chat", system, messages, attachment? }
//        → { reply, topic }
//  POST { action: "quiz", prompt, subjectId, difficulty }
//        → { questions: [...] }
//
//  Le moteur est Gemini (Google). Le modèle n'est pas fixe : il
//  est choisi question par question (section CHOIX DU MODÈLE
//  plus bas). Une date d'histoire part sur le modèle le plus
//  rapide, une équation sur celui qui sait raisonner.
// ═══════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@^2.112.4";
import { TEACHING_METHOD, quizGuidance, type Performance } from "./teaching.ts";
// ═══════════════════════════════════════════════════════════════
//  ACCÈS À GEMINI
//
//  On parle à l'API REST directement, sans SDK. Deux raisons :
//  un isolat Edge démarre plus vite sans dépendance à télécharger,
//  et la forme des requêtes reste visible ici, sans couche qui
//  la traduit dans notre dos.
//
//  Doc : https://ai.google.dev/api/generate-content
// ═══════════════════════════════════════════════════════════════

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/** Une part de contenu : du texte, une image ou un PDF. */
type Part =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

interface Turn {
  /** Gemini ne connaît que « user » et « model » (pas « assistant »). */
  role: "user" | "model";
  parts: Part[];
}

/**
 * Effort de réflexion.
 *
 * C'est le levier de vitesse le plus direct : chaque niveau
 * au-dessus ajoute des jetons de raisonnement que l'élève attend
 * sans rien voir à l'écran.
 *
 *   minimal  récupération de fait, classement
 *   low      explication guidée
 *   medium   raisonnement en plusieurs étapes
 *   high     problème difficile
 *
 * `null` = ne rien envoyer, et laisser le défaut du modèle. C'est
 * ce qu'on veut sur les modèles dont la réflexion est déjà coupée
 * par défaut (gemini-2.5-flash-lite) : envoyer un niveau ne ferait
 * que la RALLUMER.
 */
type Thinking = "minimal" | "low" | "medium" | "high" | null;

interface GenerateOptions {
  model: string;
  system?: string;
  contents: Turn[];
  maxOutputTokens: number;
  temperature?: number;
  thinking?: Thinking;
  /** Schéma JSON imposé à la réponse (quiz). Absent = texte libre. */
  schema?: Record<string, unknown>;
}

/**
 * Filtres de sécurité.
 *
 * Réglés sur « ne bloquer que le plus grave », volontairement.
 * Le programme haïtien passe par l'esclavage, la révolution de
 * 1804 et les massacres coloniaux ; en réglage standard, Gemini
 * refuse une partie de ces questions d'histoire pourtant
 * parfaitement scolaires. Le cadre scolaire est déjà posé par le
 * prompt système, qui refuse tout ce qui sort de l'école.
 */
const SAFETY = [
  "HARM_CATEGORY_HARASSMENT",
  "HARM_CATEGORY_HATE_SPEECH",
  "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  "HARM_CATEGORY_DANGEROUS_CONTENT",
].map((category) => ({ category, threshold: "BLOCK_ONLY_HIGH" }));

class GeminiError extends Error {}

function buildBody(o: GenerateOptions): Record<string, unknown> {
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: o.maxOutputTokens,
    temperature: o.temperature ?? 0.7,
  };

  if (o.thinking) {
    generationConfig.thinkingConfig = { thinkingLevel: o.thinking };
  }
  if (o.schema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = o.schema;
  }

  const body: Record<string, unknown> = {
    contents: o.contents,
    generationConfig,
    safetySettings: SAFETY,
  };

  if (o.system) {
    body.systemInstruction = { parts: [{ text: o.system }] };
  }
  return body;
}

/** Rassemble les morceaux de texte de la réponse. */
// deno-lint-ignore no-explicit-any
function textOf(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p: { text?: string }) => typeof p.text === "string")
    .map((p: { text: string }) => p.text)
    .join("")
    .trim();
}

/**
 * Appelle Gemini et renvoie le texte produit.
 *
 * Le repli sans `thinkingConfig` n'est pas de la superstition :
 * les niveaux acceptés varient d'un modèle à l'autre (certains
 * refusent « minimal », d'autres n'acceptent aucun réglage), et
 * les modèles sont réglables par variable d'environnement. Plutôt
 * que de priver l'élève de sa réponse pour un paramètre de
 * confort, on réessaie sans lui.
 */
async function generate(o: GenerateOptions): Promise<string> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) {
    throw new GeminiError(
      "GEMINI_API_KEY manquante côté serveur (secret Supabase).",
    );
  }

  const url = `${ENDPOINT}/${o.model}:generateContent`;
  const headers = {
    "Content-Type": "application/json",
    "x-goog-api-key": key,
  };

  const send = (body: Record<string, unknown>) =>
    fetch(url, { method: "POST", headers, body: JSON.stringify(body) });

  let response = await send(buildBody(o));

  if (response.status === 400 && o.thinking) {
    const detail = await response.text();
    if (/thinking/i.test(detail)) {
      console.warn(`thinkingLevel refusé par ${o.model}, second essai sans.`);
      response = await send(buildBody({ ...o, thinking: null }));
    } else {
      throw new GeminiError(shortenApiError(detail));
    }
  }

  if (!response.ok) {
    throw new GeminiError(shortenApiError(await response.text()));
  }

  const data = await response.json();

  // Un blocage arrive AVANT toute génération : le texte est vide et
  // la seule trace est ici. Sans ce test, l'élève verrait une
  // réponse vide sans savoir pourquoi.
  const blocked = data?.promptFeedback?.blockReason;
  if (blocked) {
    throw new GeminiError(
      `Question refusée par le filtre de sécurité (${blocked}).`,
    );
  }

  const text = textOf(data);
  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason ?? "inconnue";
    // MAX_TOKENS mérite son propre message : ce n'est pas une panne,
    // c'est une réponse coupée trop tôt.
    throw new GeminiError(
      reason === "MAX_TOKENS"
        ? "Réponse trop longue, elle a été coupée. Repose la question en plus court."
        : `Réponse vide du modèle (${reason}).`,
    );
  }
  return text;
}

/** Extrait le message utile d'une erreur de l'API, sans le pavé JSON. */
function shortenApiError(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    const message = parsed?.error?.message;
    if (typeof message === "string") return message.slice(0, 300);
  } catch {
    // pas du JSON : on retombe sur le brut
  }
  return raw.slice(0, 300);
}

// ═══════════════════════════════════════════════════════════════
//  CHOIX DU MODÈLE
//
//  Toutes les questions ne se valent pas. « Qui a proclamé
//  l'indépendance ? » se répond de mémoire ; « résous 2x + 3 = 9
//  et vérifie » demande un raisonnement suivi.
//
//  Envoyer les deux au même modèle, c'est choisir entre payer
//  trop cher la première ou bâcler la seconde. On regarde donc de
//  quoi il s'agit AVANT de choisir.
//
//  Les trois modèles sont réglables par variable d'environnement :
//  Google fait évoluer sa gamme vite, et on ne veut pas
//  redéployer du code pour changer un nom de modèle.
// ═══════════════════════════════════════════════════════════════


/**
 * RAPIDE — le cheval de trait.
 *
 * gemini-2.5-flash-lite : le moins cher du catalogue
 * (0,10 $ / 0,40 $ le million de jetons) et, surtout, sa réflexion
 * est COUPÉE par défaut. C'est ce qui rend la réponse quasi
 * immédiate. On ne lui envoie donc jamais de `thinkingLevel` :
 * ce serait la rallumer et perdre l'intérêt.
 */
const FAST = Deno.env.get("GEMINI_MODEL_FAST") ?? "gemini-2.5-flash-lite";

/**
 * RAISONNEMENT — maths, sciences, et lecture des photos de devoirs.
 *
 * gemini-3.5-flash-lite : 0,30 $ / 2,50 $. Trois fois le prix du
 * précédent, mais il tient un calcul en plusieurs étapes et lit
 * une écriture manuscrite sur une photo — ce que le rapide rate.
 */
const REASON = Deno.env.get("GEMINI_MODEL_REASON") ?? "gemini-3.5-flash-lite";

/**
 * QUIZ — dix questions cohérentes, avec distracteurs crédibles.
 *
 * C'est la tâche la plus exigeante de l'app : il faut tenir un
 * schéma JSON strict sur dix questions sans se répéter. L'élève
 * attend devant un écran de chargement, donc on ne monte pas
 * au-delà de `medium`.
 */
const QUIZ = Deno.env.get("GEMINI_MODEL_QUIZ") ?? "gemini-3.5-flash-lite";

interface Route {
  model: string;
  thinking: Thinking;
  /** Pour les journaux : pourquoi ce modèle a été choisi. */
  why: string;
}

/** Matières où le raisonnement est la règle, pas l'exception. */
const REASONING_SUBJECTS = new Set(["math", "physique", "chimie"]);

/**
 * Indices qu'une question demande de CALCULER ou de DÉMONTRER,
 * et pas seulement de restituer.
 *
 * Écrit sans accents obligatoires (`equation` comme `équation`) :
 * un élève tape vite, souvent sans accents, parfois en créole.
 */
const REASONING_HINTS = new RegExp(
  [
    // symboles de calcul
    "[0-9]\\s*[+\\-*/=^]",
    "\\d+\\s*/\\s*\\d+",
    "=",
    // français
    "calcul", "r[ée]sou", "r[ée]sol", "[ée]quation", "in[ée]quation",
    "fraction", "pourcentage", "proportion", "d[ée]riv", "int[ée]gral",
    "th[ée]or[èe]me", "pythagore", "thal[èe]s", "trigonom",
    "vitesse", "acc[ée]l[ée]r", "[ée]nergie", "\\bforce\\b", "puissance",
    "\\bmole\\b", "molaire", "concentration", "[ée]quilibr",
    "probabilit", "statistiq", "moyenne", "m[ée]diane",
    "g[ée]om[ée]tri", "\\baire\\b", "p[ée]rim[èe]tre", "\\bvolume\\b",
    "\\bangle\\b", "triangle", "cercle", "fonction", "graphique",
    "d[ée]montr", "prouve", "justifi",
    // créole
    "kalkil", "rezoud", "ekwasyon", "fraksyon", "pousantaj",
    "vitès", "en[èe]ji", "\\bf[òo]s\\b", "jeyometri",
  ].join("|"),
  "i",
);

/**
 * Choisit le modèle pour une question du tuteur.
 *
 * Trois cas, dans cet ordre :
 *
 * 1. Une pièce jointe → toujours le modèle de raisonnement. Lire
 *    une photo de cahier, déchiffrer une écriture d'enfant et
 *    comprendre l'exercice est la tâche la plus dure qu'on lui
 *    demande — le modèle rapide s'y trompe.
 * 2. Une matière de calcul → raisonnement, sans discuter.
 * 3. Sinon on lit la question elle-même. Un « explique-moi les
 *    fractions » en cours de français reste une question de calcul.
 */
function routeChat(
  question: string,
  subject: string | undefined,
  hasAttachment: boolean,
): Route {
  if (hasAttachment) {
    return { model: REASON, thinking: "low", why: "piece-jointe" };
  }
  if (subject && REASONING_SUBJECTS.has(subject)) {
    return { model: REASON, thinking: "low", why: `matiere:${subject}` };
  }
  if (REASONING_HINTS.test(question)) {
    return { model: REASON, thinking: "low", why: "question-calcul" };
  }
  // Définition, date, vocabulaire, conjugaison, encouragement…
  // Rien à dérouler : le plus rapide fait aussi bien.
  return { model: FAST, thinking: null, why: "question-simple" };
}

/** Le quiz a toujours le même besoin : de la rigueur, pas de la vitesse. */
function routeQuiz(): Route {
  return { model: QUIZ, thinking: "medium", why: "quiz" };
}



const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// Formats que Gemini sait lire en vision. Le HEIC de l'iPhone n'en
// fait pas partie : l'app le convertit en JPEG avant l'envoi.
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const PDF_TYPE = "application/pdf";

// Au-delà, l'appel échouerait : mieux vaut un message clair.
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

// ═══════════════════════════════════════════════════════════════
//  Le sujet de la conversation
//
//  L'app se sert de la notion traitée pour faire progresser la
//  maîtrise de l'élève. Il faut donc la récupérer À CÔTÉ de la
//  réponse.
//
//  On l'a d'abord demandée en JSON structuré. Mauvaise idée ici :
//  les réponses sont bourrées de LaTeX, et chaque \frac{}{} doit
//  alors être ré-échappé en \\frac — plus de jetons, plus lent, et
//  une occasion de plus de casser l'affichage des fractions.
//
//  On demande donc du TEXTE BRUT, avec la notion sur la première
//  ligne, qu'on retire avant de renvoyer la réponse.
// ═══════════════════════════════════════════════════════════════

const TOPIC_PROTOCOL = `
═══ PREMIÈRE LIGNE DE TA RÉPONSE (obligatoire) ═══

Commence TOUJOURS par une ligne de la forme :

#NOTION: nom-de-la-notion

en minuscules, avec des tirets à la place des espaces
(ex : #NOTION: les-fractions, #NOTION: la-revolution-haitienne).
Si aucune notion scolaire précise n'est en jeu, écris
#NOTION: aucune

Passe ensuite une ligne vide, puis écris ta réponse à l'élève.
Cette première ligne est retirée avant affichage : elle ne
s'adresse pas à l'élève, ne la commente jamais.`;

/** Sépare la notion de la réponse. Tolère l'absence de marqueur. */
function splitTopic(raw: string): { reply: string; topic: string | null } {
  const match = raw.match(/^\s*#\s*NOTION\s*:\s*([^\n]*)\n?/i);
  if (!match) return { reply: raw.trim(), topic: null };

  const slug = match[1]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9à-ÿ\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);

  const reply = raw.slice(match[0].length).trim();

  // Un modèle qui n'écrit QUE le marqueur n'a rien dit à l'élève :
  // mieux vaut alors renvoyer le brut que du vide.
  if (!reply) return { reply: raw.trim(), topic: null };

  return {
    reply,
    topic: !slug || slug === "aucune" || slug === "none" ? null : slug,
  };
}

// ── Schéma du quiz ────────────────────────────────────────────
// Le quiz, lui, GARDE le JSON structuré : dix questions avec leurs
// options et leurs explications, c'est exactement le cas où
// deviner la structure dans du texte libre serait fragile.

const QUIZ_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          choices: {
            type: "array",
            items: { type: "string" },
            description:
              "Exactement 4 propositions, une seule correcte, les trois autres plausibles.",
          },
          answer: {
            type: "integer",
            description:
              "Index de la bonne réponse dans « choices » : 0, 1, 2 ou 3.",
          },
          explanation: {
            type: "string",
            description: "Explication pédagogique courte de la bonne réponse.",
          },
          topic: {
            type: "string",
            description:
              "La notion évaluée, en minuscules avec des tirets (ex: les-fractions).",
          },
        },
        required: ["question", "choices", "answer", "explanation", "topic"],
      },
    },
  },
  required: ["questions"],
} as const;

// ═══════════════════════════════════════════════════════════════
//  Identité de l'appelant
// ═══════════════════════════════════════════════════════════════

/** Client agissant AU NOM de l'élève : les règles RLS s'appliquent. */
function userClient(req: Request) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    },
  );
}

async function getUserId(req: Request): Promise<string | null> {
  const { data } = await userClient(req).auth.getUser();
  return data?.user?.id ?? null;
}

// ═══════════════════════════════════════════════════════════════
//  Quiz : position de la bonne réponse
// ═══════════════════════════════════════════════════════════════

interface RawQuestion {
  question: string;
  choices: string[];
  answer: number;
  explanation?: string;
  topic?: string;
}

/**
 * Remélange les options d'une question.
 *
 * Les modèles de langue placent presque toujours la bonne réponse
 * en première ou deuxième position — un élève finit par le
 * remarquer et répond sans réfléchir. Le demander dans le prompt
 * ne suffit pas : ce biais résiste aux consignes.
 *
 * On mélange donc nous-mêmes. C'est la seule façon d'obtenir une
 * répartition réellement imprévisible sur les quatre positions.
 *
 * On permute des INDICES, pas les textes : deux options au libellé
 * identique ne pourraient pas être distinguées autrement, et la
 * bonne réponse serait perdue.
 */
function shuffleChoices(q: RawQuestion): RawQuestion {
  const order = q.choices.map((_, i) => i);

  // Fisher-Yates : chaque permutation est équiprobable.
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  return {
    ...q,
    choices: order.map((i) => q.choices[i]),
    answer: order.indexOf(q.answer),
  };
}

/** Une question exploitable : 4 options distinctes, index valide. */
function isSound(q: RawQuestion): boolean {
  if (!q || typeof q.question !== "string" || q.question.trim() === "") return false;
  if (!Array.isArray(q.choices) || q.choices.length !== 4) return false;
  if (q.choices.some((c) => typeof c !== "string" || c.trim() === "")) return false;
  if (new Set(q.choices.map((c) => c.trim().toLowerCase())).size !== 4) return false;
  return Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4;
}

/**
 * Ce que l'élève a réellement réussi dans cette matière.
 * Sert à calibrer la difficulté du prochain quiz.
 */
async function readPerformance(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  subject: string,
): Promise<Performance> {
  const [scores, mastery] = await Promise.all([
    supabase
      .from("quiz_results")
      .select("score_pct")
      .eq("user_id", userId)
      .eq("subject_id", subject)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("topic_mastery")
      .select("mastery")
      .eq("user_id", userId)
      .eq("subject_id", subject),
  ]);

  const s: number[] = (scores.data ?? []).map((r: { score_pct: number }) => r.score_pct);
  const m: number[] = (mastery.data ?? []).map((r: { mastery: number }) => r.mastery);

  const avg = (xs: number[]) =>
    xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

  return {
    averageScore: s.length > 0 ? avg(s) : null,
    quizCount: s.length,
    averageMastery: avg(m),
  };
}

// ═══════════════════════════════════════════════════════════════
//  Pièce jointe : lecture sécurisée depuis le stockage privé
// ═══════════════════════════════════════════════════════════════

function toBase64(bytes: Uint8Array): string {
  // On encode par tranches : passer un très gros tableau d'un coup
  // à String.fromCharCode fait sauter la pile d'appels.
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Récupère la pièce jointe et la transforme en part Gemini.
 *
 * Sécurité : le chemin DOIT commencer par l'identifiant de
 * l'élève qui appelle. Sans cette vérification, un élève
 * pourrait demander à la fonction de lire le fichier d'un autre —
 * la fonction lit avec la clé de service, qui ignore les règles RLS.
 */
async function buildAttachmentPart(
  attachment: { path: string; type: string },
  userId: string,
): Promise<Part> {
  const { path, type } = attachment;

  if (typeof path !== "string" || !path.startsWith(`${userId}/`)) {
    throw new Error("Fichier refusé : il n'appartient pas à cet élève.");
  }

  if (!IMAGE_TYPES.includes(type) && type !== PDF_TYPE) {
    throw new Error(`Format non pris en charge : ${type}`);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await admin.storage.from("attachments").download(path);
  if (error || !data) {
    throw new Error("Fichier introuvable.");
  }

  const buffer = new Uint8Array(await data.arrayBuffer());
  if (buffer.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new Error("Fichier trop lourd (5 Mo maximum).");
  }

  return { inline_data: { mime_type: type, data: toBase64(buffer) } };
}

// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  if (!Deno.env.get("GEMINI_API_KEY")) {
    return json(
      { error: "GEMINI_API_KEY manquante côté serveur (secret Supabase)." },
      500,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }

  const action = body.action;

  try {
    // ── Conversation avec le tuteur ───────────────────────────
    if (action === "chat") {
      const { system, messages, attachment, subjectId } = body as {
        system?: string;
        messages?: { role: "user" | "assistant"; content: string }[];
        attachment?: { path: string; type: string } | null;
        subjectId?: string;
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        return json({ error: "messages manquants" }, 400);
      }

      // Les 20 derniers messages : assez de contexte, coût maîtrisé.
      // Gemini exige que l'historique COMMENCE par l'élève : on
      // retire donc les réponses du tuteur restées en tête.
      const recent = messages.slice(-20);
      while (recent.length > 0 && recent[0].role !== "user") recent.shift();
      if (recent.length === 0) {
        return json({ error: "aucun message de l'élève" }, 400);
      }

      const contents: Turn[] = recent.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: String(m.content ?? "") }] as Part[],
      }));

      // Le fichier se rattache au dernier message de l'élève.
      if (attachment?.path) {
        const userId = await getUserId(req);
        if (!userId) return json({ error: "non authentifié" }, 401);

        const part = await buildAttachmentPart(attachment, userId);
        contents[contents.length - 1].parts.unshift(part);
      }

      const lastQuestion = recent[recent.length - 1].content ?? "";
      const route = routeChat(lastQuestion, subjectId, !!attachment?.path);
      console.log(`chat → ${route.model} (${route.why})`);

      // Le profil vient de l'app, la méthode vient du serveur :
      // on peut donc améliorer la pédagogie sans republier l'app.
      const profile =
        typeof system === "string" && system.length > 0
          ? system
          : "Tu es M. Thomas, tuteur scolaire pour un élève haïtien.";

      const raw = await generate({
        model: route.model,
        thinking: route.thinking,
        system: `${profile}\n\n${TEACHING_METHOD}\n${TOPIC_PROTOCOL}`,
        contents,
        // Une réponse de tuteur qui dépasse ça n'est plus une
        // explication, c'est un cours : l'élève décroche avant.
        maxOutputTokens: 3000,
      });

      const { reply, topic } = splitTopic(raw);
      return json({ reply, topic });
    }

    // ── Génération d'un quiz ──────────────────────────────────
    if (action === "quiz") {
      const { prompt, subjectId, difficulty } = body as {
        prompt?: string;
        subjectId?: string;
        difficulty?: string;
      };
      if (typeof prompt !== "string" || prompt.length === 0) {
        return json({ error: "prompt manquant" }, 400);
      }

      const subject = typeof subjectId === "string" ? subjectId : "general";
      const chosen =
        difficulty === "facile" || difficulty === "moyen" || difficulty === "difficile"
          ? difficulty
          : undefined;
      const supabase = userClient(req);
      const userId = await getUserId(req);

      // Ce que cet élève a déjà vu, et ce qu'il a déjà réussi.
      let seen: string[] = [];
      let perf: Performance = {
        averageScore: null,
        quizCount: 0,
        averageMastery: 0,
      };

      if (userId) {
        const [seenRes, perfRes] = await Promise.all([
          supabase
            .from("quiz_seen_questions")
            .select("question")
            .eq("user_id", userId)
            .eq("subject_id", subject)
            .order("created_at", { ascending: false })
            .limit(40),
          readPerformance(supabase, userId, subject),
        ]);
        seen = (seenRes.data ?? []).map((r: { question: string }) => r.question);
        perf = perfRes;
      }

      const route = routeQuiz();
      console.log(`quiz → ${route.model} (${subject}/${chosen ?? "auto"})`);

      const raw = await generate({
        model: route.model,
        thinking: route.thinking,
        system: `Tu génères des quiz scolaires pour des élèves haïtiens, adaptés à leur classe et au programme du MENFP.\n\n${TEACHING_METHOD}\n\n${quizGuidance(seen, perf, chosen)}`,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        schema: QUIZ_SCHEMA as unknown as Record<string, unknown>,
        // Dix questions, leurs options et leurs explications, plus
        // les jetons de réflexion : il faut de la marge.
        maxOutputTokens: 16000,
        // Plus bas que le chat : on veut des énoncés justes et des
        // distracteurs crédibles, pas de la fantaisie.
        temperature: 0.6,
      });

      let parsed: { questions?: RawQuestion[] };
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.error("quiz : JSON illisible", raw.slice(0, 300));
        return json({ error: "génération du quiz impossible" }, 502);
      }

      if (!parsed?.questions || !Array.isArray(parsed.questions)) {
        return json({ error: "génération du quiz impossible" }, 502);
      }

      // On écarte les questions bancales, puis on remélange les
      // options pour que la bonne réponse ne tombe pas toujours au
      // même endroit.
      const questions = parsed.questions.filter(isSound).map(shuffleChoices);

      if (questions.length === 0) {
        return json({ error: "génération du quiz impossible" }, 502);
      }

      // On mémorise pour ne pas les reproposer.
      //
      // Cette écriture est ATTENDUE, pas lancée puis oubliée :
      // l'isolat Edge peut être détruit dès la réponse envoyée, et
      // une écriture en vol serait perdue — le quiz suivant
      // reproposerait alors les mêmes questions.
      //
      // Un échec ne doit pas priver l'élève de son quiz : on
      // journalise et on continue.
      if (userId) {
        const { error: memoryError } = await supabase
          .from("quiz_seen_questions")
          .insert(
            questions.map((q) => ({
              user_id: userId,
              subject_id: subject,
              question: q.question.slice(0, 500),
              topic: q.topic ?? null,
            })),
          );
        if (memoryError) console.error("memoire quiz:", memoryError.message);
      }

      return json({ questions });
    }

    return json({ error: "action inconnue (chat | quiz)" }, 400);
  } catch (e) {
    console.error(e);
    if (e instanceof GeminiError) return json({ error: e.message }, 502);
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg.slice(0, 300) }, 500);
  }
});
