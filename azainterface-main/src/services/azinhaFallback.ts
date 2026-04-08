import type { TransactionType } from "@/types/entities";
import type {
  AssistantParseRequest,
  AssistantParseResponse,
  AssistantSourceKind,
} from "./azinhaAssistant";
import { inferSmartDescription } from "./azinhaTextIntelligence";

type FallbackOptions = {
  reason?: string;
};

const TRANSACTION_HINT_RE =
  /\d|r\$|real|brl|pix|transfer|gastei|gastar|recebi|receber|comprei|comprar|comi|comer|paguei|pagei|pagar|perdi|perder|cartao|parcela|entrada|saida|despesa|receita|fatura|deposit|depositei|saque|mercado|uber|ifood|salario/i;
const GREETING_RE = /\b(oi|ola|opa|e ai|eae|beleza|bom dia|boa tarde|boa noite)\b/i;
const THANKS_RE = /\b(obrigad[oa]?|valeu|tmj|tamo junto)\b/i;
const HELP_RE = /\b(ajuda|como funciona|o que voce faz|oque voce faz)\b/i;
const DATE_CONTEXT_RE =
  /\b(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|hoje|ontem|amanha|anteontem|ano|mes|m[eê]s|semana)\b/i;

const TRANSFER_KEYWORDS = [
  "transfer",
  "transferi",
  "transferir",
  "transferencia",
  "pix",
  "movi",
  "enviei",
  "enviar",
];
const INCOME_KEYWORDS = [
  "recebi",
  "receber",
  "entrada",
  "ganhei",
  "ganhar",
  "salario",
  "pagamento",
  "caiu",
];
const EXPENSE_KEYWORDS = [
  "gastei",
  "gastar",
  "paguei",
  "pagei",
  "pagar",
  "comprei",
  "comprar",
  "comi",
  "comer",
  "perdi",
  "perder",
  "saida",
  "despesa",
  "debito",
  "fatura",
  "boleto",
];
const CARD_KEYWORDS = ["cartao", "credito", "visa", "mastercard", "elo", "amex"];
const DATE_MONTHS: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalize(value: string): string {
  return stripDiacritics(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

function countKeywordMatches(text: string, values: string[]): number {
  let count = 0;
  for (const value of values) {
    if (text.includes(value)) count += 1;
  }
  return count;
}

function parsePtBrNumber(raw: string): number | null {
  const normalized = raw.replace(/[^\d,.-]/g, "");
  if (!normalized) return null;

  const sign = normalized.startsWith("-") ? -1 : 1;
  const unsigned = normalized.replace(/^[+-]/, "");
  const hasComma = unsigned.includes(",");
  const hasDot = unsigned.includes(".");

  if (hasComma && hasDot) {
    const value = Number(unsigned.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(value) ? sign * value : null;
  }

  if (hasComma) {
    const value = Number(unsigned.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(value) ? sign * value : null;
  }

  if (hasDot) {
    const looksLikeThousandSeparator = /^\d{1,3}(?:\.\d{3})+$/.test(unsigned);
    const value = Number(looksLikeThousandSeparator ? unsigned.replace(/\./g, "") : unsigned);
    return Number.isFinite(value) ? sign * value : null;
  }

  const value = Number(unsigned);
  return Number.isFinite(value) ? sign * value : null;
}

function isLikelyYearToken(token: string, fullText: string): boolean {
  const digits = token.replace(/[^\d]/g, "");
  if (!/^\d{4}$/.test(digits)) return false;

  const year = Number(digits);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return false;

  return DATE_CONTEXT_RE.test(normalize(fullText));
}

function parseScaledAmount(raw: string): number | null {
  const normalized = stripDiacritics(raw).toLowerCase();
  const match = normalized.match(
    /(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(bilh(?:ao|oes)|bi|milh(?:ao|oes)|mi|mil|k)\b/,
  );
  if (!match?.[1] || !match?.[2]) return null;

  const base = parsePtBrNumber(match[1]);
  if (base === null) return null;

  const scaleToken = match[2];
  let multiplier = 1;
  if (scaleToken.startsWith("bilh") || scaleToken === "bi") {
    multiplier = 1_000_000_000;
  } else if (scaleToken.startsWith("milh") || scaleToken === "mi") {
    multiplier = 1_000_000;
  } else if (scaleToken === "mil" || scaleToken === "k") {
    multiplier = 1_000;
  }

  const scaled = base * multiplier;
  return Number.isFinite(scaled) ? scaled : null;
}

function parseAmount(text: string): number | null {
  const scaled = parseScaledAmount(text);
  if (scaled !== null) return scaled;

  const currencyMatch = text.match(/r\$\s*([\d.,]+)/i);
  if (currencyMatch?.[1]) {
    return parsePtBrNumber(currencyMatch[1]);
  }

  const scrubbedText = stripDiacritics(text)
    .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, " ")
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, " ")
    .replace(/\bdia\s+\d{1,2}\s+de\s+[a-z]+\b/gi, " ");

  const matches = [
    ...scrubbedText.matchAll(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+[.,]\d{1,2}|\d+)/g),
  ];
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index];
    const token = match[1];
    const start = match.index ?? 0;
    const before = start > 0 ? text[start - 1] : "";
    const after = start + token.length < text.length ? text[start + token.length] : "";
    const tail = text.slice(start + token.length);
    if (
      before === "/" ||
      after === "/" ||
      /^\s*x\b/i.test(tail) ||
      /^\s*parcelas?\b/i.test(tail) ||
      isLikelyYearToken(token, text)
    ) {
      continue;
    }

    const parsed = parsePtBrNumber(token);
    if (parsed !== null) return parsed;
  }

  return null;
}

function clampInstallments(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value <= 1) return null;
  return Math.max(2, Math.min(12, Math.floor(value)));
}

function parseInstallments(text: string): number | null {
  const match = text.match(/\b(\d{1,2})\s*x\b|\b(\d{1,2})\s*parcelas?\b/i);
  const raw = match?.[1] || match?.[2];
  if (!raw) return null;
  return clampInstallments(Number(raw));
}

function isYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
}

function shiftYmd(ymd: string, deltaDays: number): string {
  if (!isYmd(ymd)) return ymd;
  const date = new Date(`${ymd}T12:00:00`);
  date.setDate(date.getDate() + deltaDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseExplicitDate(text: string, today: string): string | null {
  const ymdMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (ymdMatch?.[1] && isYmd(ymdMatch[1])) return ymdMatch[1];

  const textMonthMatch = normalize(text).match(/\bdia\s+(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{2,4}))?\b/);
  if (textMonthMatch?.[1] && textMonthMatch[2]) {
    const day = Number(textMonthMatch[1]);
    const month = DATE_MONTHS[textMonthMatch[2]];
    const yearRaw = textMonthMatch[3];
    const currentYear = Number(today.slice(0, 4)) || new Date().getFullYear();
    const year = yearRaw
      ? Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw)
      : currentYear;

    if (month) {
      const check = new Date(Date.UTC(year, month - 1, day));
      if (check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day) {
        return `${year.toString().padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
  }

  const dmyMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (!dmyMatch) return null;

  const day = Number(dmyMatch[1]);
  const month = Number(dmyMatch[2]);
  const yearRaw = dmyMatch[3];
  const currentYear = Number(today.slice(0, 4)) || new Date().getFullYear();
  const year = yearRaw
    ? Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw)
    : currentYear;
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }
  return `${year.toString().padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function resolveDate(text: string, today: string): string {
  const normalized = normalize(text);
  if (normalized.includes("anteontem")) return shiftYmd(today, -2);
  if (normalized.includes("semana passada")) return shiftYmd(today, -7);
  if (normalized.includes("ontem")) return shiftYmd(today, -1);
  if (normalized.includes("amanha")) return shiftYmd(today, 1);
  if (normalized.includes("hoje")) return today;

  const explicit = parseExplicitDate(text, today);
  return explicit || today;
}

function detectType(text: string, hasAmount: boolean, installments: number | null): TransactionType | null {
  const normalized = normalize(text);

  if (/\bcartao de credito\b|\bno credito\b/.test(normalized)) {
    return "DESPESA";
  }

  const expenseScore = countKeywordMatches(normalized, EXPENSE_KEYWORDS);
  const incomeScore = countKeywordMatches(normalized, INCOME_KEYWORDS);
  const transferScore = countKeywordMatches(normalized, TRANSFER_KEYWORDS.filter((keyword) => keyword !== "pix"));
  const hasPix = /\bpix\b/.test(normalized);
  const hasPixTarget = hasPix && /\b(para|pra|pro)\s+[a-z0-9]/.test(normalized);
  const hasTransferContext =
    /\b(de|da|do).+\b(para|pra|pro)\b/.test(normalized) || /\b(origem|destino)\b/.test(normalized) || hasPixTarget;
  const hasExpenseContextWithPix =
    expenseScore > 0 ||
    /\b(mercado|padaria|ifood|uber|restaurante|farmacia|boleto|fatura)\b/.test(normalized);

  if (hasPixTarget && !hasExpenseContextWithPix) {
    return "TRANSFERENCIA";
  }

  if (hasPix && !hasTransferContext && expenseScore > 0) {
    return "DESPESA";
  }

  if (installments !== null) return "DESPESA";
  if (includesAny(normalized, CARD_KEYWORDS) && expenseScore >= incomeScore) return "DESPESA";

  if (transferScore > 0 || (hasPix && hasTransferContext)) {
    if (expenseScore > transferScore) return "DESPESA";
    return "TRANSFERENCIA";
  }

  if (expenseScore > incomeScore) return "DESPESA";
  if (incomeScore > 0) return "RECEITA";
  if (includesAny(normalized, EXPENSE_KEYWORDS)) return "DESPESA";
  return hasAmount ? null : null;
}

function findMentionInText(options: string[], text: string): string | null {
  const normalizedText = normalize(text);
  let best: string | null = null;
  let bestLength = 0;

  for (const option of options) {
    const candidate = normalize(option);
    if (!candidate) continue;
    if (normalizedText.includes(candidate) && candidate.length > bestLength) {
      best = option;
      bestLength = candidate.length;
    }
  }

  return best;
}

function parseTransferNames(
  text: string,
  accountNames: string[],
): { sourceName: string | null; destinationName: string | null } {
  const transferRegexes = [
    /\b(?:de|da|do)\s+(.+?)\s+\b(?:para|pra|pro)\s+(.+)$/i,
    /\b(?:origem)\s+(.+?)\s+\b(?:destino)\s+(.+)$/i,
  ];

  for (const regex of transferRegexes) {
    const match = text.match(regex);
    if (!match) continue;

    const sourceRaw = match[1].trim();
    const destinationRaw = match[2].trim();
    const sourceName = findMentionInText(accountNames, sourceRaw) || sourceRaw || null;
    const destinationName = findMentionInText(accountNames, destinationRaw) || destinationRaw || null;
    return { sourceName, destinationName };
  }

  const destinationOnlyMatch = text.match(/\b(?:para|pra|pro)\s+(.+)$/i);
  if (destinationOnlyMatch?.[1]) {
    const destinationRaw = destinationOnlyMatch[1].trim();
    const destinationName = findMentionInText(accountNames, destinationRaw) || destinationRaw || null;
    return { sourceName: null, destinationName };
  }

  const sourceOnlyMatch = text.match(/\b(?:de|da|do)\s+(.+)$/i);
  if (sourceOnlyMatch?.[1]) {
    const sourceRaw = sourceOnlyMatch[1].trim();
    const sourceName = findMentionInText(accountNames, sourceRaw) || sourceRaw || null;
    return { sourceName, destinationName: null };
  }

  const accountMention = findMentionInText(accountNames, text);
  return { sourceName: accountMention, destinationName: null };
}

function inferCategoryName(
  text: string,
  type: TransactionType,
  categories: AssistantParseRequest["categories"],
): string | null {
  const normalized = normalize(text);
  const typed = categories.filter((category) => category.type === type).map((category) => category.name);
  if (typed.length === 0) return null;

  const keywordMap: Record<string, string[]> = {
    alimentacao: [
      "ifood",
      "mercado",
      "restaurante",
      "comida",
      "almoco",
      "jantar",
      "lanche",
      "padaria",
      "pao",
      "sonho",
      "doce",
      "ovo",
      "pascoa",
      "chocolate",
      "cafeteria",
      "cafe",
      "salgado",
    ],
    transporte: ["uber", "99", "gasolina", "combustivel", "onibus", "metro", "estacionamento"],
    moradia: ["aluguel", "condominio", "luz", "agua", "internet", "moradia"],
    saude: ["farmacia", "medico", "consulta", "plano", "saude"],
    lazer: ["cinema", "show", "bar", "lazer", "viagem"],
    educacao: ["curso", "faculdade", "escola", "educacao", "livro"],
    pessoal: ["roupa", "salon", "salao", "cabelo", "pessoal"],
    salario: ["salario", "folha", "pagamento", "holerite"],
    investimentos: ["investi", "investimento", "aporte", "tesouro", "cdb", "acao", "fii"],
    transferencia: ["transfer", "pix"],
  };

  for (const categoryName of typed) {
    const normalizedCategory = normalize(categoryName);
    for (const [bucket, keywords] of Object.entries(keywordMap)) {
      if (!normalizedCategory.includes(bucket)) continue;
      if (keywords.some((keyword) => normalized.includes(keyword))) {
        return categoryName;
      }
    }
  }

  return null;
}

function toOtherAnswer(text: string, options?: FallbackOptions): string {
  if (GREETING_RE.test(text)) {
    return "Olá! Envie um gasto, uma entrada ou uma transferência e eu organizo para você.";
  }
  if (THANKS_RE.test(text)) {
    return "Perfeito. Quando quiser, seguimos com o próximo lançamento.";
  }
  if (HELP_RE.test(text)) {
    return 'Posso registrar entradas, saídas, transferências e compras parceladas. Exemplo: "Gastei 24,90 no Uber".';
  }

  if (options?.reason) {
    return 'Entendi. Se quiser, descreva em uma frase e eu organizo para você. Exemplo: "Gastei 42,90 no almoço".';
  }

  return 'Entendi. Quando quiser registrar, envie uma frase com valor e contexto. Exemplo: "Recebi 1.500 de salário".';
}

function buildClarification(type: TransactionType | null, hasAmount: boolean): string {
  if (!hasAmount) {
    return "Só preciso confirmar o valor. Quanto foi?";
  }
  if (!type) {
    return "Só preciso confirmar uma coisa: foi entrada, saída ou transferência?";
  }
  return "Preciso de um detalhe rápido para concluir.";
}

function detectSourceKind(
  text: string,
  type: TransactionType,
  installments: number | null,
  cardName: string | null,
): AssistantSourceKind {
  if (type === "TRANSFERENCIA" || type === "RECEITA") return "ACCOUNT";
  if (cardName || installments !== null) return "CARD";
  if (includesAny(normalize(text), CARD_KEYWORDS)) return "CARD";
  return "AUTO";
}

function buildConfidence(
  mode: "other" | "clarification" | "transaction",
  params: {
    hasSource?: boolean;
    hasDestination?: boolean;
    hasCategory?: boolean;
    hasReason?: boolean;
    sourceKind?: AssistantSourceKind;
  },
): { confidence: number; confidenceSignals: string[] } {
  if (mode === "other") {
    return {
      confidence: params.hasReason ? 0.6 : 0.78,
      confidenceSignals: params.hasReason ? ["fallback_reason"] : ["fallback_other"],
    };
  }

  if (mode === "clarification") {
    return {
      confidence: 0.46,
      confidenceSignals: ["fallback_clarification"],
    };
  }

  let confidence = 0.66;
  const signals: string[] = ["fallback_transaction"];

  if (params.hasSource) {
    confidence += 0.07;
  } else {
    signals.push("missing_source");
  }

  if (params.hasDestination) {
    confidence += 0.06;
  }

  if (params.hasCategory) {
    confidence += 0.08;
  } else {
    signals.push("generic_or_missing_category");
  }

  if (params.sourceKind === "AUTO") {
    confidence -= 0.06;
    signals.push("source_not_explicit");
  }

  return {
    confidence: Math.max(0, Math.min(1, confidence)),
    confidenceSignals: signals,
  };
}

export function buildFallbackParseResponse(
  payload: AssistantParseRequest,
  options?: FallbackOptions,
): AssistantParseResponse {
  const text = payload.text || "";
  const normalized = normalize(text);
  const hasTransactionSignal = TRANSACTION_HINT_RE.test(normalized);
  const amount = parseAmount(text);
  const installments = parseInstallments(text);
  const hasAmount = amount !== null && amount > 0;
  const type = detectType(text, hasAmount, installments);

  if (!hasTransactionSignal && !hasAmount) {
    const confidence = buildConfidence("other", { hasReason: !!options?.reason });
    return {
      intent: "OTHER",
      needsClarification: false,
      clarification: null,
      answer: toOtherAnswer(text, options),
      transaction: null,
      confidence: confidence.confidence,
      confidenceSignals: confidence.confidenceSignals,
    };
  }

  if (!hasAmount || !type) {
    const confidence = buildConfidence("clarification", {});
    return {
      intent: "TRANSACTION",
      needsClarification: true,
      clarification: buildClarification(type, hasAmount),
      answer: null,
      transaction: null,
      confidence: confidence.confidence,
      confidenceSignals: confidence.confidenceSignals,
    };
  }

  const accountNames = payload.accounts.map((account) => account.name);
  const cardNames = payload.cards.map((card) => card.name);
  const sourceAccountName = findMentionInText(accountNames, text);
  const sourceCardName = findMentionInText(cardNames, text);

  let sourceName: string | null = sourceCardName || sourceAccountName;
  let destinationName: string | null = null;

  if (type === "TRANSFERENCIA") {
    const parsedNames = parseTransferNames(text, accountNames);
    sourceName = parsedNames.sourceName;
    destinationName = parsedNames.destinationName;
  }

  const sourceKind = detectSourceKind(text, type, installments, sourceCardName);
  const date = resolveDate(text, payload.today);
  const description = inferSmartDescription(payload.text, type);
  const categoryName = inferCategoryName(text, type, payload.categories);
  const confidence = buildConfidence("transaction", {
    hasSource: !!sourceName,
    hasDestination: !!destinationName,
    hasCategory: !!categoryName,
    sourceKind,
  });

  return {
    intent: "TRANSACTION",
    needsClarification: false,
    clarification: null,
    answer: null,
    transaction: {
      type,
      amount: Number(amount.toFixed(2)),
      description,
      date,
      installments: type === "DESPESA" ? installments : null,
      sourceKind,
      sourceName,
      destinationName,
      categoryName,
    },
    confidence: confidence.confidence,
    confidenceSignals: confidence.confidenceSignals,
  };
}
