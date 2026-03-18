import { expect, test } from "@playwright/test";

test.describe("Smoke - navegacao basica", () => {
  test("deve abrir todas as paginas principais sem erro", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Bem-vindo!")).toBeVisible();

    await page.goto("/transacoes");
    await expect(page.getByRole("heading", { name: /Transa/i })).toBeVisible();

    await page.goto("/categorias");
    await expect(page.getByRole("heading", { name: "Categorias" })).toBeVisible();

    await page.goto("/pessoas");
    await expect(page.getByRole("heading", { name: "Pessoas" })).toBeVisible();

    await page.goto("/totais");
    await expect(page.getByRole("heading", { name: /Totais por Pessoa/i })).toBeVisible();
  });
});
