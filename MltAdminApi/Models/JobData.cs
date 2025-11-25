using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mlt.Admin.Api.Models;

[Table("JobData")]
public class JobData
{
    [Key]
    public int Id { get; set; }

    [Column("job_id")]
    public int JobId { get; set; }

    [Column("data")]
    public string Data { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    [ForeignKey("JobId")]
    public virtual Job Job { get; set; } = null!;
} 