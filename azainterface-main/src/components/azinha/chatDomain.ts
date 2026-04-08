import type { AssistantParsedTransaction } from "@/services/azinhaAssistant";
import type { DecisionTag } from "@/services/azinhaDecisionEngine";
import type { Account, Card, Category, Transaction, TransactionType } from "@/types/entities";

export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "azinha";
  timestamp: Date;
}

export type ViewportSize = {
  width: number;
  height: number;
};

export type PendingTransactionDraft = {
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  installments?: number;
  accountId?: string;
  cardId?: string;
  transferToAccountId?: string;
  categoryId?: string;
  _meta?: {
    sourceText: string;
    initialDescription: string;
    initialCategoryId?: string;
    parseConfidence: number;
    pendingDecisionTag?: DecisionTag;
  };
};

export type PendingClarificationState = {
  sourceText: string;
  type?: TransactionType;
  amount?: number;
  expected?: ClarificationExpectation;
  prompt?: string;
};

export type ClarificationExpectation =
  | "type"
  | "amount"
  | "account_or_card"
  | "transfer_accounts"
  | "detail";

export const TIMEZONE = "America/Sao_Paulo";
const FAB_SIZE = 48;
const FAB_MARGIN = 16;
const FAB_DEFAULT_BOTTOM_SPACE = 112;
const FALLBACK_VIEWPORT: ViewportSize = { width: 390, height: 844 };

export const EXAMPLE_PROMPTS = [
  "Gastei 120 no mercado",
  "Recebi 3500 de salário",
  "Transferi 200 da Nubank para Inter",
  "Comprei um tênis de 600 em 3x no cartão",
];

export function createMessage(sender: ChatMessage["sender"], text: string): ChatMessage {
  return {
    id: `${sender}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    sender,
    text,
    timestamp: new Date(),
  };
}

export function getWelcomeMessages(): ChatMessage[] {
  return [
    createMessage(
      "azinha",
      [
        "Olá! Eu sou a Azinha, seu copiloto financeiro.",
        "Me conte o que você gastou, recebeu ou transferiu e eu organizo tudo para revisão antes de salvar.",
        "Exemplo: \"Comprei R$ 120 em 3x no cartão\".",
      ].join("\n"),
    ),
  ];
}

export function removeDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeText(value: string): string {
  return removeDiacritics(value).toLowerCase().replace(/\s+/g, " ").trim();
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatTypeLabel(type: TransactionType): string {
  if (type === "RECEITA") return "Entrada";
  if (type === "DESPESA") return "Saída";
  return "Transferência";
}

export function toYmdInTimezone(timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function isYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
}

export function parseDateInput(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (isYmd(value)) return value;

  const match = value.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const yearPart = match[3];
  const currentYear = new Date().getFullYear();
  let year = currentYear;
  if (yearPart) {
    year = Number(yearPart.length === 2 ? `20${yearPart}` : yearPart);
  }

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return `${year.toString().padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parsePtBrNumber(raw: string): number | null {
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

export function parseScaledAmount(raw: string): number | null {
  const normalized = removeDiacritics(raw).toLowerCase();
  const match = normalized.match(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(bilh(?:ao|oes)|bi|milh(?:ao|oes)|mi|mil|k)\b/);
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

export function parseAmountInput(input: string): number | null {
  const scaled = parseScaledAmount(input);
  if (scaled !== null) return scaled;

  const currencyMatch = input.match(/r\$\s*([\d.,]+)/i);
  if (currencyMatch?.[1]) {
    return parsePtBrNumber(currencyMatch[1]);
  }

  const scrubbedInput = removeDiacritics(input)
    .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, " ")
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, " ")
    .replace(/\bdia\s+\d{1,2}\s+de\s+[a-z]+\b/gi, " ");

  const matches = [
    ...scrubbedInput.matchAll(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+[.,]\d{1,2}|\d+)/g),
  ];

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const token = matches[index]?.[1];
    if (!token) continue;

    const year = Number(token.replace(/[^\d]/g, ""));
    const looksLikeYear =
      /^\d{4}$/.test(token.replace(/[^\d]/g, "")) &&
      Number.isFinite(year) &&
      year >= 1900 &&
      year <= 2100 &&
      /\b(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|ano|mes|m[eê]s|semana)\b/i.test(
        removeDiacritics(input).toLowerCase(),
      );

    if (looksLikeYear) continue;

    const parsed = parsePtBrNumber(token);
    if (parsed !== null) return parsed;
  }

  return null;
}

export function formatDateLabel(ymd: string): string {
  if (!isYmd(ymd)) return ymd;
  return new Date(`${ymd}T12:00:00`).toLocaleDateString("pt-BR");
}

export function getViewportSize(): ViewportSize {
  if (typeof window === "undefined") return FALLBACK_VIEWPORT;
  return { width: window.innerWidth, height: window.innerHeight };
}

export function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getFabBounds(viewport: ViewportSize) {
  return {
    minX: FAB_MARGIN,
    maxX: Math.max(FAB_MARGIN, viewport.width - FAB_SIZE - FAB_MARGIN),
    minY: FAB_MARGIN,
    maxY: Math.max(FAB_MARGIN, viewport.height - FAB_SIZE - FAB_MARGIN),
  };
}

export function getDefaultFabPosition(viewport: ViewportSize) {
  const bounds = getFabBounds(viewport);
  return {
    x: bounds.maxX,
    y: clampValue(viewport.height - FAB_SIZE - FAB_DEFAULT_BOTTOM_SPACE, bounds.minY, bounds.maxY),
  };
}

export function clampFabPosition(position: { x: number; y: number }, viewport: ViewportSize) {
  const bounds = getFabBounds(viewport);
  return {
    x: clampValue(position.x, bounds.minX, bounds.maxX),
    y: clampValue(position.y, bounds.minY, bounds.maxY),
  };
}

export function getAccountDisplayName(account: Account): string {
  return account.institution ? `${account.name} (${account.institution})` : account.name;
}

export function getCardDisplayName(card: Card): string {
  const suffix = card.lastFourDigits ? ` •••• ${card.lastFourDigits}` : "";
  const brand = card.brand ? ` (${card.brand})` : "";
  return `${card.name}${brand}${suffix}`;
}

export function findBestMatch<T>(
  items: T[],
  query: string,
  getCandidateTexts: (item: T) => string[],
): T | undefined {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return undefined;

  let bestScore = -1;
  let bestItem: T | undefined;

  for (const item of items) {
    const texts = getCandidateTexts(item).map(normalizeText).filter(Boolean);
    let score = 0;

    for (const text of texts) {
      if (text === normalizedQuery) {
        score = Math.max(score, 100);
      } else if (text.startsWith(normalizedQuery)) {
        score = Math.max(score, 80);
      } else if (text.includes(normalizedQuery)) {
        score = Math.max(score, 65);
      } else if (normalizedQuery.includes(text) && text.length >= 4) {
        score = Math.max(score, 55);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestScore >= 55 ? bestItem : undefined;
}

export function findAccountByName(accounts: Account[], name: string): Account | undefined {
  return findBestMatch(accounts, name, (account) => [account.name, getAccountDisplayName(account), account.institution || ""]);
}

export function findCardByName(cards: Card[], name: string): Card | undefined {
  return findBestMatch(cards, name, (card) => [
    card.name,
    getCardDisplayName(card),
    card.brand || "",
    card.lastFourDigits ? `final ${card.lastFourDigits}` : "",
  ]);
}

export function findCategoryByName(categories: Category[], type: TransactionType, name: string): Category | undefined {
  return findBestMatch(
    categories.filter((category) => category.type === type),
    name,
    (category) => [category.name],
  );
}

export function getDefaultCategory(categories: Category[], type: TransactionType): Category | undefined {
  const typed = categories.filter((category) => category.type === type);
  if (typed.length === 0) return undefined;

  const otherCategory = typed.find((category) => normalizeText(category.name) === "outros");
  return otherCategory || typed[0];
}

export function getLastUsedAccount(transactions: Transaction[], accounts: Account[]): Account | undefined {
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  for (const transaction of transactions) {
    if (transaction.accountId && accountMap.has(transaction.accountId)) {
      return accountMap.get(transaction.accountId);
    }
  }
  return undefined;
}

export function getLastUsedCard(transactions: Transaction[], cards: Card[]): Card | undefined {
  const cardMap = new Map(cards.map((card) => [card.id, card]));
  for (const transaction of transactions) {
    if (transaction.cardId && cardMap.has(transaction.cardId)) {
      return cardMap.get(transaction.cardId);
    }
  }
  return undefined;
}

export function getPrimaryAccounts(accounts: Account[], transactions: Transaction[]) {
  const usage = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.accountId) {
      usage.set(transaction.accountId, (usage.get(transaction.accountId) || 0) + 1);
    }
    if (transaction.transferToAccountId) {
      usage.set(transaction.transferToAccountId, (usage.get(transaction.transferToAccountId) || 0) + 1);
    }
  }

  const ordered = [...accounts].sort((a, b) => {
    const usageDiff = (usage.get(b.id) || 0) - (usage.get(a.id) || 0);
    if (usageDiff !== 0) return usageDiff;
    return Number(b.balance || 0) - Number(a.balance || 0);
  });

  return {
    primary: ordered[0],
    secondary: ordered.find((account) => account.id !== ordered[0]?.id),
  };
}

export function clampInstallments(value: number | null | undefined): number {
  if (!value || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(12, Math.floor(value)));
}

export function resolveDraftFromParsed(
  parsed: AssistantParsedTransaction,
  params: {
    accounts: Account[];
    cards: Card[];
    categories: Category[];
    recentTransactions: Transaction[];
    todayYmd: string;
  },
): { draft: PendingTransactionDraft | null; clarification: string | null } {
  const accounts = params.accounts.filter((account) => !account.isArchived);
  const cards = params.cards.filter((card) => !card.isArchived);
  const categories = params.categories;
  const lastUsedAccount = getLastUsedAccount(params.recentTransactions, accounts);
  const lastUsedCard = getLastUsedCard(params.recentTransactions, cards);
  const { primary, secondary } = getPrimaryAccounts(accounts, params.recentTransactions);
  const fallbackAccount = lastUsedAccount || primary;
  const fallbackCard = lastUsedCard || cards[0];

  const amount = Number(parsed.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      draft: null,
      clarification: "Só preciso de um valor válido. Exemplo: \"gastei 120 no mercado\".",
    };
  }

  const date = isYmd(parsed.date) ? parsed.date : params.todayYmd;
  const description = parsed.description?.trim() || "Lançamento via Azinha";
  const category = parsed.categoryName
    ? findCategoryByName(categories, parsed.type, parsed.categoryName)
    : getDefaultCategory(categories, parsed.type);

  if (parsed.type === "RECEITA") {
    const namedAccount = parsed.sourceName ? findAccountByName(accounts, parsed.sourceName) : undefined;
    const targetAccount = namedAccount || fallbackAccount;
    if (!targetAccount) {
      return {
        draft: null,
        clarification: "Para registrar essa entrada, preciso de pelo menos uma conta cadastrada.",
      };
    }

    return {
      draft: {
        type: "RECEITA",
        amount,
        description,
        date,
        accountId: targetAccount.id,
        categoryId: category?.id,
      },
      clarification: null,
    };
  }

  if (parsed.type === "DESPESA") {
    const namedAccount = parsed.sourceName ? findAccountByName(accounts, parsed.sourceName) : undefined;
    const namedCard = parsed.sourceName ? findCardByName(cards, parsed.sourceName) : undefined;
    const installments = clampInstallments(parsed.installments);

    if (
      parsed.sourceName &&
      namedAccount &&
      namedCard &&
      parsed.sourceKind === "AUTO" &&
      installments <= 1
    ) {
      return {
        draft: null,
        clarification: `Só preciso confirmar: "${parsed.sourceName}" é a conta ${getAccountDisplayName(namedAccount)} ou o cartão ${getCardDisplayName(namedCard)}?`,
      };
    }

    const shouldUseCard = installments > 1 || parsed.sourceKind === "CARD" || (!!namedCard && !namedAccount);

    if (shouldUseCard) {
      const targetCard = namedCard || fallbackCard;
      if (!targetCard) {
        return {
          draft: null,
          clarification: "Para essa saída no cartão, preciso de pelo menos um cartão cadastrado.",
        };
      }

      return {
        draft: {
          type: "DESPESA",
          amount,
          description,
          date,
          cardId: targetCard.id,
          installments: installments > 1 ? installments : undefined,
          categoryId: category?.id,
        },
        clarification: null,
      };
    }

    const targetAccount = namedAccount || fallbackAccount;
    if (!targetAccount) {
      return {
        draft: null,
        clarification: "Para essa saída em conta, preciso de pelo menos uma conta cadastrada.",
      };
    }

    return {
      draft: {
        type: "DESPESA",
        amount,
        description,
        date,
        accountId: targetAccount.id,
        categoryId: category?.id,
      },
      clarification: null,
    };
  }

  const namedSource = parsed.sourceName ? findAccountByName(accounts, parsed.sourceName) : undefined;
  const namedDestination = parsed.destinationName ? findAccountByName(accounts, parsed.destinationName) : undefined;

  let sourceAccount = namedSource || fallbackAccount;
  let destinationAccount = namedDestination || secondary;

  if (!destinationAccount && sourceAccount) {
    destinationAccount = accounts.find((account) => account.id !== sourceAccount?.id);
  }
  if (!sourceAccount && destinationAccount) {
    sourceAccount = accounts.find((account) => account.id !== destinationAccount?.id);
  }

  if (!sourceAccount || !destinationAccount) {
    return {
      draft: null,
      clarification: "Só preciso confirmar uma coisa: qual é a conta de origem e qual é a de destino?",
    };
  }

  if (sourceAccount.id === destinationAccount.id) {
    const otherAccount = accounts.find((account) => account.id !== sourceAccount?.id);
    if (!otherAccount) {
      return {
        draft: null,
        clarification: "Fiquei em dúvida: encontrei apenas uma conta válida para transferência.",
      };
    }
    destinationAccount = otherAccount;
  }

  return {
    draft: {
      type: "TRANSFERENCIA",
      amount,
      description,
      date,
      accountId: sourceAccount.id,
      transferToAccountId: destinationAccount.id,
      categoryId: category?.id,
    },
    clarification: null,
  };
}

export function buildDraftSummary(
  draft: PendingTransactionDraft,
  maps: {
    accountById: Map<string, Account>;
    cardById: Map<string, Card>;
    categoryById: Map<string, Category>;
  },
): string {
  const lines: string[] = [];
  lines.push("Perfeito. Posso salvar assim:");
  lines.push(`- Tipo: ${formatTypeLabel(draft.type)}`);
  lines.push(`- Valor: ${formatCurrency(draft.amount)}`);
  lines.push(`- Data: ${formatDateLabel(draft.date)}`);

  if (draft.type === "TRANSFERENCIA") {
    const from = draft.accountId ? maps.accountById.get(draft.accountId) : undefined;
    const to = draft.transferToAccountId ? maps.accountById.get(draft.transferToAccountId) : undefined;
    lines.push(`- Origem: ${from ? getAccountDisplayName(from) : "Não definida"}`);
    lines.push(`- Destino: ${to ? getAccountDisplayName(to) : "Não definido"}`);
  } else if (draft.cardId) {
    const card = maps.cardById.get(draft.cardId);
    lines.push(`- Cartão: ${card ? getCardDisplayName(card) : "Não definido"}`);
  } else {
    const account = draft.accountId ? maps.accountById.get(draft.accountId) : undefined;
    lines.push(`- Conta: ${account ? getAccountDisplayName(account) : "Não definida"}`);
  }

  if (draft.installments && draft.installments > 1) {
    lines.push(`- Parcelas: ${draft.installments}x`);
  }

  const category = draft.categoryId ? maps.categoryById.get(draft.categoryId) : undefined;
  if (category) {
    lines.push(`- Categoria: ${category.name}`);
  }

  lines.push(`- Descrição: ${draft.description}`);
  lines.push('Se estiver certo, responda "confirmar". Para descartar, responda "cancelar".');
  return lines.join("\n");
}

export function buildDraftValidationMessage(
  draft: PendingTransactionDraft,
  maps: {
    accountById: Map<string, Account>;
    cardById: Map<string, Card>;
  },
): string | null {
  if (!Number.isFinite(draft.amount) || draft.amount <= 0) {
    return "O valor precisa ser maior que zero antes de salvar.";
  }

  if (!isYmd(draft.date)) {
    return "A data ficou inválida. Ajuste para DD/MM/AAAA ou YYYY-MM-DD.";
  }

  const safeDescription = draft.description?.trim() || "";
  if (safeDescription.length < 3) {
    return "A descrição está curta demais. Envie ao menos 3 caracteres.";
  }

  if (draft.type === "RECEITA") {
    if (!draft.accountId || !maps.accountById.has(draft.accountId)) {
      return "Para registrar entrada, preciso de uma conta válida.";
    }
    return null;
  }

  if (draft.type === "DESPESA") {
    if (draft.cardId && !maps.cardById.has(draft.cardId)) {
      return "O cartão informado não está válido.";
    }
    if (draft.accountId && !maps.accountById.has(draft.accountId)) {
      return "A conta informada não está válida.";
    }
    if (!draft.cardId && !draft.accountId) {
      return "Para saída, preciso de conta ou cartão.";
    }
    if (draft.installments && draft.installments > 1 && !draft.cardId) {
      return "Parcelamento exige um cartão definido.";
    }
    return null;
  }

  if (!draft.accountId || !draft.transferToAccountId) {
    return "Para transferência, preciso de origem e destino.";
  }

  if (!maps.accountById.has(draft.accountId) || !maps.accountById.has(draft.transferToAccountId)) {
    return "A origem ou o destino da transferência ficou inválido.";
  }

  if (draft.accountId === draft.transferToAccountId) {
    return "Em transferência, origem e destino precisam ser contas diferentes.";
  }

  return null;
}

export function buildLowConfidenceIntro(
  confidence: number,
  draft: PendingTransactionDraft,
): string {
  const confidencePct = Math.round(confidence * 100);
  const prefix = `Entendi, mas minha confiança está em ${confidencePct}%.`;

  if (draft.type === "DESPESA" && !draft.categoryId) {
    return `${prefix} Só preciso confirmar a categoria antes de salvar.`;
  }

  if (draft.type === "DESPESA" && !draft.accountId && !draft.cardId) {
    return `${prefix} Só preciso confirmar se essa saída foi na conta ou no cartão.`;
  }

  if (draft.type === "TRANSFERENCIA" && (!draft.accountId || !draft.transferToAccountId)) {
    return `${prefix} Só preciso confirmar a conta de origem e a conta de destino.`;
  }

  return `${prefix} Revise o resumo e confirme se está correto.`;
}

export function parseTypeValue(input: string): TransactionType | null {
  const normalized = normalizeText(input);
  if (!normalized) return null;

  if (/\b(receita|entrada|ganho|credito)\b/.test(normalized)) {
    return "RECEITA";
  }

  if (/\b(despesa|saida|gasto|compra|debito|paguei|pagei|comi|perdi)\b/.test(normalized)) {
    return "DESPESA";
  }

  if (/\b(transferencia|transferência|transfer|pix)\b/.test(normalized)) {
    return "TRANSFERENCIA";
  }

  return null;
}

export function extractClarificationHints(input: string): { type?: TransactionType; amount?: number } {
  const type = parseTypeValue(input) || undefined;
  const amountRaw = parseAmountInput(input);
  const amount = amountRaw && amountRaw > 0 ? Number(amountRaw.toFixed(2)) : undefined;
  return { type, amount };
}

export function inferClarificationExpectation(prompt: string | null | undefined): ClarificationExpectation | null {
  const normalized = normalizeText(prompt || "");
  if (!normalized) return null;

  if (/\b(valor|quanto foi|maior que zero)\b/.test(normalized)) return "amount";
  if (/\b(entrada|saida|transferencia|tipo)\b/.test(normalized)) return "type";
  if (/\b(origem|destino)\b/.test(normalized)) return "transfer_accounts";
  if (/\b(conta|cartao)\b/.test(normalized)) return "account_or_card";
  return "detail";
}

export function expectationFromDecisionTag(tag: DecisionTag | null | undefined): ClarificationExpectation | undefined {
  if (tag === "amount_needed") return "amount";
  if (tag === "type_needed") return "type";
  if (tag === "source_needed") return "account_or_card";
  if (tag === "transfer_accounts_needed") return "transfer_accounts";
  return undefined;
}

export function createPendingClarificationState(
  sourceText: string,
  options: {
    type?: TransactionType;
    amount?: number;
    prompt?: string | null;
    expected?: ClarificationExpectation;
  } = {},
): PendingClarificationState {
  const expectedFromPrompt = inferClarificationExpectation(options.prompt);
  const expected =
    options.expected ||
    expectedFromPrompt ||
    (!options.amount ? "amount" : !options.type ? "type" : "detail");

  return {
    sourceText: sourceText.trim(),
    type: options.type,
    amount: options.amount,
    expected,
    prompt: options.prompt || undefined,
  };
}

export function getClarificationQuestion(state: PendingClarificationState): string {
  if (state.prompt && state.expected !== "type" && state.expected !== "amount") {
    return state.prompt;
  }

  if (state.expected === "account_or_card") {
    return "Só preciso confirmar: foi na conta ou no cartão?";
  }

  if (state.expected === "transfer_accounts") {
    return "Só preciso confirmar a conta de origem e a conta de destino.";
  }

  if (!state.amount || state.amount <= 0) {
    return "Só preciso confirmar o valor. Quanto foi?";
  }
  if (!state.type) {
    return "Só preciso confirmar uma coisa: foi entrada, saída ou transferência?";
  }
  return "Preciso de um detalhe rápido para concluir.";
}

export function buildClarificationMergedText(state: PendingClarificationState): string {
  const typeLabel = state.type === "RECEITA"
    ? "entrada"
    : state.type === "TRANSFERENCIA"
      ? "transferência"
      : "saída";
  return `${typeLabel} de ${state.amount}. ${state.sourceText}`;
}

export function clearPendingDecisionTag(draft: PendingTransactionDraft): PendingTransactionDraft {
  if (!draft._meta) return draft;
  return {
    ...draft,
    _meta: {
      ...draft._meta,
      pendingDecisionTag: undefined,
    },
  };
}

export function getLocalQuickReply(input: string): string | null {
  const normalized = normalizeText(input);
  if (!normalized) return null;

  const hasTransactionSignal =
    /\d|r\$|real|pix|transfer|gastei|recebi|comprei|paguei|pagei|comi|cartao|parcela|entrada|saida|despesa|receita|fatura|deposit|saque|mercado|uber|ifood/.test(
      normalized,
    );

  if (hasTransactionSignal) return null;

  if (/\b(oi|ola|opa|e ai|eae|beleza|bom dia|boa tarde|boa noite)\b/.test(normalized)) {
    return "Olá! Envie um gasto, uma entrada ou uma transferência e eu organizo para você.";
  }

  if (/\b(obrigad[oa]?|valeu|tmj|tamo junto)\b/.test(normalized)) {
    return "Perfeito. Sempre à disposição.";
  }

  if (/\b(ajuda|como funciona|o que voce faz|oque voce faz)\b/.test(normalized)) {
    return 'Posso registrar entradas, saídas, transferências e compras parceladas. Exemplo: "Gastei 42,90 no iFood".';
  }

  if (/\b(duvida|dúvida)\b/.test(normalized)) {
    return 'Posso ajudar no registro. Escreva em uma frase, por exemplo: "Comprei pão por 5 reais".';
  }

  if (/\b(economizar|economia|guardar dinheiro|poupar)\b/.test(normalized)) {
    return [
      "Posso te ajudar a economizar com passos práticos.",
      "Se quiser, começo montando um plano simples a partir dos seus últimos lançamentos.",
    ].join("\n");
  }

  if (/\b(divida|endividad[oa]|atrasad[oa]|juros)\b/.test(normalized)) {
    return [
      "Consigo te ajudar a organizar isso sem complicar.",
      "Se você me passar os valores principais, eu te ajudo a priorizar por impacto.",
    ].join("\n");
  }

  if (/\b(nao quero|prefiro nao|agora nao|depois)\b/.test(normalized)) {
    return "Tudo bem. Quando quiser, envie um lançamento e eu organizo para você.";
  }

  return null;
}

export function looksLikeTransactionSentence(input: string): boolean {
  const normalized = normalizeText(input);
  if (!normalized) return false;

  const hasVerbOrFinanceHint =
    /\b(gastei|gastar|paguei|pagei|pagar|comprei|comprar|comi|comer|recebi|receber|ganhei|ganhar|transferi|transferir|pix|mercado|uber|ifood|salario|fatura|entrada|saida|despesa|receita|boleto|assinatura|mensalidade|investi|aporte|saquei)\b/.test(
      normalized,
    );
  if (hasVerbOrFinanceHint) return true;

  const hasAmount = /\b\d+(?:[.,]\d+)?\b/.test(normalized);
  const hasContextHint = /\b(no|na|de|do|da|para|pro|pra|cartao|conta|pix)\b/.test(normalized);
  return hasAmount && hasContextHint;
}


