import type { BotContext } from './types.js';

export async function getAccountByName(ctx: BotContext, name: string) {
  const { data, error } = await ctx.supabase
    .from('accounts')
    .select('*')
    .eq('user_id', ctx.user.id)
    .eq('name', name)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar conta ${name}: ${error.message}`);
  return data;
}

export async function getCardByName(ctx: BotContext, name: string) {
  const { data, error } = await ctx.supabase
    .from('cards')
    .select('*')
    .eq('user_id', ctx.user.id)
    .eq('name', name)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar cartao ${name}: ${error.message}`);
  return data;
}

export async function getTransactionsByDescription(ctx: BotContext, description: string) {
  const { data, error } = await ctx.supabase
    .from('transactions')
    .select('*')
    .eq('user_id', ctx.user.id)
    .eq('description', description)
    .order('date', { ascending: true })
    .order('installment_number', { ascending: true });
  if (error) throw new Error(`Erro ao buscar transacoes "${description}": ${error.message}`);
  return data || [];
}

export async function getInvoiceForMonth(ctx: BotContext, cardId: string, month: number, year: number) {
  const { data, error } = await ctx.supabase
    .from('invoices')
    .select('*')
    .eq('user_id', ctx.user.id)
    .eq('card_id', cardId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();
  if (error) throw new Error(`Erro ao buscar fatura do cartao: ${error.message}`);
  return data;
}

export async function getInvoicePayments(ctx: BotContext, invoiceId: string) {
  const { data, error } = await ctx.supabase
    .from('invoice_payments')
    .select('*')
    .eq('user_id', ctx.user.id)
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Erro ao buscar pagamentos da fatura: ${error.message}`);
  return data || [];
}

export async function getEffectiveAccountBalance(ctx: BotContext, accountId: string, asOf?: string): Promise<number> {
  const payload = {
    p_account_id: accountId,
    p_as_of: asOf || new Date().toISOString().slice(0, 10),
  };

  const { data, error } = await ctx.supabase.rpc('account_effective_balance', payload);
  if (error) throw new Error(`Erro ao calcular saldo efetivo: ${error.message}`);
  return Number(data || 0);
}

