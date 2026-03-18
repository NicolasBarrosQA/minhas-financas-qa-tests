using MinhasFinancas.Backend.IntegrationTests.Common;
using MinhasFinancas.Application.DTOs;

namespace MinhasFinancas.Backend.IntegrationTests.Application.Services;

public class PessoaServiceAdditionalIntegrationTests
{
    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task UpdateAsync_DeveAtualizarNomeEDataNascimento()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Nome antigo"));
        var novoNascimento = new DateTime(1990, 5, 20);

        await scope.PessoaService.UpdateAsync(pessoa.Id, new UpdatePessoaDto
        {
            Nome = "Nome novo",
            DataNascimento = novoNascimento
        });

        var atualizada = await scope.PessoaService.GetByIdAsync(pessoa.Id);

        Assert.NotNull(atualizada);
        Assert.Equal("Nome novo", atualizada!.Nome);
        Assert.Equal(novoNascimento, atualizada.DataNascimento);
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task UpdateAsync_DeveLancarKeyNotFound_QuandoPessoaNaoExiste()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoaInexistenteId = Guid.NewGuid();

        await Assert.ThrowsAsync<KeyNotFoundException>(() => scope.PessoaService.UpdateAsync(pessoaInexistenteId, new UpdatePessoaDto
        {
            Nome = "Pessoa",
            DataNascimento = new DateTime(1995, 1, 1)
        }));
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Hipotese")]
    [Trait("Status", "KnownBug")]
    public async Task DeleteAsync_DeveriaLancarKeyNotFound_QuandoPessoaNaoExiste()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        await Assert.ThrowsAsync<KeyNotFoundException>(() => scope.PessoaService.DeleteAsync(Guid.NewGuid()));
    }

    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task GetAllAsync_DeveAplicarFiltroDeBuscaPorNome()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Ana Silva"));
        await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Ana Maria"));
        await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Carlos Souza"));

        var resultado = await scope.PessoaService.GetAllAsync(new MinhasFinancas.Domain.ValueObjects.PagedRequest
        {
            Search = "Ana",
            Page = 1,
            PageSize = 20
        });

        Assert.Equal(2, resultado.Items.Count());
        Assert.All(resultado.Items, i => Assert.Contains("Ana", i.Nome, StringComparison.Ordinal));
    }
}
