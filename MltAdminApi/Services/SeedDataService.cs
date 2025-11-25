using Microsoft.EntityFrameworkCore;
using Mlt.Admin.Api.Data;
using Mlt.Admin.Api.Models;
using Mlt.Admin.Api.Constants;
using BCrypt.Net;
using Microsoft.Extensions.Configuration;
using Npgsql;
using System.Data;

namespace Mlt.Admin.Api.Services;

public class SeedDataService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SeedDataService> _logger;
    private readonly IConfiguration _configuration;

    public SeedDataService(ApplicationDbContext context, ILogger<SeedDataService> logger, IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
    }



        private async Task EnsureStoredProceduresAsync()
        {
            try
            {
                _logger.LogInformation("Ensuring required PostgreSQL functions exist...");

                var connectionString = _context.Database.GetConnectionString();
                if (string.IsNullOrWhiteSpace(connectionString))
                {
                    _logger.LogWarning("Database connection string not available. Skipping stored procedure verification.");
                    return;
                }

                var requiredFunctions = new List<string>
                {
                    // Use to_regprocedure with full signature to avoid ambiguity
                    "GetShopifyProductsWithInventory(uuid,text,text,text,integer,integer,boolean)",
                    "GetShopifyInventoryCount(uuid)",
                    "GetShopifyProductsWithWindow(uuid,text,text,integer,integer,boolean)",
                    "GetShopifyProductsByLocation(uuid,text,text,text,text,integer,integer,boolean)",
                    "GetFinanceDashboardSummary(timestamptz,timestamptz,varchar)",
                    "GetSimpleSalesAnalytics(date,date,text)",
                    "GetTopSellingProducts(timestamp,timestamp,text,integer)",
                    "GetProductsWithAdvancedFiltering(uuid,varchar,varchar,varchar,varchar,varchar,integer,integer,boolean)"
                };

                var missingFunctions = new List<string>();

                await using (var connection = new NpgsqlConnection(connectionString))
                {
                    await connection.OpenAsync();

                    foreach (var funcSignature in requiredFunctions)
                    {
                        await using var checkCmd = connection.CreateCommand();
                        checkCmd.CommandText = "SELECT to_regprocedure(@sig) IS NOT NULL";
                        checkCmd.Parameters.AddWithValue("@sig", NpgsqlTypes.NpgsqlDbType.Text, funcSignature);

                        var exists = (bool)(await checkCmd.ExecuteScalarAsync() ?? false);
                        if (!exists)
                        {
                            missingFunctions.Add(funcSignature);
                        }
                    }

                    if (missingFunctions.Count == 0)
                    {
                        _logger.LogInformation("All required PostgreSQL functions already exist. Skipping deployment.");
                        return;
                    }

                    _logger.LogWarning("{Count} PostgreSQL functions missing. Deploying SQL script...", missingFunctions.Count);

                    var sqlPathCandidates = new[]
                    {
                        // When running via dotnet run from project root
                        Path.Combine(AppContext.BaseDirectory, "SQL", "comprehensive-stored-procedures.sql"),
                        // When running from repo root or relative to project directory
                        Path.Combine(Directory.GetCurrentDirectory(), "MltAdminApi", "SQL", "comprehensive-stored-procedures.sql"),
                        Path.Combine(Directory.GetCurrentDirectory(), "SQL", "comprehensive-stored-procedures.sql")
                    };

                    string? sqlFilePath = sqlPathCandidates.FirstOrDefault(File.Exists);
                    if (sqlFilePath == null)
                    {
                        _logger.LogError("Could not locate comprehensive-stored-procedures.sql. Checked: {Paths}", string.Join(", ", sqlPathCandidates));
                        return;
                    }

                    var sql = await File.ReadAllTextAsync(sqlFilePath);

                    await using var applyCmd = connection.CreateCommand();
                    applyCmd.CommandText = sql;
                    applyCmd.CommandType = CommandType.Text;
                    await applyCmd.ExecuteNonQueryAsync();

                    _logger.LogInformation("Stored procedures deployed successfully from {Path}", sqlFilePath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error ensuring stored procedures exist");
                // Do not rethrow: we don't want to block app startup if only SP deployment failed
            }
        }

    public async Task SeedSuperAdminAsync()
    {
        try
        {
            // Determine configured super admin credentials
            var configuredEmail = Environment.GetEnvironmentVariable("SUPERADMIN_EMAIL")
                                   ?? _configuration["Admin:SuperAdminEmail"]
                                   ?? "admin@mylittletales.com";
            var configuredPassword = Environment.GetEnvironmentVariable("SUPERADMIN_PASSWORD")
                                       ?? _configuration["Admin:SuperAdminPassword"];

            // If a SuperAdmin exists, ensure it has a password hash
            var existingSuperAdmin = await _context.Users
                .Where(u => u.Role == UserRole.SuperAdmin)
                .OrderBy(u => u.CreatedAt)
                .FirstOrDefaultAsync();

            if (existingSuperAdmin != null)
            {
                if (string.IsNullOrWhiteSpace(existingSuperAdmin.PasswordHash))
                {
                    var fallbackPassword = configuredPassword ?? "TempPassword123!";
                    existingSuperAdmin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(fallbackPassword);
                    existingSuperAdmin.IsActive = true;
                    existingSuperAdmin.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    _logger.LogWarning("SuperAdmin existed without password. A password was set. Please change it immediately.");
                }
                else
                {
                    _logger.LogInformation("SuperAdmin already exists, skipping creation");
                }
                return;
            }

            // Create new SuperAdmin using configured values
            var emailToUse = configuredEmail;
            var passwordToUse = configuredPassword ?? "TempPassword123!"; // Encourage change on first login

            var superAdmin = new User
            {
                Id = Guid.NewGuid(),
                Email = emailToUse,
                Name = "System SuperAdmin",
                Role = UserRole.SuperAdmin,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = "System",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(passwordToUse)
            };

            _context.Users.Add(superAdmin);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Successfully seeded SuperAdmin user: {Email}", superAdmin.Email);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding SuperAdmin user");
            throw;
        }
    }

    public async Task SeedExpenseCategoriesAsync()
    {
        try
        {
            // Check if ExpenseCategories already has data
            if (await _context.ExpenseCategories.AnyAsync())
            {
                _logger.LogInformation("ExpenseCategories already has data, skipping seed");
                return;
            }

            var categories = new List<ExpenseCategory>
            {
                new ExpenseCategory
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Office Rent",
                    Type = "rent",
                    Description = "Office and warehouse rent expenses",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseCategory
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Electricity",
                    Type = "utilities",
                    Description = "Electricity and power expenses",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseCategory
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Water & Sewage",
                    Type = "utilities",
                    Description = "Water and sewage utility expenses",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseCategory
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Internet & Phone",
                    Type = "utilities",
                    Description = "Internet and phone service expenses",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseCategory
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Office Supplies",
                    Type = "office_supplies",
                    Description = "Office supplies and equipment",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseCategory
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Digital Marketing",
                    Type = "marketing",
                    Description = "Digital marketing and advertising expenses",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseCategory
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Print Advertising",
                    Type = "marketing",
                    Description = "Print advertising and marketing materials",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseCategory
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Software Subscriptions",
                    Type = "software",
                    Description = "Software and SaaS subscriptions",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseCategory
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Hardware & Equipment",
                    Type = "software",
                    Description = "Computer hardware and equipment",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseCategory
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Fuel",
                    Type = "transport",
                    Description = "Fuel expenses for vehicles",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseCategory
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Vehicle Maintenance",
                    Type = "transport",
                    Description = "Vehicle maintenance and repairs",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseCategory
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Business Insurance",
                    Type = "insurance",
                    Description = "Business insurance premiums",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseCategory
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Legal Services",
                    Type = "legal",
                    Description = "Legal consultation and services",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseCategory
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Accounting Services",
                    Type = "consulting",
                    Description = "Accounting and bookkeeping services",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseCategory
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Travel Expenses",
                    Type = "travel",
                    Description = "Business travel expenses",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseCategory
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Meals & Entertainment",
                    Type = "meals",
                    Description = "Business meals and entertainment",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            await _context.ExpenseCategories.AddRangeAsync(categories);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Seeded {Count} expense category records", categories.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding expense categories");
            throw;
        }
    }

    public async Task SeedSuppliersAsync()
    {
        try
        {
            // Check if Suppliers already has data
            if (await _context.Suppliers.AnyAsync())
            {
                _logger.LogInformation("Suppliers already has data, skipping seed");
                return;
            }

            var suppliers = new List<Supplier>
            {
                new Supplier
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Tech Supplies Co.",
                    Address = "123 Tech Street, Silicon Valley, CA 94025",
                    ContactPerson = "John Smith",
                    Phone = "+1-555-0123",
                    Email = "john@techsupplies.com",
                    TaxId = "TAX123456789",
                    PaymentTerms = "Net 30",
                    Notes = "Reliable supplier for electronic components",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Supplier
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Office Solutions Ltd.",
                    Address = "456 Business Ave, New York, NY 10001",
                    ContactPerson = "Sarah Johnson",
                    Phone = "+1-555-0456",
                    Email = "sarah@officesolutions.com",
                    TaxId = "TAX987654321",
                    PaymentTerms = "Net 15",
                    Notes = "Premium office supplies and furniture",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Supplier
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Global Electronics",
                    Address = "789 Innovation Blvd, Austin, TX 73301",
                    ContactPerson = "Mike Chen",
                    Phone = "+1-555-0789",
                    Email = "mike@globalelectronics.com",
                    TaxId = "TAX456789123",
                    PaymentTerms = "Net 45",
                    Notes = "Wholesale electronics and components",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Supplier
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Packaging Plus",
                    Address = "321 Warehouse Dr, Chicago, IL 60601",
                    ContactPerson = "Lisa Brown",
                    Phone = "+1-555-0321",
                    Email = "lisa@packagingplus.com",
                    TaxId = "TAX789123456",
                    PaymentTerms = "Net 30",
                    Notes = "Custom packaging and shipping supplies",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Supplier
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Marketing Materials Inc.",
                    Address = "654 Creative Way, Los Angeles, CA 90210",
                    ContactPerson = "David Wilson",
                    Phone = "+1-555-0654",
                    Email = "david@marketingmaterials.com",
                    TaxId = "TAX321654987",
                    PaymentTerms = "Net 20",
                    Notes = "High-quality marketing and promotional materials",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            await _context.Suppliers.AddRangeAsync(suppliers);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Seeded {Count} supplier records", suppliers.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding suppliers");
            throw;
        }
    }

    public async Task SeedSalesAnalyticsAsync1()
    {
        try
        {
            // Check if SalesAnalytics already has data
            if (await _context.SalesAnalytics.AnyAsync())
            {
                _logger.LogInformation("SalesAnalytics already has data, skipping seed");
                return;
            }

            var random = new Random();
            var salesAnalytics = new List<SalesAnalytics>();

            // Generate 6 months of test data
            for (int i = 5; i >= 0; i--)
            {
                var date = DateTime.UtcNow.AddMonths(-i);
                var baseRevenue = 50000m + (random.Next(0, 50000));
                var orders = random.Next(20, 80);
                var averageOrderValue = baseRevenue / orders;
                var costOfGoods = baseRevenue * 0.6m; // 60% cost
                var grossProfit = baseRevenue - costOfGoods;
                var grossMargin = (grossProfit / baseRevenue) * 100;

                salesAnalytics.Add(new SalesAnalytics
                {
                    Id = Guid.NewGuid().ToString(),
                    Date = date,
                    Revenue = baseRevenue,
                    Orders = orders,
                    AverageOrderValue = averageOrderValue,
                    CostOfGoods = costOfGoods,
                    GrossProfit = grossProfit,
                    GrossMargin = grossMargin,
                    Currency = "INR",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            await _context.SalesAnalytics.AddRangeAsync(salesAnalytics);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Seeded {Count} SalesAnalytics records", salesAnalytics.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding SalesAnalytics data");
            throw;
        }
    }

    public async Task SeedChartOfAccountsAsync()
    {
        try
        {
            // Check if ChartOfAccounts already has data
            if (await _context.ChartOfAccounts.AnyAsync())
            {
                _logger.LogInformation("ChartOfAccounts already has data, skipping seed");
                return;
            }

            var chartAccounts = new List<ChartOfAccount>
            {
                // Asset Accounts
                new ChartOfAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    Code = "1000",
                    Name = "Cash",
                    Type = "Asset",
                    Description = "Cash on hand and in bank",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ChartOfAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    Code = "1100",
                    Name = "Accounts Receivable",
                    Type = "Asset",
                    Description = "Money owed by customers",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ChartOfAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    Code = "1200",
                    Name = "Inventory",
                    Type = "Asset",
                    Description = "Current inventory value",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ChartOfAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    Code = "1300",
                    Name = "Office Equipment",
                    Type = "Asset",
                    Description = "Office furniture and equipment",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },

                // Liability Accounts
                new ChartOfAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    Code = "2000",
                    Name = "Accounts Payable",
                    Type = "Liability",
                    Description = "Money owed to suppliers",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ChartOfAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    Code = "2100",
                    Name = "Bank Loan",
                    Type = "Liability",
                    Description = "Business loan from bank",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },

                // Revenue Accounts
                new ChartOfAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    Code = "3000",
                    Name = "Sales Revenue",
                    Type = "Revenue",
                    Description = "Revenue from product sales",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ChartOfAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    Code = "3100",
                    Name = "Other Income",
                    Type = "Revenue",
                    Description = "Other business income",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },

                // Expense Accounts
                new ChartOfAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    Code = "4000",
                    Name = "Office Rent",
                    Type = "Expense",
                    Description = "Office and warehouse rent",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ChartOfAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    Code = "4100",
                    Name = "Utilities",
                    Type = "Expense",
                    Description = "Electricity, water, and other utilities",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ChartOfAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    Code = "4200",
                    Name = "Office Supplies",
                    Type = "Expense",
                    Description = "Office supplies and stationery",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ChartOfAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    Code = "4300",
                    Name = "Salaries",
                    Type = "Expense",
                    Description = "Employee salaries and wages",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ChartOfAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    Code = "4400",
                    Name = "Marketing",
                    Type = "Expense",
                    Description = "Advertising and marketing expenses",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ChartOfAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    Code = "4500",
                    Name = "Transportation",
                    Type = "Expense",
                    Description = "Transportation and delivery costs",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ChartOfAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    Code = "4600",
                    Name = "Insurance",
                    Type = "Expense",
                    Description = "Business insurance premiums",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ChartOfAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    Code = "4700",
                    Name = "Software & Tools",
                    Type = "Expense",
                    Description = "Software licenses and tools",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ChartOfAccount
                {
                    Id = Guid.NewGuid().ToString(),
                    Code = "4800",
                    Name = "Travel & Meals",
                    Type = "Expense",
                    Description = "Business travel and meals",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            await _context.ChartOfAccounts.AddRangeAsync(chartAccounts);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Seeded {Count} chart of accounts records", chartAccounts.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding chart of accounts");
            throw;
        }
    }

    public async Task SeedAccountingSystemAsync()
    {
        try
        {
            // Check if AccountGroups already has data
            if (await _context.AccountGroups.AnyAsync())
            {
                _logger.LogInformation("Accounting system already has data, skipping seed");
                return;
            }

            _logger.LogInformation("Seeding accounting system data...");

            // Create Account Groups
            var accountGroups = new List<AccountGroup>
            {
                new AccountGroup
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Assets",
                    Type = "Asset",
                    Description = "All asset accounts including current and fixed assets",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new AccountGroup
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Liabilities",
                    Type = "Liability",
                    Description = "All liability accounts including current and long-term liabilities",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new AccountGroup
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Income",
                    Type = "Income",
                    Description = "All income and revenue accounts",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new AccountGroup
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Expenses",
                    Type = "Expense",
                    Description = "All expense and cost accounts",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            await _context.AccountGroups.AddRangeAsync(accountGroups);
            await _context.SaveChangesAsync();

            // Create Ledgers
            var ledgers = new List<Ledger>
            {
                // Asset Ledgers
                new Ledger
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Cash Account",
                    GroupId = accountGroups[0].Id, // Assets
                    OpeningBalance = 50000,
                    Description = "Main cash account for business operations",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Ledger
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Bank Account",
                    GroupId = accountGroups[0].Id, // Assets
                    OpeningBalance = 100000,
                    Description = "Primary business bank account",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Ledger
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Accounts Receivable",
                    GroupId = accountGroups[0].Id, // Assets
                    OpeningBalance = 25000,
                    Description = "Money owed by customers",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Ledger
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Inventory",
                    GroupId = accountGroups[0].Id, // Assets
                    OpeningBalance = 75000,
                    Description = "Current inventory value",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Ledger
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Office Equipment",
                    GroupId = accountGroups[0].Id, // Assets
                    OpeningBalance = 15000,
                    Description = "Office furniture and equipment",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },

                // Liability Ledgers
                new Ledger
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Accounts Payable",
                    GroupId = accountGroups[1].Id, // Liabilities
                    OpeningBalance = 30000,
                    Description = "Money owed to suppliers",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Ledger
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Bank Loan",
                    GroupId = accountGroups[1].Id, // Liabilities
                    OpeningBalance = 50000,
                    Description = "Business loan from bank",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },

                // Income Ledgers
                new Ledger
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Sales Revenue",
                    GroupId = accountGroups[2].Id, // Income
                    OpeningBalance = 0,
                    Description = "Revenue from product sales",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Ledger
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Service Revenue",
                    GroupId = accountGroups[2].Id, // Income
                    OpeningBalance = 0,
                    Description = "Revenue from services",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },

                // Expense Ledgers
                new Ledger
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Office Rent",
                    GroupId = accountGroups[3].Id, // Expenses
                    OpeningBalance = 0,
                    Description = "Office and warehouse rent expenses",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Ledger
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Utilities",
                    GroupId = accountGroups[3].Id, // Expenses
                    OpeningBalance = 0,
                    Description = "Electricity, water, and internet expenses",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Ledger
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Salaries",
                    GroupId = accountGroups[3].Id, // Expenses
                    OpeningBalance = 0,
                    Description = "Employee salaries and wages",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Ledger
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "Marketing Expenses",
                    GroupId = accountGroups[3].Id, // Expenses
                    OpeningBalance = 0,
                    Description = "Advertising and marketing costs",
                    IsActive = true,
                    CreatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            // await _context.Ledgers.AddRangeAsync(ledgers);
            // await _context.SaveChangesAsync();

            // // Create sample transactions
            // var transactions = new List<Transaction>
            // {
            //     new Transaction
            //     {
            //         Id = Guid.NewGuid().ToString(),
            //         Date = DateTime.UtcNow.AddDays(-30),
            //         Type = "Payment",
            //         Description = "Paid office rent for January",
            //         CreatedBy = "System",
            //         Status = "Completed",
            //         Notes = "Monthly office rent payment",
            //         CreatedAt = DateTime.UtcNow,
            //         UpdatedAt = DateTime.UtcNow
            //     },
            //     new Transaction
            //     {
            //         Id = Guid.NewGuid().ToString(),
            //         Date = DateTime.UtcNow.AddDays(-25),
            //         Type = "Receipt",
            //         Description = "Received payment from customer",
            //         CreatedBy = "System",
            //         Status = "Completed",
            //         Notes = "Payment for order #1001",
            //         CreatedAt = DateTime.UtcNow,
            //         UpdatedAt = DateTime.UtcNow
            //     },
            //     new Transaction
            //     {
            //         Id = Guid.NewGuid().ToString(),
            //         Date = DateTime.UtcNow.AddDays(-20),
            //         Type = "Payment",
            //         Description = "Paid utility bills",
            //         CreatedBy = "System",
            //         Status = "Completed",
            //         Notes = "Electricity and internet bills",
            //         CreatedAt = DateTime.UtcNow,
            //         UpdatedAt = DateTime.UtcNow
            //     },
            //     new Transaction
            //     {
            //         Id = Guid.NewGuid().ToString(),
            //         Date = DateTime.UtcNow.AddDays(-15),
            //         Type = "Journal",
            //         Description = "Recorded sales revenue",
            //         CreatedBy = "System",
            //         Status = "Completed",
            //         Notes = "Sales for the month",
            //         CreatedAt = DateTime.UtcNow,
            //         UpdatedAt = DateTime.UtcNow
            //     }
            // };

            // await _context.Transactions.AddRangeAsync(transactions);
            // await _context.SaveChangesAsync();

            // // Create transaction entries (double-entry bookkeeping)
            // var transactionEntries = new List<TransactionEntry>();

            // // Transaction 1: Paid office rent
            // transactionEntries.AddRange(new[]
            // {
            //     new TransactionEntry
            //     {
            //         Id = Guid.NewGuid().ToString(),
            //         TransactionId = transactions[0].Id,
            //         LedgerId = ledgers.First(l => l.Name == "Office Rent").Id,
            //         IsDebit = true,
            //         Amount = 5000,
            //         Description = "Office rent expense",
            //         CreatedAt = DateTime.UtcNow,
            //         UpdatedAt = DateTime.UtcNow
            //     },
            //     new TransactionEntry
            //     {
            //         Id = Guid.NewGuid().ToString(),
            //         TransactionId = transactions[0].Id,
            //         LedgerId = ledgers.First(l => l.Name == "Bank Account").Id,
            //         IsDebit = false,
            //         Amount = 5000,
            //         Description = "Payment from bank account",
            //         CreatedAt = DateTime.UtcNow,
            //         UpdatedAt = DateTime.UtcNow
            //     }
            // });

            // // Transaction 2: Received customer payment
            // transactionEntries.AddRange(new[]
            // {
            //     new TransactionEntry
            //     {
            //         Id = Guid.NewGuid().ToString(),
            //         TransactionId = transactions[1].Id,
            //         LedgerId = ledgers.First(l => l.Name == "Bank Account").Id,
            //         IsDebit = true,
            //         Amount = 15000,
            //         Description = "Customer payment received",
            //         CreatedAt = DateTime.UtcNow,
            //         UpdatedAt = DateTime.UtcNow
            //     },
            //     new TransactionEntry
            //     {
            //         Id = Guid.NewGuid().ToString(),
            //         TransactionId = transactions[1].Id,
            //         LedgerId = ledgers.First(l => l.Name == "Accounts Receivable").Id,
            //         IsDebit = false,
            //         Amount = 15000,
            //         Description = "Reduced accounts receivable",
            //         CreatedAt = DateTime.UtcNow,
            //         UpdatedAt = DateTime.UtcNow
            //     }
            // });

            // // Transaction 3: Paid utility bills
            // transactionEntries.AddRange(new[]
            // {
            //     new TransactionEntry
            //     {
            //         Id = Guid.NewGuid().ToString(),
            //         TransactionId = transactions[2].Id,
            //         LedgerId = ledgers.First(l => l.Name == "Utilities").Id,
            //         IsDebit = true,
            //         Amount = 2500,
            //         Description = "Utility expenses",
            //         CreatedAt = DateTime.UtcNow,
            //         UpdatedAt = DateTime.UtcNow
            //     },
            //     new TransactionEntry
            //     {
            //         Id = Guid.NewGuid().ToString(),
            //         TransactionId = transactions[2].Id,
            //         LedgerId = ledgers.First(l => l.Name == "Bank Account").Id,
            //         IsDebit = false,
            //         Amount = 2500,
            //         Description = "Payment from bank account",
            //         CreatedAt = DateTime.UtcNow,
            //         UpdatedAt = DateTime.UtcNow
            //     }
            // });

            // // Transaction 4: Recorded sales revenue
            // transactionEntries.AddRange(new[]
            // {
            //     new TransactionEntry
            //     {
            //         Id = Guid.NewGuid().ToString(),
            //         TransactionId = transactions[3].Id,
            //         LedgerId = ledgers.First(l => l.Name == "Sales Revenue").Id,
            //         IsDebit = false,
            //         Amount = 30000,
            //         Description = "Sales revenue for the month",
            //         CreatedAt = DateTime.UtcNow,
            //         UpdatedAt = DateTime.UtcNow
            //     },
            //     new TransactionEntry
            //     {
            //         Id = Guid.NewGuid().ToString(),
            //         TransactionId = transactions[3].Id,
            //         LedgerId = ledgers.First(l => l.Name == "Accounts Receivable").Id,
            //         IsDebit = true,
            //         Amount = 30000,
            //         Description = "Increased accounts receivable",
            //         CreatedAt = DateTime.UtcNow,
            //         UpdatedAt = DateTime.UtcNow
            //     }
            // });

            // await _context.TransactionEntries.AddRangeAsync(transactionEntries);
            // await _context.SaveChangesAsync();

            // _logger.LogInformation("Successfully seeded accounting system with {AccountGroups} account groups, {Ledgers} ledgers, {Transactions} transactions, and {Entries} transaction entries",
            //     accountGroups.Count, ledgers.Count, transactions.Count, transactionEntries.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding accounting system data");
            throw;
        }
    }

    public async Task SeedPaymentModesAsync()
    {
        try
        {
            // Check if PaymentModes already has data
            if (await _context.PaymentModes.AnyAsync())
            {
                _logger.LogInformation("PaymentModes already has data, skipping seed");
                return;
            }

            var paymentModes = new List<PaymentMode>
            {
                new PaymentMode
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "cash",
                    DisplayName = "Cash",
                    Description = "Cash payment",
                    IsActive = true,
                    SortOrder = 1,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new PaymentMode
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "card",
                    DisplayName = "Card",
                    Description = "Credit/Debit card payment",
                    IsActive = true,
                    SortOrder = 2,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new PaymentMode
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "bank_transfer",
                    DisplayName = "Bank Transfer",
                    Description = "Bank transfer payment",
                    IsActive = true,
                    SortOrder = 3,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new PaymentMode
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "upi",
                    DisplayName = "UPI",
                    Description = "UPI payment",
                    IsActive = true,
                    SortOrder = 4,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new PaymentMode
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "cheque",
                    DisplayName = "Cheque",
                    Description = "Cheque payment",
                    IsActive = true,
                    SortOrder = 5,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new PaymentMode
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "online",
                    DisplayName = "Online",
                    Description = "Online payment",
                    IsActive = true,
                    SortOrder = 6,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            await _context.PaymentModes.AddRangeAsync(paymentModes);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Seeded {Count} payment mode records", paymentModes.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding payment modes");
            throw;
        }
    }

    public async Task SeedExpenseTagsAsync()
    {
        try
        {
            // Check if ExpenseTags already has data
            if (await _context.ExpenseTags.AnyAsync())
            {
                _logger.LogInformation("ExpenseTags already has data, skipping seed");
                return;
            }

            var expenseTags = new List<ExpenseTag>
            {
                new ExpenseTag
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "urgent",
                    DisplayName = "Urgent",
                    Description = "Urgent expenses that need immediate attention",
                    Color = "red",
                    IsActive = true,
                    SortOrder = 1,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseTag
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "recurring",
                    DisplayName = "Recurring",
                    Description = "Recurring monthly or periodic expenses",
                    Color = "blue",
                    IsActive = true,
                    SortOrder = 2,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseTag
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "one_time",
                    DisplayName = "One-time",
                    Description = "One-time expenses",
                    Color = "green",
                    IsActive = true,
                    SortOrder = 3,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseTag
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "business",
                    DisplayName = "Business",
                    Description = "Business-related expenses",
                    Color = "orange",
                    IsActive = true,
                    SortOrder = 4,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseTag
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "personal",
                    DisplayName = "Personal",
                    Description = "Personal expenses",
                    Color = "purple",
                    IsActive = true,
                    SortOrder = 5,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseTag
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "tax_deductible",
                    DisplayName = "Tax-deductible",
                    Description = "Tax-deductible expenses",
                    Color = "teal",
                    IsActive = true,
                    SortOrder = 6,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new ExpenseTag
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = "reimbursable",
                    DisplayName = "Reimbursable",
                    Description = "Expenses that can be reimbursed",
                    Color = "cyan",
                    IsActive = true,
                    SortOrder = 7,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            await _context.ExpenseTags.AddRangeAsync(expenseTags);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Seeded {Count} expense tag records", expenseTags.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding expense tags");
            throw;
        }
    }

    public async Task SeedAllAsync()
    {
        try
        {
            _logger.LogInformation("Starting to seed all data...");

                await EnsureStoredProceduresAsync();

            await SeedSuperAdminAsync();
            await SeedExpenseCategoriesAsync();
            await SeedPaymentModesAsync();
            await SeedExpenseTagsAsync();
            await SeedChartOfAccountsAsync();
            await SeedSuppliersAsync();
            await SeedAccountingSystemAsync();
            //  await SeedSalesAnalyticsAsync(); // Add this line

            _logger.LogInformation("All data seeded successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding all data");
            throw;
        }
    }
}