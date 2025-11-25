using System.ComponentModel.DataAnnotations;

namespace Mlt.Admin.Api.Models;

public class StoreConnection
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Platform { get; set; } = string.Empty; // "shopify", "amazon", "flipkart"
    
    [Required]
    [MaxLength(255)]
    public string StoreName { get; set; } = string.Empty;
    
    [Required]
    public string EncryptedCredentials { get; set; } = string.Empty; // JSON with encrypted credentials
    
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "connected"; // "connected", "disconnected", "error"
    
    public bool IsActive { get; set; } = true;
    public bool IsDefault { get; set; } = false;
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastSyncAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    
    // Store additional metadata
    public string? StoreUrl { get; set; }
    public string? StoreDomain { get; set; }
    public string? StoreEmail { get; set; }
    public string? StoreCountry { get; set; }
    public string? StoreCurrency { get; set; }
    
    // Error tracking
    public string? LastError { get; set; }
    public DateTime? LastErrorAt { get; set; }
    
    // Navigation property
    public virtual User User { get; set; } = null!;
} 