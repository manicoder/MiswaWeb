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
using System.Net.Http;
using System;

namespace Mlt.Admin.Api.Services
{
    public class ShopifyProductSyncService : IShopifyProductSyncService
    {
        private readonly ApplicationDbContext _context;
        private readonly IShopifyApiService _shopifyApiService;
        private readonly IStoreConnectionService _storeConnectionService;
        private readonly ILogger<ShopifyProductSyncService> _logger;

        public ShopifyProductSyncService(
            ApplicationDbContext context,
            IShopifyApiService shopifyApiService,
            IStoreConnectionService storeConnectionService,
            ILogger<ShopifyProductSyncService> logger)
        {
            _context = context;
            _shopifyApiService = shopifyApiService;
            _storeConnectionService = storeConnectionService;
            _logger = logger;
        }

        public async Task<ProductSyncResult> SyncProductsAsync(Guid storeConnectionId, bool forceRefresh = false)
        {
            var startTime = DateTime.UtcNow;
            var result = new ProductSyncResult();

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

                // Check if products already exist and we're not forcing refresh
                if (!forceRefresh && await HasLocalProductsAsync(storeConnectionId))
                {
                    _logger.LogInformation("Products already exist for store {StoreConnectionId}, skipping sync", storeConnectionId);
                    result.Error = "Products already exist. Use forceRefresh=true to resync.";
                    return result;
                }

                _logger.LogInformation("Starting product sync for store {StoreConnectionId}", storeConnectionId);

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
                    _logger.LogError("No access token found in store connection {StoreConnectionId}", storeConnectionId);
                    result.Error = "No access token found in store connection";
                    return result;
                }

                var credentials = new ShopifyCredentials
                {
                    Store = storeConnection.StoreName,
                    AccessToken = decryptedCredentials["accessToken"]
                };

                // Fetch all products from Shopify
                var allProducts = new List<ShopifyProduct>();
                string? cursor = null;
                bool hasNextPage = true;
                int pageCount = 0;

                while (hasNextPage)
                {
                    pageCount++;
                    _logger.LogInformation("Fetching products page {PageCount} for store {StoreConnectionId}", pageCount, storeConnectionId);

                    var graphqlQuery = ShopifyQueries.GetProductsQuery(250, cursor);
                    var response = await _shopifyApiService.ExecuteGraphQLQueryAsync<object>(credentials, graphqlQuery);

                    if (!response.Success || response.Data == null)
                    {
                        result.Error = $"Failed to fetch products from Shopify: {response.Error}";
                        return result;
                    }

                    var products = ParseProductsFromResponse(response.Data, storeConnectionId);
                    allProducts.AddRange(products);
                    result.TotalFetched += products.Count;

                    // Check for next page
                    hasNextPage = GetNextPageCursor(response.Data, out cursor);
                    
                    // Add small delay to avoid rate limiting
                    if (hasNextPage)
                    {
                        await Task.Delay(200);
                    }
                }

                _logger.LogInformation("Fetched {ProductCount} products from Shopify for store {StoreConnectionId}", 
                    allProducts.Count, storeConnectionId);

                // Save products to database and fetch cost data in parallel
                await SaveProductsAndFetchCostsInParallel(allProducts, storeConnectionId, credentials, result);

                result.Duration = DateTime.UtcNow - startTime;
                _logger.LogInformation("Product sync completed for store {StoreConnectionId}. " +
                    "Fetched: {Fetched}, New: {New}, Updated: {Updated}, Variants: {Variants}, Duration: {Duration}ms",
                    storeConnectionId, result.TotalFetched, result.NewProducts, 
                    result.UpdatedProducts, result.TotalVariants, result.Duration.TotalMilliseconds);

                return result;
            }
            catch (Exception ex)
            {
                result.Error = ex.Message;
                result.Duration = DateTime.UtcNow - startTime;
                _logger.LogError(ex, "Error during product sync for store {StoreConnectionId}", storeConnectionId);
                return result;
            }
        }

        public async Task<ProductListResult> GetLocalProductsAsync(
            Guid storeConnectionId, 
            string? search = null, 
            string? status = null, 
            int page = 1, 
            int pageSize = 50)
        {
                            // Ensure page is at least 1 and allow "All" option
        page = Math.Max(1, page);
        pageSize = pageSize >= 9999 ? 9999 : Math.Min(pageSize, 200); // Allow "All" option (9999) or limit to 200
        var isShowingAll = pageSize >= 9999;
        
        var baseQuery = _context.ShopifyProducts
            .Where(p => p.StoreConnectionId == storeConnectionId);

        // Apply filters to base query
        if (!string.IsNullOrEmpty(search))
        {
            var searchLower = search.ToLower();
            baseQuery = baseQuery.Where(p => 
                p.Title.ToLower().Contains(searchLower) ||
                p.Vendor!.ToLower().Contains(searchLower) ||
                p.ProductType!.ToLower().Contains(searchLower) ||
                p.Variants.Any(v => v.Sku!.ToLower().Contains(searchLower) || 
                                   v.Barcode!.ToLower().Contains(searchLower)));
        }

        if (!string.IsNullOrEmpty(status))
        {
            baseQuery = baseQuery.Where(p => p.Status.ToLower() == status.ToLower());
        }

        // Optimize: Get count without loading all data
        var total = await baseQuery.CountAsync();
        var totalPages = isShowingAll ? 1 : (int)Math.Ceiling((double)total / pageSize);
        
        // Early return if no results
        if (total == 0)
        {
            return new ProductListResult
            {
                Products = new List<ShopifyProduct>(),
                Total = 0,
                Page = isShowingAll ? 1 : page,
                PageSize = pageSize,
                TotalPages = 0,
                HasMore = false,
                HasPrevious = false
            };
        }

        // Fetch the actual page data with includes
        var products = isShowingAll 
            ? await baseQuery
                .OrderByDescending(p => p.ShopifyUpdatedAt)
                .ThenByDescending(p => p.Id)
                .Include(p => p.Variants)
                .ToListAsync()
            : await baseQuery
                .OrderByDescending(p => p.ShopifyUpdatedAt)
                .ThenByDescending(p => p.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Include(p => p.Variants)
                .ToListAsync();

        return new ProductListResult
        {
            Products = products,
            Total = total,
            Page = isShowingAll ? 1 : page,
            PageSize = pageSize,
            TotalPages = totalPages,
                        HasMore = !isShowingAll && page < totalPages,
            HasPrevious = !isShowingAll && page > 1
            };
        }

        public async Task<ProductCountResult> GetLocalProductCountAsync(Guid storeConnectionId)
        {
            // Use stored procedure for better performance
            var connectionString = _context.Database.GetConnectionString();
            using (var connection = new NpgsqlConnection(connectionString))
            {
                await connection.OpenAsync();
                
                using var command = connection.CreateCommand();
                command.CommandText = "SELECT GetShopifyProductCount(@storeConnectionId) as total_count";
                command.Parameters.Add(new NpgsqlParameter("@storeConnectionId", storeConnectionId));

                var total = Convert.ToInt32(await command.ExecuteScalarAsync());

                // Get status-based counts using separate queries for now
                // In the future, we could create a more comprehensive stored procedure
                var active = await _context.ShopifyProducts
                    .Where(p => p.StoreConnectionId == storeConnectionId && p.Status.ToLower() == "active")
                    .CountAsync();

                var draft = await _context.ShopifyProducts
                    .Where(p => p.StoreConnectionId == storeConnectionId && p.Status.ToLower() == "draft")
                    .CountAsync();

                var archived = await _context.ShopifyProducts
                    .Where(p => p.StoreConnectionId == storeConnectionId && p.Status.ToLower() == "archived")
                    .CountAsync();

                // Calculate stock-based counts using EF for now
                var products = await _context.ShopifyProducts
                    .Include(p => p.Variants)
                    .Where(p => p.StoreConnectionId == storeConnectionId)
                    .ToListAsync();

                var outOfStock = 0;
                var limitedStock = 0;

                foreach (var product in products)
                {
                    var totalInventory = product.Variants.Sum(v => v.InventoryQuantity);
                    if (totalInventory == 0)
                    {
                        outOfStock++;
                    }
                    else if (totalInventory > 0 && totalInventory <= 10)
                    {
                        limitedStock++;
                    }
                }

                return new ProductCountResult
                {
                    All = total,
                    Active = active,
                    Draft = draft,
                    Archived = archived,
                    OutOfStock = outOfStock,
                    LimitedStock = limitedStock
                };
            }
        }

        public async Task<bool> HasLocalProductsAsync(Guid storeConnectionId)
        {
            return await _context.ShopifyProducts
                .AnyAsync(p => p.StoreConnectionId == storeConnectionId);
        }

        private List<ShopifyProduct> ParseProductsFromResponse(object responseData, Guid storeConnectionId)
        {
            var products = new List<ShopifyProduct>();

            try
            {
                var responseJson = JsonSerializer.Serialize(responseData);
                var responseElement = JsonSerializer.Deserialize<JsonElement>(responseJson);

                if (!responseElement.TryGetProperty("data", out var dataElement) ||
                    !dataElement.TryGetProperty("products", out var productsElement) ||
                    !productsElement.TryGetProperty("edges", out var edgesElement))
                {
                    return products;
                }

                foreach (var edge in edgesElement.EnumerateArray())
                {
                    if (!edge.TryGetProperty("node", out var productNode))
                        continue;

                    var product = ParseSingleProduct(productNode, storeConnectionId);
                    if (product != null)
                        products.Add(product);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing products from Shopify response");
            }

            return products;
        }

        private ShopifyProduct? ParseSingleProduct(JsonElement productNode, Guid storeConnectionId)
        {
            try
            {
                var product = new ShopifyProduct
                {
                    Id = Guid.NewGuid(),
                    ShopifyProductId = productNode.GetProperty("id").GetString() ?? "",
                    Title = productNode.GetProperty("title").GetString() ?? "",
                    Handle = productNode.TryGetProperty("handle", out var handleProp) ? handleProp.GetString() ?? "" : "",
                    BodyHtml = productNode.TryGetProperty("bodyHtml", out var bodyProp) ? bodyProp.GetString() : null,
                    Vendor = productNode.TryGetProperty("vendor", out var vendorProp) ? vendorProp.GetString() : null,
                    ProductType = productNode.TryGetProperty("productType", out var typeProp) ? typeProp.GetString() : null,
                    Status = productNode.GetProperty("status").GetString() ?? "active",
                    Tags = productNode.TryGetProperty("tags", out var tagsProp) ? string.Join(",", tagsProp.EnumerateArray().Select(t => t.GetString())) : null,
                    StoreConnectionId = storeConnectionId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    // Initialize Shopify dates with UTC defaults (will be overridden if parsing succeeds)
                    ShopifyCreatedAt = DateTime.UtcNow,
                    ShopifyUpdatedAt = DateTime.UtcNow
                };

                // Parse dates - ensure UTC format for PostgreSQL compatibility
                if (productNode.TryGetProperty("createdAt", out var createdAtProp) && 
                    DateTime.TryParse(createdAtProp.GetString(), null, DateTimeStyles.RoundtripKind, out var createdAt))
                    product.ShopifyCreatedAt = createdAt.Kind == DateTimeKind.Utc ? createdAt : createdAt.ToUniversalTime();

                if (productNode.TryGetProperty("updatedAt", out var updatedAtProp) && 
                    DateTime.TryParse(updatedAtProp.GetString(), null, DateTimeStyles.RoundtripKind, out var updatedAt))
                    product.ShopifyUpdatedAt = updatedAt.Kind == DateTimeKind.Utc ? updatedAt : updatedAt.ToUniversalTime();

                if (productNode.TryGetProperty("publishedAt", out var publishedAtProp) && 
                    DateTime.TryParse(publishedAtProp.GetString(), null, DateTimeStyles.RoundtripKind, out var publishedAt))
                    product.ShopifyPublishedAt = publishedAt.Kind == DateTimeKind.Utc ? publishedAt : publishedAt.ToUniversalTime();

                // Parse first image
                if (productNode.TryGetProperty("images", out var imagesElement) &&
                    imagesElement.TryGetProperty("edges", out var imageEdges) &&
                    imageEdges.GetArrayLength() > 0)
                {
                    var firstImageEdge = imageEdges[0];
                    if (firstImageEdge.TryGetProperty("node", out var imageNode))
                    {
                        product.ImageUrl = imageNode.TryGetProperty("url", out var urlProp) ? urlProp.GetString() : null;
                        product.ImageAltText = imageNode.TryGetProperty("altText", out var altProp) ? altProp.GetString() : null;
                        if (imageNode.TryGetProperty("width", out var widthProp) && widthProp.TryGetInt32(out var width))
                            product.ImageWidth = width;
                        if (imageNode.TryGetProperty("height", out var heightProp) && heightProp.TryGetInt32(out var height))
                            product.ImageHeight = height;
                    }
                }

                // Parse variants
                if (productNode.TryGetProperty("variants", out var variantsElement) &&
                    variantsElement.TryGetProperty("edges", out var variantEdges))
                {
                    foreach (var variantEdge in variantEdges.EnumerateArray())
                    {
                        if (!variantEdge.TryGetProperty("node", out var variantNode))
                            continue;

                        var variant = ParseSingleVariant(variantNode, product.Id);
                        if (variant != null)
                            product.Variants.Add(variant);
                    }
                }

                return product;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing single product from Shopify response");
                return null;
            }
        }

        private ShopifyProductVariant? ParseSingleVariant(JsonElement variantNode, Guid productId)
        {
            try
            {
                var variant = new ShopifyProductVariant
                {
                    Id = Guid.NewGuid(),
                    ProductId = productId,
                    ShopifyVariantId = variantNode.GetProperty("id").GetString() ?? "",
                    Title = variantNode.TryGetProperty("title", out var titleProp) ? titleProp.GetString() : null,
                    Sku = variantNode.TryGetProperty("sku", out var skuProp) ? skuProp.GetString() : null,
                    Barcode = variantNode.TryGetProperty("barcode", out var barcodeProp) ? barcodeProp.GetString() : null,
                    InventoryQuantity = variantNode.TryGetProperty("inventoryQuantity", out var inventoryProp) ? inventoryProp.GetInt32() : 0,
                    CostPerItem = null, // Will be populated from Shopify cost field
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    // Initialize Shopify dates with UTC defaults (will be overridden if parsing succeeds)
                    ShopifyCreatedAt = DateTime.UtcNow,
                    ShopifyUpdatedAt = DateTime.UtcNow
                };

                // Parse price
                if (variantNode.TryGetProperty("price", out var priceProp) && decimal.TryParse(priceProp.GetString(), out var price))
                    variant.Price = price;

                // Parse compare at price
                if (variantNode.TryGetProperty("compareAtPrice", out var compareAtPriceProp) && 
                    !string.IsNullOrEmpty(compareAtPriceProp.GetString()) &&
                    decimal.TryParse(compareAtPriceProp.GetString(), out var compareAtPrice))
                    variant.CompareAtPrice = compareAtPrice;

                // Parse cost per item
                if (variantNode.TryGetProperty("cost", out var costProp) && 
                    !string.IsNullOrEmpty(costProp.GetString()) &&
                    decimal.TryParse(costProp.GetString(), out var cost))
                    variant.CostPerItem = cost;

                // Parse inventory item ID
                if (variantNode.TryGetProperty("inventoryItem", out var inventoryItemNode) &&
                    inventoryItemNode.TryGetProperty("id", out var inventoryItemIdProp))
                {
                    variant.InventoryItemId = inventoryItemIdProp.GetString();

                    // Parse inventory levels for all locations
                    if (inventoryItemNode.TryGetProperty("inventoryLevels", out var inventoryLevelsNode) &&
                        inventoryLevelsNode.TryGetProperty("edges", out var inventoryLevelEdges))
                    {
                        foreach (var edge in inventoryLevelEdges.EnumerateArray())
                        {
                            if (!edge.TryGetProperty("node", out var levelNode))
                                continue;

                            var inventoryLevel = ParseInventoryLevel(levelNode, variant.Id, variant.InventoryItemId);
                            if (inventoryLevel != null)
                            {
                                variant.InventoryLevels.Add(inventoryLevel);
                                _logger.LogDebug("Added inventory level for variant {VariantId} at location {LocationId} with {Available} available", 
                                    variant.ShopifyVariantId, inventoryLevel.LocationId, inventoryLevel.Available);
                            }
                        }
                    }
                }

                // Parse dates - ensure UTC format for PostgreSQL compatibility
                if (variantNode.TryGetProperty("createdAt", out var createdAtProp) && 
                    DateTime.TryParse(createdAtProp.GetString(), null, DateTimeStyles.RoundtripKind, out var createdAt))
                    variant.ShopifyCreatedAt = createdAt.Kind == DateTimeKind.Utc ? createdAt : createdAt.ToUniversalTime();

                if (variantNode.TryGetProperty("updatedAt", out var updatedAtProp) && 
                    DateTime.TryParse(updatedAtProp.GetString(), null, DateTimeStyles.RoundtripKind, out var updatedAt))
                    variant.ShopifyUpdatedAt = updatedAt.Kind == DateTimeKind.Utc ? updatedAt : updatedAt.ToUniversalTime();

                return variant;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing single variant from Shopify response");
                return null;
            }
        }

        private ShopifyInventoryLevel? ParseInventoryLevel(JsonElement levelNode, Guid variantId, string? inventoryItemId)
        {
            try
            {
                var inventoryLevel = new ShopifyInventoryLevel
                {
                    Id = Guid.NewGuid(),
                    VariantId = variantId,
                    ShopifyInventoryLevelId = levelNode.GetProperty("id").GetString() ?? "",
                    InventoryItemId = inventoryItemId ?? "",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    ShopifyCreatedAt = DateTime.UtcNow,
                    ShopifyUpdatedAt = DateTime.UtcNow
                };

                // Parse location
                if (levelNode.TryGetProperty("location", out var locationNode))
                {
                    inventoryLevel.LocationId = locationNode.GetProperty("id").GetString() ?? "";
                    inventoryLevel.LocationName = locationNode.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "" : "";
                }

                // Parse available quantity
                if (levelNode.TryGetProperty("quantities", out var quantitiesNode))
                {
                    foreach (var quantity in quantitiesNode.EnumerateArray())
                    {
                        if (quantity.TryGetProperty("name", out var nameElement) &&
                            nameElement.GetString() == "available" &&
                            quantity.TryGetProperty("quantity", out var quantityElement))
                        {
                            inventoryLevel.Available = quantityElement.GetInt32();
                            break;
                        }
                    }
                }

                // Parse dates
                if (levelNode.TryGetProperty("createdAt", out var createdAtProp) && 
                    DateTime.TryParse(createdAtProp.GetString(), null, DateTimeStyles.RoundtripKind, out var createdAt))
                    inventoryLevel.ShopifyCreatedAt = createdAt.Kind == DateTimeKind.Utc ? createdAt : createdAt.ToUniversalTime();

                if (levelNode.TryGetProperty("updatedAt", out var updatedAtProp) && 
                    DateTime.TryParse(updatedAtProp.GetString(), null, DateTimeStyles.RoundtripKind, out var updatedAt))
                    inventoryLevel.ShopifyUpdatedAt = updatedAt.Kind == DateTimeKind.Utc ? updatedAt : updatedAt.ToUniversalTime();

                return inventoryLevel;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing inventory level from Shopify response");
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
                    dataElement.TryGetProperty("products", out var productsElement) &&
                    productsElement.TryGetProperty("pageInfo", out var pageInfo))
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

        private async Task SaveProductsToDatabase(List<ShopifyProduct> products, Guid storeConnectionId, ProductSyncResult result)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                // If force refresh, remove existing products first
                var existingProducts = await _context.ShopifyProducts
                    .Where(p => p.StoreConnectionId == storeConnectionId)
                    .ToListAsync();

                if (existingProducts.Any())
                {
                    _context.ShopifyProducts.RemoveRange(existingProducts);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Removed {Count} existing products for store {StoreConnectionId}", 
                        existingProducts.Count, storeConnectionId);
                }

                // Add all new products (this should cascade to variants and inventory levels)
                await _context.ShopifyProducts.AddRangeAsync(products);
                await _context.SaveChangesAsync();

                result.NewProducts = products.Count;
                result.TotalVariants = products.Sum(p => p.Variants.Count);
                
                // Log inventory levels for debugging
                var totalInventoryLevels = products.Sum(p => p.Variants.Sum(v => v.InventoryLevels.Count));
                _logger.LogInformation("Saved {InventoryLevelCount} inventory levels across all variants", totalInventoryLevels);

                await transaction.CommitAsync();

                _logger.LogInformation("Saved {ProductCount} products with {VariantCount} variants to database for store {StoreConnectionId}",
                    products.Count, result.TotalVariants, storeConnectionId);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error saving products to database for store {StoreConnectionId}", storeConnectionId);
                throw;
            }
        }

        // Modern Keyset Pagination - O(log n) performance, used by Facebook, GitHub, Twitter
        public async Task<CursorBasedResult> GetLocalProductsWithCursorAsync(
            Guid storeConnectionId,
            string? search = null,
            string? status = null,
            string? cursor = null,
            int pageSize = 50)
        {
            pageSize = pageSize >= 9999 ? 9999 : Math.Min(pageSize, 200); // Allow "All" option (9999) or limit to 200
            
            var baseQuery = _context.ShopifyProducts
                .Where(p => p.StoreConnectionId == storeConnectionId);

            // Apply filters
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLower();
                baseQuery = baseQuery.Where(p => 
                    p.Title.ToLower().Contains(searchLower) ||
                    p.Vendor!.ToLower().Contains(searchLower) ||
                    p.ProductType!.ToLower().Contains(searchLower) ||
                    p.Variants.Any(v => v.Sku!.ToLower().Contains(searchLower) || 
                                       v.Barcode!.ToLower().Contains(searchLower)));
            }

            if (!string.IsNullOrEmpty(status))
            {
                baseQuery = baseQuery.Where(p => p.Status.ToLower() == status.ToLower());
            }

            // Keyset pagination using cursor
            if (!string.IsNullOrEmpty(cursor))
            {
                var cursorParts = DecodeBase64Cursor(cursor);
                if (cursorParts != null)
                {
                    var (cursorTimestamp, cursorId) = cursorParts.Value;
                    
                    // Use keyset pagination: WHERE (timestamp, id) < (cursor_timestamp, cursor_id)
                    baseQuery = baseQuery.Where(p => 
                        p.ShopifyUpdatedAt < cursorTimestamp || 
                        (p.ShopifyUpdatedAt == cursorTimestamp && p.Id.CompareTo(cursorId) < 0));
                }
            }

            // Fetch one extra to determine if there are more pages
            var products = await baseQuery
                .OrderByDescending(p => p.ShopifyUpdatedAt)
                .ThenByDescending(p => p.Id)
                .Take(pageSize + 1)
                .Include(p => p.Variants)
                .ToListAsync();

            var hasMore = products.Count > pageSize;
            if (hasMore)
            {
                products = products.Take(pageSize).ToList();
            }

            string? nextCursor = null;
            if (hasMore && products.Any())
            {
                var lastProduct = products.Last();
                nextCursor = EncodeBase64Cursor(lastProduct.ShopifyUpdatedAt, lastProduct.Id);
            }

            return new CursorBasedResult
            {
                Products = products,
                NextCursor = nextCursor,
                HasMore = hasMore,
                PageSize = pageSize
            };
        }

        // Advanced: Window Function Pagination for Complex Scenarios
        public async Task<ProductListResult> GetLocalProductsWithWindowAsync(
            Guid storeConnectionId, 
            string? search = null, 
            string? status = null, 
            int page = 1, 
            int pageSize = 50)
        {
            page = Math.Max(1, page);
            pageSize = pageSize >= 9999 ? 9999 : Math.Min(pageSize, 200); // Allow "All" option (9999) or limit to 200
            var isShowingAll = pageSize >= 9999;

            // Use stored procedure for better performance and maintainability
            var productIds = new List<Guid>();
            var total = 0;

            try
            {
                // Use a separate connection scope for stored procedure to avoid conflicts
                var connectionString = _context.Database.GetConnectionString();
                using (var connection = new NpgsqlConnection(connectionString))
                {
                    await connection.OpenAsync();
                    
                    using var command = connection.CreateCommand();
                    command.CommandText = "SELECT * FROM GetShopifyProductsWithWindow(@storeConnectionId, @search, @status, @page, @pageSize, @showAll)";
                    command.CommandTimeout = 60; // 60 second timeout for stored procedure
                    
                    // Add parameters
                    command.Parameters.Add(new NpgsqlParameter("@storeConnectionId", storeConnectionId));
                    command.Parameters.Add(new NpgsqlParameter("@search", search ?? (object)DBNull.Value));
                    command.Parameters.Add(new NpgsqlParameter("@status", status ?? (object)DBNull.Value));
                    command.Parameters.Add(new NpgsqlParameter("@page", page));
                    command.Parameters.Add(new NpgsqlParameter("@pageSize", pageSize));
                    command.Parameters.Add(new NpgsqlParameter("@showAll", isShowingAll));

                    using var reader = await command.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        productIds.Add((Guid)reader["Id"]);
                        if (total == 0) // Get total from first row
                        {
                            // PostgreSQL COUNT() returns bigint (Int64), convert safely to int (Int32)
                            total = Convert.ToInt32(reader["total_count"]);
                        }
                    }
                } // Connection is properly disposed here
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Stored procedure GetShopifyProductsWithWindow failed for store {StoreConnectionId}, falling back to simple query", storeConnectionId);
                
                // Fallback to simple query if stored procedure fails
                return await GetLocalProductsAsync(storeConnectionId, search, status, page, pageSize);
            }

            // Now fetch the actual products with variants using EF Core on a fresh connection
            var products = await _context.ShopifyProducts
                .Include(p => p.Variants)
                .Where(p => productIds.Contains(p.Id))
                .OrderByDescending(p => p.ShopifyUpdatedAt)
                .ThenByDescending(p => p.Id)
                .ToListAsync();

            var totalPages = isShowingAll ? 1 : (int)Math.Ceiling((double)total / pageSize);

            return new ProductListResult
            {
                Products = products,
                Total = total,
                Page = isShowingAll ? 1 : page,
                PageSize = pageSize,
                TotalPages = totalPages,
                HasMore = !isShowingAll && page < totalPages,
                HasPrevious = !isShowingAll && page > 1
            };
        }

        // Cursor encoding/decoding utilities
        private string EncodeBase64Cursor(DateTime timestamp, Guid id)
        {
            var cursorData = $"{timestamp:O}|{id}";
            var bytes = System.Text.Encoding.UTF8.GetBytes(cursorData);
            return Convert.ToBase64String(bytes);
        }

        private (DateTime timestamp, Guid id)? DecodeBase64Cursor(string cursor)
        {
            try
            {
                var bytes = Convert.FromBase64String(cursor);
                var cursorData = System.Text.Encoding.UTF8.GetString(bytes);
                var parts = cursorData.Split('|');
                
                if (parts.Length == 2 && 
                    DateTime.TryParse(parts[0], out var timestamp) && 
                    Guid.TryParse(parts[1], out var id))
                {
                    return (timestamp, id);
                }
            }
            catch
            {
                // Invalid cursor, ignore
            }
            return null;
        }

        // Inventory Methods - Database-backed like products
        public async Task<ProductListResult> GetLocalInventoryAsync(
            Guid storeConnectionId, 
            string? search = null, 
            string? status = null, 
            string? inventoryFilter = null,
            int page = 1, 
            int pageSize = 50)
        {
            page = Math.Max(1, page);
            pageSize = pageSize >= 9999 ? 9999 : Math.Min(pageSize, 200);
            var isShowingAll = pageSize >= 9999;
            
            var baseQuery = _context.ShopifyProducts
                .Where(p => p.StoreConnectionId == storeConnectionId);

            // Apply search filters
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLower();
                baseQuery = baseQuery.Where(p => 
                    p.Title.ToLower().Contains(searchLower) ||
                    p.Vendor!.ToLower().Contains(searchLower) ||
                    p.ProductType!.ToLower().Contains(searchLower) ||
                    p.Variants.Any(v => v.Sku!.ToLower().Contains(searchLower) || 
                                       v.Barcode!.ToLower().Contains(searchLower)));
            }

            // Apply status filter
            if (!string.IsNullOrEmpty(status))
            {
                baseQuery = baseQuery.Where(p => p.Status.ToLower() == status.ToLower());
            }

            // Apply inventory filter
            if (!string.IsNullOrEmpty(inventoryFilter))
            {
                switch (inventoryFilter.ToLower())
                {
                    case "in_stock":
                        baseQuery = baseQuery.Where(p => p.Variants.Any(v => v.InventoryQuantity > 0));
                        break;
                    case "out_of_stock":
                        baseQuery = baseQuery.Where(p => p.Variants.All(v => v.InventoryQuantity == 0));
                        break;
                    case "low_stock":
                        baseQuery = baseQuery.Where(p => p.Variants.Any(v => v.InventoryQuantity > 0 && v.InventoryQuantity <= 10));
                        break;
                    // "all" or default - no additional filter
                }
            }

            // Get count without loading all data
            var total = await baseQuery.CountAsync();
            var totalPages = isShowingAll ? 1 : (int)Math.Ceiling((double)total / pageSize);
            
            if (total == 0)
            {
                return new ProductListResult
                {
                    Products = new List<ShopifyProduct>(),
                    Total = 0,
                    Page = isShowingAll ? 1 : page,
                    PageSize = pageSize,
                    TotalPages = 0,
                    HasMore = false,
                    HasPrevious = false
                };
            }

            // Fetch the actual page data with includes (including inventory levels for location filtering)
            var products = isShowingAll 
                ? await baseQuery
                    .OrderByDescending(p => p.ShopifyUpdatedAt)
                    .ThenByDescending(p => p.Id)
                    .Include(p => p.Variants)
                        .ThenInclude(v => v.InventoryLevels)
                    .ToListAsync()
                : await baseQuery
                    .OrderByDescending(p => p.ShopifyUpdatedAt)
                    .ThenByDescending(p => p.Id)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Include(p => p.Variants)
                        .ThenInclude(v => v.InventoryLevels)
                    .ToListAsync();

            return new ProductListResult
            {
                Products = products,
                Total = total,
                Page = isShowingAll ? 1 : page,
                PageSize = pageSize,
                TotalPages = totalPages,
                HasMore = !isShowingAll && page < totalPages,
                HasPrevious = !isShowingAll && page > 1
            };
        }

        public async Task<ProductListResult> GetLocalInventoryWithWindowAsync(
            Guid storeConnectionId, 
            string? search = null, 
            string? status = null, 
            string? inventoryFilter = null,
            int page = 1, 
            int pageSize = 50)
        {
            page = Math.Max(1, page);
            pageSize = pageSize >= 9999 ? 9999 : Math.Min(pageSize, 200);
            var isShowingAll = pageSize >= 9999;

            // Use stored procedure for better performance and maintainability
            var productIds = new List<Guid>();
            var total = 0;

            // Use a separate connection scope for stored procedure to avoid conflicts
            var connectionString = _context.Database.GetConnectionString();
            using (var connection = new NpgsqlConnection(connectionString))
            {
                await connection.OpenAsync();
                
                using var command = connection.CreateCommand();
                command.CommandText = "SELECT * FROM GetShopifyProductsWithInventory(" +
                                       "@storeConnectionId::uuid, " +
                                       "@search::text, " +
                                       "@status::text, " +
                                       "@inventoryFilter::text, " +
                                       "@page::integer, " +
                                       "@pageSize::integer, " +
                                       "@showAll::boolean)";

                // Add parameters with explicit types to avoid 'unknown' resolution issues
                var pStoreId = new Npgsql.NpgsqlParameter("@storeConnectionId", storeConnectionId)
                {
                    NpgsqlDbType = NpgsqlTypes.NpgsqlDbType.Uuid
                };
                var pSearch = new Npgsql.NpgsqlParameter("@search", search ?? (object)DBNull.Value)
                {
                    NpgsqlDbType = NpgsqlTypes.NpgsqlDbType.Text
                };
                var pStatus = new Npgsql.NpgsqlParameter("@status", status ?? (object)DBNull.Value)
                {
                    NpgsqlDbType = NpgsqlTypes.NpgsqlDbType.Text
                };
                var pInventoryFilter = new Npgsql.NpgsqlParameter("@inventoryFilter", inventoryFilter ?? (object)DBNull.Value)
                {
                    NpgsqlDbType = NpgsqlTypes.NpgsqlDbType.Text
                };
                var pPage = new Npgsql.NpgsqlParameter("@page", page)
                {
                    NpgsqlDbType = NpgsqlTypes.NpgsqlDbType.Integer
                };
                var pPageSize = new Npgsql.NpgsqlParameter("@pageSize", pageSize)
                {
                    NpgsqlDbType = NpgsqlTypes.NpgsqlDbType.Integer
                };
                var pShowAll = new Npgsql.NpgsqlParameter("@showAll", isShowingAll)
                {
                    NpgsqlDbType = NpgsqlTypes.NpgsqlDbType.Boolean
                };

                command.Parameters.AddRange(new[] { pStoreId, pSearch, pStatus, pInventoryFilter, pPage, pPageSize, pShowAll });

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    productIds.Add((Guid)reader["Id"]);
                    if (total == 0) // Get total from first row
                    {
                        // PostgreSQL COUNT() returns bigint (Int64), convert safely to int (Int32)
                        total = Convert.ToInt32(reader["total_count"]);
                    }
                }
            } // Connection is properly disposed here

            // Fetch actual products with variants and inventory levels
            var products = await _context.ShopifyProducts
                .Include(p => p.Variants)
                    .ThenInclude(v => v.InventoryLevels)
                .Where(p => productIds.Contains(p.Id))
                .OrderByDescending(p => p.ShopifyUpdatedAt)
                .ThenByDescending(p => p.Id)
                .ToListAsync();

            var totalPages = isShowingAll ? 1 : (int)Math.Ceiling((double)total / pageSize);

            return new ProductListResult
            {
                Products = products,
                Total = total,
                Page = isShowingAll ? 1 : page,
                PageSize = pageSize,
                TotalPages = totalPages,
                HasMore = !isShowingAll && page < totalPages,
                HasPrevious = !isShowingAll && page > 1
            };
        }

        public async Task<InventoryCountResult> GetLocalInventoryCountAsync(Guid storeConnectionId)
        {
            // Use stored procedure for better performance
            var connectionString = _context.Database.GetConnectionString();
            using (var connection = new NpgsqlConnection(connectionString))
            {
                await connection.OpenAsync();
                
                using var command = connection.CreateCommand();
                command.CommandText = "SELECT * FROM GetShopifyInventoryCount(@storeConnectionId)";
                command.Parameters.Add(new NpgsqlParameter("@storeConnectionId", storeConnectionId));

                using var reader = await command.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    return new InventoryCountResult
                    {
                        All = reader.GetInt32(reader.GetOrdinal("total_products")),
                        InStock = reader.GetInt32(reader.GetOrdinal("in_stock_products")),
                        OutOfStock = reader.GetInt32(reader.GetOrdinal("out_of_stock_products")),
                        LowStock = reader.GetInt32(reader.GetOrdinal("low_stock_products")),
                        // Get status-based counts using separate queries for now
                        Active = await _context.ShopifyProducts
                            .Where(p => p.StoreConnectionId == storeConnectionId && p.Status.ToLower() == "active")
                            .CountAsync(),
                        Draft = await _context.ShopifyProducts
                            .Where(p => p.StoreConnectionId == storeConnectionId && p.Status.ToLower() == "draft")
                            .CountAsync(),
                        Archived = await _context.ShopifyProducts
                            .Where(p => p.StoreConnectionId == storeConnectionId && p.Status.ToLower() == "archived")
                            .CountAsync()
                    };
                }

                // Fallback to EF if stored procedure fails
                var products = await _context.ShopifyProducts
                    .Include(p => p.Variants)
                    .Where(p => p.StoreConnectionId == storeConnectionId)
                    .ToListAsync();

                var result = new InventoryCountResult
                {
                    All = products.Count,
                    Active = products.Count(p => p.Status.ToLower() == "active"),
                    Draft = products.Count(p => p.Status.ToLower() == "draft"),
                    Archived = products.Count(p => p.Status.ToLower() == "archived")
                };

                // Calculate inventory-based counts
                foreach (var product in products)
                {
                    var totalInventory = product.Variants.Sum(v => v.InventoryQuantity);
                    if (totalInventory == 0)
                    {
                        result.OutOfStock++;
                    }
                    else if (totalInventory > 0 && totalInventory <= 10)
                    {
                        result.LowStock++;
                    }
                    else if (totalInventory > 0)
                    {
                        result.InStock++;
                    }
                }

                return result;
            }
        }

        public async Task<ProductListResult> GetLocationSpecificInventoryAsync(
            Guid storeConnectionId,
            string locationId,
            string? search = null,
            string? status = null,
            string? inventoryFilter = null,
            int page = 1,
            int pageSize = 50)
        {
            try
            {
                page = Math.Max(1, page);
                pageSize = pageSize >= 9999 ? 9999 : Math.Min(pageSize, 200);
                var isShowingAll = pageSize >= 9999;

                _logger.LogInformation("🔍 GetLocationSpecificInventoryAsync called with LocationId: {LocationId}, StoreConnectionId: {StoreConnectionId}", locationId, storeConnectionId);

                // First check if there are any inventory levels in the database
                var hasInventoryLevels = await _context.ShopifyInventoryLevels.AnyAsync();
                if (!hasInventoryLevels)
                {
                    _logger.LogWarning("⚠️ No inventory levels found in database. Returning empty result.");
                    return new ProductListResult
                    {
                        Products = new List<ShopifyProduct>(),
                        Total = 0,
                        Page = isShowingAll ? 1 : page,
                        PageSize = pageSize,
                        TotalPages = 0,
                        HasMore = false,
                        HasPrevious = false
                    };
                }

                // Check if there are inventory levels for this specific location
                var hasLocationInventory = await _context.ShopifyInventoryLevels
                    .AnyAsync(il => il.LocationId == locationId);
                
                if (!hasLocationInventory)
                {
                    _logger.LogWarning("⚠️ No inventory levels found for location {LocationId}. Returning empty result.", locationId);
                    return new ProductListResult
                    {
                        Products = new List<ShopifyProduct>(),
                        Total = 0,
                        Page = isShowingAll ? 1 : page,
                        PageSize = pageSize,
                        TotalPages = 0,
                        HasMore = false,
                        HasPrevious = false
                    };
                }

                // Use stored procedure for better performance and maintainability
                var productIds = new List<Guid>();
                var total = 0;

                // Use a separate connection scope for stored procedure to avoid conflicts
                var connectionString = _context.Database.GetConnectionString();
                using (var connection = new NpgsqlConnection(connectionString))
                {
                    await connection.OpenAsync();
                    
                    using var command = connection.CreateCommand();
                    command.CommandText = "SELECT * FROM GetShopifyProductsByLocation(@storeConnectionId, @locationId, @search, @status, @inventoryFilter, @page, @pageSize, @showAll)";
                    
                    // Add parameters
                    command.Parameters.Add(new NpgsqlParameter("@storeConnectionId", storeConnectionId));
                    command.Parameters.Add(new NpgsqlParameter("@locationId", locationId));
                    command.Parameters.Add(new NpgsqlParameter("@search", search ?? (object)DBNull.Value));
                    command.Parameters.Add(new NpgsqlParameter("@status", status ?? (object)DBNull.Value));
                    command.Parameters.Add(new NpgsqlParameter("@inventoryFilter", inventoryFilter ?? (object)DBNull.Value));
                    command.Parameters.Add(new NpgsqlParameter("@page", page));
                    command.Parameters.Add(new NpgsqlParameter("@pageSize", pageSize));
                    command.Parameters.Add(new NpgsqlParameter("@showAll", isShowingAll));

                    using var reader = await command.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        productIds.Add((Guid)reader["Id"]);
                        if (total == 0) // Get total from first row
                        {
                            // PostgreSQL COUNT() returns bigint (Int64), convert safely to int (Int32)
                            total = Convert.ToInt32(reader["total_count"]);
                        }
                    }
                } // Connection is properly disposed here

                if (total == 0)
                {
                    _logger.LogInformation("🔍 No products found matching criteria for location {LocationId}", locationId);
                    return new ProductListResult
                    {
                        Products = new List<ShopifyProduct>(),
                        Total = 0,
                        Page = isShowingAll ? 1 : page,
                        PageSize = pageSize,
                        TotalPages = 0,
                        HasMore = false,
                        HasPrevious = false
                    };
                }

                // Now fetch the actual products with variants using EF Core on a fresh connection
                var products = await _context.ShopifyProducts
                    .Include(p => p.Variants)
                        .ThenInclude(v => v.InventoryLevels.Where(il => il.LocationId == locationId))
                    .Where(p => productIds.Contains(p.Id))
                    .OrderByDescending(p => p.ShopifyUpdatedAt)
                    .ThenByDescending(p => p.Id)
                    .ToListAsync();

                var totalPages = isShowingAll ? 1 : (int)Math.Ceiling((double)total / pageSize);
                
                _logger.LogInformation("✅ Successfully retrieved {ProductCount} products for location {LocationId}", products.Count, locationId);

                return new ProductListResult
                {
                    Products = products,
                    Total = total,
                    Page = isShowingAll ? 1 : page,
                    PageSize = pageSize,
                    TotalPages = totalPages,
                    HasMore = !isShowingAll && page < totalPages,
                    HasPrevious = !isShowingAll && page > 1
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error in GetLocationSpecificInventoryAsync for location {LocationId}: {ErrorMessage}", locationId, ex.Message);
                
                // Return empty result instead of throwing
                return new ProductListResult
                {
                    Products = new List<ShopifyProduct>(),
                    Total = 0,
                    Page = 1,
                    PageSize = pageSize,
                    TotalPages = 0,
                    HasMore = false,
                    HasPrevious = false
                };
            }
        }

        /// <summary>
        /// Saves products to database and fetches cost data in parallel for better performance
        /// </summary>
        private async Task SaveProductsAndFetchCostsInParallel(List<ShopifyProduct> products, Guid storeConnectionId, ShopifyCredentials credentials, ProductSyncResult result)
        {
            try
            {
                // Step 1: Save products to database first
                await SaveProductsToDatabase(products, storeConnectionId, result);

                // Step 2: Extract all unique inventory item IDs for cost fetching
                var inventoryItemIds = products
                    .SelectMany(p => p.Variants)
                    .Where(v => !string.IsNullOrEmpty(v.InventoryItemId))
                    .Select(v => ExtractNumericId(v.InventoryItemId ?? ""))
                    .Where(id => !string.IsNullOrEmpty(id))
                    .Distinct()
                    .ToList();

                if (!inventoryItemIds.Any())
                {
                    _logger.LogInformation("No inventory item IDs found for cost fetching");
                    return;
                }

                _logger.LogInformation("Starting parallel cost fetching for {InventoryItemCount} unique inventory items", inventoryItemIds.Count);

                // Step 3: Fetch costs sequentially with success validation
                var costData = new Dictionary<string, decimal?>();
                var processedCount = 0;
                var successCount = 0;
                var totalCount = inventoryItemIds.Count;

                foreach (var inventoryItemId in inventoryItemIds)
                {
                    try
                    {
                        _logger.LogDebug("Fetching cost for inventory item {InventoryItemId} ({Current}/{Total})", 
                            inventoryItemId, processedCount + 1, totalCount);

                        var cost = await FetchInventoryItemCostAsync(inventoryItemId ?? "", credentials);
                        
                        // Only proceed if we got a valid response (even if cost is null, that's OK)
                        if (cost.HasValue)
                        {
                            costData[inventoryItemId ?? ""] = cost;
                            successCount++;
                            _logger.LogDebug("Successfully fetched cost {Cost} for inventory item {InventoryItemId}", 
                                cost.Value, inventoryItemId);
                        }
                        else
                        {
                            costData[inventoryItemId ?? ""] = null;
                            _logger.LogDebug("No cost data found for inventory item {InventoryItemId}", inventoryItemId);
                        }
                        
                        processedCount++;
                        
                        // Log progress every 10 items
                        if (processedCount % 10 == 0)
                        {
                            _logger.LogInformation("Cost fetching progress: {Processed}/{Total} ({Percentage}%) - Success: {SuccessCount}", 
                                processedCount, totalCount, (processedCount * 100 / totalCount), successCount);
                        }
                        
                        // Add delay between requests to respect rate limit (1.5 seconds per call)
                        await Task.Delay(1500);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error fetching cost for inventory item {InventoryItemId} - will retry", inventoryItemId);
                        costData[inventoryItemId ?? ""] = null;
                        
                        // Add extra delay on error to be more conservative
                        await Task.Delay(3000);
                    }
                }

                _logger.LogInformation("Cost fetching completed. Processed: {Processed}, Success: {Success}, Failed: {Failed}", 
                    processedCount, successCount, processedCount - successCount);

                // Step 4: Update database with cost data
                var updatedCount = 0;
                foreach (var product in products)
                {
                    foreach (var variant in product.Variants)
                    {
                        if (!string.IsNullOrEmpty(variant.InventoryItemId))
                        {
                            var numericId = ExtractNumericId(variant.InventoryItemId);
                            if (!string.IsNullOrEmpty(numericId) && costData.TryGetValue(numericId ?? "", out var cost) && cost.HasValue)
                            {
                                // Update cost using raw SQL to avoid EF tracking issues
                                var updateSql = @"
                                    UPDATE ""ShopifyProductVariants"" 
                                    SET ""CostPerItem"" = @Cost, ""UpdatedAt"" = @UpdatedAt 
                                    WHERE ""ShopifyVariantId"" = @VariantId";

                                var parameters = new[]
                                {
                                    new NpgsqlParameter("@Cost", cost.Value),
                                    new NpgsqlParameter("@UpdatedAt", DateTime.UtcNow),
                                    new NpgsqlParameter("@VariantId", variant.ShopifyVariantId)
                                };

                                var rowsAffected = await _context.Database.ExecuteSqlRawAsync(updateSql, parameters);
                                if (rowsAffected > 0)
                                {
                                    updatedCount++;
                                }
                            }
                        }
                    }
                }

                _logger.LogInformation("Cost per item update completed. Updated: {UpdatedCount} variants", updatedCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in parallel product save and cost fetch for store {StoreConnectionId}", storeConnectionId);
            }
        }

        /// <summary>
        /// Fetches cost per item from Shopify REST API for all variants and updates the database
        /// </summary>
        private async Task FetchAndUpdateCostPerItem(Guid storeConnectionId, ShopifyCredentials credentials)
        {
            try
            {
                _logger.LogInformation("Starting cost per item fetch for store {StoreConnectionId}", storeConnectionId);

                // Get all variants with inventory item IDs
                var variantsWithInventoryItems = await _context.ShopifyProductVariants
                    .Include(v => v.Product)
                    .Where(v => v.Product.StoreConnectionId == storeConnectionId && !string.IsNullOrEmpty(v.InventoryItemId))
                    .ToListAsync();

                if (!variantsWithInventoryItems.Any())
                {
                    _logger.LogInformation("No variants with inventory item IDs found for store {StoreConnectionId}", storeConnectionId);
                    return;
                }

                _logger.LogInformation("Found {VariantCount} variants with inventory item IDs for store {StoreConnectionId}", 
                    variantsWithInventoryItems.Count, storeConnectionId);

                var updatedCount = 0;
                var errorCount = 0;

                // Process variants in batches to avoid overwhelming the API
                const int batchSize = 5; // Reduced batch size for better rate limiting
                for (int i = 0; i < variantsWithInventoryItems.Count; i += batchSize)
                {
                    var batch = variantsWithInventoryItems.Skip(i).Take(batchSize);
                    var tasks = new List<Task<bool>>();

                    foreach (var variant in batch)
                    {
                        tasks.Add(UpdateVariantCostAsync(variant, credentials));
                    }

                    // Wait for all tasks in the batch to complete
                    var results = await Task.WhenAll(tasks);
                    
                    // Count results
                    updatedCount += results.Count(r => r);
                    errorCount += results.Count(r => !r);

                    // Add longer delay between batches to respect rate limits (2 calls per second = 500ms per call)
                    if (i + batchSize < variantsWithInventoryItems.Count)
                    {
                        await Task.Delay(1500); // 1.5 second delay between batches
                    }
                }

                _logger.LogInformation("Cost per item update completed for store {StoreConnectionId}. " +
                    "Updated: {Updated}, Errors: {Errors}, Total: {Total}", 
                    storeConnectionId, updatedCount, errorCount, variantsWithInventoryItems.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching cost per item for store {StoreConnectionId}", storeConnectionId);
            }
        }

        /// <summary>
        /// Updates the cost per item for a single variant by calling Shopify REST API
        /// </summary>
        private async Task<bool> UpdateVariantCostAsync(ShopifyProductVariant variant, ShopifyCredentials credentials)
        {
            try
            {
                if (string.IsNullOrEmpty(variant.InventoryItemId))
                {
                    _logger.LogDebug("Variant {VariantId} has no inventory item ID, skipping cost update", variant.ShopifyVariantId);
                    return false;
                }

                // Extract numeric ID from GraphQL ID (e.g., "gid://shopify/InventoryItem/123456789" -> "123456789")
                var inventoryItemId = ExtractNumericId(variant.InventoryItemId);
                if (string.IsNullOrEmpty(inventoryItemId))
                {
                    _logger.LogWarning("Could not extract numeric ID from inventory item ID: {InventoryItemId}", variant.InventoryItemId);
                    return false;
                }

                // Call Shopify REST API to get inventory item details
                var cost = await FetchInventoryItemCostAsync(inventoryItemId, credentials);
                if (cost.HasValue)
                {
                    // Use raw SQL to update the database directly, avoiding Entity Framework tracking issues
                    var updateSql = @"
                        UPDATE ""ShopifyProductVariants"" 
                        SET ""CostPerItem"" = @Cost, ""UpdatedAt"" = @UpdatedAt 
                        WHERE ""Id"" = @VariantId";

                    var parameters = new[]
                    {
                        new NpgsqlParameter("@Cost", cost.Value),
                        new NpgsqlParameter("@UpdatedAt", DateTime.UtcNow),
                        new NpgsqlParameter("@VariantId", variant.Id)
                    };

                    var rowsAffected = await _context.Database.ExecuteSqlRawAsync(updateSql, parameters);

                    if (rowsAffected > 0)
                    {
                        _logger.LogDebug("Updated cost per item for variant {VariantId} (SKU: {Sku}): {Cost}", 
                            variant.ShopifyVariantId, variant.Sku, cost.Value);
                        return true;
                    }
                    else
                    {
                        _logger.LogWarning("No rows affected when updating cost for variant {VariantId}", variant.ShopifyVariantId);
                        return false;
                    }
                }
                else
                {
                    _logger.LogDebug("No cost found for inventory item {InventoryItemId} (variant {VariantId})", 
                        inventoryItemId, variant.ShopifyVariantId);
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating cost for variant {VariantId} (SKU: {Sku})", 
                    variant.ShopifyVariantId, variant.Sku);
                return false;
            }
        }

        /// <summary>
        /// Fetches the cost per item from Shopify REST API
        /// </summary>
        private async Task<decimal?> FetchInventoryItemCostAsync(string inventoryItemId, ShopifyCredentials credentials)
        {
            try
            {
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Add("X-Shopify-Access-Token", credentials.AccessToken);

                var url = $"https://{credentials.Store}.myshopify.com/admin/api/2023-04/inventory_items/{inventoryItemId}.json";
                
                _logger.LogDebug("Fetching inventory item cost from: {Url}", url);

                var response = await httpClient.GetAsync(url);
                
                if (response.IsSuccessStatusCode)
                {
                    var jsonResponse = await response.Content.ReadAsStringAsync();
                    var jsonDoc = JsonDocument.Parse(jsonResponse);

                    if (jsonDoc.RootElement.TryGetProperty("inventory_item", out var inventoryItem) &&
                        inventoryItem.TryGetProperty("cost", out var costElement))
                    {
                        var costString = costElement.GetString();
                        if (!string.IsNullOrEmpty(costString) && decimal.TryParse(costString, out var cost))
                        {
                            _logger.LogDebug("Successfully parsed cost {Cost} for inventory item {InventoryItemId}", cost, inventoryItemId);
                            return cost;
                        }
                        else
                        {
                            _logger.LogDebug("Cost field is empty or invalid for inventory item {InventoryItemId}", inventoryItemId);
                            return null;
                        }
                    }
                    else
                    {
                        _logger.LogDebug("No cost field found in inventory item response for ID: {InventoryItemId}", inventoryItemId);
                        return null;
                    }
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Rate limit exceeded for inventory item {InventoryItemId}. Status: {Status}, Response: {Response}", 
                        inventoryItemId, response.StatusCode, responseContent);
                    
                    // Wait longer for rate limit to reset (5 seconds to be safe)
                    await Task.Delay(5000);
                    throw new Exception($"Rate limit exceeded for inventory item {inventoryItemId}");
                }
                else
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Failed to fetch inventory item {InventoryItemId}. Status: {Status}, Response: {Response}", 
                        inventoryItemId, response.StatusCode, responseContent);
                    throw new Exception($"HTTP {response.StatusCode} for inventory item {inventoryItemId}: {responseContent}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching inventory item cost for ID: {InventoryItemId}", inventoryItemId);
                throw; // Re-throw to let caller handle the error
            }
        }

        /// <summary>
        /// Extracts numeric ID from Shopify GraphQL ID
        /// </summary>
        private string? ExtractNumericId(string graphqlId)
        {
            try
            {
                // Handle GraphQL IDs like "gid://shopify/InventoryItem/123456789"
                if (graphqlId.Contains("/"))
                {
                    return graphqlId.Split('/').Last();
                }
                
                // Handle numeric IDs directly
                if (long.TryParse(graphqlId, out _))
                {
                    return graphqlId;
                }

                return null;
            }
            catch
            {
                return null;
            }
        }
    }
} 