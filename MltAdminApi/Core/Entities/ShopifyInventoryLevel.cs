using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mlt.Admin.Api.Core.Entities
{
    /// <summary>
    /// Shopify Inventory Level entity for location-specific inventory storage
    /// </summary>
    public class ShopifyInventoryLevel
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(255)]
        public string ShopifyInventoryLevelId { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string InventoryItemId { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string LocationId { get; set; } = string.Empty;

        [MaxLength(255)]
        public string LocationName { get; set; } = string.Empty;

        public int Available { get; set; } = 0;

        public DateTime ShopifyCreatedAt { get; set; }
        public DateTime ShopifyUpdatedAt { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // Foreign key to link with ShopifyProductVariant
        [Required]
        public Guid VariantId { get; set; }

        // Navigation property
        [ForeignKey("VariantId")]
        public virtual ShopifyProductVariant Variant { get; set; } = null!;
    }
} 