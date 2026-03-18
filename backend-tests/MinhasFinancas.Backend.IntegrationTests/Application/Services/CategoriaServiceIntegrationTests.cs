using MinhasFinancas.Backend.IntegrationTests.Common;

namespace MinhasFinancas.Backend.IntegrationTests.Application.Services;

public class CategoriaServiceIntegrationTests
{
    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task CreateAsync_DevePersistirCategoria()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var categoria = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaDespesa("Transporte"));
        var obtida = await scope.CategoriaService.GetByIdAsync(categoria.Id);

        Assert.NotNull(obtida);
        Assert.Equal("Transporte", obtida!.Descricao);
        Assert.Equal(categoria.Finalidade, obtida.Finalidade);
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task GetByIdAsync_DeveRetornarNulo_QuandoCategoriaNaoExiste()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var categoria = await scope.CategoriaService.GetByIdAsync(Guid.NewGuid());

        Assert.Null(categoria);
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task GetAllAsync_DeveAplicarFiltroDeBuscaPorDescricao()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaDespesa("Transporte"));
        await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaDespesa("Transporte App"));
        await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaReceita("Salario"));

        var resultado = await scope.CategoriaService.GetAllAsync(new MinhasFinancas.Domain.ValueObjects.PagedRequest
        {
            Search = "Transporte",
            Page = 1,
            PageSize = 20
        });

        Assert.Equal(2, resultado.Items.Count());
        Assert.All(resultado.Items, i => Assert.Contains("Transporte", i.Descricao, StringComparison.Ordinal));
    }
}
