using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using Mlt.Admin.Api.Data;
using Mlt.Admin.Api.Models;
using Mlt.Admin.Api.Models.Shopify;
using System.Text.Json;

namespace Mlt.Admin.Api.Services
{
    public class CostFetchingService : ICostFetchingService
    {
        private readonly ApplicationDbContext _context;
        private readonly IShopifyApiService _shopifyApiService;
        private readonly IStoreConnectionService _storeConnectionService;
        private readonly ILogger<CostFetchingService> _logger;
        private readonly ConcurrentDictionary<string, CostFetchingProgress> _activeJobs = new();

        public CostFetchingService(
            ApplicationDbContext context,
            IShopifyApiService shopifyApiService,
            IStoreConnectionService storeConnectionService,
            ILogger<CostFetchingService> logger)
        {
            _context = context;
            _shopifyApiService = shopifyApiService;
            _storeConnectionService = storeConnectionService;
            _logger = logger;
        }

        public async Task<CostFetchingResult> FetchCostsForStoreAsync(Guid storeConnectionId, string? progressCallbackUrl = null)
        {
            var jobId = Guid.NewGuid().ToString();
            var startTime = DateTime.UtcNow;

            var progress = new CostFetchingProgress
            {
                JobId = jobId,
                Status = "Running",
                StartTime = startTime,
                Current = 0,
                Total = 0,
                Updated = 0,
                Failed = 0
            };

            _activeJobs[jobId] = progress;

            try
            {
                // Get store credentials
                var storeConnection = await _storeConnectionService.GetStoreConnectionAsync(Guid.Empty, storeConnectionId);
                if (storeConnection == null)
                {
                    throw new InvalidOperationException("Store connection not found");
                }

                var credentialsDict = await _storeConnectionService.GetDecryptedCredentialsAsync(storeConnectionId);
                var accessToken = credentialsDict != null && credentialsDict.TryGetValue("accessToken", out var token) ? token : string.Empty;
                var credentials = new ShopifyCredentials
                {
                    Store = storeConnection.StoreDomain ?? "",
                    AccessToken = accessToken
                };

                // Get all variants that need cost fetching
                var variants = await _context.ShopifyProductVariants
                    .Include(v => v.Product)
                    .Where(v => v.Product.StoreConnectionId == storeConnectionId && 
                               !string.IsNullOrEmpty(v.InventoryItemId) &&
                               v.CostPerItem == null) // Only fetch for variants without cost
                    .ToListAsync();

                progress.Total = variants.Count;
                _logger.LogInformation("Starting cost fetching for {VariantCount} variants in store {StoreConnectionId}", 
                    variants.Count, storeConnectionId);

                if (!variants.Any())
                {
                    progress.Status = "Completed";
                    progress.EndTime = DateTime.UtcNow;
                    return new CostFetchingResult
                    {
                        Success = true,
                        TotalVariants = 0,
                        UpdatedVariants = 0,
                        FailedVariants = 0,
                        Duration = DateTime.UtcNow.Subtract(startTime),
                        JobId = jobId
                    };
                }

                // Process variants in optimized batches
                const int batchSize = 10; // Process 10 variants at a time
                var updatedCount = 0;
                var failedCount = 0;

                for (int i = 0; i < variants.Count; i += batchSize)
                {
                    var batch = variants.Skip(i).Take(batchSize).ToList();
                    
                    // Process batch in parallel with rate limiting
                    var batchTasks = batch.Select(async (variant, index) =>
                    {
                        try
                        {
                            var inventoryItemId = ExtractNumericId(variant.InventoryItemId ?? "");
                            if (string.IsNullOrEmpty(inventoryItemId))
                            {
                                _logger.LogWarning("Could not extract numeric ID from inventory item ID: {InventoryItemId}", variant.InventoryItemId);
                                return false;
                            }

                            progress.CurrentItem = $"SKU: {variant.Sku}";
                            progress.Current = i + index + 1;

                            var cost = await FetchInventoryItemCostAsync(inventoryItemId, credentials);
                            if (cost.HasValue)
                            {
                                // Update cost using raw SQL
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
                                return rowsAffected > 0;
                            }
                            return false;
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error fetching cost for variant {VariantId}", variant.ShopifyVariantId);
                            return false;
                        }
                    });

                    var batchResults = await Task.WhenAll(batchTasks);
                    updatedCount += batchResults.Count(r => r);
                    failedCount += batchResults.Count(r => !r);

                    progress.Updated = updatedCount;
                    progress.Failed = failedCount;

                    // Rate limiting: 2 requests per second = 500ms per request
                    // With batch size 10, we need 5 seconds per batch
                    if (i + batchSize < variants.Count)
                    {
                        await Task.Delay(5000);
                    }
                }

                progress.Status = "Completed";
                progress.EndTime = DateTime.UtcNow;

                _logger.LogInformation("Cost fetching completed for store {StoreConnectionId}. Updated: {Updated}, Failed: {Failed}, Total: {Total}", 
                    storeConnectionId, updatedCount, failedCount, variants.Count);

                return new CostFetchingResult
                {
                    Success = true,
                    TotalVariants = variants.Count,
                    UpdatedVariants = updatedCount,
                    FailedVariants = failedCount,
                    Duration = DateTime.UtcNow.Subtract(startTime),
                    JobId = jobId
                };
            }
            catch (Exception ex)
            {
                progress.Status = "Failed";
                progress.Error = ex.Message;
                progress.EndTime = DateTime.UtcNow;

                _logger.LogError(ex, "Error in cost fetching for store {StoreConnectionId}", storeConnectionId);

                return new CostFetchingResult
                {
                    Success = false,
                    Error = ex.Message,
                    Duration = DateTime.UtcNow.Subtract(startTime),
                    JobId = jobId
                };
            }
            finally
            {
                // Keep job info for a while for progress queries
                _ = Task.Run(async () =>
                {
                    await Task.Delay(TimeSpan.FromMinutes(5));
                    _activeJobs.TryRemove(jobId, out _);
                });
            }
        }

        public Task<CostFetchingProgress> GetProgressAsync(string jobId)
        {
            if (_activeJobs.TryGetValue(jobId, out var progress))
            {
                return Task.FromResult(progress);
            }

            return Task.FromResult(new CostFetchingProgress
            {
                JobId = jobId,
                Status = "NotFound"
            });
        }

        public Task<bool> CancelJobAsync(string jobId)
        {
            if (_activeJobs.TryGetValue(jobId, out var progress))
            {
                progress.Status = "Cancelled";
                progress.EndTime = DateTime.UtcNow;
                return Task.FromResult(true);
            }

            return Task.FromResult(false);
        }

        private async Task<decimal?> FetchInventoryItemCostAsync(string inventoryItemId, ShopifyCredentials credentials)
        {
            try
            {
                // Use Shopify GraphQL API to get inventory item details
                var query = @"query GetInventoryItem($id: ID!) { inventoryItem(id: $id) { id cost } }";
                var variables = new Dictionary<string, object> { { "id", $"gid://shopify/InventoryItem/{inventoryItemId}" } };
                var response = await _shopifyApiService.ExecuteGraphQLQueryAsync<JsonElement>(credentials, query, variables);
                if (response.Success && response.Data.ValueKind == JsonValueKind.Object)
                {
                    if (response.Data.TryGetProperty("data", out var dataElement) &&
                        dataElement.TryGetProperty("inventoryItem", out var inventoryItem) &&
                        inventoryItem.TryGetProperty("cost", out var costElement) &&
                        costElement.ValueKind == JsonValueKind.String &&
                        decimal.TryParse(costElement.GetString(), out var cost))
                    {
                        return cost;
                    }
                }
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching cost for inventory item {InventoryItemId}", inventoryItemId);
                return null;
            }
        }

        private string? ExtractNumericId(string graphqlId)
        {
            if (string.IsNullOrEmpty(graphqlId))
                return null;

            // Extract numeric ID from GraphQL ID format
            // e.g., "gid://shopify/InventoryItem/123456789" -> "123456789"
            var parts = graphqlId.Split('/');
            return parts.Length > 0 ? parts[^1] : null;
        }
    }
} 