import type { BotContext } from './types.js';

export async function createAccount(
  ctx: BotContext,
  payload: { name: string; type?: 'CORRENTE' | 'CARTEIRA'; initialBalance: number },
) {
  const { data, error } = await ctx.supabase
    .from('accounts')
    .insert({
      user_id: ctx.user.id,
      name: payload.name,
      type: payload.type ?? 'CORRENTE',
      initial_balance: payload.initialBalance,
      balance: payload.initialBalance,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Falha ao criar conta ${payload.name}: ${error.message}`);
  return data;
}

export async function createCard(
  ctx: BotContext,
  payload: { accountId: string; name: string; limit: number; dueDay: number; closingDay: number },
) {
  const { data, error } = await ctx.supabase
    .from('cards')
    .insert({
      user_id: ctx.user.id,
      account_id: payload.accountId,
      name: payload.name,
      type: 'CREDITO',
      credit_limit: payload.limit,
      current_spend: 0,
      due_day: payload.dueDay,
      closing_day: payload.closingDay,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Falha ao criar cartao ${payload.name}: ${error.message}`);
  return data;
}

export async function createTransaction(
  ctx: BotContext,
  payload: {
    type: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';
    amount: number;
    description: string;
    date: string;
    accountId?: string | null;
    cardId?: string | null;
    transferToAccountId?: string | null;
    categoryId?: string | null;
    status?: 'EFETIVADA' | 'PENDENTE' | 'CANCELADA';
    isPending?: boolean;
    installmentNumber?: number | null;
    totalInstallments?: number | null;
  },
) {
  const { data, error } = await ctx.supabase
    .from('transactions')
    .insert({
      user_id: ctx.user.id,
      type: payload.type,
      amount: payload.amount,
      description: payload.description,
      date: payload.date,
      account_id: payload.accountId ?? null,
      card_id: payload.cardId ?? null,
      transfer_to_account_id: payload.transferToAccountId ?? null,
      category_id: payload.categoryId ?? null,
      status: payload.status ?? 'EFETIVADA',
      is_pending: payload.isPending ?? false,
      origin: payload.type === 'TRANSFERENCIA' ? 'TRANSFERENCIA' : 'MANUAL',
      installment_number: payload.installmentNumber ?? null,
      total_installments: payload.totalInstallments ?? null,
      is_recurring: false,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Falha ao criar transacao ${payload.description}: ${error.message}`);
  return data;
}

export async function getSystemCategoryByType(
  ctx: BotContext,
  type: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA',
) {
  const { data, error } = await ctx.supabase
    .from('categories')
    .select('*')
    .eq('type', type)
    .eq('is_system', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Falha ao buscar categoria ${type}: ${error.message}`);
  if (!data) throw new Error(`Categoria de sistema nao encontrada para tipo ${type}`);
  return data;
}

export async function processDueRecurrences(ctx: BotContext) {
  const { data, error } = await ctx.supabase.rpc('process_due_recurrences', { p_limit: 100 });
  if (error) throw new Error(`Falha ao processar recorrencias: ${error.message}`);
  return Number(data || 0);
}
