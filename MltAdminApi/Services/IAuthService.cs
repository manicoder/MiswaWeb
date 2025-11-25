using Mlt.Admin.Api.Models;
using Mlt.Admin.Api.Models.DTOs;

namespace Mlt.Admin.Api.Services;

public interface IAuthService
{
    // Admin authentication
    Task<AuthResponse> AdminLoginAsync(AdminLoginRequest request);
    
    // User OTP authentication
    Task<AuthResponse> UserLoginAsync(UserLoginRequest request);
    Task<AuthResponse> RequestOTPAsync(UserLoginRequest request);
    Task<AuthResponse> VerifyOTPAsync(OTPVerificationRequest request);
    
    // Password management
    Task<AuthResponse> ForgotPasswordAsync(ForgotPasswordRequest request);
    Task<AuthResponse> ResetPasswordAsync(ResetPasswordRequest request);
    Task<AuthResponse> ResetPasswordWithOTPAsync(ResetPasswordWithOTPRequest request);
    Task<AuthResponse> RequestChangePasswordOTPAsync(RequestChangePasswordOTPRequest request, Guid userId);
    Task<AuthResponse> ChangePasswordAsync(ChangePasswordRequest request, Guid userId);
    
    // Profile management
    Task<AuthResponse> GetProfileAsync(Guid userId);
    Task<AuthResponse> UpdateProfileAsync(UpdateProfileRequest request, Guid userId);
    
    // Logout
    Task<AuthResponse> LogoutAsync(Guid userId);
    
    // User management (admin only)
    Task<AuthResponse> CreateUserAsync(CreateUserRequest request, string adminEmail);
    Task<AuthResponse> UpdateUserPermissionsAsync(UpdateUserPermissionsRequest request, string adminEmail);
    Task<bool> DeactivateUserAsync(Guid userId, string adminEmail);
    Task<bool> ActivateUserAsync(Guid userId, string adminEmail);
    Task<bool> ChangeUserRoleAsync(Guid userId, UserRole newRole, string adminEmail);
    Task<bool> RemoveUserAsync(Guid userId, string adminEmail);
    Task<List<UserDto>> GetUsersAsync();
    Task<List<UserDto>> GetAllUsersIncludingInactiveAsync();
    Task<List<UserDto>> GetAllUsersAsync();
    
    // Store credentials management is now handled by StoreConnectionService
    
    // Utility methods
    Task<User?> GetUserByEmailAsync(string email);
    Task<User?> GetUserByIdAsync(Guid userId);
    string HashPassword(string password);
    bool VerifyPassword(string password, string hash);
} 