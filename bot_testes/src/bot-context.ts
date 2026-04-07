import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadConfig } from './config.js';
import type { BotContext } from './types.js';

export async function createBotContext(): Promise<BotContext> {
  const cfg = loadConfig();
  const supabase = createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let signIn = await supabase.auth.signInWithPassword({
    email: cfg.botEmail,
    password: cfg.botPassword,
  });

  if (signIn.error) {
    if (!cfg.autoSignup) {
      throw new Error(
        `Falha ao autenticar bot e BOT_AUTO_SIGNUP=false: ${signIn.error.message}`,
      );
    }

    const signUp = await supabase.auth.signUp({
      email: cfg.botEmail,
      password: cfg.botPassword,
      options: {
        data: {
          name: cfg.botNickname,
        },
      },
    });

    if (signUp.error && !/already registered/i.test(signUp.error.message)) {
      throw new Error(`Falha ao criar usuario bot: ${signUp.error.message}`);
    }

    signIn = await supabase.auth.signInWithPassword({
      email: cfg.botEmail,
      password: cfg.botPassword,
    });
  }

  if (signIn.error || !signIn.data.user) {
    throw new Error(`Falha ao autenticar bot: ${signIn.error?.message ?? 'sem usuario'}`);
  }

  return { cfg, supabase, user: signIn.data.user };
}

async function deleteByUserId(supabase: SupabaseClient, table: string, userId: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('user_id', userId);
  if (error) throw new Error(`Erro limpando ${table}: ${error.message}`);
}

export async function cleanupBotData(ctx: BotContext): Promise<void> {
  if (!ctx.cfg.allowDestructiveCleanup) {
    throw new Error(
      'Cleanup destrutivo bloqueado. Defina BOT_ALLOW_DESTRUCTIVE_CLEANUP=true para permitir.',
    );
  }

  const userId = ctx.user.id;
  const { supabase } = ctx;

  const txRes = await supabase.from('transactions').select('id').eq('user_id', userId);
  if (txRes.error) throw new Error(`Erro lendo transactions para cleanup: ${txRes.error.message}`);
  const txIds = (txRes.data || []).map((t) => t.id);
  if (txIds.length > 0) {
    const { error: tagsDeleteError } = await supabase.from('transaction_tags').delete().in('transaction_id', txIds);
    if (tagsDeleteError) throw new Error(`Erro limpando transaction_tags: ${tagsDeleteError.message}`);
  }

  await deleteByUserId(supabase, 'invoice_payments', userId);
  await deleteByUserId(supabase, 'goal_movements', userId);
  await deleteByUserId(supabase, 'transactions', userId);
  await deleteByUserId(supabase, 'recurrences', userId);
  await deleteByUserId(supabase, 'budgets', userId);
  await deleteByUserId(supabase, 'goals', userId);
  await deleteByUserId(supabase, 'support_tickets', userId);
  await deleteByUserId(supabase, 'invoices', userId);
  await deleteByUserId(supabase, 'cards', userId);
  await deleteByUserId(supabase, 'accounts', userId);
  await deleteByUserId(supabase, 'tags', userId);

  const { error: categoriesError } = await supabase
    .from('categories')
    .delete()
    .eq('user_id', userId)
    .eq('is_system', false);
  if (categoriesError) throw new Error(`Erro limpando categories: ${categoriesError.message}`);
}
