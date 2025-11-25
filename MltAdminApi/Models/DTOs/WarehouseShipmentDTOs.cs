using System.ComponentModel.DataAnnotations;

namespace Mlt.Admin.Api.Models.DTOs;

public class CreateWarehouseShipmentDto
{
    [MaxLength(500)]
    public string? Notes { get; set; }
}

public class WarehouseShipmentDto
{
    public int Id { get; set; }
    public string ShipmentNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DispatchedAt { get; set; }
    public DateTime? ReceivedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string? DispatchedBy { get; set; }
    public string? ReceivedBy { get; set; }
    public List<WarehouseShipmentItemDto> Items { get; set; } = new();
    
    // Calculated properties
    public int TotalItemsCount => Items.Sum(x => x.QuantityPlanned);
    public int TotalDispatchedCount => Items.Sum(x => x.QuantityDispatched);
    public int TotalReceivedCount => Items.Sum(x => x.QuantityReceived);
    public decimal TotalValue => Items.Sum(x => x.QuantityPlanned * x.UnitPrice);
}

public class WarehouseShipmentItemDto
{
    public int Id { get; set; }
    public int ShipmentId { get; set; }
    public string ProductBarcode { get; set; } = string.Empty;
    public string ShopifyProductId { get; set; } = string.Empty;
    public string ShopifyVariantId { get; set; } = string.Empty;
    public string ProductTitle { get; set; } = string.Empty;
    public string? VariantTitle { get; set; }
    public string? Sku { get; set; }
    public int QuantityPlanned { get; set; }
    public int QuantityDispatched { get; set; }
    public int QuantityReceived { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal? CompareAtPrice { get; set; }
    public string Currency { get; set; } = "INR";
    public string? ProductImageUrl { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsExistingItem { get; set; }
}

public class AddProductToShipmentDto
{
    [Required]
    public int ShipmentId { get; set; }
    
    [Required]
    [MaxLength(255)]
    public string Barcode { get; set; } = string.Empty;
    
    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1")]
    public int Quantity { get; set; }
    
    [MaxLength(500)]
    public string? Notes { get; set; }
    
    // New optional fields for direct product addition
    public string? ShopifyProductId { get; set; }
    public string? ShopifyVariantId { get; set; }
    public string? ProductTitle { get; set; }
    public string? VariantTitle { get; set; }
    public string? Sku { get; set; }
    public decimal? Price { get; set; }
    public decimal? CompareAtPrice { get; set; }
    public string? Currency { get; set; }
    public string? ProductImageUrl { get; set; }
}

public class BarcodeProductInfoDto
{
    public string ShopifyProductId { get; set; } = string.Empty;
    public string ShopifyVariantId { get; set; } = string.Empty;
    public string ProductTitle { get; set; } = string.Empty;
    public string? VariantTitle { get; set; }
    public string? Sku { get; set; }
    public string Barcode { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal? CompareAtPrice { get; set; }
    public string Currency { get; set; } = "INR";
    public string? ImageUrl { get; set; }
    public int AvailableQuantity { get; set; }
    public bool IsFound { get; set; }
    public string? ErrorMessage { get; set; }
}

public class DispatchShipmentDto
{
    [Required]
    public int ShipmentId { get; set; }
    
    [Required]
    public List<DispatchItemDto> Items { get; set; } = new();
    
    [MaxLength(500)]
    public string? Notes { get; set; }
}

public class DispatchItemDto
{
    [Required]
    public int ItemId { get; set; }
    
    [Required]
    [Range(0, int.MaxValue, ErrorMessage = "Quantity dispatched cannot be negative")]
    public int QuantityDispatched { get; set; }
    
    [MaxLength(500)]
    public string? Notes { get; set; }
}

public class ReceiveShipmentDto
{
    [Required]
    public int ShipmentId { get; set; }
    
    [Required]
    public List<ReceiveItemDto> Items { get; set; } = new();
    
    [MaxLength(500)]
    public string? Notes { get; set; }
}

public class ReceiveItemDto
{
    [Required]
    public int ItemId { get; set; }
    
    [Required]
    [Range(0, int.MaxValue, ErrorMessage = "Quantity received cannot be negative")]
    public int QuantityReceived { get; set; }
    
    [MaxLength(500)]
    public string? Notes { get; set; }
}

public class WarehouseShipmentListDto
{
    public List<WarehouseShipmentDto> Shipments { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public bool HasNextPage { get; set; }
    public bool HasPreviousPage { get; set; }
} 