import type { SupabaseClient, User } from '@supabase/supabase-js';

export type BotConfig = {
  siteUrl: string;
  botNickname: string;
  botEmail: string;
  botPassword: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  headless: boolean;
  autoSignup: boolean;
  allowDestructiveCleanup: boolean;
};

export type BotContext = {
  cfg: BotConfig;
  supabase: SupabaseClient;
  user: User;
};

export type EvidenceRecord = {
  caseId: string;
  title: string;
  startedAt: string;
  finishedAt: string;
  status: 'passed' | 'failed';
  inputs?: Record<string, unknown>;
  actions?: string[];
  assertions?: Array<{ name: string; passed: boolean; details?: string }>;
  output?: Record<string, unknown>;
  error?: string;
};
