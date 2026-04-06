import { describe, expect, it } from "vitest";
import { buildFallbackParseResponse } from "@/services/azinhaFallback";
import type { AssistantParseRequest } from "@/services/azinhaAssistant";

function makePayload(text: string): AssistantParseRequest {
  return {
    text,
    timezone: "America/Sao_Paulo",
    today: "2026-03-22",
    accounts: [{ name: "Nubank" }, { name: "Inter" }],
    cards: [{ name: "Nubank Ultravioleta", brand: "Mastercard", lastFourDigits: "1234" }],
    categories: [
      { name: "Alimentacao", type: "DESPESA" },
      { name: "Transporte", type: "DESPESA" },
      { name: "Salario", type: "RECEITA" },
      { name: "Transferencia", type: "TRANSFERENCIA" },
    ],
    defaults: {
      lastUsedAccountName: "Nubank",
      lastUsedCardName: "Nubank Ultravioleta",
      primaryAccountName: "Nubank",
      secondaryAccountName: "Inter",
    },
  };
}

describe("Azinha fallback parser", () => {
  it("responds to greeting with friendly professional answer", () => {
    const response = buildFallbackParseResponse(makePayload("E ai, beleza?"));
    expect(response.intent).toBe("OTHER");
    expect(response.answer?.toLowerCase()).toContain("olá");
    expect(response.transaction).toBeNull();
  });

  it("responds politely to thanks", () => {
    const response = buildFallbackParseResponse(makePayload("obrigado"));
    expect(response.intent).toBe("OTHER");
    expect(response.answer?.toLowerCase()).toContain("perfeito");
  });

  it("parses expense with amount and category", () => {
    const response = buildFallbackParseResponse(makePayload("Gastei 42,90 no iFood hoje"));
    expect(response.intent).toBe("TRANSACTION");
    expect(response.needsClarification).toBe(false);
    expect(response.transaction?.type).toBe("DESPESA");
    expect(response.transaction?.amount).toBe(42.9);
    expect(response.transaction?.categoryName).toBe("Alimentacao");
  });

  it("infers bakery expense category and clean description", () => {
    const response = buildFallbackParseResponse(makePayload("Gastei 5 reais em um sonho de padaria"));
    expect(response.intent).toBe("TRANSACTION");
    expect(response.transaction?.categoryName).toBe("Alimentacao");
    expect(response.transaction?.description).toBe("Sonho de padaria");
  });

  it("understands meal verb and keeps expense type without clarification", () => {
    const response = buildFallbackParseResponse(makePayload("Comi um pao de 5 reais"));
    expect(response.intent).toBe("TRANSACTION");
    expect(response.needsClarification).toBe(false);
    expect(response.transaction?.type).toBe("DESPESA");
    expect(response.transaction?.amount).toBe(5);
    expect(response.transaction?.categoryName).toBe("Alimentacao");
  });

  it("understands typo verb and easter food context", () => {
    const response = buildFallbackParseResponse(makePayload("Pagei 100 em ovo de pascoa"));
    expect(response.intent).toBe("TRANSACTION");
    expect(response.needsClarification).toBe(false);
    expect(response.transaction?.type).toBe("DESPESA");
    expect(response.transaction?.amount).toBe(100);
    expect(response.transaction?.categoryName).toBe("Alimentacao");
    expect(response.transaction?.description).toBe("Ovo de pascoa");
  });

  it("parses income with amount", () => {
    const response = buildFallbackParseResponse(makePayload("Recebi 3000 de salario"));
    expect(response.intent).toBe("TRANSACTION");
    expect(response.transaction?.type).toBe("RECEITA");
    expect(response.transaction?.amount).toBe(3000);
  });

  it("parses transfer with source and destination", () => {
    const response = buildFallbackParseResponse(makePayload("Transferi 200 da Nubank para Inter"));
    expect(response.intent).toBe("TRANSACTION");
    expect(response.transaction?.type).toBe("TRANSFERENCIA");
    expect(response.transaction?.amount).toBe(200);
    expect(response.transaction?.sourceName).toContain("Nubank");
    expect(response.transaction?.destinationName).toContain("Inter");
  });

  it("parses installments and card intent", () => {
    const response = buildFallbackParseResponse(
      makePayload("Comprei um tenis de 600 em 3x no cartao Nubank Ultravioleta"),
    );
    expect(response.intent).toBe("TRANSACTION");
    expect(response.transaction?.type).toBe("DESPESA");
    expect(response.transaction?.amount).toBe(600);
    expect(response.transaction?.installments).toBe(3);
    expect(response.transaction?.sourceKind).toBe("CARD");
  });

  it("parses large amount with 'mil' scale and installments", () => {
    const response = buildFallbackParseResponse(
      makePayload("Comprei um carro por 35 mil reais no cartao parceldo em 10 x"),
    );
    expect(response.intent).toBe("TRANSACTION");
    expect(response.needsClarification).toBe(false);
    expect(response.transaction?.type).toBe("DESPESA");
    expect(response.transaction?.amount).toBe(35000);
    expect(response.transaction?.installments).toBe(10);
    expect(response.transaction?.sourceKind).toBe("CARD");
  });

  it("does not use installments number as amount", () => {
    const response = buildFallbackParseResponse(
      makePayload("Comprei um tenis em 3x no cartao"),
    );
    expect(response.intent).toBe("TRANSACTION");
    expect(response.needsClarification).toBe(true);
    expect(response.transaction).toBeNull();
  });

  it("understands expense with infinitive verb", () => {
    const response = buildFallbackParseResponse(makePayload("gastar 5 real no mercado"));
    expect(response.intent).toBe("TRANSACTION");
    expect(response.needsClarification).toBe(false);
    expect(response.transaction?.type).toBe("DESPESA");
    expect(response.transaction?.amount).toBe(5);
  });

  it("keeps pix payment as expense when context is purchase", () => {
    const response = buildFallbackParseResponse(makePayload("Paguei 50 no pix no iFood"));
    expect(response.intent).toBe("TRANSACTION");
    expect(response.needsClarification).toBe(false);
    expect(response.transaction?.type).toBe("DESPESA");
    expect(response.transaction?.amount).toBe(50);
  });

  it("keeps card credit payment as expense", () => {
    const response = buildFallbackParseResponse(makePayload("Paguei 120 no cartao de credito"));
    expect(response.intent).toBe("TRANSACTION");
    expect(response.needsClarification).toBe(false);
    expect(response.transaction?.type).toBe("DESPESA");
    expect(response.transaction?.amount).toBe(120);
  });

  it("does not use date fragments as amount when value is missing", () => {
    const response = buildFallbackParseResponse(makePayload("Paguei mercado em 22-03"));
    expect(response.intent).toBe("TRANSACTION");
    expect(response.needsClarification).toBe(true);
    expect(response.transaction).toBeNull();
  });

  it("uses explicit amount instead of textual date day", () => {
    const response = buildFallbackParseResponse(makePayload("Gastei 40 no uber dia 5 de marco"));
    expect(response.intent).toBe("TRANSACTION");
    expect(response.needsClarification).toBe(false);
    expect(response.transaction?.amount).toBe(40);
  });

  it("parses destination-only transfer correctly", () => {
    const response = buildFallbackParseResponse(makePayload("Transferi 200 para Inter"));
    expect(response.intent).toBe("TRANSACTION");
    expect(response.needsClarification).toBe(false);
    expect(response.transaction?.type).toBe("TRANSFERENCIA");
    expect(response.transaction?.amount).toBe(200);
    expect(response.transaction?.sourceName).toBeNull();
    expect(response.transaction?.destinationName).toContain("Inter");
  });

  it("parses textual month date expression", () => {
    const response = buildFallbackParseResponse(makePayload("Gastei 15 no mercado dia 5 de marco"));
    expect(response.intent).toBe("TRANSACTION");
    expect(response.needsClarification).toBe(false);
    expect(response.transaction?.date).toBe("2026-03-05");
  });

  it("supports relative date phrase semana passada", () => {
    const response = buildFallbackParseResponse(makePayload("Paguei 25 na farmácia semana passada"));
    expect(response.intent).toBe("TRANSACTION");
    expect(response.needsClarification).toBe(false);
    expect(response.transaction?.date).toBe("2026-03-15");
  });

  it("asks minimum clarification when amount is missing", () => {
    const response = buildFallbackParseResponse(makePayload("Paguei mercado"));
    expect(response.intent).toBe("TRANSACTION");
    expect(response.needsClarification).toBe(true);
    expect(response.transaction).toBeNull();
    expect(response.clarification?.toLowerCase()).toContain("só preciso confirmar");
  });

  it("returns generic other answer for unrelated content", () => {
    const response = buildFallbackParseResponse(makePayload("Qual filme voce recomenda hoje?"));
    expect(response.intent).toBe("OTHER");
    expect(response.answer?.toLowerCase()).toContain("entendi");
  });

  it("does not expose IA unavailability message when fallback has reason", () => {
    const response = buildFallbackParseResponse(makePayload("Qual a sua idade?"), {
      reason: "Edge Function returned a non-2xx status code",
    });
    expect(response.intent).toBe("OTHER");
    expect(response.answer?.toLowerCase()).not.toContain("indispon");
    expect(response.answer?.toLowerCase()).not.toContain(" pra ");
  });
});
