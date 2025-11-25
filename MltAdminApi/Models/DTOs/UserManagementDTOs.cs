using System.ComponentModel.DataAnnotations;

namespace Mlt.Admin.Api.Models.DTOs
{
    // Request DTOs
    public class UpdateUserRequest
    {
        [Required]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Role { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;
    }



    // Response DTOs
    public class UserResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public UserDto? User { get; set; }
    }

    public class UserListResponse
    {
        public bool Success { get; set; }
        public List<UserDto> Users { get; set; } = new();
        public int TotalCount { get; set; }
        public int ActiveCount { get; set; }
        public int InactiveCount { get; set; }
    }

    public class UserPermissionsResponse
    {
        public bool Success { get; set; }
        public Guid UserId { get; set; }
        public List<UserPermissionDto> Permissions { get; set; } = new();
    }

    public class UserStatsResponse
    {
        public bool Success { get; set; }
        public int TotalUsers { get; set; }
        public int ActiveUsers { get; set; }
        public int InactiveUsers { get; set; }
        public int AdminUsers { get; set; }
        public int ManagerUsers { get; set; }
        public int RegularUsers { get; set; }
        public Dictionary<string, int> RoleDistribution { get; set; } = new();
        public int RecentlyJoined { get; set; } // Users joined in last 30 days
    }

    // Extended User DTO for management
    public class UserManagementDto : UserDto
    {
        public new DateTime CreatedAt { get; set; }
        public DateTime? LastLogin { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public new List<UserPermissionDto> Permissions { get; set; } = new();
        public bool CanEdit { get; set; } = true;
        public bool CanDelete { get; set; } = true;
    }
} 