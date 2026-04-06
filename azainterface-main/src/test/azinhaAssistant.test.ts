import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AssistantParseRequest } from "@/services/azinhaAssistant";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

import { parseTransactionWithAssistant } from "@/services/azinhaAssistant";

function makePayload(text: string): AssistantParseRequest {
  return {
    text,
    timezone: "America/Sao_Paulo",
    today: "2026-03-23",
    accounts: [{ name: "Nubank" }, { name: "Inter" }],
    cards: [{ name: "Black", brand: "American Express", lastFourDigits: "1234" }],
    categories: [
      { name: "Alimentacao", type: "DESPESA" },
      { name: "Outros", type: "DESPESA" },
      { name: "Salario", type: "RECEITA" },
      { name: "Transferencia", type: "TRANSFERENCIA" },
    ],
    defaults: {
      lastUsedAccountName: "Nubank",
      lastUsedCardName: "Black",
      primaryAccountName: "Nubank",
      secondaryAccountName: "Inter",
    },
  };
}

describe("parseTransactionWithAssistant", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("recovers transaction from fallback when remote returns clarification without transaction", async () => {
    invokeMock.mockResolvedValue({
      data: {
        intent: "TRANSACTION",
        needsClarification: true,
        clarification: "So preciso confirmar: foi entrada, saida ou transferencia?",
        answer: null,
        transaction: null,
        confidence: 0.87,
        confidenceSignals: ["needs_clarification"],
      },
      error: null,
    });

    const response = await parseTransactionWithAssistant(makePayload("Pagei 100 em ovo de pascoa"));

    expect(response.intent).toBe("TRANSACTION");
    expect(response.needsClarification).toBe(false);
    expect(response.transaction?.type).toBe("DESPESA");
    expect(response.transaction?.amount).toBe(100);
    expect(response.transaction?.categoryName).toBe("Alimentacao");
    expect(response.confidenceSignals).toContain("fallback_remote_missing_transaction");
  });

  it("restores scaled amount from fallback when remote misses thousand multiplier", async () => {
    invokeMock.mockResolvedValue({
      data: {
        intent: "TRANSACTION",
        needsClarification: false,
        clarification: null,
        answer: null,
        confidence: 0.82,
        confidenceSignals: ["remote_success"],
        transaction: {
          type: "DESPESA",
          amount: 35,
          description: "Comprei um carro verde limao por 35 mil reais no cartao parcelado em 10 x",
          date: "2026-03-23",
          installments: 10,
          sourceKind: "CARD",
          sourceName: "Black",
          destinationName: null,
          categoryName: "Outros",
        },
      },
      error: null,
    });

    const response = await parseTransactionWithAssistant(
      makePayload("Comprei um carro verde limao por 35 mil reais no cartao parcelado em 10 x"),
    );

    expect(response.intent).toBe("TRANSACTION");
    expect(response.needsClarification).toBe(false);
    expect(response.transaction?.amount).toBe(35000);
    expect(response.confidenceSignals).toContain("fallback_amount_recovered");
  });

  it("repairs mojibake in remote OTHER answers", async () => {
    invokeMock.mockResolvedValue({
      data: {
        intent: "OTHER",
        needsClarification: false,
        clarification: null,
        answer: "n\\u00C3\\u0192\\u00C2\\u00A3o consegui agora, mas vc pode tentar de novo",
        confidence: 0.79,
        confidenceSignals: ["remote_other"],
        transaction: null,
      },
      error: null,
    });

    const response = await parseTransactionWithAssistant(makePayload("oi"));

    expect(response.intent).toBe("OTHER");
    expect(response.answer).toContain("consegui");
    expect(response.answer).toContain("você");
    expect(response.answer).not.toContain("vc");
  });
});
