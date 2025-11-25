using Mlt.Admin.Api.Core.Enums;

namespace Mlt.Admin.Api.Core.Entities
{
    /// <summary>
    /// Shopify-specific order entity
    /// </summary>
    public class ShopifyOrder : BaseOrder
    {
        public ShopifyOrder()
        {
            Platform = Platform.Shopify;
        }

        public string Name { get; set; } = string.Empty;
        public string FulfillmentStatus { get; set; } = string.Empty;
        public string DisplayFulfillmentStatus { get; set; } = string.Empty;
        public string DisplayFinancialStatus { get; set; } = string.Empty;
        public string ShopifyOrderId { get; set; } = string.Empty;
        
        // Customer information
        public string? CustomerFirstName { get; set; }
        public string? CustomerLastName { get; set; }
        public string? CustomerEmail { get; set; }
        public string? CustomerId { get; set; }
        
        // Shipping address
        public string? ShippingFirstName { get; set; }
        public string? ShippingLastName { get; set; }
        public string? ShippingAddress1 { get; set; }
        public string? ShippingCity { get; set; }
        public string? ShippingProvince { get; set; }
        public string? ShippingCountry { get; set; }
        public string? ShippingZip { get; set; }
        
        // Line items (stored as JSON)
        public string LineItemsJson { get; set; } = "[]";
        
        // Shopify-specific fields
        public DateTime? ProcessedAt { get; set; }
        public string? Tags { get; set; }
        public string? Note { get; set; }
        public decimal? TotalTax { get; set; }
        public decimal? TotalDiscounts { get; set; }
        public decimal? SubtotalPrice { get; set; }
    }
} 