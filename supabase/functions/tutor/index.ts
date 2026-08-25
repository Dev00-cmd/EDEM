// ═══════════════════════════════════════════════════════════════
//  TI PWOF — Edge Function « tutor »
//
//  La clé API Anthropic vit ici, côté serveur, jamais dans l'APK.
//  Protégée par JWT : seul un élève connecté peut appeler l'IA.
//
//  POST { action: "chat", system, messages, attachment? }
//        → { reply, topic }
//  POST { action: "quiz", prompt }
//        → { questions: [...] }
//
//  « attachment » permet à l'élève de photographier son devoir :
//  le fichier est lu depuis le stockage privé, jamais exposé
//  publiquement, et joint au dernier message de l'élève.
// ═══════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@^0.71.0";
import { createClient } from "npm:@supabase/supabase-js@^2.112.4";
import { TEACHING_METHOD, quizGuidance, type Performance } from "./teaching.ts";

const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-5";

const client = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY") ?? "",
});

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

// Claude accepte ces formats en vision. Le HEIC de l'iPhone n'en
// fait pas partie : l'app le convertit en JPEG avant l'envoi.
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const PDF_TYPE = "application/pdf";

// Au-delà, l'appel à Claude échouerait : mieux vaut un message clair.
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

// ── Schémas de sortie ─────────────────────────────────────────
// On impose la forme de la réponse (structured outputs) plutôt
// que de deviner du JSON dans du texte libre.

const CHAT_SCHEMA = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description:
        "La réponse pédagogique à l'élève, avec **gras** pour les mots clés.",
    },
    topic: {
      type: ["string", "null"],
      description:
        "La notion scolaire principale traitée, en minuscules avec des tirets (ex: les-fractions). null si aucune notion précise.",
    },
  },
  required: ["reply", "topic"],
  additionalProperties: false,
} as const;

const QUIZ_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          // Pas de minItems/maxItems ni de minimum/maximum ici :
          // les structured outputs de l'API ne les acceptent pas
          // (minItems n'admet que 0 ou 1). La contrainte passe donc
          // par la description, et l'app revalide chaque question
          // avant de l'afficher — voir src/ai/remoteTutor.ts.
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
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;

/**
 * Extrait la réponse structurée du modèle.
 *
 * `output_config.format` garantit que le modèle PRODUIT du JSON
 * conforme au schéma, mais `messages.create()` ne le désérialise
 * pas toujours dans `parsed_output` — seul `messages.parse()` le
 * fait systématiquement. Sans ce filet, le JSON brut partait tel
 * quel vers l'élève et les quiz échouaient.
 *
 * On tente donc, dans l'ordre : le champ déjà désérialisé, puis
 * le texte de la réponse, puis le texte débarrassé d'une éventuelle
 * clôture Markdown.
 */
// deno-lint-ignore no-explicit-any
function extractStructured<T>(response: any): T | null {
  const parsed = response?.parsed_output;
  if (parsed && typeof parsed === "object") return parsed as T;

  const text = (response?.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("")
    .trim();

  if (!text) return null;

  const candidates = [
    text,
    // Le modèle enrobe parfois son JSON dans un bloc ```json … ```
    text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""),
  ];

  for (const c of candidates) {
    try {
      const value = JSON.parse(c);
      if (value && typeof value === "object") return value as T;
    } catch {
      // on essaie le candidat suivant
    }
  }
  return null;
}

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
 * Récupère la pièce jointe et la transforme en bloc de contenu
 * Claude.
 *
 * Sécurité : le chemin DOIT commencer par l'identifiant de
 * l'élève qui appelle. Sans cette vérification, un élève
 * pourrait demander à la fonction de lire le fichier d'un autre —
 * la fonction lit avec la clé de service, qui ignore les règles RLS.
 */
async function buildAttachmentBlock(
  attachment: { path: string; type: string },
  userId: string,
): Promise<Record<string, unknown>> {
  const { path, type } = attachment;

  if (typeof path !== "string" || !path.startsWith(`${userId}/`)) {
    throw new Error("Fichier refusé : il n'appartient pas à cet élève.");
  }

  const isImage = IMAGE_TYPES.includes(type);
  const isPdf = type === PDF_TYPE;
  if (!isImage && !isPdf) {
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

  const base64 = toBase64(buffer);

  return isImage
    ? { type: "image", source: { type: "base64", media_type: type, data: base64 } }
    : {
        type: "document",
        source: { type: "base64", media_type: PDF_TYPE, data: base64 },
      };
}

// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  if (!Deno.env.get("ANTHROPIC_API_KEY")) {
    return json(
      { error: "ANTHROPIC_API_KEY manquante côté serveur (secret Supabase)." },
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
      const { system, messages, attachment } = body as {
        system?: string;
        messages?: { role: "user" | "assistant"; content: string }[];
        attachment?: { path: string; type: string } | null;
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        return json({ error: "messages manquants" }, 400);
      }

      // Les 20 derniers messages : assez de contexte, coût maîtrisé.
      const history: { role: "user" | "assistant"; content: unknown }[] =
        messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));

      // Le fichier se rattache au dernier message de l'élève.
      if (attachment?.path) {
        const userId = await getUserId(req);
        if (!userId) return json({ error: "non authentifié" }, 401);

        const block = await buildAttachmentBlock(attachment, userId);
        const last = history[history.length - 1];
        last.content = [
          block,
          { type: "text", text: String(last.content ?? "") },
        ];
      }

      // Le profil vient de l'app, la méthode vient du serveur :
      // on peut donc améliorer la pédagogie sans republier l'app.
      const profile =
        typeof system === "string" && system.length > 0
          ? system
          : "Tu es Ti Pwof, tuteur scolaire pour un élève haïtien.";

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4000,
        system: `${profile}\n\n${TEACHING_METHOD}`,
        // deno-lint-ignore no-explicit-any
        messages: history as any,
        output_config: {
          effort: "medium",
          format: { type: "json_schema", schema: CHAT_SCHEMA },
        },
      });

      const parsed = extractStructured<{ reply: string; topic: string | null }>(
        response,
      );

      if (parsed?.reply) {
        return json({ reply: parsed.reply, topic: parsed.topic ?? null });
      }

      // Dernier recours : renvoyer le texte tel quel plutôt que rien.
      const text = response.content
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map((b) => b.text)
        .join("");
      return json({ reply: text, topic: null });
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

      const response = await client.messages.create({
        model: MODEL,
        // Dix questions avec leurs explications, plus le
        // raisonnement du modèle : 8000 jetons devenaient justes.
        max_tokens: 16000,
        system: `Tu génères des quiz scolaires pour des élèves haïtiens, adaptés à leur classe et au programme du MENFP.\n\n${TEACHING_METHOD}\n\n${quizGuidance(seen, perf, chosen)}`,
        messages: [{ role: "user", content: prompt }],
        output_config: {
          // Un quiz varié demande plus de recul qu'une réponse
          // directe : mêmes notions, mais angles neufs.
          effort: "high",
          format: { type: "json_schema", schema: QUIZ_SCHEMA },
        },
      });

      const parsed = extractStructured<{ questions: RawQuestion[] }>(response);

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
      // reproposerait alors les mêmes questions. Le surcoût est de
      // quelques dizaines de millisecondes sur un appel qui en dure
      // plusieurs milliers.
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
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg.slice(0, 300) }, 500);
  }
});
