using System.ComponentModel.DataAnnotations;

namespace Mlt.Admin.Api.Models;

public class OTPRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(6)]
    public string OTPCode { get; set; } = string.Empty;
    
    public DateTime ExpiresAt { get; set; }
    
    public bool IsUsed { get; set; } = false;
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UsedAt { get; set; }
    
    // IP address for security tracking
    public string? RequestIP { get; set; }
    public string? UserAgent { get; set; }
    
    // Navigation property
    public virtual User User { get; set; } = null!;
    
    public bool IsValid => !IsUsed && DateTime.UtcNow < ExpiresAt;
} 