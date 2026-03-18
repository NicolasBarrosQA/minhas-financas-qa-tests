import { describe, expect, it } from "vitest";
import { pessoaSchema } from "@/lib/schemas";

describe("Schemas - cenarios de bug conhecido", () => {
  it("deveria bloquear data de nascimento no futuro [KnownBug]", () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    const result = pessoaSchema.safeParse({
      nome: "Pessoa Futuro",
      dataNascimento: nextYear,
    });

    expect(result.success).toBe(false);
  });
});
