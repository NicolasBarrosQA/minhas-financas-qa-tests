using MinhasFinancas.Backend.IntegrationTests.Common;
using MinhasFinancas.Domain.Entities;
using MinhasFinancas.Domain.ValueObjects;

namespace MinhasFinancas.Backend.IntegrationTests.Application.Services;

public class TotalServiceIntegrationTests
{
    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task GetTotaisPorPessoaAsync_DeveConsolidarReceitasEDespesasDaPessoa()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoaAlvo = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Joao"));
        var outraPessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Pedro"));
        var categoriaReceita = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaReceita("Salario"));
        var categoriaDespesa = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaDespesa("Mercado"));

        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoaAlvo.Id,
            categoriaReceita.Id,
            Transacao.ETipo.Receita,
            valor: 3000m,
            data: new DateTime(2026, 1, 15),
            descricao: "Salario"));

        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoaAlvo.Id,
            categoriaDespesa.Id,
            Transacao.ETipo.Despesa,
            valor: 150m,
            data: new DateTime(2026, 1, 23),
            descricao: "Mercado"));

        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            outraPessoa.Id,
            categoriaDespesa.Id,
            Transacao.ETipo.Despesa,
            valor: 50m,
            data: new DateTime(2026, 1, 20),
            descricao: "Despesa outra pessoa"));

        var filter = new TotaisPorPessoaFilter
        {
            Pessoa = new IdFilter { Id = pessoaAlvo.Id }
        };

        var totais = await scope.TotalService.GetTotaisPorPessoaAsync(filter);
        var totalPessoa = Assert.Single(totais.Items);

        Assert.Equal(pessoaAlvo.Id, totalPessoa.PessoaId);
        Assert.Equal(3000m, totalPessoa.TotalReceitas);
        Assert.Equal(150m, totalPessoa.TotalDespesas);
        Assert.Equal(2850m, totalPessoa.Saldo);
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task GetTotaisPorPessoaAsync_DeveAplicarFiltroDeMesEAno()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Pessoa filtro"));
        var categoriaReceita = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaReceita("Salario"));
        var categoriaDespesa = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaDespesa("Transporte"));

        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id,
            categoriaReceita.Id,
            Transacao.ETipo.Receita,
            valor: 2000m,
            data: new DateTime(2026, 1, 5),
            descricao: "Receita janeiro"));

        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id,
            categoriaDespesa.Id,
            Transacao.ETipo.Despesa,
            valor: 600m,
            data: new DateTime(2026, 2, 3),
            descricao: "Despesa fevereiro"));

        var filter = new TotaisPorPessoaFilter
        {
            Pessoa = new IdFilter { Id = pessoa.Id },
            Periodo = new DataFilter
            {
                Mes = 2,
                Ano = 2026
            }
        };

        var totais = await scope.TotalService.GetTotaisPorPessoaAsync(filter);
        var totalPessoa = Assert.Single(totais.Items);

        Assert.Equal(0m, totalPessoa.TotalReceitas);
        Assert.Equal(600m, totalPessoa.TotalDespesas);
        Assert.Equal(-600m, totalPessoa.Saldo);
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Provavel")]
    public async Task GetTotaisPorPessoaAsync_DeveRetornarPessoaSemMovimentoComTotaisZero()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoaComMovimento = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Com movimento"));
        var pessoaSemMovimento = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Sem movimento"));
        var categoriaReceita = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaReceita("Salario"));

        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoaComMovimento.Id,
            categoriaReceita.Id,
            Transacao.ETipo.Receita,
            valor: 1000m,
            data: new DateTime(2026, 1, 10),
            descricao: "Receita"));

        var totais = await scope.TotalService.GetTotaisPorPessoaAsync();
        var itemSemMovimento = Assert.Single(totais.Items, i => i.PessoaId == pessoaSemMovimento.Id);

        Assert.Equal(0m, itemSemMovimento.TotalReceitas);
        Assert.Equal(0m, itemSemMovimento.TotalDespesas);
        Assert.Equal(0m, itemSemMovimento.Saldo);
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Hipotese")]
    [Trait("Status", "KnownBug")]
    public async Task GetTotaisPorPessoaAsync_NaoDeveReutilizarCacheEntreMesesDiferentes()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Pessoa cache"));
        var categoriaReceita = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaReceita("Salario"));

        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id,
            categoriaReceita.Id,
            Transacao.ETipo.Receita,
            valor: 1000m,
            data: new DateTime(2026, 1, 10),
            descricao: "Receita janeiro"));

        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id,
            categoriaReceita.Id,
            Transacao.ETipo.Receita,
            valor: 2000m,
            data: new DateTime(2026, 2, 10),
            descricao: "Receita fevereiro"));

        var filtroJaneiro = new TotaisPorPessoaFilter
        {
            Pessoa = new IdFilter { Id = pessoa.Id },
            Periodo = new DataFilter { Mes = 1, Ano = 2026 }
        };

        var filtroFevereiro = new TotaisPorPessoaFilter
        {
            Pessoa = new IdFilter { Id = pessoa.Id },
            Periodo = new DataFilter { Mes = 2, Ano = 2026 }
        };

        var totaisJaneiro = await scope.TotalService.GetTotaisPorPessoaAsync(filtroJaneiro);
        var totaisFevereiro = await scope.TotalService.GetTotaisPorPessoaAsync(filtroFevereiro);

        var totalJaneiro = Assert.Single(totaisJaneiro.Items);
        var totalFevereiro = Assert.Single(totaisFevereiro.Items);

        Assert.Equal(1000m, totalJaneiro.TotalReceitas);
        Assert.Equal(2000m, totalFevereiro.TotalReceitas);
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Hipotese")]
    [Trait("Status", "KnownBug")]
    public async Task GetTotaisPorCategoriaAsync_DeveAplicarFiltroPorCategoria()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Pessoa categoria"));
        var categoriaA = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaReceita("Salario"));
        var categoriaB = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaReceita("Freelance"));

        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id,
            categoriaA.Id,
            Transacao.ETipo.Receita,
            valor: 3000m,
            data: new DateTime(2026, 1, 15),
            descricao: "Salario janeiro"));

        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id,
            categoriaB.Id,
            Transacao.ETipo.Receita,
            valor: 700m,
            data: new DateTime(2026, 1, 20),
            descricao: "Freelance janeiro"));

        var filter = new TotaisPorCategoriaFilter
        {
            Categoria = new IdFilter { Id = categoriaA.Id }
        };

        var totais = await scope.TotalService.GetTotaisPorCategoriaAsync(filter);
        var totalCategoria = Assert.Single(totais.Items);

        Assert.Equal(categoriaA.Id, totalCategoria.CategoriaId);
        Assert.Equal(3000m, totalCategoria.TotalReceitas);
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Hipotese")]
    [Trait("Status", "KnownBug")]
    public async Task GetTotaisPorCategoriaAsync_NaoDeveReutilizarCacheEntreMesesDiferentes()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Pessoa cache categoria"));
        var categoria = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaReceita("Receitas"));

        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id,
            categoria.Id,
            Transacao.ETipo.Receita,
            valor: 1100m,
            data: new DateTime(2026, 1, 10),
            descricao: "Receita janeiro"));

        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id,
            categoria.Id,
            Transacao.ETipo.Receita,
            valor: 2100m,
            data: new DateTime(2026, 2, 10),
            descricao: "Receita fevereiro"));

        var filtroJaneiro = new TotaisPorCategoriaFilter
        {
            Periodo = new DataFilter { Mes = 1, Ano = 2026 }
        };

        var filtroFevereiro = new TotaisPorCategoriaFilter
        {
            Periodo = new DataFilter { Mes = 2, Ano = 2026 }
        };

        var totaisJaneiro = await scope.TotalService.GetTotaisPorCategoriaAsync(filtroJaneiro);
        var totaisFevereiro = await scope.TotalService.GetTotaisPorCategoriaAsync(filtroFevereiro);

        var totalJaneiro = Assert.Single(totaisJaneiro.Items, i => i.CategoriaId == categoria.Id);
        var totalFevereiro = Assert.Single(totaisFevereiro.Items, i => i.CategoriaId == categoria.Id);

        Assert.Equal(1100m, totalJaneiro.TotalReceitas);
        Assert.Equal(2100m, totalFevereiro.TotalReceitas);
    }
}
