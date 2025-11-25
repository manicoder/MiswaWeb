using Mlt.Admin.Api.Core.Enums;

namespace Mlt.Admin.Api.Core.Entities
{
    /// <summary>
    /// Amazon-specific order entity (for future implementation)
    /// </summary>
    public class AmazonOrder : BaseOrder
    {
        public AmazonOrder()
        {
            Platform = Platform.Amazon;
        }

        public string AmazonOrderId { get; set; } = string.Empty;
        public string OrderStatus { get; set; } = string.Empty;
        public string FulfillmentChannel { get; set; } = string.Empty;
        public string SalesChannel { get; set; } = string.Empty;
        public string OrderType { get; set; } = string.Empty;
        public DateTime? PurchaseDate { get; set; }
        public DateTime? LastUpdateDate { get; set; }
        public string? MarketplaceId { get; set; }
        
        // Amazon-specific fields
        public string? BuyerEmail { get; set; }
        public string? BuyerName { get; set; }
        public string? ShipmentServiceLevelCategory { get; set; }
        public bool? IsBusinessOrder { get; set; }
        public bool? IsPrime { get; set; }
        public bool? IsGlobalExpressEnabled { get; set; }
        
        // Shipping address
        public string? ShippingName { get; set; }
        public string? ShippingAddressLine1 { get; set; }
        public string? ShippingAddressLine2 { get; set; }
        public string? ShippingCity { get; set; }
        public string? ShippingStateOrRegion { get; set; }
        public string? ShippingPostalCode { get; set; }
        public string? ShippingCountryCode { get; set; }
        
        // Order items (stored as JSON)
        public string OrderItemsJson { get; set; } = "[]";
    }
} 