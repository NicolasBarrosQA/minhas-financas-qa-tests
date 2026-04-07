import type { AssistantParseResponse } from "./azinhaAssistant";

export type DecisionTier = "high" | "medium" | "low";
export type DecisionAction = "confirm" | "ask" | "rewrite";

export type DecisionTag =
  | "amount_needed"
  | "type_needed"
  | "category_needed"
  | "source_needed"
  | "transfer_accounts_needed"
  | "person_vs_transfer"
  | "entity_person_or_item"
  | "rewrite_needed";

export type DecisionSlot = {
  field: "type" | "amount" | "category" | "source" | "destination" | "description" | "date";
  status: "ok" | "missing" | "ambiguous";
  reason: string;
  priority: number;
  question?: string;
  tag?: DecisionTag;
};

export interface AzinhaDecisionInput {
  userText: string;
  response: AssistantParseResponse;
  draft: {
    type: "RECEITA" | "DESPESA" | "TRANSFERENCIA";
    amount: number;
    description: string;
    date: string;
    accountId?: string;
    cardId?: string;
    transferToAccountId?: string;
    categoryId?: string;
  } | null;
  validationMessage: string | null;
}

export interface AzinhaDecisionResult {
  tier: DecisionTier;
  action: DecisionAction;
  reason: string;
  question: string | null;
  tag: DecisionTag | null;
  slots: DecisionSlot[];
}

const AMBIGUOUS_ENTITY_WORDS = new Set([
  "carolina",
]);

const TRANSFER_HINT_RE = /\b(transfer|transferi|transferencia|pix|enviei|depositei)\b/i;
const PERSON_HINT_RE = /\b(pro|pra|para)\s+[a-zà-ú]{3,}\b/i;
const ENTITY_HINT_RE = /\b(?:em|no|na)\s+(?:(?:um|uma)\s+)?([a-z]{3,})\b/i;
const NUMBER_RE = /\b\d+(?:[.,]\d+)?\b/;
const NON_PERSON_TARGETS = new Set([
  "mercado",
  "padaria",
  "ifood",
  "uber",
  "restaurante",
  "aluguel",
  "farmacia",
  "plano",
  "saude",
  "seguro",
  "internet",
  "energia",
  "agua",
  "condominio",
  "escola",
  "faculdade",
  "curso",
  "academia",
  "cartao",
  "credito",
  "debito",
  "boleto",
  "fatura",
]);

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericCategory(value: string | null | undefined): boolean {
  const normalized = normalize(value || "");
  return !normalized || normalized === "outros" || normalized === "geral" || normalized === "other";
}

function hasLikelyPersonReference(normalizedText: string): boolean {
  const match = normalizedText.match(/\b(pro|pra|para)\s+([a-z]{3,})\b/);
  const candidate = match?.[2];
  if (!candidate) return false;
  if (NON_PERSON_TARGETS.has(candidate)) return false;
  return true;
}

function buildSlots(input: AzinhaDecisionInput): DecisionSlot[] {
  const slots: DecisionSlot[] = [];
  const normalizedText = normalize(input.userText);

  if (input.validationMessage) {
    slots.push({
      field: "amount",
      status: "missing",
      reason: "validation_failed",
      priority: 0,
      question: input.validationMessage,
      tag: "rewrite_needed",
    });
    return slots;
  }

  if (input.response.intent !== "TRANSACTION") {
    return slots;
  }

  if (!input.response.transaction) {
    const hasNumber = NUMBER_RE.test(normalizedText);
    if (!hasNumber) {
      slots.push({
        field: "amount",
        status: "missing",
        reason: "amount_missing",
        priority: 0,
        question: "Só preciso confirmar o valor para continuar.",
        tag: "amount_needed",
      });
    } else {
      slots.push({
        field: "type",
        status: "missing",
        reason: "type_missing",
        priority: 0,
        question: "Só preciso confirmar: foi entrada, saída ou transferência?",
        tag: "type_needed",
      });
    }
    return slots;
  }

  const tx = input.response.transaction;

  if (tx.amount <= 0) {
    slots.push({
      field: "amount",
      status: "missing",
      reason: "invalid_amount",
      priority: 0,
      question: "Só preciso de um valor maior que zero.",
      tag: "amount_needed",
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) {
    slots.push({
      field: "date",
      status: "ambiguous",
      reason: "invalid_date",
      priority: 3,
      question: "Só preciso confirmar a data do lançamento.",
      tag: "rewrite_needed",
    });
  }

  if (!tx.description || tx.description.trim().length < 3) {
    slots.push({
      field: "description",
      status: "missing",
      reason: "short_description",
      priority: 2,
      question: "Só preciso de uma descrição curta para identificar o lançamento.",
      tag: "rewrite_needed",
    });
  }

  if (tx.type === "DESPESA") {
    if (!input.draft?.accountId && !input.draft?.cardId) {
      slots.push({
        field: "source",
        status: "ambiguous",
        reason: "source_not_defined",
        priority: 1,
        question: "Só preciso confirmar: essa saída foi na conta ou no cartão?",
        tag: "source_needed",
      });
    }

    if (isGenericCategory(tx.categoryName) && !input.draft?.categoryId) {
      slots.push({
        field: "category",
        status: "ambiguous",
        reason: "generic_category",
        priority: 2,
        question: "Só preciso confirmar a categoria desse gasto.",
        tag: "category_needed",
      });
    }

    if (PERSON_HINT_RE.test(normalizedText) && hasLikelyPersonReference(normalizedText) && !TRANSFER_HINT_RE.test(normalizedText)) {
      slots.push({
        field: "type",
        status: "ambiguous",
        reason: "person_or_expense",
        priority: 0,
        question:
          "Só preciso confirmar: isso foi uma despesa comum ou uma transferência para pessoa? Responda com \"tipo despesa\" ou \"tipo transferência\".",
        tag: "person_vs_transfer",
      });
    }

    const entityMatch = normalizedText.match(ENTITY_HINT_RE);
    const entity = entityMatch?.[1] || "";
    if (entity && AMBIGUOUS_ENTITY_WORDS.has(entity) && isGenericCategory(tx.categoryName)) {
      slots.push({
        field: "category",
        status: "ambiguous",
        reason: "entity_person_or_item",
        priority: 0,
        question:
          "Você quis dizer Carolina (doce) ou uma pessoa chamada Carolina? Se for doce, responda \"categoria alimentação\". Se for pessoa, responda \"tipo transferência\".",
        tag: "entity_person_or_item",
      });
    }
  }

  if (tx.type === "TRANSFERENCIA") {
    if (!input.draft?.accountId || !input.draft?.transferToAccountId) {
      slots.push({
        field: "source",
        status: "missing",
        reason: "transfer_accounts_missing",
        priority: 0,
        question: "Só preciso confirmar origem e destino da transferência.",
        tag: "transfer_accounts_needed",
      });
    }
  }

  return slots.sort((a, b) => a.priority - b.priority);
}

function pickTopQuestion(slots: DecisionSlot[]): { question: string | null; tag: DecisionTag | null } {
  const firstWithQuestion = slots.find((slot) => !!slot.question);
  if (!firstWithQuestion) {
    return { question: null, tag: null };
  }

  return {
    question: firstWithQuestion.question || null,
    tag: firstWithQuestion.tag || null,
  };
}

export function decideAzinhaNextStep(input: AzinhaDecisionInput): AzinhaDecisionResult {
  const slots = buildSlots(input);
  const confidence = input.response.confidence;

  const hasCriticalMissing = slots.some(
    (slot) =>
      slot.status === "missing" &&
      (slot.field === "amount" || slot.field === "type"),
  );

  let tier: DecisionTier = "high";
  if (input.validationMessage || confidence < 0.45 || hasCriticalMissing) {
    tier = "low";
  } else if (slots.length > 0 || confidence < 0.58) {
    tier = "medium";
  }

  const topQuestion = pickTopQuestion(slots);

  if (tier === "low") {
    return {
      tier,
      action: "rewrite",
      reason: input.validationMessage ? "validation_failed" : "low_confidence_or_missing_critical",
      question:
        input.validationMessage ||
        topQuestion.question ||
        "Preciso de mais detalhes para evitar registro incorreto. Envie valor, tipo e contexto em uma frase.",
      tag: topQuestion.tag || "rewrite_needed",
      slots,
    };
  }

  if (tier === "medium") {
    return {
      tier,
      action: "ask",
      reason: "medium_confidence_or_ambiguity",
      question:
        topQuestion.question ||
        "Só preciso confirmar um detalhe antes de salvar.",
      tag: topQuestion.tag,
      slots,
    };
  }

  return {
    tier,
    action: "confirm",
    reason: "high_confidence",
    question: null,
    tag: null,
    slots,
  };
}
