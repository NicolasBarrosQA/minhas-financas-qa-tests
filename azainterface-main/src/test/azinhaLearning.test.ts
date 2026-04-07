import { beforeEach, describe, expect, it } from "vitest";
import {
  learnAzinhaCategoryCorrection,
  learnAzinhaDescriptionCorrection,
  suggestLearnedCategory,
  suggestLearnedDescription,
} from "@/services/azinhaLearning";

describe("Azinha learning", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("learns category corrections and suggests in similar text", () => {
    learnAzinhaCategoryCorrection("Gastei 5 reais em um sonho de padaria", "DESPESA", "Alimentacao");

    const suggestion = suggestLearnedCategory("Hoje paguei 8 em sonho na padaria", "DESPESA");
    expect(suggestion).toBe("Alimentacao");
  });

  it("learns sanitized description and suggests concise value", () => {
    learnAzinhaDescriptionCorrection(
      "Gastei 35 no ifood com entrega",
      "DESPESA",
      "gastei 35 no ifood com entrega",
    );

    const suggestion = suggestLearnedDescription("Paguei 40 no ifood hoje", "DESPESA");
    expect(suggestion).toBe("Ifood com entrega");
  });

  it("does not suggest when there is no overlap", () => {
    learnAzinhaCategoryCorrection("Gastei 20 com uber", "DESPESA", "Transporte");
    const suggestion = suggestLearnedCategory("Recebi salario", "RECEITA");
    expect(suggestion).toBeNull();
  });

  it("does not leak description learning by verb-only overlap", () => {
    learnAzinhaDescriptionCorrection(
      "Comprei 60 no shopping",
      "DESPESA",
      "Almoço no shopping",
    );

    const suggestion = suggestLearnedDescription("Comprei um tenis de 600 em 3x no cartao", "DESPESA");
    expect(suggestion).toBeNull();
  });
});
