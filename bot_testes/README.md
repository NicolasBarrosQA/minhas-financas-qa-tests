# AZA Bot de Testes E2E

Suite automatizada em Playwright + validacoes no Supabase para o AZA Planner.

## 1. Preparacao

1. Entre na pasta:
   - `cd "C:\Users\nicol\OneDrive\Desktop\SCRIPTS - PYTHON\finance-app\bot_testes"`
2. Instale dependencias:
   - `npm install`
3. Instale o navegador do Playwright:
   - `npm run install:browsers`
4. Configure `.env` usando `.env.example` como base:
   - `SITE_URL`
   - `BOT_NICKNAME`
   - `BOT_EMAIL`
   - `BOT_PASSWORD`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `HEADLESS=true|false`
   - `BOT_AUTO_SIGNUP=true|false` (padrao: `false`)
   - `BOT_ALLOW_DESTRUCTIVE_CLEANUP=true|false` (padrao: `false`)
   - `BOT_ALLOW_REMOTE_TARGET=true|false` (padrao: `false`)
   - `BOT_RUN_CONFIRMATION=I_UNDERSTAND` (obrigatorio quando `BOT_ALLOW_REMOTE_TARGET=true`)
   - `BOT_ALLOWED_HOSTS=host1,host2` (opcional)

## 2. Seguranca operacional

- Alvos remotos sao bloqueados por padrao.
- Cleanup destrutivo no banco e bloqueado por padrao.
- Auto signup do usuario de teste e bloqueado por padrao.

## 3. Execucao

- Rodar suite principal:
  - `npm run test:master`
- Rodar todas as suites:
  - `npm test`
- Rodar visualmente:
  - `npm run test:headed`

## 4. Evidencias e resultados

Arquivos gerados em:

- `artifacts/cases/*.json` (resultado de cada caso com acoes/assertivas)
- `artifacts/report-html/` (relatorio HTML)
- `artifacts/report.json` e `artifacts/report-junit.xml`

## 5. Escopo coberto na suite mestre

- Login e estados vazios
- Criacao de conta/cartao
- Fluxos de transacao (entrada/saida/transferencia)
- Regra de saldo efetivo sem impacto de transacao futura
- Navegacao de historico para mes futuro
- Edicao e cancelamento de transacao
- Cartao com parcelamento
- Pagamento parcial e total de fatura
- CRUD essencial de Planejamento (orcamento/meta/recorrencia)
- Validacoes criticas de negocio no backend

