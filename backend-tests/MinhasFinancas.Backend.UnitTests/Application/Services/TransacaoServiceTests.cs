using MinhasFinancas.Application.DTOs;
using MinhasFinancas.Application.Services;
using MinhasFinancas.Domain.Entities;
using MinhasFinancas.Domain.Interfaces;
using Moq;

namespace MinhasFinancas.Backend.UnitTests.Application.Services;

public class TransacaoServiceTests
{
    private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();
    private readonly Mock<IPessoaRepository> _pessoasRepoMock = new();
    private readonly Mock<ICategoriaRepository> _categoriasRepoMock = new();
    private readonly Mock<ITransacaoRepository> _transacoesRepoMock = new();
    private readonly TransacaoService _service;

    public TransacaoServiceTests()
    {
        _unitOfWorkMock.SetupGet(u => u.Pessoas).Returns(_pessoasRepoMock.Object);
        _unitOfWorkMock.SetupGet(u => u.Categorias).Returns(_categoriasRepoMock.Object);
        _unitOfWorkMock.SetupGet(u => u.Transacoes).Returns(_transacoesRepoMock.Object);
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        _service = new TransacaoService(_unitOfWorkMock.Object);
    }

    [Fact]
    [Trait("Regra", "Confirmada")]
    public async Task CreateAsync_DeveLancarExcecao_QuandoCategoriaNaoExiste()
    {
        var dto = CriarDtoValido(Transacao.ETipo.Despesa);

        _categoriasRepoMock
            .Setup(r => r.GetByIdAsync(dto.CategoriaId))
            .ReturnsAsync((Categoria?)null);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateAsync(dto));

        Assert.Contains("Categoria não encontrada.", exception.Message);
        _transacoesRepoMock.Verify(r => r.AddAsync(It.IsAny<Transacao>()), Times.Never);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Never);
    }

    [Fact]
    [Trait("Regra", "Confirmada")]
    public async Task CreateAsync_DeveLancarExcecao_QuandoPessoaNaoExiste()
    {
        var dto = CriarDtoValido(Transacao.ETipo.Despesa);
        var categoria = CriarCategoria(dto.CategoriaId, Categoria.EFinalidade.Despesa);

        _categoriasRepoMock
            .Setup(r => r.GetByIdAsync(dto.CategoriaId))
            .ReturnsAsync(categoria);

        _pessoasRepoMock
            .Setup(r => r.GetByIdAsync(dto.PessoaId))
            .ReturnsAsync((Pessoa?)null);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateAsync(dto));

        Assert.Contains("Pessoa não encontrada.", exception.Message);
        _transacoesRepoMock.Verify(r => r.AddAsync(It.IsAny<Transacao>()), Times.Never);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Never);
    }

    [Fact]
    [Trait("Regra", "Confirmada")]
    public async Task CreateAsync_DeveBloquearReceita_ParaPessoaMenorDeIdade()
    {
        var dto = CriarDtoValido(Transacao.ETipo.Receita);
        var categoria = CriarCategoria(dto.CategoriaId, Categoria.EFinalidade.Receita);
        var pessoaMenor = CriarPessoa(dto.PessoaId, DateTime.Today.AddYears(-10));

        _categoriasRepoMock
            .Setup(r => r.GetByIdAsync(dto.CategoriaId))
            .ReturnsAsync(categoria);

        _pessoasRepoMock
            .Setup(r => r.GetByIdAsync(dto.PessoaId))
            .ReturnsAsync(pessoaMenor);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateAsync(dto));

        Assert.Equal("Menores de 18 anos não podem registrar receitas.", exception.Message);
        _transacoesRepoMock.Verify(r => r.AddAsync(It.IsAny<Transacao>()), Times.Never);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Never);
    }

    [Fact]
    [Trait("Regra", "Confirmada")]
    public async Task CreateAsync_DeveBloquearDespesa_EmCategoriaDeReceita()
    {
        var dto = CriarDtoValido(Transacao.ETipo.Despesa);
        var categoria = CriarCategoria(dto.CategoriaId, Categoria.EFinalidade.Receita);
        var pessoa = CriarPessoa(dto.PessoaId, DateTime.Today.AddYears(-20));

        _categoriasRepoMock
            .Setup(r => r.GetByIdAsync(dto.CategoriaId))
            .ReturnsAsync(categoria);

        _pessoasRepoMock
            .Setup(r => r.GetByIdAsync(dto.PessoaId))
            .ReturnsAsync(pessoa);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateAsync(dto));

        Assert.Equal("Não é possível registrar despesa em categoria de receita.", exception.Message);
        _transacoesRepoMock.Verify(r => r.AddAsync(It.IsAny<Transacao>()), Times.Never);
    }

    [Fact]
    [Trait("Regra", "Confirmada")]
    public async Task CreateAsync_DeveBloquearReceita_EmCategoriaDeDespesa()
    {
        var dto = CriarDtoValido(Transacao.ETipo.Receita);
        var categoria = CriarCategoria(dto.CategoriaId, Categoria.EFinalidade.Despesa);
        var pessoa = CriarPessoa(dto.PessoaId, DateTime.Today.AddYears(-30));

        _categoriasRepoMock
            .Setup(r => r.GetByIdAsync(dto.CategoriaId))
            .ReturnsAsync(categoria);

        _pessoasRepoMock
            .Setup(r => r.GetByIdAsync(dto.PessoaId))
            .ReturnsAsync(pessoa);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateAsync(dto));

        Assert.Equal("Não é possível registrar receita em categoria de despesa.", exception.Message);
        _transacoesRepoMock.Verify(r => r.AddAsync(It.IsAny<Transacao>()), Times.Never);
    }

    [Fact]
    [Trait("Regra", "Confirmada")]
    public async Task CreateAsync_DevePersistirTransacao_QuandoDadosForemValidos()
    {
        var dto = CriarDtoValido(Transacao.ETipo.Receita);
        var categoria = CriarCategoria(dto.CategoriaId, Categoria.EFinalidade.Ambas, "Investimentos");
        var pessoa = CriarPessoa(dto.PessoaId, DateTime.Today.AddYears(-25), "Maria");

        Transacao? transacaoAdicionada = null;

        _categoriasRepoMock
            .Setup(r => r.GetByIdAsync(dto.CategoriaId))
            .ReturnsAsync(categoria);

        _pessoasRepoMock
            .Setup(r => r.GetByIdAsync(dto.PessoaId))
            .ReturnsAsync(pessoa);

        _transacoesRepoMock
            .Setup(r => r.AddAsync(It.IsAny<Transacao>()))
            .Callback<Transacao>(t => transacaoAdicionada = t)
            .Returns(Task.CompletedTask);

        var resultado = await _service.CreateAsync(dto);

        Assert.NotNull(transacaoAdicionada);
        Assert.Equal(dto.CategoriaId, transacaoAdicionada!.CategoriaId);
        Assert.Equal(dto.PessoaId, transacaoAdicionada.PessoaId);
        Assert.Equal(dto.Descricao, resultado.Descricao);
        Assert.Equal(dto.Valor, resultado.Valor);
        Assert.Equal(dto.Tipo, resultado.Tipo);
        Assert.Equal(dto.CategoriaId, resultado.CategoriaId);
        Assert.Equal("Investimentos", resultado.CategoriaDescricao);
        Assert.Equal(dto.PessoaId, resultado.PessoaId);
        Assert.Equal("Maria", resultado.PessoaNome);
        _transacoesRepoMock.Verify(r => r.AddAsync(It.IsAny<Transacao>()), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    [Trait("Regra", "Hipotese")]
    [Trait("Status", "KnownBug")]
    public async Task CreateAsync_DeveRetornarDataInformadaNoDto()
    {
        var dto = CriarDtoValido(Transacao.ETipo.Despesa);
        dto.Data = new DateTime(2026, 3, 16);

        var categoria = CriarCategoria(dto.CategoriaId, Categoria.EFinalidade.Despesa, "Transporte");
        var pessoa = CriarPessoa(dto.PessoaId, DateTime.Today.AddYears(-40), "Carlos");

        _categoriasRepoMock
            .Setup(r => r.GetByIdAsync(dto.CategoriaId))
            .ReturnsAsync(categoria);

        _pessoasRepoMock
            .Setup(r => r.GetByIdAsync(dto.PessoaId))
            .ReturnsAsync(pessoa);

        _transacoesRepoMock
            .Setup(r => r.AddAsync(It.IsAny<Transacao>()))
            .Returns(Task.CompletedTask);

        var resultado = await _service.CreateAsync(dto);

        Assert.Equal(dto.Data, resultado.Data);
    }

    private static CreateTransacaoDto CriarDtoValido(Transacao.ETipo tipo)
    {
        return new CreateTransacaoDto
        {
            Descricao = "Transacao teste",
            Valor = 100m,
            Tipo = tipo,
            CategoriaId = Guid.NewGuid(),
            PessoaId = Guid.NewGuid(),
            Data = new DateTime(2026, 2, 19)
        };
    }

    private static Categoria CriarCategoria(Guid id, Categoria.EFinalidade finalidade, string descricao = "Categoria teste")
    {
        return new Categoria
        {
            Id = id,
            Descricao = descricao,
            Finalidade = finalidade
        };
    }

    private static Pessoa CriarPessoa(Guid id, DateTime dataNascimento, string nome = "Pessoa teste")
    {
        return new Pessoa
        {
            Id = id,
            Nome = nome,
            DataNascimento = dataNascimento
        };
    }
}
