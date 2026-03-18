using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using MinhasFinancas.Application.Services;
using MinhasFinancas.Domain.Interfaces;
using MinhasFinancas.Infrastructure;
using MinhasFinancas.Infrastructure.Data;
using MinhasFinancas.Infrastructure.Queries;

namespace MinhasFinancas.Backend.IntegrationTests.Common;

internal sealed class IntegrationTestScope : IAsyncDisposable
{
    private readonly string _databasePath;
    private readonly MemoryCache _memoryCache;

    public MinhasFinancasDbContext DbContext { get; }
    public IUnitOfWork UnitOfWork { get; }
    public IPessoaService PessoaService { get; }
    public ICategoriaService CategoriaService { get; }
    public ITransacaoService TransacaoService { get; }
    public ITotalService TotalService { get; }

    private IntegrationTestScope(
        string databasePath,
        MinhasFinancasDbContext dbContext,
        MemoryCache memoryCache,
        IUnitOfWork unitOfWork,
        IPessoaService pessoaService,
        ICategoriaService categoriaService,
        ITransacaoService transacaoService,
        ITotalService totalService)
    {
        _databasePath = databasePath;
        _memoryCache = memoryCache;
        DbContext = dbContext;
        UnitOfWork = unitOfWork;
        PessoaService = pessoaService;
        CategoriaService = categoriaService;
        TransacaoService = transacaoService;
        TotalService = totalService;
    }

    public static async Task<IntegrationTestScope> CreateAsync()
    {
        var databasePath = Path.Combine(Path.GetTempPath(), $"minhas-financas-int-{Guid.NewGuid():N}.sqlite");

        var options = new DbContextOptionsBuilder<MinhasFinancasDbContext>()
            .UseSqlite($"Data Source={databasePath}")
            .Options;

        var dbContext = new MinhasFinancasDbContext(options);
        await dbContext.Database.EnsureDeletedAsync();
        await dbContext.Database.EnsureCreatedAsync();

        var unitOfWork = new UnitOfWork(dbContext);
        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var totaisQuery = new TotaisQuery(dbContext, memoryCache);

        return new IntegrationTestScope(
            databasePath,
            dbContext,
            memoryCache,
            unitOfWork,
            new PessoaService(unitOfWork),
            new CategoriaService(unitOfWork),
            new TransacaoService(unitOfWork),
            new TotalService(totaisQuery));
    }

    public ValueTask DisposeAsync()
    {
        UnitOfWork.Dispose();
        _memoryCache.Dispose();

        if (File.Exists(_databasePath))
        {
            try
            {
                File.Delete(_databasePath);
            }
            catch (IOException)
            {
                // Sem impacto para os testes, o arquivo temporário pode ser removido depois pelo SO.
            }
        }

        return ValueTask.CompletedTask;
    }
}
