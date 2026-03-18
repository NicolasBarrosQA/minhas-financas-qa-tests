import { expect, type Page } from "@playwright/test";

export function createUniqueSuffix() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const random = Math.floor(Math.random() * 90) + 10;
  return `${day}${hour}${minute}-${random}`;
}

export async function openAddPessoaDialog(page: Page) {
  await page.goto("/pessoas");
  await page.getByRole("button", { name: "Adicionar Pessoa" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

export async function createPessoa(page: Page, nome: string, dataNascimentoIso: string) {
  await openAddPessoaDialog(page);
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[name="nome"]').fill(nome);
  await dialog.locator('input[name="dataNascimento"]').fill(dataNascimentoIso);
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Pessoa salva com sucesso!")).toBeVisible();
}

export interface CreateTransacaoInput {
  descricao: string;
  valor: string;
  dataIso: string;
  tipo: "Despesa" | "Receita";
  pessoaNome: string;
  categoriaDescricao?: string;
}

export async function openAddTransacaoDialog(page: Page) {
  await page.goto("/transacoes");
  await page.getByRole("button", { name: /Adicionar Transa/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

export async function createTransacao(page: Page, input: CreateTransacaoInput) {
  await openAddTransacaoDialog(page);
  const dialog = page.getByRole("dialog");

  await dialog.locator('input[name="descricao"]').fill(input.descricao);
  await dialog.locator('input[name="valor"]').fill(input.valor);
  await dialog.locator('input[name="data"]').fill(input.dataIso);
  await dialog.locator('select[name="tipo"]').selectOption(input.tipo.toLowerCase());

  const pessoaInput = dialog.getByLabel("Lista de pessoas");
  await pessoaInput.fill(input.pessoaNome);
  await expect(page.getByRole("option", { name: input.pessoaNome }).first()).toBeVisible();
  await page.getByRole("option", { name: input.pessoaNome }).first().click();

  const categoriaInput = dialog.getByLabel("Lista de categorias");
  if (input.categoriaDescricao) {
    await categoriaInput.fill(input.categoriaDescricao);
    await expect(page.getByRole("option", { name: input.categoriaDescricao }).first()).toBeVisible();
    await page.getByRole("option", { name: input.categoriaDescricao }).first().click();
  } else {
    await categoriaInput.click();

    const abrirButtons = dialog.getByRole("button", { name: "Abrir" });
    if ((await abrirButtons.count()) > 1) {
      await abrirButtons.nth(1).click();
    }

    const options = page.getByRole("option");
    const optionCount = await options.count();
    let selected = false;

    for (let index = 0; index < optionCount; index += 1) {
      const option = options.nth(index);
      if (await option.isVisible()) {
        await option.click();
        selected = true;
        break;
      }
    }

    if (!selected) {
      throw new Error("Nenhuma categoria visivel para selecao no formulario de transacao.");
    }
  }

  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText(/transa.*sucesso/i)).toBeVisible();
  await expect(dialog).toBeHidden();
}

export async function deletePessoaIfExists(page: Page, nome: string) {
  const baseApi = "http://localhost:5000/api/v1.0";

  try {
    const response = await page.request.get(`${baseApi}/pessoas?page=1&pageSize=500`);
    if (response.ok()) {
      const body = (await response.json()) as { items?: Array<{ id?: string; nome?: string }> };
      const matches = (body.items ?? []).filter((item) => item.nome === nome && item.id);

      for (const pessoa of matches) {
        await page.request.delete(`${baseApi}/pessoas/${pessoa.id}`);
      }

      if (matches.length > 0) {
        return;
      }
    }
  } catch {
    // Fallback para limpeza via UI caso a API nao esteja acessivel.
  }

  await page.goto("/pessoas");

  for (let pageIndex = 0; pageIndex < 200; pageIndex += 1) {
    const row = page.locator("tr", { hasText: nome }).first();
    if (await row.count()) {
      await row.getByRole("button", { name: /Deletar/i }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Confirmar" }).click();
      await expect(dialog).toBeHidden();
      return;
    }

    const nextButton = page.getByRole("button", { name: /Pr.ximo/i });
    if (!(await nextButton.count()) || (await nextButton.isDisabled())) {
      return;
    }
    await nextButton.click();
  }
}

export async function findTransacaoRowByDescricao(page: Page, descricao: string) {
  await page.goto("/transacoes");

  for (let pageIndex = 0; pageIndex < 200; pageIndex += 1) {
    const row = page.locator("tr", { hasText: descricao }).first();
    if (await row.count()) {
      return row;
    }

    const nextButton = page.getByRole("button", { name: /Pr.ximo/i });
    if (!(await nextButton.count()) || (await nextButton.isDisabled())) {
      return null;
    }
    await nextButton.click();
  }

  return null;
}
