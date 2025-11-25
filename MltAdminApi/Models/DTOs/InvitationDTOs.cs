using System.ComponentModel.DataAnnotations;
using Mlt.Admin.Api.Models.DTOs;

namespace Mlt.Admin.Api.Models.DTOs
{
    // Request DTOs
    public class SendInvitationRequest
    {
        [Required]
        [EmailAddress]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Role { get; set; } = string.Empty;

        public List<UserPermissionDto>? Permissions { get; set; }

        [MaxLength(255)]
        public string? InviterName { get; set; }
    }

    public class AcceptInvitationRequest
    {
        [Required]
        public string Token { get; set; } = string.Empty;

        [Required]
        [MinLength(8)]
        [MaxLength(255)]
        public string Password { get; set; } = string.Empty;

        [Required]
        [Compare("Password")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    public class ValidateInvitationRequest
    {
        [Required]
        public string Token { get; set; } = string.Empty;
    }

    public class ResendInvitationRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }

    public class CancelInvitationRequest
    {
        [Required]
        public int InvitationId { get; set; }
    }

    // Response DTOs
    public class SendInvitationResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? InvitationToken { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public InvitationDto? Invitation { get; set; }
    }

    public class AcceptInvitationResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public UserDto? User { get; set; }
    }

    public class ValidateInvitationResponse
    {
        public bool Success { get; set; }
        public bool Valid { get; set; }
        public string Message { get; set; } = string.Empty;
        public InvitationDetailsDTO? Invitation { get; set; }
    }

    public class InvitationDto
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public DateTime InvitedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string InvitedBy { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public bool IsExpired { get; set; }
        public bool IsPending { get; set; }
        public bool CanBeResent { get; set; }
        public List<UserPermissionDto>? Permissions { get; set; }
    }

    public class InvitationDetailsDTO
    {
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public string InviterName { get; set; } = string.Empty;
        public bool IsExpired { get; set; }
    }

    public class InvitationListResponse
    {
        public bool Success { get; set; }
        public List<InvitationDto> Invitations { get; set; } = new();
        public int TotalCount { get; set; }
        public int PendingCount { get; set; }
        public int ExpiredCount { get; set; }
    }

    // Using existing UserPermissionDto from AuthDTOs

    // Email-related DTOs
    public class EmailTemplateData
    {
        public string UserName { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string InviterName { get; set; } = string.Empty;
        public string InvitationLink { get; set; } = string.Empty;
        public string ExpiryDate { get; set; } = string.Empty;
        public string CompanyName { get; set; } = "MLT Admin";
    }
} 