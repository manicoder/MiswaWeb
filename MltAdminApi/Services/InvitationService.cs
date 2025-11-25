using Microsoft.EntityFrameworkCore;
using Mlt.Admin.Api.Data;
using Mlt.Admin.Api.Models;
using Mlt.Admin.Api.Models.DTOs;
using Mlt.Admin.Api.Services;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BCrypt.Net;

namespace Mlt.Admin.Api.Services
{
    public class InvitationService : IInvitationService
    {
        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<InvitationService> _logger;
        private readonly IConfiguration _configuration;

        public InvitationService(
            ApplicationDbContext context,
            IEmailService emailService,
            ILogger<InvitationService> logger,
            IConfiguration configuration)
        {
            _context = context;
            _emailService = emailService;
            _logger = logger;
            _configuration = configuration;
        }

        public async Task<SendInvitationResponse> SendInvitationAsync(SendInvitationRequest request, string inviterName)
        {
            try
            {
                _logger.LogInformation($"🔄 Processing invitation for {request.Email}");

                // Check if user already exists
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

                if (existingUser != null)
                {
                    // If user exists but is inactive, we can reactivate them through invitation
                    if (!existingUser.IsActive)
                    {
                        _logger.LogInformation($"👤 Found inactive user {request.Email}, will reactivate through invitation");
                        
                        // Check if there's already a pending invitation for reactivation
                        var existingInvitation = await _context.Invitations
                            .FirstOrDefaultAsync(i => i.Email.ToLower() == request.Email.ToLower() && 
                                                     i.Status == "Pending" && 
                                                     i.ExpiresAt > DateTime.UtcNow);

                        if (existingInvitation != null)
                        {
                            return new SendInvitationResponse
                            {
                                Success = false,
                                Message = "There is already a pending invitation for this email address. The user can use it to reactivate their account."
                            };
                        }
                        
                        // Allow invitation for inactive user - this will reactivate them
                        _logger.LogInformation($"📧 Sending reactivation invitation to inactive user {request.Email}");
                    }
                    else
                    {
                        // User exists and is active
                        return new SendInvitationResponse
                        {
                            Success = false,
                            Message = "A user with this email already exists and is active in the system. Please use a different email address."
                        };
                    }
                }
                else
                {
                    // No existing user - check for pending invitations only
                    var existingInvitation = await _context.Invitations
                        .FirstOrDefaultAsync(i => i.Email.ToLower() == request.Email.ToLower() && 
                                                 i.Status == "Pending" && 
                                                 i.ExpiresAt > DateTime.UtcNow);

                    if (existingInvitation != null)
                    {
                        return new SendInvitationResponse
                        {
                            Success = false,
                            Message = "There is already a pending invitation for this email address."
                        };
                    }
                }

                // Generate secure token
                var token = GenerateInvitationToken();
                var expiresAt = DateTime.UtcNow.AddDays(7); // 7 days expiry

                // Create invitation record
                var invitation = new Invitation
                {
                    Email = request.Email.ToLower(),
                    Name = request.Name,
                    Role = request.Role,
                    Token = token,
                    ExpiresAt = expiresAt,
                    InvitedBy = inviterName ?? "System",
                    Status = "Pending",
                    Permissions = request.Permissions != null ? 
                        JsonSerializer.Serialize(request.Permissions) : null
                };

                _context.Invitations.Add(invitation);
                await _context.SaveChangesAsync();

                // Prepare email data
                var frontendUrl = _configuration.GetValue<string>("Frontend:BaseUrl") ?? "http://localhost:5173";
                var invitationLink = $"{frontendUrl}/auth/accept-invitation?token={token}";

                var emailData = new EmailTemplateData
                {
                    UserName = request.Name,
                    UserEmail = request.Email,
                    InviterName = inviterName ?? "MLT Admin Team",
                    InvitationLink = invitationLink,
                    ExpiryDate = expiresAt.ToString("MMMM dd, yyyy 'at' hh:mm tt"),
                    CompanyName = "MLT Admin"
                };

                // Send invitation email
                var emailSent = await _emailService.SendInvitationEmailAsync(
                    request.Email,
                    invitationLink,
                    inviterName ?? "MLT Admin Team",
                    "MLT Admin"
                );

                if (!emailSent)
                {
                    _logger.LogWarning($"⚠️ Invitation created but email failed to send to {request.Email}");
                }

                _logger.LogInformation($"✅ Invitation sent successfully to {request.Email}");

                return new SendInvitationResponse
                {
                    Success = true,
                    Message = $"Invitation sent successfully to {request.Email}",
                    InvitationToken = token,
                    ExpiresAt = expiresAt,
                    Invitation = MapToInvitationDto(invitation)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error sending invitation to {request.Email}");
                return new SendInvitationResponse
                {
                    Success = false,
                    Message = "An error occurred while sending the invitation. Please try again."
                };
            }
        }

        public async Task<ValidateInvitationResponse> ValidateInvitationAsync(string token)
        {
            try
            {
                var invitation = await _context.Invitations
                    .FirstOrDefaultAsync(i => i.Token == token);

                if (invitation == null)
                {
                    return new ValidateInvitationResponse
                    {
                        Success = false,
                        Valid = false,
                        Message = "Invalid invitation token."
                    };
                }

                if (invitation.Status != "Pending")
                {
                    return new ValidateInvitationResponse
                    {
                        Success = false,
                        Valid = false,
                        Message = invitation.Status == "Accepted" ? 
                            "This invitation has already been accepted." :
                            "This invitation is no longer valid."
                    };
                }

                if (invitation.IsExpired)
                {
                    // Update status to expired
                    invitation.Status = "Expired";
                    await _context.SaveChangesAsync();

                    return new ValidateInvitationResponse
                    {
                        Success = false,
                        Valid = false,
                        Message = "This invitation has expired. Please request a new invitation."
                    };
                }

                return new ValidateInvitationResponse
                {
                    Success = true,
                    Valid = true,
                    Message = "Invitation is valid.",
                    Invitation = new InvitationDetailsDTO
                    {
                        Email = invitation.Email,
                        Name = invitation.Name,
                        Role = invitation.Role,
                        ExpiresAt = invitation.ExpiresAt,
                        InviterName = invitation.InvitedBy,
                        IsExpired = invitation.IsExpired
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error validating invitation token: {token}");
                return new ValidateInvitationResponse
                {
                    Success = false,
                    Valid = false,
                    Message = "An error occurred while validating the invitation."
                };
            }
        }

        public async Task<AcceptInvitationResponse> AcceptInvitationAsync(AcceptInvitationRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                // Validate the invitation first
                var validationResult = await ValidateInvitationAsync(request.Token);
                if (!validationResult.Valid)
                {
                    return new AcceptInvitationResponse
                    {
                        Success = false,
                        Message = validationResult.Message
                    };
                }

                var invitation = await _context.Invitations
                    .FirstOrDefaultAsync(i => i.Token == request.Token);

                if (invitation == null)
                {
                    return new AcceptInvitationResponse
                    {
                        Success = false,
                        Message = "Invitation not found."
                    };
                }

                // Check if this is a reactivation invitation for an existing inactive user
                var existingUser = await _context.Users
                    .Include(u => u.Permissions)
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == invitation.Email.ToLower());

                if (existingUser != null && !existingUser.IsActive)
                {
                    // Reactivate existing user
                    _logger.LogInformation($"🔄 Reactivating existing user {invitation.Email}");
                    
                    var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);
                    
                    existingUser.Name = invitation.Name; // Update name in case it changed
                    existingUser.Role = Enum.Parse<UserRole>(invitation.Role, ignoreCase: true);
                    existingUser.PasswordHash = hashedPassword;
                    existingUser.IsActive = true;
                    existingUser.UpdatedAt = DateTime.UtcNow;

                    // Clear existing permissions and add new ones
                    _context.UserPermissions.RemoveRange(existingUser.Permissions);
                    await _context.SaveChangesAsync();

                    // Add new permissions if provided
                    if (!string.IsNullOrEmpty(invitation.Permissions))
                    {
                        var permissions = JsonSerializer.Deserialize<List<UserPermissionDto>>(invitation.Permissions);
                        if (permissions != null)
                        {
                            foreach (var perm in permissions.Where(p => p.HasAccess))
                            {
                                var userPermission = new UserPermission
                                {
                                    UserId = existingUser.Id,
                                    TabId = perm.TabId,
                                    TabName = perm.TabName,
                                    HasAccess = true,
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };
                                _context.UserPermissions.Add(userPermission);
                            }
                        }
                    }

                    // Update invitation status
                    invitation.Status = "Accepted";
                    invitation.AcceptedUserId = existingUser.Id;
                    await _context.SaveChangesAsync();

                    await transaction.CommitAsync();

                    _logger.LogInformation($"✅ User account reactivated successfully for {invitation.Email}");

                    return new AcceptInvitationResponse
                    {
                        Success = true,
                        Message = "Your account has been reactivated successfully! You can now log in with your new credentials.",
                        User = new UserDto
                        {
                            Id = existingUser.Id,
                            Email = existingUser.Email,
                            Name = existingUser.Name,
                            Role = existingUser.Role.ToString(),
                            IsActive = existingUser.IsActive
                        }
                    };
                }
                else if (existingUser != null && existingUser.IsActive)
                {
                    // User already exists and is active
                    return new AcceptInvitationResponse
                    {
                        Success = false,
                        Message = "A user with this email already exists and is active. Please contact an administrator."
                    };
                }
                else
                {
                    // Create new user account
                    _logger.LogInformation($"👤 Creating new user account for {invitation.Email}");
                    
                    var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);

                    var newUser = new User
                    {
                        Email = invitation.Email,
                        Name = invitation.Name,
                        Role = Enum.Parse<UserRole>(invitation.Role, ignoreCase: true),
                        PasswordHash = hashedPassword,
                        IsActive = true,
                        CreatedBy = invitation.InvitedBy,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.Users.Add(newUser);
                    await _context.SaveChangesAsync();

                    // Add permissions if provided
                    if (!string.IsNullOrEmpty(invitation.Permissions))
                    {
                        var permissions = JsonSerializer.Deserialize<List<UserPermissionDto>>(invitation.Permissions);
                        if (permissions != null)
                        {
                            foreach (var perm in permissions.Where(p => p.HasAccess))
                            {
                                var userPermission = new UserPermission
                                {
                                    UserId = newUser.Id,
                                    TabId = perm.TabId,
                                    TabName = perm.TabName,
                                    HasAccess = true,
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };
                                _context.UserPermissions.Add(userPermission);
                            }
                            await _context.SaveChangesAsync();
                        }
                    }

                    // Update invitation status
                    invitation.Status = "Accepted";
                    invitation.AcceptedUserId = newUser.Id;
                    await _context.SaveChangesAsync();

                    await transaction.CommitAsync();

                    _logger.LogInformation($"✅ User account created successfully for {invitation.Email}");

                    return new AcceptInvitationResponse
                    {
                        Success = true,
                        Message = "Account created successfully! You can now log in with your credentials.",
                        User = new UserDto
                        {
                            Id = newUser.Id,
                            Email = newUser.Email,
                            Name = newUser.Name,
                            Role = newUser.Role.ToString(),
                            IsActive = newUser.IsActive
                        }
                    };
                }
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, $"Error accepting invitation: {request.Token}");
                return new AcceptInvitationResponse
                {
                    Success = false,
                    Message = "An error occurred while creating your account. Please try again."
                };
            }
        }

        public async Task<SendInvitationResponse> ResendInvitationAsync(string email, string inviterName)
        {
            try
            {
                var invitation = await _context.Invitations
                    .FirstOrDefaultAsync(i => i.Email.ToLower() == email.ToLower() && 
                                             i.Status == "Pending");

                if (invitation == null)
                {
                    return new SendInvitationResponse
                    {
                        Success = false,
                        Message = "No pending invitation found for this email address."
                    };
                }

                // Generate new token and extend expiry
                var newToken = GenerateInvitationToken();
                var newExpiresAt = DateTime.UtcNow.AddDays(7);

                invitation.Token = newToken;
                invitation.ExpiresAt = newExpiresAt;
                invitation.InvitedBy = inviterName ?? invitation.InvitedBy;
                invitation.Status = "Pending"; // Reset to pending if it was expired

                await _context.SaveChangesAsync();

                // Send email with new token
                var frontendUrl = _configuration.GetValue<string>("Frontend:BaseUrl") ?? "http://localhost:5173";
                var invitationLink = $"{frontendUrl}/auth/accept-invitation?token={newToken}";

                await _emailService.SendInvitationEmailAsync(
                    invitation.Email,
                    invitationLink,
                    inviterName ?? "MLT Admin Team",
                    "MLT Admin"
                );

                _logger.LogInformation($"✅ Invitation resent successfully to {email}");

                return new SendInvitationResponse
                {
                    Success = true,
                    Message = $"Invitation resent successfully to {email}",
                    InvitationToken = newToken,
                    ExpiresAt = newExpiresAt,
                    Invitation = MapToInvitationDto(invitation)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error resending invitation to {email}");
                return new SendInvitationResponse
                {
                    Success = false,
                    Message = "An error occurred while resending the invitation."
                };
            }
        }

        public async Task<bool> CancelInvitationAsync(int invitationId)
        {
            try
            {
                var invitation = await _context.Invitations.FindAsync(invitationId);
                
                if (invitation == null)
                {
                    return false;
                }

                if (invitation.Status == "Accepted")
                {
                    return false; // Cannot cancel accepted invitations
                }

                invitation.Status = "Cancelled";
                await _context.SaveChangesAsync();

                _logger.LogInformation($"✅ Invitation cancelled for {invitation.Email}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error cancelling invitation {invitationId}");
                return false;
            }
        }

        public async Task<InvitationListResponse> GetPendingInvitationsAsync()
        {
            try
            {
                var invitations = await _context.Invitations
                    .Where(i => i.Status == "Pending")
                    .OrderByDescending(i => i.InvitedAt)
                    .ToListAsync();

                var invitationDTOs = invitations.Select(MapToInvitationDto).ToList();

                return new InvitationListResponse
                {
                    Success = true,
                    Invitations = invitationDTOs,
                    TotalCount = invitations.Count,
                    PendingCount = invitations.Count(i => i.IsPending),
                    ExpiredCount = invitations.Count(i => i.IsExpired)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving pending invitations");
                return new InvitationListResponse
                {
                    Success = false,
                    Invitations = new List<InvitationDto>()
                };
            }
        }

        public async Task<InvitationListResponse> GetAllInvitationsAsync()
        {
            try
            {
                var invitations = await _context.Invitations
                    .OrderByDescending(i => i.InvitedAt)
                    .ToListAsync();

                var invitationDTOs = invitations.Select(MapToInvitationDto).ToList();

                return new InvitationListResponse
                {
                    Success = true,
                    Invitations = invitationDTOs,
                    TotalCount = invitations.Count,
                    PendingCount = invitations.Count(i => i.IsPending),
                    ExpiredCount = invitations.Count(i => i.IsExpired)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving all invitations");
                return new InvitationListResponse
                {
                    Success = false,
                    Invitations = new List<InvitationDto>()
                };
            }
        }

        public async Task<bool> CleanupExpiredInvitationsAsync()
        {
            try
            {
                var expiredInvitations = await _context.Invitations
                    .Where(i => i.Status == "Pending" && i.ExpiresAt < DateTime.UtcNow)
                    .ToListAsync();

                foreach (var invitation in expiredInvitations)
                {
                    invitation.Status = "Expired";
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation($"🧹 Cleaned up {expiredInvitations.Count} expired invitations");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cleaning up expired invitations");
                return false;
            }
        }

        // Helper methods
        private string GenerateInvitationToken()
        {
            using var rng = RandomNumberGenerator.Create();
            var bytes = new byte[32];
            rng.GetBytes(bytes);
            return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").Replace("=", "");
        }

        private InvitationDto MapToInvitationDto(Invitation invitation)
        {
            List<UserPermissionDto>? permissions = null;
            
            if (!string.IsNullOrEmpty(invitation.Permissions))
            {
                try
                {
                    permissions = JsonSerializer.Deserialize<List<UserPermissionDto>>(invitation.Permissions);
                }
                catch (JsonException ex)
                {
                    _logger.LogWarning($"Failed to deserialize permissions for invitation {invitation.Id}: {ex.Message}");
                }
            }

            return new InvitationDto
            {
                Id = invitation.Id,
                Email = invitation.Email,
                Name = invitation.Name,
                Role = invitation.Role,
                InvitedAt = invitation.InvitedAt,
                ExpiresAt = invitation.ExpiresAt,
                InvitedBy = invitation.InvitedBy,
                Status = invitation.Status,
                IsExpired = invitation.IsExpired,
                IsPending = invitation.IsPending,
                CanBeResent = invitation.CanBeResent,
                Permissions = permissions
            };
        }
    }
} 