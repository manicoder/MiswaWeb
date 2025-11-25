using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using Mlt.Admin.Api.Data;
using Mlt.Admin.Api.Models;
using Mlt.Admin.Api.Models.DTOs;

namespace Mlt.Admin.Api.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AuthService> _logger;
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;
    private readonly IJwtService _jwtService;
    private readonly IStoreConnectionService _storeConnectionService;
    private readonly IEncryptionService _encryptionService;

    public AuthService(ApplicationDbContext context, ILogger<AuthService> logger, IConfiguration configuration, IEmailService emailService, IJwtService jwtService, IStoreConnectionService storeConnectionService, IEncryptionService encryptionService)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
        _emailService = emailService;
        _jwtService = jwtService;
        _storeConnectionService = storeConnectionService;
        _encryptionService = encryptionService;
    }

    public async Task<AuthResponse> AdminLoginAsync(AdminLoginRequest request)
    {
        try
        {
            var user = await GetUserByEmailAsync(request.Email);
            
            if (user == null || (user.Role != UserRole.Admin && user.Role != UserRole.SuperAdmin) || !user.IsActive)
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "Invalid credentials" 
                };
            }

            if (user.PasswordHash == null || !VerifyPassword(request.Password, user.PasswordHash))
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "Invalid credentials" 
                };
            }

            // Update last login
            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var userDto = MapToUserDto(user);
            var token = _jwtService.GenerateToken(user);
            
            // Get user's store connections
            var storeConnections = await _storeConnectionService.GetUserStoreConnectionsAsync(user.Id);

            return new AuthResponse
            {
                Success = true,
                Message = "Login successful",
                User = userDto,
                Token = token,
                StoreConnections = storeConnections.Stores
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during admin login for {Email}", request.Email);
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Login failed" 
            };
        }
    }

    // New method for user login with password + OTP
    public async Task<AuthResponse> UserLoginAsync(UserLoginRequest request)
    {
        try
        {
            var user = await GetUserByEmailAsync(request.Email);
            
            if (user == null || user.Role != UserRole.User || !user.IsActive)
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "Invalid email or password" 
                };
            }

            // Check if user has a password set
            if (string.IsNullOrEmpty(user.PasswordHash))
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "Account not set up. Please contact admin for invitation." 
                };
            }

            // Verify password
            if (!VerifyPassword(request.Password ?? "", user.PasswordHash))
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "Invalid email or password" 
                };
            }

            // Password verified, now send OTP
            return await RequestOTPAsync(request);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during user login for {Email}", request.Email);
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Login failed" 
            };
        }
    }

    public async Task<AuthResponse> RequestOTPAsync(UserLoginRequest request)
    {
        try
        {
            var user = await GetUserByEmailAsync(request.Email);
            
            if (user == null || user.Role != UserRole.User || !user.IsActive)
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "User not found or inactive" 
                };
            }

            // Generate 6-digit OTP
            var otp = GenerateOTP();
            var otpRequest = new OTPRequest
            {
                UserId = user.Id,
                OTPCode = otp,
                ExpiresAt = DateTime.UtcNow.AddMinutes(5), // 5-minute expiry
                CreatedAt = DateTime.UtcNow
            };

            _context.OTPRequests.Add(otpRequest);
            await _context.SaveChangesAsync();

            // Send OTP via email
            try
            {
                var emailSent = await _emailService.SendOTPEmailAsync(request.Email, otp);
                
                if (emailSent)
                {
                    _logger.LogInformation("✅ OTP sent successfully to {Email}", request.Email);
                }
                else
                {
                    _logger.LogWarning("⚠️ Failed to send OTP email to {Email}, but OTP is logged for development", request.Email);
                }
            }
            catch (Exception emailEx)
            {
                _logger.LogError(emailEx, "❌ Error sending OTP email to {Email}", request.Email);
            }

            // Always log OTP for development/debugging
            _logger.LogInformation("🔢 OTP for {Email}: {OTP} (expires at {ExpiresAt})", request.Email, otp, otpRequest.ExpiresAt);

            return new AuthResponse
            {
                Success = true,
                Message = $"OTP sent to {request.Email}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error requesting OTP for {Email}", request.Email);
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Failed to send OTP" 
            };
        }
    }

    public async Task<AuthResponse> VerifyOTPAsync(OTPVerificationRequest request)
    {
        try
        {
            var user = await GetUserByEmailAsync(request.Email);
            
            if (user == null || !user.IsActive)
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "Invalid request" 
                };
            }

            var otpRequest = await _context.OTPRequests
                .Where(o => o.UserId == user.Id && o.OTPCode == request.OTPCode && !o.IsUsed && o.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();

            if (otpRequest == null)
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "Invalid or expired OTP" 
                };
            }

            // Mark OTP as used
            otpRequest.IsUsed = true;
            otpRequest.UsedAt = DateTime.UtcNow;
            
            // Update last login
            user.LastLoginAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();

            var userDto = MapToUserDto(user);
            var token = _jwtService.GenerateToken(user);
            
            // Get user's store connections
            var storeConnections = await _storeConnectionService.GetUserStoreConnectionsAsync(user.Id);

            return new AuthResponse
            {
                Success = true,
                Message = "Login successful",
                User = userDto,
                Token = token,
                StoreConnections = storeConnections.Stores
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying OTP for {Email}", request.Email);
            return new AuthResponse 
            { 
                Success = false, 
                Message = "OTP verification failed" 
            };
        }
    }

    public async Task<AuthResponse> CreateUserAsync(CreateUserRequest request, string adminEmail)
    {
        try
        {
            var existingUser = await GetUserByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "User already exists" 
                };
            }

            var user = new User
            {
                Email = request.Email,
                Name = request.Name,
                Role = Enum.Parse<UserRole>(request.Role, ignoreCase: true),
                CreatedBy = adminEmail,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // For admin users, generate a default password (should be changed on first login)
            if (user.Role == UserRole.Admin)
            {
                user.PasswordHash = HashPassword("TempPassword123!"); // Should be changed immediately
            }

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Add permissions
            foreach (var permission in request.Permissions)
            {
                var userPermission = new UserPermission
                {
                    UserId = user.Id,
                    TabId = permission.TabId,
                    TabName = permission.TabName,
                    HasAccess = permission.HasAccess,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.UserPermissions.Add(userPermission);
            }

            await _context.SaveChangesAsync();

            var userDto = MapToUserDto(user);
            
            return new AuthResponse
            {
                Success = true,
                Message = "User created successfully",
                User = userDto
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user {Email}", request.Email);
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Failed to create user" 
            };
        }
    }

    public async Task<AuthResponse> UpdateUserPermissionsAsync(UpdateUserPermissionsRequest request, string adminEmail)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.Permissions)
                .FirstOrDefaultAsync(u => u.Id == request.UserId);

            if (user == null)
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "User not found" 
                };
            }

            // Remove existing permissions
            _context.UserPermissions.RemoveRange(user.Permissions);

            // Add new permissions
            foreach (var permission in request.Permissions)
            {
                var userPermission = new UserPermission
                {
                    UserId = user.Id,
                    TabId = permission.TabId,
                    TabName = permission.TabName,
                    HasAccess = permission.HasAccess,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.UserPermissions.Add(userPermission);
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var userDto = MapToUserDto(user);
            
            return new AuthResponse
            {
                Success = true,
                Message = "User permissions updated successfully",
                User = userDto
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating permissions for user {UserId}", request.UserId);
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Failed to update permissions" 
            };
        }
    }

    public async Task<bool> DeactivateUserAsync(Guid userId, string adminEmail)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                _logger.LogWarning("User {UserId} not found for deactivation", userId);
                return false;
            }

            if (user.Role == UserRole.Admin)
            {
                _logger.LogWarning("Admin user {Email} cannot be deactivated", user.Email);
                return false;
            }

            user.IsActive = false;
            user.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("User {Email} deactivated by admin {AdminEmail}", user.Email, adminEmail);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> ActivateUserAsync(Guid userId, string adminEmail)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                _logger.LogWarning("User {UserId} not found for activation", userId);
                return false;
            }

            if (user.IsActive)
            {
                _logger.LogInformation("User {Email} is already active", user.Email);
                return true;
            }

            user.IsActive = true;
            user.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("User {Email} activated by admin {AdminEmail}", user.Email, adminEmail);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> ChangeUserRoleAsync(Guid userId, UserRole newRole, string adminEmail)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.Permissions)
                .FirstOrDefaultAsync(u => u.Id == userId);
                
            if (user == null)
            {
                _logger.LogWarning("User {UserId} not found for role change", userId);
                return false;
            }

            // Prevent changing admin role if this is the only admin
            if (user.Role == UserRole.Admin && newRole != UserRole.Admin)
            {
                var adminCount = await _context.Users.CountAsync(u => u.Role == UserRole.Admin && u.IsActive);
                if (adminCount <= 1)
                {
                    _logger.LogWarning("Cannot change role of the last active admin user {Email}", user.Email);
                    return false;
                }
            }

            var oldRole = user.Role;
            user.Role = newRole;
            user.UpdatedAt = DateTime.UtcNow;

            // If changing to admin, grant all permissions
            if (newRole == UserRole.Admin)
            {
                // Remove existing permissions
                _context.UserPermissions.RemoveRange(user.Permissions);
                
                // Add all permissions for admin
                var allPermissions = new List<UserPermission>();
                foreach (var (tabId, tabName) in AvailableTabs.TabNames)
                {
                    allPermissions.Add(new UserPermission
                    {
                        UserId = user.Id,
                        TabId = tabId,
                        TabName = tabName,
                        HasAccess = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
                _context.UserPermissions.AddRange(allPermissions);
            }
            // If changing from admin to user, restrict to core permissions only
            else if (oldRole == UserRole.Admin && newRole == UserRole.User)
            {
                // Remove existing permissions
                _context.UserPermissions.RemoveRange(user.Permissions);
                
                // Add only core permissions for user
                var corePermissions = new List<UserPermission>();
                foreach (var tabId in AvailableTabs.CoreTabs)
                {
                    corePermissions.Add(new UserPermission
                    {
                        UserId = user.Id,
                        TabId = tabId,
                        TabName = AvailableTabs.TabNames[tabId],
                        HasAccess = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
                _context.UserPermissions.AddRange(corePermissions);
            }
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("User {Email} role changed from {OldRole} to {NewRole} by admin {AdminEmail}", 
                user.Email, oldRole, newRole, adminEmail);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing role for user {UserId} to {NewRole}", userId, newRole);
            return false;
        }
    }

    public async Task<bool> RemoveUserAsync(Guid userId, string adminEmail)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.Permissions)
                .Include(u => u.StoreConnections)
                .Include(u => u.OTPRequests)
                .FirstOrDefaultAsync(u => u.Id == userId);
                
            if (user == null)
            {
                _logger.LogWarning("User {UserId} not found for removal", userId);
                return false;
            }

            // Prevent removing admin users
            if (user.Role == UserRole.Admin)
            {
                _logger.LogWarning("Admin user {Email} cannot be permanently removed", user.Email);
                return false;
            }

            // Remove all related data
            _context.UserPermissions.RemoveRange(user.Permissions);
            _context.StoreConnections.RemoveRange(user.StoreConnections);
            _context.OTPRequests.RemoveRange(user.OTPRequests);
            
            // Remove the user
            _context.Users.Remove(user);
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("User {Email} permanently removed by admin {AdminEmail}", user.Email, adminEmail);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing user {UserId}", userId);
            return false;
        }
    }

    public async Task<List<UserDto>> GetUsersAsync()
    {
        try
        {
            _logger.LogDebug("Attempting to retrieve users from database");
            
            // Test database connection first
            if (!await _context.Database.CanConnectAsync())
            {
                _logger.LogError("Database connection failed");
                throw new InvalidOperationException("Database connection is not available");
            }

            var users = await _context.Users
                .Include(u => u.Permissions)
                .Where(u => u.IsActive)
                .OrderBy(u => u.Name)
                .ToListAsync();

            _logger.LogDebug("Retrieved {UserCount} users from database", users.Count);

            var userDtos = new List<UserDto>();
            foreach (var user in users)
            {
                try
                {
                    userDtos.Add(MapToUserDto(user));
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to map user {UserId} to DTO, skipping", user.Id);
                    // Continue processing other users
                }
            }

            _logger.LogInformation("Successfully processed {ProcessedCount} out of {TotalCount} users", 
                userDtos.Count, users.Count);

            return userDtos;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting users: {ErrorMessage}", ex.Message);
            throw; // Re-throw to let controller handle the error appropriately
        }
    }

    public async Task<List<UserDto>> GetAllUsersIncludingInactiveAsync()
    {
        try
        {
            _logger.LogDebug("Attempting to retrieve ALL users (including inactive) from database");
            
            // Test database connection first
            if (!await _context.Database.CanConnectAsync())
            {
                _logger.LogError("Database connection failed");
                throw new InvalidOperationException("Database connection is not available");
            }

            var users = await _context.Users
                .Include(u => u.Permissions)
                .OrderBy(u => u.Name)
                .ToListAsync();

            _logger.LogDebug("Retrieved {UserCount} total users from database", users.Count);

            var userDtos = new List<UserDto>();
            foreach (var user in users)
            {
                try
                {
                    userDtos.Add(MapToUserDto(user));
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to map user {UserId} to DTO, skipping", user.Id);
                    // Continue processing other users
                }
            }

            _logger.LogInformation("Successfully processed {ProcessedCount} out of {TotalCount} total users", 
                userDtos.Count, users.Count);

            return userDtos;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all users including inactive");
            return new List<UserDto>();
        }
    }

    public async Task<List<UserDto>> GetAllUsersAsync()
    {
        // This method can be an alias to GetAllUsersIncludingInactiveAsync for consistency
        return await GetAllUsersIncludingInactiveAsync();
    }

    public async Task<User?> GetUserByEmailAsync(string email)
    {
        return await _context.Users
            .Include(u => u.Permissions)
            .FirstOrDefaultAsync(u => u.Email == email);
    }

    public async Task<User?> GetUserByIdAsync(Guid userId)
    {
        return await _context.Users
            .Include(u => u.Permissions)
            .FirstOrDefaultAsync(u => u.Id == userId);
    }

    public string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    public bool VerifyPassword(string password, string hash)
    {
        return BCrypt.Net.BCrypt.Verify(password, hash);
    }

    private UserDto MapToUserDto(User user)
    {
        return new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt,
            Permissions = user.Permissions.Select(p => new UserPermissionDto
            {
                TabId = p.TabId,
                TabName = p.TabName,
                HasAccess = p.HasAccess
            }).ToList()
        };
    }

    private string GenerateOTP()
    {
        var random = new Random();
        return random.Next(100000, 999999).ToString();
    }

    private string EncryptString(string plainText)
    {
        return _encryptionService.EncryptString(plainText);
    }

    private string DecryptString(string cipherText)
    {
        return _encryptionService.DecryptString(cipherText);
    }

    public async Task<AuthResponse> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        try
        {
            var user = await GetUserByEmailAsync(request.Email);
            
            if (user == null || !user.IsActive)
            {
                // Don't reveal if user exists or not for security
                return new AuthResponse 
                { 
                    Success = true, 
                    Message = "If an account with this email exists, a verification code has been sent." 
                };
            }

            // Generate 6-digit OTP
            var otp = GenerateOTP();
            var otpRequest = new OTPRequest
            {
                UserId = user.Id,
                OTPCode = otp,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15), // 15-minute expiry for password reset
                CreatedAt = DateTime.UtcNow
            };

            _context.OTPRequests.Add(otpRequest);
            await _context.SaveChangesAsync();

            // Send OTP via email
            try
            {
                var emailSent = await _emailService.SendOTPEmailAsync(request.Email, otp, "Password Reset Verification");
                
                if (emailSent)
                {
                    _logger.LogInformation("✅ Password reset OTP sent successfully to {Email}", request.Email);
                }
                else
                {
                    _logger.LogWarning("⚠️ Failed to send password reset OTP email to {Email}", request.Email);
                }
            }
            catch (Exception emailEx)
            {
                _logger.LogError(emailEx, "❌ Error sending password reset OTP email to {Email}", request.Email);
            }

            // Always log OTP for development/debugging
            _logger.LogInformation("🔢 Password reset OTP for {Email}: {OTP} (expires at {ExpiresAt})", request.Email, otp, otpRequest.ExpiresAt);

            return new AuthResponse
            {
                Success = true,
                Message = "If an account with this email exists, a verification code has been sent."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing forgot password request for {Email}", request.Email);
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Failed to process password reset request" 
            };
        }
    }

    public async Task<AuthResponse> ResetPasswordWithOTPAsync(ResetPasswordWithOTPRequest request)
    {
        try
        {
            var user = await GetUserByEmailAsync(request.Email);
            
            if (user == null || !user.IsActive)
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "Invalid request" 
                };
            }

            // Verify OTP
            var otpRequest = await _context.OTPRequests
                .Where(o => o.UserId == user.Id && o.OTPCode == request.OtpCode && !o.IsUsed && o.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();

            if (otpRequest == null)
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = "Invalid or expired verification code"
                };
            }

            // Mark OTP as used
            otpRequest.IsUsed = true;
            otpRequest.UsedAt = DateTime.UtcNow;

            // Update user password
            user.PasswordHash = HashPassword(request.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();

            _logger.LogInformation("✅ Password reset successfully for user {Email} using OTP", user.Email);

            return new AuthResponse
            {
                Success = true,
                Message = "Password reset successfully. You can now log in with your new password."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting password with OTP for email {Email}", request.Email);
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Failed to reset password" 
            };
        }
    }

    public async Task<AuthResponse> RequestChangePasswordOTPAsync(RequestChangePasswordOTPRequest request, Guid userId)
    {
        try
        {
            var user = await GetUserByIdAsync(userId);
            
            if (user == null || !user.IsActive)
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "User not found or inactive" 
                };
            }

            // Verify current password
            if (string.IsNullOrEmpty(user.PasswordHash) || !VerifyPassword(request.CurrentPassword, user.PasswordHash))
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "Current password is incorrect" 
                };
            }

            // Generate 6-digit OTP
            var otp = GenerateOTP();
            var otpRequest = new OTPRequest
            {
                UserId = user.Id,
                OTPCode = otp,
                ExpiresAt = DateTime.UtcNow.AddMinutes(10), // 10-minute expiry for change password
                CreatedAt = DateTime.UtcNow
            };

            _context.OTPRequests.Add(otpRequest);
            await _context.SaveChangesAsync();

            // Send OTP via email
            try
            {
                var emailSent = await _emailService.SendOTPEmailAsync(user.Email, otp, "Password Change Verification");
                
                if (emailSent)
                {
                    _logger.LogInformation("✅ Change password OTP sent successfully to {Email}", user.Email);
                }
                else
                {
                    _logger.LogWarning("⚠️ Failed to send change password OTP email to {Email}, but OTP is logged for development", user.Email);
                }
            }
            catch (Exception emailEx)
            {
                _logger.LogError(emailEx, "❌ Error sending change password OTP email to {Email}", user.Email);
            }

            // Always log OTP for development/debugging
            _logger.LogInformation("🔢 Change password OTP for {Email}: {OTP} (expires at {ExpiresAt})", user.Email, otp, otpRequest.ExpiresAt);

            return new AuthResponse
            {
                Success = true,
                Message = $"Verification code sent to {user.Email}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error requesting change password OTP for user {UserId}", userId);
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Failed to send verification code" 
            };
        }
    }

    public async Task<AuthResponse> ResetPasswordAsync(ResetPasswordRequest request)
    {
        try
        {
            var resetToken = await _context.PasswordResetTokens
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.Token == request.Token && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow);
            
            if (resetToken == null)
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "Invalid or expired reset token" 
                };
            }

            // Update user password
            resetToken.User.PasswordHash = HashPassword(request.NewPassword);
            resetToken.User.UpdatedAt = DateTime.UtcNow;
            
            // Mark token as used
            resetToken.IsUsed = true;
            resetToken.UsedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();

            _logger.LogInformation("✅ Password reset successfully for user {Email}", resetToken.User.Email);

            return new AuthResponse
            {
                Success = true,
                Message = "Password reset successfully. You can now log in with your new password."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting password");
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Failed to reset password" 
            };
        }
    }

    public async Task<AuthResponse> ChangePasswordAsync(ChangePasswordRequest request, Guid userId)
    {
        try
        {
            var user = await GetUserByIdAsync(userId);
            
            if (user == null || !user.IsActive)
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "User not found" 
                };
            }

            // Verify current password
            if (string.IsNullOrEmpty(user.PasswordHash) || !VerifyPassword(request.CurrentPassword, user.PasswordHash))
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "Current password is incorrect" 
                };
            }

            // Verify OTP
            var otpRequest = await _context.OTPRequests
                .Where(o => o.UserId == userId && o.OTPCode == request.OtpCode && !o.IsUsed && o.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();

            if (otpRequest == null)
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = "Invalid or expired OTP code"
                };
            }

            // Mark OTP as used
            otpRequest.IsUsed = true;
            otpRequest.UsedAt = DateTime.UtcNow;

            // Update password
            user.PasswordHash = HashPassword(request.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();

            _logger.LogInformation("✅ Password changed successfully for user {Email}", user.Email);

            return new AuthResponse
            {
                Success = true,
                Message = "Password changed successfully"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing password for user {UserId}", userId);
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Failed to change password" 
            };
        }
    }

    public async Task<AuthResponse> GetProfileAsync(Guid userId)
    {
        try
        {
            var user = await GetUserByIdAsync(userId);
            
            if (user == null)
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "User not found" 
                };
            }

            var userDto = MapToUserDto(user);

            return new AuthResponse
            {
                Success = true,
                Message = "Profile retrieved successfully",
                User = userDto
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting profile for user {UserId}", userId);
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Failed to retrieve profile" 
            };
        }
    }

    public async Task<AuthResponse> UpdateProfileAsync(UpdateProfileRequest request, Guid userId)
    {
        try
        {
            var user = await GetUserByIdAsync(userId);
            
            if (user == null)
            {
                return new AuthResponse 
                { 
                    Success = false, 
                    Message = "User not found" 
                };
            }

            // Check if email is already in use by another user
            if (request.Email != user.Email)
            {
                var existingUser = await GetUserByEmailAsync(request.Email);
                if (existingUser != null && existingUser.Id != userId)
                {
                    return new AuthResponse 
                    { 
                        Success = false, 
                        Message = "Email is already in use by another user" 
                    };
                }
            }

            // Update profile information
            user.Name = request.Name;
            user.Email = request.Email;
            user.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();

            _logger.LogInformation("✅ Profile updated successfully for user {Email}", user.Email);

            var userDto = MapToUserDto(user);

            return new AuthResponse
            {
                Success = true,
                Message = "Profile updated successfully",
                User = userDto
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating profile for user {UserId}", userId);
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Failed to update profile" 
            };
        }
    }

    public async Task<AuthResponse> LogoutAsync(Guid userId)
    {
        try
        {
            var user = await GetUserByIdAsync(userId);
            
            if (user == null)
            {
                // For test tokens or development, allow logout even if user doesn't exist in DB
                _logger.LogWarning("User {UserId} not found in database, but allowing logout for test/development purposes", userId);
                
                return new AuthResponse
                {
                    Success = true,
                    Message = "Logout successful (test user)"
                };
            }

            // Update last logout time (optional - for audit purposes)
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("✅ User {Email} logged out successfully", user.Email);

            return new AuthResponse
            {
                Success = true,
                Message = "Logout successful"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during logout for user {UserId}", userId);
            return new AuthResponse 
            { 
                Success = false, 
                Message = "Logout failed" 
            };
        }
    }
} 