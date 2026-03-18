using MinhasFinancas.Domain.ValueObjects;

namespace MinhasFinancas.Backend.UnitTests.Domain;

public class TotalPorPessoaTests
{
    [Fact]
    public void Saldo_DeveSerReceitasMenosDespesas()
    {
        var total = new TotalPorPessoa
        {
            TotalReceitas = 3000.00m,
            TotalDespesas = 822.76m
        };

        Assert.Equal(2177.24m, total.Saldo);
    }
}
