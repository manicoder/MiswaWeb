using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Mlt.Admin.Api.Models;

namespace Mlt.Admin.Api.Core.Entities
{
    /// <summary>
    /// Shopify Product entity for local storage
    /// </summary>
    public class ShopifyProduct
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(255)]
        public string ShopifyProductId { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(255)]
        public string Handle { get; set; } = string.Empty;

        [Column(TypeName = "text")]
        public string? BodyHtml { get; set; }

        [MaxLength(255)]
        public string? Vendor { get; set; }

        [MaxLength(255)]
        public string? ProductType { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "active";

        [Column(TypeName = "text")]
        public string? Tags { get; set; }

        [MaxLength(1000)]
        public string? ImageUrl { get; set; }

        [MaxLength(255)]
        public string? ImageAltText { get; set; }

        public int? ImageWidth { get; set; }
        public int? ImageHeight { get; set; }

        public DateTime ShopifyCreatedAt { get; set; }
        public DateTime ShopifyUpdatedAt { get; set; }
        public DateTime? ShopifyPublishedAt { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        [Required]
        public Guid StoreConnectionId { get; set; }

        // Navigation properties
        [ForeignKey("StoreConnectionId")]
        public virtual StoreConnection StoreConnection { get; set; } = null!;

        public virtual ICollection<ShopifyProductVariant> Variants { get; set; } = new List<ShopifyProductVariant>();
    }
} 