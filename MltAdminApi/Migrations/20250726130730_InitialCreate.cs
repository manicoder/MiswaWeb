using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MltAdminApi.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AccountGroups",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ChartOfAccounts",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ParentCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChartOfAccounts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ExpenseCategories",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExpenseCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Expenses",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PaymentMode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PaidTo = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ChartOfAccountCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ChartOfAccountName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Tags = table.Column<string>(type: "text", nullable: false),
                    ReceiptUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Expenses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ExpenseTags",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExpenseTags", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Jobs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    courier_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    is_completed = table.Column<bool>(type: "boolean", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_by = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Jobs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OrderPickupStatuses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ShopifyOrderId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    OrderName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PickupStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    FulfillmentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CourierCompany = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TrackingNumber = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UpdatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderPickupStatuses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PaymentModes",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentModes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PayoutReconciliations",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    PayoutId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ExpectedAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    ActualAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Difference = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    MatchedOrders = table.Column<int>(type: "integer", nullable: false),
                    UnmatchedOrders = table.Column<int>(type: "integer", nullable: false),
                    Fees = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayoutReconciliations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Payouts",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    PayoutId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ExpectedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActualDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Fees = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    NetAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    OrderIds = table.Column<string>(type: "text", nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payouts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductAnalytics",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ProductId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    VariantId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Sku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ProductTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    QuantitySold = table.Column<int>(type: "integer", nullable: false),
                    Revenue = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CostPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    GrossProfit = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    GrossMargin = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductAnalytics", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProductCosts",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ProductId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    VariantId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Sku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CostPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Supplier = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    LastUpdatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductCosts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Reports",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Format = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    FileName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    GeneratedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RecordCount = table.Column<int>(type: "integer", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DownloadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Parameters = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reports", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SalesAnalytics",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Revenue = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Orders = table.Column<int>(type: "integer", nullable: false),
                    AverageOrderValue = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CostOfGoods = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    GrossProfit = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    GrossMargin = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesAnalytics", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Suppliers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ContactPerson = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    TaxId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    PaymentTerms = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Suppliers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TaxRecords",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    OrderId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    State = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    TaxType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    TaxAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TaxableAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TaxRate = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    TaxDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaxRecords", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Transactions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Transactions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Role = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PasswordHash = table.Column<string>(type: "text", nullable: true),
                    CreatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Warehouses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Address = table.Column<string>(type: "text", nullable: false),
                    City = table.Column<string>(type: "text", nullable: true),
                    State = table.Column<string>(type: "text", nullable: true),
                    Country = table.Column<string>(type: "text", nullable: true),
                    PostalCode = table.Column<string>(type: "text", nullable: true),
                    ContactPerson = table.Column<string>(type: "text", nullable: true),
                    ContactPhone = table.Column<string>(type: "text", nullable: true),
                    ContactEmail = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDefaultSource = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Warehouses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Ledgers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    GroupId = table.Column<string>(type: "text", nullable: false),
                    OpeningBalance = table.Column<decimal>(type: "numeric(20,2)", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ledgers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Ledgers_AccountGroups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "AccountGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "JobData",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    job_id = table.Column<int>(type: "integer", nullable: false),
                    data = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobData", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobData_Jobs_job_id",
                        column: x => x.job_id,
                        principalTable: "Jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrderStatus",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    job_id = table.Column<int>(type: "integer", nullable: false),
                    order_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    is_pickup = table.Column<bool>(type: "boolean", nullable: false),
                    is_missing = table.Column<bool>(type: "boolean", nullable: false),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderStatus", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderStatus_Jobs_job_id",
                        column: x => x.job_id,
                        principalTable: "Jobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseOrders",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    PoNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SupplierId = table.Column<string>(type: "text", nullable: false),
                    PurchaseDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    BillNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    BillDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpectedDeliveryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Subtotal = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TaxAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    GstAmount = table.Column<decimal>(type: "numeric(20,2)", nullable: false),
                    GstRate = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    ShippingCost = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    InvoiceUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsReceived = table.Column<bool>(type: "boolean", nullable: false),
                    ReceivedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ConfirmedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    InTransitDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    OnHoldDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DisputedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SentBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ConfirmedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    OnHoldBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    DisputedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    OnHoldReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    DisputeReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    TotalPaid = table.Column<decimal>(type: "numeric(20,2)", nullable: false),
                    BalanceDue = table.Column<decimal>(type: "numeric(20,2)", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseOrders_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Invitations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Token = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    InvitedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    InvitedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Permissions = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    AcceptedUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Invitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Invitations_Users_AcceptedUserId",
                        column: x => x.AcceptedUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "LabelDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    OriginalName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    FilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    MimeType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CourierCompany = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UploadedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LabelDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LabelDocuments_Users_DeletedBy",
                        column: x => x.DeletedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_LabelDocuments_Users_UploadedBy",
                        column: x => x.UploadedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OTPRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    OTPCode = table.Column<string>(type: "character varying(6)", maxLength: 6, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsUsed = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RequestIP = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    UserAgent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OTPRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OTPRequests_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PasswordResetTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsUsed = table.Column<bool>(type: "boolean", nullable: false),
                    UsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PasswordResetTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PasswordResetTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StoreConnections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    StoreName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    EncryptedCredentials = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastSyncAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastUsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    StoreUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    StoreDomain = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    StoreEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    StoreCountry = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    StoreCurrency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    LastError = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    LastErrorAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoreConnections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoreConnections_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserPermissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TabId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TabName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    HasAccess = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPermissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserPermissions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WarehouseShipments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ShipmentNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SourceWarehouseId = table.Column<int>(type: "integer", nullable: true),
                    DestinationWarehouseId = table.Column<int>(type: "integer", nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DispatchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReceivedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DispatchedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ReceivedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WarehouseShipments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WarehouseShipments_Warehouses_DestinationWarehouseId",
                        column: x => x.DestinationWarehouseId,
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WarehouseShipments_Warehouses_SourceWarehouseId",
                        column: x => x.SourceWarehouseId,
                        principalTable: "Warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InventoryAssets",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    VariantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Sku = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ProductTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    VariantTitle = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CostPerItem = table.Column<decimal>(type: "numeric(20,2)", nullable: false),
                    SellingPrice = table.Column<decimal>(type: "numeric(20,2)", nullable: false),
                    MaxPrice = table.Column<decimal>(type: "numeric(20,2)", nullable: true),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    TotalValue = table.Column<decimal>(type: "numeric(20,2)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Supplier = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    LedgerId = table.Column<string>(type: "text", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryAssets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryAssets_Ledgers_LedgerId",
                        column: x => x.LedgerId,
                        principalTable: "Ledgers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TransactionEntries",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    TransactionId = table.Column<string>(type: "text", nullable: false),
                    LedgerId = table.Column<string>(type: "text", nullable: false),
                    IsDebit = table.Column<bool>(type: "boolean", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(20,2)", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransactionEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransactionEntries_Ledgers_LedgerId",
                        column: x => x.LedgerId,
                        principalTable: "Ledgers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TransactionEntries_Transactions_TransactionId",
                        column: x => x.TransactionId,
                        principalTable: "Transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseOrderItems",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    PurchaseOrderId = table.Column<string>(type: "text", nullable: false),
                    ProductId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    VariantId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Sku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ProductName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    VariantTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    PurchasePrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    TotalPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    GstAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    GstRate = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    QuantityReceived = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderItems_PurchaseOrders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalTable: "PurchaseOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseOrderJourneys",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    PurchaseOrderId = table.Column<string>(type: "text", nullable: false),
                    FromStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ToStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ActionBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrderJourneys", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderJourneys_PurchaseOrders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalTable: "PurchaseOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SupplierPayments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    PurchaseOrderId = table.Column<string>(type: "text", nullable: false),
                    SupplierId = table.Column<string>(type: "text", nullable: false),
                    PaymentNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    PaymentMethod = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ReferenceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupplierPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupplierPayments_PurchaseOrders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalTable: "PurchaseOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SupplierPayments_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AmazonOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AmazonOrderId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    OrderStatus = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FulfillmentChannel = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SalesChannel = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    OrderType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PurchaseDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastUpdateDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MarketplaceId = table.Column<string>(type: "text", nullable: true),
                    BuyerEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    BuyerName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    ShipmentServiceLevelCategory = table.Column<string>(type: "text", nullable: true),
                    IsBusinessOrder = table.Column<bool>(type: "boolean", nullable: true),
                    IsPrime = table.Column<bool>(type: "boolean", nullable: true),
                    IsGlobalExpressEnabled = table.Column<bool>(type: "boolean", nullable: true),
                    ShippingName = table.Column<string>(type: "text", nullable: true),
                    ShippingAddressLine1 = table.Column<string>(type: "text", nullable: true),
                    ShippingAddressLine2 = table.Column<string>(type: "text", nullable: true),
                    ShippingCity = table.Column<string>(type: "text", nullable: true),
                    ShippingStateOrRegion = table.Column<string>(type: "text", nullable: true),
                    ShippingPostalCode = table.Column<string>(type: "text", nullable: true),
                    ShippingCountryCode = table.Column<string>(type: "text", nullable: true),
                    OrderItemsJson = table.Column<string>(type: "text", nullable: false),
                    OrderNumber = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Platform = table.Column<int>(type: "integer", nullable: false),
                    StoreConnectionId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AmazonOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AmazonOrders_StoreConnections_StoreConnectionId",
                        column: x => x.StoreConnectionId,
                        principalTable: "StoreConnections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FlipkartOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FlipkartOrderId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    OrderState = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    OrderType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    OrderDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeliveryDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TrackingId = table.Column<string>(type: "text", nullable: true),
                    CustomerName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    CustomerPhone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CustomerEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    PaymentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PaymentStatus = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ShippingName = table.Column<string>(type: "text", nullable: true),
                    ShippingAddress = table.Column<string>(type: "text", nullable: true),
                    ShippingCity = table.Column<string>(type: "text", nullable: true),
                    ShippingState = table.Column<string>(type: "text", nullable: true),
                    ShippingPincode = table.Column<string>(type: "text", nullable: true),
                    ShippingCountry = table.Column<string>(type: "text", nullable: true),
                    OrderItemsJson = table.Column<string>(type: "text", nullable: false),
                    ShippingFee = table.Column<decimal>(type: "numeric", nullable: true),
                    ServiceFee = table.Column<decimal>(type: "numeric", nullable: true),
                    CommissionFee = table.Column<decimal>(type: "numeric", nullable: true),
                    SellerGstin = table.Column<string>(type: "text", nullable: true),
                    InvoiceNumber = table.Column<string>(type: "text", nullable: true),
                    OrderNumber = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Platform = table.Column<int>(type: "integer", nullable: false),
                    StoreConnectionId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FlipkartOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FlipkartOrders_StoreConnections_StoreConnectionId",
                        column: x => x.StoreConnectionId,
                        principalTable: "StoreConnections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShopifyOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    FulfillmentStatus = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DisplayFulfillmentStatus = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DisplayFinancialStatus = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ShopifyOrderId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CustomerFirstName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    CustomerLastName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    CustomerEmail = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    CustomerId = table.Column<string>(type: "text", nullable: true),
                    ShippingFirstName = table.Column<string>(type: "text", nullable: true),
                    ShippingLastName = table.Column<string>(type: "text", nullable: true),
                    ShippingAddress1 = table.Column<string>(type: "text", nullable: true),
                    ShippingCity = table.Column<string>(type: "text", nullable: true),
                    ShippingProvince = table.Column<string>(type: "text", nullable: true),
                    ShippingCountry = table.Column<string>(type: "text", nullable: true),
                    ShippingZip = table.Column<string>(type: "text", nullable: true),
                    LineItemsJson = table.Column<string>(type: "text", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Tags = table.Column<string>(type: "text", nullable: true),
                    Note = table.Column<string>(type: "text", nullable: true),
                    TotalTax = table.Column<decimal>(type: "numeric", nullable: true),
                    TotalDiscounts = table.Column<decimal>(type: "numeric", nullable: true),
                    SubtotalPrice = table.Column<decimal>(type: "numeric", nullable: true),
                    OrderNumber = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Status = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Platform = table.Column<int>(type: "integer", nullable: false),
                    StoreConnectionId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShopifyOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShopifyOrders_StoreConnections_StoreConnectionId",
                        column: x => x.StoreConnectionId,
                        principalTable: "StoreConnections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShopifyProducts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShopifyProductId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Handle = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    BodyHtml = table.Column<string>(type: "text", nullable: true),
                    Vendor = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    ProductType = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Tags = table.Column<string>(type: "text", nullable: true),
                    ImageUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ImageAltText = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    ImageWidth = table.Column<int>(type: "integer", nullable: true),
                    ImageHeight = table.Column<int>(type: "integer", nullable: true),
                    ShopifyCreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ShopifyUpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ShopifyPublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    StoreConnectionId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShopifyProducts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShopifyProducts_StoreConnections_StoreConnectionId",
                        column: x => x.StoreConnectionId,
                        principalTable: "StoreConnections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WarehouseShipmentItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ShipmentId = table.Column<int>(type: "integer", nullable: false),
                    ProductBarcode = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ShopifyProductId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ShopifyVariantId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ProductTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    VariantTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Sku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    QuantityPlanned = table.Column<int>(type: "integer", nullable: false),
                    QuantityDispatched = table.Column<int>(type: "integer", nullable: false),
                    QuantityReceived = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CompareAtPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    ProductImageUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WarehouseShipmentItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WarehouseShipmentItems_WarehouseShipments_ShipmentId",
                        column: x => x.ShipmentId,
                        principalTable: "WarehouseShipments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShopifyProductVariants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShopifyVariantId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Price = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    CompareAtPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    CostPerItem = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    Sku = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Barcode = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    InventoryQuantity = table.Column<int>(type: "integer", nullable: false),
                    Position = table.Column<int>(type: "integer", nullable: false),
                    InventoryPolicy = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    FulfillmentService = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    InventoryManagement = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Taxable = table.Column<bool>(type: "boolean", nullable: false),
                    RequiresShipping = table.Column<bool>(type: "boolean", nullable: false),
                    Grams = table.Column<int>(type: "integer", nullable: false),
                    Weight = table.Column<decimal>(type: "numeric", nullable: false),
                    WeightUnit = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    InventoryItemId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Option1 = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Option2 = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Option3 = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    ShopifyCreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ShopifyUpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShopifyProductVariants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShopifyProductVariants_ShopifyProducts_ProductId",
                        column: x => x.ProductId,
                        principalTable: "ShopifyProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShopifyInventoryLevels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShopifyInventoryLevelId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    InventoryItemId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    LocationId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    LocationName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Available = table.Column<int>(type: "integer", nullable: false),
                    ShopifyCreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ShopifyUpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    VariantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShopifyInventoryLevels", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShopifyInventoryLevels_ShopifyProductVariants_VariantId",
                        column: x => x.VariantId,
                        principalTable: "ShopifyProductVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AccountGroups_IsActive",
                table: "AccountGroups",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_AccountGroups_Name",
                table: "AccountGroups",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AccountGroups_Type",
                table: "AccountGroups",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_AmazonOrders_AmazonOrderId",
                table: "AmazonOrders",
                column: "AmazonOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_AmazonOrders_CreatedAt",
                table: "AmazonOrders",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AmazonOrders_OrderNumber",
                table: "AmazonOrders",
                column: "OrderNumber");

            migrationBuilder.CreateIndex(
                name: "IX_AmazonOrders_OrderStatus",
                table: "AmazonOrders",
                column: "OrderStatus");

            migrationBuilder.CreateIndex(
                name: "IX_AmazonOrders_Status",
                table: "AmazonOrders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_AmazonOrders_StoreConnectionId",
                table: "AmazonOrders",
                column: "StoreConnectionId");

            migrationBuilder.CreateIndex(
                name: "IX_AmazonOrders_StoreConnectionId_AmazonOrderId",
                table: "AmazonOrders",
                columns: new[] { "StoreConnectionId", "AmazonOrderId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChartOfAccounts_Code",
                table: "ChartOfAccounts",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChartOfAccounts_IsActive",
                table: "ChartOfAccounts",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ChartOfAccounts_Name",
                table: "ChartOfAccounts",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_ChartOfAccounts_ParentCode",
                table: "ChartOfAccounts",
                column: "ParentCode");

            migrationBuilder.CreateIndex(
                name: "IX_ChartOfAccounts_Type",
                table: "ChartOfAccounts",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseCategories_IsActive",
                table: "ExpenseCategories",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseCategories_Name",
                table: "ExpenseCategories",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseCategories_Type",
                table: "ExpenseCategories",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_Category",
                table: "Expenses",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_ChartOfAccountCode",
                table: "Expenses",
                column: "ChartOfAccountCode");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_CreatedBy",
                table: "Expenses",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_Date",
                table: "Expenses",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_Date_Type",
                table: "Expenses",
                columns: new[] { "Date", "Type" });

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_PaidTo",
                table: "Expenses",
                column: "PaidTo");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_PaymentMode",
                table: "Expenses",
                column: "PaymentMode");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_Status",
                table: "Expenses",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_Type",
                table: "Expenses",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseTags_IsActive",
                table: "ExpenseTags",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseTags_Name",
                table: "ExpenseTags",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseTags_SortOrder",
                table: "ExpenseTags",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_FlipkartOrders_CreatedAt",
                table: "FlipkartOrders",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_FlipkartOrders_FlipkartOrderId",
                table: "FlipkartOrders",
                column: "FlipkartOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_FlipkartOrders_OrderNumber",
                table: "FlipkartOrders",
                column: "OrderNumber");

            migrationBuilder.CreateIndex(
                name: "IX_FlipkartOrders_OrderState",
                table: "FlipkartOrders",
                column: "OrderState");

            migrationBuilder.CreateIndex(
                name: "IX_FlipkartOrders_Status",
                table: "FlipkartOrders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_FlipkartOrders_StoreConnectionId",
                table: "FlipkartOrders",
                column: "StoreConnectionId");

            migrationBuilder.CreateIndex(
                name: "IX_FlipkartOrders_StoreConnectionId_FlipkartOrderId",
                table: "FlipkartOrders",
                columns: new[] { "StoreConnectionId", "FlipkartOrderId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InventoryAssets_LedgerId",
                table: "InventoryAssets",
                column: "LedgerId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryAssets_ProductId",
                table: "InventoryAssets",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryAssets_ProductId_VariantId",
                table: "InventoryAssets",
                columns: new[] { "ProductId", "VariantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InventoryAssets_Sku",
                table: "InventoryAssets",
                column: "Sku");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryAssets_VariantId",
                table: "InventoryAssets",
                column: "VariantId");

            migrationBuilder.CreateIndex(
                name: "IX_Invitations_AcceptedUserId",
                table: "Invitations",
                column: "AcceptedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Invitations_Email",
                table: "Invitations",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_Invitations_Email_Status",
                table: "Invitations",
                columns: new[] { "Email", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Invitations_ExpiresAt",
                table: "Invitations",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_Invitations_Status",
                table: "Invitations",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Invitations_Token",
                table: "Invitations",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobData_job_id",
                table: "JobData",
                column: "job_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_courier_name",
                table: "Jobs",
                column: "courier_name");

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_is_completed",
                table: "Jobs",
                column: "is_completed");

            migrationBuilder.CreateIndex(
                name: "IX_LabelDocuments_CourierCompany",
                table: "LabelDocuments",
                column: "CourierCompany");

            migrationBuilder.CreateIndex(
                name: "IX_LabelDocuments_DeletedBy",
                table: "LabelDocuments",
                column: "DeletedBy");

            migrationBuilder.CreateIndex(
                name: "IX_LabelDocuments_IsDeleted",
                table: "LabelDocuments",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_LabelDocuments_UploadedAt",
                table: "LabelDocuments",
                column: "UploadedAt");

            migrationBuilder.CreateIndex(
                name: "IX_LabelDocuments_UploadedBy",
                table: "LabelDocuments",
                column: "UploadedBy");

            migrationBuilder.CreateIndex(
                name: "IX_LabelDocuments_UploadedBy_CourierCompany",
                table: "LabelDocuments",
                columns: new[] { "UploadedBy", "CourierCompany" });

            migrationBuilder.CreateIndex(
                name: "IX_LabelDocuments_UploadedBy_IsDeleted",
                table: "LabelDocuments",
                columns: new[] { "UploadedBy", "IsDeleted" });

            migrationBuilder.CreateIndex(
                name: "IX_Ledgers_CreatedBy",
                table: "Ledgers",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Ledgers_GroupId",
                table: "Ledgers",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Ledgers_IsActive",
                table: "Ledgers",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Ledgers_Name",
                table: "Ledgers",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_OrderPickupStatuses_CourierCompany",
                table: "OrderPickupStatuses",
                column: "CourierCompany");

            migrationBuilder.CreateIndex(
                name: "IX_OrderPickupStatuses_FulfillmentDate",
                table: "OrderPickupStatuses",
                column: "FulfillmentDate");

            migrationBuilder.CreateIndex(
                name: "IX_OrderPickupStatuses_OrderName",
                table: "OrderPickupStatuses",
                column: "OrderName");

            migrationBuilder.CreateIndex(
                name: "IX_OrderPickupStatuses_PickupStatus",
                table: "OrderPickupStatuses",
                column: "PickupStatus");

            migrationBuilder.CreateIndex(
                name: "IX_OrderPickupStatuses_ShopifyOrderId",
                table: "OrderPickupStatuses",
                column: "ShopifyOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderPickupStatuses_ShopifyOrderId_TrackingNumber",
                table: "OrderPickupStatuses",
                columns: new[] { "ShopifyOrderId", "TrackingNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderStatus_job_id",
                table: "OrderStatus",
                column: "job_id");

            migrationBuilder.CreateIndex(
                name: "IX_OrderStatus_order_id",
                table: "OrderStatus",
                column: "order_id");

            migrationBuilder.CreateIndex(
                name: "IX_OTPRequests_UserId",
                table: "OTPRequests",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_OTPRequests_UserId_OTPCode",
                table: "OTPRequests",
                columns: new[] { "UserId", "OTPCode" });

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_ExpiresAt",
                table: "PasswordResetTokens",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_Token",
                table: "PasswordResetTokens",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_UserId",
                table: "PasswordResetTokens",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_UserId_IsUsed",
                table: "PasswordResetTokens",
                columns: new[] { "UserId", "IsUsed" });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentModes_IsActive",
                table: "PaymentModes",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentModes_Name",
                table: "PaymentModes",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentModes_SortOrder",
                table: "PaymentModes",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_PayoutReconciliations_PayoutId",
                table: "PayoutReconciliations",
                column: "PayoutId");

            migrationBuilder.CreateIndex(
                name: "IX_PayoutReconciliations_Status",
                table: "PayoutReconciliations",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Payouts_ActualDate",
                table: "Payouts",
                column: "ActualDate");

            migrationBuilder.CreateIndex(
                name: "IX_Payouts_ExpectedDate",
                table: "Payouts",
                column: "ExpectedDate");

            migrationBuilder.CreateIndex(
                name: "IX_Payouts_PayoutId",
                table: "Payouts",
                column: "PayoutId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Payouts_Status",
                table: "Payouts",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ProductAnalytics_Date",
                table: "ProductAnalytics",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_ProductAnalytics_ProductId",
                table: "ProductAnalytics",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductAnalytics_Sku",
                table: "ProductAnalytics",
                column: "Sku");

            migrationBuilder.CreateIndex(
                name: "IX_ProductAnalytics_VariantId",
                table: "ProductAnalytics",
                column: "VariantId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductCosts_ProductId",
                table: "ProductCosts",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductCosts_ProductId_VariantId",
                table: "ProductCosts",
                columns: new[] { "ProductId", "VariantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductCosts_Sku",
                table: "ProductCosts",
                column: "Sku",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductCosts_VariantId",
                table: "ProductCosts",
                column: "VariantId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItems_ProductId",
                table: "PurchaseOrderItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItems_PurchaseOrderId",
                table: "PurchaseOrderItems",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItems_PurchaseOrderId_ProductId",
                table: "PurchaseOrderItems",
                columns: new[] { "PurchaseOrderId", "ProductId" });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItems_Sku",
                table: "PurchaseOrderItems",
                column: "Sku");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItems_VariantId",
                table: "PurchaseOrderItems",
                column: "VariantId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderJourneys_CreatedAt",
                table: "PurchaseOrderJourneys",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderJourneys_FromStatus",
                table: "PurchaseOrderJourneys",
                column: "FromStatus");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderJourneys_PurchaseOrderId",
                table: "PurchaseOrderJourneys",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderJourneys_ToStatus",
                table: "PurchaseOrderJourneys",
                column: "ToStatus");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_CreatedAt",
                table: "PurchaseOrders",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_IsReceived",
                table: "PurchaseOrders",
                column: "IsReceived");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_PoNumber",
                table: "PurchaseOrders",
                column: "PoNumber");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_PurchaseDate",
                table: "PurchaseOrders",
                column: "PurchaseDate");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_Status",
                table: "PurchaseOrders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_SupplierId",
                table: "PurchaseOrders",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_Format",
                table: "Reports",
                column: "Format");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_GeneratedAt",
                table: "Reports",
                column: "GeneratedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_GeneratedBy",
                table: "Reports",
                column: "GeneratedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_Type",
                table: "Reports",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_SalesAnalytics_Date",
                table: "SalesAnalytics",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_SalesAnalytics_Date_Currency",
                table: "SalesAnalytics",
                columns: new[] { "Date", "Currency" });

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyInventoryLevels_Available",
                table: "ShopifyInventoryLevels",
                column: "Available");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyInventoryLevels_InventoryItemId",
                table: "ShopifyInventoryLevels",
                column: "InventoryItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyInventoryLevels_LocationId",
                table: "ShopifyInventoryLevels",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyInventoryLevels_LocationId_Available",
                table: "ShopifyInventoryLevels",
                columns: new[] { "LocationId", "Available" });

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyInventoryLevels_VariantId",
                table: "ShopifyInventoryLevels",
                column: "VariantId");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyInventoryLevels_VariantId_LocationId",
                table: "ShopifyInventoryLevels",
                columns: new[] { "VariantId", "LocationId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyOrders_CreatedAt",
                table: "ShopifyOrders",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyOrders_FulfillmentStatus",
                table: "ShopifyOrders",
                column: "FulfillmentStatus");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyOrders_OrderNumber",
                table: "ShopifyOrders",
                column: "OrderNumber");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyOrders_ShopifyOrderId",
                table: "ShopifyOrders",
                column: "ShopifyOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyOrders_Status",
                table: "ShopifyOrders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyOrders_StoreConnectionId",
                table: "ShopifyOrders",
                column: "StoreConnectionId");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyOrders_StoreConnectionId_ShopifyOrderId",
                table: "ShopifyOrders",
                columns: new[] { "StoreConnectionId", "ShopifyOrderId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyProducts_CreatedAt",
                table: "ShopifyProducts",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyProducts_ProductType",
                table: "ShopifyProducts",
                column: "ProductType");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyProducts_ShopifyProductId",
                table: "ShopifyProducts",
                column: "ShopifyProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyProducts_ShopifyUpdatedAt",
                table: "ShopifyProducts",
                column: "ShopifyUpdatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyProducts_Status",
                table: "ShopifyProducts",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyProducts_StoreConnectionId",
                table: "ShopifyProducts",
                column: "StoreConnectionId");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyProducts_StoreConnectionId_ShopifyProductId",
                table: "ShopifyProducts",
                columns: new[] { "StoreConnectionId", "ShopifyProductId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyProducts_Title",
                table: "ShopifyProducts",
                column: "Title");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyProducts_Vendor",
                table: "ShopifyProducts",
                column: "Vendor");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyProductVariants_Barcode",
                table: "ShopifyProductVariants",
                column: "Barcode");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyProductVariants_InventoryQuantity",
                table: "ShopifyProductVariants",
                column: "InventoryQuantity");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyProductVariants_Price",
                table: "ShopifyProductVariants",
                column: "Price");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyProductVariants_ProductId",
                table: "ShopifyProductVariants",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyProductVariants_ProductId_Position",
                table: "ShopifyProductVariants",
                columns: new[] { "ProductId", "Position" });

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyProductVariants_ProductId_ShopifyVariantId",
                table: "ShopifyProductVariants",
                columns: new[] { "ProductId", "ShopifyVariantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyProductVariants_ShopifyVariantId",
                table: "ShopifyProductVariants",
                column: "ShopifyVariantId");

            migrationBuilder.CreateIndex(
                name: "IX_ShopifyProductVariants_Sku",
                table: "ShopifyProductVariants",
                column: "Sku");

            migrationBuilder.CreateIndex(
                name: "IX_StoreConnections_IsActive",
                table: "StoreConnections",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_StoreConnections_Platform",
                table: "StoreConnections",
                column: "Platform");

            migrationBuilder.CreateIndex(
                name: "IX_StoreConnections_Status",
                table: "StoreConnections",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_StoreConnections_UserId",
                table: "StoreConnections",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_StoreConnections_UserId_IsDefault",
                table: "StoreConnections",
                columns: new[] { "UserId", "IsDefault" });

            migrationBuilder.CreateIndex(
                name: "IX_StoreConnections_UserId_Platform_StoreName",
                table: "StoreConnections",
                columns: new[] { "UserId", "Platform", "StoreName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupplierPayments_CreatedAt",
                table: "SupplierPayments",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierPayments_PaymentDate",
                table: "SupplierPayments",
                column: "PaymentDate");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierPayments_PaymentNumber",
                table: "SupplierPayments",
                column: "PaymentNumber");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierPayments_PurchaseOrderId",
                table: "SupplierPayments",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierPayments_Status",
                table: "SupplierPayments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierPayments_SupplierId",
                table: "SupplierPayments",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_CreatedAt",
                table: "Suppliers",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_IsActive",
                table: "Suppliers",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_Name",
                table: "Suppliers",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_TaxRecords_Country",
                table: "TaxRecords",
                column: "Country");

            migrationBuilder.CreateIndex(
                name: "IX_TaxRecords_OrderId",
                table: "TaxRecords",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_TaxRecords_TaxDate",
                table: "TaxRecords",
                column: "TaxDate");

            migrationBuilder.CreateIndex(
                name: "IX_TaxRecords_TaxType",
                table: "TaxRecords",
                column: "TaxType");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionEntries_CreatedAt",
                table: "TransactionEntries",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionEntries_IsDebit",
                table: "TransactionEntries",
                column: "IsDebit");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionEntries_LedgerId",
                table: "TransactionEntries",
                column: "LedgerId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionEntries_TransactionId",
                table: "TransactionEntries",
                column: "TransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_CreatedAt",
                table: "Transactions",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_CreatedBy",
                table: "Transactions",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_Date",
                table: "Transactions",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_Status",
                table: "Transactions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_Type",
                table: "Transactions",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_UserPermissions_UserId_TabId",
                table: "UserPermissions",
                columns: new[] { "UserId", "TabId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_IsActive",
                table: "Users",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Role",
                table: "Users",
                column: "Role");

            migrationBuilder.CreateIndex(
                name: "IX_Warehouses_Code",
                table: "Warehouses",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Warehouses_CreatedAt",
                table: "Warehouses",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Warehouses_IsActive",
                table: "Warehouses",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Warehouses_IsDefaultSource",
                table: "Warehouses",
                column: "IsDefaultSource");

            migrationBuilder.CreateIndex(
                name: "IX_Warehouses_Name",
                table: "Warehouses",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipmentItems_ProductBarcode",
                table: "WarehouseShipmentItems",
                column: "ProductBarcode");

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipmentItems_ShipmentId",
                table: "WarehouseShipmentItems",
                column: "ShipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipmentItems_ShipmentId_ProductBarcode",
                table: "WarehouseShipmentItems",
                columns: new[] { "ShipmentId", "ProductBarcode" });

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipmentItems_ShipmentId_ShopifyVariantId",
                table: "WarehouseShipmentItems",
                columns: new[] { "ShipmentId", "ShopifyVariantId" });

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipmentItems_ShopifyProductId",
                table: "WarehouseShipmentItems",
                column: "ShopifyProductId");

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipmentItems_ShopifyVariantId",
                table: "WarehouseShipmentItems",
                column: "ShopifyVariantId");

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipmentItems_Sku",
                table: "WarehouseShipmentItems",
                column: "Sku");

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipments_CreatedAt",
                table: "WarehouseShipments",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipments_CreatedBy",
                table: "WarehouseShipments",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipments_DestinationWarehouseId",
                table: "WarehouseShipments",
                column: "DestinationWarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipments_DestinationWarehouseId_Status",
                table: "WarehouseShipments",
                columns: new[] { "DestinationWarehouseId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipments_DispatchedAt",
                table: "WarehouseShipments",
                column: "DispatchedAt");

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipments_ReceivedAt",
                table: "WarehouseShipments",
                column: "ReceivedAt");

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipments_ShipmentNumber",
                table: "WarehouseShipments",
                column: "ShipmentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipments_SourceWarehouseId",
                table: "WarehouseShipments",
                column: "SourceWarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipments_SourceWarehouseId_Status",
                table: "WarehouseShipments",
                columns: new[] { "SourceWarehouseId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipments_Status",
                table: "WarehouseShipments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseShipments_Status_CreatedAt",
                table: "WarehouseShipments",
                columns: new[] { "Status", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AmazonOrders");

            migrationBuilder.DropTable(
                name: "ChartOfAccounts");

            migrationBuilder.DropTable(
                name: "ExpenseCategories");

            migrationBuilder.DropTable(
                name: "Expenses");

            migrationBuilder.DropTable(
                name: "ExpenseTags");

            migrationBuilder.DropTable(
                name: "FlipkartOrders");

            migrationBuilder.DropTable(
                name: "InventoryAssets");

            migrationBuilder.DropTable(
                name: "Invitations");

            migrationBuilder.DropTable(
                name: "JobData");

            migrationBuilder.DropTable(
                name: "LabelDocuments");

            migrationBuilder.DropTable(
                name: "OrderPickupStatuses");

            migrationBuilder.DropTable(
                name: "OrderStatus");

            migrationBuilder.DropTable(
                name: "OTPRequests");

            migrationBuilder.DropTable(
                name: "PasswordResetTokens");

            migrationBuilder.DropTable(
                name: "PaymentModes");

            migrationBuilder.DropTable(
                name: "PayoutReconciliations");

            migrationBuilder.DropTable(
                name: "Payouts");

            migrationBuilder.DropTable(
                name: "ProductAnalytics");

            migrationBuilder.DropTable(
                name: "ProductCosts");

            migrationBuilder.DropTable(
                name: "PurchaseOrderItems");

            migrationBuilder.DropTable(
                name: "PurchaseOrderJourneys");

            migrationBuilder.DropTable(
                name: "Reports");

            migrationBuilder.DropTable(
                name: "SalesAnalytics");

            migrationBuilder.DropTable(
                name: "ShopifyInventoryLevels");

            migrationBuilder.DropTable(
                name: "ShopifyOrders");

            migrationBuilder.DropTable(
                name: "SupplierPayments");

            migrationBuilder.DropTable(
                name: "TaxRecords");

            migrationBuilder.DropTable(
                name: "TransactionEntries");

            migrationBuilder.DropTable(
                name: "UserPermissions");

            migrationBuilder.DropTable(
                name: "WarehouseShipmentItems");

            migrationBuilder.DropTable(
                name: "Jobs");

            migrationBuilder.DropTable(
                name: "ShopifyProductVariants");

            migrationBuilder.DropTable(
                name: "PurchaseOrders");

            migrationBuilder.DropTable(
                name: "Ledgers");

            migrationBuilder.DropTable(
                name: "Transactions");

            migrationBuilder.DropTable(
                name: "WarehouseShipments");

            migrationBuilder.DropTable(
                name: "ShopifyProducts");

            migrationBuilder.DropTable(
                name: "Suppliers");

            migrationBuilder.DropTable(
                name: "AccountGroups");

            migrationBuilder.DropTable(
                name: "Warehouses");

            migrationBuilder.DropTable(
                name: "StoreConnections");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
