# Registro de Bugs

Este documento consolida defeitos identificados por exploracao manual e automacoes
(unitario, integracao e E2E). Todos os itens abaixo possuem evidencias em testes ou
passos de reproducao no ambiente local.

## Ambiente de referencia

- API: `http://localhost:5000`
- Frontend: `http://localhost:5173`
- SO: Windows 11
- Navegadores usados na exploracao manual: Edge e Chrome
- Base observada: dados locais do projeto original (sem alteracao no codigo da aplicacao)

## Tickets

### BUG-001 - Icones de receita e despesa invertidos no dashboard
- Tipo: UI
- Severidade: baixa
- Prioridade: media
- Origem: manual
- Pre-condicao: abrir a home (`/dashboard`)
- Passos:
  1. Abrir o card `Receitas do Mes`.
  2. Abrir o card `Despesas do Mes`.
- Resultado esperado: receita com indicativo visual de entrada; despesa com indicativo de saida.
- Resultado obtido: receita mostra seta para baixo e despesa mostra seta para cima.
- Evidencias: observacao direta na tela inicial.
- Status: confirmado

### BUG-002 - Card "Saldo Atual" nao reflete o saldo acumulado
- Tipo: regra de negocio + UI
- Severidade: alta
- Prioridade: alta
- Origem: manual
- Pre-condicao: existir transacoes cadastradas no sistema
- Passos:
  1. Abrir dashboard.
  2. Comparar valor de `Saldo Atual` com historico de transacoes.
- Resultado esperado: saldo atual deve refletir o consolidado das transacoes.
- Resultado obtido: card mostra `R$ 0,00` mesmo com movimentacoes existentes.
- Evidencias: comparacao entre home e tela de transacoes.
- Status: confirmado

### BUG-003 - Resumo mensal considera dados fora do mes corrente
- Tipo: regra de negocio + UI
- Severidade: alta
- Prioridade: alta
- Origem: manual
- Pre-condicao: haver transacoes em meses anteriores e nenhuma no mes atual
- Passos:
  1. Abrir dashboard.
  2. Verificar grafico de `Resumo Mensal`.
- Resultado esperado: exibir apenas dados do mes corrente.
- Resultado obtido: apresenta valores de outros meses no resumo mensal.
- Evidencias: comparacao de datas da lista de transacoes com o grafico mensal.
- Status: confirmado

### BUG-004 - Labels do grafico mensal sobrepostos/cortados
- Tipo: UI
- Severidade: media
- Prioridade: media
- Origem: manual
- Pre-condicao: dashboard com dados no grafico
- Passos:
  1. Abrir dashboard.
  2. Observar labels e textos do grafico de resumo.
- Resultado esperado: labels legiveis e sem sobreposicao.
- Resultado obtido: textos cortados e sobrepostos.
- Evidencias: captura da area `Resumo Mensal`.
- Status: confirmado

### BUG-005 - Legenda do resumo mensal sem correspondencia clara com o grafico
- Tipo: UI + consistencia de dados
- Severidade: media
- Prioridade: media
- Origem: manual
- Pre-condicao: dashboard carregado
- Passos:
  1. Observar itens da legenda do grafico.
  2. Comparar com fatias e labels renderizados.
- Resultado esperado: legenda deve representar apenas categorias realmente plotadas.
- Resultado obtido: legenda exibe itens sem relacao clara com fatias/labels exibidos.
- Evidencias: comparacao visual no dashboard.
- Status: confirmado

### BUG-006 - Coluna "Categoria" em "Ultimas Transacoes" mostra tipo
- Tipo: UI + mapeamento de dados
- Severidade: media
- Prioridade: media
- Origem: manual
- Pre-condicao: home com card `Ultimas Transacoes`
- Passos:
  1. Abrir home.
  2. Verificar coluna `Categoria` do card de ultimas transacoes.
- Resultado esperado: coluna deve exibir a categoria da transacao.
- Resultado obtido: coluna mostra `receita/despesa` (tipo), nao a categoria.
- Evidencias: observacao direta na tabela da home.
- Status: confirmado

### BUG-007 - Menu superior e menu lateral divergentes
- Tipo: UI/navegacao
- Severidade: baixa
- Prioridade: media
- Origem: manual + E2E (`transacoes.known-bug.spec.ts`)
- Pre-condicao: abrir qualquer tela com navegacao principal
- Passos:
  1. Comparar opcoes do menu lateral com o menu superior.
- Resultado esperado: menus com mesmo conjunto de rotas principais.
- Resultado obtido: `Pessoas` existe no menu lateral e nao aparece no menu superior.
- Evidencias: exploracao manual + teste E2E known bug.
- Status: confirmado

### BUG-008 - Lista de transacoes nao exibe pessoa/categoria apos cadastro
- Tipo: UI + mapeamento de dados
- Severidade: alta
- Prioridade: alta
- Origem: manual + frontend unit (`transacoes.known-bug.spec.tsx`)
- Pre-condicao: criar transacao informando pessoa e categoria
- Passos:
  1. Ir em `Transacoes`.
  2. Criar uma transacao com pessoa e categoria preenchidas.
  3. Verificar a linha criada na grade.
- Resultado esperado: colunas `Pessoa` e `Categoria` devem exibir valores selecionados.
- Resultado obtido: colunas ficam vazias apos salvar.
- Evidencias: exploracao manual e teste unitario frontend known bug.
- Status: confirmado

### BUG-009 - Mensagens de validacao em ingles no formulario de transacao
- Tipo: UX/i18n
- Severidade: media
- Prioridade: media
- Origem: E2E (`transacoes.known-bug.spec.ts`)
- Pre-condicao: abrir modal `Adicionar Transacao`
- Passos:
  1. Clicar em `Salvar` com campos obrigatorios invalidos/vazios.
- Resultado esperado: mensagens de erro em portugues e com texto de negocio.
- Resultado obtido: mensagens com prefixo `Invalid input...`.
- Evidencias: teste E2E known bug.
- Status: confirmado

### BUG-010 - Validacao frontend aceita data de nascimento futura
- Tipo: regra de negocio
- Severidade: alta
- Prioridade: alta
- Origem: frontend unit (`schemas.known-bug.spec.ts`)
- Pre-condicao: validar schema de pessoa no frontend
- Passos:
  1. Enviar payload de pessoa com data de nascimento no futuro.
- Resultado esperado: schema deve rejeitar a entrada.
- Resultado obtido: schema considera valido.
- Evidencias: teste unitario frontend known bug.
- Status: confirmado

### BUG-011 - DTO de criacao de transacao aceita `PessoaId`/`CategoriaId` vazios
- Tipo: contrato/validacao backend
- Severidade: alta
- Prioridade: alta
- Origem: backend unit (`CreateTransacaoDtoValidationTests`)
- Pre-condicao: validar DTO de criacao de transacao
- Passos:
  1. Montar DTO com `PessoaId = Guid.Empty` e `CategoriaId = Guid.Empty`.
  2. Executar validacao do DTO.
- Resultado esperado: validacao deve falhar.
- Resultado obtido: validacao nao bloqueia os campos vazios.
- Evidencias: teste `Validate_DeveRetornarErro_QuandoPessoaECategoriaNaoForemInformadas`.
- Status: confirmado

### BUG-012 - DTO de criacao de transacao aceita `Data` default
- Tipo: contrato/validacao backend
- Severidade: media
- Prioridade: media
- Origem: backend unit (`CreateTransacaoDtoValidationTests`)
- Pre-condicao: validar DTO de criacao de transacao
- Passos:
  1. Montar DTO com `Data` default (`DateTime.MinValue`).
  2. Executar validacao.
- Resultado esperado: validacao deve rejeitar data nao informada.
- Resultado obtido: validacao aceita a data default.
- Evidencias: teste `Validate_DeveRetornarErro_QuandoDataNaoForInformada`.
- Status: confirmado

### BUG-013 - `TransacaoService.CreateAsync` nao retorna data informada no DTO de saida
- Tipo: regra de negocio/consistencia de dados
- Severidade: media
- Prioridade: media
- Origem: backend unit + backend integracao
- Pre-condicao: criar transacao via service
- Passos:
  1. Criar transacao informando `Data` valida.
  2. Verificar objeto retornado pelo servico.
- Resultado esperado: DTO de retorno deve conter a mesma data enviada.
- Resultado obtido: retorno vem com data default.
- Evidencias:
  - `TransacaoServiceTests.CreateAsync_DeveRetornarDataInformadaNoDto`
  - `TransacaoServiceIntegrationTests.CreateAsync_DeveRetornarDataInformadaNoDto`
- Status: confirmado

### BUG-014 - Totais por categoria ignoram filtro por categoria
- Tipo: regra de negocio (relatorio)
- Severidade: alta
- Prioridade: alta
- Origem: backend integracao (`TotalServiceIntegrationTests`)
- Pre-condicao: existir mais de uma categoria com movimentos
- Passos:
  1. Consultar totais por categoria aplicando filtro especifico.
  2. Comparar categorias retornadas.
- Resultado esperado: retorno deve conter apenas a categoria filtrada.
- Resultado obtido: retorno inclui categorias fora do filtro.
- Evidencias: teste `GetTotaisPorCategoriaAsync_DeveAplicarFiltroPorCategoria`.
- Status: confirmado

### BUG-015 - Cache de totais por pessoa vaza entre meses diferentes
- Tipo: regra de negocio (relatorio/cache)
- Severidade: alta
- Prioridade: alta
- Origem: backend integracao (`TotalServiceIntegrationTests`)
- Pre-condicao: consultar totais por pessoa em meses distintos
- Passos:
  1. Consultar totais para um mes.
  2. Consultar totais para outro mes diferente.
- Resultado esperado: segunda consulta deve refletir somente o mes solicitado.
- Resultado obtido: segunda consulta reutiliza resultado cacheado do primeiro mes.
- Evidencias: teste `GetTotaisPorPessoaAsync_NaoDeveReutilizarCacheEntreMesesDiferentes`.
- Status: confirmado

### BUG-016 - Cache de totais por categoria vaza entre meses diferentes
- Tipo: regra de negocio (relatorio/cache)
- Severidade: alta
- Prioridade: alta
- Origem: backend integracao (`TotalServiceIntegrationTests`)
- Pre-condicao: consultar totais por categoria em meses distintos
- Passos:
  1. Consultar totais de um mes.
  2. Repetir consulta para mes diferente.
- Resultado esperado: segunda resposta deve recalcular para o novo periodo.
- Resultado obtido: retorna dado de cache da consulta anterior.
- Evidencias: teste `GetTotaisPorCategoriaAsync_NaoDeveReutilizarCacheEntreMesesDiferentes`.
- Status: confirmado

### BUG-017 - Exclusao de pessoa inexistente sem sinalizacao de nao encontrado
- Tipo: regra de negocio/API contract
- Severidade: media
- Prioridade: media
- Origem: backend integracao (`PessoaServiceAdditionalIntegrationTests`)
- Pre-condicao: chamar exclusao com `Guid` inexistente
- Passos:
  1. Executar `DeleteAsync` para pessoa que nao existe.
- Resultado esperado: servico deve sinalizar recurso inexistente (ex.: `KeyNotFoundException`).
- Resultado obtido: exclusao nao sinaliza nao encontrado.
- Evidencias: teste `DeleteAsync_DeveriaLancarKeyNotFound_QuandoPessoaNaoExiste`.
- Status: confirmado

## Observacao sobre suites

Casos que exercitam comportamento defeituoso conhecido ficam marcados como
`KnownBug` para manter:

- regressao estavel na suite principal;
- rastreabilidade objetiva dos defeitos confirmados.
