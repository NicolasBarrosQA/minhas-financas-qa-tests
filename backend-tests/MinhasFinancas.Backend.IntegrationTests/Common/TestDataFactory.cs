using MinhasFinancas.Application.DTOs;
using MinhasFinancas.Domain.Entities;

namespace MinhasFinancas.Backend.IntegrationTests.Common;

internal static class TestDataFactory
{
    public static CreatePessoaDto CriarPessoaMaior(string nome = "Pessoa maior")
    {
        return new CreatePessoaDto
        {
            Nome = nome,
            DataNascimento = DateTime.Today.AddYears(-25)
        };
    }

    public static CreatePessoaDto CriarPessoaMenor(string nome = "Pessoa menor")
    {
        return new CreatePessoaDto
        {
            Nome = nome,
            DataNascimento = DateTime.Today.AddYears(-10)
        };
    }

    public static CreateCategoriaDto CriarCategoriaReceita(string descricao = "Salario")
    {
        return new CreateCategoriaDto
        {
            Descricao = descricao,
            Finalidade = Categoria.EFinalidade.Receita
        };
    }

    public static CreateCategoriaDto CriarCategoriaDespesa(string descricao = "Alimentacao")
    {
        return new CreateCategoriaDto
        {
            Descricao = descricao,
            Finalidade = Categoria.EFinalidade.Despesa
        };
    }

    public static CreateCategoriaDto CriarCategoriaAmbas(string descricao = "Investimentos")
    {
        return new CreateCategoriaDto
        {
            Descricao = descricao,
            Finalidade = Categoria.EFinalidade.Ambas
        };
    }

    public static CreateTransacaoDto CriarTransacao(
        Guid pessoaId,
        Guid categoriaId,
        Transacao.ETipo tipo,
        decimal valor = 100m,
        DateTime? data = null,
        string descricao = "Transacao teste")
    {
        return new CreateTransacaoDto
        {
            Descricao = descricao,
            Valor = valor,
            Tipo = tipo,
            CategoriaId = categoriaId,
            PessoaId = pessoaId,
            Data = data ?? new DateTime(2026, 3, 16)
        };
    }
}
