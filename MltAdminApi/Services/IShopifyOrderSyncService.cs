using Mlt.Admin.Api.Core.Entities;
using Mlt.Admin.Api.Models;

namespace Mlt.Admin.Api.Services
{
    public interface IShopifyOrderSyncService
    {
        /// <summary>
        /// Synchronizes all orders from Shopify store to local database
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <param name="forceRefresh">Whether to force refresh even if orders exist</param>
        /// <returns>Sync result with statistics</returns>
        Task<OrderSyncResult> SyncOrdersAsync(Guid storeConnectionId, bool forceRefresh = false);

        /// <summary>
        /// Incremental sync - only syncs orders updated since last sync
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <param name="sinceDate">Sync orders updated since this date (default: last 24 hours)</param>
        /// <returns>Sync result with statistics</returns>
        Task<OrderSyncResult> IncrementalSyncOrdersAsync(Guid storeConnectionId, DateTime? sinceDate = null);

        /// <summary>
        /// Sync only recent orders (last N days)
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <param name="daysBack">Number of days to look back (default: 30)</param>
        /// <returns>Sync result with statistics</returns>
        Task<OrderSyncResult> SyncRecentOrdersAsync(Guid storeConnectionId, int daysBack = 30);

        /// <summary>
        /// Sync only unfulfilled orders
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <returns>Sync result with statistics</returns>
        Task<OrderSyncResult> SyncUnfulfilledOrdersAsync(Guid storeConnectionId);

        /// <summary>
        /// Gets the last sync timestamp for a store
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <returns>Last sync timestamp or null if never synced</returns>
        Task<DateTime?> GetLastSyncTimestampAsync(Guid storeConnectionId);

        /// <summary>
        /// Gets the last updated timestamp for a store
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <returns>Last updated timestamp or null if never synced</returns>
        Task<DateTime?> GetLastUpdatedTimestampAsync(Guid storeConnectionId);

        /// <summary>
        /// Updates the last sync timestamp for a store
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <param name="timestamp">Sync timestamp</param>
        Task UpdateLastSyncTimestampAsync(Guid storeConnectionId, DateTime timestamp);

        /// <summary>
        /// Gets local orders from database with page-based pagination
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <param name="search">Search query</param>
        /// <param name="status">Order status filter</param>
        /// <param name="fulfillmentStatus">Fulfillment status filter</param>
        /// <param name="startDate">Start date filter</param>
        /// <param name="endDate">End date filter</param>
        /// <param name="page">Page number (1-based)</param>
        /// <param name="pageSize">Number of orders per page</param>
        /// <returns>List of local orders with pagination info</returns>
        Task<OrderListResult> GetLocalOrdersAsync(
            Guid storeConnectionId, 
            string? search = null, 
            string? status = null,
            string? fulfillmentStatus = null,
            DateTime? startDate = null,
            DateTime? endDate = null,
            int page = 1, 
            int pageSize = 50);

        /// <summary>
        /// Gets order count from local database
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <returns>Order counts by status</returns>
        Task<OrderCountResult> GetLocalOrderCountAsync(Guid storeConnectionId);

        /// <summary>
        /// Checks if orders exist in local database
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <returns>True if orders exist locally</returns>
        Task<bool> HasLocalOrdersAsync(Guid storeConnectionId);

        /// <summary>
        /// Gets order sync statistics
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <returns>Sync statistics</returns>
        Task<OrderSyncStats> GetOrderSyncStatsAsync(Guid storeConnectionId);

        /// <summary>
        /// Gets orders with cursor-based pagination for better performance
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <param name="search">Search query</param>
        /// <param name="status">Order status filter</param>
        /// <param name="fulfillmentStatus">Fulfillment status filter</param>
        /// <param name="startDate">Start date filter</param>
        /// <param name="endDate">End date filter</param>
        /// <param name="cursor">Cursor for pagination</param>
        /// <param name="pageSize">Number of orders per page</param>
        /// <returns>Orders with cursor pagination info</returns>
        Task<CursorBasedResult> GetLocalOrdersWithCursorAsync(
            Guid storeConnectionId,
            string? search = null,
            string? status = null,
            string? fulfillmentStatus = null,
            DateTime? startDate = null,
            DateTime? endDate = null,
            string? cursor = null,
            int pageSize = 50);

        /// <summary>
        /// Gets orders with optimized SQL pagination for large datasets
        /// </summary>
        /// <param name="storeConnectionId">Store connection ID</param>
        /// <param name="search">Search query</param>
        /// <param name="status">Order status filter</param>
        /// <param name="fulfillmentStatus">Fulfillment status filter</param>
        /// <param name="startDate">Start date filter</param>
        /// <param name="endDate">End date filter</param>
        /// <param name="page">Page number (1-based)</param>
        /// <param name="pageSize">Number of orders per page</param>
        /// <returns>Orders with optimized pagination</returns>
        Task<OrderListResult> GetLocalOrdersOptimizedAsync(
            Guid storeConnectionId,
            string? search = null,
            string? status = null,
            string? fulfillmentStatus = null,
            DateTime? startDate = null,
            DateTime? endDate = null,
            int page = 1,
            int pageSize = 50);
    }

    public class OrderSyncStats
    {
        public int TotalOrders { get; set; }
        public int UnfulfilledOrders { get; set; }
        public int FulfilledOrders { get; set; }
        public DateTime? LastSyncTimestamp { get; set; }
        public TimeSpan? LastSyncDuration { get; set; }
        public int LastSyncNewOrders { get; set; }
        public int LastSyncUpdatedOrders { get; set; }
    }
} 