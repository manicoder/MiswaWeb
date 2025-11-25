using Microsoft.EntityFrameworkCore;
using Mlt.Admin.Api.Data;
using Mlt.Admin.Api.Models;
using Mlt.Admin.Api.Models.DTOs;

namespace Mlt.Admin.Api.Services
{
    public class UserManagementService : IUserManagementService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<UserManagementService> _logger;

        public UserManagementService(
            ApplicationDbContext context,
            ILogger<UserManagementService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<UserListResponse> GetAllUsersAsync()
        {
            try
            {
                var users = await _context.Users
                    .Include(u => u.Permissions)
                    .OrderByDescending(u => u.CreatedAt)
                    .ToListAsync();

                var userDtos = users.Select(u => new UserDto
                {
                    Id = u.Id,
                    Name = u.Name,
                    Email = u.Email,
                    Role = u.Role.ToString(),
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt,
                    Permissions = u.Permissions?.Select(p => new UserPermissionDto
                    {
                        TabId = p.TabId,
                        TabName = p.TabName,
                        HasAccess = p.HasAccess
                    }).ToList() ?? new List<UserPermissionDto>()
                }).ToList();

                return new UserListResponse
                {
                    Success = true,
                    Users = userDtos,
                    TotalCount = users.Count,
                    ActiveCount = users.Count(u => u.IsActive),
                    InactiveCount = users.Count(u => !u.IsActive)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all users");
                return new UserListResponse
                {
                    Success = false,
                    Users = new List<UserDto>()
                };
            }
        }

        public async Task<UserResponse> GetUserByIdAsync(Guid userId)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.Permissions)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    return new UserResponse
                    {
                        Success = false,
                        Message = "User not found"
                    };
                }

                var userDto = new UserDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    Role = user.Role.ToString(),
                    IsActive = user.IsActive,
                    CreatedAt = user.CreatedAt,
                    Permissions = user.Permissions?.Select(p => new UserPermissionDto
                    {
                        TabId = p.TabId,
                        TabName = p.TabName,
                        HasAccess = p.HasAccess
                    }).ToList() ?? new List<UserPermissionDto>()
                };

                return new UserResponse
                {
                    Success = true,
                    User = userDto
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting user {userId}");
                return new UserResponse
                {
                    Success = false,
                    Message = "An error occurred while retrieving the user"
                };
            }
        }

        public async Task<UserResponse> UpdateUserAsync(Guid userId, UpdateUserRequest request)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return new UserResponse
                    {
                        Success = false,
                        Message = "User not found"
                    };
                }

                // Check if email is already taken by another user
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower() && u.Id != userId);

                if (existingUser != null)
                {
                    return new UserResponse
                    {
                        Success = false,
                        Message = "Email address is already in use by another user"
                    };
                }

                // Update user properties
                user.Name = request.Name;
                user.Email = request.Email;
                user.Role = Enum.Parse<UserRole>(request.Role);
                user.IsActive = request.IsActive;
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"User {userId} updated successfully");

                return new UserResponse
                {
                    Success = true,
                    Message = "User updated successfully",
                    User = new UserDto
                    {
                        Id = user.Id,
                        Name = user.Name,
                        Email = user.Email,
                        Role = user.Role.ToString(),
                        IsActive = user.IsActive,
                        CreatedAt = user.CreatedAt
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating user {userId}");
                return new UserResponse
                {
                    Success = false,
                    Message = "An error occurred while updating the user"
                };
            }
        }

        public async Task<bool> DeactivateUserAsync(Guid userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return false;
                }

                // Check if trying to deactivate an Admin user
                if (user.Role == UserRole.Admin)
                {
                    // Get the current user from HttpContext (this would be implemented elsewhere)
                    // For now, we'll just check if the user being deactivated is an Admin
                    _logger.LogWarning("Cannot deactivate Admin user {UserId}. Only SuperAdmin can deactivate Admin users", userId);
                    return false;
                }

                // Cannot deactivate SuperAdmin at all
                if (user.Role == UserRole.SuperAdmin)
                {
                    _logger.LogWarning("Cannot deactivate SuperAdmin user {UserId}", userId);
                    return false;
                }

                user.IsActive = false;
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"User {userId} deactivated successfully");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deactivating user {userId}");
                return false;
            }
        }

        public async Task<bool> ActivateUserAsync(Guid userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return false;
                }

                user.IsActive = true;
                user.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"User {userId} activated successfully");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error activating user {userId}");
                return false;
            }
        }

        public async Task<UserPermissionsResponse> GetUserPermissionsAsync(Guid userId)
        {
            try
            {
                var permissions = await _context.UserPermissions
                    .Where(p => p.UserId == userId)
                    .ToListAsync();

                var permissionDtos = permissions.Select(p => new UserPermissionDto
                {
                    TabId = p.TabId,
                    TabName = p.TabName,
                    HasAccess = p.HasAccess
                }).ToList();

                return new UserPermissionsResponse
                {
                    Success = true,
                    UserId = userId,
                    Permissions = permissionDtos
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting permissions for user {userId}");
                return new UserPermissionsResponse
                {
                    Success = false,
                    UserId = userId,
                    Permissions = new List<UserPermissionDto>()
                };
            }
        }

        public async Task<bool> UpdateUserPermissionsAsync(Guid userId, UpdateUserPermissionsRequest request)
        {
            try
            {
                // Remove existing permissions
                var existingPermissions = await _context.UserPermissions
                    .Where(p => p.UserId == userId)
                    .ToListAsync();

                _context.UserPermissions.RemoveRange(existingPermissions);

                // Add new permissions
                var newPermissions = request.Permissions.Select(p => new UserPermission
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    TabId = p.TabId,
                    TabName = p.TabName,
                    HasAccess = p.HasAccess,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

                await _context.UserPermissions.AddRangeAsync(newPermissions);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Permissions updated for user {userId}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating permissions for user {userId}");
                return false;
            }
        }

        public async Task<UserStatsResponse> GetUserStatsAsync()
        {
            try
            {
                var users = await _context.Users.ToListAsync();
                var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

                var stats = new UserStatsResponse
                {
                    Success = true,
                    TotalUsers = users.Count,
                    ActiveUsers = users.Count(u => u.IsActive),
                    InactiveUsers = users.Count(u => !u.IsActive),
                    AdminUsers = users.Count(u => u.Role == UserRole.Admin),
                    ManagerUsers = 0, // Manager role doesn't exist in enum
                    RegularUsers = users.Count(u => u.Role == UserRole.User),
                    RecentlyJoined = users.Count(u => u.CreatedAt >= thirtyDaysAgo)
                };

                // Role distribution
                stats.RoleDistribution = users
                    .GroupBy(u => u.Role)
                    .ToDictionary(g => g.Key.ToString(), g => g.Count());

                return stats;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user statistics");
                return new UserStatsResponse
                {
                    Success = false
                };
            }
        }

        public async Task<bool> RemoveUserAsync(Guid userId)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.Permissions)
                    .FirstOrDefaultAsync(u => u.Id == userId);
                
                if (user == null)
                {
                    return false;
                }

                // Cannot remove SuperAdmin
                if (user.Role == UserRole.SuperAdmin)
                {
                    _logger.LogWarning("Cannot remove SuperAdmin user {UserId}", userId);
                    return false;
                }

                // Remove user permissions first
                _context.UserPermissions.RemoveRange(user.Permissions);
                
                // Remove user
                _context.Users.Remove(user);
                
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("User {Email} (ID: {UserId}) removed successfully", user.Email, userId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing user {UserId}", userId);
                return false;
            }
        }
    }
} 