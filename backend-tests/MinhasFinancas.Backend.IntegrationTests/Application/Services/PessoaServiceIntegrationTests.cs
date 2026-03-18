using Microsoft.EntityFrameworkCore;
using MinhasFinancas.Backend.IntegrationTests.Common;
using MinhasFinancas.Domain.Entities;

namespace MinhasFinancas.Backend.IntegrationTests.Application.Services;

public class PessoaServiceIntegrationTests
{
    [Fact]
    [Trait("Camada", "Integracao")]
    [Trait("Regra", "Confirmada")]
    public async Task DeleteAsync_DeveExcluirTransacoesEmCascataAoExcluirPessoa()
    {
        await using var scope = await IntegrationTestScope.CreateAsync();

        var pessoa = await scope.PessoaService.CreateAsync(TestDataFactory.CriarPessoaMaior("Pessoa para excluir"));
        var categoria = await scope.CategoriaService.CreateAsync(TestDataFactory.CriarCategoriaDespesa("Moradia"));

        var transacao1 = TestDataFactory.CriarTransacao(
            pessoa.Id,
            categoria.Id,
            Transacao.ETipo.Despesa,
            valor: 500m,
            descricao: "Aluguel");

        var transacao2 = TestDataFactory.CriarTransacao(
            pessoa.Id,
            categoria.Id,
            Transacao.ETipo.Despesa,
            valor: 80m,
            descricao: "Condominio");

        await scope.TransacaoService.CreateAsync(transacao1);
        await scope.TransacaoService.CreateAsync(transacao2);

        Assert.Equal(2, await scope.DbContext.Transacoes.CountAsync(t => t.PessoaId == pessoa.Id));

        await scope.PessoaService.DeleteAsync(pessoa.Id);

        Assert.False(await scope.DbContext.Pessoas.AnyAsync(p => p.Id == pessoa.Id));
        Assert.False(await scope.DbContext.Transacoes.AnyAsync(t => t.PessoaId == pessoa.Id));
    }
}
