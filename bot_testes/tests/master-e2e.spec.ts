import { test, expect } from '@playwright/test';
import { createBotContext, cleanupBotData } from '../src/bot-context.js';
import { runCase } from '../src/case-runner.js';
import { addMonths, ensureLoggedIn, fillMoneyInput, formatYmd, parseBrlCurrency, selectOptionByLabel, waitForSplash } from '../src/helpers.js';
import { createAccount, createTransaction, getSystemCategoryByType } from '../src/data.js';
import { getAccountByName, getCardByName, getEffectiveAccountBalance, getInvoicePayments, getTransactionsByDescription } from '../src/db.js';
import type { BotContext } from '../src/types.js';

const runId = new Date().toISOString().replace(/\D/g, '').slice(0, 14);

const names = {
  accountPrimary: `BOT Conta Principal ${runId}`,
  accountSecondary: `BOT Conta Reserva ${runId}`,
  cardPrimary: `BOT Cartao Principal ${runId}`,
  txEdit: `BOT Editar ${runId}`,
  txFuture: `BOT Receita Futura ${runId}`,
  txIncome: `BOT Receita ${runId}`,
  txExpense: `BOT Despesa ${runId}`,
  txTransfer: `BOT Transferencia ${runId}`,
  txCardInstallment: `BOT Compra Parcelada ${runId}`,
  txEditUpdated: `BOT Editar Atualizada ${runId}`,
  goal: `BOT Meta ${runId}`,
  recurrence: `BOT Recorrencia ${runId}`,
};

const state: {
  ctx?: BotContext;
  primaryAccountId?: string;
  secondaryAccountId?: string;
  cardId?: string;
  expenseCategoryId?: string;
  incomeCategoryId?: string;
  futureTxDate?: string;
  txEditId?: string;
} = {};

function approxEqual(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) <= tolerance;
}

test.describe.serial('Roteiro Mestre E2E - AZA Planner', () => {
  test.beforeAll(async () => {
    const ctx = await createBotContext();
    state.ctx = ctx;
    await cleanupBotData(ctx);
  });

  test.afterAll(async () => {
    if (state.ctx) {
      await cleanupBotData(state.ctx);
    }
  });

  test('C01 - Autenticacao e estados vazios', async ({ page }) => {
    const ctx = state.ctx!;
    await runCase('C01_AUTH_EMPTY_STATE', 'Autenticacao e estados iniciais vazios', async ({ step, assert }) => {
      step('Realizar login com credenciais do bot');
      await ensureLoggedIn(page, { email: ctx.cfg.botEmail, password: ctx.cfg.botPassword });

      step('Validar estado vazio de contas e cartoes na home');
      await page.goto('/');
      await waitForSplash(page);
      await expect(page.getByText(/Nenhuma conta cadastrada/i)).toBeVisible();
      await expect(page.getByText(/Nenhum cartao cadastrado/i)).toBeVisible();
      assert('Home exibe vazios de conta/cartao', true);

      step('Validar botoes de primeiro cadastro em Planejar');
      await page.goto('/planning');
      await expect(page.getByRole('button', { name: /Criar primeiro or/i })).toBeVisible();

      await page.getByRole('button', { name: /Metas/i }).click();
      await expect(page.getByRole('button', { name: /Criar primeira meta/i })).toBeVisible();

      await page.getByRole('button', { name: /Recorrentes/i }).click();
      await expect(page.getByRole('button', { name: /Criar primeira recorr/i })).toBeVisible();

      assert('Planejamento vazio com CTA nas 3 abas', true);
    });
  });

  test('C02 - Criacao de conta/cartao e seed de dados', async ({ page }) => {
    const ctx = state.ctx!;
    await runCase('C02_BOOTSTRAP_DATA', 'Criacao inicial via UI e seed via API', async ({ step, assert, output }) => {
      step('Login e abertura da home');
      await ensureLoggedIn(page, { email: ctx.cfg.botEmail, password: ctx.cfg.botPassword });
      await page.goto('/');
      await waitForSplash(page);

      step('Criar primeira conta pela UI');
      await page.getByRole('button', { name: /Criar primeira conta/i }).click();
      await page.getByPlaceholder(/Conta Principal/i).fill(names.accountPrimary);
      await selectOptionByLabel(page, /Institui/i, /Nubank/i);
      await page.locator('input[type="number"]').first().fill('5000');
      await page.getByRole('button', { name: /^Criar$/ }).last().click();
      await expect(page.locator('button').filter({ hasText: names.accountPrimary }).first()).toBeVisible();

      const primary = await getAccountByName(ctx, names.accountPrimary);
      assert('Conta principal criada', !!primary, 'Conta principal nao foi encontrada no banco');
      state.primaryAccountId = primary?.id;

      step('Criar conta secundaria via API para cenarios de transferencia');
      const secondary = await createAccount(ctx, {
        name: names.accountSecondary,
        initialBalance: 1000,
      });
      state.secondaryAccountId = secondary.id;

      step('Criar cartao principal pela UI');
      await page.getByRole('button', { name: /Cadastrar primeiro cart/i }).click();
      await page.getByPlaceholder(/Nubank Platinum/i).fill(names.cardPrimary);
      await page.locator('input[placeholder="5.000"]').fill('3000');
      await page.locator('input[placeholder="1234"]').fill('4242');
      await page.getByRole('button', { name: /^Criar$/ }).last().click();
      await expect(page.locator('button').filter({ hasText: names.cardPrimary }).first()).toBeVisible();

      const card = await getCardByName(ctx, names.cardPrimary);
      assert('Cartao principal criado', !!card, 'Cartao nao encontrado no banco');
      state.cardId = card?.id;

      step('Preparar categorias para transacoes');
      const expenseCategory = await getSystemCategoryByType(ctx, 'DESPESA');
      const incomeCategory = await getSystemCategoryByType(ctx, 'RECEITA');
      state.expenseCategoryId = expenseCategory.id;
      state.incomeCategoryId = incomeCategory.id;

      step('Criar transacao para cenario de edicao e uma receita futura');
      const today = formatYmd(new Date());
      const txEdit = await createTransaction(ctx, {
        type: 'DESPESA',
        amount: 45,
        description: names.txEdit,
        date: today,
        accountId: primary!.id,
        categoryId: expenseCategory.id,
      });
      state.txEditId = txEdit.id;

      const futureDate = formatYmd(addMonths(new Date(), 2));
      state.futureTxDate = futureDate;
      await createTransaction(ctx, {
        type: 'RECEITA',
        amount: 10000,
        description: names.txFuture,
        date: futureDate,
        accountId: primary!.id,
        categoryId: incomeCategory.id,
      });

      output('primaryAccountId', state.primaryAccountId);
      output('secondaryAccountId', state.secondaryAccountId);
      output('cardId', state.cardId);
      output('futureTxDate', state.futureTxDate);
    });
  });

  test('C03 - Transacoes ponta a ponta e saldo sem efeito futuro', async ({ page }) => {
    const ctx = state.ctx!;
    await runCase('C03_TX_AND_BALANCE_LOGIC', 'Transacoes (entrada/saida/transferencia) e regra de saldo efetivo', async ({ step, assert, output }) => {
      const primaryAccountId = state.primaryAccountId!;
      const secondaryAccountId = state.secondaryAccountId!;

      step('Login e validacao do saldo efetivo na home (ignorando receita futura)');
      await ensureLoggedIn(page, { email: ctx.cfg.botEmail, password: ctx.cfg.botPassword });
      await page.goto('/');
      await waitForSplash(page);

      const initialEffective = await getEffectiveAccountBalance(ctx, primaryAccountId);
      const initialDisplayedText = await page
        .locator('button')
        .filter({ hasText: names.accountPrimary })
        .first()
        .locator('p')
        .filter({ hasText: /R\$/ })
        .first()
        .textContent();

      const initialDisplayed = parseBrlCurrency(initialDisplayedText || '');
      assert(
        'Saldo exibido bate com saldo efetivo',
        approxEqual(initialDisplayed, initialEffective, 0.05),
        `UI=${initialDisplayed}, efetivo=${initialEffective}`,
      );

      step('Abrir relatorio da conta principal para criar lancamentos');
      await page.locator('button').filter({ hasText: names.accountPrimary }).first().click();
      await expect(page).toHaveURL(new RegExp(`/account/${primaryAccountId}/report`));

      step('Criar receita manual pela UI');
      await page.getByRole('button', { name: /Nova Transa/i }).click();
      await fillMoneyInput(page.getByPlaceholder(/R\$ 0,00/i).first(), 100000);
      await page.getByRole('radio', { name: /Entrada/i }).click();
      await selectOptionByLabel(page, /Categoria/i, /Salario/i);
      await page.locator('textarea').fill(names.txIncome);
      await page.getByRole('button', { name: /CRIAR LAN/ }).click();
      await page.waitForTimeout(2300);

      step('Criar despesa manual pela UI');
      await page.getByRole('button', { name: /Nova Transa/i }).click();
      await fillMoneyInput(page.getByPlaceholder(/R\$ 0,00/i).first(), 20000);
      await page.getByRole('radio', { name: /Despesa/i }).click();
      await selectOptionByLabel(page, /Categoria/i, /Alimentacao/i);
      await page.locator('textarea').fill(names.txExpense);
      await page.getByRole('button', { name: /CRIAR LAN/ }).click();
      await page.waitForTimeout(2300);

      step('Criar transferencia entre contas pela UI');
      await page.getByRole('button', { name: /Transferir/i }).click();
      await fillMoneyInput(page.getByPlaceholder(/R\$ 0,00/i).first(), 15000);
      await selectOptionByLabel(page, /Conta de Destino/i, new RegExp(names.accountSecondary, 'i'));
      await page.locator('textarea').fill(names.txTransfer);
      await page.getByRole('button', { name: /CRIAR LAN/ }).click();
      await page.waitForTimeout(2300);

      step('Voltar para home e comparar saldo exibido x saldo efetivo atualizado');
      await page.getByRole('button').filter({ has: page.locator('svg.lucide-arrow-left') }).first().click();
      await expect(page).toHaveURL(/\/$/);

      const updatedEffective = await getEffectiveAccountBalance(ctx, primaryAccountId);
      const updatedDisplayedText = await page
        .locator('button')
        .filter({ hasText: names.accountPrimary })
        .first()
        .locator('p')
        .filter({ hasText: /R\$/ })
        .first()
        .textContent();
      const updatedDisplayed = parseBrlCurrency(updatedDisplayedText || '');

      assert(
        'Saldo atualizado continua consistente com saldo efetivo',
        approxEqual(updatedDisplayed, updatedEffective, 0.05),
        `UI=${updatedDisplayed}, efetivo=${updatedEffective}`,
      );

      step('Validar transferencia gravada corretamente no banco');
      const txTransferRows = await getTransactionsByDescription(ctx, names.txTransfer);
      const transfer = txTransferRows[0];
      assert('Transferencia encontrada', !!transfer, 'Nao encontrou transferencia no banco');
      assert(
        'Transferencia usa origem/destino corretos',
        transfer.account_id === primaryAccountId && transfer.transfer_to_account_id === secondaryAccountId,
      );

      step('Validar navegacao para mes futuro no historico');
      await page.goto('/transactions/history');
      const monthSelector = page.locator('div.bg-card.rounded-xl.p-3.border.border-border').first();
      await monthSelector.locator('button').nth(1).click();
      await monthSelector.locator('button').nth(1).click();
      await expect(page.getByText(names.txFuture)).toBeVisible();
      assert('Historico permite navegar para mes futuro', true);

      output('initialEffective', initialEffective);
      output('updatedEffective', updatedEffective);
    });
  });

  test('C04 - Edicao e exclusao de transacao via historico', async ({ page }) => {
    const ctx = state.ctx!;
    await runCase('C04_TX_EDIT_DELETE', 'Editar e excluir transacao com reflexo no banco', async ({ step, assert }) => {
      await ensureLoggedIn(page, { email: ctx.cfg.botEmail, password: ctx.cfg.botPassword });
      await page.goto('/transactions/history');

      step('Localizar transacao alvo e abrir dialogo de edicao');
      await page.getByPlaceholder(/Buscar transa/i).fill(names.txEdit);
      await expect(page.getByText(names.txEdit)).toBeVisible();
      await page.getByText(names.txEdit).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();

      step('Editar descricao da transacao');
      const descField = page.getByPlaceholder(/Descricao da transacao/i);
      await descField.fill(names.txEditUpdated);
      await page.getByRole('button', { name: /^Salvar$/i }).click();
      await page.waitForTimeout(800);

      const editedRows = await getTransactionsByDescription(ctx, names.txEditUpdated);
      const edited = editedRows.find((row) => row.id === state.txEditId);
      assert('Descricao atualizada no banco', !!edited, 'Transacao nao foi atualizada');

      step('Excluir transacao editada');
      await page.getByPlaceholder(/Buscar transa/i).fill(names.txEditUpdated);
      await page.getByText(names.txEditUpdated).first().click();
      await page.getByRole('button', { name: /Cancelar/i }).click();
      await page.getByRole('button', { name: /Cancelar transacao/i }).click();
      await page.waitForTimeout(800);

      const { data: cancelledCheck, error } = await ctx.supabase
        .from('transactions')
        .select('id, status')
        .eq('id', state.txEditId!)
        .maybeSingle();
      if (error) throw new Error(`Erro consultando cancelamento de transacao: ${error.message}`);
      assert(
        'Transacao cancelada no banco',
        !!cancelledCheck && cancelledCheck.status === 'CANCELADA',
        `status atual: ${cancelledCheck?.status ?? 'nao encontrada'}`,
      );
    });
  });

  test('C05 - Cartao, parcelamento e pagamento de fatura', async ({ page }) => {
    const ctx = state.ctx!;
    await runCase('C05_CARD_AND_INVOICES', 'Fluxo de cartao, parcelas e quitacao de fatura', async ({ step, assert, output }) => {
      const cardId = state.cardId!;
      const primaryAccountId = state.primaryAccountId!;

      await ensureLoggedIn(page, { email: ctx.cfg.botEmail, password: ctx.cfg.botPassword });

      step('Criar compra parcelada (3x) pela UI do cartao');
      await page.goto(`/card/${cardId}/report`);
      await page.getByRole('button', { name: /Novo Lan/i }).click();
      await fillMoneyInput(page.getByPlaceholder(/R\$ 0,00/i).first(), 120000);
      await selectOptionByLabel(page, /Categoria/i, /Alimentacao/i);
      await selectOptionByLabel(page, /Parcelamento/i, /^3x$/i);
      await page.locator('textarea').fill(names.txCardInstallment);
      await page.getByRole('button', { name: /CRIAR LAN/ }).click();
      await page.waitForTimeout(2400);

      const installmentRows = await getTransactionsByDescription(ctx, names.txCardInstallment);
      assert('Compra parcelada gerou 3 transacoes', installmentRows.length === 3, `Encontradas ${installmentRows.length}`);
      assert(
        'Parcelas com numeracao correta',
        installmentRows.every((row, index) => row.installment_number === index + 1 && row.total_installments === 3),
      );

      step('Validar exibicao de bloco de parcelas ativas');
      await page.getByRole('button', { name: /Relat/i }).click();
      await expect(page.getByText(/Parcelas Ativas/i)).toBeVisible();
      await expect(page.getByText(/restantes/i).first()).toBeVisible();

      step('Abrir faturas e pagar parcial + total');
      await page.goto(`/invoices?cardId=${cardId}`);
      await expect(page.getByRole('button', { name: /Pagar Fatura/i }).first()).toBeVisible();

      const { data: invoiceRows, error: invoiceRowsError } = await ctx.supabase
        .from('invoices')
        .select('*')
        .eq('user_id', ctx.user.id)
        .eq('card_id', cardId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      if (invoiceRowsError) throw new Error(`Erro consultando faturas: ${invoiceRowsError.message}`);

      const invoiceBefore = (invoiceRows || []).find(
        (row) => Number((Number(row.closing_balance || 0) - Number(row.paid_amount || 0)).toFixed(2)) > 0,
      );
      assert('Existe fatura aberta para pagamento', !!invoiceBefore);
      const targetInvoiceId = invoiceBefore!.id;
      const remainingBefore = Number((Number(invoiceBefore!.closing_balance || 0) - Number(invoiceBefore!.paid_amount || 0)).toFixed(2));
      const half = Number((remainingBefore / 2).toFixed(2));

      await page.getByRole('button', { name: /Pagar Fatura/i }).first().click();
      const paymentAmountInput = page
        .locator('div')
        .filter({ has: page.locator('label', { hasText: /Valor do pagamento/i }) })
        .first()
        .locator('input')
        .first();
      await paymentAmountInput.fill(String(half));
      await selectOptionByLabel(page, /Pagar com/i, new RegExp(names.accountPrimary, 'i'));
      await page.getByRole('button', { name: /Confirmar Pagamento/i }).click();
      await page.waitForTimeout(1000);

      const { data: invoiceAfterHalf, error: invoiceAfterHalfError } = await ctx.supabase
        .from('invoices')
        .select('*')
        .eq('id', targetInvoiceId)
        .maybeSingle();
      if (invoiceAfterHalfError) throw new Error(`Erro consultando fatura apos pagamento parcial: ${invoiceAfterHalfError.message}`);
      const paidAfterHalf = Number(invoiceAfterHalf!.paid_amount || 0);
      assert(
        'Pagamento parcial registrado',
        paidAfterHalf > Number(invoiceBefore!.paid_amount || 0),
        `paid_before=${invoiceBefore!.paid_amount}, paid_after=${paidAfterHalf}`,
      );

      await page.getByRole('button', { name: /Pagar Fatura/i }).first().click();
      await page.getByRole('button', { name: /Total/i }).click();
      await page.getByRole('button', { name: /Confirmar Pagamento/i }).click();
      await page.waitForTimeout(1200);

      const { data: invoiceAfterFull, error: invoiceAfterFullError } = await ctx.supabase
        .from('invoices')
        .select('*')
        .eq('id', targetInvoiceId)
        .maybeSingle();
      if (invoiceAfterFullError) throw new Error(`Erro consultando fatura apos quitacao: ${invoiceAfterFullError.message}`);
      const remainingAfterFull = Number(
        (Number(invoiceAfterFull!.closing_balance || 0) - Number(invoiceAfterFull!.paid_amount || 0)).toFixed(2),
      );
      assert(
        'Fatura quitada',
        remainingAfterFull <= 0.01 && invoiceAfterFull!.status === 'PAGA',
        `remaining=${remainingAfterFull}, status=${invoiceAfterFull!.status}`,
      );

      const payments = await getInvoicePayments(ctx, invoiceAfterFull!.id);
      const paidSum = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      assert('Historico de pagamentos registrado', payments.length >= 2, `Pagamentos encontrados: ${payments.length}`);
      assert(
        'Soma de pagamentos cobre valor da fatura',
        paidSum + 0.01 >= Number(invoiceAfterFull!.closing_balance || 0),
        `sum=${paidSum}, closing=${invoiceAfterFull!.closing_balance}`,
      );

      const effectiveBalance = await getEffectiveAccountBalance(ctx, primaryAccountId);
      output('remainingBefore', remainingBefore);
      output('effectiveBalanceAfterPayments', effectiveBalance);
      output('paymentsCount', payments.length);
    });
  });

  test('C06 - Planejamento (orcamento, meta e recorrencia)', async ({ page }) => {
    const ctx = state.ctx!;
    await runCase('C06_PLANNING_CRUD', 'Fluxo de planejamento com CRUD basico', async ({ step, assert }) => {
      await ensureLoggedIn(page, { email: ctx.cfg.botEmail, password: ctx.cfg.botPassword });

      step('Criar primeiro orcamento');
      await page.goto('/planning');
      await page.getByRole('button', { name: /Criar primeiro or/i }).click();
      await selectOptionByLabel(page, /Categoria/i, /Alimentacao/i);
      await fillMoneyInput(page.getByPlaceholder(/R\$ 0,00/i).first(), 80000);
      await page.getByRole('button', { name: /^Salvar$/i }).click();
      await page.waitForURL(/planning\?tab=budgets/);

      const { data: budgets, error: budgetsError } = await ctx.supabase
        .from('budgets')
        .select('*')
        .eq('user_id', ctx.user.id);
      if (budgetsError) throw new Error(`Erro consultando orcamentos: ${budgetsError.message}`);
      assert('Orcamento criado', (budgets || []).length === 1);

      const budgetId = budgets![0].id;
      await page.goto(`/planning/budget/${budgetId}`);
      await fillMoneyInput(page.getByPlaceholder(/R\$ 0,00/i).first(), 90000);
      await page.getByRole('button', { name: /^Salvar$/i }).click();
      await page.waitForURL(/planning\?tab=budgets/);

      const { data: updatedBudget, error: updatedBudgetError } = await ctx.supabase
        .from('budgets')
        .select('amount')
        .eq('id', budgetId)
        .maybeSingle();
      if (updatedBudgetError) throw new Error(`Erro consultando orcamento atualizado: ${updatedBudgetError.message}`);
      assert('Orcamento atualizado para 900', approxEqual(Number(updatedBudget?.amount || 0), 900, 0.01));

      step('Criar primeira meta');
      await page.goto('/planning?tab=goals');
      await page.getByRole('button', { name: /Criar primeira meta/i }).click();
      await page.getByPlaceholder(/Viagem/i).fill(names.goal);
      await fillMoneyInput(page.getByPlaceholder(/R\$ 0,00/i).first(), 300000);
      await page.locator('input[type="date"]').fill(formatYmd(addMonths(new Date(), 4)));
      await page.getByRole('button', { name: /^Salvar$/i }).click();
      await page.waitForURL(/planning\?tab=goals/);

      const { data: goals, error: goalsError } = await ctx.supabase
        .from('goals')
        .select('*')
        .eq('user_id', ctx.user.id)
        .eq('name', names.goal);
      if (goalsError) throw new Error(`Erro consultando metas: ${goalsError.message}`);
      assert('Meta criada', (goals || []).length === 1);

      step('Criar recorrencia e pausar');
      await page.goto('/planning?tab=recurring');
      await page.getByRole('button', { name: /Criar primeira recorr/i }).click();
      await page.getByRole('button', { name: /Receita/i }).click();
      await page.getByPlaceholder(/Salario/i).fill(names.recurrence);
      await selectOptionByLabel(page, /Categoria/i, /Salario/i);
      await selectOptionByLabel(page, /Conta/i, new RegExp(names.accountPrimary, 'i'));
      await fillMoneyInput(page.getByPlaceholder(/R\$ 0,00/i).first(), 70000);
      await selectOptionByLabel(page, /Frequencia/i, /Mensal/i);
      await page.getByRole('button', { name: /^Salvar$/i }).click();
      await page.waitForURL(/planning\?tab=recurring/);

      const { data: recurrences, error: recError } = await ctx.supabase
        .from('recurrences')
        .select('*')
        .eq('user_id', ctx.user.id)
        .eq('name', names.recurrence);
      if (recError) throw new Error(`Erro consultando recorrencias: ${recError.message}`);
      assert('Recorrencia criada', (recurrences || []).length === 1);

      const recurrenceId = recurrences![0].id;
      await page.goto(`/planning/recurring/${recurrenceId}`);
      const pauseButton = page.getByRole('button', { name: /Pausar recorrencia/i });
      const activateButton = page.getByRole('button', { name: /Ativar recorrencia/i });

      if (await pauseButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await pauseButton.click();
        await page.waitForTimeout(700);
      } else if (await activateButton.isVisible({ timeout: 1500 }).catch(() => false)) {
        // Sem acao: a recorrencia ja esta pausada.
      }

      const { data: pausedRecurrence, error: pausedError } = await ctx.supabase
        .from('recurrences')
        .select('is_active')
        .eq('id', recurrenceId)
        .maybeSingle();
      if (pausedError) throw new Error(`Erro validando recorrencia pausada: ${pausedError.message}`);
      assert('Recorrencia pausada no banco', pausedRecurrence?.is_active === false);
    });
  });

  test('C07 - Regras de negocio backend (validacoes)', async () => {
    const ctx = state.ctx!;
    await runCase('C07_BACKEND_VALIDATIONS', 'Validacoes criticas de negocio via API', async ({ step, assert, output }) => {
      const primaryAccountId = state.primaryAccountId!;
      const expenseCategoryId = state.expenseCategoryId!;
      const incomeCategoryId = state.incomeCategoryId!;

      step('Bloquear receita com categoria de despesa');
      const invalidCategoryResult = await ctx.supabase.from('transactions').insert({
        user_id: ctx.user.id,
        type: 'RECEITA',
        amount: 10,
        description: `INVALID_CAT_${runId}`,
        date: formatYmd(new Date()),
        account_id: primaryAccountId,
        category_id: expenseCategoryId,
        status: 'EFETIVADA',
        is_pending: false,
      });
      assert('Receita com categoria invalida falha', !!invalidCategoryResult.error);

      step('Bloquear transferencia para mesma conta');
      const invalidTransferResult = await ctx.supabase.from('transactions').insert({
        user_id: ctx.user.id,
        type: 'TRANSFERENCIA',
        amount: 10,
        description: `INVALID_TRANSFER_${runId}`,
        date: formatYmd(new Date()),
        account_id: primaryAccountId,
        transfer_to_account_id: primaryAccountId,
        status: 'EFETIVADA',
        is_pending: false,
      });
      assert('Transferencia para mesma conta falha', !!invalidTransferResult.error);

      step('Garantir normalizacao de pendencia por status');
      const pendingTest = await ctx.supabase
        .from('transactions')
        .insert({
          user_id: ctx.user.id,
          type: 'RECEITA',
          amount: 12,
          description: `STATUS_NORMALIZE_${runId}`,
          date: formatYmd(new Date()),
          account_id: primaryAccountId,
          category_id: incomeCategoryId,
          status: 'PENDENTE',
          is_pending: false,
        })
        .select('*')
        .single();
      assert('Insercao pendente realizada', !pendingTest.error && !!pendingTest.data);
      assert(
        'Trigger normaliza is_pending=true quando status=PENDENTE',
        pendingTest.data?.is_pending === true,
        `Valor retornado: ${String(pendingTest.data?.is_pending)}`,
      );

      const { data: openInvoice, error: openInvoiceError } = await ctx.supabase
        .from('invoices')
        .select('id')
        .eq('user_id', ctx.user.id)
        .eq('card_id', state.cardId!)
        .in('status', ['ABERTA', 'PARCIALMENTE_PAGA', 'ATRASADA'])
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (openInvoiceError) throw new Error(`Erro consultando fatura para validacao de data futura: ${openInvoiceError.message}`);
      assert('Existe fatura para validar pagamento futuro', !!openInvoice?.id);
      if (!openInvoice?.id) throw new Error('Nao foi encontrada fatura para validar pagamento futuro');

      const futureDate = formatYmd(addMonths(new Date(), 1));
      const payFuture = await ctx.supabase.rpc('pay_invoice', {
        p_invoice_id: openInvoice!.id,
        p_account_id: primaryAccountId,
        p_amount: 1,
        p_payment_date: futureDate,
      });
      assert('Pagamento de fatura com data futura eh bloqueado', !!payFuture.error);

      output('invalidCategoryError', invalidCategoryResult.error?.message || null);
      output('invalidTransferError', invalidTransferResult.error?.message || null);
      output('payFutureError', payFuture.error?.message || null);
    });
  });
});
