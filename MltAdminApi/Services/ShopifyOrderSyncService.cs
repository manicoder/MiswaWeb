using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Globalization;
using Mlt.Admin.Api.Core.Entities;
using Mlt.Admin.Api.Data;
using Mlt.Admin.Api.GraphQL;
using Mlt.Admin.Api.Models;
using Mlt.Admin.Api.Models.Shopify;
using Mlt.Admin.Api.Constants;
using Npgsql;

namespace Mlt.Admin.Api.Services
{
    public class ShopifyOrderSyncService : IShopifyOrderSyncService
    {
        private readonly ApplicationDbContext _context;
        private readonly IShopifyApiService _shopifyApiService;
        private readonly IStoreConnectionService _storeConnectionService;
        private readonly ILogger<ShopifyOrderSyncService> _logger;

        public ShopifyOrderSyncService(
            ApplicationDbContext context,
            IShopifyApiService shopifyApiService,
            IStoreConnectionService storeConnectionService,
            ILogger<ShopifyOrderSyncService> logger)
        {
            _context = context;
            _shopifyApiService = shopifyApiService;
            _storeConnectionService = storeConnectionService;
            _logger = logger;
        }

        public async Task<OrderSyncResult> SyncOrdersAsync(Guid storeConnectionId, bool forceRefresh = false)
        {
            var startTime = DateTime.UtcNow;
            var result = new OrderSyncResult();

            try
            {
                // Get store connection
                var storeConnection = await _context.StoreConnections
                    .FirstOrDefaultAsync(sc => sc.Id == storeConnectionId);

                if (storeConnection == null)
                {
                    result.Error = "Store connection not found";
                    _logger.LogError("Store connection with ID {StoreConnectionId} not found", storeConnectionId);
                    return result;
                }

                // Check if orders already exist and we're not forcing refresh
                if (!forceRefresh && await HasLocalOrdersAsync(storeConnectionId))
                {
                    _logger.LogInformation("Orders already exist for store {StoreConnectionId}, skipping sync", storeConnectionId);
                    result.Error = "Orders already exist. Use forceRefresh=true to resync.";
                    return result;
                }

                _logger.LogInformation("Starting order sync for store {StoreConnectionId}", storeConnectionId);

                // Create ShopifyCredentials from StoreConnection
                Dictionary<string, string>? decryptedCredentials = null;
                try
                {
                    decryptedCredentials = await _storeConnectionService.GetDecryptedCredentialsAsync(storeConnectionId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to decrypt credentials for store {StoreConnectionId}. Check encryption key configuration.", storeConnectionId);
                    result.Error = "Failed to decrypt store credentials. The encryption key may be invalid or missing.";
                    return result;
                }

                if (decryptedCredentials == null || !decryptedCredentials.ContainsKey("accessToken"))
                {
                    result.Error = "Invalid store credentials. Missing access token.";
                    return result;
                }

                var credentials = new ShopifyCredentials
                {
                    Store = storeConnection.StoreName,
                    AccessToken = decryptedCredentials["accessToken"]
                };

                // Fetch all orders from Shopify using pagination with optimized batch size
                var allOrders = new List<ShopifyOrder>();
                string? cursor = null;
                bool hasNextPage = true;
                int pageCount = 0;
                const int batchSize = 100; // Reduced from 250 to avoid rate limits

                while (hasNextPage)
                {
                    pageCount++;
                    _logger.LogInformation("Fetching orders page {PageCount} for store {StoreConnectionId}", pageCount, storeConnectionId);

                    var graphqlQuery = ShopifyQueries.GetOrdersQuery(batchSize, cursor);
                    var response = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, graphqlQuery);

                    if (!response.Success || response.Data == null)
                    {
                        result.Error = $"Failed to fetch orders from Shopify: {response.Error}";
                        return result;
                    }

                    var orders = ParseOrdersFromResponse(response.Data, storeConnectionId);
                    allOrders.AddRange(orders);
                    result.TotalFetched += orders.Count;

                    // Check for next page
                    hasNextPage = GetNextPageCursor(response.Data, out cursor);

                    // Add delay to respect rate limits (2 calls per second)
                    if (hasNextPage)
                    {
                        await Task.Delay(500); // 500ms delay between calls
                    }
                }

                _logger.LogInformation("Fetched {OrderCount} orders from Shopify for store {StoreConnectionId}",
                    allOrders.Count, storeConnectionId);

                // Save orders to database with batching
                await SaveOrdersToDatabaseOptimized(allOrders, storeConnectionId, result);

                // Update last sync timestamp
                await UpdateLastSyncTimestampAsync(storeConnectionId, DateTime.UtcNow);

                result.Duration = DateTime.UtcNow - startTime;
                result.Success = true;

                _logger.LogInformation("✅ Order sync completed for store {StoreConnectionId}: {NewOrders} new, {UpdatedOrders} updated, {TotalLineItems} line items in {Duration}ms",
                    storeConnectionId, result.NewOrders, result.UpdatedOrders, result.TotalLineItems, result.Duration.TotalMilliseconds);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing orders for store {StoreConnectionId}", storeConnectionId);
                result.Error = ex.Message;
                return result;
            }
        }

        public async Task<OrderSyncResult> IncrementalSyncOrdersAsync(Guid storeConnectionId, DateTime? sinceDate = null)
        {
            var startTime = DateTime.UtcNow;
            var result = new OrderSyncResult();

            try
            {
                // Get store connection
                var storeConnection = await _context.StoreConnections
                    .FirstOrDefaultAsync(sc => sc.Id == storeConnectionId);

                if (storeConnection == null)
                {
                    result.Error = "Store connection not found";
                    return result;
                }

                // Get last sync timestamps if not provided
                if (sinceDate == null)
                {
                    // Use the most recent order's createdAt timestamp for better incremental syncing
                    var lastCreatedAt = await GetLastSyncTimestampAsync(storeConnectionId);
                    var lastUpdatedAt = await GetLastUpdatedTimestampAsync(storeConnectionId);
                    
                    // Use the earlier of the two timestamps to ensure we don't miss any orders
                    if (lastCreatedAt.HasValue && lastUpdatedAt.HasValue)
                    {
                        sinceDate = lastCreatedAt.Value < lastUpdatedAt.Value ? lastCreatedAt.Value : lastUpdatedAt.Value;
                    }
                    else if (lastCreatedAt.HasValue)
                    {
                        sinceDate = lastCreatedAt.Value;
                    }
                    else if (lastUpdatedAt.HasValue)
                    {
                        sinceDate = lastUpdatedAt.Value;
                    }
                    else
                    {
                        // If no orders exist, sync from 24 hours ago
                        sinceDate = DateTime.UtcNow.AddDays(-1);
                    }
                }

                _logger.LogInformation("Starting incremental sync for store {StoreConnectionId} since {SinceDate}", storeConnectionId, sinceDate);

                // Create ShopifyCredentials
                var decryptedCredentials = await _storeConnectionService.GetDecryptedCredentialsAsync(storeConnectionId);
                if (decryptedCredentials == null || !decryptedCredentials.ContainsKey("accessToken"))
                {
                    result.Error = "Invalid store credentials";
                    return result;
                }

                var credentials = new ShopifyCredentials
                {
                    Store = storeConnection.StoreName,
                    AccessToken = decryptedCredentials["accessToken"]
                };

                // Fetch orders updated since the last sync
                var updatedOrders = new List<ShopifyOrder>();
                string? cursor = null;
                bool hasNextPage = true;
                int pageCount = 0;
                const int batchSize = 100;

                while (hasNextPage)
                {
                    pageCount++;
                    _logger.LogInformation("Fetching updated orders page {PageCount} for store {StoreConnectionId}", pageCount, storeConnectionId);

                    // Use a query that filters by updated_at
                    var graphqlQuery = ShopifyQueries.GetOrdersUpdatedSinceQuery(sinceDate.Value, batchSize, cursor);
                    var response = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, graphqlQuery);

                    if (!response.Success || response.Data == null)
                    {
                        result.Error = $"Failed to fetch updated orders from Shopify: {response.Error}";
                        return result;
                    }

                    var orders = ParseOrdersFromResponse(response.Data, storeConnectionId);
                    updatedOrders.AddRange(orders);
                    result.TotalFetched += orders.Count;

                    hasNextPage = GetNextPageCursor(response.Data, out cursor);

                    if (hasNextPage)
                    {
                        await Task.Delay(500);
                    }
                }

                _logger.LogInformation("Fetched {OrderCount} updated orders from Shopify for store {StoreConnectionId}",
                    updatedOrders.Count, storeConnectionId);

                // Update existing orders in database
                await UpdateOrdersInDatabase(updatedOrders, storeConnectionId, result);

                // Update last sync timestamp
                await UpdateLastSyncTimestampAsync(storeConnectionId, DateTime.UtcNow);

                result.Duration = DateTime.UtcNow - startTime;
                result.Success = true;

                _logger.LogInformation("✅ Incremental sync completed for store {StoreConnectionId}: {UpdatedOrders} updated orders in {Duration}ms",
                    storeConnectionId, result.UpdatedOrders, result.Duration.TotalMilliseconds);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in incremental sync for store {StoreConnectionId}", storeConnectionId);
                result.Error = ex.Message;
                return result;
            }
        }

        public async Task<OrderSyncResult> SyncRecentOrdersAsync(Guid storeConnectionId, int daysBack = 30)
        {
            var startTime = DateTime.UtcNow;
            var result = new OrderSyncResult();

            try
            {
                var sinceDate = DateTime.UtcNow.AddDays(-daysBack);
                _logger.LogInformation("Starting recent orders sync for store {StoreConnectionId} (last {DaysBack} days)", storeConnectionId, daysBack);

                // Get store connection
                var storeConnection = await _context.StoreConnections
                    .FirstOrDefaultAsync(sc => sc.Id == storeConnectionId);

                if (storeConnection == null)
                {
                    result.Error = "Store connection not found";
                    return result;
                }

                // Create ShopifyCredentials
                var decryptedCredentials = await _storeConnectionService.GetDecryptedCredentialsAsync(storeConnectionId);
                if (decryptedCredentials == null || !decryptedCredentials.ContainsKey("accessToken"))
                {
                    result.Error = "Invalid store credentials";
                    return result;
                }

                var credentials = new ShopifyCredentials
                {
                    Store = storeConnection.StoreName,
                    AccessToken = decryptedCredentials["accessToken"]
                };

                // Fetch recent orders
                var recentOrders = new List<ShopifyOrder>();
                string? cursor = null;
                bool hasNextPage = true;
                int pageCount = 0;
                const int batchSize = 100;

                while (hasNextPage)
                {
                    pageCount++;
                    _logger.LogInformation("Fetching recent orders page {PageCount} for store {StoreConnectionId}", pageCount, storeConnectionId);

                    var graphqlQuery = ShopifyQueries.GetOrdersCreatedSinceQuery(sinceDate, batchSize, cursor);
                    var response = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, graphqlQuery);

                    if (!response.Success || response.Data == null)
                    {
                        result.Error = $"Failed to fetch recent orders from Shopify: {response.Error}";
                        return result;
                    }

                    var orders = ParseOrdersFromResponse(response.Data, storeConnectionId);
                    recentOrders.AddRange(orders);
                    result.TotalFetched += orders.Count;

                    hasNextPage = GetNextPageCursor(response.Data, out cursor);

                    if (hasNextPage)
                    {
                        await Task.Delay(500);
                    }
                }

                _logger.LogInformation("Fetched {OrderCount} recent orders from Shopify for store {StoreConnectionId}",
                    recentOrders.Count, storeConnectionId);

                // Save recent orders to database
                await SaveOrdersToDatabaseOptimized(recentOrders, storeConnectionId, result);

                result.Duration = DateTime.UtcNow - startTime;
                result.Success = true;

                _logger.LogInformation("✅ Recent orders sync completed for store {StoreConnectionId}: {NewOrders} new orders in {Duration}ms",
                    storeConnectionId, result.NewOrders, result.Duration.TotalMilliseconds);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing recent orders for store {StoreConnectionId}", storeConnectionId);
                result.Error = ex.Message;
                return result;
            }
        }

        public async Task<OrderSyncResult> SyncUnfulfilledOrdersAsync(Guid storeConnectionId)
        {
            var startTime = DateTime.UtcNow;
            var result = new OrderSyncResult();

            try
            {
                _logger.LogInformation("Starting unfulfilled orders sync for store {StoreConnectionId}", storeConnectionId);

                // Get store connection
                var storeConnection = await _context.StoreConnections
                    .FirstOrDefaultAsync(sc => sc.Id == storeConnectionId);

                if (storeConnection == null)
                {
                    result.Error = "Store connection not found";
                    return result;
                }

                // Create ShopifyCredentials
                var decryptedCredentials = await _storeConnectionService.GetDecryptedCredentialsAsync(storeConnectionId);
                if (decryptedCredentials == null || !decryptedCredentials.ContainsKey("accessToken"))
                {
                    result.Error = "Invalid store credentials";
                    return result;
                }

                var credentials = new ShopifyCredentials
                {
                    Store = storeConnection.StoreName,
                    AccessToken = decryptedCredentials["accessToken"]
                };

                // Fetch unfulfilled orders
                var unfulfilledOrders = new List<ShopifyOrder>();
                string? cursor = null;
                bool hasNextPage = true;
                int pageCount = 0;
                const int batchSize = 100;

                while (hasNextPage)
                {
                    pageCount++;
                    _logger.LogInformation("Fetching unfulfilled orders page {PageCount} for store {StoreConnectionId}", pageCount, storeConnectionId);

                    var graphqlQuery = ShopifyQueries.GetUnfulfilledOrdersQuery(batchSize);
                    var response = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, graphqlQuery);

                    if (!response.Success || response.Data == null)
                    {
                        result.Error = $"Failed to fetch unfulfilled orders from Shopify: {response.Error}";
                        return result;
                    }

                    var orders = ParseOrdersFromResponse(response.Data, storeConnectionId);
                    unfulfilledOrders.AddRange(orders);
                    result.TotalFetched += orders.Count;

                    hasNextPage = GetNextPageCursor(response.Data, out cursor);

                    if (hasNextPage)
                    {
                        await Task.Delay(500);
                    }
                }

                _logger.LogInformation("Fetched {OrderCount} unfulfilled orders from Shopify for store {StoreConnectionId}",
                    unfulfilledOrders.Count, storeConnectionId);

                // Update unfulfilled orders in database
                await UpdateOrdersInDatabase(unfulfilledOrders, storeConnectionId, result);

                result.Duration = DateTime.UtcNow - startTime;
                result.Success = true;

                _logger.LogInformation("✅ Unfulfilled orders sync completed for store {StoreConnectionId}: {UpdatedOrders} updated orders in {Duration}ms",
                    storeConnectionId, result.UpdatedOrders, result.Duration.TotalMilliseconds);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing unfulfilled orders for store {StoreConnectionId}", storeConnectionId);
                result.Error = ex.Message;
                return result;
            }
        }

        public async Task<OrderListResult> GetLocalOrdersAsync(
            Guid storeConnectionId,
            string? search = null,
            string? status = null,
            string? fulfillmentStatus = null,
            DateTime? startDate = null,
            DateTime? endDate = null,
            int page = 1,
            int pageSize = 50)
        {
            page = Math.Max(1, page);
            pageSize = Math.Min(pageSize, 200);

            var baseQuery = _context.ShopifyOrders
                .Where(o => o.StoreConnectionId == storeConnectionId);

            // Apply search filter
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLower();
                baseQuery = baseQuery.Where(o =>
                    o.OrderNumber.ToLower().Contains(searchLower) ||
                    o.Name.ToLower().Contains(searchLower) ||
                    (o.CustomerFirstName != null && o.CustomerFirstName.ToLower().Contains(searchLower)) ||
                    (o.CustomerLastName != null && o.CustomerLastName.ToLower().Contains(searchLower)) ||
                    (o.CustomerEmail != null && o.CustomerEmail.ToLower().Contains(searchLower)));
            }

            // Apply status filter
            if (!string.IsNullOrEmpty(status))
            {
                baseQuery = baseQuery.Where(o => o.Status.ToLower() == status.ToLower());
            }

            // Apply fulfillment status filter
            if (!string.IsNullOrEmpty(fulfillmentStatus))
            {
                baseQuery = baseQuery.Where(o => o.FulfillmentStatus.ToLower() == fulfillmentStatus.ToLower());
            }

            // Apply date filters
            if (startDate.HasValue)
            {
                baseQuery = baseQuery.Where(o => o.CreatedAt >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                baseQuery = baseQuery.Where(o => o.CreatedAt <= endDate.Value);
            }

            // Get count without loading all data
            var total = await baseQuery.CountAsync();
            var totalPages = (int)Math.Ceiling((double)total / pageSize);

            // Early return if no results
            if (total == 0)
            {
                return new OrderListResult
                {
                    Orders = new List<ShopifyOrder>(),
                    Total = 0,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = 0,
                    HasMore = false,
                    HasPrevious = false
                };
            }

            // Fetch the actual page data
            var orders = await baseQuery
                .OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new OrderListResult
            {
                Orders = orders,
                Total = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages,
                HasMore = page < totalPages,
                HasPrevious = page > 1
            };
        }

        public async Task<OrderCountResult> GetLocalOrderCountAsync(Guid storeConnectionId)
        {
            var orders = await _context.ShopifyOrders
                .Where(o => o.StoreConnectionId == storeConnectionId)
                .ToListAsync();

            return new OrderCountResult
            {
                Total = orders.Count,
                Fulfilled = orders.Count(o => o.FulfillmentStatus.ToLower() == "fulfilled"),
                Unfulfilled = orders.Count(o => o.FulfillmentStatus.ToLower() == "unfulfilled"),
                Cancelled = orders.Count(o => o.Status.ToLower() == "cancelled"),
                Pending = orders.Count(o => o.DisplayFinancialStatus.ToLower() == "pending"),
                Paid = orders.Count(o => o.DisplayFinancialStatus.ToLower() == "paid"),
                Unpaid = orders.Count(o => o.DisplayFinancialStatus.ToLower() == "unpaid"),
                Refunded = orders.Count(o => o.DisplayFinancialStatus.ToLower() == "refunded")
            };
        }

        public async Task<bool> HasLocalOrdersAsync(Guid storeConnectionId)
        {
            return await _context.ShopifyOrders
                .AnyAsync(o => o.StoreConnectionId == storeConnectionId);
        }

        public async Task<OrderSyncStats> GetOrderSyncStatsAsync(Guid storeConnectionId)
        {
            try
            {
                var stats = new OrderSyncStats();

                // Get order counts
                stats.TotalOrders = await _context.ShopifyOrders
                    .Where(o => o.StoreConnectionId == storeConnectionId)
                    .CountAsync();

                stats.UnfulfilledOrders = await _context.ShopifyOrders
                    .Where(o => o.StoreConnectionId == storeConnectionId && 
                               o.FulfillmentStatus.ToLower() == "unfulfilled")
                    .CountAsync();

                stats.FulfilledOrders = await _context.ShopifyOrders
                    .Where(o => o.StoreConnectionId == storeConnectionId && 
                               o.FulfillmentStatus.ToLower() == "fulfilled")
                    .CountAsync();

                // Get last sync info
                stats.LastSyncTimestamp = await GetLastSyncTimestampAsync(storeConnectionId);

                return stats;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting sync stats for store {StoreConnectionId}", storeConnectionId);
                return new OrderSyncStats();
            }
        }

        public async Task<CursorBasedResult> GetLocalOrdersWithCursorAsync(
            Guid storeConnectionId,
            string? search = null,
            string? status = null,
            string? fulfillmentStatus = null,
            DateTime? startDate = null,
            DateTime? endDate = null,
            string? cursor = null,
            int pageSize = 50)
        {
            pageSize = Math.Min(pageSize, 200);

            var baseQuery = _context.ShopifyOrders
                .Where(o => o.StoreConnectionId == storeConnectionId);

            // Apply search filter
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLower();
                baseQuery = baseQuery.Where(o =>
                    o.OrderNumber.ToLower().Contains(searchLower) ||
                    o.Name.ToLower().Contains(searchLower) ||
                    (o.CustomerFirstName != null && o.CustomerFirstName.ToLower().Contains(searchLower)) ||
                    (o.CustomerLastName != null && o.CustomerLastName.ToLower().Contains(searchLower)) ||
                    (o.CustomerEmail != null && o.CustomerEmail.ToLower().Contains(searchLower)));
            }

            // Apply status filter
            if (!string.IsNullOrEmpty(status))
            {
                baseQuery = baseQuery.Where(o => o.Status.ToLower() == status.ToLower());
            }

            // Apply fulfillment status filter
            if (!string.IsNullOrEmpty(fulfillmentStatus))
            {
                baseQuery = baseQuery.Where(o => o.FulfillmentStatus.ToLower() == fulfillmentStatus.ToLower());
            }

            // Apply date filters
            if (startDate.HasValue)
            {
                baseQuery = baseQuery.Where(o => o.CreatedAt >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                baseQuery = baseQuery.Where(o => o.CreatedAt <= endDate.Value);
            }

            // Apply cursor-based pagination
            if (!string.IsNullOrEmpty(cursor))
            {
                var cursorData = DecodeCursor(cursor);
                if (cursorData != null)
                {
                    baseQuery = baseQuery.Where(o => 
                        o.CreatedAt < cursorData.CreatedAt || 
                        (o.CreatedAt == cursorData.CreatedAt && o.Id.CompareTo(cursorData.Id) < 0));
                }
            }

            // Order by created date and ID for consistent cursor pagination
            baseQuery = baseQuery.OrderByDescending(o => o.CreatedAt).ThenByDescending(o => o.Id);

            // Get total count
            var total = await baseQuery.CountAsync();

            // Get the page of results
            var orders = await baseQuery.Take(pageSize + 1).ToListAsync();

            // Check if there are more results
            var hasMore = orders.Count > pageSize;
            if (hasMore)
            {
                orders.RemoveAt(orders.Count - 1); // Remove the extra item
            }

            // Generate next cursor
            string? nextCursor = null;
            if (hasMore && orders.Any())
            {
                var lastOrder = orders.Last();
                nextCursor = EncodeCursor(lastOrder);
            }

            return new CursorBasedResult
            {
                Orders = orders,
                Total = total,
                HasMore = hasMore,
                NextCursor = nextCursor
            };
        }

        public async Task<OrderListResult> GetLocalOrdersOptimizedAsync(
            Guid storeConnectionId,
            string? search = null,
            string? status = null,
            string? fulfillmentStatus = null,
            DateTime? startDate = null,
            DateTime? endDate = null,
            int page = 1,
            int pageSize = 50)
        {
            page = Math.Max(1, page);
            pageSize = Math.Min(pageSize, 200);

            var baseQuery = _context.ShopifyOrders
                .Where(o => o.StoreConnectionId == storeConnectionId);

            // Apply search filter
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLower();
                baseQuery = baseQuery.Where(o =>
                    o.OrderNumber.ToLower().Contains(searchLower) ||
                    o.Name.ToLower().Contains(searchLower) ||
                    (o.CustomerFirstName != null && o.CustomerFirstName.ToLower().Contains(searchLower)) ||
                    (o.CustomerLastName != null && o.CustomerLastName.ToLower().Contains(searchLower)) ||
                    (o.CustomerEmail != null && o.CustomerEmail.ToLower().Contains(searchLower)));
            }

            // Apply status filter
            if (!string.IsNullOrEmpty(status))
            {
                baseQuery = baseQuery.Where(o => o.Status.ToLower() == status.ToLower());
            }

            // Apply fulfillment status filter
            if (!string.IsNullOrEmpty(fulfillmentStatus))
            {
                baseQuery = baseQuery.Where(o => o.FulfillmentStatus.ToLower() == fulfillmentStatus.ToLower());
            }

            // Apply date filters
            if (startDate.HasValue)
            {
                baseQuery = baseQuery.Where(o => o.CreatedAt >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                baseQuery = baseQuery.Where(o => o.CreatedAt <= endDate.Value);
            }

            // Get count without loading all data
            var total = await baseQuery.CountAsync();
            var totalPages = (int)Math.Ceiling((double)total / pageSize);

            // Early return if no results
            if (total == 0)
            {
                return new OrderListResult
                {
                    Orders = new List<ShopifyOrder>(),
                    Total = 0,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = 0,
                    HasMore = false,
                    HasPrevious = false
                };
            }

            // Fetch the actual page data with optimized SQL
            var orders = await baseQuery
                .OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new OrderListResult
            {
                Orders = orders,
                Total = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages,
                HasMore = page < totalPages,
                HasPrevious = page > 1
            };
        }

        private List<ShopifyOrder> ParseOrdersFromResponse(object responseData, Guid storeConnectionId)
        {
            var orders = new List<ShopifyOrder>();

            try
            {
                var responseJson = JsonSerializer.Serialize(responseData);
                var responseElement = JsonSerializer.Deserialize<JsonElement>(responseJson);

                if (responseElement.TryGetProperty("data", out var dataElement) &&
                    dataElement.TryGetProperty("orders", out var ordersElement) &&
                    ordersElement.TryGetProperty("edges", out var edges))
                {
                    foreach (var edge in edges.EnumerateArray())
                    {
                        if (edge.TryGetProperty("node", out var orderNode))
                        {
                            var order = ParseOrderNode(orderNode, storeConnectionId);
                            if (order != null)
                            {
                                orders.Add(order);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing orders from Shopify response");
            }

            return orders;
        }

        private ShopifyOrder? ParseOrderNode(JsonElement orderNode, Guid storeConnectionId)
        {
            try
            {
                // Safely get required properties
                var orderId = orderNode.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? "" : "";
                var orderName = orderNode.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "" : "";
                
                var order = new ShopifyOrder
                {
                    Id = Guid.NewGuid(),
                    ShopifyOrderId = orderId,
                    Name = orderName,
                    OrderNumber = orderName,
                    StoreConnectionId = storeConnectionId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Parse dates
                if (orderNode.TryGetProperty("createdAt", out var createdAtProp) &&
                    createdAtProp.ValueKind != JsonValueKind.Null &&
                    DateTime.TryParse(createdAtProp.GetString(), null, DateTimeStyles.RoundtripKind, out var createdAt))
                    order.CreatedAt = createdAt.Kind == DateTimeKind.Utc ? createdAt : createdAt.ToUniversalTime();

                if (orderNode.TryGetProperty("updatedAt", out var updatedAtProp) &&
                    updatedAtProp.ValueKind != JsonValueKind.Null &&
                    DateTime.TryParse(updatedAtProp.GetString(), null, DateTimeStyles.RoundtripKind, out var updatedAt))
                    order.UpdatedAt = updatedAt.Kind == DateTimeKind.Utc ? updatedAt : updatedAt.ToUniversalTime();

                // Parse total price
                if (orderNode.TryGetProperty("totalPriceSet", out var totalPriceSet) &&
                    totalPriceSet.ValueKind != JsonValueKind.Null &&
                    totalPriceSet.TryGetProperty("shopMoney", out var shopMoney) &&
                    shopMoney.ValueKind != JsonValueKind.Null)
                {
                    if (shopMoney.TryGetProperty("amount", out var amount) &&
                        amount.ValueKind != JsonValueKind.Null &&
                        decimal.TryParse(amount.GetString(), out var totalPrice))
                    {
                        order.TotalPrice = totalPrice;
                    }
                    if (shopMoney.TryGetProperty("currencyCode", out var currency) &&
                        currency.ValueKind != JsonValueKind.Null)
                    {
                        order.Currency = currency.GetString() ?? "INR";
                    }
                }

                // Parse fulfillment and financial status
                order.FulfillmentStatus = orderNode.TryGetProperty("displayFulfillmentStatus", out var fulfillmentStatus) ? fulfillmentStatus.GetString() ?? "unfulfilled" : "unfulfilled";
                order.DisplayFulfillmentStatus = orderNode.TryGetProperty("displayFulfillmentStatus", out var displayFulfillmentStatus) ? displayFulfillmentStatus.GetString() ?? "Unfulfilled" : "Unfulfilled";
                order.DisplayFinancialStatus = orderNode.TryGetProperty("displayFinancialStatus", out var displayFinancialStatus) ? displayFinancialStatus.GetString() ?? "Pending" : "Pending";
                order.Status = order.FulfillmentStatus;

                // Parse customer information
                if (orderNode.TryGetProperty("customer", out var customer) && 
                    customer.ValueKind != JsonValueKind.Null)
                {
                    order.CustomerFirstName = customer.TryGetProperty("firstName", out var firstName) && firstName.ValueKind != JsonValueKind.Null ? firstName.GetString() : "";
                    order.CustomerLastName = customer.TryGetProperty("lastName", out var lastName) && lastName.ValueKind != JsonValueKind.Null ? lastName.GetString() : "";
                    order.CustomerEmail = customer.TryGetProperty("email", out var email) && email.ValueKind != JsonValueKind.Null ? email.GetString() : "";
                }

                // Parse shipping address
                if (orderNode.TryGetProperty("shippingAddress", out var shippingAddress) && 
                    shippingAddress.ValueKind != JsonValueKind.Null)
                {
                    order.ShippingFirstName = shippingAddress.TryGetProperty("firstName", out var shipFirstName) && shipFirstName.ValueKind != JsonValueKind.Null ? shipFirstName.GetString() : "";
                    order.ShippingLastName = shippingAddress.TryGetProperty("lastName", out var shipLastName) && shipLastName.ValueKind != JsonValueKind.Null ? shipLastName.GetString() : "";
                    order.ShippingAddress1 = shippingAddress.TryGetProperty("address1", out var address1) && address1.ValueKind != JsonValueKind.Null ? address1.GetString() : "";
                    order.ShippingCity = shippingAddress.TryGetProperty("city", out var city) && city.ValueKind != JsonValueKind.Null ? city.GetString() : "";
                    order.ShippingProvince = shippingAddress.TryGetProperty("province", out var province) && province.ValueKind != JsonValueKind.Null ? province.GetString() : "";
                    order.ShippingCountry = shippingAddress.TryGetProperty("country", out var country) && country.ValueKind != JsonValueKind.Null ? country.GetString() : "";
                    order.ShippingZip = shippingAddress.TryGetProperty("zip", out var zip) && zip.ValueKind != JsonValueKind.Null ? zip.GetString() : "";
                }

                // Parse line items
                if (orderNode.TryGetProperty("lineItems", out var lineItems) &&
                    lineItems.ValueKind != JsonValueKind.Null &&
                    lineItems.TryGetProperty("edges", out var lineItemEdges))
                {
                    var lineItemsList = new List<object>();
                    foreach (var edge in lineItemEdges.EnumerateArray())
                    {
                        if (edge.ValueKind != JsonValueKind.Null &&
                            edge.TryGetProperty("node", out var lineItemNode) && 
                            lineItemNode.ValueKind != JsonValueKind.Null)
                        {
                            // Parse variant information for cost calculation
                            var variantInfo = new
                            {
                                id = "",
                                title = "",
                                sku = "",
                                cost = 0.00m,
                                price = 0.00m,
                                compareAtPrice = 0.00m
                            };

                            if (lineItemNode.TryGetProperty("variant", out var variantNode) && 
                                variantNode.ValueKind != JsonValueKind.Null)
                            {
                                variantInfo = new
                                {
                                    id = variantNode.TryGetProperty("id", out var variantId) && variantId.ValueKind != JsonValueKind.Null ? variantId.GetString() ?? "" : "",
                                    title = variantNode.TryGetProperty("title", out var variantTitle) && variantTitle.ValueKind != JsonValueKind.Null ? variantTitle.GetString() ?? "" : "",
                                    sku = variantNode.TryGetProperty("sku", out var variantSku) && variantSku.ValueKind != JsonValueKind.Null ? variantSku.GetString() ?? "" : "",
                                    cost = variantNode.TryGetProperty("cost", out var costProp) && costProp.ValueKind != JsonValueKind.Null && decimal.TryParse(costProp.GetString() ?? "", out var cost) ? cost : 0.00m,
                                    price = variantNode.TryGetProperty("price", out var priceProp) && priceProp.ValueKind != JsonValueKind.Null && decimal.TryParse(priceProp.GetString() ?? "", out var price) ? price : 0.00m,
                                    compareAtPrice = variantNode.TryGetProperty("compareAtPrice", out var compareProp) && compareProp.ValueKind != JsonValueKind.Null && decimal.TryParse(compareProp.GetString() ?? "", out var comparePrice) ? comparePrice : 0.00m
                                };
                            }

                            var lineItem = new
                            {
                                id = lineItemNode.TryGetProperty("id", out var id) && id.ValueKind != JsonValueKind.Null ? id.GetString() : "",
                                title = lineItemNode.TryGetProperty("title", out var title) && title.ValueKind != JsonValueKind.Null ? title.GetString() : "",
                                quantity = lineItemNode.TryGetProperty("quantity", out var quantity) && quantity.ValueKind != JsonValueKind.Null ? quantity.GetInt32() : 0,
                                originalTotalSet = lineItemNode.TryGetProperty("originalTotalSet", out var totalSet) &&
                                                 totalSet.ValueKind != JsonValueKind.Null &&
                                                 totalSet.TryGetProperty("shopMoney", out var money) &&
                                                 money.ValueKind != JsonValueKind.Null &&
                                                 money.TryGetProperty("amount", out var amount) && amount.ValueKind != JsonValueKind.Null ? amount.GetString() : "0.00",
                                image = lineItemNode.TryGetProperty("image", out var image) &&
                                       image.ValueKind != JsonValueKind.Null &&
                                       image.TryGetProperty("url", out var url) && url.ValueKind != JsonValueKind.Null ? url.GetString() : null,
                                variant = variantInfo
                            };
                            lineItemsList.Add(lineItem);
                        }
                    }
                    order.LineItemsJson = JsonSerializer.Serialize(lineItemsList);
                }

                return order;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing order node");
                return null;
            }
        }

        private bool GetNextPageCursor(object responseData, out string? cursor)
        {
            cursor = null;

            try
            {
                var responseJson = JsonSerializer.Serialize(responseData);
                var responseElement = JsonSerializer.Deserialize<JsonElement>(responseJson);

                if (responseElement.TryGetProperty("data", out var dataElement) &&
                    dataElement.TryGetProperty("orders", out var ordersElement) &&
                    ordersElement.TryGetProperty("pageInfo", out var pageInfo))
                {
                    var hasNextPage = pageInfo.TryGetProperty("hasNextPage", out var hasNext) && hasNext.GetBoolean();
                    if (hasNextPage && pageInfo.TryGetProperty("endCursor", out var endCursor))
                    {
                        cursor = endCursor.GetString();
                        return true;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing pagination info from Shopify response");
            }

            return false;
        }

        private async Task SaveOrdersToDatabase(List<ShopifyOrder> orders, Guid storeConnectionId, OrderSyncResult result)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // If force refresh, remove existing orders first
                var existingOrders = await _context.ShopifyOrders
                    .Where(o => o.StoreConnectionId == storeConnectionId)
                    .ToListAsync();

                if (existingOrders.Any())
                {
                    _context.ShopifyOrders.RemoveRange(existingOrders);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Removed {Count} existing orders for store {StoreConnectionId}",
                        existingOrders.Count, storeConnectionId);
                }

                // Add all new orders
                await _context.ShopifyOrders.AddRangeAsync(orders);
                await _context.SaveChangesAsync();

                result.NewOrders = orders.Count;

                // Count line items
                result.TotalLineItems = orders.Sum(o =>
                {
                    try
                    {
                        var lineItems = JsonSerializer.Deserialize<List<object>>(o.LineItemsJson ?? "[]");
                        return lineItems?.Count ?? 0;
                    }
                    catch
                    {
                        return 0;
                    }
                });

                await transaction.CommitAsync();

                _logger.LogInformation("Saved {OrderCount} orders with {LineItemCount} line items to database for store {StoreConnectionId}",
                    orders.Count, result.TotalLineItems, storeConnectionId);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error saving orders to database for store {StoreConnectionId}", storeConnectionId);
                throw;
            }
        }

        private async Task SaveOrdersToDatabaseOptimized(List<ShopifyOrder> orders, Guid storeConnectionId, OrderSyncResult result)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // If force refresh, remove existing orders first
                var existingOrders = await _context.ShopifyOrders
                    .Where(o => o.StoreConnectionId == storeConnectionId)
                    .ToListAsync();

                if (existingOrders.Any())
                {
                    _context.ShopifyOrders.RemoveRange(existingOrders);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Removed {Count} existing orders for store {StoreConnectionId}",
                        existingOrders.Count, storeConnectionId);
                }

                // Add all new orders
                await _context.ShopifyOrders.AddRangeAsync(orders);
                await _context.SaveChangesAsync();

                result.NewOrders = orders.Count;

                // Count line items
                result.TotalLineItems = orders.Sum(o =>
                {
                    try
                    {
                        var lineItems = JsonSerializer.Deserialize<List<object>>(o.LineItemsJson ?? "[]");
                        return lineItems?.Count ?? 0;
                    }
                    catch
                    {
                        return 0;
                    }
                });

                await transaction.CommitAsync();

                _logger.LogInformation("Saved {OrderCount} orders with {LineItemCount} line items to database for store {StoreConnectionId}",
                    orders.Count, result.TotalLineItems, storeConnectionId);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error saving orders to database for store {StoreConnectionId}", storeConnectionId);
                throw;
            }
        }

        private async Task UpdateOrdersInDatabase(List<ShopifyOrder> orders, Guid storeConnectionId, OrderSyncResult result)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Get existing orders to check for updates
                var existingOrders = await _context.ShopifyOrders
                    .Where(o => o.StoreConnectionId == storeConnectionId)
                    .ToListAsync();

                var updatedCount = 0;
                var newCount = 0;

                foreach (var newOrder in orders)
                {
                    var existingOrder = existingOrders.FirstOrDefault(eo => eo.ShopifyOrderId == newOrder.ShopifyOrderId);

                    if (existingOrder != null)
                    {
                        // Update existing order
                        existingOrder.Name = newOrder.Name;
                        existingOrder.OrderNumber = newOrder.OrderNumber;
                        existingOrder.TotalPrice = newOrder.TotalPrice;
                        existingOrder.Currency = newOrder.Currency;
                        existingOrder.FulfillmentStatus = newOrder.FulfillmentStatus;
                        existingOrder.DisplayFulfillmentStatus = newOrder.DisplayFulfillmentStatus;
                        existingOrder.DisplayFinancialStatus = newOrder.DisplayFinancialStatus;
                        existingOrder.Status = newOrder.Status;
                        existingOrder.UpdatedAt = DateTime.UtcNow;
                        updatedCount++;
                    }
                    else
                    {
                        // Add new order
                        newOrder.StoreConnectionId = storeConnectionId;
                        await _context.ShopifyOrders.AddAsync(newOrder);
                        newCount++;
                    }
                }

                // DO NOT remove orders during incremental sync - only add/update
                // This prevents losing existing orders when incremental sync only finds a few new ones
                // var ordersToRemove = existingOrders.Where(eo => !orders.Any(no => no.ShopifyOrderId == eo.ShopifyOrderId)).ToList();
                // if (ordersToRemove.Any())
                // {
                //     _context.ShopifyOrders.RemoveRange(ordersToRemove);
                //     await _context.SaveChangesAsync();
                //     _logger.LogInformation("Removed {Count} orders from database for store {StoreConnectionId} that were deleted in Shopify",
                //         ordersToRemove.Count, storeConnectionId);
                // }

                result.UpdatedOrders = updatedCount;
                result.NewOrders = newCount;

                // Count line items
                result.TotalLineItems = orders.Sum(o =>
                {
                    try
                    {
                        var lineItems = JsonSerializer.Deserialize<List<object>>(o.LineItemsJson ?? "[]");
                        return lineItems?.Count ?? 0;
                    }
                    catch
                    {
                        return 0;
                    }
                });

                await transaction.CommitAsync();

                _logger.LogInformation("Updated {UpdatedCount} orders and added {NewCount} new orders for store {StoreConnectionId}",
                    updatedCount, newCount, storeConnectionId);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error updating orders in database for store {StoreConnectionId}", storeConnectionId);
                throw;
            }
        }

        // Cursor encoding/decoding utilities
        private class CursorData
        {
            public DateTime CreatedAt { get; set; }
            public Guid Id { get; set; }
        }

        private string EncodeCursor(ShopifyOrder order)
        {
            var cursorData = new CursorData
            {
                CreatedAt = order.CreatedAt,
                Id = order.Id
            };
            var json = JsonSerializer.Serialize(cursorData);
            return Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(json));
        }

        private CursorData? DecodeCursor(string cursor)
        {
            try
            {
                var bytes = Convert.FromBase64String(cursor);
                var json = System.Text.Encoding.UTF8.GetString(bytes);
                return JsonSerializer.Deserialize<CursorData>(json);
            }
            catch
            {
                return null;
            }
        }

        public async Task<DateTime?> GetLastSyncTimestampAsync(Guid storeConnectionId)
        {
            try
            {
                // Get the most recent order's createdAt timestamp for better incremental syncing
                var lastOrder = await _context.ShopifyOrders
                    .Where(o => o.StoreConnectionId == storeConnectionId)
                    .OrderByDescending(o => o.CreatedAt)
                    .Select(o => o.CreatedAt)
                    .FirstOrDefaultAsync();

                return lastOrder;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting last sync timestamp for store {StoreConnectionId}", storeConnectionId);
                return null;
            }
        }

        public async Task<DateTime?> GetLastUpdatedTimestampAsync(Guid storeConnectionId)
        {
            try
            {
                // Get the most recent order's updatedAt timestamp for checking updates
                var lastOrder = await _context.ShopifyOrders
                    .Where(o => o.StoreConnectionId == storeConnectionId)
                    .OrderByDescending(o => o.UpdatedAt)
                    .Select(o => o.UpdatedAt)
                    .FirstOrDefaultAsync();

                return lastOrder;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting last updated timestamp for store {StoreConnectionId}", storeConnectionId);
                return null;
            }
        }

        public async Task UpdateLastSyncTimestampAsync(Guid storeConnectionId, DateTime timestamp)
        {
            try
            {
                // This could be stored in a separate sync tracking table
                // For now, we'll use the latest order's updated timestamp
                var latestOrder = await _context.ShopifyOrders
                    .Where(o => o.StoreConnectionId == storeConnectionId)
                    .OrderByDescending(o => o.UpdatedAt)
                    .FirstOrDefaultAsync();

                if (latestOrder != null)
                {
                    latestOrder.UpdatedAt = timestamp;
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating last sync timestamp for store {StoreConnectionId}", storeConnectionId);
            }
        }

        /// <summary>
        /// Calculate the total cost for an order based on line items with variant cost information
        /// </summary>
        public static decimal CalculateOrderCost(string lineItemsJson)
        {
            try
            {
                if (string.IsNullOrEmpty(lineItemsJson))
                    return 0;

                var lineItems = JsonSerializer.Deserialize<List<JsonElement>>(lineItemsJson);
                if (lineItems == null)
                    return 0;

                decimal totalCost = 0;

                foreach (var item in lineItems)
                {
                    try
                    {
                        if (!item.TryGetProperty("quantity", out var quantityElement))
                            continue;

                        var quantity = quantityElement.GetInt32();
                        decimal itemCost = 0;

                        // Try to get cost from variant information in line item
                        if (item.TryGetProperty("variant", out var variantElement))
                        {
                            // Check if variant is an object (not a string)
                            if (variantElement.ValueKind == JsonValueKind.Object)
                            {
                                if (variantElement.TryGetProperty("cost", out var costElement) && 
                                    costElement.ValueKind != JsonValueKind.Null &&
                                    decimal.TryParse(costElement.GetString(), out var cost))
                                {
                                    itemCost = cost * quantity;
                                }
                            }
                            // If variant is a string, we can't get cost from it
                            else if (variantElement.ValueKind == JsonValueKind.String)
                            {
                                // Skip this variant as it's just a string ID
                                // Log at debug level instead of console output
                            }
                        }

                        // If no cost found in variant, try to estimate from price
                        if (itemCost == 0 && item.TryGetProperty("originalTotalSet", out var totalSet) &&
                            totalSet.TryGetProperty("shopMoney", out var shopMoney) &&
                            shopMoney.TryGetProperty("amount", out var amount) &&
                            amount.ValueKind != JsonValueKind.Null &&
                            decimal.TryParse(amount.GetString(), out var totalAmount))
                        {
                            // TODO: Fetch actual product cost from Shopify API
                            // The cost should be retrieved from Shopify product data, not estimated
                            // Log at debug level instead of console output
                            itemCost = 0; // Set to 0 until we implement proper cost fetching
                        }

                        totalCost += itemCost;
                    }
                    catch (Exception)
                    {
                        // Log warning but continue processing other items
                        // Log at debug level instead of console output
                    }
                }

                return totalCost;
            }
            catch (Exception)
            {
                // Log at debug level instead of console output
                return 0;
            }
        }

        /// <summary>
        /// Get cost per item for a specific line item
        /// </summary>
        public static decimal GetCostPerItem(string lineItemsJson, string lineItemId)
        {
            try
            {
                if (string.IsNullOrEmpty(lineItemsJson))
                    return 0;

                var lineItems = JsonSerializer.Deserialize<List<JsonElement>>(lineItemsJson);
                if (lineItems == null)
                    return 0;

                foreach (var item in lineItems)
                {
                    try
                    {
                        if (!item.TryGetProperty("id", out var idElement) || 
                            idElement.GetString() != lineItemId)
                            continue;

                        // Try to get cost from variant information
                        if (item.TryGetProperty("variant", out var variantElement))
                        {
                            // Check if variant is an object (not a string)
                            if (variantElement.ValueKind == JsonValueKind.Object)
                            {
                                if (variantElement.TryGetProperty("cost", out var costElement) && 
                                    costElement.ValueKind != JsonValueKind.Null &&
                                    decimal.TryParse(costElement.GetString(), out var cost))
                                {
                                    return cost;
                                }
                            }
                            // If variant is a string, we can't get cost from it
                            else if (variantElement.ValueKind == JsonValueKind.String)
                            {
                                // Skip this variant as it's just a string ID
                                // Log at debug level instead of console output
                            }
                        }

                        // If no cost found, try to estimate from price
                        if (item.TryGetProperty("originalTotalSet", out var totalSet) &&
                            totalSet.TryGetProperty("shopMoney", out var shopMoney) &&
                            shopMoney.TryGetProperty("amount", out var amount) &&
                            amount.ValueKind != JsonValueKind.Null &&
                            decimal.TryParse(amount.GetString(), out var totalAmount))
                        {
                            if (item.TryGetProperty("quantity", out var quantityElement))
                            {
                                var quantity = quantityElement.GetInt32();
                                if (quantity > 0)
                                {
                                    // TODO: Fetch actual product cost from Shopify API
                                    // The cost should be retrieved from Shopify product data, not estimated
                                    // Log at debug level instead of console output
                                    return 0; // Set to 0 until we implement proper cost fetching
                                }
                            }
                        }
                    }
                    catch (Exception)
                    {
                        // Log at debug level instead of console output
                    }
                }

                return 0;
            }
            catch (Exception)
            {
                // Log at debug level instead of console output
                return 0;
            }
        }
    }
}