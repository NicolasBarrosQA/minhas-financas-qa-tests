import type { TransactionType } from "@/types/entities";
import { normalizeAzinhaText, sanitizeSmartDescription } from "./azinhaTextIntelligence";

type LearningRule = {
  id: string;
  type: TransactionType;
  tokens: string[];
  value: string;
  uses: number;
  updatedAt: string;
};

type LearningStore = {
  version: 1;
  categories: LearningRule[];
  descriptions: LearningRule[];
};

const STORAGE_KEY = "azinha-learning-v1";
const MAX_RULES_PER_BUCKET = 120;

const STOPWORDS = new Set([
  "a",
  "o",
  "os",
  "as",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "para",
  "por",
  "com",
  "sem",
  "um",
  "uma",
  "uns",
  "umas",
  "eu",
  "foi",
  "fui",
  "gastei",
  "gastar",
  "paguei",
  "pagar",
  "comprei",
  "comprar",
  "recebi",
  "receber",
  "ganhei",
  "ganhar",
  "transferi",
  "transferir",
  "transferencia",
  "fiz",
  "hoje",
  "ontem",
  "amanha",
  "cartao",
  "conta",
  "pix",
  "reais",
  "real",
  "rs",
  "r",
  "e",
  "ou",
  "que",
  "isso",
  "esse",
  "essa",
  "nao",
]);

function createInitialStore(): LearningStore {
  return {
    version: 1,
    categories: [],
    descriptions: [],
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStore(): LearningStore {
  if (typeof window === "undefined") return createInitialStore();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialStore();
    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed)) return createInitialStore();

    const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
    const descriptions = Array.isArray(parsed.descriptions) ? parsed.descriptions : [];

    const sanitizeRules = (input: unknown[]): LearningRule[] =>
      input
        .map((item) => {
          if (!isObject(item)) return null;
          const id = typeof item.id === "string" && item.id ? item.id : "";
          const typeRaw = typeof item.type === "string" ? item.type.toUpperCase() : "";
          const type: TransactionType =
            typeRaw === "RECEITA" || typeRaw === "TRANSFERENCIA" ? typeRaw : "DESPESA";
          const tokens = Array.isArray(item.tokens)
            ? item.tokens.filter((token): token is string => typeof token === "string" && token.trim().length > 1)
            : [];
          const value = typeof item.value === "string" ? item.value.trim() : "";
          if (!id || tokens.length === 0 || !value) return null;

          return {
            id,
            type,
            tokens: [...new Set(tokens)],
            value,
            uses: Number.isFinite(Number(item.uses)) ? Math.max(1, Math.floor(Number(item.uses))) : 1,
            updatedAt:
              typeof item.updatedAt === "string" && item.updatedAt
                ? item.updatedAt
                : new Date().toISOString(),
          };
        })
        .filter((item): item is LearningRule => !!item)
        .slice(-MAX_RULES_PER_BUCKET);

    return {
      version: 1,
      categories: sanitizeRules(categories),
      descriptions: sanitizeRules(descriptions),
    };
  } catch {
    return createInitialStore();
  }
}

function writeStore(store: LearningStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage failures.
  }
}

function extractMeaningfulTokens(text: string): string[] {
  const normalized = normalizeAzinhaText(text)
    .replace(/\br\$\s*/g, " ")
    .replace(/\d+(?:[.,]\d+)?/g, " ");

  const tokens = normalized
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));

  return [...new Set(tokens)].slice(0, 7);
}

function ruleId(type: TransactionType, tokens: string[]): string {
  return `${type}:${tokens.join("|")}`;
}

function upsertRule(list: LearningRule[], type: TransactionType, text: string, value: string): LearningRule[] {
  const tokens = extractMeaningfulTokens(text);
  const normalizedValue = value.trim();
  if (tokens.length === 0 || !normalizedValue) return list;

  const id = ruleId(type, tokens);
  const index = list.findIndex((item) => item.id === id);
  const now = new Date().toISOString();

  if (index >= 0) {
    const updated: LearningRule = {
      ...list[index],
      value: normalizedValue,
      uses: list[index].uses + 1,
      updatedAt: now,
    };

    return list.map((item, itemIndex) => (itemIndex === index ? updated : item));
  }

  const nextRule: LearningRule = {
    id,
    type,
    tokens,
    value: normalizedValue,
    uses: 1,
    updatedAt: now,
  };

  return [...list, nextRule].slice(-MAX_RULES_PER_BUCKET);
}

function scoreRule(rule: LearningRule, inputTokens: string[]): number {
  const overlapCount = rule.tokens.filter((token) => inputTokens.includes(token)).length;
  if (overlapCount === 0) return 0;

  const minimumOverlap =
    rule.tokens.length > 1 && inputTokens.length > 1 ? 2 : 1;
  if (overlapCount < minimumOverlap) return 0;

  const overlapRule = overlapCount / rule.tokens.length;
  const overlapInput = overlapCount / inputTokens.length;
  const usesBonus = Math.min(0.2, rule.uses * 0.02);
  return overlapRule * 0.75 + overlapInput * 0.25 + usesBonus;
}

function findBestRule(list: LearningRule[], type: TransactionType, text: string): LearningRule | null {
  const inputTokens = extractMeaningfulTokens(text);
  if (inputTokens.length === 0) return null;

  let best: LearningRule | null = null;
  let bestScore = 0;

  for (const rule of list) {
    if (rule.type !== type) continue;
    const score = scoreRule(rule, inputTokens);
    if (score > bestScore) {
      best = rule;
      bestScore = score;
    }
  }

  return bestScore >= 0.62 ? best : null;
}

export function learnAzinhaCategoryCorrection(
  originalText: string,
  type: TransactionType,
  correctedCategoryName: string,
): void {
  const store = readStore();
  store.categories = upsertRule(store.categories, type, originalText, correctedCategoryName);
  writeStore(store);
}

export function learnAzinhaDescriptionCorrection(
  originalText: string,
  type: TransactionType,
  correctedDescription: string,
): void {
  const store = readStore();
  const safeDescription = sanitizeSmartDescription(correctedDescription, originalText, type);
  if (!safeDescription) return;

  store.descriptions = upsertRule(store.descriptions, type, originalText, safeDescription);
  writeStore(store);
}

export function suggestLearnedCategory(
  originalText: string,
  type: TransactionType,
): string | null {
  const store = readStore();
  const rule = findBestRule(store.categories, type, originalText);
  return rule?.value || null;
}

export function suggestLearnedDescription(
  originalText: string,
  type: TransactionType,
): string | null {
  const store = readStore();
  const rule = findBestRule(store.descriptions, type, originalText);
  return rule?.value || null;
}
