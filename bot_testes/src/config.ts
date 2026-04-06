import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
import type { BotConfig } from './types.js';

let cached: BotConfig | null = null;

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
}

function validateTarget(siteUrl: string, allowRemoteTarget: boolean, allowedHosts: string[]): void {
  const parsed = new URL(siteUrl);
  const host = parsed.hostname.toLowerCase();

  if (isLocalHost(host)) return;
  if (allowedHosts.includes(host)) return;
  if (allowRemoteTarget) return;

  throw new Error(
    `SITE_URL aponta para host remoto (${host}). Defina BOT_ALLOW_REMOTE_TARGET=true e BOT_RUN_CONFIRMATION=I_UNDERSTAND para liberar.`,
  );
}

export function loadConfig(): BotConfig {
  if (cached) return cached;

  dotenv.config();

  if (parseBool(process.env.BOT_LOAD_PARENT_ENV, false)) {
    dotenv.config({ path: path.resolve(process.cwd(), '../azainterface-main/.env') });
  }

  const allowRemoteTarget = parseBool(process.env.BOT_ALLOW_REMOTE_TARGET, false);
  const runConfirmation = process.env.BOT_RUN_CONFIRMATION ?? '';
  const allowedHosts = parseList(process.env.BOT_ALLOWED_HOSTS).map((host) => host.toLowerCase());

  if (allowRemoteTarget && runConfirmation !== 'I_UNDERSTAND') {
    throw new Error(
      'Execucao remota bloqueada: para continuar, defina BOT_RUN_CONFIRMATION=I_UNDERSTAND.',
    );
  }

  const schema = z.object({
    siteUrl: z.string().url(),
    botNickname: z.string().min(2),
    botEmail: z.string().email(),
    botPassword: z.string().min(8),
    supabaseUrl: z.string().url(),
    supabasePublishableKey: z.string().min(20),
    headless: z.boolean(),
    autoSignup: z.boolean(),
    allowDestructiveCleanup: z.boolean(),
  });

  const parsed = schema.parse({
    siteUrl: process.env.SITE_URL ?? 'http://127.0.0.1:8080',
    botNickname: process.env.BOT_NICKNAME ?? 'botteste',
    botEmail: process.env.BOT_EMAIL,
    botPassword: process.env.BOT_PASSWORD,
    supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
    supabasePublishableKey:
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    headless: parseBool(process.env.HEADLESS, true),
    autoSignup: parseBool(process.env.BOT_AUTO_SIGNUP, false),
    allowDestructiveCleanup: parseBool(process.env.BOT_ALLOW_DESTRUCTIVE_CLEANUP, false),
  });

  validateTarget(parsed.siteUrl, allowRemoteTarget, allowedHosts);

  cached = parsed;
  return parsed;
}

