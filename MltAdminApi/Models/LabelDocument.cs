using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mlt.Admin.Api.Models;

[Table("LabelDocuments")]
public class LabelDocument
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string OriginalName { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string FilePath { get; set; } = string.Empty;

    [Required]
    public long FileSize { get; set; }

    [Required]
    [MaxLength(100)]
    public string MimeType { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string CourierCompany { get; set; } = string.Empty;

    [Required]
    public DateTime UploadedAt { get; set; }

    [Required]
    public Guid UploadedBy { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    [Required]
    public bool IsDeleted { get; set; } = false;

    public DateTime? DeletedAt { get; set; }

    public Guid? DeletedBy { get; set; }

    // Navigation properties
    [ForeignKey("UploadedBy")]
    public virtual User? UploadedByUser { get; set; }

    [ForeignKey("DeletedBy")]
    public virtual User? DeletedByUser { get; set; }
} 