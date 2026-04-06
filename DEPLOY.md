# Deploy Workflow

## Estrutura

- App principal: `azainterface-main`
- Testes E2E: `bot_testes`
- Script unificado de deploy: `scripts/deploy.ps1`

## Preparacao unica

1. Configure um repositorio remoto e adicione em `origin`.
2. Configure token/segredos em variaveis de ambiente (use `.env.deploy.example` como referencia):
   - `SUPABASE_ACCESS_TOKEN`
   - `SUPABASE_DB_PASSWORD`
   - `NETLIFY_AUTH_TOKEN`
   - `NETLIFY_SITE_ID`
3. (Opcional) Se Netlify ja estiver conectado ao Git, basta push para disparar deploy.

## Deploy manual

No root `finance-app`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy.ps1 -CommitMessage "deploy: <descricao>"
```

O script executa:

1. `npm run ci` em `azainterface-main`
2. `supabase db push` + deploy das functions (`parse-transaction`, `process-recurrences`) quando tokens estiverem presentes
3. `git add/commit/push`
4. deploy direto no Netlify via CLI quando token/site id estiverem presentes

## Comando de chat

Quando voce enviar `deploy` aqui no chat, eu executo esse script para voce.
