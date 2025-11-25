using System.ComponentModel.DataAnnotations;

namespace Mlt.Admin.Api.Models.DTOs
{
    public class UpdateProductVariantDto
    {
        [Required]
        public string ProductId { get; set; } = string.Empty;
        
        [Required]
        public string VariantId { get; set; } = string.Empty;
        
        public string? Title { get; set; }
        public string? Status { get; set; }
        public string? Sku { get; set; }
        public string? Barcode { get; set; }
        public decimal? Price { get; set; }
        public decimal? CompareAtPrice { get; set; }
        public decimal? CostPerItem { get; set; }
        public int? InventoryQuantity { get; set; }
    }

    public class BulkUpdateProductVariantsDto
    {
        [Required]
        public List<UpdateProductVariantDto> Updates { get; set; } = new();
    }

    public class ProductVariantUpdateResultDto
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
        public string? VariantId { get; set; }
        public string? ProductInfo { get; set; }
    }

    public class BulkUpdateResultDto
    {
        public int Successful { get; set; }
        public int Failed { get; set; }
        public List<ProductVariantUpdateResultDto> Results { get; set; } = new();
        public List<string> Errors { get; set; } = new();
        public string Summary { get; set; } = string.Empty;
    }

    public class ShopifyApiResponseDto<T>
    {
        public bool Success { get; set; }
        public T? Data { get; set; }
        public string? Error { get; set; }
        public string? Message { get; set; }
        public Dictionary<string, object>? Metadata { get; set; }
    }

    // New DTOs for SKU validation/preview
    public class ValidateSkusDto
    {
        [Required]
        public List<CsvRowDto> CsvData { get; set; } = new();
    }

    public class CsvRowDto
    {
        [Required]
        public string Sku { get; set; } = string.Empty;
        
        [Required]
        public string Fnsku { get; set; } = string.Empty;
    }

    public class FoundProductDto
    {
        public string ProductId { get; set; } = string.Empty;
        public string VariantId { get; set; } = string.Empty;
        public string ProductTitle { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public string CurrentBarcode { get; set; } = string.Empty;
        public string NewBarcode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Price { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
    }

    public class NotFoundSkuDto
    {
        public string Sku { get; set; } = string.Empty;
        public string Fnsku { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
    }

    public class SkuValidationResultDto
    {
        public List<FoundProductDto> FoundProducts { get; set; } = new();
        public List<NotFoundSkuDto> NotFoundSkus { get; set; } = new();
        public int TotalCsvRows { get; set; }
        public int FoundCount { get; set; }
        public int NotFoundCount { get; set; }
        public string Summary { get; set; } = string.Empty;
    }

    public class ExportNotFoundSkusDto
    {
        [Required]
        public List<NotFoundSkuDto> NotFoundSkus { get; set; } = new();
        
        public string? Title { get; set; } = "Not Found SKUs Report";
        public string? StoreName { get; set; }
        public DateTime? GeneratedAt { get; set; } = DateTime.UtcNow;
    }

    public class TopSellingProductResult
{
    public string? product_name { get; set; }
    public string? product_id { get; set; }
    public string? image_url { get; set; }
    public int total_quantity { get; set; }
    public decimal total_revenue { get; set; }
    public decimal total_cost { get; set; }
    public decimal total_profit { get; set; }
    public decimal margin_percentage { get; set; }
}
} 