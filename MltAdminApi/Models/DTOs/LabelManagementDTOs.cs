using System.ComponentModel.DataAnnotations;

namespace Mlt.Admin.Api.Models.DTOs;

public class LabelDocumentDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string OriginalName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string MimeType { get; set; } = string.Empty;
    public string CourierCompany { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
    public string UploadedBy { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class CourierLabelGroupDto
{
    public string CourierName { get; set; } = string.Empty;
    public int LabelCount { get; set; }
    public List<LabelDocumentDto> Labels { get; set; } = new();
    public long TotalSize { get; set; }
}

public class LabelManagementResponseDto
{
    public List<CourierLabelGroupDto> CourierGroups { get; set; } = new();
    public int TotalLabels { get; set; }
    public long TotalSize { get; set; }
}

public class UploadLabelDto
{
    [Required]
    public IFormFile File { get; set; } = null!;

    [Required]
    [RegularExpression("^(XpressBees|Bluedart|Delhivery|Amazon|Others)$", 
        ErrorMessage = "Courier company must be one of: XpressBees, Bluedart, Delhivery, Amazon, Others")]
    public string CourierCompany { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }
} 