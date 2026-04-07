import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildCorsHeaders } from "../_shared/cors.ts";

type TransactionType = "RECEITA" | "DESPESA" | "TRANSFERENCIA";
type SourceKind = "ACCOUNT" | "CARD" | "AUTO";

type ParsePayload = {
  text?: string;
  timezone?: string;
  today?: string;
  accounts?: Array<{ name?: string }>;
  cards?: Array<{ name?: string; brand?: string | null; lastFourDigits?: string | null }>;
  categories?: Array<{ name?: string; type?: TransactionType }>;
  defaults?: {
    lastUsedAccountName?: string | null;
    lastUsedCardName?: string | null;
    primaryAccountName?: string | null;
    secondaryAccountName?: string | null;
  };
};

type AssistantResponse = {
  intent: "TRANSACTION" | "OTHER";
  needsClarification: boolean;
  clarification: string | null;
  answer: string | null;
  transaction: {
    type: TransactionType;
    amount: number;
    description: string;
    date: string;
    installments: number | null;
    sourceKind: SourceKind;
    sourceName: string | null;
    destinationName: string | null;
    categoryName: string | null;
  } | null;
  confidence: number;
  confidenceSignals: string[];
};

const DEFAULT_MODEL = "gemini-2.0-flash";
const MAX_TEXT_LENGTH = 700;
const MAX_LIST_ITEMS = 50;
const MAX_FIELD_LENGTH = 120;
const MAX_REQUEST_BYTES = 24_000;
const REQUEST_TIMEOUT_MS = 12_000;

function toJson(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clampText(value: string, maxLength: number): string {
  return value.slice(0, maxLength);
}

function sanitizeDate(value: string, fallbackDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return fallbackDate;
}

function sanitizeNamedList<T>(
  list: unknown,
  mapper: (obj: Record<string, unknown>) => T | null,
): T[] {
  if (!Array.isArray(list)) return [];

  const output: T[] = [];
  for (const item of list.slice(0, MAX_LIST_ITEMS)) {
    const mapped = mapper(asObject(item));
    if (mapped) output.push(mapped);
  }

  return output;
}

function fallbackOtherAnswer(status?: number): string {
  if (status === 429) {
    return "?? Recebi sua mensagem, mas houve limite da IA neste momento. Tente novamente em alguns segundos.";
  }
  if (status === 401 || status === 403) {
    return "?? Recebi sua mensagem, mas houve um bloqueio de configuração da IA agora. Tente novamente em instantes.";
  }
  return "?? Recebi sua mensagem, mas houve ruído na IA agora. Tente novamente em instantes.";
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Empty model response");

  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const maybeJson = codeBlockMatch ? codeBlockMatch[1] : trimmed;

  const start = maybeJson.indexOf("{");
  const end = maybeJson.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found");
  }

  return JSON.parse(maybeJson.slice(start, end + 1));
}

function sanitizeAssistantResponse(rawValue: unknown, fallbackDate: string): AssistantResponse {
  const data = asObject(rawValue);

  const intent = asString(data.intent).toUpperCase() === "TRANSACTION" ? "TRANSACTION" : "OTHER";
  const needsClarification = Boolean(data.needsClarification);
  const clarification = asString(data.clarification) || null;
  const answer = asString(data.answer) || null;
  const rawConfidence = Number(data.confidence);
  const confidence =
    Number.isFinite(rawConfidence) && rawConfidence >= 0 && rawConfidence <= 1 ? rawConfidence : 0;
  const confidenceSignals = Array.isArray(data.confidenceSignals)
    ? data.confidenceSignals
        .map((item) => asString(item))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  let transaction: AssistantResponse["transaction"] = null;
  const rawTransaction = asObject(data.transaction);
  if (Object.keys(rawTransaction).length > 0) {
    const rawType = asString(rawTransaction.type).toUpperCase();
    const type: TransactionType =
      rawType === "RECEITA" || rawType === "TRANSFERENCIA" ? rawType : "DESPESA";
    const rawAmount = Number(rawTransaction.amount || 0);
    const rawInstallments =
      rawTransaction.installments === null || rawTransaction.installments === undefined
        ? null
        : Number(rawTransaction.installments);
    const rawSourceKind = asString(rawTransaction.sourceKind).toUpperCase();
    const sourceKind: SourceKind =
      rawSourceKind === "ACCOUNT" || rawSourceKind === "CARD" ? rawSourceKind : "AUTO";

    transaction = {
      type,
      amount: Number.isFinite(rawAmount) ? rawAmount : 0,
      description: clampText(asString(rawTransaction.description), 100),
      date: sanitizeDate(asString(rawTransaction.date), fallbackDate),
      installments:
        rawInstallments !== null && Number.isFinite(rawInstallments)
          ? Math.max(1, Math.floor(rawInstallments))
          : null,
      sourceKind,
      sourceName: clampText(asString(rawTransaction.sourceName), MAX_FIELD_LENGTH) || null,
      destinationName: clampText(asString(rawTransaction.destinationName), MAX_FIELD_LENGTH) || null,
      categoryName: clampText(asString(rawTransaction.categoryName), MAX_FIELD_LENGTH) || null,
    };
  }

  return {
    intent,
    needsClarification,
    clarification,
    answer,
    transaction,
    confidence,
    confidenceSignals,
  };
}

function createPrompt(payload: Required<ParsePayload>): string {
  return [
    "You are Azinha, a male Brazilian Portuguese financial copilot.",
    "Your job is to convert Brazilian Portuguese finance messages into strict JSON for transaction drafting.",
    "Never execute actions. Only parse intent and fields.",
    "Output must be a single JSON object without markdown.",
    "",
    "Voice and behavior rules for answer/clarification text:",
    "- Sound smart, confident, clear, friendly, and efficient.",
    "- Professional-friendly tone with warmth.",
    "- Optional humor is light, short, and contextual.",
    "- Emojis are allowed, but use at most one contextual emoji per message.",
    "- Never use slang, abbreviations, or internet shorthand.",
    "- Never sound infantilized, preachy, judgmental, passive, bureaucratic, or corporate.",
    "- Never judge spending, debt, delays, impulses, or mistakes.",
    "- Priority order: precision, clarity, speed, personality.",
    "- Write in pt-BR with short natural language (1 to 3 short sentences).",
    "- When ambiguity exists, ask only the minimum single question needed.",
    "- Prefer short openings such as: Entendi., Anotado., Entendido.",
    "",
    "Parsing rules:",
    "- intent: TRANSACTION only when user is clearly describing a financial transaction.",
    "- intent: OTHER for greetings, questions, or anything not a transaction.",
    "- needsClarification: true if critical fields are missing/ambiguous.",
    "- For TRANSACTION, support types: RECEITA, DESPESA, TRANSFERENCIA.",
    "- For DESPESA parcelada, set installments > 1 when user indicates installments/parcelas.",
    "- sourceKind: ACCOUNT, CARD, or AUTO when source is not explicit.",
    "- sourceName and destinationName should use names from provided lists when possible.",
    "- categoryName should be a category from provided list when possible.",
    "- date must be YYYY-MM-DD. Convert relative expressions (hoje, ontem, amanha) using timezone and today input.",
    "- If date not informed, use today.",
    "- amount must be positive numeric value in BRL without currency symbols.",
    "- description must be a short label (2 to 6 words), without full sentence, amounts, or verbs like gastei/recebi.",
    "- Prefer specific category mapping whenever there is clear evidence; avoid generic labels like 'Outros' when possible.",
    "- For TRANSACTION without ambiguity, keep clarification as null.",
    "- For TRANSACTION with ambiguity, clarification must be short and objective.",
    "- For OTHER, provide a short useful answer in Azinha voice.",
    "- confidence must be a number from 0 to 1 indicating parse confidence.",
    "- confidenceSignals should be a short array of machine-readable risk hints when confidence is reduced.",
    "",
    "JSON schema:",
    '{',
    '  "intent": "TRANSACTION" | "OTHER",',
    '  "needsClarification": boolean,',
    '  "clarification": string | null,',
    '  "answer": string | null,',
    '  "confidence": number,',
    '  "confidenceSignals": string[],',
    '  "transaction": {',
    '    "type": "RECEITA" | "DESPESA" | "TRANSFERENCIA",',
    '    "amount": number,',
    '    "description": string,',
    '    "date": "YYYY-MM-DD",',
    '    "installments": number | null,',
    '    "sourceKind": "ACCOUNT" | "CARD" | "AUTO",',
    '    "sourceName": string | null,',
    '    "destinationName": string | null,',
    '    "categoryName": string | null',
    "  } | null",
    "}",
    "",
    "Input JSON:",
    JSON.stringify(payload),
  ].join("\n");
}

async function ensureAuthenticatedUser(req: Request): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, status: 500, error: "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not configured" };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }

  return { ok: true, userId: data.user.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: buildCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return toJson(req, { error: "Method not allowed" }, 405);
  }

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return toJson(req, { error: "Payload too large" }, 413);
  }

  const auth = await ensureAuthenticatedUser(req);
  if (!auth.ok) {
    return toJson(req, { error: auth.error }, auth.status);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return toJson(req, { error: "GEMINI_API_KEY is not configured" }, 500);
  }

  try {
    const body = (await req.json()) as ParsePayload;
    const text = clampText(asString(body.text), MAX_TEXT_LENGTH);
    if (!text) {
      return toJson(req, { error: "text is required" }, 400);
    }

    const payload: Required<ParsePayload> = {
      text,
      timezone: clampText(asString(body.timezone) || "America/Sao_Paulo", 50),
      today: sanitizeDate(asString(body.today), new Date().toISOString().slice(0, 10)),
      accounts: sanitizeNamedList(body.accounts, (item) => {
        const name = clampText(asString(item.name), MAX_FIELD_LENGTH);
        if (!name) return null;
        return { name };
      }),
      cards: sanitizeNamedList(body.cards, (item) => {
        const name = clampText(asString(item.name), MAX_FIELD_LENGTH);
        if (!name) return null;

        return {
          name,
          brand: clampText(asString(item.brand), MAX_FIELD_LENGTH) || null,
          lastFourDigits: clampText(asString(item.lastFourDigits), 4) || null,
        };
      }),
      categories: sanitizeNamedList(body.categories, (item) => {
        const name = clampText(asString(item.name), MAX_FIELD_LENGTH);
        if (!name) return null;

        const type = asString(item.type).toUpperCase();
        const normalizedType: TransactionType =
          type === "RECEITA" || type === "TRANSFERENCIA" ? type : "DESPESA";

        return { name, type: normalizedType };
      }),
      defaults: {
        lastUsedAccountName: clampText(asString(body.defaults?.lastUsedAccountName), MAX_FIELD_LENGTH) || null,
        lastUsedCardName: clampText(asString(body.defaults?.lastUsedCardName), MAX_FIELD_LENGTH) || null,
        primaryAccountName: clampText(asString(body.defaults?.primaryAccountName), MAX_FIELD_LENGTH) || null,
        secondaryAccountName: clampText(asString(body.defaults?.secondaryAccountName), MAX_FIELD_LENGTH) || null,
      },
    };

    const model = Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const prompt = createPrompt(payload);

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

    let geminiResponse: Response;
    try {
      geminiResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        }),
        signal: abortController.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini request failed", {
        status: geminiResponse.status,
        userId: auth.userId,
        errorText: clampText(errorText, 500),
      });

      return toJson(
        req,
        {
          intent: "OTHER",
          needsClarification: false,
          clarification: null,
          answer: fallbackOtherAnswer(geminiResponse.status),
          transaction: null,
          confidence: 0.2,
          confidenceSignals: ["gemini_http_error"],
        },
        200,
      );
    }

    const geminiJson = await geminiResponse.json();
    const candidates = Array.isArray(geminiJson?.candidates) ? geminiJson.candidates : [];
    const parts = Array.isArray(candidates[0]?.content?.parts) ? candidates[0].content.parts : [];
    const rawText = parts
      .map((part: { text?: string }) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();

    if (!rawText) {
      return toJson(
        req,
        {
          intent: "OTHER",
          needsClarification: false,
          clarification: null,
          answer: "?? Entendi parcialmente, mas faltou um detalhe. Envie em uma frase curta.",
          transaction: null,
          confidence: 0.3,
          confidenceSignals: ["empty_model_output"],
        },
        200,
      );
    }

    const parsed = extractJson(rawText);
    const response = sanitizeAssistantResponse(parsed, payload.today);

    return toJson(req, response, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout = message.toLowerCase().includes("abort") || message.toLowerCase().includes("timeout");

    console.error("Unhandled parser error", {
      userId: auth.userId,
      message: clampText(message, 500),
    });

    return toJson(
      req,
      {
        intent: "OTHER",
        needsClarification: false,
        clarification: null,
        answer: isTimeout
          ? "?? Recebi sua mensagem, mas a IA demorou mais que o esperado agora. Tente novamente."
          : fallbackOtherAnswer(),
        transaction: null,
        confidence: 0.2,
        confidenceSignals: [isTimeout ? "gemini_timeout" : "unhandled_parser_error"],
      },
      200,
    );
  }
});

