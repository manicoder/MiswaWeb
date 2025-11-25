using System.ComponentModel.DataAnnotations;

namespace Mlt.Admin.Api.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    public UserRole Role { get; set; } = UserRole.User;
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    
    // For admin users - store hashed password
    public string? PasswordHash { get; set; }
    
    // Who created this user (admin email)
    public string? CreatedBy { get; set; }
    
    // Navigation properties
    public virtual ICollection<UserPermission> Permissions { get; set; } = new List<UserPermission>();
    public virtual ICollection<StoreConnection> StoreConnections { get; set; } = new List<StoreConnection>();
    public virtual ICollection<OTPRequest> OTPRequests { get; set; } = new List<OTPRequest>();
    public virtual ICollection<PasswordResetToken> PasswordResetTokens { get; set; } = new List<PasswordResetToken>();
}

public enum UserRole
{
    SuperAdmin = 0,
    Admin = 1,
    User = 2
} 