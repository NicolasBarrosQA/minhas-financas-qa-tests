using Microsoft.EntityFrameworkCore;
using MinhasFinancas.Backend.IntegrationTests.Common;
using MinhasFinancas.Domain.Entities;

namespace MinhasFinancas.Backend.IntegrationTests.Application.Services;

public class TransacaoServiceIntegrationTests
{
    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task CreateAsync_DeveBloquearReceitaParaMenorDeIdade()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var menor = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMenor("Menor"));
        var categoriaReceita = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaReceita("Salario"));

        var dto = TestDataFactory.CriarTransacao(
            menor.Id,
            categoriaReceita.Id,
            Transacao.ETipo.Receita,
            valor: 1000m,
            descricao: "Receita menor");

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => scope.TransacaoService.CreateAsync(dto));

        Assert.Equal("Menores de 18 anos não podem registrar receitas.", exception.Message);
        Assert.Equal(0, await scope.DbContext.Transacoes.CountAsync());
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task CreateAsync_DeveBloquearDespesaEmCategoriaDeReceita()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Adulto"));
        var categoriaReceita = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaReceita("Salario"));

        var dto = TestDataFactory.CriarTransacao(
            pessoa.Id,
            categoriaReceita.Id,
            Transacao.ETipo.Despesa,
            valor: 250m,
            descricao: "Despesa em categoria receita");

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => scope.TransacaoService.CreateAsync(dto));

        Assert.Equal("Não é possível registrar despesa em categoria de receita.", exception.Message);
        Assert.Equal(0, await scope.DbContext.Transacoes.CountAsync());
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task CreateAsync_DeveBloquearReceitaEmCategoriaDeDespesa()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Adulto"));
        var categoriaDespesa = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaDespesa("Mercado"));

        var dto = TestDataFactory.CriarTransacao(
            pessoa.Id,
            categoriaDespesa.Id,
            Transacao.ETipo.Receita,
            valor: 250m,
            descricao: "Receita em categoria despesa");

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => scope.TransacaoService.CreateAsync(dto));

        Assert.Equal("Não é possível registrar receita em categoria de despesa.", exception.Message);
        Assert.Equal(0, await scope.DbContext.Transacoes.CountAsync());
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task CreateAsync_DevePersistirTransacaoComPessoaECategoriaQuandoDadosForemValidos()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Maria"));
        var categoria = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaAmbas("Investimentos"));
        var data = new DateTime(2026, 3, 16);

        var dto = TestDataFactory.CriarTransacao(
            pessoa.Id,
            categoria.Id,
            Transacao.ETipo.Receita,
            valor: 3000m,
            data: data,
            descricao: "Aplicacao");

        var resultado = await scope.TransacaoService.CreateAsync(dto);
        var transacaoPersistida = await scope.DbContext.Transacoes.SingleAsync();

        Assert.Equal(dto.Descricao, resultado.Descricao);
        Assert.Equal(dto.Valor, resultado.Valor);
        Assert.Equal(dto.Tipo, resultado.Tipo);
        Assert.Equal(categoria.Id, resultado.CategoriaId);
        Assert.Equal("Investimentos", resultado.CategoriaDescricao);
        Assert.Equal(pessoa.Id, resultado.PessoaId);
        Assert.Equal("Maria", resultado.PessoaNome);

        Assert.Equal(dto.PessoaId, transacaoPersistida.PessoaId);
        Assert.Equal(dto.CategoriaId, transacaoPersistida.CategoriaId);
        Assert.Equal(dto.Valor, transacaoPersistida.Valor);
        Assert.Equal(dto.Tipo, transacaoPersistida.Tipo);
        Assert.Equal(dto.Data, transacaoPersistida.Data);
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Hipotese")]
    [Trait("Status", "KnownBug")]
    public async Task CreateAsync_DeveRetornarDataInformadaNoDto()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Carlos"));
        var categoria = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaDespesa("Transporte"));
        var data = new DateTime(2026, 2, 19);

        var dto = TestDataFactory.CriarTransacao(
            pessoa.Id,
            categoria.Id,
            Transacao.ETipo.Despesa,
            valor: 150m,
            data: data,
            descricao: "Uber");

        var resultado = await scope.TransacaoService.CreateAsync(dto);

        Assert.Equal(data, resultado.Data);
    }
}
