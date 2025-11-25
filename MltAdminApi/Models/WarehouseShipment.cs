using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MltAdminApi.Models;

namespace Mlt.Admin.Api.Models;

public class WarehouseShipment
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string ShipmentNumber { get; set; } = string.Empty; // Auto-generated: WS-YYYYMMDD-XXXX
    
    // Source and Destination Warehouses for inter-warehouse transfers
    public int? SourceWarehouseId { get; set; }
    
    public int? DestinationWarehouseId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "draft"; // draft, created, dispatched, received, completed
    
    [MaxLength(500)]
    public string? Notes { get; set; }
    
    [Required]
    public DateTime CreatedAt { get; set; }
    
    public DateTime? DispatchedAt { get; set; }
    
    public DateTime? ReceivedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string CreatedBy { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? DispatchedBy { get; set; }
    
    [MaxLength(100)]
    public string? ReceivedBy { get; set; }
    
    // Navigation properties
    [ForeignKey("SourceWarehouseId")]
    public virtual Warehouse? SourceWarehouse { get; set; }
    
    [ForeignKey("DestinationWarehouseId")]
    public virtual Warehouse? DestinationWarehouse { get; set; }
    
    public virtual ICollection<WarehouseShipmentItem> Items { get; set; } = new List<WarehouseShipmentItem>();
}

public class WarehouseShipmentItem
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int ShipmentId { get; set; }
    
    [Required]
    [MaxLength(255)]
    public string ProductBarcode { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    public string ShopifyProductId { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    public string ShopifyVariantId { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(500)]
    public string ProductTitle { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? VariantTitle { get; set; }
    
    [MaxLength(100)]
    public string? Sku { get; set; }
    
    [Required]
    public int QuantityPlanned { get; set; } // Quantity planned to ship
    
    public int QuantityDispatched { get; set; } = 0; // Quantity actually dispatched
    
    public int QuantityReceived { get; set; } = 0; // Quantity confirmed received at warehouse
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitPrice { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal? CompareAtPrice { get; set; }
    
    [MaxLength(10)]
    public string Currency { get; set; } = "INR";
    
    [MaxLength(1000)]
    public string? ProductImageUrl { get; set; }
    
    [MaxLength(500)]
    public string? Notes { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    // Navigation properties
    [ForeignKey("ShipmentId")]
    public virtual WarehouseShipment Shipment { get; set; } = null!;
} 