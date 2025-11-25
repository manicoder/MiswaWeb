using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Mlt.Admin.Api.Models;

namespace Mlt.Admin.Api.Models
{
    public class Invitation
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Role { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string Token { get; set; } = string.Empty;

        [Required]
        public DateTime InvitedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime ExpiresAt { get; set; }

        [Required]
        [MaxLength(255)]
        public string InvitedBy { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // Pending, Accepted, Expired, Cancelled

        public string? Permissions { get; set; } // JSON string of permissions

        // Navigation properties
        public Guid? AcceptedUserId { get; set; }
        
        [ForeignKey("AcceptedUserId")]
        public User? AcceptedUser { get; set; }

        // Computed properties
        public bool IsExpired => DateTime.UtcNow > ExpiresAt;
        
        public bool IsPending => Status == "Pending" && !IsExpired;
        
        public bool CanBeResent => Status == "Pending" || Status == "Expired";
    }

    public enum InvitationStatus
    {
        Pending,
        Accepted,
        Expired,
        Cancelled
    }
} 