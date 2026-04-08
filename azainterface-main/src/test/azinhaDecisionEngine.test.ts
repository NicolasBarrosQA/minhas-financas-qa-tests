import { describe, expect, it } from "vitest";
import { decideAzinhaNextStep } from "@/services/azinhaDecisionEngine";
import type { AssistantParseResponse } from "@/services/azinhaAssistant";

function response(partial: Partial<AssistantParseResponse>): AssistantParseResponse {
  return {
    intent: "TRANSACTION",
    needsClarification: false,
    clarification: null,
    answer: null,
    transaction: {
      type: "DESPESA",
      amount: 30,
      description: "Padaria",
      date: "2026-03-22",
      installments: null,
      sourceKind: "ACCOUNT",
      sourceName: "Nubank",
      destinationName: null,
      categoryName: "Alimentacao",
    },
    confidence: 0.85,
    confidenceSignals: [],
    ...partial,
  };
}

describe("Azinha decision engine", () => {
  it("returns confirm on high confidence with no ambiguity", () => {
    const result = decideAzinhaNextStep({
      userText: "gastei 30 na padaria",
      response: response({}),
      draft: {
        type: "DESPESA",
        amount: 30,
        description: "Padaria",
        date: "2026-03-22",
        accountId: "acc-1",
        categoryId: "cat-1",
      },
      validationMessage: null,
    });

    expect(result.action).toBe("confirm");
    expect(result.tier).toBe("high");
  });

  it("asks source confirmation when expense source was inferred automatically", () => {
    const result = decideAzinhaNextStep({
      userText: "gastei 30 no mercado",
      response: response({
        confidence: 0.82,
        transaction: {
          type: "DESPESA",
          amount: 30,
          description: "Mercado",
          date: "2026-03-22",
          installments: null,
          sourceKind: "AUTO",
          sourceName: null,
          destinationName: null,
          categoryName: "Alimentacao",
        },
      }),
      draft: {
        type: "DESPESA",
        amount: 30,
        description: "Mercado",
        date: "2026-03-22",
        accountId: "acc-1",
        categoryId: "cat-1",
      },
      validationMessage: null,
    });

    expect(result.action).toBe("ask");
    expect(result.tag).toBe("source_needed");
  });

  it("asks objective question on medium confidence category ambiguity", () => {
    const result = decideAzinhaNextStep({
      userText: "paguei 200 pro Joao",
      response: response({
        confidence: 0.6,
        transaction: {
          type: "DESPESA",
          amount: 200,
          description: "Joao",
          date: "2026-03-22",
          installments: null,
          sourceKind: "AUTO",
          sourceName: null,
          destinationName: null,
          categoryName: "Outros",
        },
      }),
      draft: {
        type: "DESPESA",
        amount: 200,
        description: "Joao",
        date: "2026-03-22",
        accountId: "acc-1",
      },
      validationMessage: null,
    });

    expect(result.action).toBe("ask");
    expect(result.tier).toBe("medium");
    expect(result.question?.toLowerCase()).toContain("despesa comum ou uma transferência");
  });

  it("returns rewrite on low confidence and missing amount", () => {
    const result = decideAzinhaNextStep({
      userText: "mercado semana passada",
      response: response({
        confidence: 0.3,
        transaction: null,
        needsClarification: true,
        clarification: "Só preciso confirmar o valor.",
      }),
      draft: null,
      validationMessage: null,
    });

    expect(result.action).toBe("rewrite");
    expect(result.tag).toBe("amount_needed");
  });

  it("detects person vs transfer ambiguity", () => {
    const result = decideAzinhaNextStep({
      userText: "paguei 200 pro Joao",
      response: response({
        confidence: 0.68,
        transaction: {
          type: "DESPESA",
          amount: 200,
          description: "Joao",
          date: "2026-03-22",
          installments: null,
          sourceKind: "ACCOUNT",
          sourceName: "Nubank",
          destinationName: null,
          categoryName: "Outros",
        },
      }),
      draft: {
        type: "DESPESA",
        amount: 200,
        description: "Joao",
        date: "2026-03-22",
        accountId: "acc-1",
      },
      validationMessage: null,
    });

    expect(result.action).toBe("ask");
    expect(result.tag).toBe("person_vs_transfer");
  });

  it("detects carolina entity ambiguity", () => {
    const result = decideAzinhaNextStep({
      userText: "paguei 2 BRL em uma Carolina",
      response: response({
        confidence: 0.66,
        transaction: {
          type: "DESPESA",
          amount: 2,
          description: "Carolina",
          date: "2026-03-22",
          installments: null,
          sourceKind: "AUTO",
          sourceName: null,
          destinationName: null,
          categoryName: "Outros",
        },
      }),
      draft: {
        type: "DESPESA",
        amount: 2,
        description: "Carolina",
        date: "2026-03-22",
        accountId: "acc-1",
      },
      validationMessage: null,
    });

    expect(result.action).toBe("ask");
    expect(result.tag).toBe("entity_person_or_item");
  });

  it("does not trigger person ambiguity for non-person target", () => {
    const result = decideAzinhaNextStep({
      userText: "paguei 200 pro plano de saude",
      response: response({
        confidence: 0.72,
        transaction: {
          type: "DESPESA",
          amount: 200,
          description: "Plano de saude",
          date: "2026-03-22",
          installments: null,
          sourceKind: "ACCOUNT",
          sourceName: "Nubank",
          destinationName: null,
          categoryName: "Saude",
        },
      }),
      draft: {
        type: "DESPESA",
        amount: 200,
        description: "Plano de saude",
        date: "2026-03-22",
        accountId: "acc-1",
        categoryId: "cat-1",
      },
      validationMessage: null,
    });

    expect(result.action).toBe("confirm");
    expect(result.tag).toBeNull();
  });

  it("asks objective transfer question when accounts are missing", () => {
    const result = decideAzinhaNextStep({
      userText: "transferi 200 para Inter",
      response: response({
        confidence: 0.62,
        transaction: {
          type: "TRANSFERENCIA",
          amount: 200,
          description: "Transferencia entre contas",
          date: "2026-03-22",
          installments: null,
          sourceKind: "ACCOUNT",
          sourceName: null,
          destinationName: "Inter",
          categoryName: "Transferencia",
        },
      }),
      draft: {
        type: "TRANSFERENCIA",
        amount: 200,
        description: "Transferencia entre contas",
        date: "2026-03-22",
        accountId: "acc-1",
      },
      validationMessage: null,
    });

    expect(result.action).toBe("ask");
    expect(result.tag).toBe("transfer_accounts_needed");
  });

  it("asks transfer confirmation when one endpoint was only inferred", () => {
    const result = decideAzinhaNextStep({
      userText: "transferi 200 para Inter",
      response: response({
        confidence: 0.81,
        transaction: {
          type: "TRANSFERENCIA",
          amount: 200,
          description: "Transferencia entre contas",
          date: "2026-03-22",
          installments: null,
          sourceKind: "ACCOUNT",
          sourceName: null,
          destinationName: "Inter",
          categoryName: "Transferencia",
        },
      }),
      draft: {
        type: "TRANSFERENCIA",
        amount: 200,
        description: "Transferencia entre contas",
        date: "2026-03-22",
        accountId: "acc-1",
        transferToAccountId: "acc-2",
        categoryId: "cat-1",
      },
      validationMessage: null,
    });

    expect(result.action).toBe("ask");
    expect(result.tag).toBe("transfer_accounts_needed");
  });
});
