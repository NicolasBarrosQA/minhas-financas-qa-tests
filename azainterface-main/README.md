# AZA Finance

Aplicacao web de gestao financeira em React + TypeScript + Supabase.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase

## Requisitos

- Node.js 18+
- npm

## Rodar localmente

```sh
npm install
npm run dev
```

## Build e testes

```sh
npm run build
npm run test
```

## Variaveis de ambiente

Use `.env.example` como base e configure:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Para Edge Functions, use `supabase/functions/.env.example` como referencia:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `ALLOWED_ORIGINS`
- `CRON_SECRET`

## Hardening aplicado

- Guardas de integridade para campos derivados em `INSERT` e `UPDATE` (contas, cartoes e faturas).
- Trilha de auditoria financeira (`financial_audit_log`) para `INSERT/UPDATE/DELETE`.
- Processamento de recorrencias com backoff de falha, contador de tentativas e modo system (`process_due_recurrences_system`).
- Edge Functions com autenticacao obrigatoria, CORS por allowlist e limites de payload/timeout.
