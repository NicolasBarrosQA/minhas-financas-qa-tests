using MinhasFinancas.Backend.IntegrationTests.Common;
using MinhasFinancas.Domain.Entities;
using MinhasFinancas.Domain.ValueObjects;

namespace MinhasFinancas.Backend.IntegrationTests.Application.Services;

public class TotalServiceAdditionalIntegrationTests
{
    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task GetTotaisPorPessoaAsync_DeveAplicarFiltroPorDataInicioEFim()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Pessoa periodo"));
        var categoria = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaDespesa("Transporte"));

        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id, categoria.Id, Transacao.ETipo.Despesa, valor: 10m, data: new DateTime(2026, 1, 10), descricao: "Fora"));
        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id, categoria.Id, Transacao.ETipo.Despesa, valor: 20m, data: new DateTime(2026, 1, 15), descricao: "Dentro"));
        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id, categoria.Id, Transacao.ETipo.Despesa, valor: 30m, data: new DateTime(2026, 1, 20), descricao: "Fora"));

        var totais = await scope.TotalService.GetTotaisPorPessoaAsync(new TotaisPorPessoaFilter
        {
            Pessoa = new IdFilter { Id = pessoa.Id },
            Periodo = new DataFilter
            {
                DataInicio = new DateTime(2026, 1, 12),
                DataFim = new DateTime(2026, 1, 18)
            }
        });

        var total = Assert.Single(totais.Items);
        Assert.Equal(20m, total.TotalDespesas);
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task GetTotaisPorCategoriaAsync_DeveConsolidarReceitasEDespesas()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Pessoa"));
        var categoria = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaAmbas("Investimentos"));

        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id, categoria.Id, Transacao.ETipo.Receita, valor: 500m, data: new DateTime(2026, 1, 10), descricao: "Receita"));
        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id, categoria.Id, Transacao.ETipo.Despesa, valor: 200m, data: new DateTime(2026, 1, 11), descricao: "Despesa"));

        var totais = await scope.TotalService.GetTotaisPorCategoriaAsync();
        var total = Assert.Single(totais.Items, i => i.CategoriaId == categoria.Id);

        Assert.Equal(500m, total.TotalReceitas);
        Assert.Equal(200m, total.TotalDespesas);
        Assert.Equal(300m, total.Saldo);
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Provavel")]
    public async Task GetTotaisPorCategoriaAsync_DeveRetornarCategoriaSemMovimentoComTotaisZero()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Pessoa"));
        var categoriaComMovimento = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaReceita("Salario"));
        var categoriaSemMovimento = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaDespesa("Transporte"));

        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id, categoriaComMovimento.Id, Transacao.ETipo.Receita, valor: 1000m, data: new DateTime(2026, 1, 10), descricao: "Receita"));

        var totais = await scope.TotalService.GetTotaisPorCategoriaAsync();
        var totalSemMovimento = Assert.Single(totais.Items, i => i.CategoriaId == categoriaSemMovimento.Id);

        Assert.Equal(0m, totalSemMovimento.TotalReceitas);
        Assert.Equal(0m, totalSemMovimento.TotalDespesas);
        Assert.Equal(0m, totalSemMovimento.Saldo);
    }
}
