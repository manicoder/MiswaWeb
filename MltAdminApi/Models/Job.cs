using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mlt.Admin.Api.Models;

[Table("Jobs")]
public class Job
{
    [Key]
    public int Id { get; set; }

    [Required]
    [Column("courier_name")]
    public string CourierName { get; set; } = string.Empty;

    [Column("is_completed")]
    public bool IsCompleted { get; set; } = false;

    [Column("completed_at")]
    public DateTime? CompletedAt { get; set; }

    [Column("completed_by")]
    public string? CompletedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual ICollection<OrderStatus> OrderStatuses { get; set; } = new List<OrderStatus>();
    public virtual JobData? JobData { get; set; }
} 