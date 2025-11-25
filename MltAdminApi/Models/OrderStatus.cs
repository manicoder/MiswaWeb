using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mlt.Admin.Api.Models;

[Table("OrderStatus")]
public class OrderStatus
{
    [Key]
    public int Id { get; set; }

    [Column("job_id")]
    public int JobId { get; set; }

    [Required]
    [Column("order_id")]
    public string OrderId { get; set; } = string.Empty;

    [Column("is_pickup")]
    public bool IsPickup { get; set; } = false;

    [Column("is_missing")]
    public bool IsMissing { get; set; } = false;

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    [ForeignKey("JobId")]
    public virtual Job Job { get; set; } = null!;
} 