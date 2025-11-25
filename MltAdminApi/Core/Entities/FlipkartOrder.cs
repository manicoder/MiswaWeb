using Mlt.Admin.Api.Core.Enums;

namespace Mlt.Admin.Api.Core.Entities
{
    /// <summary>
    /// Flipkart-specific order entity (for future implementation)
    /// </summary>
    public class FlipkartOrder : BaseOrder
    {
        public FlipkartOrder()
        {
            Platform = Platform.Flipkart;
        }

        public string FlipkartOrderId { get; set; } = string.Empty;
        public string OrderState { get; set; } = string.Empty;
        public string OrderType { get; set; } = string.Empty;
        public DateTime? OrderDate { get; set; }
        public DateTime? DeliveryDate { get; set; }
        public string? TrackingId { get; set; }
        
        // Flipkart-specific fields
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
        public string? CustomerEmail { get; set; }
        public string? PaymentType { get; set; }
        public string? PaymentStatus { get; set; }
        
        // Shipping address
        public string? ShippingName { get; set; }
        public string? ShippingAddress { get; set; }
        public string? ShippingCity { get; set; }
        public string? ShippingState { get; set; }
        public string? ShippingPincode { get; set; }
        public string? ShippingCountry { get; set; }
        
        // Order items (stored as JSON)
        public string OrderItemsJson { get; set; } = "[]";
        
        // Flipkart-specific fields
        public decimal? ShippingFee { get; set; }
        public decimal? ServiceFee { get; set; }
        public decimal? CommissionFee { get; set; }
        public string? SellerGstin { get; set; }
        public string? InvoiceNumber { get; set; }
    }
} 