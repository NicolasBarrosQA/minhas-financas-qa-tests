import type { TransactionType } from "@/types/entities";

const DESCRIPTION_VERB_RE =
  /^(?:eu\s+)?(?:gastei|gastar|paguei|pagei|pagar|comprei|comprar|comi|comer|recebi|receber|ganhei|ganhar|transferi|transferir|enviei|enviar|depositei|depositar|pixei|fiz|foi|teve)\b/i;

const DETAIL_TRAIL_RE =
  /\b(?:hoje|ontem|anteontem|amanha|semana\s+passada|no\s+cart[aã]o|na\s+conta|via\s+pix|em\s+\d{1,2}\s*x|\d{1,2}\s*parcelas?)\b.*$/i;

const VERB_IN_DESCRIPTION_RE = /\b(gastei|gastar|paguei|pagei|pagar|comprei|comprar|comi|comer|recebi|receber|transferi|transferir|pix|registrei|lancei)\b/i;
const MONEY_OR_NUMBER_RE = /\br\$\s*\d|\b\d{1,4}(?:[.,]\d{1,2})?\b/i;

const START_STOPWORDS_RE = /^\s*(?:de|do|da|dos|das|em|no|na|nos|nas|para|pro|pra|com|sem)\s+/i;

const COMMON_FALLBACK_WORDS = new Set([
  "coisa",
  "compra",
  "gasto",
  "despesa",
  "receita",
  "transferencia",
]);

export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeAzinhaText(value: string): string {
  return stripDiacritics(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function toSentenceCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function clipWords(value: string, maxWords: number): string {
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length <= maxWords) return value;
  return tokens.slice(0, maxWords).join(" ");
}

function looksLikeSentence(value: string): boolean {
  const normalized = normalizeAzinhaText(value);
  if (!normalized) return false;
  if (normalized.length > 55) return true;
  if (VERB_IN_DESCRIPTION_RE.test(normalized) && MONEY_OR_NUMBER_RE.test(normalized)) return true;
  return /\b(que|porque|quando|entao|então|mas|se|foi|era)\b/.test(normalized);
}

function cleanupDescriptionCandidate(value: string): string {
  let result = value
    .replace(/\br\$\s*[\d.,]+\b/gi, " ")
    .replace(/\b\d+(?:[.,]\d+)?\b/g, " ")
    .replace(/\b(reais?|real|rs|brl)\b/gi, " ")
    .replace(/\b(mil|milh(?:ao|ão|oes|ões)|mi|k)\b/gi, " ")
    .replace(START_STOPWORDS_RE, "")
    .replace(/^(?:um|uma|o|a|os|as)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  result = result.replace(/^[,:;.-]+/, "").replace(/[,:;.-]+$/, "").trim();
  result = result.replace(/\b(?:de|do|da|dos|das|em|no|na|nos|nas|para|por|pro|pra|com|sem)\s*$/i, "").trim();
  result = clipWords(result, 7);

  if (result.length > 60) {
    result = result.slice(0, 60).trim();
  }

  const normalized = normalizeAzinhaText(result);
  if (!normalized) return "";
  if (COMMON_FALLBACK_WORDS.has(normalized)) return "";

  return toSentenceCase(result);
}

function extractContextualCandidate(raw: string): string {
  const patterns = [
    /\b(?:em|no|na|de|do|da)\s+(.+?)(?:\b(?:hoje|ontem|amanha|no\s+cart[aã]o|na\s+conta|via\s+pix|em\s+\d{1,2}\s*x|\d{1,2}\s*parcelas?)\b|$)/i,
    /\b(?:para|pra|pro)\s+(.+?)(?:\b(?:hoje|ontem|amanha)\b|$)/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    const value = match?.[1]?.trim();
    if (value) return value;
  }

  return "";
}

export function inferSmartDescription(text: string, type: TransactionType): string {
  const raw = text.trim();
  if (!raw) {
    if (type === "TRANSFERENCIA") return "Transferencia entre contas";
    if (type === "RECEITA") return "Receita";
    return "Despesa";
  }

  if (type === "TRANSFERENCIA") {
    return "Transferencia entre contas";
  }

  let candidate = raw
    .replace(DESCRIPTION_VERB_RE, "")
    .replace(/^\s*(?:-|:|,|\.)?\s*/, "")
    .trim();

  candidate = candidate
    .replace(/^\s*(?:r\$\s*)?[\d.,]+(?:\s*(?:reais?|real|rs))?\s*/i, "")
    .replace(START_STOPWORDS_RE, "")
    .replace(DETAIL_TRAIL_RE, "")
    .trim();

  if (!candidate || looksLikeSentence(candidate)) {
    const contextual = extractContextualCandidate(raw);
    if (contextual) {
      candidate = contextual;
    }
  }

  const cleaned = cleanupDescriptionCandidate(candidate);
  if (cleaned && !looksLikeSentence(cleaned)) return cleaned;

  if (type === "RECEITA") return "Receita";
  return "Despesa";
}

export function sanitizeSmartDescription(
  providedDescription: string | null | undefined,
  originalText: string,
  type: TransactionType,
): string {
  const fallback = inferSmartDescription(originalText, type);
  const description = (providedDescription || "").trim();
  if (!description) return fallback;

  const normalizedDescription = normalizeAzinhaText(description);
  const normalizedOriginal = normalizeAzinhaText(originalText);

  const looksLikeRawInput =
    normalizedDescription === normalizedOriginal ||
    (VERB_IN_DESCRIPTION_RE.test(normalizedDescription) && MONEY_OR_NUMBER_RE.test(normalizedDescription)) ||
    looksLikeSentence(description);

  if (looksLikeRawInput) {
    return fallback;
  }

  return cleanupDescriptionCandidate(description) || fallback;
}

export function isGenericCategoryName(value: string | null | undefined): boolean {
  const normalized = normalizeAzinhaText(value || "");
  if (!normalized) return true;
  return (
    normalized === "outros" ||
    normalized === "outras" ||
    normalized === "geral" ||
    normalized === "misc" ||
    normalized === "other"
  );
}
