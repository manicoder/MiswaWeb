using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Mlt.Admin.Api.Models.DTOs;
using Mlt.Admin.Api.Services;

namespace Mlt.Admin.Api.Controllers;

public record OtpRequest(string Email);

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> AdminLogin([FromBody] AdminLoginRequest request)
    {
        try
        {
            var result = await _authService.AdminLoginAsync(request);

            if (result.Success)
            {
                return Ok(result);
            }

            return Unauthorized(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in admin login");
            return StatusCode(500, new AuthResponse
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    [HttpPost("user/login")]
    public async Task<ActionResult<AuthResponse>> UserLogin([FromBody] UserLoginRequest request)
    {
        try
        {
            var result = await _authService.UserLoginAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during user login");
            return StatusCode(500, new AuthResponse
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    [HttpPost("user/request-otp")]
    public async Task<ActionResult<AuthResponse>> RequestOTP([FromBody] UserLoginRequest request)
    {
        try
        {
            var result = await _authService.RequestOTPAsync(request);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error requesting OTP");
            return StatusCode(500, new AuthResponse
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    [HttpPost("user/verify-otp")]
    public async Task<ActionResult<AuthResponse>> VerifyOTP([FromBody] OTPVerificationRequest request)
    {
        try
        {
            var result = await _authService.VerifyOTPAsync(request);

            if (result.Success)
            {
                return Ok(result);
            }

            return Unauthorized(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying OTP");
            return StatusCode(500, new AuthResponse
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    [HttpPost("request-change-password-otp")]
    [Authorize]
    public async Task<ActionResult<AuthResponse>> RequestChangePasswordOTP([FromBody] RequestChangePasswordOTPRequest request)
    {
        try
        {
            var userId = GetUserIdFromToken();

            if (userId == null)
            {
                return Unauthorized(new AuthResponse
                {
                    Success = false,
                    Message = "Invalid authentication token"
                });
            }

            var result = await _authService.RequestChangePasswordOTPAsync(request, userId.Value);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error requesting change password OTP");
            return StatusCode(500, new AuthResponse
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    [HttpGet("users")]
    public async Task<ActionResult<List<UserDto>>> GetUsers()
    {
        try
        {
            // TODO: Add proper JWT admin authorization check
            // For now, just log the request for monitoring
            _logger.LogInformation("Users list requested");

            var users = await _authService.GetUsersAsync();

            // Validate response data before sending
            if (users == null)
            {
                _logger.LogWarning("GetUsersAsync returned null");
                return Ok(new List<UserDto>());
            }

            _logger.LogInformation("Successfully retrieved {UserCount} users", users.Count);
            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting users: {ErrorMessage}", ex.Message);
            return StatusCode(500, new
            {
                error = "Failed to retrieve users",
                message = "Database connection or query error",
                timestamp = DateTime.UtcNow
            });
        }
    }

    [HttpPost("users")]
    [Authorize]
    public async Task<ActionResult<AuthResponse>> CreateUser([FromBody] CreateUserRequest request)
    {
        try
        {
            var adminEmail = GetAdminEmailFromToken();

            var result = await _authService.CreateUserAsync(request, adminEmail);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user");
            return StatusCode(500, new AuthResponse
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    [HttpPut("users/permissions")]
    public async Task<ActionResult<AuthResponse>> UpdateUserPermissions([FromBody] UpdateUserPermissionsRequest request)
    {
        try
        {
            var adminEmail = GetAdminEmailFromToken();

            var result = await _authService.UpdateUserPermissionsAsync(request, adminEmail);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user permissions");
            return StatusCode(500, new AuthResponse
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    [HttpDelete("users/{userId}")]
    public async Task<ActionResult> DeactivateUser(Guid userId)
    {
        try
        {
            var adminEmail = GetAdminEmailFromToken();
            var success = await _authService.DeactivateUserAsync(userId, adminEmail);

            if (success)
            {
                return Ok(new { success = true, message = "User deactivated successfully" });
            }

            return BadRequest(new { success = false, message = "Failed to deactivate user" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating user {UserId}", userId);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    [HttpPut("users/{userId}/activate")]
    public async Task<ActionResult> ActivateUser(Guid userId)
    {
        try
        {
            var adminEmail = GetAdminEmailFromToken();
            var success = await _authService.ActivateUserAsync(userId, adminEmail);

            if (success)
            {
                return Ok(new { success = true, message = "User activated successfully" });
            }

            return BadRequest(new { success = false, message = "Failed to activate user" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating user {UserId}", userId);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    [HttpPut("users/{userId}/role")]
    public async Task<ActionResult> ChangeUserRole(Guid userId, [FromBody] ChangeUserRoleRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var adminEmail = GetAdminEmailFromToken();
            var success = await _authService.ChangeUserRoleAsync(userId, request.NewRole, adminEmail);

            if (success)
            {
                return Ok(new { success = true, message = "User role changed successfully" });
            }

            return BadRequest(new { success = false, message = "Failed to change user role" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing role for user {UserId}", userId);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    [HttpDelete("users/{userId}/remove")]
    public async Task<ActionResult> RemoveUser(Guid userId)
    {
        try
        {
            var adminEmail = GetAdminEmailFromToken();
            var success = await _authService.RemoveUserAsync(userId, adminEmail);

            if (success)
            {
                return Ok(new { success = true, message = "User removed successfully" });
            }

            return BadRequest(new { success = false, message = "Failed to remove user" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing user {UserId}", userId);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    [HttpGet("available-tabs")]
    public ActionResult GetAvailableTabs()
    {
        try
        {
            var tabs = new[]
            {
                new { id = "dashboard", name = "Dashboard", category = "dashboard", isCore = true },
                new { id = "orders", name = "Orders", category = "orders", isCore = true },
                new { id = "products", name = "Products", category = "products", isCore = false },
                new { id = "inventory", name = "Inventory", category = "inventory", isCore = false },
                new { id = "customers", name = "Customers", category = "customers", isCore = false },
                new { id = "analytics", name = "Analytics", category = "analytics", isCore = false },
                new { id = "pdf-tools", name = "PDF Tools", category = "tools", isCore = false },
                new { id = "image-tools", name = "Image Tools", category = "tools", isCore = false },
                new { id = "barcode-tools", name = "Barcode Tools", category = "tools", isCore = false },
                new { id = "user-management", name = "User Management", category = "settings", isCore = false },
                new { id = "settings", name = "Settings", category = "settings", isCore = false }
            };

            return Ok(tabs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available tabs");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("health")]
    public async Task<ActionResult> GetHealthStatus()
    {
        try
        {
            _logger.LogInformation("Health check requested");

            // Basic database connectivity check
            var userCount = await _authService.GetUsersAsync();

            return Ok(new
            {
                Status = "Healthy",
                Database = "Connected",
                UserCount = userCount.Count,
                LastChecked = DateTime.UtcNow,
                Message = "All systems operational"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Health check failed: {ErrorMessage}", ex.Message);
            return StatusCode(500, new
            {
                Status = "Unhealthy",
                Database = "Error",
                UserCount = 0,
                LastChecked = DateTime.UtcNow,
                Message = $"Database error: {ex.Message}"
            });
        }
    }

    [HttpGet("users/all")]
    public async Task<ActionResult> GetAllUsers()
    {
        try
        {
            _logger.LogInformation("All users (including inactive) requested");

            // Get all users regardless of active status for debugging
            var allUsers = await _authService.GetAllUsersIncludingInactiveAsync();

            return Ok(new
            {
                Success = true,
                Users = allUsers,
                TotalCount = allUsers.Count,
                ActiveCount = allUsers.Count(u => u.IsActive),
                InactiveCount = allUsers.Count(u => !u.IsActive)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all users: {ErrorMessage}", ex.Message);
            return StatusCode(500, new
            {
                Success = false,
                Message = "Failed to retrieve all users"
            });
        }
    }

    [HttpPost("forgot-password")]
    public async Task<ActionResult<AuthResponse>> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        try
        {
            var result = await _authService.ForgotPasswordAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing forgot password request");
            return StatusCode(500, new AuthResponse
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult<AuthResponse>> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        try
        {
            var result = await _authService.ResetPasswordAsync(request);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting password");
            return StatusCode(500, new AuthResponse
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    [HttpPost("reset-password-with-otp")]
    public async Task<ActionResult<AuthResponse>> ResetPasswordWithOTP([FromBody] ResetPasswordWithOTPRequest request)
    {
        try
        {
            var result = await _authService.ResetPasswordWithOTPAsync(request);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting password with OTP");
            return StatusCode(500, new AuthResponse
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<ActionResult<AuthResponse>> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        try
        {
            var userId = GetUserIdFromToken();

            if (userId == null)
            {
                return Unauthorized(new AuthResponse
                {
                    Success = false,
                    Message = "Invalid authentication token"
                });
            }

            var result = await _authService.ChangePasswordAsync(request, userId.Value);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing password");
            return StatusCode(500, new AuthResponse
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    [HttpGet("profile")]
    [Authorize]
    public async Task<ActionResult<AuthResponse>> GetProfile()
    {
        try
        {
            var userId = GetUserIdFromToken();

            if (userId == null)
            {
                return Unauthorized(new AuthResponse
                {
                    Success = false,
                    Message = "Invalid authentication token"
                });
            }

            var result = await _authService.GetProfileAsync(userId.Value);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting profile");
            return StatusCode(500, new AuthResponse
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<ActionResult<AuthResponse>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        try
        {
            var userId = GetUserIdFromToken();

            if (userId == null)
            {
                return Unauthorized(new AuthResponse
                {
                    Success = false,
                    Message = "Invalid authentication token"
                });
            }

            var result = await _authService.UpdateProfileAsync(request, userId.Value);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating profile");
            return StatusCode(500, new AuthResponse
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<ActionResult<AuthResponse>> Logout()
    {
        try
        {
            var userId = GetUserIdFromToken();

            if (userId == null)
            {
                return Unauthorized(new AuthResponse
                {
                    Success = false,
                    Message = "Invalid authentication token"
                });
            }

            var result = await _authService.LogoutAsync(userId.Value);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during logout");
            return StatusCode(500, new AuthResponse
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    [HttpPost("send-otp")]
    public async Task<ActionResult> SendOTP([FromBody] OtpRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request?.Email))
            {
                return BadRequest(new { error = "Email required" });
            }

            var otp = new Random().Next(100000, 999999).ToString();
            
            // Store OTP in database or cache (you might want to implement this)
            // For now, we'll just send the email
            
            var emailService = HttpContext.RequestServices.GetRequiredService<IEmailService>();
            var success = await emailService.SendOTPEmailAsync(request.Email, otp);

            if (success)
            {
                _logger.LogInformation($"OTP sent successfully to {request.Email}");
                return Ok(new { success = true, message = "OTP sent successfully" });
            }
            else
            {
                _logger.LogError($"Failed to send OTP to {request.Email}");
                return StatusCode(500, new { error = "Failed to send OTP" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending OTP");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    [HttpGet("test-smtp")]
    public async Task<ActionResult> TestSMTPConnection()
    {
        try
        {
            var emailService = HttpContext.RequestServices.GetRequiredService<IEmailService>();
            var success = await emailService.TestConnectionAsync();

            if (success)
            {
                return Ok(new { 
                    success = true, 
                    message = "SMTP connection test successful",
                    timestamp = DateTime.UtcNow
                });
            }
            else
            {
                return StatusCode(500, new { 
                    success = false, 
                    message = "SMTP connection test failed. Check credentials and domain verification.",
                    timestamp = DateTime.UtcNow
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing SMTP connection");
            return StatusCode(500, new { 
                success = false, 
                message = $"SMTP test failed: {ex.Message}",
                timestamp = DateTime.UtcNow
            });
        }
    }

    [HttpGet("smtp-config")]
    public ActionResult GetSMTPConfig()
    {
        try
        {
            var configuration = HttpContext.RequestServices.GetRequiredService<IConfiguration>();
            
            var smtpUsername = configuration.GetValue<string>("MailerSend:SmtpUsername");
            var fromEmail = configuration.GetValue<string>("MailerSend:FromEmail");
            var fromName = configuration.GetValue<string>("MailerSend:FromName");
            var smtpHost = "smtp.mailersend.net";
            var smtpPort = 587;
            
            // Don't expose the password in the response
            var hasPassword = !string.IsNullOrEmpty(configuration.GetValue<string>("MailerSend:SmtpPassword"));

            return Ok(new { 
                success = true,
                smtpHost,
                smtpPort,
                smtpUsername,
                fromEmail,
                fromName,
                hasPassword,
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting SMTP config");
            return StatusCode(500, new { 
                success = false, 
                message = $"Failed to get SMTP config: {ex.Message}",
                timestamp = DateTime.UtcNow
            });
        }
    }

    private string GetAdminEmailFromToken()
    {
        // Extract email from JWT token
        var emailClaim = User.FindFirst("email") ?? User.FindFirst("Email");
        if (emailClaim != null)
        {
            return emailClaim.Value;
        }

        // Fallback to default admin email if no claim found
        return "admin@mylittletales.com";
    }

    private Guid? GetUserIdFromToken()
    {
        try
        {
            // Extract user ID from JWT claims - try multiple claim names
            var userIdClaim = User.FindFirst("UserId") ?? 
                             User.FindFirst("sub") ?? 
                             User.FindFirst("user_id") ?? 
                             User.FindFirst("nameid");
            
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return userId;
            }

            // If no user ID claim found, try to get user by email
            var emailClaim = User.FindFirst("email") ?? User.FindFirst("Email");
            if (emailClaim != null)
            {
                _logger.LogWarning("User ID not found in token for email: {Email}", emailClaim.Value);
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting user ID from token");
            return null;
        }
    }
}