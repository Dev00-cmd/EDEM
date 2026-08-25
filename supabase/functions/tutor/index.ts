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
        const authHeader = req.headers.get("Authorization") ?? "";
        const anon = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } },
        );
        const { data: userData } = await anon.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return json({ error: "non authentifié" }, 401);

        const block = await buildAttachmentBlock(attachment, userId);
        const last = history[history.length - 1];
        last.content = [
          block,
          { type: "text", text: String(last.content ?? "") },
        ];
      }

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4000,
        system:
          typeof system === "string" && system.length > 0
            ? system
            : "Tu es un tuteur bienveillant pour élèves haïtiens.",
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
      const { prompt } = body as { prompt?: string };
      if (typeof prompt !== "string" || prompt.length === 0) {
        return json({ error: "prompt manquant" }, 400);
      }

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 8000,
        system:
          "Tu génères des quiz scolaires pour des élèves haïtiens, adaptés à leur classe et au programme du MENFP. Les questions sont claires, progressives, et chaque explication apprend quelque chose.",
        messages: [{ role: "user", content: prompt }],
        output_config: {
          effort: "medium",
          format: { type: "json_schema", schema: QUIZ_SCHEMA },
        },
      });

      const parsed = extractStructured<{ questions: unknown[] }>(response);

      if (!parsed?.questions || !Array.isArray(parsed.questions)) {
        return json({ error: "génération du quiz impossible" }, 502);
      }
      return json({ questions: parsed.questions });
    }

    return json({ error: "action inconnue (chat | quiz)" }, 400);
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg.slice(0, 300) }, 500);
  }
});
