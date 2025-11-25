using System.ComponentModel.DataAnnotations;

namespace Mlt.Admin.Api.Models.DTOs
{
    // ===== SALES & REVENUE DTOs =====
    public class SalesSummaryDto
    {
        public decimal TotalRevenue { get; set; }
        public int TotalOrders { get; set; }
        public decimal AverageOrderValue { get; set; }
        public string Period { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Currency { get; set; } = "INR";
    }

    public class RevenueBreakdownDto
    {
        public DateTime Date { get; set; }
        public decimal Revenue { get; set; }
        public int Orders { get; set; }
        public decimal AverageOrderValue { get; set; }
    }

    public class ProductPerformanceDto
    {
        public string ProductId { get; set; } = string.Empty;
        public string ProductTitle { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public decimal TotalRevenue { get; set; }
        public int TotalSold { get; set; }
        public decimal AveragePrice { get; set; }
        public decimal CostPrice { get; set; }
        public decimal GrossMargin { get; set; }
        public decimal GrossMarginPercentage { get; set; }
        public decimal Profit { get; set; }
    }

    public class SalesFilterDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public List<string>? ProductIds { get; set; }
        public List<string>? LocationIds { get; set; }
        public string? Currency { get; set; }
    }

    // ===== EXPENSE DTOs =====
    public class ExpenseDto
    {
        public string Id { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";
        public DateTime Date { get; set; }
        public string PaymentMode { get; set; } = string.Empty;
        public string PaidTo { get; set; } = string.Empty;
        public string? ChartOfAccountCode { get; set; }
        public string? ChartOfAccountName { get; set; }
        public List<string> Tags { get; set; } = new();
        public string? ReceiptUrl { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public string Status { get; set; } = "pending";
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateExpenseDto
    {
        [Required]
        public string Type { get; set; } = string.Empty;
        
        [Required]
        public string Category { get; set; } = string.Empty;
        
        [Required]
        public string Description { get; set; } = string.Empty;
        
        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal Amount { get; set; }
        
        public string Currency { get; set; } = "INR";
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        public string PaymentMode { get; set; } = string.Empty;
        
        [Required]
        public string PaidTo { get; set; } = string.Empty;
        
        public string? ChartOfAccountCode { get; set; }
        
        public string? ChartOfAccountName { get; set; }
        
        public List<string> Tags { get; set; } = new();
        
        public string? ReceiptUrl { get; set; }
        
        public string? Notes { get; set; }

        [Required]
        public string CreatedBy { get; set; } = string.Empty;
    }

    public class UpdateExpenseDto
    {
        public string? Type { get; set; }
        public string? Category { get; set; }
        public string? Description { get; set; }
        
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal? Amount { get; set; }
        
        public string? Currency { get; set; }
        public DateTime? Date { get; set; }
        public string? PaymentMode { get; set; }
        public string? PaidTo { get; set; }
        public string? ChartOfAccountCode { get; set; }
        public string? ChartOfAccountName { get; set; }
        public List<string>? Tags { get; set; }
        public string? ReceiptUrl { get; set; }
        public string? Notes { get; set; }
        public string? Status { get; set; }
    }

    public class ExpenseFilterDto
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public List<string>? Types { get; set; }
        public List<string>? Categories { get; set; }
        public List<string>? Tags { get; set; }
        public string? Status { get; set; }
        public decimal? MinAmount { get; set; }
        public decimal? MaxAmount { get; set; }
        public string? Search { get; set; }
    }

    public class ExpenseCategoryDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateExpenseCategoryDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        public string Type { get; set; } = string.Empty;
        
        public string? Description { get; set; }
    }

    // ===== CHART OF ACCOUNTS DTOs =====
    public class ChartOfAccountDto
    {
        public string Id { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ParentCode { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateChartOfAccountDto
    {
        [Required]
        public string Code { get; set; } = string.Empty;
        
        [Required]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        public string Type { get; set; } = string.Empty;
        
        public string? Description { get; set; }
        
        public string? ParentCode { get; set; }
    }

    public class UpdateChartOfAccountDto
    {
        public string? Name { get; set; }
        public string? Type { get; set; }
        public string? Description { get; set; }
        public string? ParentCode { get; set; }
        public bool? IsActive { get; set; }
    }

    // ===== PRODUCT COST DTOs =====
    public class ProductCostDto
    {
        public string Id { get; set; } = string.Empty;
        public string ProductId { get; set; } = string.Empty;
        public string VariantId { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public decimal CostPrice { get; set; }
        public string Currency { get; set; } = "INR";
        public string? Supplier { get; set; }
        public string? Notes { get; set; }
        public string LastUpdatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateProductCostDto
    {
        [Required]
        public string ProductId { get; set; } = string.Empty;

        [Required]
        public string VariantId { get; set; } = string.Empty;

        [Required]
        public string Sku { get; set; } = string.Empty;

        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Cost price must be non-negative")]
        public decimal CostPrice { get; set; }

        [Required]
        public string Currency { get; set; } = "INR";

        public string? Supplier { get; set; }
        public string? Notes { get; set; }

        [Required]
        public string LastUpdatedBy { get; set; } = string.Empty;
    }

    public class UpdateProductCostDto
    {
        public decimal? CostPrice { get; set; }
        public string? Currency { get; set; }
        public string? Supplier { get; set; }
        public string? Notes { get; set; }

        [Required]
        public string LastUpdatedBy { get; set; } = string.Empty;
    }

    public class BulkUpdateProductCostsDto
    {
        [Required]
        public List<UpdateProductCostDto> Updates { get; set; } = new();
    }

    // ===== PROFIT & LOSS DTOs =====
    public class ProfitLossSummaryDto
    {
        public string Period { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Currency { get; set; } = "INR";
        
        // Revenue
        public decimal TotalRevenue { get; set; }
        public int TotalOrders { get; set; }
        public decimal AverageOrderValue { get; set; }
        
        // Costs
        public decimal TotalCostOfGoods { get; set; }
        public decimal TotalExpenses { get; set; }
        
        // Profit
        public decimal GrossProfit { get; set; }
        public decimal GrossMargin { get; set; }
        public decimal NetProfit { get; set; }
        public decimal NetMargin { get; set; }
        
        // Breakdown
        public List<RevenueBreakdownDto> RevenueBreakdown { get; set; } = new();
        public List<ExpenseBreakdownDto> ExpenseBreakdown { get; set; } = new();
        public List<ProductPerformanceDto> ProductPerformance { get; set; } = new();
    }

    public class ExpenseBreakdownDto
    {
        public string Category { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal Percentage { get; set; }
        public int Count { get; set; }
    }

    public class ProfitLossComparisonDto
    {
        public ProfitLossSummaryDto CurrentPeriod { get; set; } = new();
        public ProfitLossSummaryDto PreviousPeriod { get; set; } = new();
        public ProfitLossChangesDto Changes { get; set; } = new();
    }

    public class ProfitLossChangesDto
    {
        public decimal RevenueChange { get; set; }
        public decimal RevenueChangePercentage { get; set; }
        public decimal ProfitChange { get; set; }
        public decimal ProfitChangePercentage { get; set; }
        public decimal MarginChange { get; set; }
    }

    // ===== PAYOUT DTOs =====
    public class PayoutDto
    {
        public string Id { get; set; } = string.Empty;
        public string PayoutId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";
        public string Status { get; set; } = string.Empty;
        public DateTime ExpectedDate { get; set; }
        public DateTime? ActualDate { get; set; }
        public decimal Fees { get; set; }
        public decimal NetAmount { get; set; }
        public List<string> OrderIds { get; set; } = new();
        public PayoutPeriodDto Period { get; set; } = new();
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreatePayoutDto
    {
        [Required]
        public string PayoutId { get; set; } = string.Empty;

        [Required]
        public decimal Amount { get; set; }

        [Required]
        public string Currency { get; set; } = "INR";

        [Required]
        public string Status { get; set; } = string.Empty;

        public DateTime? ExpectedDate { get; set; }
        public DateTime? ActualDate { get; set; }
        public decimal? Fees { get; set; }
        public decimal? NetAmount { get; set; }
        public string? Notes { get; set; }
    }

    public class PayoutPeriodDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class PayoutReconciliationDto
    {
        public string PayoutId { get; set; } = string.Empty;
        public decimal ExpectedAmount { get; set; }
        public decimal ActualAmount { get; set; }
        public decimal Difference { get; set; }
        public int MatchedOrders { get; set; }
        public int UnmatchedOrders { get; set; }
        public decimal Fees { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class PayoutFilterDto
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? Status { get; set; }
        public decimal? MinAmount { get; set; }
        public decimal? MaxAmount { get; set; }
    }

    public class ReconcilePayoutDto
    {
        [Required]
        public decimal ActualAmount { get; set; }

        public DateTime? ActualDate { get; set; }

        public decimal? Fees { get; set; }

        public string? Notes { get; set; }
    }

    // ===== TAX DTOs =====
    public class TaxSummaryDto
    {
        public string Period { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public string? State { get; set; }
        public string TaxType { get; set; } = string.Empty;
        public decimal TotalTaxCollected { get; set; }
        public decimal TotalTaxableAmount { get; set; }
        public decimal TaxRate { get; set; }
        public string Currency { get; set; } = "INR";
        public int OrderCount { get; set; }
    }

    public class TaxReportDto
    {
        public string Period { get; set; } = string.Empty;
        public string Currency { get; set; } = "INR";
        public decimal TotalTaxCollected { get; set; }
        public decimal TotalTaxableAmount { get; set; }
        public List<TaxSummaryDto> Breakdown { get; set; } = new();
        public DateTime GeneratedAt { get; set; }
        public string GeneratedBy { get; set; } = string.Empty;
    }

    public class TaxFilterDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public List<string>? Countries { get; set; }
        public List<string>? States { get; set; }
        public List<string>? TaxTypes { get; set; }
    }

    // ===== DASHBOARD DTOs =====
    public class FinanceDashboardDto
    {
        public DashboardSummaryDto Summary { get; set; } = new();
        public DashboardChartsDto Charts { get; set; } = new();
        public List<ProductPerformanceDto> TopProducts { get; set; } = new();
        public List<ExpenseDto> RecentExpenses { get; set; } = new();
        public List<PayoutDto> UpcomingPayouts { get; set; } = new();
    }

    public class DashboardSummaryDto
    {
        public decimal TotalRevenue { get; set; }
        public decimal TotalExpenses { get; set; }
        public decimal NetProfit { get; set; }
        public decimal GrossMargin { get; set; }
        public decimal NetMargin { get; set; }
        public decimal AverageOrderValue { get; set; }
    }

    public class DashboardChartsDto
    {
        public List<RevenueBreakdownDto> RevenueChart { get; set; } = new();
        public List<ExpenseBreakdownDto> ExpenseChart { get; set; } = new();
        public List<ProfitChartDto> ProfitChart { get; set; } = new();
    }

    public class ProfitChartDto
    {
        public DateTime Date { get; set; }
        public decimal Revenue { get; set; }
        public decimal Expenses { get; set; }
        public decimal Profit { get; set; }
    }

    public class DashboardDataDto
    {
        public decimal TotalRevenue { get; set; }
        public int TotalOrders { get; set; }
        public decimal AverageOrderValue { get; set; }
        public decimal TotalProfit { get; set; }
        public decimal TotalCostOfGoods { get; set; }
        public decimal TotalExpenses { get; set; }
        public decimal ApprovedExpenses { get; set; }
        public decimal PendingExpenses { get; set; }
        public decimal Income { get; set; }
        public decimal Profit { get; set; }
        public decimal Loss { get; set; }
        public decimal GrossMargin { get; set; }
        public decimal NetMargin { get; set; }
        public List<SalesAnalytics> RecentAnalytics { get; set; } = new();
        public List<ExpenseDto> RecentExpenses { get; set; } = new();
        public List<ExpenseDto> ApprovedExpensesBreakdown { get; set; } = new();
        public PlatformBreakdownDto PlatformBreakdown { get; set; } = new();
    }

    public class PlatformBreakdownDto
    {
        public PlatformMetricsDto Shopify { get; set; } = new();
        public PlatformMetricsDto Amazon { get; set; } = new();
        public PlatformMetricsDto Flipkart { get; set; } = new();
    }

    public class PlatformMetricsDto
    {
        public decimal Revenue { get; set; }
        public int Orders { get; set; }
        public decimal Profit { get; set; }
    }

    // ===== REPORT DTOs =====
    public class ReportRequestDto
    {
        [Required]
        public string Type { get; set; } = string.Empty;
        
        [Required]
        public string Format { get; set; } = string.Empty;
        
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? Currency { get; set; }
        public string? Parameters { get; set; }
        
        [Required]
        public string GeneratedBy { get; set; } = string.Empty;
    }

    public class CustomPeriodDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class ReportResponseDto
    {
        public string DownloadUrl { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public DateTime GeneratedAt { get; set; }
        public int RecordCount { get; set; }
    }

    // ===== API RESPONSE DTOs =====
    public class FinanceApiResponseDto<T>
    {
        public bool Success { get; set; }
        public T? Data { get; set; }
        public string? Error { get; set; }
        public string? Message { get; set; }
    }

    public class PaginatedFinanceResponseDto<T>
    {
        public List<T> Data { get; set; } = new();
        public PaginationDto Pagination { get; set; } = new();
    }

    public class PaginationDto
    {
        public int Page { get; set; }
        public int Limit { get; set; }
        public int Total { get; set; }
        public int TotalPages { get; set; }
    }

    // ===== INVENTORY ASSET DTOs =====
    public class InventoryAssetDto
    {
        public string Id { get; set; } = string.Empty;
        public Guid ProductId { get; set; }
        public Guid VariantId { get; set; }
        public string Sku { get; set; } = string.Empty;
        public string ProductTitle { get; set; } = string.Empty;
        public string VariantTitle { get; set; } = string.Empty;
        public decimal CostPerItem { get; set; }
        public decimal SellingPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public int Quantity { get; set; }
        public decimal TotalValue { get; set; }
        public string Currency { get; set; } = "INR";
        public string? Supplier { get; set; }
        public string? Notes { get; set; }
        public string LedgerId { get; set; } = string.Empty;
        public string LedgerName { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateInventoryAssetDto
    {
        [Required]
        public Guid ProductId { get; set; }

        [Required]
        public Guid VariantId { get; set; }

        [Required]
        public string Sku { get; set; } = string.Empty;

        [Required]
        public string ProductTitle { get; set; } = string.Empty;

        [Required]
        public string VariantTitle { get; set; } = string.Empty;

        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Cost per item must be non-negative")]
        public decimal CostPerItem { get; set; }

        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Selling price must be non-negative")]
        public decimal SellingPrice { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Max price must be non-negative")]
        public decimal? MaxPrice { get; set; }

        [Required]
        [Range(0, int.MaxValue, ErrorMessage = "Quantity must be non-negative")]
        public int Quantity { get; set; }

        [Required]
        public string Currency { get; set; } = "INR";

        public string? Supplier { get; set; }
        public string? Notes { get; set; }

        [Required]
        public string LedgerId { get; set; } = string.Empty;

        [Required]
        public string CreatedBy { get; set; } = string.Empty;
    }

    public class UpdateInventoryAssetDto
    {
        public decimal? CostPerItem { get; set; }
        public decimal? SellingPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public int? Quantity { get; set; }
        public string? Currency { get; set; }
        public string? Supplier { get; set; }
        public string? Notes { get; set; }
        public string? LedgerId { get; set; }

        [Required]
        public string UpdatedBy { get; set; } = string.Empty;
    }

    public class InventoryAssetSummaryDto
    {
        public int TotalItems { get; set; }
        public decimal TotalValue { get; set; }
        public decimal AverageCostPerItem { get; set; }
        public decimal AverageSellingPrice { get; set; }
        public string Currency { get; set; } = "INR";
    }

    public class SyncInventoryRequestDto
    {
        [Required]
        public string CreatedBy { get; set; } = string.Empty;
    }

    // ===== PURCHASE ORDER DTOs =====
    public class SupplierDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? ContactPerson { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? TaxId { get; set; }
        public string? PaymentTerms { get; set; }
        public string? Notes { get; set; }
        public bool IsActive { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateSupplierDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? ContactPerson { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? TaxId { get; set; }
        public string? PaymentTerms { get; set; }
        public string? Notes { get; set; }
        
        [Required]
        public string CreatedBy { get; set; } = string.Empty;
    }

    public class UpdateSupplierDto
    {
        public string? Name { get; set; }
        public string? Address { get; set; }
        public string? ContactPerson { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? TaxId { get; set; }
        public string? PaymentTerms { get; set; }
        public string? Notes { get; set; }
        public bool? IsActive { get; set; }
    }

    public class PurchaseOrderDto
    {
        public string Id { get; set; } = string.Empty;
        public string PoNumber { get; set; } = string.Empty;
        public string SupplierId { get; set; } = string.Empty;
        public SupplierDto Supplier { get; set; } = new();
        public DateTime PurchaseDate { get; set; }
        public string? ReferenceNumber { get; set; }
        public string? BillNumber { get; set; }
        public DateTime? BillDate { get; set; }
        public DateTime? ExpectedDeliveryDate { get; set; }
        public string? Notes { get; set; }
        public decimal Subtotal { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal GstAmount { get; set; }
        public decimal GstRate { get; set; }
        public decimal ShippingCost { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal BalanceDue { get; set; }
        public string Currency { get; set; } = "INR";
        public string Status { get; set; } = "draft";
        public string? InvoiceUrl { get; set; }
        public bool IsReceived { get; set; }
        public DateTime? ReceivedDate { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        // Enhanced workflow fields
        public DateTime? SentDate { get; set; }
        public DateTime? ConfirmedDate { get; set; }
        public DateTime? InTransitDate { get; set; }
        public DateTime? OnHoldDate { get; set; }
        public DateTime? DisputedDate { get; set; }
        public string? SentBy { get; set; }
        public string? ConfirmedBy { get; set; }
        public string? OnHoldBy { get; set; }
        public string? DisputedBy { get; set; }
        public string? OnHoldReason { get; set; }
        public string? DisputeReason { get; set; }
        
        public List<PurchaseOrderItemDto> Items { get; set; } = new();
        public List<SupplierPaymentDto> Payments { get; set; } = new();
        public List<PurchaseOrderJourneyDto> Journey { get; set; } = new();
    }

    public class CreatePurchaseOrderDto
    {
        [Required]
        public string SupplierId { get; set; } = string.Empty;
        
        [Required]
        public DateTime PurchaseDate { get; set; }
        
        public string? ReferenceNumber { get; set; }
        public string? BillNumber { get; set; }
        public DateTime? BillDate { get; set; }
        public DateTime? ExpectedDeliveryDate { get; set; }
        public string? Notes { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal TaxAmount { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal GstAmount { get; set; }
        
        [Range(0, 100)]
        public decimal GstRate { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal ShippingCost { get; set; }
        
        [Required]
        public string Currency { get; set; } = "INR";
        
        [Required]
        public List<CreatePurchaseOrderItemDto> Items { get; set; } = new();
        
        [Required]
        public string CreatedBy { get; set; } = string.Empty;
    }

    public class UpdatePurchaseOrderDto
    {
        public string? SupplierId { get; set; }
        public DateTime? PurchaseDate { get; set; }
        public string? ReferenceNumber { get; set; }
        public string? BillNumber { get; set; }
        public DateTime? BillDate { get; set; }
        public DateTime? ExpectedDeliveryDate { get; set; }
        public string? Notes { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal? TaxAmount { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal? GstAmount { get; set; }
        
        [Range(0, 100)]
        public decimal? GstRate { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal? ShippingCost { get; set; }
        
        public string? Currency { get; set; }
        public string? Status { get; set; }
        public string? InvoiceUrl { get; set; }
        public bool? IsReceived { get; set; }
        public DateTime? ReceivedDate { get; set; }
        
        // Enhanced workflow fields
        public DateTime? SentDate { get; set; }
        public DateTime? ConfirmedDate { get; set; }
        public DateTime? InTransitDate { get; set; }
        public DateTime? OnHoldDate { get; set; }
        public DateTime? DisputedDate { get; set; }
        public string? SentBy { get; set; }
        public string? ConfirmedBy { get; set; }
        public string? OnHoldBy { get; set; }
        public string? DisputedBy { get; set; }
        public string? OnHoldReason { get; set; }
        public string? DisputeReason { get; set; }
    }

    public class PurchaseOrderItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string PurchaseOrderId { get; set; } = string.Empty;
        public string ProductId { get; set; } = string.Empty;
        public string VariantId { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public string? VariantTitle { get; set; }
        public int Quantity { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal TotalPrice { get; set; }
        public decimal GstAmount { get; set; }
        public decimal GstRate { get; set; }
        public int QuantityReceived { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreatePurchaseOrderItemDto
    {
        [Required]
        public string ProductId { get; set; } = string.Empty;
        
        [Required]
        public string VariantId { get; set; } = string.Empty;
        
        [Required]
        public string Sku { get; set; } = string.Empty;
        
        [Required]
        public string ProductName { get; set; } = string.Empty;
        
        public string? VariantTitle { get; set; }
        
        [Required]
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        public decimal PurchasePrice { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal GstAmount { get; set; }
        
        [Range(0, 100)]
        public decimal GstRate { get; set; }
        
        public string? Notes { get; set; }
    }

    public class UpdatePurchaseOrderItemDto
    {
        public int? Quantity { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal? PurchasePrice { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal? GstAmount { get; set; }
        
        [Range(0, 100)]
        public decimal? GstRate { get; set; }
        
        public string? Notes { get; set; }
        
        [Range(0, int.MaxValue)]
        public int? QuantityReceived { get; set; }
    }

    public class PurchaseOrderFilterDto
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? SupplierId { get; set; }
        public string? Status { get; set; }
        public string? Search { get; set; }
        public decimal? MinAmount { get; set; }
        public decimal? MaxAmount { get; set; }
        public bool? IsReceived { get; set; }
    }

    public class PurchaseOrderSummaryDto
    {
        public int TotalOrders { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal AverageOrderValue { get; set; }
        public int PendingOrders { get; set; }
        public int ReceivedOrders { get; set; }
        public int CancelledOrders { get; set; }
        public string Currency { get; set; } = "INR";
    }

    public class ReceivePurchaseOrderDto
    {
        [Required]
        public List<ReceivePurchaseOrderItemDto> Items { get; set; } = new();
        
        public DateTime? ReceivedDate { get; set; }
        
        [MaxLength(1000)]
        public string? Notes { get; set; }
    }

    public class ReceivePurchaseOrderItemDto
    {
        [Required]
        public string ItemId { get; set; } = string.Empty;
        
        [Required]
        [Range(0, int.MaxValue)]
        public int QuantityReceived { get; set; }
        
        [MaxLength(500)]
        public string? Notes { get; set; }
    }

    // ===== SUPPLIER PAYMENT DTOs =====
    public class SupplierPaymentDto
    {
        public string Id { get; set; } = string.Empty;
        public string PurchaseOrderId { get; set; } = string.Empty;
        public string SupplierId { get; set; } = string.Empty;
        public string PaymentNumber { get; set; } = string.Empty;
        public DateTime PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";
        public string PaymentMethod { get; set; } = string.Empty;
        public string? ReferenceNumber { get; set; }
        public string? Notes { get; set; }
        public string Status { get; set; } = "pending";
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateSupplierPaymentDto
    {
        [Required]
        public string PurchaseOrderId { get; set; } = string.Empty;
        
        [Required]
        public string SupplierId { get; set; } = string.Empty;
        
        [Required]
        public DateTime PaymentDate { get; set; }
        
        [Required]
        [Range(0.01, double.MaxValue)]
        public decimal Amount { get; set; }
        
        [Required]
        public string Currency { get; set; } = "INR";
        
        [Required]
        public string PaymentMethod { get; set; } = string.Empty;
        
        public string? ReferenceNumber { get; set; }
        public string? Notes { get; set; }
        
        [Required]
        public string CreatedBy { get; set; } = string.Empty;
    }

    public class UpdateSupplierPaymentDto
    {
        public DateTime? PaymentDate { get; set; }
        
        [Range(0.01, double.MaxValue)]
        public decimal? Amount { get; set; }
        
        public string? Currency { get; set; }
        public string? PaymentMethod { get; set; }
        public string? ReferenceNumber { get; set; }
        public string? Notes { get; set; }
        public string? Status { get; set; }
    }

    // ===== PURCHASE ORDER JOURNEY DTOs =====
    public class PurchaseOrderJourneyDto
    {
        public string Id { get; set; } = string.Empty;
        public string PurchaseOrderId { get; set; } = string.Empty;
        public string FromStatus { get; set; } = string.Empty;
        public string ToStatus { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public string? ActionBy { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class UpdatePurchaseOrderStatusDto
    {
        [Required]
        public string NewStatus { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? Notes { get; set; }
        
        [MaxLength(100)]
        public string? ActionBy { get; set; }
    }

    public class PurchaseOrderStatusTransitionDto
    {
        public string CurrentStatus { get; set; } = string.Empty;
        public List<string> AvailableTransitions { get; set; } = new();
        public bool CanTransition { get; set; }
        public string? TransitionMessage { get; set; }
    }

    public class PurchaseOrderWorkflowDto
    {
        public string Id { get; set; } = string.Empty;
        public string PoNumber { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public List<PurchaseOrderJourneyDto> Journey { get; set; } = new();
        public PurchaseOrderStatusTransitionDto AvailableTransitions { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // ===== ACCOUNTING SYSTEM DTOs =====
    public class AccountGroupDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<LedgerDto> Ledgers { get; set; } = new();
    }

    public class CreateAccountGroupDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        public string Type { get; set; } = string.Empty;
        
        public string? Description { get; set; }
    }

    public class UpdateAccountGroupDto
    {
        public string? Name { get; set; }
        public string? Type { get; set; }
        public string? Description { get; set; }
        public bool? IsActive { get; set; }
    }

    public class LedgerDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string GroupId { get; set; } = string.Empty;
        public AccountGroupDto Group { get; set; } = new();
        public decimal OpeningBalance { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public decimal CurrentBalance { get; set; }
    }

    public class CreateLedgerDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        public string GroupId { get; set; } = string.Empty;
        
        public decimal OpeningBalance { get; set; } = 0;
        
        public string? Description { get; set; }
        
        [Required]
        public string CreatedBy { get; set; } = string.Empty;
    }

    public class UpdateLedgerDto
    {
        public string? Name { get; set; }
        public string? GroupId { get; set; }
        public decimal? OpeningBalance { get; set; }
        public string? Description { get; set; }
        public bool? IsActive { get; set; }
    }

    public class TransactionDto
    {
        public string Id { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<TransactionEntryDto> Entries { get; set; } = new();
        public decimal TotalDebit { get; set; }
        public decimal TotalCredit { get; set; }
        public bool IsBalanced { get; set; }
    }

    public class CreateTransactionDto
    {
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        public string Type { get; set; } = string.Empty;
        
        public string? Description { get; set; }
        
        [Required]
        public string CreatedBy { get; set; } = string.Empty;
        
        public string? Notes { get; set; }
        
        [Required]
        public List<TransactionEntryDto> Entries { get; set; } = new();
    }

    public class UpdateTransactionDto
    {
        public DateTime? Date { get; set; }
        public string? Type { get; set; }
        public string? Description { get; set; }
        public string? Notes { get; set; }
        public string? Status { get; set; }
        public List<TransactionEntryDto>? Entries { get; set; }
    }

    public class TransactionEntryDto
    {
        public string Id { get; set; } = string.Empty;
        public string TransactionId { get; set; } = string.Empty;
        public string LedgerId { get; set; } = string.Empty;
        public LedgerDto Ledger { get; set; } = new();
        public bool IsDebit { get; set; }
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class TransactionFilterDto
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public List<string>? Types { get; set; }
        public List<string>? Statuses { get; set; }
        public string? Search { get; set; }
        public string? CreatedBy { get; set; }
        public int Page { get; set; } = 1;
        public int Limit { get; set; } = 20;
    }

    public class LedgerFilterDto
    {
        public string? GroupId { get; set; }
        public List<string>? Types { get; set; }
        public bool? IsActive { get; set; }
        public string? Search { get; set; }
        public string? CreatedBy { get; set; }
        public int Page { get; set; } = 1;
        public int Limit { get; set; } = 20;
    }

    public class AccountGroupFilterDto
    {
        public List<string>? Types { get; set; }
        public bool? IsActive { get; set; }
        public string? Search { get; set; }
        public int Page { get; set; } = 1;
        public int Limit { get; set; } = 20;
    }

    public class TrialBalanceDto
    {
        public DateTime AsOfDate { get; set; }
        public List<TrialBalanceEntryDto> Entries { get; set; } = new();
        public decimal TotalDebit { get; set; }
        public decimal TotalCredit { get; set; }
        public bool IsBalanced { get; set; }
    }

    public class TrialBalanceEntryDto
    {
        public string LedgerId { get; set; } = string.Empty;
        public string LedgerName { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public string GroupType { get; set; } = string.Empty;
        public decimal OpeningBalance { get; set; }
        public decimal DebitTotal { get; set; }
        public decimal CreditTotal { get; set; }
        public decimal ClosingBalance { get; set; }
    }

    public class LedgerBalanceDto
    {
        public string LedgerId { get; set; } = string.Empty;
        public string LedgerName { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public decimal OpeningBalance { get; set; }
        public decimal DebitTotal { get; set; }
        public decimal CreditTotal { get; set; }
        public decimal CurrentBalance { get; set; }
        public List<TransactionEntryDto> RecentEntries { get; set; } = new();
    }

    // ===== ACCOUNTING REPORTS DTOs =====
    public class DayBookEntryDto
    {
        public string Id { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string LedgerName { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public bool IsDebit { get; set; }
        public decimal Amount { get; set; }
        public decimal RunningBalance { get; set; }
    }

    public class DayBookReportDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public List<DayBookEntryDto> Entries { get; set; } = new();
        public decimal TotalDebit { get; set; }
        public decimal TotalCredit { get; set; }
        public decimal OpeningBalance { get; set; }
        public decimal ClosingBalance { get; set; }
    }

    public class LedgerReportEntryDto
    {
        public string Id { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public decimal Balance { get; set; }
    }

    public class LedgerReportDto
    {
        public string LedgerId { get; set; } = string.Empty;
        public string LedgerName { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public decimal OpeningBalance { get; set; }
        public List<LedgerReportEntryDto> Entries { get; set; } = new();
        public decimal ClosingBalance { get; set; }
        public decimal TotalDebit { get; set; }
        public decimal TotalCredit { get; set; }
    }

    public class ProfitLossEntryDto
    {
        public string Category { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal Percentage { get; set; }
        public string Type { get; set; } = string.Empty; // "income" or "expense"
    }

    public class ProfitLossReportDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public List<ProfitLossEntryDto> Income { get; set; } = new();
        public List<ProfitLossEntryDto> Expenses { get; set; } = new();
        public decimal TotalIncome { get; set; }
        public decimal TotalExpenses { get; set; }
        public decimal NetProfit { get; set; }
        public decimal GrossMargin { get; set; }
    }

    public class BalanceSheetEntryDto
    {
        public string Category { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal Percentage { get; set; }
        public string Type { get; set; } = string.Empty; // "asset", "liability", or "equity"
    }

    public class BalanceSheetReportDto
    {
        public DateTime AsOfDate { get; set; }
        public List<BalanceSheetEntryDto> Assets { get; set; } = new();
        public List<BalanceSheetEntryDto> Liabilities { get; set; } = new();
        public List<BalanceSheetEntryDto> Equity { get; set; } = new();
        public decimal TotalAssets { get; set; }
        public decimal TotalLiabilities { get; set; }
        public decimal TotalEquity { get; set; }
        public bool IsBalanced { get; set; }
    }

    public class ExpenseReportEntryDto
    {
        public string Id { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string PaymentMode { get; set; } = string.Empty;
        public string PaidTo { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? ChartOfAccountName { get; set; }
        public string? Notes { get; set; }
        public List<string> Tags { get; set; } = new();
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ExpenseReportDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public List<ExpenseReportEntryDto> Entries { get; set; } = new();
        public decimal TotalAmount { get; set; }
        public int TotalExpenses { get; set; }
        public decimal AverageExpense { get; set; }
        public List<ExpenseBreakdownDto> BreakdownByType { get; set; } = new();
        public List<ExpenseBreakdownDto> BreakdownByStatus { get; set; } = new();
    }


} 