# Teste Minhas Financas QA

Repositorio com a piramide de testes automatizados do desafio Minhas Financas.

Este repositorio contem apenas testes e documentacao de bugs.
O codigo da aplicacao alvo (fornecido no desafio) nao faz parte deste repositorio.

## Estrutura do repositorio

`backend-tests/MinhasFinancas.Backend.UnitTests`
- Testes unitarios do backend (xUnit).

`backend-tests/MinhasFinancas.Backend.IntegrationTests`
- Testes de integracao do backend com SQLite temporario por teste (sem mocks).

`frontend-tests/unit`
- Testes unitarios do frontend com Vitest.

`frontend-tests/e2e`
- Testes end-to-end do frontend com Playwright.

`docs/bugs.md`
- Registro consolidado dos bugs encontrados.

## Pre-requisitos

1. .NET SDK 9
2. Node.js (npm)
3. Estrutura local:
   - repositorio da aplicacao alvo clonado localmente
   - este repositorio de testes clonado localmente
   - exemplo de estrutura:
     - `/<workspace>/aplicacao-alvo/api/...`
     - `/<workspace>/Teste_Minhas_Financas_QA/...`
   - os projetos de teste backend usam `ProjectReference` para a pasta `api` da aplicacao alvo
     via caminho relativo; se sua estrutura local for diferente, ajuste os caminhos no `.csproj`
4. Para E2E:
   - API em `http://localhost:5000`
   - Web em `http://localhost:5173`

## Como executar os testes

### Backend - unitarios

```powershell
cd backend-tests
dotnet test MinhasFinancas.Backend.UnitTests\MinhasFinancas.Backend.UnitTests.csproj
```

Somente casos estaveis:

```powershell
dotnet test MinhasFinancas.Backend.UnitTests\MinhasFinancas.Backend.UnitTests.csproj --filter "Status!=KnownBug"
```

Somente bugs conhecidos:

```powershell
dotnet test MinhasFinancas.Backend.UnitTests\MinhasFinancas.Backend.UnitTests.csproj --filter "Status=KnownBug"
```

### Backend - integracao

```powershell
cd backend-tests
dotnet test MinhasFinancas.Backend.IntegrationTests\MinhasFinancas.Backend.IntegrationTests.csproj -p:RestoreSources=https://api.nuget.org/v3/index.json
```

Observacao: o `RestoreSources` foi necessario por causa de uma fonte NuGet local invalida no projeto original.

### Backend - consolidado (unit + integracao)

```powershell
cd backend-tests
dotnet test MinhasFinancas.BackendTests.sln -p:RestoreSources=https://api.nuget.org/v3/index.json
```

Suite estavel:

```powershell
dotnet test MinhasFinancas.BackendTests.sln -p:RestoreSources=https://api.nuget.org/v3/index.json --filter "Status!=KnownBug"
```

Suite de bugs conhecidos:

```powershell
dotnet test MinhasFinancas.BackendTests.sln -p:RestoreSources=https://api.nuget.org/v3/index.json --filter "Status=KnownBug"
```

### Frontend - instalacao

```powershell
cd frontend-tests
npm install
npx playwright install chromium
```

Observacao: em PowerShell com `ExecutionPolicy` restritiva, use `npm.cmd` no lugar de `npm`.

### Frontend - unitarios (Vitest)

```powershell
npm run test:unit
```

Suite estavel:

```powershell
npm run test:unit:stable
```

Suite de bugs conhecidos:

```powershell
npm run test:unit:known-bug
```

### Frontend - E2E (Playwright)

```powershell
npm run test:e2e
```

Suite estavel:

```powershell
npm run test:e2e:stable
```

Suite de bugs conhecidos:

```powershell
npm run test:e2e:known-bug
```

### Frontend - consolidado estavel

```powershell
npm run test:all:stable
```

## Como a piramide foi estruturada

### 1) Unitarios (base da piramide)
- Backend: foco em regras de negocio, validacoes e comportamento dos servicos.
- Frontend: foco em schema de formularios e mapeamento de dados nos hooks.

### 2) Integracao (camada intermediaria)
- Backend: servicos reais + banco SQLite temporario.
- Cada teste cria seu proprio banco e descarta no fim.
- Nao altera os dados do ambiente que voce abre no navegador.

### 3) E2E (topo da piramide)
- Frontend com navegador real (Playwright).
- Fluxos criticos de navegacao e cadastro.
- Casos estaveis separados de casos que representam bugs conhecidos.

## Aderencia ao enunciado

- Testes unitarios: implementados em backend (xUnit) e frontend (Vitest).
- Testes de integracao: implementados no backend com banco SQLite isolado por teste.
- Testes end-to-end: implementados no frontend com Playwright.
- Bugs encontrados: documentados em `docs/bugs.md` com passos de reproducao e evidencia.
- CI GitHub Actions: nao implementado (item opcional no enunciado).

## Justificativa das escolhas

1. Separacao `estavel` x `KnownBug` para manter uma suite confiavel de regressao sem perder rastreabilidade de defeitos.
2. Integracao em banco isolado para evitar falso positivo/falso negativo por sujeira de ambiente.
3. E2E focado em fluxo de maior valor (navegacao e transacao), sem inflar quantidade de testes fragis.
4. Cobertura direcionada para regra de negocio do enunciado, nao para percentual de cobertura.

## Regras de negocio cobertas

### Backend (principal)
- Menor de idade nao pode registrar receita.
- Categoria deve respeitar finalidade (`despesa`, `receita`, `ambas`).
- Exclusao em cascata de transacoes ao excluir pessoa.
- Regras de validacao de DTOs e consistencia de totais.

### Frontend (apoio de regra e consistencia)
- Validacao de campos obrigatorios no formulario.
- Conversao de payload entre front e API.
- Fluxo de criacao de transacao no navegador real.
- Consistencia de navegacao e mensagens de validacao.

## Regras com falha confirmada (resumo)

- Contrato de criacao de transacao (campos obrigatorios): `BUG-011`, `BUG-012`.
- Retorno de criacao de transacao (data inconsistente): `BUG-013`.
- Relatorio de totais por categoria (filtro nao aplicado): `BUG-014`.
- Cache de totais por periodo (vazamento entre meses): `BUG-015`, `BUG-016`.
- Exclusao de pessoa inexistente sem sinalizacao de nao encontrado: `BUG-017`.
- Inconsistencias de interface e apresentacao de dados no frontend: `BUG-001` ate `BUG-010`.

## Snapshot de execucao (local)

Referencia temporal do ultimo consolidado documentado:
- Data/hora: 2026-03-18 00:47 (UTC-03:00)
- Ambiente: maquina local Windows 11
- Escopo: unitarios + integracao (backend) e unitarios + E2E (frontend)
- Observacao: numeros abaixo representam um recorte de execucao local e podem variar
  conforme estado do ambiente e dados disponiveis.

Backend:
- Total: 54
- Aprovados: 46
- Falhos: 8 (bugs conhecidos)

Frontend:
- Total: 17
- Aprovados: 13
- Falhos: 4 (bugs conhecidos)

Geral:
- Total: 71
- Aprovados: 59
- Falhos: 12

Suite estavel combinada:
- Total: 59
- Aprovados: 59
- Falhos: 0

## Bugs encontrados

Todos os bugs estao em:
- `docs/bugs.md`
