namespace Mlt.Admin.Api.Constants
{
    public static class ShopifyConstants
    {
        public const int DefaultProductLimit = 50;
        public const int DefaultOrderLimit = 50;
        public const int MaxVariantsPerProduct = 10;
        public const int MaxImagesPerProduct = 5;
        public const int MaxVariantsForSingleProduct = 50;
        public const int MaxImagesForSingleProduct = 10;
        
        public const string DefaultPage = "1";
        public const string DefaultPrice = "0";
        
        // GraphQL API version
        public const string ApiVersion = "2025-04";
        
        // Status values
        public const string ActiveStatus = "ACTIVE";
        public const string DraftStatus = "DRAFT";
        public const string ArchivedStatus = "ARCHIVED";
        
        // Order status values
        public const string OpenOrderStatus = "OPEN";
        public const string ClosedOrderStatus = "CLOSED";
        public const string CancelledOrderStatus = "CANCELLED";
        
        // Financial status values
        public const string PaidFinancialStatus = "PAID";
        public const string PendingFinancialStatus = "PENDING";
        public const string RefundedFinancialStatus = "REFUNDED";
        
        // Fulfillment status values
        public const string FulfilledStatus = "FULFILLED";
        public const string UnfulfilledStatus = "UNFULFILLED";
        public const string PartiallyFulfilledStatus = "PARTIALLY_FULFILLED";
    }
} 