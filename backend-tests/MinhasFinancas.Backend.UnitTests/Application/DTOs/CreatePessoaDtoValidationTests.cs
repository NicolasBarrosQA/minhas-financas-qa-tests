using MinhasFinancas.Application.DTOs;
using MinhasFinancas.Backend.UnitTests.Common;

namespace MinhasFinancas.Backend.UnitTests.Application.DTOs;

public class CreatePessoaDtoValidationTests
{
    [Fact]
    public void Validate_DeveRetornarErro_QuandoNomeNaoForInformado()
    {
        var dto = new CreatePessoaDto
        {
            Nome = string.Empty,
            DataNascimento = new DateTime(2000, 1, 1)
        };

        var errors = ValidationHelper.Validate(dto);

        Assert.Contains(errors, e => e.MemberNames.Contains(nameof(CreatePessoaDto.Nome)));
    }

    [Fact]
    public void Validate_DeveRetornarErro_QuandoDataNascimentoForNoFuturo()
    {
        var dto = new CreatePessoaDto
        {
            Nome = "Pessoa teste",
            DataNascimento = DateTime.Today.AddDays(1)
        };

        var errors = ValidationHelper.Validate(dto);

        Assert.Contains(
            errors,
            e => e.ErrorMessage != null && e.ErrorMessage.Contains("Data de nascimento", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Validate_DevePassar_QuandoDadosForemValidos()
    {
        var dto = new CreatePessoaDto
        {
            Nome = "Pessoa teste",
            DataNascimento = new DateTime(1990, 10, 15)
        };

        var errors = ValidationHelper.Validate(dto);

        Assert.Empty(errors);
    }
}
