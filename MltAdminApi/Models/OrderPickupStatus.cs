using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mlt.Admin.Api.Models;

public class OrderPickupStatus
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(255)]
    public string ShopifyOrderId { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string OrderName { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string PickupStatus { get; set; } = "not_pickup"; // pickup, not_pickup, missing
    
    [MaxLength(1000)]
    public string? Notes { get; set; }
    
    [Required]
    public DateTime FulfillmentDate { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string CourierCompany { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    public string TrackingNumber { get; set; } = string.Empty;
    
    [Required]
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string CreatedBy { get; set; } = "system";
    
    [MaxLength(100)]
    public string? UpdatedBy { get; set; }
} 