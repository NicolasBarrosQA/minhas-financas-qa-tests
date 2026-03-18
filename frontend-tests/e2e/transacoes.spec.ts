import { expect, test } from "@playwright/test";
import { createPessoa, createTransacao, createUniqueSuffix, deletePessoaIfExists } from "./helpers";

test.describe("Transacoes - fluxo estavel", () => {
  test("deve criar transacao de despesa com pessoa e categoria selecionadas", async ({ page }) => {
    const suffix = createUniqueSuffix();
    const pessoaNome = `Marina Teste ${suffix}`;
    const transacaoDescricao = `Compra mercado ${suffix}`;

    try {
      await createPessoa(page, pessoaNome, "1990-01-10");
      await createTransacao(page, {
        descricao: transacaoDescricao,
        valor: "123.45",
        dataIso: "2026-03-17",
        tipo: "Despesa",
        pessoaNome,
      });

      await expect(page.getByRole("button", { name: /Adicionar Transa/i })).toBeVisible();
    } finally {
      await deletePessoaIfExists(page, pessoaNome);
    }
  });
});
