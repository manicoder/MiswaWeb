using Microsoft.EntityFrameworkCore;
using Mlt.Admin.Api.Data;
using Mlt.Admin.Api.Models;
using Mlt.Admin.Api.Models.DTOs;
using Mlt.Admin.Api.Services;
using Mlt.Admin.Api.Core.Entities;
using System;
using System.Collections.Generic;
using Npgsql;

namespace Mlt.Admin.Api.Services;

public class FinanceService : IFinanceService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<FinanceService> _logger;

    public FinanceService(ApplicationDbContext context, ILogger<FinanceService> logger)
    {
        _context = context;
        _logger = logger;
    }

    #region Dashboard & Analytics

    // Shared analytics result type
    private class ShopifyAnalyticsResult
    {
        public decimal TotalRevenue { get; set; }
        public int TotalOrders { get; set; }
        public decimal AverageOrderValue { get; set; }
        public decimal TotalCostOfGoods { get; set; }
        public decimal TotalProfit { get; set; }
        public decimal GrossMargin { get; set; }
        public List<ShopifyOrder> Orders { get; set; } = new();
    }

    // Shared analytics logic for Shopify
    private async Task<ShopifyAnalyticsResult> CalculateShopifyAnalyticsAsync(DateTime? startDate = null, DateTime? endDate = null, string? currency = null)
    {
        var shopifyOrdersQuery = _context.ShopifyOrders.AsQueryable();
        
        // Apply date filters
        if (startDate.HasValue)
            shopifyOrdersQuery = shopifyOrdersQuery.Where(o => o.CreatedAt >= startDate.Value);
        if (endDate.HasValue)
            shopifyOrdersQuery = shopifyOrdersQuery.Where(o => o.CreatedAt <= endDate.Value);
        if (!string.IsNullOrEmpty(currency))
            shopifyOrdersQuery = shopifyOrdersQuery.Where(o => o.Currency == currency);
            
        // Filter for fulfilled orders only and exclude cancelled/voided/refunded orders
        shopifyOrdersQuery = shopifyOrdersQuery.Where(o => 
            o.FulfillmentStatus.ToLower() == "fulfilled" && 
            o.DisplayFinancialStatus.ToLower() != "cancelled" && 
            o.DisplayFinancialStatus.ToLower() != "voided" &&
            o.DisplayFinancialStatus.ToLower() != "refunded");
            
        var shopifyOrders = await shopifyOrdersQuery.ToListAsync();
        var totalRevenue = shopifyOrders.Sum(o => o.TotalPrice);
        var totalOrders = shopifyOrders.Count;
        var averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        decimal totalCostOfGoods = 0;
        decimal totalProfit = 0;
        foreach (var order in shopifyOrders)
        {
            var orderCost = await CalculateOrderCostAsync(order);
            totalCostOfGoods += orderCost;
            totalProfit += order.TotalPrice - orderCost;
        }
        var grossMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        return new ShopifyAnalyticsResult
        {
            TotalRevenue = totalRevenue,
            TotalOrders = totalOrders,
            AverageOrderValue = averageOrderValue,
            TotalCostOfGoods = totalCostOfGoods,
            TotalProfit = totalProfit,
            GrossMargin = grossMargin,
            Orders = shopifyOrders
        };
    }

    public async Task<object> GetDashboardDataAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        try
        {
            _logger.LogInformation("Getting dashboard data with startDate: {StartDate}, endDate: {EndDate}", startDate, endDate);
            
            // Use optimized stored procedure for dashboard summary
            DashboardSummaryResult dashboardSummary;
            
            if (startDate.HasValue && endDate.HasValue)
            {
                dashboardSummary = await _context.Database
                    .SqlQuery<DashboardSummaryResult>($@"
                        SELECT * FROM GetFinanceDashboardSummary(
                            {startDate.Value},
                            {endDate.Value},
                            NULL::VARCHAR(10)
                        )")
                    .FirstOrDefaultAsync();
            }
            else if (startDate.HasValue)
            {
                dashboardSummary = await _context.Database
                    .SqlQuery<DashboardSummaryResult>($@"
                        SELECT * FROM GetFinanceDashboardSummary(
                            {startDate.Value},
                            NULL::TIMESTAMP WITH TIME ZONE,
                            NULL::VARCHAR(10)
                        )")
                    .FirstOrDefaultAsync();
            }
            else if (endDate.HasValue)
            {
                dashboardSummary = await _context.Database
                    .SqlQuery<DashboardSummaryResult>($@"
                        SELECT * FROM GetFinanceDashboardSummary(
                            NULL::TIMESTAMP WITH TIME ZONE,
                            {endDate.Value},
                            NULL::VARCHAR(10)
                        )")
                    .FirstOrDefaultAsync();
            }
            else
            {
                dashboardSummary = await _context.Database
                    .SqlQuery<DashboardSummaryResult>($@"
                        SELECT * FROM GetFinanceDashboardSummary(
                            NULL::TIMESTAMP WITH TIME ZONE,
                            NULL::TIMESTAMP WITH TIME ZONE,
                            NULL::VARCHAR(10)
                        )")
                    .FirstOrDefaultAsync();
            }

            if (dashboardSummary == null)
            {
                dashboardSummary = new DashboardSummaryResult();
            }

            // Get recent analytics using direct query
            var recentAnalytics = await _context.SalesAnalytics
                .OrderByDescending(s => s.Date)
                .Take(10)
                .ToListAsync();

            // Get recent expenses using direct query
            var recentExpenses = await _context.Expenses
                .OrderByDescending(e => e.Date)
                .Take(5)
                .ToListAsync();

            // Get approved expenses breakdown using direct query
            var approvedExpensesBreakdown = await _context.Expenses
                .Where(e => e.Status == "approved")
                .Where(e => startDate == null || e.Date >= startDate.Value)
                .Where(e => endDate == null || e.Date <= endDate.Value)
                .OrderByDescending(e => e.Date)
                .ToListAsync();

            // Get platform breakdown using stored procedure (Shopify only)
            var platformBreakdown = await _context.Database
                .SqlQuery<PlatformBreakdownResult>($@"
                    SELECT 
                        'Shopify' as platform,
                        COALESCE(SUM(so.""TotalPrice""), 0) as revenue,
                        COUNT(*) as orders,
                        COALESCE(SUM(so.""TotalPrice""), 0) as profit
                    FROM ""ShopifyOrders"" so
                    WHERE so.""FulfillmentStatus"" ILIKE 'fulfilled'
                        AND so.""DisplayFinancialStatus"" NOT IN ('cancelled', 'voided', 'refunded')")
                .ToListAsync();

            // Build platform breakdown DTO
            var platformBreakdownDto = new PlatformBreakdownDto();
            foreach (var platform in platformBreakdown)
            {
                var metrics = new PlatformMetricsDto
                {
                    Revenue = platform.Revenue,
                    Orders = platform.Orders,
                    Profit = platform.Profit
                };

                switch (platform.Platform.ToLower())
                {
                    case "shopify":
                        platformBreakdownDto.Shopify = metrics;
                        break;
                    case "amazon":
                        platformBreakdownDto.Amazon = metrics;
                        break;
                    case "flipkart":
                        platformBreakdownDto.Flipkart = metrics;
                        break;
                }
            }

            var result = new DashboardDataDto
            {
                TotalRevenue = dashboardSummary.TotalRevenue,
                TotalOrders = dashboardSummary.TotalOrders,
                AverageOrderValue = dashboardSummary.AverageOrderValue,
                TotalProfit = dashboardSummary.TotalProfit,
                TotalCostOfGoods = dashboardSummary.TotalCostOfGoods,
                TotalExpenses = dashboardSummary.TotalExpenses,
                ApprovedExpenses = dashboardSummary.ApprovedExpenses,
                PendingExpenses = dashboardSummary.PendingExpenses,
                Income = dashboardSummary.Income,
                Profit = dashboardSummary.Profit,
                Loss = dashboardSummary.Loss,
                GrossMargin = dashboardSummary.GrossMargin,
                NetMargin = dashboardSummary.NetMargin,
                RecentAnalytics = recentAnalytics,
                RecentExpenses = recentExpenses.Select(e => new ExpenseDto
                {
                    Id = e.Id,
                    Type = e.Type,
                    Category = e.Category,
                    Description = e.Description,
                    Amount = e.Amount,
                    Currency = e.Currency,
                    Date = e.Date,
                    PaymentMode = e.PaymentMode,
                    PaidTo = e.PaidTo,
                    ChartOfAccountCode = e.ChartOfAccountCode,
                    ChartOfAccountName = e.ChartOfAccountName,
                    Tags = e.Tags,
                    ReceiptUrl = e.ReceiptUrl,
                    CreatedBy = e.CreatedBy,
                    Status = e.Status,
                    Notes = e.Notes,
                    CreatedAt = e.CreatedAt,
                    UpdatedAt = e.UpdatedAt
                }).ToList(),
                ApprovedExpensesBreakdown = approvedExpensesBreakdown.Select(e => new ExpenseDto
                {
                    Id = e.Id,
                    Type = e.Type,
                    Category = e.Category,
                    Description = e.Description,
                    Amount = e.Amount,
                    Currency = e.Currency,
                    Date = e.Date,
                    PaymentMode = e.PaymentMode,
                    PaidTo = e.PaidTo,
                    ChartOfAccountCode = e.ChartOfAccountCode,
                    ChartOfAccountName = e.ChartOfAccountName,
                    Tags = e.Tags,
                    ReceiptUrl = e.ReceiptUrl,
                    CreatedBy = e.CreatedBy,
                    Status = e.Status,
                    Notes = e.Notes,
                    CreatedAt = e.CreatedAt,
                    UpdatedAt = e.UpdatedAt
                }).ToList(),
                PlatformBreakdown = platformBreakdownDto
            };

            _logger.LogInformation("Dashboard data calculated using stored procedures - Revenue: {Revenue}, Expenses: {Expenses}, Income: {Income}, Profit: {Profit}, Loss: {Loss}", 
                dashboardSummary.TotalRevenue, dashboardSummary.TotalExpenses, dashboardSummary.Income, dashboardSummary.Profit, dashboardSummary.Loss);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting dashboard data");
            throw;
        }
    }

    // Helper classes for stored procedure results
    private class DashboardSummaryResult
    {
        [System.ComponentModel.DataAnnotations.Schema.Column("total_revenue")]
        public decimal TotalRevenue { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("total_orders")]
        public int TotalOrders { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("average_order_value")]
        public decimal AverageOrderValue { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("total_cost_of_goods")]
        public decimal TotalCostOfGoods { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("total_profit")]
        public decimal TotalProfit { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("gross_margin")]
        public decimal GrossMargin { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("total_expenses")]
        public decimal TotalExpenses { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("approved_expenses")]
        public decimal ApprovedExpenses { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("pending_expenses")]
        public decimal PendingExpenses { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("income")]
        public decimal Income { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("profit")]
        public decimal Profit { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("loss")]
        public decimal Loss { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("net_margin")]
        public decimal NetMargin { get; set; }
    }

    private class PlatformBreakdownResult
    {
        [System.ComponentModel.DataAnnotations.Schema.Column("platform")]
        public string Platform { get; set; } = string.Empty;
        
        [System.ComponentModel.DataAnnotations.Schema.Column("revenue")]
        public decimal Revenue { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("orders")]
        public int Orders { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("profit")]
        public decimal Profit { get; set; }
    }

    private class ComprehensiveSalesAnalyticsResult
    {
        [System.ComponentModel.DataAnnotations.Schema.Column("total_revenue")]
        public decimal TotalRevenue { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("total_orders")]
        public int TotalOrders { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("average_order_value")]
        public decimal AverageOrderValue { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("total_cost_of_goods")]
        public decimal TotalCostOfGoods { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("total_profit")]
        public decimal TotalProfit { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("gross_margin")]
        public decimal GrossMargin { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("revenue_growth")]
        public decimal RevenueGrowth { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("order_growth")]
        public decimal OrderGrowth { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("platform_breakdown")]
        public string PlatformBreakdown { get; set; } = string.Empty;
        
        [System.ComponentModel.DataAnnotations.Schema.Column("top_products")]
        public string TopProducts { get; set; } = string.Empty;
        
        [System.ComponentModel.DataAnnotations.Schema.Column("revenue_by_month")]
        public string RevenueByMonth { get; set; } = string.Empty;
        
        [System.ComponentModel.DataAnnotations.Schema.Column("customer_metrics")]
        public string CustomerMetrics { get; set; } = string.Empty;
        
        [System.ComponentModel.DataAnnotations.Schema.Column("date_range_info")]
        public string DateRangeInfo { get; set; } = string.Empty;
    }

    private class SimpleSalesAnalyticsResult
    {
        [System.ComponentModel.DataAnnotations.Schema.Column("total_revenue")]
        public decimal TotalRevenue { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("total_orders")]
        public int TotalOrders { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("average_order_value")]
        public decimal AverageOrderValue { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("total_cost_of_goods")]
        public decimal TotalCostOfGoods { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("total_profit")]
        public decimal TotalProfit { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("gross_margin")]
        public decimal GrossMargin { get; set; }
    }

    private async Task<decimal> CalculateOrderCostAsync(ShopifyOrder order)
    {
        try
        {
            if (string.IsNullOrEmpty(order.LineItemsJson))
                return 0;

            var lineItems = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(order.LineItemsJson);
            if (lineItems == null)
                return 0;

            decimal totalCost = 0;

            foreach (var item in lineItems)
            {
                try
                {
                    if (!item.TryGetProperty("quantity", out var quantityElement))
                        continue;

                    var quantity = quantityElement.ValueKind == System.Text.Json.JsonValueKind.Number ? quantityElement.GetInt32() : 0;
                    decimal itemCost = 0;

                    // Try to get cost from variant information in line item first
                    if (item.TryGetProperty("variant", out var variantElement))
                    {
                        // Check if variant is an object (not a string)
                        if (variantElement.ValueKind == System.Text.Json.JsonValueKind.Object)
                        {
                            if (variantElement.TryGetProperty("cost", out var costElement) && 
                                costElement.ValueKind != System.Text.Json.JsonValueKind.Null &&
                                costElement.ValueKind == System.Text.Json.JsonValueKind.String &&
                                decimal.TryParse(costElement.GetString(), out var cost))
                            {
                                itemCost = cost * quantity;
                            }
                        }
                        // If variant is a string, we can't get cost from it
                        else if (variantElement.ValueKind == System.Text.Json.JsonValueKind.String)
                        {
                            // Skip this variant as it's just a string ID
                            _logger.LogDebug("Variant is a string, skipping cost calculation for order {OrderId}", order.Id);
                        }
                    }

                    // If no cost found in variant, try to look up from local product database
                    if (itemCost == 0)
                    {
                        // Use a simplified cost lookup to avoid individual queries
                        string? variantId = null;
                        string? sku = null;
                        
                        if (item.TryGetProperty("variant", out var variantElement2) && 
                            variantElement2.ValueKind == System.Text.Json.JsonValueKind.Object)
                        {
                            if (variantElement2.TryGetProperty("id", out var variantIdElement))
                                variantId = variantIdElement.GetString();
                            
                            if (variantElement2.TryGetProperty("sku", out var skuElement))
                                sku = skuElement.GetString();
                        }

                        // Simple cost lookup without individual queries
                        if (!string.IsNullOrEmpty(variantId) || !string.IsNullOrEmpty(sku))
                        {
                            var costQuery = _context.ShopifyProductVariants
                                .Where(v => v.Product.StoreConnectionId == order.StoreConnectionId)
                                .Where(v => 
                                    (!string.IsNullOrEmpty(variantId) && v.ShopifyVariantId == variantId) ||
                                    (!string.IsNullOrEmpty(sku) && v.Sku == sku))
                                .Where(v => v.CostPerItem.HasValue)
                                .Select(v => v.CostPerItem!.Value * quantity);

                            var cost = await costQuery.FirstOrDefaultAsync();
                            if (cost > 0)
                                itemCost = cost;
                        }
                    }

                    // If still no cost found, set to 0 (no estimation)
                    if (itemCost == 0)
                    {
                        _logger.LogDebug("No cost found for line item in order {OrderId}, setting cost to 0", order.Id);
                    }

                    totalCost += itemCost;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error calculating cost for line item in order {OrderId}", order.Id);
                }
            }

            return totalCost;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating order cost for order {OrderId}", order.Id);
            return 0;
        }
    }

    /// <summary>
    /// Looks up the actual product cost from the local Shopify product database
    /// </summary>
    // This method is now deprecated - costs are calculated in the stored procedure
    private async Task<decimal> GetProductCostFromDatabaseAsync(System.Text.Json.JsonElement lineItem, Guid storeConnectionId, int quantity)
    {
        // Costs are now calculated in the GetTopSellingProducts stored procedure
        // This method is kept for backward compatibility but should not be used
        return 0;
    }

    public async Task<object> GetSalesAnalyticsAsync(DateTime? startDate = null, DateTime? endDate = null, string? currency = null)
    {
        try
        {
            _logger.LogInformation("Getting sales analytics with startDate: {StartDate}, endDate: {EndDate}, currency: {Currency}", startDate, endDate, currency);
            
            // Use the same GetFinanceDashboardSummary stored procedure for consistency
            DashboardSummaryResult? dashboardSummary = null;
            
            if (startDate.HasValue && endDate.HasValue)
            {
                dashboardSummary = await _context.Database
                    .SqlQuery<DashboardSummaryResult>($@"
                        SELECT * FROM GetFinanceDashboardSummary(
                            '{startDate.Value.ToString("yyyy-MM-dd HH:mm:ss")}'::TIMESTAMP WITH TIME ZONE,
                            '{endDate.Value.ToString("yyyy-MM-dd HH:mm:ss")}'::TIMESTAMP WITH TIME ZONE,
                            {(currency == null ? "NULL" : $"'{currency}'")}::VARCHAR(10)
                        )")
                    .FirstOrDefaultAsync();
            }
            else
            {
                dashboardSummary = await _context.Database
                    .SqlQuery<DashboardSummaryResult>($@"
                        SELECT * FROM GetFinanceDashboardSummary(
                            NULL::TIMESTAMP WITH TIME ZONE,
                            NULL::TIMESTAMP WITH TIME ZONE,
                            {(currency == null ? "NULL" : $"'{currency}'")}::VARCHAR(10)
                        )")
                    .FirstOrDefaultAsync();
            }

            if (dashboardSummary == null)
            {
                return new
                {
                    totalRevenue = 0m,
                    totalOrders = 0,
                    averageOrderValue = 0m,
                    totalCostOfGoods = 0m,
                    totalProfit = 0m,
                    grossMargin = 0m
                };
            }

            return new
            {
                totalRevenue = dashboardSummary.TotalRevenue,
                totalOrders = dashboardSummary.TotalOrders,
                averageOrderValue = dashboardSummary.AverageOrderValue,
                totalCostOfGoods = dashboardSummary.TotalCostOfGoods,
                totalProfit = dashboardSummary.TotalProfit,
                grossMargin = dashboardSummary.GrossMargin
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting sales analytics");
            throw;
        }
    }

    private async Task<decimal> GetRevenueForPeriodAsync(DateTime startDate, DateTime endDate, string? currency)
    {
        var shopifyRevenue = await _context.ShopifyOrders
            .Where(o => o.CreatedAt >= startDate && o.CreatedAt <= endDate && (currency == null || o.Currency == currency))
            .Where(o => o.FulfillmentStatus.ToLower() == "fulfilled")
            .Where(o => !new[] { "cancelled", "voided", "refunded" }.Contains(o.DisplayFinancialStatus.ToLower()))
            .SumAsync(o => o.TotalPrice);

        return shopifyRevenue;
    }

    private async Task<int> GetOrderCountForPeriodAsync(DateTime startDate, DateTime endDate, string? currency)
    {
        var shopifyCount = await _context.ShopifyOrders
            .Where(o => o.CreatedAt >= startDate && o.CreatedAt <= endDate && (currency == null || o.Currency == currency))
            .Where(o => o.FulfillmentStatus.ToLower() == "fulfilled")
            .Where(o => !new[] { "cancelled", "voided", "refunded" }.Contains(o.DisplayFinancialStatus.ToLower()))
            .CountAsync();

        return shopifyCount;
    }

    public async Task<object> GetProductAnalyticsAsync(DateTime? startDate = null, DateTime? endDate = null, string? currency = null)
    {
        try
        {
            var query = _context.ProductAnalytics.AsQueryable();

            if (startDate.HasValue)
                query = query.Where(p => p.Date >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(p => p.Date <= endDate.Value);

            if (!string.IsNullOrEmpty(currency))
                query = query.Where(p => p.Currency == currency);

            var analytics = await query
                .OrderByDescending(p => p.Date)
                .ToListAsync();

            return analytics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting product analytics");
            throw;
        }
    }

    #endregion

    #region Sales Orders

    public async Task<object> GetSalesOrdersAsync(DateTime? startDate = null, DateTime? endDate = null, string? status = null, string? fulfillmentStatus = null, string? search = null, decimal? minAmount = null, decimal? maxAmount = null, string? currency = null, int page = 1, int limit = 20)
    {
        try
        {
            var query = _context.ShopifyOrders.AsQueryable();

            // Apply date filters
            if (startDate.HasValue)
                query = query.Where(o => o.CreatedAt >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(o => o.CreatedAt <= endDate.Value);

            // Apply status filters
            if (!string.IsNullOrEmpty(status))
                query = query.Where(o => o.Status.ToLower() == status.ToLower());

            if (!string.IsNullOrEmpty(fulfillmentStatus))
                query = query.Where(o => o.FulfillmentStatus.ToLower() == fulfillmentStatus.ToLower());

            // Apply amount filters
            if (minAmount.HasValue)
                query = query.Where(o => o.TotalPrice >= minAmount.Value);

            if (maxAmount.HasValue)
                query = query.Where(o => o.TotalPrice <= maxAmount.Value);

            // Apply currency filter
            if (!string.IsNullOrEmpty(currency))
                query = query.Where(o => o.Currency == currency);

            // Apply search filter
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(o =>
                    o.OrderNumber.ToLower().Contains(searchLower) ||
                    o.Name.ToLower().Contains(searchLower) ||
                    (o.CustomerFirstName != null && o.CustomerFirstName.ToLower().Contains(searchLower)) ||
                    (o.CustomerLastName != null && o.CustomerLastName.ToLower().Contains(searchLower)) ||
                    (o.CustomerEmail != null && o.CustomerEmail.ToLower().Contains(searchLower)));
            }

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalCount / limit);

            var orders = await query
                .OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * limit)
                .Take(limit)
                .Select(o => new
                {
                    o.Id,
                    o.OrderNumber,
                    o.Name,
                    o.ShopifyOrderId,
                    o.TotalPrice,
                    o.Currency,
                    o.Status,
                    o.FulfillmentStatus,
                    o.DisplayFulfillmentStatus,
                    o.DisplayFinancialStatus,
                    o.CreatedAt,
                    o.UpdatedAt,
                    Customer = new
                    {
                        o.CustomerFirstName,
                        o.CustomerLastName,
                        o.CustomerEmail,
                        o.CustomerId
                    },
                    ShippingAddress = new
                    {
                        o.ShippingFirstName,
                        o.ShippingLastName,
                        o.ShippingAddress1,
                        o.ShippingCity,
                        o.ShippingProvince,
                        o.ShippingCountry,
                        o.ShippingZip
                    },
                    o.LineItemsJson,
                    o.TotalTax,
                    o.TotalDiscounts,
                    o.SubtotalPrice
                })
                .ToListAsync();

            var result = new
            {
                Orders = orders,
                Pagination = new
                {
                    Page = page,
                    Limit = limit,
                    Total = totalCount,
                    TotalPages = totalPages
                }
            };

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting sales orders");
            throw;
        }
    }

    public async Task<object?> GetSalesOrderAsync(string id)
    {
        try
        {
            if (!Guid.TryParse(id, out var orderId))
            {
                return null;
            }

            var order = await _context.ShopifyOrders
                .Where(o => o.Id == orderId)
                .Select(o => new
                {
                    o.Id,
                    o.OrderNumber,
                    o.Name,
                    o.ShopifyOrderId,
                    o.TotalPrice,
                    o.Currency,
                    o.Status,
                    o.FulfillmentStatus,
                    o.DisplayFulfillmentStatus,
                    o.DisplayFinancialStatus,
                    o.CreatedAt,
                    o.UpdatedAt,
                    o.ProcessedAt,
                    o.Tags,
                    o.Note,
                    Customer = new
                    {
                        o.CustomerFirstName,
                        o.CustomerLastName,
                        o.CustomerEmail,
                        o.CustomerId
                    },
                    ShippingAddress = new
                    {
                        o.ShippingFirstName,
                        o.ShippingLastName,
                        o.ShippingAddress1,
                        o.ShippingCity,
                        o.ShippingProvince,
                        o.ShippingCountry,
                        o.ShippingZip
                    },
                    o.LineItemsJson,
                    o.TotalTax,
                    o.TotalDiscounts,
                    o.SubtotalPrice
                })
                .FirstOrDefaultAsync();

            return order;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting sales order {Id}", id);
            throw;
        }
    }

    public async Task<object> GetSalesSummaryAsync(DateTime? startDate = null, DateTime? endDate = null, string? currency = null)
    {
        try
        {
            var query = _context.ShopifyOrders.AsQueryable();

            if (startDate.HasValue)
                query = query.Where(o => o.CreatedAt >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(o => o.CreatedAt <= endDate.Value);

            if (!string.IsNullOrEmpty(currency))
                query = query.Where(o => o.Currency == currency);

            var summary = await query
                .GroupBy(o => new { o.Currency })
                .Select(g => new
                {
                    Currency = g.Key.Currency,
                    TotalRevenue = g.Sum(o => o.TotalPrice),
                    TotalOrders = g.Count(),
                    AverageOrderValue = g.Average(o => o.TotalPrice),
                    TotalTax = g.Sum(o => o.TotalTax ?? 0),
                    TotalDiscounts = g.Sum(o => o.TotalDiscounts ?? 0),
                    Subtotal = g.Sum(o => o.SubtotalPrice ?? 0)
                })
                .ToListAsync();

            return summary;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting sales summary");
            throw;
        }
    }

    public async Task<object> GetCOGSSummaryAsync(DateTime? startDate = null, DateTime? endDate = null, string? currency = null)
    {
        try
        {
            _logger.LogInformation("Getting COGS summary with startDate: {StartDate}, endDate: {EndDate}, currency: {Currency}", startDate, endDate, currency);
            
            // Use the COGS summary stored procedure
            var sql = "SELECT * FROM GetCOGSSummary(@startDate, @endDate, @currency)";
            
            var parameters = new[]
            {
                new NpgsqlParameter("@startDate", startDate ?? (object)DBNull.Value),
                new NpgsqlParameter("@endDate", endDate ?? (object)DBNull.Value),
                new NpgsqlParameter("@currency", currency ?? (object)DBNull.Value)
            };

            var cogsResult = await _context.Database
                .SqlQueryRaw<COGSSummaryResult>(sql, parameters)
                .FirstOrDefaultAsync();

            if (cogsResult == null)
            {
                return new
                {
                    totalRevenue = 0m,
                    totalOrders = 0,
                    totalCostOfGoods = 0m,
                    totalProfit = 0m,
                    grossMargin = 0m,
                    averageOrderValue = 0m,
                    averageCostPerOrder = 0m
                };
            }

            return new
            {
                totalRevenue = cogsResult.TotalRevenue,
                totalOrders = cogsResult.TotalOrders,
                totalCostOfGoods = cogsResult.TotalCostOfGoods,
                totalProfit = cogsResult.TotalProfit,
                grossMargin = cogsResult.GrossMargin,
                averageOrderValue = cogsResult.AverageOrderValue,
                averageCostPerOrder = cogsResult.AverageCostPerOrder
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting COGS summary");
            throw;
        }
    }

    public async Task<object> GetCOGSAnalyticsAsync(DateTime? startDate = null, DateTime? endDate = null, string? currency = null, string? platform = null)
    {
        try
        {
            _logger.LogInformation("Getting COGS analytics with startDate: {StartDate}, endDate: {EndDate}, currency: {Currency}, platform: {Platform}", startDate, endDate, currency, platform);
            
            // Use the COGS analytics stored procedure
            var sql = "SELECT * FROM GetCostOfGoodsSold(@startDate, @endDate, @currency, @platform)";
            
            var parameters = new[]
            {
                new NpgsqlParameter("@startDate", startDate ?? (object)DBNull.Value),
                new NpgsqlParameter("@endDate", endDate ?? (object)DBNull.Value),
                new NpgsqlParameter("@currency", currency ?? (object)DBNull.Value),
                new NpgsqlParameter("@platform", platform ?? (object)DBNull.Value)
            };

            var cogsResults = await _context.Database
                .SqlQueryRaw<COGSAnalyticsResult>(sql, parameters)
                .ToListAsync();

            return cogsResults.Select(result => new
            {
                platform = result.Platform,
                totalRevenue = result.TotalRevenue,
                totalOrders = result.TotalOrders,
                totalCostOfGoods = result.TotalCostOfGoods,
                totalProfit = result.TotalProfit,
                grossMargin = result.GrossMargin,
                averageOrderValue = result.AverageOrderValue,
                averageCostPerOrder = result.AverageCostPerOrder,
                costBreakdown = result.CostBreakdown,
                topProductsByCost = result.TopProductsByCost
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting COGS analytics");
            throw;
        }
    }

    // Helper classes for COGS stored procedure results
    private class COGSSummaryResult
    {
        [System.ComponentModel.DataAnnotations.Schema.Column("total_revenue")]
        public decimal TotalRevenue { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("total_orders")]
        public int TotalOrders { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("total_cost_of_goods")]
        public decimal TotalCostOfGoods { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("total_profit")]
        public decimal TotalProfit { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("gross_margin")]
        public decimal GrossMargin { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("average_order_value")]
        public decimal AverageOrderValue { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("average_cost_per_order")]
        public decimal AverageCostPerOrder { get; set; }
    }

    private class COGSAnalyticsResult
    {
        [System.ComponentModel.DataAnnotations.Schema.Column("platform")]
        public string Platform { get; set; } = string.Empty;
        
        [System.ComponentModel.DataAnnotations.Schema.Column("total_revenue")]
        public decimal TotalRevenue { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("total_orders")]
        public int TotalOrders { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("total_cost_of_goods")]
        public decimal TotalCostOfGoods { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("total_profit")]
        public decimal TotalProfit { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("gross_margin")]
        public decimal GrossMargin { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("average_order_value")]
        public decimal AverageOrderValue { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("average_cost_per_order")]
        public decimal AverageCostPerOrder { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column("cost_breakdown")]
        public string CostBreakdown { get; set; } = string.Empty;
        
        [System.ComponentModel.DataAnnotations.Schema.Column("top_products_by_cost")]
        public string TopProductsByCost { get; set; } = string.Empty;
    }

    #endregion

    #region Expenses

    // Helper result types for raw SQL mappings (stored procedures)
    private class ExpenseRowResult
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
        public string? Tags { get; set; } // jsonb as text
        public string? ReceiptUrl { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public long total_count { get; set; }
    }

    private class ExpenseRow
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
        public string? Tags { get; set; }
        public string? ReceiptUrl { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    private class BoolResult { public bool result { get; set; } }

    public async Task<object> GetExpensesAsync(DateTime? startDate = null, DateTime? endDate = null, string? type = null, string? category = null)
    {
        try
        {
            var query = _context.Expenses.AsQueryable();

            if (startDate.HasValue)
                query = query.Where(e => e.Date >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(e => e.Date <= endDate.Value);

            if (!string.IsNullOrEmpty(type))
                query = query.Where(e => e.Type == type);

            if (!string.IsNullOrEmpty(category))
                query = query.Where(e => e.Category == category);

            var expenses = await query
                .OrderByDescending(e => e.Date)
                .ToListAsync();

            return expenses;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting expenses");
            throw;
        }
    }

    public async Task<object> GetExpensesPaginatedAsync(DateTime? startDate = null, DateTime? endDate = null, string? type = null, string? category = null, string? status = null, decimal? minAmount = null, decimal? maxAmount = null, string? search = null, int page = 1, int limit = 20)
    {
        try
        {
            // Local helper types for SQL mapping
            var culture = System.Globalization.CultureInfo.InvariantCulture;
            string? FormatDate(DateTime? dt) => dt.HasValue ? dt.Value.ToString("yyyy-MM-dd HH:mm:ss", culture) : null;
            string? Q(string? s) => s is null ? null : s.Replace("'", "''");

            // Build stored procedure call
            var sql =
                $"SELECT * FROM GetExpensesPaginated(" +
                $"{(startDate.HasValue ? $"'{FormatDate(startDate)}'" : "NULL")}, " +
                $"{(endDate.HasValue ? $"'{FormatDate(endDate)}'" : "NULL")}, " +
                $"{(!string.IsNullOrWhiteSpace(type) ? $"'{Q(type)}'" : "NULL")}, " +
                $"{(!string.IsNullOrWhiteSpace(category) ? $"'{Q(category)}'" : "NULL")}, " +
                $"{(!string.IsNullOrWhiteSpace(status) ? $"'{Q(status)}'" : "NULL")}, " +
                $"{(minAmount.HasValue ? minAmount.Value.ToString(culture) : "NULL")}, " +
                $"{(maxAmount.HasValue ? maxAmount.Value.ToString(culture) : "NULL")}, " +
                $"{(!string.IsNullOrWhiteSpace(search) ? $"'{Q(search)}'" : "NULL")}, " +
                $"{page}, {limit})";

            _logger.LogInformation("Executing GetExpensesPaginated: {Sql}", sql);

            var rows = await _context.Database
                .SqlQueryRaw<ExpenseRowResult>(sql)
                .ToListAsync();

            var totalCount = rows.FirstOrDefault()?.total_count ?? 0;
            var totalPages = limit > 0 ? (int)Math.Ceiling(totalCount / (double)limit) : 1;

            static List<string> ParseTags(string? json)
            {
                if (string.IsNullOrWhiteSpace(json)) return new List<string>();
                try
                {
                    var list = System.Text.Json.JsonSerializer.Deserialize<List<string>>(json);
                    return list ?? new List<string>();
                }
                catch
                {
                    return new List<string>();
                }
            }

            var result = new PaginatedFinanceResponseDto<ExpenseDto>
            {
                Data = rows.Select(e => new ExpenseDto
                {
                    Id = e.Id,
                    Type = e.Type,
                    Category = e.Category,
                    Description = e.Description,
                    Amount = e.Amount,
                    Currency = e.Currency,
                    Date = e.Date,
                    PaymentMode = e.PaymentMode,
                    PaidTo = e.PaidTo,
                    ChartOfAccountCode = e.ChartOfAccountCode,
                    ChartOfAccountName = e.ChartOfAccountName,
                    Tags = ParseTags(e.Tags),
                    ReceiptUrl = e.ReceiptUrl,
                    CreatedBy = e.CreatedBy,
                    Status = e.Status,
                    Notes = e.Notes,
                    CreatedAt = e.CreatedAt,
                    UpdatedAt = e.UpdatedAt
                }).ToList(),
                Pagination = new PaginationDto
                {
                    Page = page,
                    Limit = limit,
                    Total = (int)totalCount,
                    TotalPages = totalPages
                }
            };

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting paginated expenses via stored procedure");
            throw;
        }
    }

    public async Task<object?> GetExpenseAsync(string id)
    {
        try
        {
            string Q(string s) => s.Replace("'", "''");
            var sql = $"SELECT * FROM GetExpenseById('{Q(id)}')";

            var row = await _context.Database
                .SqlQueryRaw<ExpenseRow>(sql)
                .FirstOrDefaultAsync();

            if (row == null) return null;

            List<string> tags;
            try { tags = System.Text.Json.JsonSerializer.Deserialize<List<string>>(row.Tags ?? "[]") ?? new(); }
            catch { tags = new List<string>(); }

            return new ExpenseDto
            {
                Id = row.Id,
                Type = row.Type,
                Category = row.Category,
                Description = row.Description,
                Amount = row.Amount,
                Currency = row.Currency,
                Date = row.Date,
                PaymentMode = row.PaymentMode,
                PaidTo = row.PaidTo,
                ChartOfAccountCode = row.ChartOfAccountCode,
                ChartOfAccountName = row.ChartOfAccountName,
                Tags = tags,
                ReceiptUrl = row.ReceiptUrl,
                CreatedBy = row.CreatedBy,
                Status = row.Status,
                Notes = row.Notes,
                CreatedAt = row.CreatedAt,
                UpdatedAt = row.UpdatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting expense {Id} via stored procedure", id);
            throw;
        }
    }

    public async Task<object> CreateExpenseAsync(CreateExpenseDto request)
    {
        try
        {
            string Q(string? s) => (s ?? string.Empty).Replace("'", "''");
            var culture = System.Globalization.CultureInfo.InvariantCulture;
            var dateStr = DateTime.SpecifyKind(request.Date, DateTimeKind.Utc).ToString("yyyy-MM-dd HH:mm:ss", culture);
            var tagsJson = request.Tags != null ? System.Text.Json.JsonSerializer.Serialize(request.Tags) : null;

            var sql =
                $"SELECT * FROM CreateExpense(" +
                $"'{Q(request.Type)}', " +
                $"'{Q(request.Category)}', " +
                $"'{Q(request.Description)}', " +
                $"{request.Amount.ToString(culture)}, " +
                $"'{Q(request.Currency)}', " +
                $"'{dateStr}', " +
                $"'{Q(request.PaymentMode)}', " +
                $"'{Q(request.PaidTo)}', " +
                $"'{Q(request.CreatedBy)}', " +
                $"{(request.ChartOfAccountCode != null ? $"'{Q(request.ChartOfAccountCode)}'" : "NULL")}, " +
                $"{(request.ChartOfAccountName != null ? $"'{Q(request.ChartOfAccountName)}'" : "NULL")}, " +
                $"{(tagsJson != null ? $"'{Q(tagsJson)}'::jsonb" : "NULL")}, " +
                $"{(request.ReceiptUrl != null ? $"'{Q(request.ReceiptUrl)}'" : "NULL")}, " +
                $"{(request.Notes != null ? $"'{Q(request.Notes)}'" : "NULL")}" +
                ")";

            var row = await _context.Database.SqlQueryRaw<ExpenseRow>(sql).FirstAsync();

            List<string> tags;
            try { tags = System.Text.Json.JsonSerializer.Deserialize<List<string>>(row.Tags ?? "[]") ?? new(); }
            catch { tags = new List<string>(); }

            return new ExpenseDto
            {
                Id = row.Id,
                Type = row.Type,
                Category = row.Category,
                Description = row.Description,
                Amount = row.Amount,
                Currency = row.Currency,
                Date = row.Date,
                PaymentMode = row.PaymentMode,
                PaidTo = row.PaidTo,
                ChartOfAccountCode = row.ChartOfAccountCode,
                ChartOfAccountName = row.ChartOfAccountName,
                Tags = tags,
                ReceiptUrl = row.ReceiptUrl,
                CreatedBy = row.CreatedBy,
                Status = row.Status,
                Notes = row.Notes,
                CreatedAt = row.CreatedAt,
                UpdatedAt = row.UpdatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating expense via stored procedure");
            throw;
        }
    }

    public async Task<object?> UpdateExpenseAsync(string id, UpdateExpenseDto request)
    {
        try
        {
            string Q(string? s) => s?.Replace("'", "''") ?? "";
            var culture = System.Globalization.CultureInfo.InvariantCulture;
            var dateStr = request.Date.HasValue
                ? DateTime.SpecifyKind(request.Date.Value, DateTimeKind.Utc).ToString("yyyy-MM-dd HH:mm:ss", culture)
                : null;
            var tagsJson = request.Tags != null ? System.Text.Json.JsonSerializer.Serialize(request.Tags) : null;

            var sql =
                $"SELECT * FROM UpdateExpense(" +
                $"'{Q(id)}', " +
                $"{(!string.IsNullOrEmpty(request.Type) ? $"'{Q(request.Type)}'" : "NULL")}, " +
                $"{(!string.IsNullOrEmpty(request.Category) ? $"'{Q(request.Category)}'" : "NULL")}, " +
                $"{(!string.IsNullOrEmpty(request.Description) ? $"'{Q(request.Description)}'" : "NULL")}, " +
                $"{(request.Amount.HasValue ? request.Amount.Value.ToString(culture) : "NULL")}, " +
                $"{(!string.IsNullOrEmpty(request.Currency) ? $"'{Q(request.Currency)}'" : "NULL")}, " +
                $"{(dateStr != null ? $"'{dateStr}'" : "NULL")}, " +
                $"{(!string.IsNullOrEmpty(request.PaymentMode) ? $"'{Q(request.PaymentMode)}'" : "NULL")}, " +
                $"{(!string.IsNullOrEmpty(request.PaidTo) ? $"'{Q(request.PaidTo)}'" : "NULL")}, " +
                $"{(request.ChartOfAccountCode != null ? $"'{Q(request.ChartOfAccountCode)}'" : "NULL")}, " +
                $"{(request.ChartOfAccountName != null ? $"'{Q(request.ChartOfAccountName)}'" : "NULL")}, " +
                $"{(tagsJson != null ? $"'{Q(tagsJson)}'::jsonb" : "NULL")}, " +
                $"{(request.ReceiptUrl != null ? $"'{Q(request.ReceiptUrl)}'" : "NULL")}, " +
                $"{(request.Notes != null ? $"'{Q(request.Notes)}'" : "NULL")}, " +
                $"{(!string.IsNullOrEmpty(request.Status) ? $"'{Q(request.Status)}'" : "NULL")}" +
                ")";

            var row = await _context.Database.SqlQueryRaw<ExpenseRow>(sql).FirstOrDefaultAsync();
            if (row == null) return null;

            List<string> tags;
            try { tags = System.Text.Json.JsonSerializer.Deserialize<List<string>>(row.Tags ?? "[]") ?? new(); }
            catch { tags = new List<string>(); }

            return new ExpenseDto
            {
                Id = row.Id,
                Type = row.Type,
                Category = row.Category,
                Description = row.Description,
                Amount = row.Amount,
                Currency = row.Currency,
                Date = row.Date,
                PaymentMode = row.PaymentMode,
                PaidTo = row.PaidTo,
                ChartOfAccountCode = row.ChartOfAccountCode,
                ChartOfAccountName = row.ChartOfAccountName,
                Tags = tags,
                ReceiptUrl = row.ReceiptUrl,
                CreatedBy = row.CreatedBy,
                Status = row.Status,
                Notes = row.Notes,
                CreatedAt = row.CreatedAt,
                UpdatedAt = row.UpdatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating expense {Id} via stored procedure", id);
            throw;
        }
    }

    public async Task<bool> DeleteExpenseAsync(string id)
    {
        try
        {
            string Q(string s) => s.Replace("'", "''");
            var sql = $"SELECT * FROM DeleteExpense('{Q(id)}')";
            var res = await _context.Database.SqlQueryRaw<BoolResult>(sql).FirstOrDefaultAsync();
            return res?.result ?? false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting expense {Id} via stored procedure", id);
            throw;
        }
    }

    public async Task<object> GetExpenseCategoriesAsync()
    {
        try
        {
            var categories = await _context.ExpenseCategories
                .Where(c => c.IsActive)
                .OrderBy(c => c.Name)
                .ToListAsync();

            return categories;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting expense categories");
            throw;
        }
    }

    public async Task<object> GetPaymentModesAsync()
    {
        try
        {
            var paymentModes = await _context.PaymentModes
                .Where(p => p.IsActive)
                .OrderBy(p => p.SortOrder)
                .ThenBy(p => p.DisplayName)
                .ToListAsync();

            return paymentModes;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payment modes");
            throw;
        }
    }

    public async Task<object> GetExpenseTagsAsync()
    {
        try
        {
            var expenseTags = await _context.ExpenseTags
                .Where(t => t.IsActive)
                .OrderBy(t => t.SortOrder)
                .ThenBy(t => t.DisplayName)
                .ToListAsync();

            return expenseTags;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting expense tags");
            throw;
        }
    }

    // Chart of Accounts methods
    public async Task<object> GetChartOfAccountsAsync()
    {
        try
        {
            var accounts = await _context.ChartOfAccounts
                .Where(c => c.IsActive)
                .OrderBy(c => c.Code)
                .ToListAsync();

            return accounts;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting chart of accounts");
            throw;
        }
    }

    public async Task<object?> GetChartOfAccountAsync(string code)
    {
        try
        {
            var account = await _context.ChartOfAccounts
                .FirstOrDefaultAsync(c => c.Code == code && c.IsActive);
            return account;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting chart of account {Code}", code);
            throw;
        }
    }

    public async Task<object> CreateChartOfAccountAsync(CreateChartOfAccountDto request)
    {
        try
        {
            // Check if code already exists
            var existingAccount = await _context.ChartOfAccounts
                .FirstOrDefaultAsync(c => c.Code == request.Code);
            
            if (existingAccount != null)
            {
                throw new InvalidOperationException($"Chart of account with code '{request.Code}' already exists");
            }

            var account = new ChartOfAccount
            {
                Code = request.Code,
                Name = request.Name,
                Type = request.Type,
                Description = request.Description,
                ParentCode = request.ParentCode,
                IsActive = true
            };

            _context.ChartOfAccounts.Add(account);
            await _context.SaveChangesAsync();

            return account;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating chart of account");
            throw;
        }
    }

    public async Task<object?> UpdateChartOfAccountAsync(string code, UpdateChartOfAccountDto request)
    {
        try
        {
            var account = await _context.ChartOfAccounts
                .FirstOrDefaultAsync(c => c.Code == code);
            
            if (account == null)
                return null;

            if (!string.IsNullOrEmpty(request.Name))
                account.Name = request.Name;

            if (!string.IsNullOrEmpty(request.Type))
                account.Type = request.Type;

            if (request.Description != null)
                account.Description = request.Description;

            if (request.ParentCode != null)
                account.ParentCode = request.ParentCode;

            if (request.IsActive.HasValue)
                account.IsActive = request.IsActive.Value;

            account.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return account;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating chart of account {Code}", code);
            throw;
        }
    }

    public async Task<bool> DeleteChartOfAccountAsync(string code)
    {
        try
        {
            var account = await _context.ChartOfAccounts
                .FirstOrDefaultAsync(c => c.Code == code);
            
            if (account == null)
                return false;

            // Check if any expenses are using this account
            var expensesUsingAccount = await _context.Expenses
                .AnyAsync(e => e.ChartOfAccountCode == code);
            
            if (expensesUsingAccount)
            {
                throw new InvalidOperationException($"Cannot delete chart of account '{code}' as it is being used by expenses");
            }

            _context.ChartOfAccounts.Remove(account);
            await _context.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting chart of account {Code}", code);
            throw;
        }
    }

    #endregion

    #region Product Costs

    public async Task<object> GetProductCostsAsync(string? productId = null, string? sku = null)
    {
        try
        {
            var query = _context.ProductCosts.AsQueryable();

            if (!string.IsNullOrEmpty(productId))
                query = query.Where(p => p.ProductId == productId);

            if (!string.IsNullOrEmpty(sku))
                query = query.Where(p => p.Sku == sku);

            var costs = await query
                .OrderBy(p => p.Sku)
                .ToListAsync();

            return costs;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting product costs");
            throw;
        }
    }

    public async Task<object?> GetProductCostAsync(int id)
    {
        try
        {
            var cost = await _context.ProductCosts.FindAsync(id);
            return cost;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting product cost {Id}", id);
            throw;
        }
    }

    public async Task<object> CreateProductCostAsync(CreateProductCostDto request)
    {
        try
        {
            var cost = new ProductCost
            {
                ProductId = request.ProductId,
                VariantId = request.VariantId,
                Sku = request.Sku,
                CostPrice = request.CostPrice,
                Currency = request.Currency,
                Supplier = request.Supplier,
                Notes = request.Notes,
                LastUpdatedBy = request.LastUpdatedBy
            };

            _context.ProductCosts.Add(cost);
            await _context.SaveChangesAsync();

            return cost;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating product cost");
            throw;
        }
    }

    public async Task<object?> UpdateProductCostAsync(int id, UpdateProductCostDto request)
    {
        try
        {
            var cost = await _context.ProductCosts.FindAsync(id);
            if (cost == null)
                return null;

            if (request.CostPrice.HasValue)
                cost.CostPrice = request.CostPrice.Value;

            if (!string.IsNullOrEmpty(request.Currency))
                cost.Currency = request.Currency;

            if (request.Supplier != null)
                cost.Supplier = request.Supplier;

            if (request.Notes != null)
                cost.Notes = request.Notes;

            cost.LastUpdatedBy = request.LastUpdatedBy;

            await _context.SaveChangesAsync();

            return cost;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating product cost {Id}", id);
            throw;
        }
    }

    public async Task<bool> DeleteProductCostAsync(int id)
    {
        try
        {
            var cost = await _context.ProductCosts.FindAsync(id);
            if (cost == null)
                return false;

            _context.ProductCosts.Remove(cost);
            await _context.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting product cost {Id}", id);
            throw;
        }
    }

    #endregion

    #region Payouts

    public async Task<object> GetPayoutsAsync(DateTime? startDate = null, DateTime? endDate = null, string? status = null)
    {
        try
        {
            var query = _context.Payouts.AsQueryable();

            if (startDate.HasValue)
                query = query.Where(p => p.ExpectedDate >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(p => p.ExpectedDate <= endDate.Value);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(p => p.Status == status);

            var payouts = await query
                .OrderByDescending(p => p.ExpectedDate)
                .ToListAsync();

            return payouts;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payouts");
            throw;
        }
    }

    public async Task<object?> GetPayoutAsync(int id)
    {
        try
        {
            var payout = await _context.Payouts.FindAsync(id);
            return payout;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payout {Id}", id);
            throw;
        }
    }

    public async Task<object> CreatePayoutAsync(CreatePayoutDto request)
    {
        try
        {
            var payout = new Payout
            {
                PayoutId = request.PayoutId,
                Amount = request.Amount,
                Currency = request.Currency,
                Status = request.Status,
                ExpectedDate = request.ExpectedDate.HasValue ? DateTime.SpecifyKind(request.ExpectedDate.Value, DateTimeKind.Utc) : DateTime.UtcNow,
                ActualDate = request.ActualDate.HasValue ? DateTime.SpecifyKind(request.ActualDate.Value, DateTimeKind.Utc) : null,
                Fees = request.Fees ?? 0,
                NetAmount = request.NetAmount ?? request.Amount
            };

            _context.Payouts.Add(payout);
            await _context.SaveChangesAsync();

            return payout;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating payout");
            throw;
        }
    }

    public async Task<object> ReconcilePayoutAsync(int id, ReconcilePayoutDto request)
    {
        try
        {
            var payout = await _context.Payouts.FindAsync(id);
            if (payout == null)
                throw new InvalidOperationException("Payout not found");

            var reconciliation = new PayoutReconciliation
            {
                PayoutId = payout.PayoutId,
                ExpectedAmount = payout.Amount,
                ActualAmount = request.ActualAmount,
                Difference = request.ActualAmount - payout.Amount,
                Fees = request.Fees ?? 0,
                Status = "Reconciled"
            };

            payout.ActualDate = request.ActualDate.HasValue ? DateTime.SpecifyKind(request.ActualDate.Value, DateTimeKind.Utc) : DateTime.UtcNow;
            payout.Status = "Reconciled";

            _context.PayoutReconciliations.Add(reconciliation);
            await _context.SaveChangesAsync();

            return reconciliation;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reconciling payout {Id}", id);
            throw;
        }
    }

    #endregion

    #region Tax Records

    public async Task<object> GetTaxRecordsAsync(DateTime? startDate = null, DateTime? endDate = null, string? country = null, string? taxType = null)
    {
        try
        {
            var query = _context.TaxRecords.AsQueryable();

            if (startDate.HasValue)
                query = query.Where(t => t.TaxDate >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(t => t.TaxDate <= endDate.Value);

            if (!string.IsNullOrEmpty(country))
                query = query.Where(t => t.Country == country);

            if (!string.IsNullOrEmpty(taxType))
                query = query.Where(t => t.TaxType == taxType);

            var taxRecords = await query
                .OrderByDescending(t => t.TaxDate)
                .ToListAsync();

            return taxRecords;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting tax records");
            throw;
        }
    }

    #endregion

    #region Reports

    public async Task<object> GetReportsAsync(string? type = null, string? format = null)
    {
        try
        {
            var query = _context.Reports.AsQueryable();

            if (!string.IsNullOrEmpty(type))
                query = query.Where(r => r.Type == type);

            if (!string.IsNullOrEmpty(format))
                query = query.Where(r => r.Format == format);

            var reports = await query
                .OrderByDescending(r => r.GeneratedAt)
                .ToListAsync();

            return reports;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting reports");
            throw;
        }
    }

    public async Task<object> GenerateReportAsync(ReportRequestDto request)
    {
        try
        {
            // This is a placeholder implementation
            // In a real application, you would generate the actual report file
            var report = new Report
            {
                Type = request.Type,
                Format = request.Format,
                FileName = $"{request.Type}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.{request.Format.ToLower()}",
                FilePath = $"/reports/{request.Type}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.{request.Format.ToLower()}",
                GeneratedBy = request.GeneratedBy,
                Parameters = request.Parameters,
                GeneratedAt = DateTime.UtcNow
            };

            _context.Reports.Add(report);
            await _context.SaveChangesAsync();

            return report;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating report");
            throw;
        }
    }

    public async Task<object?> GetReportAsync(int id)
    {
        try
        {
            var report = await _context.Reports.FindAsync(id);
            return report;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting report {Id}", id);
            throw;
        }
    }

    public async Task<byte[]> DownloadReportAsync(int id)
    {
        try
        {
            var report = await _context.Reports.FindAsync(id);
            if (report == null)
                throw new InvalidOperationException("Report not found");

            // This is a placeholder implementation
            // In a real application, you would read the actual file from disk
            var placeholderContent = $"This is a placeholder for {report.FileName}";
            return System.Text.Encoding.UTF8.GetBytes(placeholderContent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading report {Id}", id);
            throw;
        }
    }

    #endregion

    #region Suppliers

    public async Task<object> GetSuppliersAsync(string? search = null, bool? isActive = null)
    {
        try
        {
            var query = _context.Suppliers.AsQueryable();

            if (!string.IsNullOrEmpty(search))
                query = query.Where(s =>
                    s.Name.Contains(search) ||
                    (s.ContactPerson ?? "").Contains(search) ||
                    (s.Email ?? "").Contains(search)
                );

            if (isActive.HasValue)
                query = query.Where(s => s.IsActive == isActive.Value);

            var suppliers = await query
                .OrderBy(s => s.Name)
                .ToListAsync();

            return suppliers;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting suppliers");
            throw;
        }
    }

    public async Task<object?> GetSupplierAsync(string id)
    {
        try
        {
            var supplier = await _context.Suppliers.FindAsync(id);
            return supplier;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting supplier {Id}", id);
            throw;
        }
    }

    public async Task<object> CreateSupplierAsync(CreateSupplierDto request)
    {
        try
        {
            var supplier = new Supplier
            {
                Name = request.Name,
                Address = request.Address,
                ContactPerson = request.ContactPerson,
                Phone = request.Phone,
                Email = request.Email,
                TaxId = request.TaxId,
                PaymentTerms = request.PaymentTerms,
                Notes = request.Notes,
                CreatedBy = request.CreatedBy
            };

            _context.Suppliers.Add(supplier);
            await _context.SaveChangesAsync();

            return supplier;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating supplier");
            throw;
        }
    }

    public async Task<object?> UpdateSupplierAsync(string id, UpdateSupplierDto request)
    {
        try
        {
            var supplier = await _context.Suppliers.FindAsync(id);
            if (supplier == null)
                return null;

            if (!string.IsNullOrEmpty(request.Name))
                supplier.Name = request.Name;

            if (request.Address != null)
                supplier.Address = request.Address;

            if (request.ContactPerson != null)
                supplier.ContactPerson = request.ContactPerson;

            if (request.Phone != null)
                supplier.Phone = request.Phone;

            if (request.Email != null)
                supplier.Email = request.Email;

            if (request.TaxId != null)
                supplier.TaxId = request.TaxId;

            if (request.PaymentTerms != null)
                supplier.PaymentTerms = request.PaymentTerms;

            if (request.Notes != null)
                supplier.Notes = request.Notes;

            if (request.IsActive.HasValue)
                supplier.IsActive = request.IsActive.Value;

            await _context.SaveChangesAsync();

            return supplier;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating supplier {Id}", id);
            throw;
        }
    }

    public async Task<bool> DeleteSupplierAsync(string id)
    {
        try
        {
            var supplier = await _context.Suppliers.FindAsync(id);
            if (supplier == null)
                return false;

            _context.Suppliers.Remove(supplier);
            await _context.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting supplier {Id}", id);
            throw;
        }
    }

    #endregion

    #region Purchase Orders

    public async Task<object> GetPurchaseOrdersAsync(DateTime? startDate = null, DateTime? endDate = null, string? supplierId = null, string? status = null, string? search = null, decimal? minAmount = null, decimal? maxAmount = null, bool? isReceived = null, int page = 1, int limit = 20)
    {
        try
        {
            var query = _context.PurchaseOrders
                .Include(po => po.Supplier)
                .Include(po => po.Items)
                .AsQueryable();

            if (startDate.HasValue)
                query = query.Where(po => po.PurchaseDate >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(po => po.PurchaseDate <= endDate.Value);

            if (!string.IsNullOrEmpty(supplierId))
                query = query.Where(po => po.SupplierId == supplierId);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(po => po.Status == status);

            if (!string.IsNullOrEmpty(search))
                query = query.Where(po => po.PoNumber.Contains(search) || (po.ReferenceNumber ?? "").Contains(search));

            if (minAmount.HasValue)
                query = query.Where(po => po.TotalAmount >= minAmount.Value);

            if (maxAmount.HasValue)
                query = query.Where(po => po.TotalAmount <= maxAmount.Value);

            if (isReceived.HasValue)
                query = query.Where(po => po.IsReceived == isReceived.Value);

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalCount / limit);

            var purchaseOrders = await query
                .OrderByDescending(po => po.PurchaseDate)
                .Skip((page - 1) * limit)
                .Take(limit)
                .ToListAsync();

            return new
            {
                Data = purchaseOrders,
                Pagination = new
                {
                    Page = page,
                    Limit = limit,
                    Total = totalCount,
                    TotalPages = totalPages
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting purchase orders");
            throw;
        }
    }

    public async Task<object?> GetPurchaseOrderAsync(string id)
    {
        try
        {
            var purchaseOrder = await _context.PurchaseOrders
                .Include(po => po.Supplier)
                .Include(po => po.Items)
                .FirstOrDefaultAsync(po => po.Id == id);

            return purchaseOrder;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting purchase order {Id}", id);
            throw;
        }
    }

    public async Task<object> CreatePurchaseOrderAsync(CreatePurchaseOrderDto request)
    {
        try
        {
            // Generate PO number
            var poNumber = $"PO-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";

            var purchaseOrder = new PurchaseOrder
            {
                PoNumber = poNumber,
                SupplierId = request.SupplierId,
                PurchaseDate = DateTime.SpecifyKind(request.PurchaseDate, DateTimeKind.Utc),
                ReferenceNumber = request.ReferenceNumber,
                BillNumber = request.BillNumber,
                BillDate = request.BillDate.HasValue ? DateTime.SpecifyKind(request.BillDate.Value, DateTimeKind.Utc) : null,
                ExpectedDeliveryDate = request.ExpectedDeliveryDate.HasValue ? DateTime.SpecifyKind(request.ExpectedDeliveryDate.Value, DateTimeKind.Utc) : null,
                Notes = request.Notes,
                TaxAmount = request.TaxAmount,
                GstAmount = request.GstAmount,
                GstRate = request.GstRate,
                ShippingCost = request.ShippingCost,
                Currency = request.Currency,
                CreatedBy = request.CreatedBy
            };

            // Calculate totals
            decimal subtotal = 0;
            foreach (var item in request.Items)
            {
                var totalPrice = item.Quantity * item.PurchasePrice;
                subtotal += totalPrice;

                var purchaseOrderItem = new PurchaseOrderItem
                {
                    ProductId = item.ProductId,
                    VariantId = item.VariantId,
                    Sku = item.Sku,
                    ProductName = item.ProductName,
                    VariantTitle = item.VariantTitle,
                    Quantity = item.Quantity,
                    PurchasePrice = item.PurchasePrice,
                    TotalPrice = totalPrice,
                    GstAmount = item.GstAmount,
                    GstRate = item.GstRate,
                    Notes = item.Notes
                };

                purchaseOrder.Items.Add(purchaseOrderItem);
            }

            purchaseOrder.Subtotal = subtotal;
            purchaseOrder.TotalAmount = subtotal + request.TaxAmount + request.GstAmount + request.ShippingCost;
            purchaseOrder.TotalPaid = 0;
            purchaseOrder.BalanceDue = purchaseOrder.TotalAmount;

            _context.PurchaseOrders.Add(purchaseOrder);
            await _context.SaveChangesAsync();

            return purchaseOrder;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating purchase order");
            throw;
        }
    }

    public async Task<object?> UpdatePurchaseOrderAsync(string id, UpdatePurchaseOrderDto request)
    {
        try
        {
            var purchaseOrder = await _context.PurchaseOrders
                .Include(po => po.Items)
                .FirstOrDefaultAsync(po => po.Id == id);

            if (purchaseOrder == null)
                return null;

            if (!string.IsNullOrEmpty(request.SupplierId))
                purchaseOrder.SupplierId = request.SupplierId;

            if (request.PurchaseDate.HasValue)
                purchaseOrder.PurchaseDate = DateTime.SpecifyKind(request.PurchaseDate.Value, DateTimeKind.Utc);

            if (request.ReferenceNumber != null)
                purchaseOrder.ReferenceNumber = request.ReferenceNumber;

            if (request.ExpectedDeliveryDate.HasValue)
                purchaseOrder.ExpectedDeliveryDate = DateTime.SpecifyKind(request.ExpectedDeliveryDate.Value, DateTimeKind.Utc);

            if (request.Notes != null)
                purchaseOrder.Notes = request.Notes;

            if (request.TaxAmount.HasValue)
                purchaseOrder.TaxAmount = request.TaxAmount.Value;

            if (request.ShippingCost.HasValue)
                purchaseOrder.ShippingCost = request.ShippingCost.Value;

            if (!string.IsNullOrEmpty(request.Currency))
                purchaseOrder.Currency = request.Currency;

            if (!string.IsNullOrEmpty(request.Status))
                purchaseOrder.Status = request.Status;

            if (request.InvoiceUrl != null)
                purchaseOrder.InvoiceUrl = request.InvoiceUrl;

            if (request.IsReceived.HasValue)
                purchaseOrder.IsReceived = request.IsReceived.Value;

            if (request.ReceivedDate.HasValue)
                purchaseOrder.ReceivedDate = DateTime.SpecifyKind(request.ReceivedDate.Value, DateTimeKind.Utc);

            // Recalculate totals if needed
            if (request.TaxAmount.HasValue || request.ShippingCost.HasValue)
            {
                purchaseOrder.TotalAmount = purchaseOrder.Subtotal + purchaseOrder.TaxAmount + purchaseOrder.ShippingCost;
            }

            await _context.SaveChangesAsync();

            return purchaseOrder;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating purchase order {Id}", id);
            throw;
        }
    }

    public async Task<bool> DeletePurchaseOrderAsync(string id)
    {
        try
        {
            var purchaseOrder = await _context.PurchaseOrders.FindAsync(id);
            if (purchaseOrder == null)
                return false;

            _context.PurchaseOrders.Remove(purchaseOrder);
            await _context.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting purchase order {Id}", id);
            throw;
        }
    }

    public async Task<object> ReceivePurchaseOrderAsync(string id, ReceivePurchaseOrderDto request)
    {
        try
        {
            var purchaseOrder = await _context.PurchaseOrders
                .Include(po => po.Items)
                .FirstOrDefaultAsync(po => po.Id == id);

            if (purchaseOrder == null)
                throw new InvalidOperationException("Purchase order not found");

            if (purchaseOrder.Status == "cancelled")
                throw new InvalidOperationException("Cannot receive a cancelled purchase order");

            foreach (var receiveItem in request.Items)
            {
                var item = purchaseOrder.Items.FirstOrDefault(i => i.Id == receiveItem.ItemId);
                if (item != null)
                {
                    item.QuantityReceived += receiveItem.QuantityReceived;
                    item.Notes = receiveItem.Notes;
                }
            }

            purchaseOrder.IsReceived = purchaseOrder.Items.All(i => i.QuantityReceived >= i.Quantity);
            purchaseOrder.ReceivedDate = request.ReceivedDate.HasValue ? DateTime.SpecifyKind(request.ReceivedDate.Value, DateTimeKind.Utc) : DateTime.UtcNow;
            purchaseOrder.Status = purchaseOrder.IsReceived ? "received" : "ordered";
            purchaseOrder.Notes = request.Notes;

            await _context.SaveChangesAsync();

            return purchaseOrder;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error receiving purchase order {Id}", id);
            throw;
        }
    }

    public async Task<object> GetPurchaseOrderSummaryAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        try
        {
            var query = _context.PurchaseOrders.AsQueryable();

            if (startDate.HasValue)
                query = query.Where(po => po.PurchaseDate >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(po => po.PurchaseDate <= endDate.Value);

            var purchaseOrders = await query.ToListAsync();

            var summary = new PurchaseOrderSummaryDto
            {
                TotalOrders = purchaseOrders.Count,
                TotalAmount = purchaseOrders.Sum(po => po.TotalAmount),
                AverageOrderValue = purchaseOrders.Any() ? purchaseOrders.Average(po => po.TotalAmount) : 0,
                PendingOrders = purchaseOrders.Count(po => po.Status == "draft"),
                ReceivedOrders = purchaseOrders.Count(po => po.Status == "received"),
                CancelledOrders = purchaseOrders.Count(po => po.Status == "cancelled"),
                Currency = "INR"
            };

            return summary;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting purchase order summary");
            throw;
        }
    }

    #endregion

    #region Supplier Payments

    public async Task<object> GetSupplierPaymentsAsync(string? purchaseOrderId = null, string? supplierId = null, string? status = null, DateTime? startDate = null, DateTime? endDate = null, int page = 1, int limit = 20)
    {
        try
        {
            var query = _context.SupplierPayments
                .Include(sp => sp.PurchaseOrder)
                .Include(sp => sp.Supplier)
                .AsQueryable();

            if (!string.IsNullOrEmpty(purchaseOrderId))
                query = query.Where(sp => sp.PurchaseOrderId == purchaseOrderId);

            if (!string.IsNullOrEmpty(supplierId))
                query = query.Where(sp => sp.SupplierId == supplierId);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(sp => sp.Status == status);

            if (startDate.HasValue)
                query = query.Where(sp => sp.PaymentDate >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(sp => sp.PaymentDate <= endDate.Value);

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalCount / limit);

            var payments = await query
                .OrderByDescending(sp => sp.PaymentDate)
                .Skip((page - 1) * limit)
                .Take(limit)
                .ToListAsync();

            return new
            {
                Data = payments,
                Pagination = new
                {
                    Page = page,
                    Limit = limit,
                    Total = totalCount,
                    TotalPages = totalPages
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting supplier payments");
            throw;
        }
    }

    public async Task<object?> GetSupplierPaymentAsync(string id)
    {
        try
        {
            var payment = await _context.SupplierPayments
                .Include(sp => sp.PurchaseOrder)
                .Include(sp => sp.Supplier)
                .FirstOrDefaultAsync(sp => sp.Id == id);

            return payment;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting supplier payment {Id}", id);
            throw;
        }
    }

    public async Task<object> CreateSupplierPaymentAsync(CreateSupplierPaymentDto request)
    {
        try
        {
            // Generate payment number
            var paymentNumber = $"PAY-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";

            var payment = new SupplierPayment
            {
                PurchaseOrderId = request.PurchaseOrderId,
                SupplierId = request.SupplierId,
                PaymentNumber = paymentNumber,
                PaymentDate = DateTime.SpecifyKind(request.PaymentDate, DateTimeKind.Utc),
                Amount = request.Amount,
                Currency = request.Currency,
                PaymentMethod = request.PaymentMethod,
                ReferenceNumber = request.ReferenceNumber,
                Notes = request.Notes,
                Status = "pending",
                CreatedBy = request.CreatedBy
            };

            _context.SupplierPayments.Add(payment);

            // Update purchase order payment totals
            var purchaseOrder = await _context.PurchaseOrders.FindAsync(request.PurchaseOrderId);
            if (purchaseOrder != null)
            {
                purchaseOrder.TotalPaid += request.Amount;
                purchaseOrder.BalanceDue = purchaseOrder.TotalAmount - purchaseOrder.TotalPaid;
            }

            await _context.SaveChangesAsync();

            return payment;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating supplier payment");
            throw;
        }
    }

    public async Task<object?> UpdateSupplierPaymentAsync(string id, UpdateSupplierPaymentDto request)
    {
        try
        {
            var payment = await _context.SupplierPayments.FindAsync(id);
            if (payment == null)
                return null;

            if (request.PaymentDate.HasValue)
                payment.PaymentDate = DateTime.SpecifyKind(request.PaymentDate.Value, DateTimeKind.Utc);

            if (request.Amount.HasValue)
            {
                var oldAmount = payment.Amount;
                payment.Amount = request.Amount.Value;

                // Update purchase order payment totals
                var purchaseOrder = await _context.PurchaseOrders.FindAsync(payment.PurchaseOrderId);
                if (purchaseOrder != null)
                {
                    purchaseOrder.TotalPaid = purchaseOrder.TotalPaid - oldAmount + request.Amount.Value;
                    purchaseOrder.BalanceDue = purchaseOrder.TotalAmount - purchaseOrder.TotalPaid;
                }
            }

            if (!string.IsNullOrEmpty(request.Currency))
                payment.Currency = request.Currency;

            if (!string.IsNullOrEmpty(request.PaymentMethod))
                payment.PaymentMethod = request.PaymentMethod;

            if (request.ReferenceNumber != null)
                payment.ReferenceNumber = request.ReferenceNumber;

            if (request.Notes != null)
                payment.Notes = request.Notes;

            if (!string.IsNullOrEmpty(request.Status))
                payment.Status = request.Status;

            await _context.SaveChangesAsync();

            return payment;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating supplier payment {Id}", id);
            throw;
        }
    }

    public async Task<bool> DeleteSupplierPaymentAsync(string id)
    {
        try
        {
            var payment = await _context.SupplierPayments.FindAsync(id);
            if (payment == null)
                return false;

            // Update purchase order payment totals
            var purchaseOrder = await _context.PurchaseOrders.FindAsync(payment.PurchaseOrderId);
            if (purchaseOrder != null)
            {
                purchaseOrder.TotalPaid -= payment.Amount;
                purchaseOrder.BalanceDue = purchaseOrder.TotalAmount - purchaseOrder.TotalPaid;
            }

            _context.SupplierPayments.Remove(payment);
            await _context.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting supplier payment {Id}", id);
            throw;
        }
    }

    #endregion

    // ===== PURCHASE ORDER JOURNEY WORKFLOW METHODS =====
    
    public async Task<PurchaseOrderWorkflowDto> GetPurchaseOrderWorkflowAsync(string id)
    {
        try
        {
            var purchaseOrder = await _context.PurchaseOrders
                .Include(po => po.Journey.OrderBy(j => j.CreatedAt))
                .Include(po => po.Supplier)
                .FirstOrDefaultAsync(po => po.Id == id);

            if (purchaseOrder == null)
                throw new ArgumentException("Purchase order not found");

            var availableTransitions = GetAvailableStatusTransitions(purchaseOrder.Status);
            
            return new PurchaseOrderWorkflowDto
            {
                Id = purchaseOrder.Id,
                PoNumber = purchaseOrder.PoNumber,
                Status = purchaseOrder.Status,
                Journey = purchaseOrder.Journey.Select(MapToJourneyDto).ToList(),
                AvailableTransitions = availableTransitions,
                CreatedAt = purchaseOrder.CreatedAt,
                UpdatedAt = purchaseOrder.UpdatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting purchase order workflow {Id}", id);
            throw;
        }
    }

    public async Task<PurchaseOrderDto> UpdatePurchaseOrderStatusAsync(string id, UpdatePurchaseOrderStatusDto request)
    {
        try
        {
            var purchaseOrder = await _context.PurchaseOrders
                .Include(po => po.Journey)
                .Include(po => po.Items)
                .Include(po => po.Supplier)
                .FirstOrDefaultAsync(po => po.Id == id);

            if (purchaseOrder == null)
                throw new ArgumentException("Purchase order not found");

            var availableTransitions = GetAvailableStatusTransitions(purchaseOrder.Status);
            if (!availableTransitions.AvailableTransitions.Contains(request.NewStatus))
            {
                throw new InvalidOperationException($"Invalid status transition from {purchaseOrder.Status} to {request.NewStatus}");
            }

            var oldStatus = purchaseOrder.Status;
            purchaseOrder.Status = request.NewStatus;
            purchaseOrder.UpdatedAt = DateTime.UtcNow;

            // Set appropriate timestamps and user tracking based on new status
            switch (request.NewStatus.ToLower())
            {
                case "sent":
                    purchaseOrder.SentDate = DateTime.UtcNow;
                    purchaseOrder.SentBy = request.ActionBy;
                    break;
                case "confirmed":
                    purchaseOrder.ConfirmedDate = DateTime.UtcNow;
                    purchaseOrder.ConfirmedBy = request.ActionBy;
                    break;
                case "intransit":
                    purchaseOrder.InTransitDate = DateTime.UtcNow;
                    break;
                case "onhold":
                    purchaseOrder.OnHoldDate = DateTime.UtcNow;
                    purchaseOrder.OnHoldBy = request.ActionBy;
                    purchaseOrder.OnHoldReason = request.Notes;
                    break;
                case "disputed":
                    purchaseOrder.DisputedDate = DateTime.UtcNow;
                    purchaseOrder.DisputedBy = request.ActionBy;
                    purchaseOrder.DisputeReason = request.Notes;
                    break;
                case "received":
                    purchaseOrder.IsReceived = true;
                    purchaseOrder.ReceivedDate = DateTime.UtcNow;
                    break;
            }

            // Create journey entry
            var journeyEntry = new PurchaseOrderJourney
            {
                PurchaseOrderId = purchaseOrder.Id,
                FromStatus = oldStatus,
                ToStatus = request.NewStatus,
                Notes = request.Notes,
                ActionBy = request.ActionBy,
                CreatedAt = DateTime.UtcNow
            };

            _context.PurchaseOrderJourneys.Add(journeyEntry);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated purchase order {Id} status from {OldStatus} to {NewStatus} by {ActionBy}", 
                id, oldStatus, request.NewStatus, request.ActionBy);

            return MapToPurchaseOrderDto(purchaseOrder);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating purchase order status {Id}", id);
            throw;
        }
    }

    public async Task<PurchaseOrderStatusTransitionDto> GetAvailableStatusTransitionsAsync(string id)
    {
        try
        {
            var purchaseOrder = await _context.PurchaseOrders
                .FirstOrDefaultAsync(po => po.Id == id);

            if (purchaseOrder == null)
                throw new ArgumentException("Purchase order not found");

            return GetAvailableStatusTransitions(purchaseOrder.Status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available status transitions for purchase order {Id}", id);
            throw;
        }
    }

    private PurchaseOrderStatusTransitionDto GetAvailableStatusTransitions(string currentStatus)
    {
        var transitions = new Dictionary<string, List<string>>
        {
            ["draft"] = new List<string> { "pending", "cancelled" },
            ["pending"] = new List<string> { "approved", "cancelled", "onhold" },
            ["approved"] = new List<string> { "sent", "cancelled", "onhold" },
            ["sent"] = new List<string> { "confirmed", "cancelled", "onhold", "disputed" },
            ["confirmed"] = new List<string> { "intransit", "cancelled", "onhold", "disputed" },
            ["intransit"] = new List<string> { "partiallyreceived", "received", "cancelled", "onhold", "disputed" },
            ["partiallyreceived"] = new List<string> { "received", "cancelled", "onhold", "disputed" },
            ["received"] = new List<string> { "partiallypaid", "paid", "cancelled", "onhold", "disputed" },
            ["partiallypaid"] = new List<string> { "paid", "cancelled", "onhold", "disputed" },
            ["paid"] = new List<string> { "cancelled" },
            ["onhold"] = new List<string> { "pending", "approved", "sent", "confirmed", "intransit", "cancelled" },
            ["disputed"] = new List<string> { "sent", "confirmed", "intransit", "cancelled" },
            ["cancelled"] = new List<string> { }
        };

        var availableTransitions = transitions.ContainsKey(currentStatus.ToLower()) 
            ? transitions[currentStatus.ToLower()] 
            : new List<string>();

        return new PurchaseOrderStatusTransitionDto
        {
            CurrentStatus = currentStatus,
            AvailableTransitions = availableTransitions,
            CanTransition = availableTransitions.Any(),
            TransitionMessage = availableTransitions.Any() 
                ? $"Available transitions: {string.Join(", ", availableTransitions)}"
                : "No transitions available from current status"
        };
    }

    public async Task<List<PurchaseOrderJourneyDto>> GetPurchaseOrderJourneyAsync(string id)
    {
        try
        {
            var journey = await _context.PurchaseOrderJourneys
                .Where(j => j.PurchaseOrderId == id)
                .OrderBy(j => j.CreatedAt)
                .ToListAsync();

            return journey.Select(MapToJourneyDto).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting purchase order journey {Id}", id);
            throw;
        }
    }

    private PurchaseOrderJourneyDto MapToJourneyDto(PurchaseOrderJourney journey)
    {
        return new PurchaseOrderJourneyDto
        {
            Id = journey.Id,
            PurchaseOrderId = journey.PurchaseOrderId,
            FromStatus = journey.FromStatus,
            ToStatus = journey.ToStatus,
            Notes = journey.Notes,
            ActionBy = journey.ActionBy,
            CreatedAt = journey.CreatedAt
        };
    }

    // Enhanced mapping method for PurchaseOrderDto
    private PurchaseOrderDto MapToPurchaseOrderDto(PurchaseOrder purchaseOrder)
    {
        return new PurchaseOrderDto
        {
            Id = purchaseOrder.Id,
            PoNumber = purchaseOrder.PoNumber,
            SupplierId = purchaseOrder.SupplierId,
            Supplier = MapToSupplierDto(purchaseOrder.Supplier),
            PurchaseDate = purchaseOrder.PurchaseDate,
            ReferenceNumber = purchaseOrder.ReferenceNumber,
            BillNumber = purchaseOrder.BillNumber,
            BillDate = purchaseOrder.BillDate,
            ExpectedDeliveryDate = purchaseOrder.ExpectedDeliveryDate,
            Notes = purchaseOrder.Notes,
            Subtotal = purchaseOrder.Subtotal,
            TaxAmount = purchaseOrder.TaxAmount,
            GstAmount = purchaseOrder.GstAmount,
            GstRate = purchaseOrder.GstRate,
            ShippingCost = purchaseOrder.ShippingCost,
            TotalAmount = purchaseOrder.TotalAmount,
            TotalPaid = purchaseOrder.TotalPaid,
            BalanceDue = purchaseOrder.BalanceDue,
            Currency = purchaseOrder.Currency,
            Status = purchaseOrder.Status,
            InvoiceUrl = purchaseOrder.InvoiceUrl,
            IsReceived = purchaseOrder.IsReceived,
            ReceivedDate = purchaseOrder.ReceivedDate,
            CreatedBy = purchaseOrder.CreatedBy,
            CreatedAt = purchaseOrder.CreatedAt,
            UpdatedAt = purchaseOrder.UpdatedAt,
            
            // Enhanced workflow fields
            SentDate = purchaseOrder.SentDate,
            ConfirmedDate = purchaseOrder.ConfirmedDate,
            InTransitDate = purchaseOrder.InTransitDate,
            OnHoldDate = purchaseOrder.OnHoldDate,
            DisputedDate = purchaseOrder.DisputedDate,
            SentBy = purchaseOrder.SentBy,
            ConfirmedBy = purchaseOrder.ConfirmedBy,
            OnHoldBy = purchaseOrder.OnHoldBy,
            DisputedBy = purchaseOrder.DisputedBy,
            OnHoldReason = purchaseOrder.OnHoldReason,
            DisputeReason = purchaseOrder.DisputeReason,
            
            Items = purchaseOrder.Items?.Select(MapToPurchaseOrderItemDto).ToList() ?? new List<PurchaseOrderItemDto>(),
            Payments = purchaseOrder.Payments?.Select(MapToSupplierPaymentDto).ToList() ?? new List<SupplierPaymentDto>(),
            Journey = purchaseOrder.Journey?.Select(MapToJourneyDto).ToList() ?? new List<PurchaseOrderJourneyDto>()
        };
    }

    // Mapping methods for related entities
    private SupplierDto MapToSupplierDto(Supplier supplier)
    {
        return new SupplierDto
        {
            Id = supplier.Id,
            Name = supplier.Name,
            Address = supplier.Address,
            ContactPerson = supplier.ContactPerson,
            Phone = supplier.Phone,
            Email = supplier.Email,
            TaxId = supplier.TaxId,
            PaymentTerms = supplier.PaymentTerms,
            Notes = supplier.Notes,
            IsActive = supplier.IsActive,
            CreatedBy = supplier.CreatedBy,
            CreatedAt = supplier.CreatedAt,
            UpdatedAt = supplier.UpdatedAt
        };
    }

    private PurchaseOrderItemDto MapToPurchaseOrderItemDto(PurchaseOrderItem item)
    {
        return new PurchaseOrderItemDto
        {
            Id = item.Id,
            PurchaseOrderId = item.PurchaseOrderId,
            ProductId = item.ProductId,
            VariantId = item.VariantId,
            Sku = item.Sku,
            ProductName = item.ProductName,
            VariantTitle = item.VariantTitle,
            Quantity = item.Quantity,
            PurchasePrice = item.PurchasePrice,
            TotalPrice = item.TotalPrice,
            GstAmount = item.GstAmount,
            GstRate = item.GstRate,
            QuantityReceived = item.QuantityReceived,
            Notes = item.Notes,
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt
        };
    }

    private SupplierPaymentDto MapToSupplierPaymentDto(SupplierPayment payment)
    {
        return new SupplierPaymentDto
        {
            Id = payment.Id,
            PurchaseOrderId = payment.PurchaseOrderId,
            SupplierId = payment.SupplierId,
            PaymentNumber = payment.PaymentNumber,
            PaymentDate = payment.PaymentDate,
            Amount = payment.Amount,
            Currency = payment.Currency,
            PaymentMethod = payment.PaymentMethod,
            ReferenceNumber = payment.ReferenceNumber,
            Notes = payment.Notes,
            Status = payment.Status,
            CreatedBy = payment.CreatedBy,
            CreatedAt = payment.CreatedAt,
            UpdatedAt = payment.UpdatedAt
        };
    }

    #region Accounting System

    public async Task<object> GetAccountGroupsAsync(AccountGroupFilterDto? filter = null)
    {
        try
        {
            var query = _context.AccountGroups.AsQueryable();

            if (filter != null)
            {
                if (filter.Types?.Any() == true)
                    query = query.Where(ag => filter.Types.Contains(ag.Type));
                
                if (filter.IsActive.HasValue)
                    query = query.Where(ag => ag.IsActive == filter.IsActive.Value);
                
                if (!string.IsNullOrEmpty(filter.Search))
                    query = query.Where(ag => ag.Name.Contains(filter.Search) || (ag.Description != null && ag.Description.Contains(filter.Search)));
            }

            var accountGroups = await query
                .Include(ag => ag.Ledgers)
                .OrderBy(ag => ag.Type)
                .ThenBy(ag => ag.Name)
                .Skip((filter?.Page - 1 ?? 0) * (filter?.Limit ?? 20))
                .Take(filter?.Limit ?? 20)
                .ToListAsync();

            var result = accountGroups.Select(ag => new AccountGroupDto
            {
                Id = ag.Id,
                Name = ag.Name,
                Type = ag.Type,
                Description = ag.Description,
                IsActive = ag.IsActive,
                CreatedAt = ag.CreatedAt,
                UpdatedAt = ag.UpdatedAt,
                Ledgers = ag.Ledgers.Select(l => new LedgerDto
                {
                    Id = l.Id,
                    Name = l.Name,
                    GroupId = l.GroupId,
                    OpeningBalance = l.OpeningBalance,
                    Description = l.Description,
                    IsActive = l.IsActive,
                    CreatedBy = l.CreatedBy,
                    CreatedAt = l.CreatedAt,
                    UpdatedAt = l.UpdatedAt,
                    CurrentBalance = 0 // Will be calculated separately
                }).ToList()
            }).ToList();

            return new
            {
                AccountGroups = result,
                TotalCount = await query.CountAsync(),
                Page = filter?.Page ?? 1,
                Limit = filter?.Limit ?? 20
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting account groups");
            throw;
        }
    }

    public async Task<object?> GetAccountGroupAsync(string id)
    {
        try
        {
            var accountGroup = await _context.AccountGroups
                .Include(ag => ag.Ledgers)
                .FirstOrDefaultAsync(ag => ag.Id == id);

            if (accountGroup == null)
                return null;

            return new AccountGroupDto
            {
                Id = accountGroup.Id,
                Name = accountGroup.Name,
                Type = accountGroup.Type,
                Description = accountGroup.Description,
                IsActive = accountGroup.IsActive,
                CreatedAt = accountGroup.CreatedAt,
                UpdatedAt = accountGroup.UpdatedAt,
                Ledgers = accountGroup.Ledgers.Select(l => new LedgerDto
                {
                    Id = l.Id,
                    Name = l.Name,
                    GroupId = l.GroupId,
                    OpeningBalance = l.OpeningBalance,
                    Description = l.Description,
                    IsActive = l.IsActive,
                    CreatedBy = l.CreatedBy,
                    CreatedAt = l.CreatedAt,
                    UpdatedAt = l.UpdatedAt,
                    CurrentBalance = 0 // Will be calculated separately
                }).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting account group {Id}", id);
            throw;
        }
    }

    public async Task<object> CreateAccountGroupAsync(CreateAccountGroupDto request)
    {
        try
        {
            var accountGroup = new AccountGroup
            {
                Name = request.Name,
                Type = request.Type,
                Description = request.Description
            };

            _context.AccountGroups.Add(accountGroup);
            await _context.SaveChangesAsync();

            return new AccountGroupDto
            {
                Id = accountGroup.Id,
                Name = accountGroup.Name,
                Type = accountGroup.Type,
                Description = accountGroup.Description,
                IsActive = accountGroup.IsActive,
                CreatedAt = accountGroup.CreatedAt,
                UpdatedAt = accountGroup.UpdatedAt,
                Ledgers = new List<LedgerDto>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating account group");
            throw;
        }
    }

    public async Task<object?> UpdateAccountGroupAsync(string id, UpdateAccountGroupDto request)
    {
        try
        {
            var accountGroup = await _context.AccountGroups.FindAsync(id);
            if (accountGroup == null)
                return null;

            if (!string.IsNullOrEmpty(request.Name))
                accountGroup.Name = request.Name;
            
            if (!string.IsNullOrEmpty(request.Type))
                accountGroup.Type = request.Type;
            
            if (request.Description != null)
                accountGroup.Description = request.Description;
            
            if (request.IsActive.HasValue)
                accountGroup.IsActive = request.IsActive.Value;

            await _context.SaveChangesAsync();

            return new AccountGroupDto
            {
                Id = accountGroup.Id,
                Name = accountGroup.Name,
                Type = accountGroup.Type,
                Description = accountGroup.Description,
                IsActive = accountGroup.IsActive,
                CreatedAt = accountGroup.CreatedAt,
                UpdatedAt = accountGroup.UpdatedAt,
                Ledgers = new List<LedgerDto>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating account group {Id}", id);
            throw;
        }
    }

    public async Task<bool> DeleteAccountGroupAsync(string id)
    {
        try
        {
            var accountGroup = await _context.AccountGroups
                .Include(ag => ag.Ledgers)
                .FirstOrDefaultAsync(ag => ag.Id == id);

            if (accountGroup == null)
                return false;

            if (accountGroup.Ledgers.Any())
                throw new InvalidOperationException("Cannot delete account group with existing ledgers");

            _context.AccountGroups.Remove(accountGroup);
            await _context.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting account group {Id}", id);
            throw;
        }
    }

    public async Task<object> GetLedgersAsync(LedgerFilterDto? filter = null)
    {
        try
        {
            var query = _context.Ledgers
                .Include(l => l.Group)
                .AsQueryable();

            if (filter != null)
            {
                if (!string.IsNullOrEmpty(filter.GroupId))
                    query = query.Where(l => l.GroupId == filter.GroupId);
                
                if (filter.Types?.Any() == true)
                    query = query.Where(l => filter.Types.Contains(l.Group.Type));
                
                if (filter.IsActive.HasValue)
                    query = query.Where(l => l.IsActive == filter.IsActive.Value);
                
                if (!string.IsNullOrEmpty(filter.Search))
                    query = query.Where(l => (l.Name != null && l.Name.Contains(filter.Search)) || (l.Description != null && l.Description.Contains(filter.Search)));
                
                if (!string.IsNullOrEmpty(filter.CreatedBy))
                    query = query.Where(l => l.CreatedBy == filter.CreatedBy);
            }

            var ledgers = await query
                .OrderBy(l => l.Group.Name)
                .ThenBy(l => l.Name)
                .Skip((filter?.Page - 1 ?? 0) * (filter?.Limit ?? 20))
                .Take(filter?.Limit ?? 20)
                .ToListAsync();

            var result = new List<LedgerDto>();
            foreach (var l in ledgers)
            {
                var currentBalance = await CalculateLedgerBalanceAsync(l.Id);
                result.Add(new LedgerDto
                {
                    Id = l.Id,
                    Name = l.Name,
                    GroupId = l.GroupId,
                    Group = new AccountGroupDto
                    {
                        Id = l.Group.Id,
                        Name = l.Group.Name,
                        Type = l.Group.Type,
                        Description = l.Group.Description,
                        IsActive = l.Group.IsActive,
                        CreatedAt = l.Group.CreatedAt,
                        UpdatedAt = l.Group.UpdatedAt,
                        Ledgers = new List<LedgerDto>()
                    },
                    OpeningBalance = l.OpeningBalance,
                    Description = l.Description,
                    IsActive = l.IsActive,
                    CreatedBy = l.CreatedBy,
                    CreatedAt = l.CreatedAt,
                    UpdatedAt = l.UpdatedAt,
                    CurrentBalance = currentBalance
                });
            }

            return new
            {
                Ledgers = result,
                TotalCount = await query.CountAsync(),
                Page = filter?.Page ?? 1,
                Limit = filter?.Limit ?? 20
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting ledgers");
            throw;
        }
    }

    public async Task<object?> GetLedgerAsync(string id)
    {
        try
        {
            var ledger = await _context.Ledgers
                .Include(l => l.Group)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (ledger == null)
                return null;

            var currentBalance = await CalculateLedgerBalanceAsync(ledger.Id);
            return new LedgerDto
            {
                Id = ledger.Id,
                Name = ledger.Name,
                GroupId = ledger.GroupId,
                Group = new AccountGroupDto
                {
                    Id = ledger.Group.Id,
                    Name = ledger.Group.Name,
                    Type = ledger.Group.Type,
                    Description = ledger.Group.Description,
                    IsActive = ledger.Group.IsActive,
                    CreatedAt = ledger.Group.CreatedAt,
                    UpdatedAt = ledger.Group.UpdatedAt,
                    Ledgers = new List<LedgerDto>()
                },
                OpeningBalance = ledger.OpeningBalance,
                Description = ledger.Description,
                IsActive = ledger.IsActive,
                CreatedBy = ledger.CreatedBy,
                CreatedAt = ledger.CreatedAt,
                UpdatedAt = ledger.UpdatedAt,
                CurrentBalance = currentBalance
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting ledger {Id}", id);
            throw;
        }
    }

    public async Task<object> CreateLedgerAsync(CreateLedgerDto request)
    {
        try
        {
            var accountGroup = await _context.AccountGroups.FindAsync(request.GroupId);
            if (accountGroup == null)
                throw new InvalidOperationException("Account group not found");

            var ledger = new Ledger
            {
                Name = request.Name,
                GroupId = request.GroupId,
                OpeningBalance = request.OpeningBalance,
                Description = request.Description,
                CreatedBy = request.CreatedBy
            };

            _context.Ledgers.Add(ledger);
            await _context.SaveChangesAsync();

            return new LedgerDto
            {
                Id = ledger.Id,
                Name = ledger.Name,
                GroupId = ledger.GroupId,
                Group = new AccountGroupDto
                {
                    Id = accountGroup.Id,
                    Name = accountGroup.Name,
                    Type = accountGroup.Type,
                    Description = accountGroup.Description,
                    IsActive = accountGroup.IsActive,
                    CreatedAt = accountGroup.CreatedAt,
                    UpdatedAt = accountGroup.UpdatedAt,
                    Ledgers = new List<LedgerDto>()
                },
                OpeningBalance = ledger.OpeningBalance,
                Description = ledger.Description,
                IsActive = ledger.IsActive,
                CreatedBy = ledger.CreatedBy,
                CreatedAt = ledger.CreatedAt,
                UpdatedAt = ledger.UpdatedAt,
                CurrentBalance = ledger.OpeningBalance
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating ledger");
            throw;
        }
    }

    public async Task<object?> UpdateLedgerAsync(string id, UpdateLedgerDto request)
    {
        try
        {
            var ledger = await _context.Ledgers.FindAsync(id);
            if (ledger == null)
                return null;

            if (!string.IsNullOrEmpty(request.Name))
                ledger.Name = request.Name;
            
            if (!string.IsNullOrEmpty(request.GroupId))
            {
                var accountGroup = await _context.AccountGroups.FindAsync(request.GroupId);
                if (accountGroup == null)
                    throw new InvalidOperationException("Account group not found");
                ledger.GroupId = request.GroupId;
            }
            
            if (request.OpeningBalance.HasValue)
                ledger.OpeningBalance = request.OpeningBalance.Value;
            
            if (request.Description != null)
                ledger.Description = request.Description;
            
            if (request.IsActive.HasValue)
                ledger.IsActive = request.IsActive.Value;

            await _context.SaveChangesAsync();

            var updatedLedger = await _context.Ledgers
                .Include(l => l.Group)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (updatedLedger == null)
                throw new InvalidOperationException("Ledger not found after update.");
            if (updatedLedger.Group == null)
                throw new InvalidOperationException("Ledger group not found after update.");

            var currentBalance = await CalculateLedgerBalanceAsync(updatedLedger.Id);
            return new LedgerDto
            {
                Id = updatedLedger.Id,
                Name = updatedLedger.Name,
                GroupId = updatedLedger.GroupId,
                Group = new AccountGroupDto
                {
                    Id = updatedLedger.Group.Id,
                    Name = updatedLedger.Group.Name,
                    Type = updatedLedger.Group.Type,
                    Description = updatedLedger.Group.Description,
                    IsActive = updatedLedger.Group.IsActive,
                    CreatedAt = updatedLedger.Group.CreatedAt,
                    UpdatedAt = updatedLedger.Group.UpdatedAt,
                    Ledgers = new List<LedgerDto>()
                },
                OpeningBalance = updatedLedger.OpeningBalance,
                Description = updatedLedger.Description,
                IsActive = updatedLedger.IsActive,
                CreatedBy = updatedLedger.CreatedBy,
                CreatedAt = updatedLedger.CreatedAt,
                UpdatedAt = updatedLedger.UpdatedAt,
                CurrentBalance = currentBalance
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating ledger {Id}", id);
            throw;
        }
    }

    public async Task<bool> DeleteLedgerAsync(string id)
    {
        try
        {
            var ledger = await _context.Ledgers
                .Include(l => l.TransactionEntries)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (ledger == null)
                return false;

            if (ledger.TransactionEntries.Any())
                throw new InvalidOperationException("Cannot delete ledger with existing transactions");

            _context.Ledgers.Remove(ledger);
            await _context.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting ledger {Id}", id);
            throw;
        }
    }

    public async Task<object> GetTransactionsAsync(TransactionFilterDto? filter = null)
    {
        try
        {
            var query = _context.Transactions
                .Include(t => t.Entries)
                .ThenInclude(e => e.Ledger)
                .ThenInclude(l => l.Group)
                .AsQueryable();

            if (filter != null)
            {
                if (filter.StartDate.HasValue)
                    query = query.Where(t => t.Date >= filter.StartDate.Value);
                
                if (filter.EndDate.HasValue)
                    query = query.Where(t => t.Date <= filter.EndDate.Value);
                
                if (filter.Types?.Any() == true)
                    query = query.Where(t => filter.Types.Contains(t.Type));
                
                if (filter.Statuses?.Any() == true)
                    query = query.Where(t => filter.Statuses.Contains(t.Status));
                
                if (!string.IsNullOrEmpty(filter.Search))
                    query = query.Where(t => (t.Description != null && t.Description.Contains(filter.Search)) || (t.Notes != null && t.Notes.Contains(filter.Search)));
                
                if (!string.IsNullOrEmpty(filter.CreatedBy))
                    query = query.Where(t => t.CreatedBy == filter.CreatedBy);
            }

            var transactions = await query
                .OrderByDescending(t => t.Date)
                .ThenByDescending(t => t.CreatedAt)
                .Skip((filter?.Page - 1 ?? 0) * (filter?.Limit ?? 20))
                .Take(filter?.Limit ?? 20)
                .ToListAsync();

            var result = transactions.Select(t => new TransactionDto
            {
                Id = t.Id,
                Date = t.Date,
                Type = t.Type,
                Description = t.Description,
                CreatedBy = t.CreatedBy,
                Status = t.Status,
                Notes = t.Notes,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt,
                Entries = t.Entries.Select(e => new TransactionEntryDto
                {
                    Id = e.Id,
                    TransactionId = e.TransactionId,
                    LedgerId = e.LedgerId,
                    Ledger = new LedgerDto
                    {
                        Id = e.Ledger.Id,
                        Name = e.Ledger.Name,
                        GroupId = e.Ledger.GroupId,
                        Group = new AccountGroupDto
                        {
                            Id = e.Ledger.Group.Id,
                            Name = e.Ledger.Group.Name,
                            Type = e.Ledger.Group.Type,
                            Description = e.Ledger.Group.Description,
                            IsActive = e.Ledger.Group.IsActive,
                            CreatedAt = e.Ledger.Group.CreatedAt,
                            UpdatedAt = e.Ledger.Group.UpdatedAt,
                            Ledgers = new List<LedgerDto>()
                        },
                        OpeningBalance = e.Ledger.OpeningBalance,
                        Description = e.Ledger.Description,
                        IsActive = e.Ledger.IsActive,
                        CreatedBy = e.Ledger.CreatedBy,
                        CreatedAt = e.Ledger.CreatedAt,
                        UpdatedAt = e.Ledger.UpdatedAt,
                        CurrentBalance = 0
                    },
                    IsDebit = e.IsDebit,
                    Amount = e.Amount,
                    Description = e.Description,
                    CreatedAt = e.CreatedAt,
                    UpdatedAt = e.UpdatedAt
                }).ToList(),
                TotalDebit = t.Entries.Where(e => e.IsDebit).Sum(e => e.Amount),
                TotalCredit = t.Entries.Where(e => !e.IsDebit).Sum(e => e.Amount),
                IsBalanced = t.Entries.Where(e => e.IsDebit).Sum(e => e.Amount) == t.Entries.Where(e => !e.IsDebit).Sum(e => e.Amount)
            }).ToList();

            return new
            {
                Transactions = result,
                TotalCount = await query.CountAsync(),
                Page = filter?.Page ?? 1,
                Limit = filter?.Limit ?? 20
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transactions");
            throw;
        }
    }

    public async Task<object?> GetTransactionAsync(string id)
    {
        try
        {
            var transaction = await _context.Transactions
                .Include(t => t.Entries)
                .ThenInclude(e => e.Ledger)
                .ThenInclude(l => l.Group)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (transaction == null)
                return null;

            return new TransactionDto
            {
                Id = transaction.Id,
                Date = transaction.Date,
                Type = transaction.Type,
                Description = transaction.Description,
                CreatedBy = transaction.CreatedBy,
                Status = transaction.Status,
                Notes = transaction.Notes,
                CreatedAt = transaction.CreatedAt,
                UpdatedAt = transaction.UpdatedAt,
                Entries = transaction.Entries.Select(e => new TransactionEntryDto
                {
                    Id = e.Id,
                    TransactionId = e.TransactionId,
                    LedgerId = e.LedgerId,
                    Ledger = new LedgerDto
                    {
                        Id = e.Ledger.Id,
                        Name = e.Ledger.Name,
                        GroupId = e.Ledger.GroupId,
                        Group = new AccountGroupDto
                        {
                            Id = e.Ledger.Group.Id,
                            Name = e.Ledger.Group.Name,
                            Type = e.Ledger.Group.Type,
                            Description = e.Ledger.Group.Description,
                            IsActive = e.Ledger.Group.IsActive,
                            CreatedAt = e.Ledger.Group.CreatedAt,
                            UpdatedAt = e.Ledger.Group.UpdatedAt,
                            Ledgers = new List<LedgerDto>()
                        },
                        OpeningBalance = e.Ledger.OpeningBalance,
                        Description = e.Ledger.Description,
                        IsActive = e.Ledger.IsActive,
                        CreatedBy = e.Ledger.CreatedBy,
                        CreatedAt = e.Ledger.CreatedAt,
                        UpdatedAt = e.Ledger.UpdatedAt,
                        CurrentBalance = 0
                    },
                    IsDebit = e.IsDebit,
                    Amount = e.Amount,
                    Description = e.Description,
                    CreatedAt = e.CreatedAt,
                    UpdatedAt = e.UpdatedAt
                }).ToList(),
                TotalDebit = transaction.Entries.Where(e => e.IsDebit).Sum(e => e.Amount),
                TotalCredit = transaction.Entries.Where(e => !e.IsDebit).Sum(e => e.Amount),
                IsBalanced = transaction.Entries.Where(e => e.IsDebit).Sum(e => e.Amount) == transaction.Entries.Where(e => !e.IsDebit).Sum(e => e.Amount)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transaction {Id}", id);
            throw;
        }
    }

    public async Task<object> CreateTransactionAsync(CreateTransactionDto request)
    {
        try
        {
            // Validate that debits equal credits
            var totalDebit = request.Entries.Where(e => e.IsDebit).Sum(e => e.Amount);
            var totalCredit = request.Entries.Where(e => !e.IsDebit).Sum(e => e.Amount);
            
            if (totalDebit != totalCredit)
                throw new InvalidOperationException("Transaction must be balanced: total debits must equal total credits");

            // Validate that all ledgers exist
            var ledgerIds = request.Entries.Select(e => e.LedgerId).Distinct().ToList();
            var ledgers = await _context.Ledgers.Where(l => ledgerIds.Contains(l.Id)).ToListAsync();
            
            if (ledgers.Count != ledgerIds.Count)
                throw new InvalidOperationException("One or more ledgers not found");

            var transaction = new Transaction
            {
                Date = DateTime.SpecifyKind(request.Date, DateTimeKind.Utc),
                Type = request.Type,
                Description = request.Description,
                CreatedBy = request.CreatedBy,
                Notes = request.Notes,
                Status = "draft"
            };

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            // Create transaction entries
            var entries = request.Entries.Select(e => new TransactionEntry
            {
                TransactionId = transaction.Id,
                LedgerId = e.LedgerId,
                IsDebit = e.IsDebit,
                Amount = e.Amount,
                Description = e.Description
            }).ToList();

            _context.TransactionEntries.AddRange(entries);
            await _context.SaveChangesAsync();

            var result = await GetTransactionAsync(transaction.Id);
            if (result == null)
                throw new InvalidOperationException("Transaction not found after creation.");
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating transaction");
            throw;
        }
    }

    public async Task<object?> UpdateTransactionAsync(string id, UpdateTransactionDto request)
    {
        try
        {
            var transaction = await _context.Transactions
                .Include(t => t.Entries)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (transaction == null)
                return null;

            if (transaction.Status == "posted")
                throw new InvalidOperationException("Cannot update posted transaction");

            if (request.Date.HasValue)
                transaction.Date = DateTime.SpecifyKind(request.Date.Value, DateTimeKind.Utc);
            
            if (!string.IsNullOrEmpty(request.Type))
                transaction.Type = request.Type;
            
            if (request.Description != null)
                transaction.Description = request.Description;
            
            if (request.Notes != null)
                transaction.Notes = request.Notes;
            
            if (!string.IsNullOrEmpty(request.Status))
                transaction.Status = request.Status;

            // Update entries if provided
            if (request.Entries != null)
            {
                // Validate that debits equal credits
                var totalDebit = request.Entries.Where(e => e.IsDebit).Sum(e => e.Amount);
                var totalCredit = request.Entries.Where(e => !e.IsDebit).Sum(e => e.Amount);
                
                if (totalDebit != totalCredit)
                    throw new InvalidOperationException("Transaction must be balanced: total debits must equal total credits");

                // Remove existing entries
                _context.TransactionEntries.RemoveRange(transaction.Entries);

                // Add new entries
                var entries = request.Entries.Select(e => new TransactionEntry
                {
                    TransactionId = transaction.Id,
                    LedgerId = e.LedgerId,
                    IsDebit = e.IsDebit,
                    Amount = e.Amount,
                    Description = e.Description
                }).ToList();

                _context.TransactionEntries.AddRange(entries);
            }

            await _context.SaveChangesAsync();

            return await GetTransactionAsync(transaction.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating transaction {Id}", id);
            throw;
        }
    }

    public async Task<bool> DeleteTransactionAsync(string id)
    {
        try
        {
            var transaction = await _context.Transactions
                .Include(t => t.Entries)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (transaction == null)
                return false;

            if (transaction.Status == "posted")
                throw new InvalidOperationException("Cannot delete posted transaction");

            _context.TransactionEntries.RemoveRange(transaction.Entries);
            _context.Transactions.Remove(transaction);
            await _context.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting transaction {Id}", id);
            throw;
        }
    }

    public async Task<bool> ApproveTransactionAsync(string id)
    {
        try
        {
            var transaction = await _context.Transactions
                .Include(t => t.Entries)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (transaction == null)
                return false;

            // Only allow approval of draft transactions
            if (transaction.Status != "draft" && transaction.Status != "Draft" && transaction.Status != "pending" && transaction.Status != "PENDING")
            {
                _logger.LogWarning("Cannot approve transaction {Id} with status {Status}", id, transaction.Status);
                return false;
            }

            // Update transaction status to approved
            transaction.Status = "approved";
            transaction.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Transaction {Id} approved successfully", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving transaction {Id}", id);
            throw;
        }
    }

    public async Task<bool> RejectTransactionAsync(string id)
    {
        try
        {
            var transaction = await _context.Transactions
                .Include(t => t.Entries)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (transaction == null)
                return false;

            // Only allow rejection of draft transactions
            if (transaction.Status != "draft" && transaction.Status != "Draft" && transaction.Status != "pending" && transaction.Status != "PENDING")
            {
                _logger.LogWarning("Cannot reject transaction {Id} with status {Status}", id, transaction.Status);
                return false;
            }

            // Update transaction status to rejected
            transaction.Status = "rejected";
            transaction.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Transaction {Id} rejected successfully", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting transaction {Id}", id);
            throw;
        }
    }

    public async Task<object> GetTrialBalanceAsync(DateTime asOfDate)
    {
        try
        {
            // Convert to UTC to match PostgreSQL timestamp with time zone
            var asOfDateUtc = DateTime.SpecifyKind(asOfDate, DateTimeKind.Utc);
            
            var ledgers = await _context.Ledgers
                .Include(l => l.Group)
                .Where(l => l.IsActive)
                .ToListAsync();

            var entries = new List<TrialBalanceEntryDto>();

            foreach (var ledger in ledgers)
            {
                var debitTotal = await _context.TransactionEntries
                    .Where(e => e.LedgerId == ledger.Id && e.IsDebit && e.Transaction.Date <= asOfDateUtc && e.Transaction.Status == "posted")
                    .SumAsync(e => e.Amount);

                var creditTotal = await _context.TransactionEntries
                    .Where(e => e.LedgerId == ledger.Id && !e.IsDebit && e.Transaction.Date <= asOfDateUtc && e.Transaction.Status == "posted")
                    .SumAsync(e => e.Amount);

                var closingBalance = ledger.OpeningBalance + debitTotal - creditTotal;

                entries.Add(new TrialBalanceEntryDto
                {
                    LedgerId = ledger.Id,
                    LedgerName = ledger.Name,
                    GroupName = ledger.Group.Name,
                    GroupType = ledger.Group.Type,
                    OpeningBalance = ledger.OpeningBalance,
                    DebitTotal = debitTotal,
                    CreditTotal = creditTotal,
                    ClosingBalance = closingBalance
                });
            }

            var totalDebit = entries.Sum(e => e.DebitTotal);
            var totalCredit = entries.Sum(e => e.CreditTotal);

            return new TrialBalanceDto
            {
                AsOfDate = asOfDate,
                Entries = entries.OrderBy(e => e.GroupType).ThenBy(e => e.GroupName).ThenBy(e => e.LedgerName).ToList(),
                TotalDebit = totalDebit,
                TotalCredit = totalCredit,
                IsBalanced = totalDebit == totalCredit
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting trial balance");
            throw;
        }
    }

    public async Task<object> GetLedgerBalanceAsync(string ledgerId)
    {
        try
        {
            var ledger = await _context.Ledgers
                .Include(l => l.Group)
                .FirstOrDefaultAsync(l => l.Id == ledgerId);

            if (ledger == null)
                throw new InvalidOperationException("Ledger not found");

            var debitTotal = await _context.TransactionEntries
                .Where(e => e.LedgerId == ledgerId && e.IsDebit && e.Transaction.Status == "posted")
                .SumAsync(e => e.Amount);

            var creditTotal = await _context.TransactionEntries
                .Where(e => e.LedgerId == ledgerId && !e.IsDebit && e.Transaction.Status == "posted")
                .SumAsync(e => e.Amount);

            var currentBalance = ledger.OpeningBalance + debitTotal - creditTotal;

            var recentEntries = await _context.TransactionEntries
                .Where(e => e.LedgerId == ledgerId)
                .Include(e => e.Transaction)
                .OrderByDescending(e => e.Transaction.Date)
                .ThenByDescending(e => e.CreatedAt)
                .Take(10)
                .ToListAsync();

            return new LedgerBalanceDto
            {
                LedgerId = ledger.Id,
                LedgerName = ledger.Name,
                GroupName = ledger.Group.Name,
                OpeningBalance = ledger.OpeningBalance,
                DebitTotal = debitTotal,
                CreditTotal = creditTotal,
                CurrentBalance = currentBalance,
                RecentEntries = recentEntries.Select(e => new TransactionEntryDto
                {
                    Id = e.Id,
                    TransactionId = e.TransactionId,
                    LedgerId = e.LedgerId,
                    Ledger = new LedgerDto
                    {
                        Id = ledger.Id,
                        Name = ledger.Name,
                        GroupId = ledger.GroupId,
                        Group = new AccountGroupDto
                        {
                            Id = ledger.Group.Id,
                            Name = ledger.Group.Name,
                            Type = ledger.Group.Type,
                            Description = ledger.Group.Description,
                            IsActive = ledger.Group.IsActive,
                            CreatedAt = ledger.Group.CreatedAt,
                            UpdatedAt = ledger.Group.UpdatedAt,
                            Ledgers = new List<LedgerDto>()
                        },
                        OpeningBalance = ledger.OpeningBalance,
                        Description = ledger.Description,
                        IsActive = ledger.IsActive,
                        CreatedBy = ledger.CreatedBy,
                        CreatedAt = ledger.CreatedAt,
                        UpdatedAt = ledger.UpdatedAt,
                        CurrentBalance = currentBalance
                    },
                    IsDebit = e.IsDebit,
                    Amount = e.Amount,
                    Description = e.Description,
                    CreatedAt = e.CreatedAt,
                    UpdatedAt = e.UpdatedAt
                }).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting ledger balance {LedgerId}", ledgerId);
            throw;
        }
    }

    private async Task<decimal> CalculateLedgerBalanceAsync(string ledgerId)
    {
        try
        {
            var ledger = await _context.Ledgers.FindAsync(ledgerId);
            if (ledger == null)
                return 0;

            var debitTotal = await _context.TransactionEntries
                .Where(e => e.LedgerId == ledgerId && e.IsDebit && e.Transaction.Status == "posted")
                .SumAsync(e => e.Amount);

            var creditTotal = await _context.TransactionEntries
                .Where(e => e.LedgerId == ledgerId && !e.IsDebit && e.Transaction.Status == "posted")
                .SumAsync(e => e.Amount);

            return ledger.OpeningBalance + debitTotal - creditTotal;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating ledger balance {LedgerId}", ledgerId);
            return 0;
        }
    }

    #endregion

    #region Accounting Reports

    public async Task<object> GetDayBookReportAsync(DateTime startDate, DateTime endDate, string? type = null, string? ledgerId = null)
    {
        try
        {
            // Convert to UTC to match PostgreSQL timestamp with time zone
            var startDateUtc = DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
            var endDateUtc = DateTime.SpecifyKind(endDate, DateTimeKind.Utc);
            
            var query = _context.TransactionEntries
                .Include(e => e.Transaction)
                .Include(e => e.Ledger)
                .ThenInclude(l => l.Group)
                .Where(e => e.Transaction.Date >= startDateUtc && e.Transaction.Date <= endDateUtc && e.Transaction.Status == "posted");

            if (!string.IsNullOrEmpty(type))
                query = query.Where(e => e.Transaction.Type == type);

            if (!string.IsNullOrEmpty(ledgerId))
                query = query.Where(e => e.LedgerId == ledgerId);

            var entries = await query
                .OrderBy(e => e.Transaction.Date)
                .ThenBy(e => e.CreatedAt)
                .ToListAsync();

            var dayBookEntries = new List<DayBookEntryDto>();
            decimal runningBalance = 0;

            foreach (var entry in entries)
            {
                if (entry.IsDebit)
                    runningBalance += entry.Amount;
                else
                    runningBalance -= entry.Amount;

                dayBookEntries.Add(new DayBookEntryDto
                {
                    Id = entry.Id,
                    Date = entry.Transaction.Date,
                    Type = entry.Transaction.Type,
                    Description = entry.Transaction.Description ?? entry.Description ?? "",
                    LedgerName = entry.Ledger.Name,
                    GroupName = entry.Ledger.Group.Name,
                    IsDebit = entry.IsDebit,
                    Amount = entry.Amount,
                    RunningBalance = runningBalance
                });
            }

            var totalDebit = entries.Where(e => e.IsDebit).Sum(e => e.Amount);
            var totalCredit = entries.Where(e => !e.IsDebit).Sum(e => e.Amount);

            return new DayBookReportDto
            {
                StartDate = startDate,
                EndDate = endDate,
                Entries = dayBookEntries,
                TotalDebit = totalDebit,
                TotalCredit = totalCredit,
                OpeningBalance = 0, // Calculate based on ledger opening balances
                ClosingBalance = runningBalance
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting day book report");
            throw;
        }
    }

    public async Task<object> GetLedgerReportAsync(string ledgerId, DateTime? startDate = null, DateTime? endDate = null)
    {
        try
        {
            var ledger = await _context.Ledgers
                .Include(l => l.Group)
                .FirstOrDefaultAsync(l => l.Id == ledgerId);

            if (ledger == null)
                throw new InvalidOperationException("Ledger not found");

            var query = _context.TransactionEntries
                .Include(e => e.Transaction)
                .Where(e => e.LedgerId == ledgerId && e.Transaction.Status == "posted");

            if (startDate.HasValue)
            {
                var startDateUtc = DateTime.SpecifyKind(startDate.Value, DateTimeKind.Utc);
                query = query.Where(e => e.Transaction.Date >= startDateUtc);
            }

            if (endDate.HasValue)
            {
                var endDateUtc = DateTime.SpecifyKind(endDate.Value, DateTimeKind.Utc);
                query = query.Where(e => e.Transaction.Date <= endDateUtc);
            }

            var entries = await query
                .OrderBy(e => e.Transaction.Date)
                .ThenBy(e => e.CreatedAt)
                .ToListAsync();

            var ledgerEntries = new List<LedgerReportEntryDto>();
            decimal balance = ledger.OpeningBalance;

            foreach (var entry in entries)
            {
                if (entry.IsDebit)
                    balance += entry.Amount;
                else
                    balance -= entry.Amount;

                ledgerEntries.Add(new LedgerReportEntryDto
                {
                    Id = entry.Id,
                    Date = entry.Transaction.Date,
                    Description = entry.Transaction.Description ?? entry.Description ?? "",
                    Reference = entry.Transaction.Id,
                    Debit = entry.IsDebit ? entry.Amount : 0,
                    Credit = !entry.IsDebit ? entry.Amount : 0,
                    Balance = balance
                });
            }

            var totalDebit = entries.Where(e => e.IsDebit).Sum(e => e.Amount);
            var totalCredit = entries.Where(e => !e.IsDebit).Sum(e => e.Amount);

            return new LedgerReportDto
            {
                LedgerId = ledger.Id,
                LedgerName = ledger.Name,
                GroupName = ledger.Group.Name,
                OpeningBalance = ledger.OpeningBalance,
                Entries = ledgerEntries,
                ClosingBalance = balance,
                TotalDebit = totalDebit,
                TotalCredit = totalCredit
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting ledger report");
            throw;
        }
    }

    public async Task<object> GetProfitLossReportAsync(DateTime startDate, DateTime endDate)
    {
        try
        {
            // Convert to UTC to match PostgreSQL timestamp with time zone
            var startDateUtc = DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
            var endDateUtc = DateTime.SpecifyKind(endDate, DateTimeKind.Utc);
            
            // Get income ledgers (Income group)
            var incomeLedgers = await _context.Ledgers
                .Include(l => l.Group)
                .Where(l => l.Group.Type == "Income" && l.IsActive)
                .ToListAsync();

            // Get expense ledgers (Expense group)
            var expenseLedgers = await _context.Ledgers
                .Include(l => l.Group)
                .Where(l => l.Group.Type == "Expense" && l.IsActive)
                .ToListAsync();

            var incomeEntries = new List<ProfitLossEntryDto>();
            var expenseEntries = new List<ProfitLossEntryDto>();

            // Calculate income
            foreach (var ledger in incomeLedgers)
            {
                var debitTotal = await _context.TransactionEntries
                    .Where(e => e.LedgerId == ledger.Id && e.IsDebit && e.Transaction.Date >= startDateUtc && e.Transaction.Date <= endDateUtc && e.Transaction.Status == "posted")
                    .SumAsync(e => e.Amount);

                var creditTotal = await _context.TransactionEntries
                    .Where(e => e.LedgerId == ledger.Id && !e.IsDebit && e.Transaction.Date >= startDateUtc && e.Transaction.Date <= endDateUtc && e.Transaction.Status == "posted")
                    .SumAsync(e => e.Amount);

                var netAmount = creditTotal - debitTotal; // Income is credit - debit

                if (netAmount > 0)
                {
                    incomeEntries.Add(new ProfitLossEntryDto
                    {
                        Category = ledger.Name,
                        Amount = netAmount,
                        Percentage = 0, // Will be calculated after total
                        Type = "income"
                    });
                }
            }

            // Calculate expenses
            foreach (var ledger in expenseLedgers)
            {
                var debitTotal = await _context.TransactionEntries
                    .Where(e => e.LedgerId == ledger.Id && e.IsDebit && e.Transaction.Date >= startDateUtc && e.Transaction.Date <= endDateUtc && e.Transaction.Status == "posted")
                    .SumAsync(e => e.Amount);

                var creditTotal = await _context.TransactionEntries
                    .Where(e => e.LedgerId == ledger.Id && !e.IsDebit && e.Transaction.Date >= startDateUtc && e.Transaction.Date <= endDateUtc && e.Transaction.Status == "posted")
                    .SumAsync(e => e.Amount);

                var netAmount = debitTotal - creditTotal; // Expense is debit - credit

                if (netAmount > 0)
                {
                    expenseEntries.Add(new ProfitLossEntryDto
                    {
                        Category = ledger.Name,
                        Amount = netAmount,
                        Percentage = 0, // Will be calculated after total
                        Type = "expense"
                    });
                }
            }

            var totalIncome = incomeEntries.Sum(e => e.Amount);
            var totalExpenses = expenseEntries.Sum(e => e.Amount);
            var netProfit = totalIncome - totalExpenses;
            var grossMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

            // Calculate percentages
            foreach (var entry in incomeEntries)
            {
                entry.Percentage = totalIncome > 0 ? (entry.Amount / totalIncome) * 100 : 0;
            }

            foreach (var entry in expenseEntries)
            {
                entry.Percentage = totalIncome > 0 ? (entry.Amount / totalIncome) * 100 : 0;
            }

            return new ProfitLossReportDto
            {
                StartDate = startDate,
                EndDate = endDate,
                Income = incomeEntries.OrderByDescending(e => e.Amount).ToList(),
                Expenses = expenseEntries.OrderByDescending(e => e.Amount).ToList(),
                TotalIncome = totalIncome,
                TotalExpenses = totalExpenses,
                NetProfit = netProfit,
                GrossMargin = grossMargin
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting profit & loss report");
            throw;
        }
    }

    public async Task<object> GetBalanceSheetReportAsync(DateTime asOfDate)
    {
        try
        {
            // Convert DateTime to UTC to avoid PostgreSQL issues
            var asOfDateUtc = DateTime.SpecifyKind(asOfDate, DateTimeKind.Utc);
            
            // Get all active ledgers grouped by type
            var ledgers = await _context.Ledgers
                .Include(l => l.Group)
                .Where(l => l.IsActive)
                .ToListAsync();

            var assetEntries = new List<BalanceSheetEntryDto>();
            var liabilityEntries = new List<BalanceSheetEntryDto>();
            var equityEntries = new List<BalanceSheetEntryDto>();

            foreach (var ledger in ledgers)
            {
                // Use raw SQL to avoid DateTime kind issues
                var debitTotal = await _context.Database
                    .SqlQueryRaw<decimal>(@"
                        SELECT COALESCE(SUM(te.""Amount""), 0)
                        FROM ""TransactionEntries"" te
                        INNER JOIN ""Transactions"" t ON te.""TransactionId"" = t.""Id""
                        WHERE te.""LedgerId"" = {0} 
                        AND te.""IsDebit"" = true 
                        AND t.""Date"" <= {1} 
                        AND t.""Status"" = 'posted'", ledger.Id, asOfDateUtc)
                    .FirstOrDefaultAsync();

                var creditTotal = await _context.Database
                    .SqlQueryRaw<decimal>(@"
                        SELECT COALESCE(SUM(te.""Amount""), 0)
                        FROM ""TransactionEntries"" te
                        INNER JOIN ""Transactions"" t ON te.""TransactionId"" = t.""Id""
                        WHERE te.""LedgerId"" = {0} 
                        AND te.""IsDebit"" = false 
                        AND t.""Date"" <= {1} 
                        AND t.""Status"" = 'posted'", ledger.Id, asOfDateUtc)
                    .FirstOrDefaultAsync();

                var closingBalance = ledger.OpeningBalance + debitTotal - creditTotal;

                var entry = new BalanceSheetEntryDto
                {
                    Category = ledger.Name,
                    Amount = Math.Abs(closingBalance),
                    Percentage = 0, // Will be calculated after totals
                    Type = ledger.Group.Type.ToLower()
                };

                switch (ledger.Group.Type)
                {
                    case "Asset":
                        if (closingBalance > 0)
                            assetEntries.Add(entry);
                        break;
                    case "Liability":
                        if (closingBalance < 0)
                            liabilityEntries.Add(entry);
                        break;
                    case "Equity":
                        if (closingBalance > 0)
                            equityEntries.Add(entry);
                        break;
                }
            }

            var totalAssets = assetEntries.Sum(e => e.Amount);
            var totalLiabilities = liabilityEntries.Sum(e => e.Amount);
            var totalEquity = equityEntries.Sum(e => e.Amount);
            var isBalanced = Math.Abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01m;

            // Calculate percentages
            foreach (var entry in assetEntries)
            {
                entry.Percentage = totalAssets > 0 ? (entry.Amount / totalAssets) * 100 : 0;
            }

            foreach (var entry in liabilityEntries)
            {
                entry.Percentage = totalLiabilities > 0 ? (entry.Amount / totalLiabilities) * 100 : 0;
            }

            foreach (var entry in equityEntries)
            {
                entry.Percentage = totalEquity > 0 ? (entry.Amount / totalEquity) * 100 : 0;
            }

            return new BalanceSheetReportDto
            {
                AsOfDate = asOfDate,
                Assets = assetEntries.OrderByDescending(e => e.Amount).ToList(),
                Liabilities = liabilityEntries.OrderByDescending(e => e.Amount).ToList(),
                Equity = equityEntries.OrderByDescending(e => e.Amount).ToList(),
                TotalAssets = totalAssets,
                TotalLiabilities = totalLiabilities,
                TotalEquity = totalEquity,
                IsBalanced = isBalanced
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting balance sheet report");
            throw;
        }
    }

    public async Task<object> GetExpensesReportAsync(DateTime startDate, DateTime endDate, string? type = null, string? status = null, string? paymentMode = null)
    {
        try
        {
            // Convert to UTC to match PostgreSQL timestamp with time zone
            var startDateUtc = DateTime.SpecifyKind(startDate, DateTimeKind.Utc);
            var endDateUtc = DateTime.SpecifyKind(endDate, DateTimeKind.Utc);
            
            var query = _context.Expenses
                .Where(e => e.Date >= startDateUtc && e.Date <= endDateUtc);

            if (!string.IsNullOrEmpty(type))
                query = query.Where(e => e.Type == type);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(e => e.Status == status);

            if (!string.IsNullOrEmpty(paymentMode))
                query = query.Where(e => e.PaymentMode == paymentMode);

            var expenses = await query
                .OrderBy(e => e.Date)
                .ThenBy(e => e.CreatedAt)
                .ToListAsync();

            var entries = expenses.Select(e => new ExpenseReportEntryDto
            {
                Id = e.Id.ToString(),
                Date = e.Date,
                Description = e.Description,
                Type = e.Type,
                Category = e.Category,
                Amount = e.Amount,
                PaymentMode = e.PaymentMode,
                PaidTo = e.PaidTo,
                Status = e.Status,
                ChartOfAccountName = e.ChartOfAccountName,
                Notes = e.Notes,
                Tags = e.Tags ?? new List<string>(),
                CreatedBy = e.CreatedBy,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt
            }).ToList();

            var totalAmount = entries.Sum(e => e.Amount);
            var totalExpenses = entries.Count;
            var averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;

            // Calculate breakdowns
            var typeBreakdown = entries
                .GroupBy(e => e.Type)
                .Select(g => new ExpenseBreakdownDto
                {
                    Category = g.Key,
                    Type = g.Key,
                    TotalAmount = g.Sum(e => e.Amount),
                    Count = g.Count(),
                    Percentage = totalAmount > 0 ? (g.Sum(e => e.Amount) / totalAmount) * 100 : 0
                })
                .ToList();

            var statusBreakdown = entries
                .GroupBy(e => e.Status)
                .Select(g => new ExpenseBreakdownDto
                {
                    Category = g.Key,
                    Type = g.Key,
                    TotalAmount = g.Sum(e => e.Amount),
                    Count = g.Count(),
                    Percentage = totalAmount > 0 ? (g.Sum(e => e.Amount) / totalAmount) * 100 : 0
                })
                .ToList();

            return new ExpenseReportDto
            {
                StartDate = startDate,
                EndDate = endDate,
                Entries = entries,
                TotalAmount = totalAmount,
                TotalExpenses = totalExpenses,
                AverageExpense = averageExpense,
                BreakdownByType = typeBreakdown,
                BreakdownByStatus = statusBreakdown
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting expenses report");
            throw;
        }
    }

    #endregion

    #region Inventory Assets

    public async Task<object> GetInventoryAssetsAsync(string? sku = null, string? supplier = null, string? ledgerId = null)
    {
        try
        {
            var query = _context.InventoryAssets
                .Include(ia => ia.Ledger)
                .AsQueryable();

            if (!string.IsNullOrEmpty(sku))
                query = query.Where(ia => ia.Sku.Contains(sku));

            if (!string.IsNullOrEmpty(supplier))
                query = query.Where(ia => ia.Supplier != null && ia.Supplier.Contains(supplier));

            if (!string.IsNullOrEmpty(ledgerId))
                query = query.Where(ia => ia.LedgerId == ledgerId);

            var assets = await query
                .OrderBy(ia => ia.Sku)
                .ToListAsync();

            var assetDtos = assets.Select(ia => new InventoryAssetDto
            {
                Id = ia.Id,
                ProductId = ia.ProductId,
                VariantId = ia.VariantId,
                Sku = ia.Sku,
                ProductTitle = ia.ProductTitle,
                VariantTitle = ia.VariantTitle,
                CostPerItem = ia.CostPerItem,
                SellingPrice = ia.SellingPrice,
                MaxPrice = ia.MaxPrice,
                Quantity = ia.Quantity,
                TotalValue = ia.TotalValue,
                Currency = ia.Currency,
                Supplier = ia.Supplier,
                Notes = ia.Notes,
                LedgerId = ia.LedgerId,
                LedgerName = ia.Ledger?.Name ?? "",
                CreatedBy = ia.CreatedBy,
                CreatedAt = ia.CreatedAt,
                UpdatedAt = ia.UpdatedAt
            }).ToList();

            return assetDtos;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting inventory assets");
            throw;
        }
    }

    public async Task<object?> GetInventoryAssetAsync(string id)
    {
        try
        {
            var asset = await _context.InventoryAssets
                .Include(ia => ia.Ledger)
                .FirstOrDefaultAsync(ia => ia.Id == id);

            if (asset == null)
                return null;

            return new InventoryAssetDto
            {
                Id = asset.Id,
                ProductId = asset.ProductId,
                VariantId = asset.VariantId,
                Sku = asset.Sku,
                ProductTitle = asset.ProductTitle,
                VariantTitle = asset.VariantTitle,
                CostPerItem = asset.CostPerItem,
                SellingPrice = asset.SellingPrice,
                MaxPrice = asset.MaxPrice,
                Quantity = asset.Quantity,
                TotalValue = asset.TotalValue,
                Currency = asset.Currency,
                Supplier = asset.Supplier,
                Notes = asset.Notes,
                LedgerId = asset.LedgerId,
                LedgerName = asset.Ledger?.Name ?? "",
                CreatedBy = asset.CreatedBy,
                CreatedAt = asset.CreatedAt,
                UpdatedAt = asset.UpdatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting inventory asset {Id}", id);
            throw;
        }
    }

    public async Task<object> CreateInventoryAssetAsync(CreateInventoryAssetDto request)
    {
        try
        {
            var asset = new InventoryAsset
            {
                ProductId = request.ProductId,
                VariantId = request.VariantId,
                Sku = request.Sku,
                ProductTitle = request.ProductTitle,
                VariantTitle = request.VariantTitle,
                CostPerItem = request.CostPerItem,
                SellingPrice = request.SellingPrice,
                MaxPrice = request.MaxPrice,
                Quantity = request.Quantity,
                TotalValue = request.CostPerItem * request.Quantity,
                Currency = request.Currency,
                Supplier = request.Supplier,
                Notes = request.Notes,
                LedgerId = request.LedgerId,
                CreatedBy = request.CreatedBy
            };

            _context.InventoryAssets.Add(asset);
            await _context.SaveChangesAsync();

            return asset;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating inventory asset");
            throw;
        }
    }

    public async Task<object?> UpdateInventoryAssetAsync(string id, UpdateInventoryAssetDto request)
    {
        try
        {
            var asset = await _context.InventoryAssets.FindAsync(id);
            if (asset == null)
                return null;

            if (request.CostPerItem.HasValue)
                asset.CostPerItem = request.CostPerItem.Value;

            if (request.SellingPrice.HasValue)
                asset.SellingPrice = request.SellingPrice.Value;

            if (request.MaxPrice.HasValue)
                asset.MaxPrice = request.MaxPrice.Value;

            if (request.Quantity.HasValue)
                asset.Quantity = request.Quantity.Value;

            if (!string.IsNullOrEmpty(request.Currency))
                asset.Currency = request.Currency;

            if (request.Supplier != null)
                asset.Supplier = request.Supplier;

            if (request.Notes != null)
                asset.Notes = request.Notes;

            if (!string.IsNullOrEmpty(request.LedgerId))
                asset.LedgerId = request.LedgerId;

            // Recalculate total value
            asset.TotalValue = asset.CostPerItem * asset.Quantity;

            await _context.SaveChangesAsync();

            return asset;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating inventory asset {Id}", id);
            throw;
        }
    }

    public async Task<bool> DeleteInventoryAssetAsync(string id)
    {
        try
        {
            var asset = await _context.InventoryAssets.FindAsync(id);
            if (asset == null)
                return false;

            _context.InventoryAssets.Remove(asset);
            await _context.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting inventory asset {Id}", id);
            throw;
        }
    }

    public async Task<object> GetInventoryAssetSummaryAsync()
    {
        try
        {
            var assets = await _context.InventoryAssets.ToListAsync();

            var summary = new InventoryAssetSummaryDto
            {
                TotalItems = assets.Count,
                TotalValue = assets.Sum(a => a.TotalValue),
                AverageCostPerItem = assets.Any() ? assets.Average(a => a.CostPerItem) : 0,
                AverageSellingPrice = assets.Any() ? assets.Average(a => a.SellingPrice) : 0,
                Currency = "INR"
            };

            return summary;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting inventory asset summary");
            throw;
        }
    }

    public async Task<object> SyncInventoryFromProductsAsync(string createdBy)
    {
        try
        {
            // Get inventory ledger
            var inventoryLedger = await _context.Ledgers
                .FirstOrDefaultAsync(l => l.Name.ToLower().Contains("inventory") && l.IsActive);

            if (inventoryLedger == null)
            {
                // Create inventory ledger if it doesn't exist
                var assetGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(ag => ag.Type == "Asset" && ag.IsActive);

                if (assetGroup == null)
                    throw new InvalidOperationException("Asset account group not found");

                inventoryLedger = new Ledger
                {
                    Name = "Inventory",
                    GroupId = assetGroup.Id,
                    OpeningBalance = 0,
                    Description = "Current inventory value",
                    IsActive = true,
                    CreatedBy = createdBy
                };

                _context.Ledgers.Add(inventoryLedger);
                await _context.SaveChangesAsync();
            }

            // Get all product variants with cost per item
            var variants = await _context.ShopifyProductVariants
                .Include(v => v.Product)
                .Where(v => v.CostPerItem.HasValue && v.InventoryQuantity > 0)
                .ToListAsync();

            var syncedCount = 0;
            var updatedCount = 0;

            foreach (var variant in variants)
            {
                var existingAsset = await _context.InventoryAssets
                    .FirstOrDefaultAsync(ia => ia.ProductId == variant.ProductId && ia.VariantId == variant.Id);

                if (existingAsset == null)
                {
                    // Create new inventory asset
                    var asset = new InventoryAsset
                    {
                        ProductId = variant.ProductId,
                        VariantId = variant.Id,
                        Sku = variant.Sku ?? "",
                        ProductTitle = variant.Product.Title,
                        VariantTitle = variant.Title ?? variant.Product.Title,
                        CostPerItem = variant.CostPerItem!.Value,
                        SellingPrice = variant.Price,
                        MaxPrice = variant.CompareAtPrice,
                        Quantity = variant.InventoryQuantity,
                        TotalValue = variant.CostPerItem!.Value * variant.InventoryQuantity,
                        Currency = "INR",
                        Supplier = variant.Product.Vendor,
                        Notes = $"Auto-synced from product variant",
                        LedgerId = inventoryLedger.Id,
                        CreatedBy = createdBy
                    };

                    _context.InventoryAssets.Add(asset);
                    syncedCount++;
                }
                else
                {
                    // Update existing asset
                    existingAsset.Quantity = variant.InventoryQuantity;
                    existingAsset.CostPerItem = variant.CostPerItem!.Value;
                    existingAsset.SellingPrice = variant.Price;
                    existingAsset.MaxPrice = variant.CompareAtPrice;
                    existingAsset.TotalValue = variant.CostPerItem!.Value * variant.InventoryQuantity;
                    existingAsset.Supplier = variant.Product.Vendor;
                    updatedCount++;
                }
            }

            await _context.SaveChangesAsync();

            return new
            {
                SyncedCount = syncedCount,
                UpdatedCount = updatedCount,
                TotalProcessed = syncedCount + updatedCount
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing inventory from products");
            throw;
        }
    }

    public async Task<object> CalculateInventoryValueAsync()
    {
        try
        {
            var assets = await _context.InventoryAssets.ToListAsync();
            var totalValue = assets.Sum(a => a.TotalValue);

            // Update inventory ledger balance
            var inventoryLedger = await _context.Ledgers
                .FirstOrDefaultAsync(l => l.Name.ToLower().Contains("inventory") && l.IsActive);

            if (inventoryLedger != null)
            {
                // Create a transaction to adjust inventory value
                var transaction = new Transaction
                {
                    Date = DateTime.UtcNow,
                    Type = "Journal",
                    Description = "Inventory value adjustment",
                    CreatedBy = "System",
                    Status = "posted",
                    Notes = "Automatic inventory value calculation"
                };

                _context.Transactions.Add(transaction);

                // Create transaction entries
                var entries = new List<TransactionEntry>();

                // Debit inventory ledger
                entries.Add(new TransactionEntry
                {
                    TransactionId = transaction.Id,
                    LedgerId = inventoryLedger.Id,
                    IsDebit = true,
                    Amount = totalValue,
                    Description = "Inventory value adjustment"
                });

                // Credit inventory adjustment account (you may need to create this)
                var adjustmentLedger = await _context.Ledgers
                    .FirstOrDefaultAsync(l => l.Name.ToLower().Contains("inventory adjustment") && l.IsActive);

                if (adjustmentLedger != null)
                {
                    entries.Add(new TransactionEntry
                    {
                        TransactionId = transaction.Id,
                        LedgerId = adjustmentLedger.Id,
                        IsDebit = false,
                        Amount = totalValue,
                        Description = "Inventory value adjustment"
                    });
                }

                _context.TransactionEntries.AddRange(entries);
                await _context.SaveChangesAsync();
            }

            return new
            {
                TotalValue = totalValue,
                AssetCount = assets.Count,
                Currency = "INR"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating inventory value");
            throw;
        }
    }

    public async Task<object> GetRealTimeInventoryCalculationAsync()
    {
        try
        {
            // Get all product variants with cost per item and inventory quantity
            var variants = await _context.ShopifyProductVariants
                .Include(v => v.Product)
                .Where(v => v.CostPerItem.HasValue && v.InventoryQuantity > 0)
                .ToListAsync();

            var inventoryItems = new List<object>();
            var totalInventoryValue = 0m;
            var totalItems = 0;
            var totalQuantity = 0;

            foreach (var variant in variants)
            {
                var itemValue = variant.CostPerItem!.Value * variant.InventoryQuantity;
                totalInventoryValue += itemValue;
                totalItems++;
                totalQuantity += variant.InventoryQuantity;

                inventoryItems.Add(new
                {
                    ProductId = variant.ProductId,
                    VariantId = variant.Id,
                    Sku = variant.Sku ?? "",
                    ProductTitle = variant.Product.Title,
                    VariantTitle = variant.Title ?? variant.Product.Title,
                    CostPerItem = variant.CostPerItem!.Value,
                    SellingPrice = variant.Price,
                    MaxPrice = variant.CompareAtPrice,
                    Quantity = variant.InventoryQuantity,
                    TotalValue = itemValue,
                    Currency = "INR",
                    Supplier = variant.Product.Vendor,
                    LastUpdated = variant.UpdatedAt
                });
            }

            // Get inventory ledger for comparison
            var inventoryLedger = await _context.Ledgers
                .FirstOrDefaultAsync(l => l.Name.ToLower().Contains("inventory") && l.IsActive);

            var ledgerBalance = 0m;
            if (inventoryLedger != null)
            {
                var debitTotal = await _context.TransactionEntries
                    .Where(e => e.LedgerId == inventoryLedger.Id && e.IsDebit && e.Transaction.Status == "posted")
                    .SumAsync(e => e.Amount);

                var creditTotal = await _context.TransactionEntries
                    .Where(e => e.LedgerId == inventoryLedger.Id && !e.IsDebit && e.Transaction.Status == "posted")
                    .SumAsync(e => e.Amount);

                ledgerBalance = inventoryLedger.OpeningBalance + debitTotal - creditTotal;
            }

            return new
            {
                TotalInventoryValue = totalInventoryValue,
                TotalItems = totalItems,
                TotalQuantity = totalQuantity,
                AverageCostPerItem = totalItems > 0 ? totalInventoryValue / totalQuantity : 0,
                Currency = "INR",
                CalculatedAt = DateTime.UtcNow,
                LedgerBalance = ledgerBalance,
                Variance = totalInventoryValue - ledgerBalance,
                InventoryItems = inventoryItems.OrderByDescending(i => ((dynamic)i).TotalValue).ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating real-time inventory");
            throw;
        }
    }

    #endregion

    public async Task<object> GetTopSellingProductsAsync(DateTime? startDate = null, DateTime? endDate = null, string? currency = null, int limit = 20)
    {
        try
        {
            // Build the SQL query with parameters
            var sql = startDate.HasValue && endDate.HasValue
                ? $"SELECT * FROM GetTopSellingProducts('{startDate.Value.ToString("yyyy-MM-dd HH:mm:ss")}', '{endDate.Value.ToString("yyyy-MM-dd HH:mm:ss")}', {(currency != null ? $"'{currency}'" : "NULL")}, {limit})"
                : startDate.HasValue
                ? $"SELECT * FROM GetTopSellingProducts('{startDate.Value.ToString("yyyy-MM-dd HH:mm:ss")}', NULL, {(currency != null ? $"'{currency}'" : "NULL")}, {limit})"
                : endDate.HasValue
                ? $"SELECT * FROM GetTopSellingProducts(NULL, '{endDate.Value.ToString("yyyy-MM-dd HH:mm:ss")}', {(currency != null ? $"'{currency}'" : "NULL")}, {limit})"
                : $"SELECT * FROM GetTopSellingProducts(NULL, NULL, {(currency != null ? $"'{currency}'" : "NULL")}, {limit})";
            
            _logger.LogInformation("Executing stored procedure: {Sql}", sql);
            
            var topProducts = await _context.Database
                .SqlQueryRaw<TopSellingProductResult>(sql)
                .ToListAsync();

            _logger.LogInformation("Stored procedure returned {Count} products", topProducts.Count);

            // Handle empty results gracefully
            if (!topProducts.Any())
            {
                _logger.LogInformation("No top selling products found for the given criteria");
                return new List<object>();
            }

            var result = topProducts.Select(p => new
            {
                name = p.product_name ?? "Unknown Product",
                productId = p.product_id ?? "",
                imageUrl = p.image_url ?? "",
                quantity = p.total_quantity,
                revenue = p.total_revenue,
                cost = p.total_cost,
                profit = p.total_profit,
                margin = p.margin_percentage
            }).ToList();

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting top selling products");
            // Return empty list instead of throwing to prevent 500 errors
            return new List<object>();
        }
    }
} 