using Mlt.Admin.Api.Core.Entities;
using Mlt.Admin.Api.Models;

namespace Mlt.Admin.Api.Services
{
    public interface IShopifyProductSyncService
    {
        /// <summary>
        /// Synchronizes all products from Shopify store to local database
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <param name="forceRefresh">Whether to force refresh even if products exist</param>
        /// <returns>Sync result with statistics</returns>
        Task<ProductSyncResult> SyncProductsAsync(Guid storeConnectionId, bool forceRefresh = false);

        /// <summary>
        /// Gets local products from database with page-based pagination
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <param name="search">Search query</param>
        /// <param name="status">Product status filter</param>
        /// <param name="page">Page number (1-based)</param>
        /// <param name="pageSize">Number of products per page</param>
        /// <returns>List of local products with pagination info</returns>
        Task<ProductListResult> GetLocalProductsAsync(
            Guid storeConnectionId,
            string? search = null,
            string? status = null,
            int page = 1,
            int pageSize = 50);

        /// <summary>
        /// Gets product count from local database
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <returns>Product counts by status</returns>
        Task<ProductCountResult> GetLocalProductCountAsync(Guid storeConnectionId);

        /// <summary>
        /// Checks if products exist in local database
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <returns>True if products exist locally</returns>
        Task<bool> HasLocalProductsAsync(Guid storeConnectionId);

        // Alternative: Cursor-based pagination for better performance with large datasets
        Task<CursorBasedResult> GetLocalProductsWithCursorAsync(
            Guid storeConnectionId,
            string? search = null,
            string? status = null,
            string? cursor = null,
            int pageSize = 50);

        // Advanced: Window Function Pagination - Most modern approach for complex scenarios
        Task<ProductListResult> GetLocalProductsWithWindowAsync(
            Guid storeConnectionId,
            string? search = null,
            string? status = null,
            int page = 1,
            int pageSize = 50);

        // Inventory Methods - Using same database-backed patterns as products
        /// <summary>
        /// Gets local inventory from database with page-based pagination
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <param name="search">Search query for product title, SKU, or barcode</param>
        /// <param name="status">Product status filter</param>
        /// <param name="inventoryFilter">Inventory filter (all, in_stock, out_of_stock, low_stock)</param>
        /// <param name="page">Page number (1-based)</param>
        /// <param name="pageSize">Number of products per page</param>
        /// <returns>List of local products with inventory info and pagination</returns>
        Task<ProductListResult> GetLocalInventoryAsync(
            Guid storeConnectionId,
            string? search = null,
            string? status = null,
            string? inventoryFilter = null,
            int page = 1,
            int pageSize = 50);

        /// <summary>
        /// Gets local inventory with window function pagination for maximum performance
        /// </summary>
        Task<ProductListResult> GetLocalInventoryWithWindowAsync(
            Guid storeConnectionId,
            string? search = null,
            string? status = null,
            string? inventoryFilter = null,
            int page = 1,
            int pageSize = 50);

        /// <summary>
        /// Gets inventory count statistics from local database
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <returns>Inventory counts by stock levels</returns>
        Task<InventoryCountResult> GetLocalInventoryCountAsync(Guid storeConnectionId);

        /// <summary>
        /// Gets inventory for a specific location from local database
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <param name="locationId">Location ID to filter by</param>
        /// <param name="search">Search query</param>
        /// <param name="status">Product status filter</param>
        /// <param name="inventoryFilter">Inventory filter</param>
        /// <param name="page">Page number</param>
        /// <param name="pageSize">Number of products per page</param>
        /// <returns>Location-specific inventory with pagination info</returns>
        Task<ProductListResult> GetLocationSpecificInventoryAsync(
            Guid storeConnectionId,
            string locationId,
            string? search = null,
            string? status = null,
            string? inventoryFilter = null,
            int page = 1,
            int pageSize = 50);
    }

    public class ProductSyncResult
    {
        public int TotalFetched { get; set; }
        public int NewProducts { get; set; }
        public int UpdatedProducts { get; set; }
        public int TotalVariants { get; set; }
        public TimeSpan Duration { get; set; }
        public string? Error { get; set; }
        public bool Success => string.IsNullOrEmpty(Error);
    }

    public class ProductListResult
    {
        public List<ShopifyProduct> Products { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public bool HasMore { get; set; }
        public bool HasPrevious { get; set; }
    }

    public class ProductCountResult
    {
        public int All { get; set; }
        public int Active { get; set; }
        public int Draft { get; set; }
        public int Archived { get; set; }
        public int LimitedStock { get; set; }
        public int OutOfStock { get; set; }
    }

    // DTOs for cursor-based pagination - using the one from ShopifyDTOs.cs

    public class InventoryCountResult
    {
        public int All { get; set; }
        public int InStock { get; set; }
        public int OutOfStock { get; set; }
        public int LowStock { get; set; }
        public int Active { get; set; }
        public int Draft { get; set; }
        public int Archived { get; set; }
    }
}