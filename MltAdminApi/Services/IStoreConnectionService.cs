using Mlt.Admin.Api.Models.DTOs;

namespace Mlt.Admin.Api.Services;

public interface IStoreConnectionService
{
    Task<StoreConnectionResponse> CreateStoreConnectionAsync(CreateStoreConnectionRequest request, Guid userId);
    Task<StoreConnectionResponse> UpdateStoreConnectionAsync(UpdateStoreConnectionRequest request, Guid userId);
    Task<bool> DeleteStoreConnectionAsync(Guid storeId, Guid userId);
    Task<StoreConnectionDto?> GetStoreConnectionAsync(Guid storeId, Guid userId);
    Task<StoreConnectionListResponse> GetUserStoreConnectionsAsync(Guid userId);
    Task<StoreConnectionDto?> GetDefaultStoreConnectionAsync(Guid userId, string? platform = null);
    Task<bool> SetDefaultStoreConnectionAsync(Guid storeId, Guid userId);
    Task<bool> TestStoreConnectionAsync(Guid storeId, Guid userId);
    Task<bool> UpdateLastSyncAsync(Guid storeId);
    Task<bool> UpdateLastUsedAsync(Guid storeId);
    Task<bool> UpdateConnectionStatusAsync(Guid storeId, string status, string? error = null);
    Task<Dictionary<string, string>?> GetDecryptedCredentialsAsync(Guid storeId);
} 