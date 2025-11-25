using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mlt.Admin.Api.Models.DTOs;
using Mlt.Admin.Api.Services;
using System.Security.Claims;

namespace Mlt.Admin.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserManagementController : ControllerBase
    {
        private readonly IUserManagementService _userManagementService;
        private readonly ILogger<UserManagementController> _logger;

        public UserManagementController(
            IUserManagementService userManagementService,
            ILogger<UserManagementController> logger)
        {
            _userManagementService = userManagementService;
            _logger = logger;
        }

        /// <summary>
        /// Get all users in the system
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<UserListResponse>> GetAllUsers()
        {
            try
            {
                var result = await _userManagementService.GetAllUsersAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all users");
                return StatusCode(500, new UserListResponse
                {
                    Success = false,
                    Users = new List<UserDto>()
                });
            }
        }

        /// <summary>
        /// Get user by ID
        /// </summary>
        [HttpGet("{userId}")]
        public async Task<ActionResult<UserResponse>> GetUser(Guid userId)
        {
            try
            {
                var result = await _userManagementService.GetUserByIdAsync(userId);
                
                if (result.Success)
                {
                    return Ok(result);
                }

                return NotFound(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting user {userId}");
                return StatusCode(500, new UserResponse
                {
                    Success = false,
                    Message = "An internal error occurred while retrieving the user."
                });
            }
        }

        /// <summary>
        /// Update user information
        /// </summary>
        [HttpPut("{userId}")]
        public async Task<ActionResult<UserResponse>> UpdateUser(Guid userId, [FromBody] UpdateUserRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _userManagementService.UpdateUserAsync(userId, request);

                if (result.Success)
                {
                    return Ok(result);
                }

                return BadRequest(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating user {userId}");
                return StatusCode(500, new UserResponse
                {
                    Success = false,
                    Message = "An internal error occurred while updating the user."
                });
            }
        }

        /// <summary>
        /// Deactivate a user
        /// </summary>
        [HttpPost("{userId}/deactivate")]
        public async Task<ActionResult> DeactivateUser(Guid userId)
        {
            try
            {
                // Check if current user is SuperAdmin when trying to deactivate an Admin
                var targetUser = await _userManagementService.GetUserByIdAsync(userId);
                if (targetUser.Success && targetUser.User?.Role == "Admin")
                {
                    // Get current user's role from claims
                    var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;
                    if (currentUserRole != "SuperAdmin")
                    {
                        return StatusCode(403, new { Success = false, Message = "Only SuperAdmin can deactivate Admin users." });
                    }
                }

                var result = await _userManagementService.DeactivateUserAsync(userId);

                if (result)
                {
                    return Ok(new { Success = true, Message = "User deactivated successfully." });
                }

                return BadRequest(new { Success = false, Message = "Failed to deactivate user. User may not exist or you don't have sufficient permissions." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deactivating user {userId}");
                return StatusCode(500, new { Success = false, Message = "An internal error occurred while deactivating the user." });
            }
        }

        /// <summary>
        /// Activate a user
        /// </summary>
        [HttpPost("{userId}/activate")]
        public async Task<ActionResult> ActivateUser(Guid userId)
        {
            try
            {
                var result = await _userManagementService.ActivateUserAsync(userId);

                if (result)
                {
                    return Ok(new { Success = true, Message = "User activated successfully." });
                }

                return BadRequest(new { Success = false, Message = "Failed to activate user. User may not exist." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error activating user {userId}");
                return StatusCode(500, new { Success = false, Message = "An internal error occurred while activating the user." });
            }
        }

        /// <summary>
        /// Get user permissions
        /// </summary>
        [HttpGet("{userId}/permissions")]
        public async Task<ActionResult<UserPermissionsResponse>> GetUserPermissions(Guid userId)
        {
            try
            {
                var result = await _userManagementService.GetUserPermissionsAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting permissions for user {userId}");
                return StatusCode(500, new UserPermissionsResponse
                {
                    Success = false,
                    UserId = userId,
                    Permissions = new List<UserPermissionDto>()
                });
            }
        }

        /// <summary>
        /// Update user permissions
        /// </summary>
        [HttpPut("{userId}/permissions")]
        public async Task<ActionResult> UpdateUserPermissions(Guid userId, [FromBody] UpdateUserPermissionsRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var result = await _userManagementService.UpdateUserPermissionsAsync(userId, request);

                if (result)
                {
                    return Ok(new { Success = true, Message = "User permissions updated successfully." });
                }

                return BadRequest(new { Success = false, Message = "Failed to update user permissions." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating permissions for user {userId}");
                return StatusCode(500, new { Success = false, Message = "An internal error occurred while updating user permissions." });
            }
        }

        /// <summary>
        /// Get user statistics
        /// </summary>
        [HttpGet("stats")]
        public async Task<ActionResult<UserStatsResponse>> GetUserStats()
        {
            try
            {
                var result = await _userManagementService.GetUserStatsAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user statistics");
                return StatusCode(500, new UserStatsResponse
                {
                    Success = false
                });
            }
        }

        /// <summary>
        /// Remove a user
        /// </summary>
        [HttpDelete("{userId}")]
        public async Task<ActionResult> RemoveUser(Guid userId)
        {
            try
            {
                // Check if current user is SuperAdmin when trying to remove an Admin
                var targetUser = await _userManagementService.GetUserByIdAsync(userId);
                if (targetUser.Success && targetUser.User?.Role == "Admin")
                {
                    // Get current user's role from claims
                    var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;
                    if (currentUserRole != "SuperAdmin")
                    {
                        return StatusCode(403, new { Success = false, Message = "Only SuperAdmin can remove Admin users." });
                    }
                }

                // Cannot remove SuperAdmin
                if (targetUser.Success && targetUser.User?.Role == "SuperAdmin")
                {
                    return BadRequest(new { Success = false, Message = "SuperAdmin users cannot be removed." });
                }

                var result = await _userManagementService.RemoveUserAsync(userId);

                if (result)
                {
                    return Ok(new { Success = true, Message = "User removed successfully." });
                }

                return BadRequest(new { Success = false, Message = "Failed to remove user. User may not exist or you don't have sufficient permissions." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error removing user {userId}");
                return StatusCode(500, new { Success = false, Message = "An internal error occurred while removing the user." });
            }
        }
    }
} 