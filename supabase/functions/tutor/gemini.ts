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
export type Part =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

export interface Turn {
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
export type Thinking = "minimal" | "low" | "medium" | "high" | null;

export interface GenerateOptions {
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

export class GeminiError extends Error {}

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
 * `ANTHROPIC_MODEL`-comme-`GEMINI_MODEL_*` est réglable par
 * variable d'environnement. Plutôt que de priver l'élève de sa
 * réponse pour un paramètre de confort, on réessaie sans lui.
 */
export async function generate(o: GenerateOptions): Promise<string> {
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
