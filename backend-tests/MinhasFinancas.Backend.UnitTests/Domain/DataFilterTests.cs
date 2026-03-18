using MinhasFinancas.Domain.ValueObjects;

namespace MinhasFinancas.Backend.UnitTests.Domain;

public class DataFilterTests
{
    [Fact]
    public void Normalize_DeveConverterMesEAnoEmIntervaloCompleto()
    {
        var filter = new DataFilter
        {
            Mes = 2,
            Ano = 2026
        };

        var normalized = filter.Normalize();

        Assert.Equal(new DateTime(2026, 2, 1), normalized.DataInicio);
        Assert.Equal(new DateTime(2026, 3, 1).AddTicks(-1), normalized.DataFim);
    }

    [Fact]
    public void Normalize_DeveManterDatasOriginais_QuandoMesEAnoNaoForemInformados()
    {
        var inicio = new DateTime(2026, 1, 10, 0, 0, 0);
        var fim = new DateTime(2026, 1, 20, 23, 59, 59);

        var filter = new DataFilter
        {
            DataInicio = inicio,
            DataFim = fim
        };

        var normalized = filter.Normalize();

        Assert.Equal(inicio, normalized.DataInicio);
        Assert.Equal(fim, normalized.DataFim);
    }
}
