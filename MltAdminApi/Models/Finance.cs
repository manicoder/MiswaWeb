using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mlt.Admin.Api.Models
{
    // ===== EXPENSE MODELS =====
    public class Expense
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string Category { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;
        
        [Required]
        [Range(0.01, double.MaxValue)]
        [Column(TypeName = "decimal(20,2)")]
        public decimal Amount { get; set; }
        
        [Required]
        [MaxLength(3)]
        public string Currency { get; set; } = "INR";
        
        [Required]
        public DateTime Date { get; set; }
        
        // Enhanced fields for expense management
        [Required]
        [MaxLength(50)]
        public string PaymentMode { get; set; } = string.Empty; // Cash, Card, Bank Transfer, UPI, etc.
        
        [Required]
        [MaxLength(200)]
        public string PaidTo { get; set; } = string.Empty; // Person or entity paid to
        
        [MaxLength(100)]
        public string? ChartOfAccountCode { get; set; } // Mapping to chart of accounts
        
        [MaxLength(200)]
        public string? ChartOfAccountName { get; set; } // Chart of account name for display
        
        public List<string> Tags { get; set; } = new();
        
        [MaxLength(500)]
        public string? ReceiptUrl { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string CreatedBy { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "pending";
        
        [MaxLength(1000)]
        public string? Notes { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class ExpenseCategory
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // Chart of Accounts for expense mapping
    public class ChartOfAccount
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        [MaxLength(20)]
        public string Code { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty; // Asset, Liability, Equity, Revenue, Expense
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        [MaxLength(20)]
        public string? ParentCode { get; set; } // For hierarchical structure
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // ===== PRODUCT COST MODELS =====
    public class ProductCost
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        [MaxLength(100)]
        public string ProductId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string VariantId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string Sku { get; set; } = string.Empty;
        
        [Required]
        [Range(0, double.MaxValue)]
        [Column(TypeName = "decimal(20,2)")]
        public decimal CostPrice { get; set; }
        
        [Required]
        [MaxLength(3)]
        public string Currency { get; set; } = "INR";
        
        [MaxLength(200)]
        public string? Supplier { get; set; }
        
        [MaxLength(1000)]
        public string? Notes { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string LastUpdatedBy { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // ===== INVENTORY ASSET MODELS =====
    public class InventoryAsset
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public Guid ProductId { get; set; }
        
        [Required]
        public Guid VariantId { get; set; }
        
        [Required]
        [MaxLength(255)]
        public string Sku { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string ProductTitle { get; set; } = string.Empty;
        
        [MaxLength(255)]
        public string VariantTitle { get; set; } = string.Empty;
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal CostPerItem { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal SellingPrice { get; set; }
        
        [Column(TypeName = "decimal(20,2)")]
        public decimal? MaxPrice { get; set; }
        
        [Required]
        public int Quantity { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal TotalValue { get; set; }
        
        [Required]
        [MaxLength(3)]
        public string Currency { get; set; } = "INR";
        
        [MaxLength(100)]
        public string? Supplier { get; set; }
        
        [MaxLength(1000)]
        public string? Notes { get; set; }
        
        [Required]
        public string LedgerId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string CreatedBy { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual Ledger Ledger { get; set; } = null!;
    }

    // ===== PAYOUT MODELS =====
    public class Payout
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        [MaxLength(100)]
        public string PayoutId { get; set; } = string.Empty;
        
        [Required]
        [Range(0, double.MaxValue)]
        [Column(TypeName = "decimal(20,2)")]
        public decimal Amount { get; set; }
        
        [Required]
        [MaxLength(3)]
        public string Currency { get; set; } = "INR";
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = string.Empty;
        
        [Required]
        public DateTime ExpectedDate { get; set; }
        
        public DateTime? ActualDate { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        [Column(TypeName = "decimal(20,2)")]
        public decimal Fees { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        [Column(TypeName = "decimal(20,2)")]
        public decimal NetAmount { get; set; }
        
        public List<string> OrderIds { get; set; } = new();
        
        [MaxLength(1000)]
        public string? Notes { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class PayoutReconciliation
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        [MaxLength(100)]
        public string PayoutId { get; set; } = string.Empty;
        
        [Required]
        [Range(0, double.MaxValue)]
        [Column(TypeName = "decimal(20,2)")]
        public decimal ExpectedAmount { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        [Column(TypeName = "decimal(20,2)")]
        public decimal ActualAmount { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal Difference { get; set; }
        
        [Required]
        public int MatchedOrders { get; set; }
        
        [Required]
        public int UnmatchedOrders { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        [Column(TypeName = "decimal(20,2)")]
        public decimal Fees { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // ===== TAX MODELS =====
    public class TaxRecord
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        [MaxLength(100)]
        public string OrderId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string Country { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? State { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string TaxType { get; set; } = string.Empty;
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal TaxAmount { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal TaxableAmount { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(5,4)")]
        public decimal TaxRate { get; set; }
        
        [Required]
        [MaxLength(3)]
        public string Currency { get; set; } = "INR";
        
        [Required]
        public DateTime TaxDate { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // ===== SALES ANALYTICS MODELS =====
    public class SalesAnalytics
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal Revenue { get; set; }
        
        [Required]
        public int Orders { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal AverageOrderValue { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal CostOfGoods { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal GrossProfit { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(6,4)")]
        public decimal GrossMargin { get; set; }
        
        [Required]
        [MaxLength(3)]
        public string Currency { get; set; } = "INR";
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class ProductAnalytics
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        [MaxLength(100)]
        public string ProductId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string VariantId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string Sku { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(500)]
        public string ProductTitle { get; set; } = string.Empty;
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        public int QuantitySold { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal Revenue { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal CostPrice { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal GrossProfit { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(6,4)")]
        public decimal GrossMargin { get; set; }
        
        [Required]
        [MaxLength(3)]
        public string Currency { get; set; } = "INR";
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // ===== REPORT MODELS =====
    public class Report
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string Format { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string FileName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(500)]
        public string FilePath { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string GeneratedBy { get; set; } = string.Empty;
        
        [Required]
        public int RecordCount { get; set; }
        
        [Required]
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? DownloadedAt { get; set; }
        
        [MaxLength(1000)]
        public string? Parameters { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // ===== PURCHASE ORDER MODELS =====
    public class Supplier
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Address { get; set; }
        
        [MaxLength(100)]
        public string? ContactPerson { get; set; }
        
        [MaxLength(50)]
        public string? Phone { get; set; }
        
        [MaxLength(100)]
        public string? Email { get; set; }
        
        [MaxLength(50)]
        public string? TaxId { get; set; }
        
        [MaxLength(50)]
        public string? PaymentTerms { get; set; }
        
        [MaxLength(1000)]
        public string? Notes { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        [Required]
        [MaxLength(100)]
        public string CreatedBy { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class PurchaseOrder
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        [MaxLength(50)]
        public string PoNumber { get; set; } = string.Empty;
        
        [Required]
        public string SupplierId { get; set; } = string.Empty;
        
        [Required]
        public DateTime PurchaseDate { get; set; }
        
        [MaxLength(100)]
        public string? ReferenceNumber { get; set; }
        
        // Enhanced fields for bill tracking
        [MaxLength(100)]
        public string? BillNumber { get; set; }
        
        public DateTime? BillDate { get; set; }
        
        public DateTime? ExpectedDeliveryDate { get; set; }
        
        [MaxLength(1000)]
        public string? Notes { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal Subtotal { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        [Column(TypeName = "decimal(20,2)")]
        public decimal TaxAmount { get; set; }
        
        // GST fields
        [Required]
        [Range(0, double.MaxValue)]
        [Column(TypeName = "decimal(20,2)")]
        public decimal GstAmount { get; set; }
        
        [Required]
        [Range(0, 100)]
        [Column(TypeName = "decimal(5,2)")]
        public decimal GstRate { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        [Column(TypeName = "decimal(20,2)")]
        public decimal ShippingCost { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal TotalAmount { get; set; }
        
        [Required]
        [MaxLength(3)]
        public string Currency { get; set; } = "INR";
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "draft"; // Enhanced status workflow
        
        [MaxLength(500)]
        public string? InvoiceUrl { get; set; }
        
        public bool IsReceived { get; set; } = false;
        
        public DateTime? ReceivedDate { get; set; }
        
        // Enhanced workflow tracking
        public DateTime? SentDate { get; set; }
        public DateTime? ConfirmedDate { get; set; }
        public DateTime? InTransitDate { get; set; }
        public DateTime? OnHoldDate { get; set; }
        public DateTime? DisputedDate { get; set; }
        
        [MaxLength(100)]
        public string? SentBy { get; set; }
        
        [MaxLength(100)]
        public string? ConfirmedBy { get; set; }
        
        [MaxLength(100)]
        public string? OnHoldBy { get; set; }
        
        [MaxLength(100)]
        public string? DisputedBy { get; set; }
        
        [MaxLength(1000)]
        public string? OnHoldReason { get; set; }
        
        [MaxLength(1000)]
        public string? DisputeReason { get; set; }
        
        // Payment tracking
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal TotalPaid { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal BalanceDue { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string CreatedBy { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual Supplier Supplier { get; set; } = null!;
        public virtual ICollection<PurchaseOrderItem> Items { get; set; } = new List<PurchaseOrderItem>();
        public virtual ICollection<SupplierPayment> Payments { get; set; } = new List<SupplierPayment>();
        public virtual ICollection<PurchaseOrderJourney> Journey { get; set; } = new List<PurchaseOrderJourney>();
    }

    public class PurchaseOrderItem
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public string PurchaseOrderId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string ProductId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string VariantId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string Sku { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(500)]
        public string ProductName { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? VariantTitle { get; set; }
        
        [Required]
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal PurchasePrice { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal TotalPrice { get; set; }
        
        // GST fields for items
        [Required]
        [Range(0, double.MaxValue)]
        [Column(TypeName = "decimal(20,2)")]
        public decimal GstAmount { get; set; }
        
        [Required]
        [Range(0, 100)]
        [Column(TypeName = "decimal(5,2)")]
        public decimal GstRate { get; set; }
        
        [Range(0, int.MaxValue)]
        public int QuantityReceived { get; set; }
        
        [MaxLength(500)]
        public string? Notes { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation property
        public virtual PurchaseOrder PurchaseOrder { get; set; } = null!;
    }

    // ===== SUPPLIER PAYMENT MODELS =====
    public class SupplierPayment
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public string PurchaseOrderId { get; set; } = string.Empty;
        
        [Required]
        public string SupplierId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string PaymentNumber { get; set; } = string.Empty;
        
        [Required]
        public DateTime PaymentDate { get; set; }
        
        [Required]
        [Range(0.01, double.MaxValue)]
        [Column(TypeName = "decimal(20,2)")]
        public decimal Amount { get; set; }
        
        [Required]
        [MaxLength(3)]
        public string Currency { get; set; } = "INR";
        
        [Required]
        [MaxLength(50)]
        public string PaymentMethod { get; set; } = string.Empty; // Cash, Bank Transfer, Card, UPI, etc.
        
        [MaxLength(100)]
        public string? ReferenceNumber { get; set; }
        
        [MaxLength(500)]
        public string? Notes { get; set; }
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "pending"; // pending, completed, failed, cancelled
        
        [Required]
        [MaxLength(100)]
        public string CreatedBy { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual PurchaseOrder PurchaseOrder { get; set; } = null!;
        public virtual Supplier Supplier { get; set; } = null!;
    }

    // ===== PURCHASE ORDER ENUMS =====
    public enum PurchaseOrderStatus
    {
        Draft,           // Initial state - order being created
        Pending,         // Order created, waiting for approval
        Approved,        // Order approved, ready to send
        Sent,           // Order sent to supplier
        Confirmed,      // Supplier confirmed receipt
        InTransit,      // Goods in transit
        PartiallyReceived, // Some items received
        Received,       // All items received
        PartiallyPaid,  // Partial payment made
        Paid,           // Full payment completed
        Cancelled,      // Order cancelled
        OnHold,         // Order temporarily on hold
        Disputed        // Order has disputes/issues
    }

    public enum PurchaseOrderItemStatus
    {
        Pending,
        PartiallyReceived,
        FullyReceived,
        Cancelled
    }

    // ===== PURCHASE ORDER JOURNEY TRACKING =====
    public class PurchaseOrderJourney
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public string PurchaseOrderId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string FromStatus { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string ToStatus { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Notes { get; set; }
        
        [MaxLength(100)]
        public string? ActionBy { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation property
        public virtual PurchaseOrder PurchaseOrder { get; set; } = null!;
    }

    // ===== ACCOUNTING SYSTEM MODELS =====
    public class AccountGroup
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty; // Assets, Liabilities, Expenses, Income
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual ICollection<Ledger> Ledgers { get; set; } = new List<Ledger>();
    }

    public class Ledger
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        public string GroupId { get; set; } = string.Empty;
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal OpeningBalance { get; set; } = 0;
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        [Required]
        [MaxLength(100)]
        public string CreatedBy { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual AccountGroup Group { get; set; } = null!;
        public virtual ICollection<TransactionEntry> TransactionEntries { get; set; } = new List<TransactionEntry>();
    }

    public class Transaction
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty; // Payment, Purchase, Journal, Sales, etc.
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string CreatedBy { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "draft"; // draft, posted, cancelled
        
        [MaxLength(1000)]
        public string? Notes { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual ICollection<TransactionEntry> Entries { get; set; } = new List<TransactionEntry>();
    }

    public class TransactionEntry
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        public string TransactionId { get; set; } = string.Empty;
        
        [Required]
        public string LedgerId { get; set; } = string.Empty;
        
        [Required]
        public bool IsDebit { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(20,2)")]
        public decimal Amount { get; set; }
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual Transaction Transaction { get; set; } = null!;
        public virtual Ledger Ledger { get; set; } = null!;
    }

    // ===== ACCOUNTING ENUMS =====
    public enum AccountGroupType
    {
        Assets,
        Liabilities,
        Equity,
        Income,
        Expense
    }

    public enum TransactionType
    {
        Payment,
        Purchase,
        Journal,
        Sales,
        Receipt,
        Contra,
        CreditNote,
        DebitNote
    }

    public enum TransactionStatus
    {
        Draft,
        Posted,
        Cancelled
    }

    // ===== PAYMENT MODE MODELS =====
    public class PaymentMode
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string DisplayName { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public int SortOrder { get; set; } = 0;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // ===== EXPENSE TAG MODELS =====
    public class ExpenseTag
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string DisplayName { get; set; } = string.Empty;
        
        [MaxLength(20)]
        public string? Color { get; set; } // For UI display
        
        [MaxLength(500)]
        public string? Description { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public int SortOrder { get; set; } = 0;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
} 