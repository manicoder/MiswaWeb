using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.IO;
using Mlt.Admin.Api.Data;
using Mlt.Admin.Api.Services;
using MltAdminApi.Services;
using Mlt.Admin.Api.Middleware;
using Serilog;
using Polly;
using Polly.Extensions.Http;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console()
    .WriteTo.File("logs/mlt-admin-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.WriteIndented = true;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure Entity Framework with PostgreSQL
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

    // Handle Railway's DATABASE_URL format for production
    var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
    if (!string.IsNullOrEmpty(databaseUrl))
    {
        // Convert Railway's postgres:// format to Npgsql format
        if (databaseUrl.StartsWith("postgres://") || databaseUrl.StartsWith("postgresql://"))
        {
            connectionString = ConvertPostgresUrlToConnectionString(databaseUrl);
            // Using PostgreSQL from DATABASE_URL (removed console output)
        }
        else
        {
            connectionString = databaseUrl;
        }
    }
    else
    {
        // Using PostgreSQL from appsettings (removed console output to fix I/O error)
    }

    options.UseNpgsql(connectionString);
});

// Configure HTTP Client for Shopify API with Polly retry policy
builder.Services.AddHttpClient<IShopifyApiService, ShopifyApiService>()
    .AddPolicyHandler(GetRetryPolicy());

// Register services
builder.Services.AddScoped<IEncryptionService, EncryptionService>();
builder.Services.AddScoped<IJobService, JobService>();
builder.Services.AddScoped<IShopifyApiService, ShopifyApiService>();
builder.Services.AddScoped<IShopifyProductSyncService, ShopifyProductSyncService>();
builder.Services.AddScoped<IShopifyOrderSyncService, ShopifyOrderSyncService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IJwtService, JwtService>();

// Register finance service
builder.Services.AddScoped<IFinanceService, FinanceService>();

builder.Services.AddScoped<IStoreConnectionService, StoreConnectionService>();
builder.Services.AddScoped<IValidationService, ValidationService>();
builder.Services.AddScoped<IJobManagementService, JobManagementService>();
builder.Services.AddScoped<IOrderPickupService, OrderPickupService>();
builder.Services.AddScoped<ILabelManagementService, LabelManagementService>();

// Register multi-platform order services
builder.Services.AddScoped<Mlt.Admin.Api.Core.Interfaces.IOrderService<Mlt.Admin.Api.Core.Entities.ShopifyOrder>, Mlt.Admin.Api.Features.Shopify.Services.ShopifyOrderService>();
builder.Services.AddScoped<Mlt.Admin.Api.Core.Interfaces.IOrderService<Mlt.Admin.Api.Core.Entities.AmazonOrder>, Mlt.Admin.Api.Features.Amazon.Services.AmazonOrderService>();
builder.Services.AddScoped<Mlt.Admin.Api.Core.Interfaces.IOrderService<Mlt.Admin.Api.Core.Entities.FlipkartOrder>, Mlt.Admin.Api.Features.Flipkart.Services.FlipkartOrderService>();

// Register Email and Invitation services
builder.Services.AddScoped<Mlt.Admin.Api.Services.IEmailService, Mlt.Admin.Api.Services.EmailService>();
builder.Services.AddScoped<Mlt.Admin.Api.Services.IInvitationService, Mlt.Admin.Api.Services.InvitationService>();
builder.Services.AddScoped<Mlt.Admin.Api.Services.IUserManagementService, Mlt.Admin.Api.Services.UserManagementService>();
builder.Services.AddScoped<IWarehouseShipmentService, WarehouseShipmentService>();
builder.Services.AddScoped<IWarehouseService, WarehouseService>();
builder.Services.AddScoped<IFinanceService, FinanceService>();
builder.Services.AddScoped<ICostFetchingService, CostFetchingService>();
builder.Services.AddScoped<SeedDataService>();

// Configure JWT Authentication
var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY") ??
             builder.Configuration["Jwt:Key"] ??
             throw new InvalidOperationException("JWT Key is not configured. Please set the JWT_KEY environment variable or Jwt:Key in configuration.");
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ??
                builder.Configuration["Jwt:Issuer"] ?? "MLT-Admin-API";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ??
                  builder.Configuration["Jwt:Audience"] ?? "MLT-Admin-Client";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.Zero
    };
});

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        // Get allowed origins from environment variables and configuration
        var allowedOrigins = new List<string>();

        // Add frontend URL from environment variable
        var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL");
        if (!string.IsNullOrEmpty(frontendUrl))
        {
            allowedOrigins.Add(frontendUrl);
        }

        // Add production domains
        allowedOrigins.AddRange(new[]
        {
            "https://mltadmin.mylittletales.com",
            "https://mltadminapi.mylittletales.com",
            "https://miswainternational.com"
        });

        // Add Railway domains
        allowedOrigins.AddRange(new[]
        {   
            "https://mltadminweb.railway.app",
            "https://mltadminapi.railway.app"
        });

        // Add localhost for development
        allowedOrigins.AddRange(new[]
        {
            "http://localhost:5173",
            "https://localhost:5173",
            "http://127.0.0.1:5173",
            "https://127.0.0.1:5173"
        });

        policy.WithOrigins(allowedOrigins.ToArray())
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()
              .SetIsOriginAllowed(origin =>
              {
                  // Allow production domains
                  if (origin.Contains("mylittletales.com"))
                  {
                      return true;
                  }

                  // Allow miswainternational.com domain
                  if (origin.Contains("miswainternational.com"))
                  {
                      return true;
                  }

                  // Allow Railway domains
                  if (origin.Contains("railway.app"))
                  {
                      return true;
                  }

                  // Allow localhost for development
                  if (origin.StartsWith("http://localhost") || origin.StartsWith("https://localhost"))
                  {
                      return true;
                  }

                  return false;
              });
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// CORS must be configured before HTTPS redirection and other middleware
app.UseCors("AllowFrontend");

// Only use HTTPS redirection in production or when HTTPS is properly configured
if (app.Environment.IsProduction() || !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ASPNETCORE_HTTPS_PORT")))
{
    app.UseHttpsRedirection();
}

app.UseMiddleware<RequestLoggingMiddleware>();
app.UseMiddleware<ErrorHandlingMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

// Configure static file serving for uploads
app.UseStaticFiles(); // This serves files from wwwroot
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(
        Path.Combine(builder.Environment.ContentRootPath, "uploads")),
    RequestPath = "/uploads"
});

app.MapControllers();

// Ensure database is ready and migrations are applied (robust for existing schemas)
using (var scope = app.Services.CreateScope())
{
    try
    {
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        bool resetDatabase = false; // Keep false in production

        // Apply migrations safely; do not block startup if schema already exists
        try
        {
            if (resetDatabase)
            {
                Log.Information("Dropping and recreating database...");
                context.Database.EnsureDeleted();
            }

            Log.Information("Applying migrations...");
            context.Database.Migrate();
            Log.Information("Database migrations applied");
        }
        catch (Exception migrEx)
        {
            // Common cases: __EFMigrationsHistory missing or tables already exist
            Log.Warning(migrEx, "Migrations failed or are not needed. Continuing startup because schema likely exists.");
        }

        // Deploy stored procedures for database-backed inventory
        Log.Information("Deploying stored procedures...");
        try
        {
            var connectionString = context.Database.GetConnectionString();
            if (!string.IsNullOrEmpty(connectionString))
            {
                // Deploy comprehensive stored procedures
                using (var connection = new Npgsql.NpgsqlConnection(connectionString))
                {
                    await connection.OpenAsync();
                    
                    // Read and execute the comprehensive stored procedures SQL
                    var sqlPath = Path.Combine(builder.Environment.ContentRootPath, "SQL", "comprehensive-stored-procedures.sql");
                    if (File.Exists(sqlPath))
                    {
                        var sqlContent = await File.ReadAllTextAsync(sqlPath);
                        using (var command = connection.CreateCommand())
                        {
                            command.CommandText = sqlContent;
                            command.CommandTimeout = 300; // 5 minutes timeout
                            await command.ExecuteNonQueryAsync();
                        }
                        Log.Information("Comprehensive stored procedures deployed successfully");
                    }
                    else
                    {
                        Log.Warning("comprehensive-stored-procedures.sql not found at: {Path}", sqlPath);
                    }
                }
            }
        }
        catch (Exception spEx)
        {
            Log.Error(spEx, "Failed to deploy stored procedures: {Error}", spEx.Message);
            // Don't fail the application startup, just log the error
        }

        // Seed initial data
        Log.Information("Seeding initial data...");
        var seedDataService = scope.ServiceProvider.GetRequiredService<SeedDataService>();
        await seedDataService.SeedAllAsync();
        Log.Information("Data seeding completed successfully");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Database setup failed: {ErrorMessage}", ex.Message);
        Log.Error(ex, "Stack trace: {StackTrace}", ex.StackTrace);
    }
}

Log.Information("🚀 MLT Admin .NET API Server Started");
Log.Information("📍 Environment: {Environment}", app.Environment.EnvironmentName);

// Get the port from Railway (production), command line, or default (development)
var port = Environment.GetEnvironmentVariable("PORT") ?? "5001";

// Try to extract port from ASPNETCORE_URLS if set
var urls = Environment.GetEnvironmentVariable("ASPNETCORE_URLS");
if (!string.IsNullOrEmpty(urls) && urls.Contains("localhost:"))
{
    var match = System.Text.RegularExpressions.Regex.Match(urls, @"localhost:(\d+)");
    if (match.Success)
    {
        port = match.Groups[1].Value;
    }
}

var isProduction = app.Environment.IsProduction();
var healthEndpoint = isProduction
    ? $"https://mltadminapi.mylittletales.com/api/health"
    : $"http://localhost:{port}/api/health";

Log.Information("📊 Health Check: {HealthEndpoint}", healthEndpoint);
Log.Information("🔧 Running on Port: {Port}", port);

app.Run();

static string ConvertPostgresUrlToConnectionString(string databaseUrl)
{
    var uri = new Uri(databaseUrl);
    var host = uri.Host;
    var port = uri.Port;
    var database = uri.AbsolutePath.TrimStart('/');
    var username = uri.UserInfo.Split(':')[0];
    var password = uri.UserInfo.Split(':')[1];

    return $"Host={host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true";
}

static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .OrResult(msg => msg.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
        .WaitAndRetryAsync(
            retryCount: 3,
            sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
            onRetry: (outcome, timespan, retryCount, context) =>
            {
                Log.Warning("Retry {RetryCount} after {Delay}ms due to: {Result}",
                    retryCount, timespan.TotalMilliseconds, outcome.Result?.StatusCode);
            });
}
