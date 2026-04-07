import { supabase } from "@/integrations/supabase/client";
import type { TransactionType } from "@/types/entities";
import { buildFallbackParseResponse } from "./azinhaFallback";
import { isGenericCategoryName, sanitizeSmartDescription } from "./azinhaTextIntelligence";

export type AssistantParseIntent = "TRANSACTION" | "OTHER";

export type AssistantSourceKind = "ACCOUNT" | "CARD" | "AUTO";

export interface AssistantParsedTransaction {
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  installments: number | null;
  sourceKind: AssistantSourceKind;
  sourceName: string | null;
  destinationName: string | null;
  categoryName: string | null;
}

export interface AssistantParseResponse {
  intent: AssistantParseIntent;
  needsClarification: boolean;
  clarification: string | null;
  answer: string | null;
  transaction: AssistantParsedTransaction | null;
  confidence: number;
  confidenceSignals: string[];
}

export interface AssistantParseRequest {
  text: string;
  timezone: string;
  today: string;
  accounts: Array<{ name: string }>;
  cards: Array<{ name: string; brand?: string | null; lastFourDigits?: string | null }>;
  categories: Array<{ name: string; type: TransactionType }>;
  defaults: {
    lastUsedAccountName: string | null;
    lastUsedCardName: string | null;
    primaryAccountName: string | null;
    secondaryAccountName: string | null;
  };
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const TRANSACTION_SIGNAL_RE =
  /\d|r\$|real|pix|transfer|transferi|gastei|recebi|comprei|comi|paguei|pagei|perdi|cartao|parcela|entrada|saida|despesa|receita|fatura|deposit|depositei|saque|mercado|uber|ifood/i;
const LARGE_SCALE_TOKEN_RE = /\b(bilh(?:ao|oes)|bi|milh(?:ao|oes)|mi|mil|k)\b/i;
const REMOTE_PARSER_COOLDOWN_MS = 2 * 60 * 1000;

let remoteParserDisabledUntil = 0;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeText(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function repairEncodingArtifacts(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || !/[ÃÂâ]/.test(trimmed)) return trimmed;

  try {
    const bytes = Uint8Array.from(trimmed, (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes).trim();
    if (!decoded) return trimmed;

    const decodedLooksBetter =
      /[áàãâéêíóôõúç]/i.test(decoded) || !/[ÃÂâ]/.test(decoded);
    return decodedLooksBetter ? decoded : trimmed;
  } catch {
    return trimmed;
  }
}

function sanitizeToneText(value: string | null): string | null {
  if (!value) return null;

  const repaired = repairEncodingArtifacts(value);
  const cleaned = repaired
    .replace(/\bpra\b/gi, "para")
    .replace(/\bpro\b/gi, "para o")
    .replace(/\bvc\b/gi, "você")
    .replace(/\btamo\b/gi, "estamos")
    .replace(/\bpq\b/gi, "porque")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!cleaned) return null;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function clampConfidence(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function uniqueSignals(values: string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const item of values) {
    const value = String(item || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    cleaned.push(value);
  }

  return cleaned;
}

function sanitizeResponse(value: unknown): AssistantParseResponse {
  const data = isObject(value) ? value : {};

  const intentRaw = String(data.intent || "OTHER").toUpperCase();
  const intent: AssistantParseIntent = intentRaw === "TRANSACTION" ? "TRANSACTION" : "OTHER";
  const needsClarification = Boolean(data.needsClarification);
  const clarification =
    typeof data.clarification === "string" && data.clarification.trim()
      ? sanitizeToneText(data.clarification.trim())
      : null;
  const answer = typeof data.answer === "string" && data.answer.trim() ? sanitizeToneText(data.answer.trim()) : null;
  const confidenceRaw = Number(data.confidence);
  const confidence = clampConfidence(Number.isFinite(confidenceRaw) ? confidenceRaw : null);
  const confidenceSignals = Array.isArray(data.confidenceSignals)
    ? uniqueSignals(
        data.confidenceSignals
          .map((signal) => (typeof signal === "string" ? signal.trim() : ""))
          .filter(Boolean),
      )
    : [];

  let transaction: AssistantParsedTransaction | null = null;
  if (isObject(data.transaction)) {
    const txRaw = data.transaction;
    const typeRaw = String(txRaw.type || "").toUpperCase();
    const type = ([("RECEITA" as const), ("DESPESA" as const), ("TRANSFERENCIA" as const)].includes(typeRaw as TransactionType)
      ? typeRaw
      : "DESPESA") as TransactionType;
    const amount = Number(txRaw.amount || 0);
    const installmentsValue = txRaw.installments === null || txRaw.installments === undefined ? null : Number(txRaw.installments);
    const sourceKindRaw = String(txRaw.sourceKind || "AUTO").toUpperCase();
    const sourceKind: AssistantSourceKind =
      sourceKindRaw === "ACCOUNT" || sourceKindRaw === "CARD" ? sourceKindRaw : "AUTO";

    transaction = {
      type,
      amount: Number.isFinite(amount) ? amount : 0,
      description: typeof txRaw.description === "string" ? repairEncodingArtifacts(txRaw.description) : "",
      date: typeof txRaw.date === "string" ? repairEncodingArtifacts(txRaw.date) : "",
      installments:
        installmentsValue !== null && Number.isFinite(installmentsValue)
          ? Math.max(1, Math.floor(installmentsValue))
          : null,
      sourceKind,
      sourceName:
        typeof txRaw.sourceName === "string" && txRaw.sourceName.trim()
          ? repairEncodingArtifacts(txRaw.sourceName)
          : null,
      destinationName:
        typeof txRaw.destinationName === "string" && txRaw.destinationName.trim()
          ? repairEncodingArtifacts(txRaw.destinationName)
          : null,
      categoryName:
        typeof txRaw.categoryName === "string" && txRaw.categoryName.trim()
          ? repairEncodingArtifacts(txRaw.categoryName)
          : null,
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

function deriveConfidence(response: AssistantParseResponse, payloadText: string): {
  confidence: number;
  confidenceSignals: string[];
} {
  const normalizedPayload = normalizeText(payloadText);
  const hasTransactionSignal = TRANSACTION_SIGNAL_RE.test(normalizedPayload);
  const signals: string[] = [];

  if (response.intent === "OTHER") {
    let score = response.answer ? 0.72 : 0.5;

    if (!response.answer) {
      signals.push("missing_answer");
    }

    if (hasTransactionSignal) {
      score -= 0.38;
      signals.push("possible_transaction_missed");
    }

    if (response.needsClarification || response.clarification) {
      score -= 0.08;
      signals.push("unexpected_clarification");
    }

    return {
      confidence: clampConfidence(score),
      confidenceSignals: signals,
    };
  }

  const tx = response.transaction;
  if (!tx) {
    let score = 0.4;
    if (response.needsClarification || response.clarification) {
      score = 0.46;
      signals.push("waiting_clarification");
    } else {
      signals.push("missing_transaction_payload");
    }

    return {
      confidence: clampConfidence(score),
      confidenceSignals: signals,
    };
  }

  let score = 0.34;

  if (tx.amount > 0) {
    score += 0.24;
  } else {
    signals.push("invalid_amount");
    score -= 0.22;
  }

  if (YMD_RE.test(tx.date)) {
    score += 0.1;
  } else {
    signals.push("invalid_date");
    score -= 0.1;
  }

  if (tx.description && tx.description.length >= 3) {
    score += 0.08;
  } else {
    signals.push("short_description");
    score -= 0.08;
  }

  if (tx.description && normalizeText(tx.description) === normalizedPayload) {
    signals.push("raw_description");
    score -= 0.12;
  }

  if (tx.categoryName && !isGenericCategoryName(tx.categoryName)) {
    score += 0.13;
  } else {
    signals.push("generic_or_missing_category");
    score -= 0.09;
  }

  if (tx.type === "TRANSFERENCIA") {
    if (tx.sourceName) score += 0.08;
    else signals.push("missing_transfer_source");

    if (tx.destinationName) score += 0.08;
    else signals.push("missing_transfer_destination");
  }

  if (tx.type === "DESPESA") {
    if (tx.sourceKind === "AUTO" && !tx.sourceName && (tx.installments || 0) <= 1) {
      signals.push("source_not_explicit");
      score -= 0.1;
    }

    if ((tx.installments || 0) > 1) {
      score += 0.05;
    }
  }

  if (response.needsClarification || response.clarification) {
    signals.push("needs_clarification");
    score -= 0.2;
  }

  if (!hasTransactionSignal && tx.amount > 0) {
    signals.push("weak_transaction_signal");
    score -= 0.08;
  }

  return {
    confidence: clampConfidence(score),
    confidenceSignals: signals,
  };
}

function attachConfidence(response: AssistantParseResponse, payloadText: string): AssistantParseResponse {
  const derived = deriveConfidence(response, payloadText);
  const hasRemoteConfidence = response.confidence > 0;
  const confidence = hasRemoteConfidence
    ? clampConfidence((response.confidence + derived.confidence) / 2)
    : derived.confidence;

  return {
    ...response,
    confidence,
    confidenceSignals: uniqueSignals([...response.confidenceSignals, ...derived.confidenceSignals]),
  };
}

function hasScaledAmountToken(text: string): boolean {
  return LARGE_SCALE_TOKEN_RE.test(normalizeText(text));
}

function shouldPreferFallbackAmount(
  remoteAmount: number,
  fallbackAmount: number,
  payloadText: string,
): boolean {
  if (!(fallbackAmount > 0)) return false;
  if (!(remoteAmount > 0)) return true;
  if (!hasScaledAmountToken(payloadText)) return false;

  if (fallbackAmount >= 1000 && remoteAmount < 1000) return true;
  return fallbackAmount / Math.max(1, remoteAmount) >= 20;
}

function mergeHeuristicsIntoResponse(
  remote: AssistantParseResponse,
  localFallback: AssistantParseResponse,
  payloadText: string,
): AssistantParseResponse {
  if (!remote.transaction) {
    const fallbackTransaction = localFallback.transaction;
    const canRecoverWithFallback =
      remote.intent === "TRANSACTION" &&
      remote.needsClarification &&
      !!fallbackTransaction &&
      !localFallback.needsClarification;

    if (canRecoverWithFallback) {
      return attachConfidence(
        {
          ...localFallback,
          answer: remote.answer || localFallback.answer,
          confidenceSignals: uniqueSignals([
            ...localFallback.confidenceSignals,
            "fallback_remote_missing_transaction",
          ]),
        },
        payloadText,
      );
    }

    return attachConfidence(remote, payloadText);
  }

  const fallbackTx = localFallback.transaction;
  const extraSignals: string[] = [];
  const nextTransaction: AssistantParsedTransaction = {
    ...remote.transaction,
    description: sanitizeSmartDescription(remote.transaction.description, payloadText, remote.transaction.type),
  };

  const fallbackCategory = fallbackTx?.categoryName ?? null;
  if (fallbackCategory) {
    const shouldAdoptFallbackCategory =
      !nextTransaction.categoryName ||
      (isGenericCategoryName(nextTransaction.categoryName) && !isGenericCategoryName(fallbackCategory));

    if (shouldAdoptFallbackCategory) {
      nextTransaction.categoryName = fallbackCategory;
      extraSignals.push("fallback_category_recovered");
    }
  }

  const fallbackAmount = fallbackTx?.amount ?? 0;
  if (shouldPreferFallbackAmount(nextTransaction.amount, fallbackAmount, payloadText)) {
    nextTransaction.amount = Number(fallbackAmount.toFixed(2));
    extraSignals.push("fallback_amount_recovered");
  }

  if (
    nextTransaction.type === "DESPESA" &&
    (!nextTransaction.installments || nextTransaction.installments <= 1) &&
    fallbackTx?.installments &&
    fallbackTx.installments > 1
  ) {
    nextTransaction.installments = fallbackTx.installments;
    extraSignals.push("fallback_installments_recovered");
  }

  if (
    nextTransaction.type === "TRANSFERENCIA" &&
    fallbackTx?.type === "TRANSFERENCIA"
  ) {
    if (!nextTransaction.sourceName && fallbackTx.sourceName) {
      nextTransaction.sourceName = fallbackTx.sourceName;
      extraSignals.push("fallback_transfer_source_recovered");
    }
    if (!nextTransaction.destinationName && fallbackTx.destinationName) {
      nextTransaction.destinationName = fallbackTx.destinationName;
      extraSignals.push("fallback_transfer_destination_recovered");
    }
  }

  return attachConfidence(
    {
      ...remote,
      transaction: nextTransaction,
      confidenceSignals: uniqueSignals([...remote.confidenceSignals, ...extraSignals]),
    },
    payloadText,
  );
}

async function extractInvokeErrorMessage(error: unknown): Promise<string> {
  if (!isObject(error)) return "Falha ao analisar mensagem com IA.";

  const context = error.context;
  if (context instanceof Response) {
    if (context.status === 401) {
      return "Sua sessão expirou. Entre novamente para continuar.";
    }

    if (context.status === 403) {
      return "Não consegui autenticar esta chamada agora. Entre novamente.";
    }

    try {
      const text = await context.text();
      if (text) {
        try {
          const parsed = JSON.parse(text) as unknown;
          if (isObject(parsed)) {
            if (typeof parsed.message === "string" && parsed.message.trim()) {
              return repairEncodingArtifacts(parsed.message);
            }
            if (typeof parsed.error === "string" && parsed.error.trim()) {
              return repairEncodingArtifacts(parsed.error);
            }
            if (isObject(parsed.error) && typeof parsed.error.message === "string" && parsed.error.message.trim()) {
              return repairEncodingArtifacts(parsed.error.message);
            }
          }
        } catch {
          return repairEncodingArtifacts(text);
        }
      }
    } catch {
      // Ignore context read errors and fallback to generic message.
    }
  }

  if (typeof error.message === "string" && error.message.trim()) {
    return repairEncodingArtifacts(error.message);
  }

  return "Falha ao analisar mensagem com IA.";
}

function withExtraSignal(response: AssistantParseResponse, signal: string): AssistantParseResponse {
  return {
    ...response,
    confidenceSignals: uniqueSignals([...response.confidenceSignals, signal]),
  };
}

function shouldSkipRemoteParser(): boolean {
  return Date.now() < remoteParserDisabledUntil;
}

function markRemoteParserUnavailable(): void {
  remoteParserDisabledUntil = Date.now() + REMOTE_PARSER_COOLDOWN_MS;
}

function clearRemoteParserUnavailable(): void {
  remoteParserDisabledUntil = 0;
}

export async function parseTransactionWithAssistant(payload: AssistantParseRequest): Promise<AssistantParseResponse> {
  if (shouldSkipRemoteParser()) {
    return withExtraSignal(
      buildFallbackParseResponse(payload, {
        reason: "Parser remoto em retentativa.",
      }),
      "fallback_parser_cooldown",
    );
  }

  try {
    const { data, error } = await supabase.functions.invoke("parse-transaction", {
      body: payload,
    });

    if (error) {
      markRemoteParserUnavailable();
      const reason = await extractInvokeErrorMessage(error);
      return withExtraSignal(buildFallbackParseResponse(payload, { reason }), "fallback_parser");
    }

    clearRemoteParserUnavailable();
    const localFallback = buildFallbackParseResponse(payload);
    const sanitized = mergeHeuristicsIntoResponse(sanitizeResponse(data), localFallback, payload.text);
    const hasMeaningfulData =
      sanitized.transaction !== null ||
      sanitized.answer !== null ||
      sanitized.clarification !== null;

    if (!hasMeaningfulData) {
      return withExtraSignal(
        buildFallbackParseResponse(payload, {
          reason: "Resposta vazia da IA.",
        }),
        "fallback_empty_response",
      );
    }

    if (sanitized.intent === "OTHER" && localFallback.intent === "TRANSACTION") {
      return withExtraSignal(localFallback, "fallback_transaction_recovered");
    }

    const normalizedAnswer = sanitized.answer ? normalizeText(sanitized.answer) : "";
    const looksInfraFallback =
      normalizedAnswer.includes("limite da ia") ||
      normalizedAnswer.includes("bloqueio de configuracao") ||
      normalizedAnswer.includes("ruido na ia");

    if (sanitized.intent === "OTHER" && looksInfraFallback) {
      return withExtraSignal(localFallback, "fallback_infra_message");
    }

    return sanitized;
  } catch (error) {
    markRemoteParserUnavailable();
    const reason = error instanceof Error ? error.message : "Falha inesperada na IA.";
    return withExtraSignal(buildFallbackParseResponse(payload, { reason }), "fallback_unhandled_error");
  }
}
