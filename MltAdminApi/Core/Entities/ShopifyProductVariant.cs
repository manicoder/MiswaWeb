using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mlt.Admin.Api.Core.Entities
{
    /// <summary>
    /// Shopify Product Variant entity for local storage
    /// </summary>
    public class ShopifyProductVariant
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(255)]
        public string ShopifyVariantId { get; set; } = string.Empty;

        [Required]
        public Guid ProductId { get; set; }

        [MaxLength(500)]
        public string? Title { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? CompareAtPrice { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? CostPerItem { get; set; }

        [MaxLength(255)]
        public string? Sku { get; set; }

        [MaxLength(255)]
        public string? Barcode { get; set; }

        public int InventoryQuantity { get; set; } = 0;

        public int Position { get; set; } = 1;

        [MaxLength(50)]
        public string? InventoryPolicy { get; set; }

        [MaxLength(100)]
        public string? FulfillmentService { get; set; }

        [MaxLength(100)]
        public string? InventoryManagement { get; set; }

        public bool Taxable { get; set; } = true;

        public bool RequiresShipping { get; set; } = true;

        public int Grams { get; set; } = 0;

        public decimal Weight { get; set; } = 0;

        [MaxLength(10)]
        public string? WeightUnit { get; set; }

        [MaxLength(255)]
        public string? InventoryItemId { get; set; }

        [MaxLength(255)]
        public string? Option1 { get; set; }

        [MaxLength(255)]
        public string? Option2 { get; set; }

        [MaxLength(255)]
        public string? Option3 { get; set; }

        public DateTime ShopifyCreatedAt { get; set; }
        public DateTime ShopifyUpdatedAt { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // Navigation properties
        [ForeignKey("ProductId")]
        public virtual ShopifyProduct Product { get; set; } = null!;
        
        public virtual ICollection<ShopifyInventoryLevel> InventoryLevels { get; set; } = new List<ShopifyInventoryLevel>();
    }
} 