using System.Text.Json.Serialization;

namespace MLTAdminAPI.Models
{
    public class FulfillmentDetail
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("estimatedDeliveryAt")]
        public DateTime? EstimatedDeliveryAt { get; set; }

        [JsonPropertyName("location")]
        public FulfillmentLocation? Location { get; set; }

        [JsonPropertyName("service")]
        public FulfillmentService? Service { get; set; }

        [JsonPropertyName("trackingInfo")]
        public List<TrackingInfo> TrackingInfo { get; set; } = new();

        [JsonPropertyName("fulfillmentLineItems")]
        public FulfillmentLineItemConnection FulfillmentLineItems { get; set; } = new();

        [JsonPropertyName("originAddress")]
        public OriginAddress? OriginAddress { get; set; }
    }

    public class FulfillmentLocation
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("legacyResourceId")]
        public string LegacyResourceId { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }

    public class FulfillmentService
    {
        [JsonPropertyName("handle")]
        public string Handle { get; set; } = string.Empty;

        [JsonPropertyName("serviceName")]
        public string ServiceName { get; set; } = string.Empty;
    }

    public class TrackingInfo
    {
        [JsonPropertyName("company")]
        public string Company { get; set; } = string.Empty;

        [JsonPropertyName("number")]
        public string Number { get; set; } = string.Empty;

        [JsonPropertyName("url")]
        public string Url { get; set; } = string.Empty;
    }

    public class FulfillmentLineItemConnection
    {
        [JsonPropertyName("edges")]
        public List<FulfillmentLineItemEdge> Edges { get; set; } = new();
    }

    public class FulfillmentLineItemEdge
    {
        [JsonPropertyName("node")]
        public FulfillmentLineItem Node { get; set; } = new();
    }

    public class FulfillmentLineItem
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("quantity")]
        public int Quantity { get; set; }

        [JsonPropertyName("lineItem")]
        public LineItemInfo LineItem { get; set; } = new();

        [JsonPropertyName("originalTotalSet")]
        public MoneySet OriginalTotalSet { get; set; } = new();
    }

    public class LineItemInfo
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("quantity")]
        public int Quantity { get; set; }

        [JsonPropertyName("variant")]
        public ProductVariantInfo? Variant { get; set; }

        [JsonPropertyName("image")]
        public ProductImage? Image { get; set; }
    }

    public class ProductVariantInfo
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("image")]
        public ProductImage? Image { get; set; }
    }

    public class ProductImage
    {
        [JsonPropertyName("url")]
        public string Url { get; set; } = string.Empty;

        [JsonPropertyName("altText")]
        public string AltText { get; set; } = string.Empty;
    }

    public class MoneySet
    {
        [JsonPropertyName("shopMoney")]
        public Money ShopMoney { get; set; } = new();
    }

    public class Money
    {
        [JsonPropertyName("amount")]
        public string Amount { get; set; } = string.Empty;

        [JsonPropertyName("currencyCode")]
        public string CurrencyCode { get; set; } = string.Empty;
    }

    public class OriginAddress
    {
        [JsonPropertyName("address1")]
        public string Address1 { get; set; } = string.Empty;

        [JsonPropertyName("address2")]
        public string? Address2 { get; set; }

        [JsonPropertyName("city")]
        public string City { get; set; } = string.Empty;

        [JsonPropertyName("countryCode")]
        public string CountryCode { get; set; } = string.Empty;

        [JsonPropertyName("provinceCode")]
        public string ProvinceCode { get; set; } = string.Empty;

        [JsonPropertyName("zip")]
        public string Zip { get; set; } = string.Empty;
    }

    // Enhanced unfulfilled product model
    public class EnhancedUnfulfilledProduct
    {
        public string Id { get; set; } = string.Empty;
        public string OrderId { get; set; } = string.Empty;
        public string OrderNumber { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public int QuantityOrdered { get; set; }
        public int QuantityFulfilled { get; set; }
        public int QuantityUnfulfilled { get; set; }
        public string Price { get; set; } = string.Empty;
        public string Currency { get; set; } = string.Empty;
        public object? Customer { get; set; }
        public string CreatedAt { get; set; } = string.Empty;
        public ProductImage? Image { get; set; }
        public string FulfillmentStatus { get; set; } = string.Empty;
        public List<TrackingInfo> TrackingInfo { get; set; } = new();
        public DateTime? EstimatedDeliveryAt { get; set; }
        public string FulfillmentService { get; set; } = string.Empty;
        public OriginAddress? OriginAddress { get; set; }
    }
} 