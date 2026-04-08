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

import { parseTransactionWithAssistant, resetRemoteParserStateForTests } from "@/services/azinhaAssistant";

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
    resetRemoteParserStateForTests();
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

  it("removes broken prefix markers and normalizes slang in OTHER answers", async () => {
    invokeMock.mockResolvedValue({
      data: {
        intent: "OTHER",
        needsClarification: false,
        clarification: null,
        answer: "?? beleza, vc consegue tentar de novo?",
        confidence: 0.81,
        confidenceSignals: ["remote_other"],
        transaction: null,
      },
      error: null,
    });

    const response = await parseTransactionWithAssistant(makePayload("oi"));

    expect(response.intent).toBe("OTHER");
    expect(response.answer).toBeTruthy();
    expect(response.answer).not.toContain("??");
    expect(response.answer).not.toContain("vc");
    expect(response.answer).toContain("você");
  });

  it("preserves line breaks and list formatting while normalizing slang", async () => {
    invokeMock.mockResolvedValue({
      data: {
        intent: "OTHER",
        needsClarification: false,
        clarification: null,
        answer: "?? resumo da revisão:\n- vc ajustou o valor\n- pq havia ambiguidade",
        confidence: 0.8,
        confidenceSignals: ["remote_other"],
        transaction: null,
      },
      error: null,
    });

    const response = await parseTransactionWithAssistant(makePayload("oi"));

    expect(response.intent).toBe("OTHER");
    expect(response.answer).toContain("\n- você ajustou o valor\n- porque havia ambiguidade");
    expect(response.answer?.split("\n").length).toBeGreaterThanOrEqual(3);
  });

  it("does not enter cooldown for non-transient auth errors", async () => {
    invokeMock
      .mockResolvedValueOnce({
        data: null,
        error: {
          context: new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 401 }),
        },
      })
      .mockResolvedValueOnce({
        data: {
          intent: "TRANSACTION",
          needsClarification: false,
          clarification: null,
          answer: null,
          confidence: 0.82,
          confidenceSignals: ["remote_success"],
          transaction: {
            type: "DESPESA",
            amount: 50,
            description: "Mercado",
            date: "2026-03-23",
            installments: null,
            sourceKind: "ACCOUNT",
            sourceName: "Nubank",
            destinationName: null,
            categoryName: "Alimentacao",
          },
        },
        error: null,
      });

    const first = await parseTransactionWithAssistant(makePayload("gastei 50 no mercado"));
    const second = await parseTransactionWithAssistant(makePayload("gastei 50 no mercado"));

    expect(first.confidenceSignals).toContain("fallback_parser_non_transient");
    expect(second.intent).toBe("TRANSACTION");
    expect(second.transaction?.amount).toBe(50);
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });

  it("enters cooldown for transient server failures", async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: {
        context: new Response(JSON.stringify({ error: "upstream timeout" }), { status: 500 }),
      },
    });

    const first = await parseTransactionWithAssistant(makePayload("gastei 20 no uber"));
    const second = await parseTransactionWithAssistant(makePayload("gastei 20 no uber"));

    expect(first.confidenceSignals).toContain("fallback_parser");
    expect(second.confidenceSignals).toContain("fallback_parser_cooldown");
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });
});
