using MinhasFinancas.Domain.Entities;

namespace MinhasFinancas.Backend.UnitTests.Domain;

public class PessoaTests
{
    [Theory]
    [InlineData(18, true)]
    [InlineData(30, true)]
    [InlineData(17, false)]
    public void EhMaiorDeIdade_DeveRespeitarLimiteDe18Anos(int idade, bool esperado)
    {
        var pessoa = new Pessoa
        {
            Nome = "Pessoa teste",
            DataNascimento = DateTime.Today.AddYears(-idade)
        };

        var resultado = pessoa.EhMaiorDeIdade();

        Assert.Equal(esperado, resultado);
    }

    [Fact]
    public void Idade_DeveConsiderarAniversarioAindaNaoOcorridoNoAno()
    {
        var pessoa = new Pessoa
        {
            Nome = "Pessoa teste",
            DataNascimento = DateTime.Today.AddYears(-18).AddDays(1)
        };

        Assert.Equal(17, pessoa.Idade);
    }
}
