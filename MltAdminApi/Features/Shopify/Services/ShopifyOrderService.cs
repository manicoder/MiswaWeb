using Microsoft.EntityFrameworkCore;
using Mlt.Admin.Api.Core.DTOs;
using Mlt.Admin.Api.Core.Entities;
using Mlt.Admin.Api.Core.Enums;
using Mlt.Admin.Api.Core.Interfaces;
using Mlt.Admin.Api.Data;
using Mlt.Admin.Api.Services;
using System.Text.Json;

namespace Mlt.Admin.Api.Features.Shopify.Services
{
    /// <summary>
    /// Shopify-specific order service implementation
    /// </summary>
    public class ShopifyOrderService : IOrderService<ShopifyOrder>
    {
        private readonly ApplicationDbContext _context;
        private readonly IShopifyApiService _shopifyApiService;
        private readonly ILogger<ShopifyOrderService> _logger;

        public Platform Platform => Platform.Shopify;

        public ShopifyOrderService(
            ApplicationDbContext context,
            IShopifyApiService shopifyApiService,
            ILogger<ShopifyOrderService> logger)
        {
            _context = context;
            _shopifyApiService = shopifyApiService;
            _logger = logger;
        }

        public async Task<PagedResult<ShopifyOrder>> GetOrdersAsync(Guid storeConnectionId, OrderFilterDto filters)
        {
            var query = _context.Set<ShopifyOrder>()
                .Where(o => o.StoreConnectionId == storeConnectionId);

            // Apply filters
            if (!string.IsNullOrEmpty(filters.Status))
            {
                query = query.Where(o => o.Status.Contains(filters.Status));
            }

            if (!string.IsNullOrEmpty(filters.FulfillmentStatus))
            {
                query = query.Where(o => o.FulfillmentStatus.Contains(filters.FulfillmentStatus));
            }

            if (!string.IsNullOrEmpty(filters.FinancialStatus))
            {
                query = query.Where(o => o.DisplayFinancialStatus.Contains(filters.FinancialStatus));
            }

            if (filters.CreatedAfter.HasValue)
            {
                query = query.Where(o => o.CreatedAt >= filters.CreatedAfter.Value);
            }

            if (filters.CreatedBefore.HasValue)
            {
                query = query.Where(o => o.CreatedAt <= filters.CreatedBefore.Value);
            }

            if (!string.IsNullOrEmpty(filters.CustomerEmail))
            {
                query = query.Where(o => o.CustomerEmail != null && o.CustomerEmail.Contains(filters.CustomerEmail));
            }

            if (filters.MinAmount.HasValue)
            {
                query = query.Where(o => o.TotalPrice >= filters.MinAmount.Value);
            }

            if (filters.MaxAmount.HasValue)
            {
                query = query.Where(o => o.TotalPrice <= filters.MaxAmount.Value);
            }

            if (!string.IsNullOrEmpty(filters.SearchQuery))
            {
                query = query.Where(o => 
                    o.OrderNumber.Contains(filters.SearchQuery) ||
                    o.Name.Contains(filters.SearchQuery) ||
                    (o.CustomerFirstName != null && o.CustomerFirstName.Contains(filters.SearchQuery)) ||
                    (o.CustomerLastName != null && o.CustomerLastName.Contains(filters.SearchQuery)) ||
                    (o.CustomerEmail != null && o.CustomerEmail.Contains(filters.SearchQuery)));
            }

            var totalCount = await query.CountAsync();
            
            var orders = await query
                .OrderByDescending(o => o.CreatedAt)
                .Skip((filters.Page - 1) * filters.PageSize)
                .Take(filters.PageSize)
                .ToListAsync();

            return new PagedResult<ShopifyOrder>
            {
                Items = orders,
                TotalCount = totalCount,
                Page = filters.Page,
                PageSize = filters.PageSize
            };
        }

        public async Task<ShopifyOrder?> GetOrderByIdAsync(Guid orderId)
        {
            return await _context.Set<ShopifyOrder>()
                .FirstOrDefaultAsync(o => o.Id == orderId);
        }

        public async Task<ShopifyOrder?> GetOrderByPlatformIdAsync(string platformOrderId, Guid storeConnectionId)
        {
            return await _context.Set<ShopifyOrder>()
                .FirstOrDefaultAsync(o => o.ShopifyOrderId == platformOrderId && o.StoreConnectionId == storeConnectionId);
        }

        public async Task<ShopifyOrder> CreateOrderAsync(ShopifyOrder order)
        {
            order.Id = Guid.NewGuid();
            order.CreatedAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;

            _context.Set<ShopifyOrder>().Add(order);
            await _context.SaveChangesAsync();

            return order;
        }

        public async Task<ShopifyOrder> UpdateOrderAsync(ShopifyOrder order)
        {
            order.UpdatedAt = DateTime.UtcNow;
            _context.Set<ShopifyOrder>().Update(order);
            await _context.SaveChangesAsync();

            return order;
        }

        public async Task<bool> DeleteOrderAsync(Guid orderId)
        {
            var order = await GetOrderByIdAsync(orderId);
            if (order == null)
                return false;

            _context.Set<ShopifyOrder>().Remove(order);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<int> SyncOrdersAsync(Guid storeConnectionId)
        {
            try
            {
                var storeConnection = await _context.StoreConnections
                    .FirstOrDefaultAsync(sc => sc.Id == storeConnectionId);

                if (storeConnection == null)
                {
                    _logger.LogWarning("Store connection not found: {StoreConnectionId}", storeConnectionId);
                    return 0;
                }

                // TODO: Decrypt credentials and create ShopifyCredentials object
                // For now, return 0 as this requires credential decryption logic
                _logger.LogInformation("Shopify order sync requires credential decryption - not yet implemented");
                return 0;

                // Get orders from Shopify API (commented out until credentials are properly handled)
                // var credentials = DecryptCredentials(storeConnection.EncryptedCredentials);
                // var shopifyApiResponse = await _shopifyApiService.GetOrdersAsync(credentials);
                // var shopifyOrders = shopifyApiResponse.Data as List<JsonElement> ?? new List<JsonElement>();
                
                // TODO: Implement actual order syncing once credential decryption is available
                // For now, just return 0
                // var syncedCount = 0;
                // foreach (var shopifyOrderData in shopifyOrders) { ... }
                // return syncedCount;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing Shopify orders for store {StoreConnectionId}", storeConnectionId);
                throw;
            }
        }

        public async Task<List<ShopifyOrder>> SearchOrdersAsync(Guid storeConnectionId, string searchQuery)
        {
            return await _context.Set<ShopifyOrder>()
                .Where(o => o.StoreConnectionId == storeConnectionId)
                .Where(o => 
                    o.OrderNumber.Contains(searchQuery) ||
                    o.Name.Contains(searchQuery) ||
                    (o.CustomerFirstName != null && o.CustomerFirstName.Contains(searchQuery)) ||
                    (o.CustomerLastName != null && o.CustomerLastName.Contains(searchQuery)) ||
                    (o.CustomerEmail != null && o.CustomerEmail.Contains(searchQuery)))
                .OrderByDescending(o => o.CreatedAt)
                .Take(50) // Limit search results
                .ToListAsync();
        }

        private ShopifyOrder MapShopifyDataToOrder(JsonElement shopifyData, Guid storeConnectionId, ShopifyOrder? existingOrder = null)
        {
            var order = existingOrder ?? new ShopifyOrder();

            order.ShopifyOrderId = shopifyData.GetProperty("id").GetString() ?? "";
            order.Name = shopifyData.GetProperty("name").GetString() ?? "";
            order.OrderNumber = shopifyData.GetProperty("order_number").GetString() ?? order.Name;
            order.StoreConnectionId = storeConnectionId;
            
            if (shopifyData.TryGetProperty("created_at", out var createdAt))
            {
                order.CreatedAt = DateTime.Parse(createdAt.GetString() ?? DateTime.UtcNow.ToString());
            }

            if (shopifyData.TryGetProperty("updated_at", out var updatedAt))
            {
                order.UpdatedAt = DateTime.Parse(updatedAt.GetString() ?? DateTime.UtcNow.ToString());
            }

            if (shopifyData.TryGetProperty("total_price", out var totalPrice))
            {
                decimal.TryParse(totalPrice.GetString(), out var price);
                order.TotalPrice = price;
            }

            order.Currency = shopifyData.GetProperty("currency").GetString() ?? "INR";
            order.FulfillmentStatus = shopifyData.GetProperty("fulfillment_status").GetString() ?? "unfulfilled";
            order.DisplayFulfillmentStatus = shopifyData.GetProperty("display_fulfillment_status").GetString() ?? "Unfulfilled";
            order.DisplayFinancialStatus = shopifyData.GetProperty("display_financial_status").GetString() ?? "Pending";
            order.Status = order.FulfillmentStatus;

            // Map customer data
            if (shopifyData.TryGetProperty("customer", out var customer) && customer.ValueKind != JsonValueKind.Null)
            {
                order.CustomerId = customer.GetProperty("id").GetString();
                order.CustomerFirstName = customer.GetProperty("first_name").GetString();
                order.CustomerLastName = customer.GetProperty("last_name").GetString();
                order.CustomerEmail = customer.GetProperty("email").GetString();
            }

            // Map shipping address
            if (shopifyData.TryGetProperty("shipping_address", out var shippingAddress) && shippingAddress.ValueKind != JsonValueKind.Null)
            {
                order.ShippingFirstName = shippingAddress.GetProperty("first_name").GetString();
                order.ShippingLastName = shippingAddress.GetProperty("last_name").GetString();
                order.ShippingAddress1 = shippingAddress.GetProperty("address1").GetString();
                order.ShippingCity = shippingAddress.GetProperty("city").GetString();
                order.ShippingProvince = shippingAddress.GetProperty("province").GetString();
                order.ShippingCountry = shippingAddress.GetProperty("country").GetString();
                order.ShippingZip = shippingAddress.GetProperty("zip").GetString();
            }

            // Store line items as JSON
            if (shopifyData.TryGetProperty("line_items", out var lineItems))
            {
                order.LineItemsJson = lineItems.GetRawText();
            }

            return order;
        }
    }
} 