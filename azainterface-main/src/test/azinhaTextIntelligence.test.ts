import { describe, expect, it } from "vitest";
import {
  inferSmartDescription,
  isGenericCategoryName,
  sanitizeSmartDescription,
} from "@/services/azinhaTextIntelligence";

describe("Azinha text intelligence", () => {
  it("creates concise description for expense text", () => {
    const description = inferSmartDescription("Gastei 5 reais em um sonho de padaria", "DESPESA");
    expect(description).toBe("Sonho de padaria");
  });

  it("creates transfer description", () => {
    const description = inferSmartDescription("Transferi 200 da Nubank para Inter", "TRANSFERENCIA");
    expect(description).toBe("Transferencia entre contas");
  });

  it("replaces raw sentence description with concise label", () => {
    const description = sanitizeSmartDescription(
      "gastei 5 reais em um sonho de padaria",
      "Gastei 5 reais em um sonho de padaria",
      "DESPESA",
    );
    expect(description).toBe("Sonho de padaria");
  });

  it("cleans currency code from description candidate", () => {
    const description = inferSmartDescription("paguei 2 BRL em uma Carolina", "DESPESA");
    expect(description).toBe("Carolina");
  });

  it("removes dangling trailing preposition from description", () => {
    const description = inferSmartDescription("Comprei um tenis de 600 em 3x no cartao", "DESPESA");
    expect(description).toBe("Tenis");
  });

  it("normalizes infinitive verb expense description", () => {
    const description = inferSmartDescription("gastar 5 real no mercado", "DESPESA");
    expect(description).toBe("Mercado");
  });

  it("removes trailing 'por' when value appears at end", () => {
    const description = inferSmartDescription("Comprei um sonho por 5 reais", "DESPESA");
    expect(description).toBe("Sonho");
  });

  it("supports food verb in natural phrase", () => {
    const description = inferSmartDescription("Comi um pão de 5 reais", "DESPESA");
    expect(description).toBe("Pão");
  });

  it("cleans typo payment verb from description", () => {
    const description = inferSmartDescription("Pagei 100 em ovo de pascoa", "DESPESA");
    expect(description).toBe("Ovo de pascoa");
  });
  it("removes relative date tail from description", () => {
    const description = inferSmartDescription("mercado semana passada", "DESPESA");
    expect(description).toBe("Mercado");
  });
  it("cleans scale words in long purchase description", () => {
    const description = inferSmartDescription(
      "Comprei um carro verde limão por 35 mil reais no cartão parceldo em 10 x",
      "DESPESA",
    );
    expect(description).toBe("Carro verde limão");
  });

  it("keeps concise valid description", () => {
    const description = sanitizeSmartDescription(
      "Padaria do centro",
      "Gastei 5 reais em um sonho de padaria",
      "DESPESA",
    );
    expect(description).toBe("Padaria do centro");
  });

  it("detects generic category names", () => {
    expect(isGenericCategoryName("Outros")).toBe(true);
    expect(isGenericCategoryName("Alimentacao")).toBe(false);
  });
});
