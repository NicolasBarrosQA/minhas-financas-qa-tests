using MinhasFinancas.Application.DTOs;
using MinhasFinancas.Backend.UnitTests.Common;
using MinhasFinancas.Domain.Entities;

namespace MinhasFinancas.Backend.UnitTests.Application.DTOs;

public class CreateTransacaoDtoValidationTests
{
    [Fact]
    [Trait("Regra", "Confirmada")]
    public void Validate_DeveRetornarErro_QuandoDescricaoNaoForInformada()
    {
        var dto = CriarDtoValido();
        dto.Descricao = string.Empty;

        var errors = ValidationHelper.Validate(dto);

        Assert.Contains(errors, e => e.MemberNames.Contains(nameof(CreateTransacaoDto.Descricao)));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-10)]
    [Trait("Regra", "Confirmada")]
    public void Validate_DeveRetornarErro_QuandoValorNaoForPositivo(decimal valor)
    {
        var dto = CriarDtoValido();
        dto.Valor = valor;

        var errors = ValidationHelper.Validate(dto);

        Assert.Contains(errors, e => e.MemberNames.Contains(nameof(CreateTransacaoDto.Valor)));
    }

    [Fact]
    [Trait("Regra", "Hipotese")]
    [Trait("Status", "KnownBug")]
    public void Validate_DeveRetornarErro_QuandoPessoaECategoriaNaoForemInformadas()
    {
        var dto = CriarDtoValido();
        dto.PessoaId = Guid.Empty;
        dto.CategoriaId = Guid.Empty;

        var errors = ValidationHelper.Validate(dto);

        Assert.Contains(errors, e => e.MemberNames.Contains(nameof(CreateTransacaoDto.PessoaId)));
        Assert.Contains(errors, e => e.MemberNames.Contains(nameof(CreateTransacaoDto.CategoriaId)));
    }

    [Fact]
    [Trait("Regra", "Hipotese")]
    [Trait("Status", "KnownBug")]
    public void Validate_DeveRetornarErro_QuandoDataNaoForInformada()
    {
        var dto = CriarDtoValido();
        dto.Data = default;

        var errors = ValidationHelper.Validate(dto);

        Assert.Contains(errors, e => e.MemberNames.Contains(nameof(CreateTransacaoDto.Data)));
    }

    [Fact]
    [Trait("Regra", "Confirmada")]
    public void Validate_DevePassar_QuandoDadosForemValidos()
    {
        var dto = CriarDtoValido();

        var errors = ValidationHelper.Validate(dto);

        Assert.Empty(errors);
    }

    private static CreateTransacaoDto CriarDtoValido()
    {
        return new CreateTransacaoDto
        {
            Descricao = "Compra mercado",
            Valor = 120.50m,
            Tipo = Transacao.ETipo.Despesa,
            CategoriaId = Guid.NewGuid(),
            PessoaId = Guid.NewGuid(),
            Data = new DateTime(2026, 3, 16)
        };
    }
}
