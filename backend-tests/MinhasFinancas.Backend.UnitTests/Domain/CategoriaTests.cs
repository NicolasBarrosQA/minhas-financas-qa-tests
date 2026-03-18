using MinhasFinancas.Domain.Entities;

namespace MinhasFinancas.Backend.UnitTests.Domain;

public class CategoriaTests
{
    [Fact]
    public void PermiteTipo_DevePermitirApenasDespesa_QuandoFinalidadeForDespesa()
    {
        var categoria = new Categoria
        {
            Descricao = "Transporte",
            Finalidade = Categoria.EFinalidade.Despesa
        };

        Assert.True(categoria.PermiteTipo(Transacao.ETipo.Despesa));
        Assert.False(categoria.PermiteTipo(Transacao.ETipo.Receita));
    }

    [Fact]
    public void PermiteTipo_DevePermitirApenasReceita_QuandoFinalidadeForReceita()
    {
        var categoria = new Categoria
        {
            Descricao = "Salario",
            Finalidade = Categoria.EFinalidade.Receita
        };

        Assert.True(categoria.PermiteTipo(Transacao.ETipo.Receita));
        Assert.False(categoria.PermiteTipo(Transacao.ETipo.Despesa));
    }

    [Fact]
    public void PermiteTipo_DevePermitirAmbos_QuandoFinalidadeForAmbas()
    {
        var categoria = new Categoria
        {
            Descricao = "Investimentos",
            Finalidade = Categoria.EFinalidade.Ambas
        };

        Assert.True(categoria.PermiteTipo(Transacao.ETipo.Receita));
        Assert.True(categoria.PermiteTipo(Transacao.ETipo.Despesa));
    }
}
