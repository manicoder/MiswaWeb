using Microsoft.EntityFrameworkCore;
using Mlt.Admin.Api.Models;
using Mlt.Admin.Api.Core.Entities;
using MltAdminApi.Models;

namespace Mlt.Admin.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<Job> Jobs { get; set; }
    public DbSet<OrderStatus> OrderStatuses { get; set; }
    public DbSet<JobData> JobData { get; set; }
    
    // Auth and User Management
    public DbSet<User> Users { get; set; }
    public DbSet<UserPermission> UserPermissions { get; set; }
    public DbSet<StoreConnection> StoreConnections { get; set; }
    public DbSet<OTPRequest> OTPRequests { get; set; }
    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }
    
    // Invitation Management
    public DbSet<Invitation> Invitations { get; set; }
    
    // Multi-platform Orders
    public DbSet<ShopifyOrder> ShopifyOrders { get; set; }
    public DbSet<AmazonOrder> AmazonOrders { get; set; }
    public DbSet<FlipkartOrder> FlipkartOrders { get; set; }
    
    // Shopify Products (Local Storage)
    public DbSet<ShopifyProduct> ShopifyProducts { get; set; }
    public DbSet<ShopifyProductVariant> ShopifyProductVariants { get; set; }
    public DbSet<ShopifyInventoryLevel> ShopifyInventoryLevels { get; set; }
    
    // Order Pickup Management
    public DbSet<OrderPickupStatus> OrderPickupStatuses { get; set; }
    
    // Label Management
    public DbSet<LabelDocument> LabelDocuments { get; set; }
    
    // Warehouse Management
    public DbSet<Warehouse> Warehouses { get; set; }
    
    // Warehouse Shipment Management
    public DbSet<WarehouseShipment> WarehouseShipments { get; set; }
    public DbSet<WarehouseShipmentItem> WarehouseShipmentItems { get; set; }

    // Finance Management
    public DbSet<Expense> Expenses { get; set; }
    public DbSet<ExpenseCategory> ExpenseCategories { get; set; }
    public DbSet<PaymentMode> PaymentModes { get; set; }
    public DbSet<ExpenseTag> ExpenseTags { get; set; }
    public DbSet<ChartOfAccount> ChartOfAccounts { get; set; }
    public DbSet<ProductCost> ProductCosts { get; set; }
    public DbSet<Payout> Payouts { get; set; }
    public DbSet<PayoutReconciliation> PayoutReconciliations { get; set; }
    public DbSet<TaxRecord> TaxRecords { get; set; }
    public DbSet<SalesAnalytics> SalesAnalytics { get; set; }
    public DbSet<ProductAnalytics> ProductAnalytics { get; set; }
    public DbSet<Report> Reports { get; set; }
    
    // Accounting System
    public DbSet<AccountGroup> AccountGroups { get; set; }
    public DbSet<Ledger> Ledgers { get; set; }
    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<TransactionEntry> TransactionEntries { get; set; }
    
    // Purchase Order Management
    public DbSet<Supplier> Suppliers { get; set; }
    public DbSet<PurchaseOrder> PurchaseOrders { get; set; }
    public DbSet<PurchaseOrderItem> PurchaseOrderItems { get; set; }
    public DbSet<SupplierPayment> SupplierPayments { get; set; }
    public DbSet<PurchaseOrderJourney> PurchaseOrderJourneys { get; set; }
    
    // Inventory Asset Management
    public DbSet<InventoryAsset> InventoryAssets { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Job entity
        modelBuilder.Entity<Job>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CourierName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.CompletedBy).HasMaxLength(255);
            entity.HasIndex(e => e.CourierName);
            entity.HasIndex(e => e.IsCompleted);
        });

        // Configure OrderStatus entity
        modelBuilder.Entity<OrderStatus>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OrderId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.HasIndex(e => e.JobId);
            entity.HasIndex(e => e.OrderId);
            
            entity.HasOne(e => e.Job)
                  .WithMany(j => j.OrderStatuses)
                  .HasForeignKey(e => e.JobId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure JobData entity
        modelBuilder.Entity<JobData>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.JobId).IsUnique();
            
            entity.HasOne(e => e.Job)
                  .WithOne(j => j.JobData)
                  .HasForeignKey<JobData>(e => e.JobId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure User entity
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.CreatedBy).HasMaxLength(255);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.Role);
            entity.HasIndex(e => e.IsActive);
        });

        // Configure UserPermission entity
        modelBuilder.Entity<UserPermission>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TabId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.TabName).IsRequired().HasMaxLength(255);
            entity.HasIndex(e => new { e.UserId, e.TabId }).IsUnique();
            
            entity.HasOne(e => e.User)
                  .WithMany(u => u.Permissions)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });



        // Configure StoreConnection entity
        modelBuilder.Entity<StoreConnection>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Platform).IsRequired().HasMaxLength(50);
            entity.Property(e => e.StoreName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.EncryptedCredentials).IsRequired();
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            entity.Property(e => e.StoreUrl).HasMaxLength(500);
            entity.Property(e => e.StoreDomain).HasMaxLength(255);
            entity.Property(e => e.StoreEmail).HasMaxLength(255);
            entity.Property(e => e.StoreCountry).HasMaxLength(100);
            entity.Property(e => e.StoreCurrency).HasMaxLength(10);
            entity.Property(e => e.LastError).HasMaxLength(1000);
            
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.UserId, e.Platform, e.StoreName }).IsUnique();
            entity.HasIndex(e => new { e.UserId, e.IsDefault });
            entity.HasIndex(e => e.Platform);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsActive);
            
            entity.HasOne(e => e.User)
                  .WithMany(u => u.StoreConnections)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure OTPRequest entity
        modelBuilder.Entity<OTPRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OTPCode).IsRequired().HasMaxLength(6);
            entity.Property(e => e.RequestIP).HasMaxLength(50);
            entity.Property(e => e.UserAgent).HasMaxLength(500);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.UserId, e.OTPCode });
            
            entity.HasOne(e => e.User)
                  .WithMany(u => u.OTPRequests)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure PasswordResetToken entity
        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Token).IsRequired().HasMaxLength(500);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Token).IsUnique();
            entity.HasIndex(e => e.ExpiresAt);
            entity.HasIndex(e => new { e.UserId, e.IsUsed });
            
            entity.HasOne(e => e.User)
                  .WithMany(u => u.PasswordResetTokens)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure Invitation entity
        modelBuilder.Entity<Invitation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Role).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Token).IsRequired().HasMaxLength(500);
            entity.Property(e => e.InvitedBy).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Permissions).HasMaxLength(2000);
            
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.Token).IsUnique();
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.ExpiresAt);
            entity.HasIndex(e => new { e.Email, e.Status });
            
            entity.HasOne(e => e.AcceptedUser)
                  .WithMany()
                  .HasForeignKey(e => e.AcceptedUserId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Configure ShopifyOrder entity
        modelBuilder.Entity<ShopifyOrder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OrderNumber).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.ShopifyOrderId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(100);
            entity.Property(e => e.FulfillmentStatus).HasMaxLength(100);
            entity.Property(e => e.DisplayFulfillmentStatus).HasMaxLength(100);
            entity.Property(e => e.DisplayFinancialStatus).HasMaxLength(100);
            entity.Property(e => e.Currency).HasMaxLength(10);
            entity.Property(e => e.CustomerEmail).HasMaxLength(255);
            entity.Property(e => e.CustomerFirstName).HasMaxLength(255);
            entity.Property(e => e.CustomerLastName).HasMaxLength(255);
            entity.Property(e => e.LineItemsJson).HasColumnType("text");
            
            entity.HasIndex(e => e.StoreConnectionId);
            entity.HasIndex(e => e.ShopifyOrderId);
            entity.HasIndex(e => e.OrderNumber);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.FulfillmentStatus);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.StoreConnectionId, e.ShopifyOrderId }).IsUnique();
            
            entity.HasOne(e => e.StoreConnection)
                  .WithMany()
                  .HasForeignKey(e => e.StoreConnectionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure AmazonOrder entity
        modelBuilder.Entity<AmazonOrder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OrderNumber).IsRequired().HasMaxLength(255);
            entity.Property(e => e.AmazonOrderId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(100);
            entity.Property(e => e.OrderStatus).HasMaxLength(100);
            entity.Property(e => e.FulfillmentChannel).HasMaxLength(100);
            entity.Property(e => e.SalesChannel).HasMaxLength(100);
            entity.Property(e => e.OrderType).HasMaxLength(100);
            entity.Property(e => e.Currency).HasMaxLength(10);
            entity.Property(e => e.BuyerEmail).HasMaxLength(255);
            entity.Property(e => e.BuyerName).HasMaxLength(255);
            entity.Property(e => e.OrderItemsJson).HasColumnType("text");
            
            entity.HasIndex(e => e.StoreConnectionId);
            entity.HasIndex(e => e.AmazonOrderId);
            entity.HasIndex(e => e.OrderNumber);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.OrderStatus);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.StoreConnectionId, e.AmazonOrderId }).IsUnique();
            
            entity.HasOne(e => e.StoreConnection)
                  .WithMany()
                  .HasForeignKey(e => e.StoreConnectionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure FlipkartOrder entity
        modelBuilder.Entity<FlipkartOrder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OrderNumber).IsRequired().HasMaxLength(255);
            entity.Property(e => e.FlipkartOrderId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(100);
            entity.Property(e => e.OrderState).HasMaxLength(100);
            entity.Property(e => e.OrderType).HasMaxLength(100);
            entity.Property(e => e.Currency).HasMaxLength(10);
            entity.Property(e => e.CustomerName).HasMaxLength(255);
            entity.Property(e => e.CustomerEmail).HasMaxLength(255);
            entity.Property(e => e.CustomerPhone).HasMaxLength(50);
            entity.Property(e => e.PaymentType).HasMaxLength(100);
            entity.Property(e => e.PaymentStatus).HasMaxLength(100);
            entity.Property(e => e.OrderItemsJson).HasColumnType("text");
            
            entity.HasIndex(e => e.StoreConnectionId);
            entity.HasIndex(e => e.FlipkartOrderId);
            entity.HasIndex(e => e.OrderNumber);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.OrderState);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.StoreConnectionId, e.FlipkartOrderId }).IsUnique();
            
            entity.HasOne(e => e.StoreConnection)
                  .WithMany()
                  .HasForeignKey(e => e.StoreConnectionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure ShopifyProduct entity
        modelBuilder.Entity<ShopifyProduct>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ShopifyProductId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Handle).HasMaxLength(255);
            entity.Property(e => e.BodyHtml).HasColumnType("text");
            entity.Property(e => e.Vendor).HasMaxLength(255);
            entity.Property(e => e.ProductType).HasMaxLength(255);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Tags).HasColumnType("text");
            entity.Property(e => e.ImageUrl).HasMaxLength(1000);
            entity.Property(e => e.ImageAltText).HasMaxLength(255);
            
            entity.HasIndex(e => e.StoreConnectionId);
            entity.HasIndex(e => e.ShopifyProductId);
            entity.HasIndex(e => e.Title);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.Vendor);
            entity.HasIndex(e => e.ProductType);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.ShopifyUpdatedAt);
            entity.HasIndex(e => new { e.StoreConnectionId, e.ShopifyProductId }).IsUnique();
            
            entity.HasOne(e => e.StoreConnection)
                  .WithMany()
                  .HasForeignKey(e => e.StoreConnectionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure ShopifyProductVariant entity
        modelBuilder.Entity<ShopifyProductVariant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ShopifyVariantId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Title).HasMaxLength(500);
            entity.Property(e => e.Price).HasColumnType("decimal(18,2)");
            entity.Property(e => e.CompareAtPrice).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Sku).HasMaxLength(255);
            entity.Property(e => e.Barcode).HasMaxLength(255);
            entity.Property(e => e.InventoryPolicy).HasMaxLength(50);
            entity.Property(e => e.FulfillmentService).HasMaxLength(100);
            entity.Property(e => e.InventoryManagement).HasMaxLength(100);
            entity.Property(e => e.WeightUnit).HasMaxLength(10);
            entity.Property(e => e.InventoryItemId).HasMaxLength(255);
            entity.Property(e => e.Option1).HasMaxLength(255);
            entity.Property(e => e.Option2).HasMaxLength(255);
            entity.Property(e => e.Option3).HasMaxLength(255);
            
            entity.HasIndex(e => e.ProductId);
            entity.HasIndex(e => e.ShopifyVariantId);
            entity.HasIndex(e => e.Sku);
            entity.HasIndex(e => e.Barcode);
            entity.HasIndex(e => e.InventoryQuantity);
            entity.HasIndex(e => e.Price);
            entity.HasIndex(e => new { e.ProductId, e.ShopifyVariantId }).IsUnique();
            entity.HasIndex(e => new { e.ProductId, e.Position });
            
            entity.HasOne(e => e.Product)
                  .WithMany(p => p.Variants)
                  .HasForeignKey(e => e.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure ShopifyInventoryLevel entity
        modelBuilder.Entity<ShopifyInventoryLevel>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ShopifyInventoryLevelId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.InventoryItemId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.LocationId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.LocationName).IsRequired().HasMaxLength(255);
            
            entity.HasIndex(e => e.VariantId);
            entity.HasIndex(e => e.InventoryItemId);
            entity.HasIndex(e => e.LocationId);
            entity.HasIndex(e => e.Available);
            entity.HasIndex(e => new { e.VariantId, e.LocationId }).IsUnique();
            entity.HasIndex(e => new { e.LocationId, e.Available });
            
            entity.HasOne(e => e.Variant)
                  .WithMany(v => v.InventoryLevels)
                  .HasForeignKey(e => e.VariantId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure OrderPickupStatus entity
        modelBuilder.Entity<OrderPickupStatus>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ShopifyOrderId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.OrderName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.PickupStatus).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.CourierCompany).IsRequired().HasMaxLength(100);
            entity.Property(e => e.TrackingNumber).IsRequired().HasMaxLength(255);
            entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(100);
            entity.Property(e => e.UpdatedBy).HasMaxLength(100);
            
            entity.HasIndex(e => e.ShopifyOrderId);
            entity.HasIndex(e => e.OrderName);
            entity.HasIndex(e => e.PickupStatus);
            entity.HasIndex(e => e.FulfillmentDate);
            entity.HasIndex(e => e.CourierCompany);
            entity.HasIndex(e => new { e.ShopifyOrderId, e.TrackingNumber }).IsUnique();
        });

        // Configure LabelDocument entity
        modelBuilder.Entity<LabelDocument>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.OriginalName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.FilePath).IsRequired().HasMaxLength(500);
            entity.Property(e => e.MimeType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.CourierCompany).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(500);
            
            entity.HasIndex(e => e.UploadedBy);
            entity.HasIndex(e => e.CourierCompany);
            entity.HasIndex(e => e.UploadedAt);
            entity.HasIndex(e => e.IsDeleted);
            entity.HasIndex(e => new { e.UploadedBy, e.CourierCompany });
            entity.HasIndex(e => new { e.UploadedBy, e.IsDeleted });
            
            entity.HasOne(e => e.UploadedByUser)
                  .WithMany()
                  .HasForeignKey(e => e.UploadedBy)
                  .OnDelete(DeleteBehavior.Cascade);
                  
            entity.HasOne(e => e.DeletedByUser)
                  .WithMany()
                  .HasForeignKey(e => e.DeletedBy)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Configure Warehouse entity
        modelBuilder.Entity<Warehouse>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Address).IsRequired();
            entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(100);
            
            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.IsDefaultSource);
            entity.HasIndex(e => e.CreatedAt);
        });

        // Configure WarehouseShipment entity
        modelBuilder.Entity<WarehouseShipment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ShipmentNumber).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(100);
            entity.Property(e => e.DispatchedBy).HasMaxLength(100);
            entity.Property(e => e.ReceivedBy).HasMaxLength(100);
            
            entity.HasIndex(e => e.ShipmentNumber).IsUnique();
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedBy);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.DispatchedAt);
            entity.HasIndex(e => e.ReceivedAt);
            entity.HasIndex(e => e.SourceWarehouseId);
            entity.HasIndex(e => e.DestinationWarehouseId);
            entity.HasIndex(e => new { e.Status, e.CreatedAt });
            entity.HasIndex(e => new { e.SourceWarehouseId, e.Status });
            entity.HasIndex(e => new { e.DestinationWarehouseId, e.Status });
            
            // Warehouse relationships (nullable for backward compatibility)
            entity.HasOne(e => e.SourceWarehouse)
                  .WithMany(w => w.SourceShipments)
                  .HasForeignKey(e => e.SourceWarehouseId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .IsRequired(false);
                  
            entity.HasOne(e => e.DestinationWarehouse)
                  .WithMany(w => w.DestinationShipments)
                  .HasForeignKey(e => e.DestinationWarehouseId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .IsRequired(false);
            
            entity.HasMany(e => e.Items)
                  .WithOne(i => i.Shipment)
                  .HasForeignKey(i => i.ShipmentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure WarehouseShipmentItem entity
        modelBuilder.Entity<WarehouseShipmentItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProductBarcode).IsRequired().HasMaxLength(255);
            entity.Property(e => e.ShopifyProductId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.ShopifyVariantId).IsRequired().HasMaxLength(255);
            entity.Property(e => e.ProductTitle).IsRequired().HasMaxLength(500);
            entity.Property(e => e.VariantTitle).HasMaxLength(500);
            entity.Property(e => e.Sku).HasMaxLength(100);
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Currency).HasMaxLength(10);
            entity.Property(e => e.ProductImageUrl).HasMaxLength(1000);
            entity.Property(e => e.Notes).HasMaxLength(500);
            
            entity.HasIndex(e => e.ShipmentId);
            entity.HasIndex(e => e.ProductBarcode);
            entity.HasIndex(e => e.ShopifyProductId);
            entity.HasIndex(e => e.ShopifyVariantId);
            entity.HasIndex(e => e.Sku);
            entity.HasIndex(e => new { e.ShipmentId, e.ProductBarcode });
            entity.HasIndex(e => new { e.ShipmentId, e.ShopifyVariantId });
        });

        // Configure Finance entities
        // Configure Expense entity
        modelBuilder.Entity<Expense>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Category).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Currency).IsRequired().HasMaxLength(3);
            entity.Property(e => e.PaymentMode).IsRequired().HasMaxLength(50);
            entity.Property(e => e.PaidTo).IsRequired().HasMaxLength(200);
            entity.Property(e => e.ChartOfAccountCode).HasMaxLength(100);
            entity.Property(e => e.ChartOfAccountName).HasMaxLength(200);
            entity.Property(e => e.ReceiptUrl).HasMaxLength(500);
            entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.Date).IsRequired();
            
            // Configure Tags property to be stored as JSON
            entity.Property(e => e.Tags)
                .HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                    v => System.Text.Json.JsonSerializer.Deserialize<List<string>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new List<string>(),
                    new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<string>>(
                        (c1, c2) => (c1 ?? new List<string>()).SequenceEqual(c2 ?? new List<string>()),
                        c => (c ?? new List<string>()).Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
                        c => (c ?? new List<string>()).ToList()
                    )
                )
                .HasColumnType("text");
            
            entity.HasIndex(e => e.Date);
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedBy);
            entity.HasIndex(e => e.PaymentMode);
            entity.HasIndex(e => e.PaidTo);
            entity.HasIndex(e => e.ChartOfAccountCode);
            entity.HasIndex(e => new { e.Date, e.Type });
        });

        // Configure ExpenseCategory entity
        modelBuilder.Entity<ExpenseCategory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(500);
            
            entity.HasIndex(e => e.Name).IsUnique();
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.IsActive);
        });

        // Configure PaymentMode entity
        modelBuilder.Entity<PaymentMode>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
            entity.Property(e => e.DisplayName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);
            
            entity.HasIndex(e => e.Name).IsUnique();
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.SortOrder);
        });

        // Configure ExpenseTag entity
        modelBuilder.Entity<ExpenseTag>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
            entity.Property(e => e.DisplayName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Color).HasMaxLength(20);
            entity.Property(e => e.Description).HasMaxLength(500);
            
            entity.HasIndex(e => e.Name).IsUnique();
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.SortOrder);
        });

        // Configure ChartOfAccount entity
        modelBuilder.Entity<ChartOfAccount>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.ParentCode).HasMaxLength(20);
            entity.Property(e => e.IsActive).IsRequired();
            
            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.ParentCode);
        });

        // Configure ProductCost entity
        modelBuilder.Entity<ProductCost>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProductId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.VariantId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Sku).IsRequired().HasMaxLength(100);
            entity.Property(e => e.CostPrice).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Currency).IsRequired().HasMaxLength(3);
            entity.Property(e => e.Supplier).HasMaxLength(200);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.LastUpdatedBy).IsRequired().HasMaxLength(100);
            
            entity.HasIndex(e => e.ProductId);
            entity.HasIndex(e => e.VariantId);
            entity.HasIndex(e => e.Sku).IsUnique();
            entity.HasIndex(e => new { e.ProductId, e.VariantId }).IsUnique();
        });

        // Configure Payout entity
        modelBuilder.Entity<Payout>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PayoutId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Currency).IsRequired().HasMaxLength(3);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Fees).HasColumnType("decimal(18,2)");
            entity.Property(e => e.NetAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Notes).HasMaxLength(1000);
            
            // Configure OrderIds property to be stored as JSON
            entity.Property(e => e.OrderIds)
                .HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                    v => System.Text.Json.JsonSerializer.Deserialize<List<string>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new List<string>(),
                    new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<string>>(
                        (c1, c2) => (c1 ?? new List<string>()).SequenceEqual(c2 ?? new List<string>()),
                        c => (c ?? new List<string>()).Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
                        c => (c ?? new List<string>()).ToList()
                    )
                )
                .HasColumnType("text");
            
            entity.HasIndex(e => e.PayoutId).IsUnique();
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.ExpectedDate);
            entity.HasIndex(e => e.ActualDate);
        });

        // Configure PayoutReconciliation entity
        modelBuilder.Entity<PayoutReconciliation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PayoutId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ExpectedAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.ActualAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Difference).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Fees).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Status).IsRequired().HasMaxLength(20);
            
            entity.HasIndex(e => e.PayoutId);
            entity.HasIndex(e => e.Status);
        });

        // Configure TaxRecord entity
        modelBuilder.Entity<TaxRecord>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OrderId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Country).IsRequired().HasMaxLength(100);
            entity.Property(e => e.State).HasMaxLength(100);
            entity.Property(e => e.TaxType).IsRequired().HasMaxLength(20);
            entity.Property(e => e.TaxAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TaxableAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TaxRate).HasColumnType("decimal(5,4)");
            entity.Property(e => e.Currency).IsRequired().HasMaxLength(3);
            entity.Property(e => e.TaxDate).IsRequired();
            
            entity.HasIndex(e => e.OrderId);
            entity.HasIndex(e => e.Country);
            entity.HasIndex(e => e.TaxType);
            entity.HasIndex(e => e.TaxDate);
        });

        // Configure SalesAnalytics entity
        modelBuilder.Entity<SalesAnalytics>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Revenue).HasColumnType("decimal(18,2)");
            entity.Property(e => e.AverageOrderValue).HasColumnType("decimal(18,2)");
            entity.Property(e => e.CostOfGoods).HasColumnType("decimal(18,2)");
            entity.Property(e => e.GrossProfit).HasColumnType("decimal(18,2)");
            entity.Property(e => e.GrossMargin).HasColumnType("decimal(5,4)");
            entity.Property(e => e.Currency).IsRequired().HasMaxLength(3);
            entity.Property(e => e.Date).IsRequired();
            
            entity.HasIndex(e => e.Date);
            entity.HasIndex(e => new { e.Date, e.Currency });
        });

        // Configure ProductAnalytics entity
        modelBuilder.Entity<ProductAnalytics>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProductId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.VariantId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Sku).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ProductTitle).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Revenue).HasColumnType("decimal(18,2)");
            entity.Property(e => e.CostPrice).HasColumnType("decimal(18,2)");
            entity.Property(e => e.GrossProfit).HasColumnType("decimal(18,2)");
            entity.Property(e => e.GrossMargin).HasColumnType("decimal(5,4)");
            entity.Property(e => e.Currency).IsRequired().HasMaxLength(3);
            entity.Property(e => e.Date).IsRequired();
            
            entity.HasIndex(e => e.ProductId);
            entity.HasIndex(e => e.VariantId);
            entity.HasIndex(e => e.Sku);
            entity.HasIndex(e => e.Date);
        });

        // Configure Report entity
        modelBuilder.Entity<Report>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Format).IsRequired().HasMaxLength(20);
            entity.Property(e => e.FileName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.FilePath).IsRequired().HasMaxLength(500);
            entity.Property(e => e.GeneratedBy).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Parameters).HasMaxLength(1000);
            
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.Format);
            entity.HasIndex(e => e.GeneratedBy);
            entity.HasIndex(e => e.GeneratedAt);
        });

        // Configure Supplier entity
        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.ContactPerson).HasMaxLength(100);
            entity.Property(e => e.Phone).HasMaxLength(50);
            entity.Property(e => e.Email).HasMaxLength(100);
            entity.Property(e => e.TaxId).HasMaxLength(50);
            entity.Property(e => e.PaymentTerms).HasMaxLength(50);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(100);
            
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.CreatedAt);
        });

        // Configure PurchaseOrder entity
        modelBuilder.Entity<PurchaseOrder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PoNumber).IsRequired().HasMaxLength(50);
            entity.Property(e => e.SupplierId).IsRequired();
            entity.Property(e => e.ReferenceNumber).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.Subtotal).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TaxAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.ShippingCost).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Currency).IsRequired().HasMaxLength(3);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(20);
            entity.Property(e => e.InvoiceUrl).HasMaxLength(500);
            entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(100);
            
            entity.HasIndex(e => e.PoNumber);
            entity.HasIndex(e => e.SupplierId);
            entity.HasIndex(e => e.PurchaseDate);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsReceived);
            entity.HasIndex(e => e.CreatedAt);
            
            entity.HasOne(e => e.Supplier)
                  .WithMany()
                  .HasForeignKey(e => e.SupplierId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Configure PurchaseOrderItem entity
        modelBuilder.Entity<PurchaseOrderItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PurchaseOrderId).IsRequired();
            entity.Property(e => e.ProductId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.VariantId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Sku).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ProductName).IsRequired().HasMaxLength(500);
            entity.Property(e => e.VariantTitle).HasMaxLength(500);
            entity.Property(e => e.Quantity).IsRequired();
            entity.Property(e => e.PurchasePrice).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalPrice).HasColumnType("decimal(18,2)");
            entity.Property(e => e.GstAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.GstRate).HasColumnType("decimal(5,2)");
            entity.Property(e => e.QuantityReceived);
            entity.Property(e => e.Notes).HasMaxLength(500);
            
            entity.HasIndex(e => e.PurchaseOrderId);
            entity.HasIndex(e => e.ProductId);
            entity.HasIndex(e => e.VariantId);
            entity.HasIndex(e => e.Sku);
            entity.HasIndex(e => new { e.PurchaseOrderId, e.ProductId });
            
            entity.HasOne(e => e.PurchaseOrder)
                  .WithMany(po => po.Items)
                  .HasForeignKey(e => e.PurchaseOrderId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure SupplierPayment entity
        modelBuilder.Entity<SupplierPayment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PurchaseOrderId).IsRequired();
            entity.Property(e => e.SupplierId).IsRequired();
            entity.Property(e => e.PaymentNumber).IsRequired().HasMaxLength(100);
            entity.Property(e => e.PaymentDate).IsRequired();
            entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Currency).IsRequired().HasMaxLength(3);
            entity.Property(e => e.PaymentMethod).IsRequired().HasMaxLength(50);
            entity.Property(e => e.ReferenceNumber).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(20);
            entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(100);
            
            entity.HasIndex(e => e.PurchaseOrderId);
            entity.HasIndex(e => e.SupplierId);
            entity.HasIndex(e => e.PaymentNumber);
            entity.HasIndex(e => e.PaymentDate);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
            
            entity.HasOne(e => e.PurchaseOrder)
                  .WithMany(po => po.Payments)
                  .HasForeignKey(e => e.PurchaseOrderId)
                  .OnDelete(DeleteBehavior.Restrict);
                  
            entity.HasOne(e => e.Supplier)
                  .WithMany()
                  .HasForeignKey(e => e.SupplierId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Configure PurchaseOrderJourney entity
        modelBuilder.Entity<PurchaseOrderJourney>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PurchaseOrderId).IsRequired();
            entity.Property(e => e.FromStatus).IsRequired().HasMaxLength(20);
            entity.Property(e => e.ToStatus).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.ActionBy).HasMaxLength(100);
            
            entity.HasIndex(e => e.PurchaseOrderId);
            entity.HasIndex(e => e.FromStatus);
            entity.HasIndex(e => e.ToStatus);
            entity.HasIndex(e => e.CreatedAt);
            
            entity.HasOne(e => e.PurchaseOrder)
                  .WithMany(po => po.Journey)
                  .HasForeignKey(e => e.PurchaseOrderId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure AccountGroup entity
        modelBuilder.Entity<AccountGroup>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(500);
            
            entity.HasIndex(e => e.Name).IsUnique();
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.IsActive);
        });

        // Configure Ledger entity
        modelBuilder.Entity<Ledger>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.GroupId).IsRequired();
            entity.Property(e => e.OpeningBalance).HasColumnType("decimal(20,2)");
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(100);
            
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.GroupId);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.CreatedBy);
            
            entity.HasOne(e => e.Group)
                  .WithMany(g => g.Ledgers)
                  .HasForeignKey(e => e.GroupId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Configure Transaction entity
        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Date).IsRequired();
            entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            
            entity.HasIndex(e => e.Date);
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedBy);
            entity.HasIndex(e => e.CreatedAt);
        });

        // Configure TransactionEntry entity
        modelBuilder.Entity<TransactionEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TransactionId).IsRequired();
            entity.Property(e => e.LedgerId).IsRequired();
            entity.Property(e => e.IsDebit).IsRequired();
            entity.Property(e => e.Amount).HasColumnType("decimal(20,2)");
            entity.Property(e => e.Description).HasMaxLength(500);
            
            entity.HasIndex(e => e.TransactionId);
            entity.HasIndex(e => e.LedgerId);
            entity.HasIndex(e => e.IsDebit);
            entity.HasIndex(e => e.CreatedAt);
            
            entity.HasOne(e => e.Transaction)
                  .WithMany(t => t.Entries)
                  .HasForeignKey(e => e.TransactionId)
                  .OnDelete(DeleteBehavior.Cascade);
                  
            entity.HasOne(e => e.Ledger)
                  .WithMany(l => l.TransactionEntries)
                  .HasForeignKey(e => e.LedgerId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Configure InventoryAsset entity
        modelBuilder.Entity<InventoryAsset>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Sku).IsRequired().HasMaxLength(255);
            entity.Property(e => e.ProductTitle).HasMaxLength(500);
            entity.Property(e => e.VariantTitle).HasMaxLength(255);
            entity.Property(e => e.CostPerItem).HasColumnType("decimal(20,2)");
            entity.Property(e => e.SellingPrice).HasColumnType("decimal(20,2)");
            entity.Property(e => e.MaxPrice).HasColumnType("decimal(20,2)");
            entity.Property(e => e.TotalValue).HasColumnType("decimal(20,2)");
            entity.Property(e => e.Currency).HasMaxLength(3);
            entity.Property(e => e.Supplier).HasMaxLength(100);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.CreatedBy).HasMaxLength(100);
            
            entity.HasIndex(e => e.ProductId);
            entity.HasIndex(e => e.VariantId);
            entity.HasIndex(e => e.Sku);
            entity.HasIndex(e => e.LedgerId);
            entity.HasIndex(e => new { e.ProductId, e.VariantId }).IsUnique();
            
            entity.HasOne(e => e.Ledger)
                  .WithMany()
                  .HasForeignKey(e => e.LedgerId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }

    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return await base.SaveChangesAsync(cancellationToken);
    }

    private void UpdateTimestamps()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.Entity is Job || e.Entity is OrderStatus || e.Entity is JobData || 
                       e.Entity is User || e.Entity is UserPermission || 
                       e.Entity is StoreConnection || e.Entity is OTPRequest || e.Entity is Invitation ||
                       e.Entity is OrderPickupStatus || e.Entity is LabelDocument ||
                       e.Entity is Warehouse || e.Entity is WarehouseShipment || e.Entity is WarehouseShipmentItem ||
                       e.Entity is ShopifyProduct || e.Entity is ShopifyProductVariant || e.Entity is ShopifyInventoryLevel ||
                       e.Entity is Expense || e.Entity is ExpenseCategory || e.Entity is ChartOfAccount || e.Entity is ProductCost ||
                       e.Entity is Payout || e.Entity is PayoutReconciliation || e.Entity is TaxRecord ||
                       e.Entity is SalesAnalytics || e.Entity is ProductAnalytics || e.Entity is Report ||
                       e.Entity is Supplier || e.Entity is PurchaseOrder || e.Entity is PurchaseOrderItem || e.Entity is SupplierPayment || e.Entity is PurchaseOrderJourney ||
                       e.Entity is AccountGroup || e.Entity is Ledger || e.Entity is Transaction || e.Entity is TransactionEntry ||
                       e.Entity is InventoryAsset)
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity is Job job)
                {
                    job.CreatedAt = DateTime.UtcNow;
                    job.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is OrderStatus orderStatus)
                {
                    orderStatus.CreatedAt = DateTime.UtcNow;
                    orderStatus.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is JobData jobData)
                {
                    jobData.CreatedAt = DateTime.UtcNow;
                    jobData.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is User user)
                {
                    user.CreatedAt = DateTime.UtcNow;
                    user.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is UserPermission userPermission)
                {
                    userPermission.CreatedAt = DateTime.UtcNow;
                    userPermission.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is StoreConnection storeConnection)
                {
                    storeConnection.CreatedAt = DateTime.UtcNow;
                    storeConnection.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is OTPRequest otpRequest)
                {
                    otpRequest.CreatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is Invitation invitation)
                {
                    invitation.InvitedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is OrderPickupStatus pickupStatus)
                {
                    pickupStatus.CreatedAt = DateTime.UtcNow;
                    pickupStatus.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is LabelDocument labelDocument)
                {
                    labelDocument.UploadedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is Warehouse warehouse)
                {
                    warehouse.CreatedAt = DateTime.UtcNow;
                    warehouse.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is WarehouseShipment warehouseShipment)
                {
                    warehouseShipment.CreatedAt = DateTime.UtcNow;
                    warehouseShipment.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is WarehouseShipmentItem warehouseShipmentItem)
                {
                    warehouseShipmentItem.CreatedAt = DateTime.UtcNow;
                    warehouseShipmentItem.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is ShopifyProduct shopifyProduct)
                {
                    shopifyProduct.CreatedAt = DateTime.UtcNow;
                    shopifyProduct.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is ShopifyProductVariant shopifyVariant)
                {
                    shopifyVariant.CreatedAt = DateTime.UtcNow;
                    shopifyVariant.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is ShopifyInventoryLevel shopifyInventoryLevel)
                {
                    shopifyInventoryLevel.CreatedAt = DateTime.UtcNow;
                    shopifyInventoryLevel.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is Expense expense)
                {
                    expense.CreatedAt = DateTime.UtcNow;
                    expense.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is ExpenseCategory expenseCategory)
                {
                    expenseCategory.CreatedAt = DateTime.UtcNow;
                    expenseCategory.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is ChartOfAccount chartOfAccount)
                {
                    chartOfAccount.CreatedAt = DateTime.UtcNow;
                    chartOfAccount.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is ProductCost productCost)
                {
                    productCost.CreatedAt = DateTime.UtcNow;
                    productCost.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is Payout payout)
                {
                    payout.CreatedAt = DateTime.UtcNow;
                    payout.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is PayoutReconciliation payoutReconciliation)
                {
                    payoutReconciliation.CreatedAt = DateTime.UtcNow;
                    payoutReconciliation.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is TaxRecord taxRecord)
                {
                    taxRecord.CreatedAt = DateTime.UtcNow;
                    taxRecord.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is SalesAnalytics salesAnalytics)
                {
                    salesAnalytics.CreatedAt = DateTime.UtcNow;
                    salesAnalytics.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is ProductAnalytics productAnalytics)
                {
                    productAnalytics.CreatedAt = DateTime.UtcNow;
                    productAnalytics.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is Report report)
                {
                    report.CreatedAt = DateTime.UtcNow;
                    report.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is Supplier supplier)
                {
                    supplier.CreatedAt = DateTime.UtcNow;
                    supplier.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is PurchaseOrder purchaseOrder)
                {
                    purchaseOrder.CreatedAt = DateTime.UtcNow;
                    purchaseOrder.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is PurchaseOrderItem purchaseOrderItem)
                {
                    purchaseOrderItem.CreatedAt = DateTime.UtcNow;
                    purchaseOrderItem.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is SupplierPayment supplierPayment)
                {
                    supplierPayment.CreatedAt = DateTime.UtcNow;
                    supplierPayment.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is PurchaseOrderJourney purchaseOrderJourney)
                {
                    purchaseOrderJourney.CreatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is AccountGroup accountGroup)
                {
                    accountGroup.CreatedAt = DateTime.UtcNow;
                    accountGroup.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is Ledger ledger)
                {
                    ledger.CreatedAt = DateTime.UtcNow;
                    ledger.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is Transaction transaction)
                {
                    transaction.CreatedAt = DateTime.UtcNow;
                    transaction.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is TransactionEntry transactionEntry)
                {
                    transactionEntry.CreatedAt = DateTime.UtcNow;
                    transactionEntry.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is InventoryAsset inventoryAsset)
                {
                    inventoryAsset.CreatedAt = DateTime.UtcNow;
                    inventoryAsset.UpdatedAt = DateTime.UtcNow;
                }
            }
            else if (entry.State == EntityState.Modified)
            {
                if (entry.Entity is Job job)
                {
                    job.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is OrderStatus orderStatus)
                {
                    orderStatus.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is JobData jobData)
                {
                    jobData.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is User user)
                {
                    user.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is UserPermission userPermission)
                {
                    userPermission.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is OrderPickupStatus pickupStatus)
                {
                    pickupStatus.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is Warehouse warehouse)
                {
                    warehouse.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is WarehouseShipment warehouseShipment)
                {
                    warehouseShipment.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is WarehouseShipmentItem warehouseShipmentItem)
                {
                    warehouseShipmentItem.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is ShopifyProduct shopifyProduct)
                {
                    shopifyProduct.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is ShopifyProductVariant shopifyVariant)
                {
                    shopifyVariant.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is ShopifyInventoryLevel shopifyInventoryLevel)
                {
                    shopifyInventoryLevel.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is Expense expense)
                {
                    expense.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is ExpenseCategory expenseCategory)
                {
                    expenseCategory.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is ChartOfAccount chartOfAccount)
                {
                    chartOfAccount.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is ProductCost productCost)
                {
                    productCost.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is Payout payout)
                {
                    payout.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is PayoutReconciliation payoutReconciliation)
                {
                    payoutReconciliation.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is TaxRecord taxRecord)
                {
                    taxRecord.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is SalesAnalytics salesAnalytics)
                {
                    salesAnalytics.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is ProductAnalytics productAnalytics)
                {
                    productAnalytics.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is Report report)
                {
                    report.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is Supplier supplier)
                {
                    supplier.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is PurchaseOrder purchaseOrder)
                {
                    purchaseOrder.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is PurchaseOrderItem purchaseOrderItem)
                {
                    purchaseOrderItem.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is AccountGroup accountGroup)
                {
                    accountGroup.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is Ledger ledger)
                {
                    ledger.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is Transaction transaction)
                {
                    transaction.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is TransactionEntry transactionEntry)
                {
                    transactionEntry.UpdatedAt = DateTime.UtcNow;
                }
                else if (entry.Entity is InventoryAsset inventoryAsset)
                {
                    inventoryAsset.UpdatedAt = DateTime.UtcNow;
                }
            }
        }
    }
} 