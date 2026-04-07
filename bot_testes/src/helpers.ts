import { expect, type Locator, type Page } from '@playwright/test';

export function formatYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function parseBrlCurrency(input: string): number {
  const normalized = input
    .replace(/\s/g, '')
    .replace(/[R$]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

export async function waitForSplash(page: Page): Promise<void> {
  await page.waitForTimeout(2600);
}

export async function ensureLoggedIn(page: Page, credentials: { email: string; password: string }): Promise<void> {
  await page.goto('/login');
  await waitForSplash(page);

  if (!page.url().includes('/login')) {
    await page.waitForLoadState('domcontentloaded');
    return;
  }

  const entrarTab = page.getByRole('button', { name: /^Entrar$/i });
  if (await entrarTab.isVisible()) {
    await entrarTab.click();
  }

  await page.getByPlaceholder(/voce@email\.com/i).fill(credentials.email);
  await page.getByPlaceholder(/Minimo de 6 caracteres/i).fill(credentials.password);
  await page.getByRole('button', { name: /Entrar na conta/i }).click();

  await expect(page).not.toHaveURL(/\/login$/);
  await page.waitForLoadState('domcontentloaded');
}

export async function selectOptionByLabel(page: Page, labelPattern: RegExp, optionPattern: RegExp): Promise<void> {
  const label = page.locator('label').filter({ hasText: labelPattern }).first();
  const siblingContainer = label.locator('xpath=following-sibling::*[1]').first();
  let trigger = siblingContainer.locator('[role="combobox"]').first();

  if (!(await trigger.isVisible().catch(() => false))) {
    const fallbackContainer = label.locator('xpath=..');
    trigger = fallbackContainer.locator('[role="combobox"]').first();
  }

  await trigger.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.getByRole('option', { name: optionPattern }).first().click();
}

export async function fillMoneyInput(input: Locator, centsValue: number): Promise<void> {
  await input.click();
  await input.fill('');
  await input.type(String(centsValue));
}

export async function closeDialogIfOpen(page: Page): Promise<void> {
  const cancelButton = page.getByRole('button', { name: /Cancelar/i }).last();
  if (await cancelButton.isVisible({ timeout: 400 }).catch(() => false)) {
    await cancelButton.click();
  }
}
