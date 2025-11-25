using Mlt.Admin.Api.Core.Entities;

namespace Mlt.Admin.Api.Models
{
    public class ProductSyncResult
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
        public int TotalFetched { get; set; }
        public int NewProducts { get; set; }
        public int UpdatedProducts { get; set; }
        public int TotalVariants { get; set; }
        public TimeSpan Duration { get; set; }
    }



    public class ProductCountResult
    {
        public int Total { get; set; }
        public int Active { get; set; }
        public int Draft { get; set; }
        public int Archived { get; set; }
    }

    public class InventoryCountResult
    {
        public int TotalProducts { get; set; }
        public int InStockProducts { get; set; }
        public int OutOfStockProducts { get; set; }
        public int LowStockProducts { get; set; }
        public int TotalVariants { get; set; }
        public int InStockVariants { get; set; }
        public int OutOfStockVariants { get; set; }
        public int LowStockVariants { get; set; }
    }

    public class CursorBasedResult
    {
        public List<ShopifyProduct> Products { get; set; } = new List<ShopifyProduct>();
        public List<ShopifyOrder> Orders { get; set; } = new List<ShopifyOrder>();
        public string? NextCursor { get; set; }
        public string? PreviousCursor { get; set; }
        public bool HasNextPage { get; set; }
        public bool HasPreviousPage { get; set; }
        public bool HasMore { get; set; }
        public bool HasPrevious { get; set; }
        public int Total { get; set; }
        public int PageSize { get; set; }
    }

    public class OrderSyncResult
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
        public int TotalFetched { get; set; }
        public int NewOrders { get; set; }
        public int UpdatedOrders { get; set; }
        public int TotalLineItems { get; set; }
        public TimeSpan Duration { get; set; }
    }

    public class OrderListResult
    {
        public List<ShopifyOrder> Orders { get; set; } = new List<ShopifyOrder>();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public bool HasMore { get; set; }
        public bool HasPrevious { get; set; }
    }

    public class OrderCountResult
    {
        public int Total { get; set; }
        public int Fulfilled { get; set; }
        public int Unfulfilled { get; set; }
        public int Cancelled { get; set; }
        public int Pending { get; set; }
        public int Paid { get; set; }
        public int Unpaid { get; set; }
        public int Refunded { get; set; }
    }
}