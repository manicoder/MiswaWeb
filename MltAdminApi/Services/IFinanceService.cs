using Mlt.Admin.Api.Models.DTOs;

namespace Mlt.Admin.Api.Services;

public interface IFinanceService
{
    // Dashboard & Analytics
    Task<object> GetDashboardDataAsync(DateTime? startDate = null, DateTime? endDate = null);
    Task<object> GetSalesAnalyticsAsync(DateTime? startDate = null, DateTime? endDate = null, string? currency = null);
    Task<object> GetProductAnalyticsAsync(DateTime? startDate = null, DateTime? endDate = null, string? currency = null);
    Task<object> GetTopSellingProductsAsync(DateTime? startDate = null, DateTime? endDate = null, string? currency = null, int limit = 20);

    // Sales Orders
    Task<object> GetSalesOrdersAsync(DateTime? startDate = null, DateTime? endDate = null, string? status = null, string? fulfillmentStatus = null, string? search = null, decimal? minAmount = null, decimal? maxAmount = null, string? currency = null, int page = 1, int limit = 20);
    Task<object?> GetSalesOrderAsync(string id);
    Task<object> GetSalesSummaryAsync(DateTime? startDate = null, DateTime? endDate = null, string? currency = null);

    // COGS Analytics
    Task<object> GetCOGSSummaryAsync(DateTime? startDate = null, DateTime? endDate = null, string? currency = null);
    Task<object> GetCOGSAnalyticsAsync(DateTime? startDate = null, DateTime? endDate = null, string? currency = null, string? platform = null);

    // Expenses
    Task<object> GetExpensesAsync(DateTime? startDate = null, DateTime? endDate = null, string? type = null, string? category = null);
    Task<object> GetExpensesPaginatedAsync(DateTime? startDate = null, DateTime? endDate = null, string? type = null, string? category = null, string? status = null, decimal? minAmount = null, decimal? maxAmount = null, string? search = null, int page = 1, int limit = 20);
    Task<object?> GetExpenseAsync(string id);
    Task<object> CreateExpenseAsync(CreateExpenseDto request);
    Task<object?> UpdateExpenseAsync(string id, UpdateExpenseDto request);
    Task<bool> DeleteExpenseAsync(string id);
    Task<object> GetExpenseCategoriesAsync();
    Task<object> GetPaymentModesAsync();
    Task<object> GetExpenseTagsAsync();

    // Chart of Accounts
    Task<object> GetChartOfAccountsAsync();
    Task<object?> GetChartOfAccountAsync(string code);
    Task<object> CreateChartOfAccountAsync(CreateChartOfAccountDto request);
    Task<object?> UpdateChartOfAccountAsync(string code, UpdateChartOfAccountDto request);
    Task<bool> DeleteChartOfAccountAsync(string code);

    // Product Costs
    Task<object> GetProductCostsAsync(string? productId = null, string? sku = null);
    Task<object?> GetProductCostAsync(int id);
    Task<object> CreateProductCostAsync(CreateProductCostDto request);
    Task<object?> UpdateProductCostAsync(int id, UpdateProductCostDto request);
    Task<bool> DeleteProductCostAsync(int id);

    // Inventory Assets
    Task<object> GetInventoryAssetsAsync(string? sku = null, string? supplier = null, string? ledgerId = null);
    Task<object?> GetInventoryAssetAsync(string id);
    Task<object> CreateInventoryAssetAsync(CreateInventoryAssetDto request);
    Task<object?> UpdateInventoryAssetAsync(string id, UpdateInventoryAssetDto request);
    Task<bool> DeleteInventoryAssetAsync(string id);
    Task<object> GetInventoryAssetSummaryAsync();
    Task<object> SyncInventoryFromProductsAsync(string createdBy);
    Task<object> CalculateInventoryValueAsync();
    Task<object> GetRealTimeInventoryCalculationAsync();

    // Payouts
    Task<object> GetPayoutsAsync(DateTime? startDate = null, DateTime? endDate = null, string? status = null);
    Task<object?> GetPayoutAsync(int id);
    Task<object> CreatePayoutAsync(CreatePayoutDto request);
    Task<object> ReconcilePayoutAsync(int id, ReconcilePayoutDto request);

    // Tax Records
    Task<object> GetTaxRecordsAsync(DateTime? startDate = null, DateTime? endDate = null, string? country = null, string? taxType = null);

    // Reports
    Task<object> GetReportsAsync(string? type = null, string? format = null);
    Task<object> GenerateReportAsync(ReportRequestDto request);
    Task<object?> GetReportAsync(int id);
    Task<byte[]> DownloadReportAsync(int id);

    // Suppliers
    Task<object> GetSuppliersAsync(string? search = null, bool? isActive = null);
    Task<object?> GetSupplierAsync(string id);
    Task<object> CreateSupplierAsync(CreateSupplierDto request);
    Task<object?> UpdateSupplierAsync(string id, UpdateSupplierDto request);
    Task<bool> DeleteSupplierAsync(string id);

    // Purchase Orders
    Task<object> GetPurchaseOrdersAsync(DateTime? startDate = null, DateTime? endDate = null, string? supplierId = null, string? status = null, string? search = null, decimal? minAmount = null, decimal? maxAmount = null, bool? isReceived = null, int page = 1, int limit = 20);
    Task<object?> GetPurchaseOrderAsync(string id);
    Task<object> CreatePurchaseOrderAsync(CreatePurchaseOrderDto request);
    Task<object?> UpdatePurchaseOrderAsync(string id, UpdatePurchaseOrderDto request);
    Task<bool> DeletePurchaseOrderAsync(string id);
    Task<object> ReceivePurchaseOrderAsync(string id, ReceivePurchaseOrderDto request);
    Task<object> GetPurchaseOrderSummaryAsync(DateTime? startDate = null, DateTime? endDate = null);

    // Purchase Order Journey Workflow
    Task<PurchaseOrderWorkflowDto> GetPurchaseOrderWorkflowAsync(string id);
    Task<PurchaseOrderDto> UpdatePurchaseOrderStatusAsync(string id, UpdatePurchaseOrderStatusDto request);
    Task<PurchaseOrderStatusTransitionDto> GetAvailableStatusTransitionsAsync(string id);
    Task<List<PurchaseOrderJourneyDto>> GetPurchaseOrderJourneyAsync(string id);

    // Supplier Payments
    Task<object> GetSupplierPaymentsAsync(string? purchaseOrderId = null, string? supplierId = null, string? status = null, DateTime? startDate = null, DateTime? endDate = null, int page = 1, int limit = 20);
    Task<object?> GetSupplierPaymentAsync(string id);
    Task<object> CreateSupplierPaymentAsync(CreateSupplierPaymentDto request);
    Task<object?> UpdateSupplierPaymentAsync(string id, UpdateSupplierPaymentDto request);
    Task<bool> DeleteSupplierPaymentAsync(string id);

    // Accounting System
    Task<object> GetAccountGroupsAsync(AccountGroupFilterDto? filter = null);
    Task<object?> GetAccountGroupAsync(string id);
    Task<object> CreateAccountGroupAsync(CreateAccountGroupDto request);
    Task<object?> UpdateAccountGroupAsync(string id, UpdateAccountGroupDto request);
    Task<bool> DeleteAccountGroupAsync(string id);

    Task<object> GetLedgersAsync(LedgerFilterDto? filter = null);
    Task<object?> GetLedgerAsync(string id);
    Task<object> CreateLedgerAsync(CreateLedgerDto request);
    Task<object?> UpdateLedgerAsync(string id, UpdateLedgerDto request);
    Task<bool> DeleteLedgerAsync(string id);

    Task<object> GetTransactionsAsync(TransactionFilterDto? filter = null);
    Task<object?> GetTransactionAsync(string id);
    Task<object> CreateTransactionAsync(CreateTransactionDto request);
    Task<object?> UpdateTransactionAsync(string id, UpdateTransactionDto request);
    Task<bool> DeleteTransactionAsync(string id);
    Task<bool> ApproveTransactionAsync(string id);
    Task<bool> RejectTransactionAsync(string id);

    Task<object> GetTrialBalanceAsync(DateTime asOfDate);
    Task<object> GetLedgerBalanceAsync(string ledgerId);
    
    // Accounting Reports
    Task<object> GetDayBookReportAsync(DateTime startDate, DateTime endDate, string? type = null, string? ledgerId = null);
    Task<object> GetLedgerReportAsync(string ledgerId, DateTime? startDate = null, DateTime? endDate = null);
    Task<object> GetProfitLossReportAsync(DateTime startDate, DateTime endDate);
    Task<object> GetBalanceSheetReportAsync(DateTime asOfDate);
    Task<object> GetExpensesReportAsync(DateTime startDate, DateTime endDate, string? type = null, string? status = null, string? paymentMode = null);
} 