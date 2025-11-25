using System.ComponentModel.DataAnnotations;

namespace Mlt.Admin.Api.Models.DTOs;

public class AdminLoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string Password { get; set; } = string.Empty;
}

public class UserLoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    public string? Password { get; set; } = string.Empty;
}

public class OTPVerificationRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    [StringLength(6, MinimumLength = 6)]
    public string OTPCode { get; set; } = string.Empty;
}

public class AuthResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public UserDto? User { get; set; }
    public string? Token { get; set; }
    public List<StoreConnectionDto>? StoreConnections { get; set; }
}

// DTOs moved to SharedDTOs.cs to avoid duplication
// Using shared DTOs: UserDto, UserPermissionDto, StoreCredentialDto

public class CreateUserRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    public string Role { get; set; } = string.Empty;
    
    public List<UserPermissionDto> Permissions { get; set; } = new();
}

public class UpdateUserPermissionsRequest
{
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    public List<UserPermissionDto> Permissions { get; set; } = new();
}

public class ChangeUserRoleRequest
{
    [Required]
    public UserRole NewRole { get; set; }
}

public class ForgotPasswordRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    [Required]
    public string Token { get; set; } = string.Empty;
    
    [Required]
    [StringLength(100, MinimumLength = 6)]
    public string NewPassword { get; set; } = string.Empty;
}

public class ResetPasswordWithOTPRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    [StringLength(6, MinimumLength = 6)]
    public string OtpCode { get; set; } = string.Empty;
    
    [Required]
    [StringLength(100, MinimumLength = 6)]
    public string NewPassword { get; set; } = string.Empty;
}

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;
    
    [Required]
    [StringLength(100, MinimumLength = 6)]
    public string NewPassword { get; set; } = string.Empty;
    
    [Required]
    [StringLength(6, MinimumLength = 6)]
    public string OtpCode { get; set; } = string.Empty;
}

public class RequestChangePasswordOTPRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;
}

public class UpdateProfileRequest
{
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;
}

// AddStoreCredentialRequest moved to StoreConnectionDTOs.cs 