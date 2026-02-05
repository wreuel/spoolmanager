using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using SpoolManager.Server.Authorizations;
using SpoolManager.Server.Domain;
using SpoolManager.Server.Extensions;
using SpoolManager.Server.External.Configuration;
using SpoolManager.Server.External.Implementations;
using SpoolManager.Server.External.Interfaces;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);
// Add services to the container.
builder.Services.AddDbContext<SpoolManagerDbContext>(options =>
{
    options.UseMySQL(builder.Configuration.GetConnectionString("DefaultConnection")!);
});

// Configure SpoolManDb options
builder.Services.Configure<SpoolManDbOptions>(
    builder.Configuration.GetSection(SpoolManDbOptions.SectionName));

// Register HttpClient for SpoolManDbClient
builder.Services.AddHttpClient<ISpoolManDbClient, SpoolManDbClient>((serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<SpoolManDbOptions>>().Value;

    client.BaseAddress = new Uri(options.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
    client.DefaultRequestHeaders.Add("User-Agent", "SpoolManager");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
})
.ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
{
    AutomaticDecompression = System.Net.DecompressionMethods.GZip | System.Net.DecompressionMethods.Deflate
})
.SetHandlerLifetime(TimeSpan.FromMinutes(5));

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddAuth(builder.Configuration);

builder.Services.AddOpenApi(opt =>
{
    opt.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
});


// Add Swagger/OpenAPI support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwagger();
builder.Services.AddMemoryCache();

var app = builder.Build();

// Auto-migrate database in development
if (app.Environment.IsDevelopment())
{
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<SpoolManagerDbContext>();
        try
        {
            await dbContext.Database.MigrateAsync();
        }
        catch (Exception ex)
        {
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "An error occurred while migrating the database.");
        }
    }
}

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<SpoolManagerDbContext>();
#if DEBUG
    var appliedMigrations = await context.Database.GetAppliedMigrationsAsync();
    var availableMigrations = context.Database.GetMigrations();

    bool hasInvalidMigration = appliedMigrations.Any(applied => !availableMigrations.Contains(applied));

    if (hasInvalidMigration)
    {
        await context.Database.EnsureDeletedAsync();
    }
#endif

    await context.Database.MigrateAsync();

    await SeedDatabase(scope);
}

app.UseDefaultFiles();
app.MapStaticAssets();
app.UseStaticFiles();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

await app.RunAsync();


static async Task SeedDatabase(IServiceScope scope)
{
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    string[] roles = { "Admin" };
    foreach (var role in roles)
    {
        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new IdentityRole(role));
    }


    var appContext = scope.ServiceProvider.GetRequiredService<SpoolManagerDbContext>();
}

