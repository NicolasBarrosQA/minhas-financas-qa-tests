using MinhasFinancas.Backend.IntegrationTests.Common;
using MinhasFinancas.Domain.Entities;

namespace MinhasFinancas.Backend.IntegrationTests.Application.Services;

public class TransacaoServiceAdditionalIntegrationTests
{
    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task CreateAsync_DeveLancarArgumentException_QuandoCategoriaNaoExiste()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Pessoa"));

        var dto = TestDataFactory.CriarTransacao(
            pessoa.Id,
            Guid.NewGuid(),
            Transacao.ETipo.Despesa,
            valor: 100m,
            descricao: "Sem categoria");

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => scope.TransacaoService.CreateAsync(dto));

        Assert.Contains("Categoria não encontrada.", exception.Message);
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task CreateAsync_DeveLancarArgumentException_QuandoPessoaNaoExiste()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var categoria = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaDespesa("Mercado"));

        var dto = TestDataFactory.CriarTransacao(
            Guid.NewGuid(),
            categoria.Id,
            Transacao.ETipo.Despesa,
            valor: 100m,
            descricao: "Sem pessoa");

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => scope.TransacaoService.CreateAsync(dto));

        Assert.Contains("Pessoa não encontrada.", exception.Message);
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task CreateAsync_DevePermitirDespesa_EmCategoriaAmbas()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Pessoa"));
        var categoria = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaAmbas("Investimentos"));

        var dto = TestDataFactory.CriarTransacao(
            pessoa.Id,
            categoria.Id,
            Transacao.ETipo.Despesa,
            valor: 80m,
            data: new DateTime(2026, 1, 2),
            descricao: "Taxa");

        var resultado = await scope.TransacaoService.CreateAsync(dto);

        Assert.Equal(Transacao.ETipo.Despesa, resultado.Tipo);
        Assert.Equal(categoria.Id, resultado.CategoriaId);
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task GetAllAsync_DeveRetornarOrdenadoPorDataDecrescente()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Pessoa"));
        var categoria = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaDespesa("Mercado"));

        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id, categoria.Id, Transacao.ETipo.Despesa, valor: 10m, data: new DateTime(2026, 1, 10), descricao: "T1"));
        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id, categoria.Id, Transacao.ETipo.Despesa, valor: 20m, data: new DateTime(2026, 2, 10), descricao: "T2"));
        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id, categoria.Id, Transacao.ETipo.Despesa, valor: 30m, data: new DateTime(2026, 3, 10), descricao: "T3"));

        var resultado = await scope.TransacaoService.GetAllAsync(new MinhasFinancas.Domain.ValueObjects.PagedRequest
        {
            Page = 1,
            PageSize = 20
        });

        var datas = resultado.Items.Select(i => i.Data).ToArray();
        Assert.Equal(3, datas.Length);
        Assert.True(datas[0] >= datas[1] && datas[1] >= datas[2]);
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task GetByIdAsync_DeveRetornarNulo_QuandoTransacaoNaoExiste()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var transacao = await scope.TransacaoService.GetByIdAsync(Guid.NewGuid());

        Assert.Null(transacao);
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task GetAllAsync_DeveRespeitarPaginacao()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Pessoa"));
        var categoria = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaDespesa("Mercado"));

        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id, categoria.Id, Transacao.ETipo.Despesa, valor: 10m, data: new DateTime(2026, 1, 10), descricao: "T1"));
        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id, categoria.Id, Transacao.ETipo.Despesa, valor: 20m, data: new DateTime(2026, 1, 11), descricao: "T2"));
        await scope.TransacaoService.CreateAsync(TestDataFactory.CriarTransacao(
            pessoa.Id, categoria.Id, Transacao.ETipo.Despesa, valor: 30m, data: new DateTime(2026, 1, 12), descricao: "T3"));

        var pagina1 = await scope.TransacaoService.GetAllAsync(new MinhasFinancas.Domain.ValueObjects.PagedRequest
        {
            Page = 1,
            PageSize = 2
        });
        var pagina2 = await scope.TransacaoService.GetAllAsync(new MinhasFinancas.Domain.ValueObjects.PagedRequest
        {
            Page = 2,
            PageSize = 2
        });

        Assert.Equal(2, pagina1.Items.Count());
        Assert.Single(pagina2.Items);
        Assert.Equal(3, pagina1.TotalCount);
    }
}
