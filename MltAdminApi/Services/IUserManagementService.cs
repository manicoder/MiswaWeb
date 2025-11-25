using Mlt.Admin.Api.Models.DTOs;
using Mlt.Admin.Api.Models;

namespace Mlt.Admin.Api.Services
{
    public interface IUserManagementService
    {
        Task<UserListResponse> GetAllUsersAsync();
        Task<UserResponse> GetUserByIdAsync(Guid userId);
        Task<UserResponse> UpdateUserAsync(Guid userId, UpdateUserRequest request);
        Task<bool> DeactivateUserAsync(Guid userId);
        Task<bool> ActivateUserAsync(Guid userId);
        Task<UserPermissionsResponse> GetUserPermissionsAsync(Guid userId);
        Task<bool> UpdateUserPermissionsAsync(Guid userId, UpdateUserPermissionsRequest request);
        Task<UserStatsResponse> GetUserStatsAsync();
        Task<bool> RemoveUserAsync(Guid userId);
    }
} 