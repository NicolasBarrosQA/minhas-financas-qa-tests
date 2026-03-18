import { expect, test } from "@playwright/test";
import { openAddTransacaoDialog } from "./helpers";

test.describe("Transacoes - bugs conhecidos", () => {
  test("menu superior deveria exibir link de Pessoas @known-bug", async ({ page }) => {
    await page.goto("/");
    const topNav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(topNav.getByRole("link", { name: "Pessoas" })).toBeVisible();
  });

  test("mensagens de validacao deveriam ser localizadas em portugues @known-bug", async ({ page }) => {
    await openAddTransacaoDialog(page);
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Salvar" }).click();

    await expect(dialog.getByText(/Invalid input:/i)).toHaveCount(0);
  });
});
