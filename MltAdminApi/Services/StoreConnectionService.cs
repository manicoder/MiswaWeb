using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Mlt.Admin.Api.Data;
using Mlt.Admin.Api.Models;
using Mlt.Admin.Api.Models.DTOs;
using Mlt.Admin.Api.Models.Shopify;

namespace Mlt.Admin.Api.Services;

public class StoreConnectionService : IStoreConnectionService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<StoreConnectionService> _logger;
    private readonly IEncryptionService _encryptionService;
    private readonly IShopifyApiService _shopifyApiService;

    public StoreConnectionService(
        ApplicationDbContext context,
        ILogger<StoreConnectionService> logger,
        IEncryptionService encryptionService,
        IShopifyApiService shopifyApiService)
    {
        _context = context;
        _logger = logger;
        _encryptionService = encryptionService;
        _shopifyApiService = shopifyApiService;
    }

    public async Task<StoreConnectionResponse> CreateStoreConnectionAsync(CreateStoreConnectionRequest request, Guid userId)
    {
        try
        {
            // Validate platform
            var validPlatforms = new[] { "shopify", "amazon", "flipkart" };
            if (!validPlatforms.Contains(request.Platform.ToLower()))
            {
                return new StoreConnectionResponse
                {
                    Success = false,
                    Message = "Invalid platform. Supported platforms: shopify, amazon, flipkart"
                };
            }

            // Check if store already exists for this user
            var existingStore = await _context.StoreConnections
                .FirstOrDefaultAsync(sc => sc.UserId == userId && 
                                          sc.Platform.ToLower() == request.Platform.ToLower() && 
                                          sc.StoreName.ToLower() == request.StoreName.ToLower());

            if (existingStore != null)
            {
                return new StoreConnectionResponse
                {
                    Success = false,
                    Message = "Store connection already exists for this platform and store name"
                };
            }

            // Prepare credentials based on platform
            var credentials = new Dictionary<string, string>();
            
            switch (request.Platform.ToLower())
            {
                case "shopify":
                    if (string.IsNullOrEmpty(request.AccessToken))
                    {
                        return new StoreConnectionResponse
                        {
                            Success = false,
                            Message = "Access token is required for Shopify"
                        };
                    }
                    credentials["accessToken"] = request.AccessToken;
                    break;
                    
                case "amazon":
                case "flipkart":
                    if (string.IsNullOrEmpty(request.ApiKey) || string.IsNullOrEmpty(request.SecretKey))
                    {
                        return new StoreConnectionResponse
                        {
                            Success = false,
                            Message = $"API key and secret key are required for {request.Platform}"
                        };
                    }
                    credentials["apiKey"] = request.ApiKey;
                    credentials["secretKey"] = request.SecretKey;
                    break;
            }

            // Validate credentials before creating connection
            var validationResult = await ValidateCredentialsAsync(request.Platform.ToLower(), request.StoreName, credentials);
            if (!validationResult.Success)
            {
                return new StoreConnectionResponse
                {
                    Success = false,
                    Message = validationResult.Message,
                    Error = validationResult.Error
                };
            }

            // Encrypt credentials
            var credentialsJson = JsonSerializer.Serialize(credentials);
            var encryptedCredentials = _encryptionService.EncryptString(credentialsJson);

            // If this is the first store for the user or SetAsDefault is true, make it default
            var isFirstStore = !await _context.StoreConnections.AnyAsync(sc => sc.UserId == userId && sc.IsActive);
            var isDefault = request.SetAsDefault || isFirstStore;

            // If setting as default, unset other defaults for this user
            if (isDefault)
            {
                var existingDefaults = await _context.StoreConnections
                    .Where(sc => sc.UserId == userId && sc.IsDefault)
                    .ToListAsync();
                
                foreach (var defaultStore in existingDefaults)
                {
                    defaultStore.IsDefault = false;
                }
            }

            // Create new store connection
            var storeConnection = new StoreConnection
            {
                UserId = userId,
                Platform = request.Platform.ToLower(),
                StoreName = request.StoreName,
                EncryptedCredentials = encryptedCredentials,
                Status = "connected",
                IsActive = true,
                IsDefault = isDefault,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.StoreConnections.Add(storeConnection);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created store connection for user {UserId}, platform {Platform}, store {StoreName}", 
                userId, request.Platform, request.StoreName);

            return new StoreConnectionResponse
            {
                Success = true,
                Message = "Store connection created successfully",
                Store = MapToDto(storeConnection)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating store connection for user {UserId}", userId);
            return new StoreConnectionResponse
            {
                Success = false,
                Message = "Failed to create store connection",
                Error = ex.Message
            };
        }
    }

    public async Task<StoreConnectionResponse> UpdateStoreConnectionAsync(UpdateStoreConnectionRequest request, Guid userId)
    {
        try
        {
            var storeConnection = await _context.StoreConnections
                .FirstOrDefaultAsync(sc => sc.Id == request.Id && sc.UserId == userId);

            if (storeConnection == null)
            {
                return new StoreConnectionResponse
                {
                    Success = false,
                    Message = "Store connection not found"
                };
            }

            // Update fields if provided
            if (!string.IsNullOrEmpty(request.StoreName))
                storeConnection.StoreName = request.StoreName;

            if (!string.IsNullOrEmpty(request.Status))
                storeConnection.Status = request.Status;

            if (request.IsActive.HasValue)
                storeConnection.IsActive = request.IsActive.Value;

            // Handle default setting
            if (request.IsDefault.HasValue && request.IsDefault.Value)
            {
                // Unset other defaults for this user
                var existingDefaults = await _context.StoreConnections
                    .Where(sc => sc.UserId == userId && sc.IsDefault && sc.Id != request.Id)
                    .ToListAsync();
                
                foreach (var defaultStore in existingDefaults)
                {
                    defaultStore.IsDefault = false;
                }
                
                storeConnection.IsDefault = true;
            }
            else if (request.IsDefault.HasValue && !request.IsDefault.Value)
            {
                storeConnection.IsDefault = false;
            }

            // Update credentials if provided
            if (!string.IsNullOrEmpty(request.AccessToken) || !string.IsNullOrEmpty(request.ApiKey))
            {
                var existingCredentials = _encryptionService.DecryptCredentials(storeConnection.EncryptedCredentials);
                
                if (!string.IsNullOrEmpty(request.AccessToken))
                    existingCredentials["accessToken"] = request.AccessToken;
                
                if (!string.IsNullOrEmpty(request.ApiKey))
                    existingCredentials["apiKey"] = request.ApiKey;
                
                if (!string.IsNullOrEmpty(request.SecretKey))
                    existingCredentials["secretKey"] = request.SecretKey;

                var credentialsJson = JsonSerializer.Serialize(existingCredentials);
                storeConnection.EncryptedCredentials = _encryptionService.EncryptString(credentialsJson);
            }

            storeConnection.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated store connection {StoreId} for user {UserId}", request.Id, userId);

            return new StoreConnectionResponse
            {
                Success = true,
                Message = "Store connection updated successfully",
                Store = MapToDto(storeConnection)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating store connection {StoreId} for user {UserId}", request.Id, userId);
            return new StoreConnectionResponse
            {
                Success = false,
                Message = "Failed to update store connection",
                Error = ex.Message
            };
        }
    }

    public async Task<bool> DeleteStoreConnectionAsync(Guid storeId, Guid userId)
    {
        try
        {
            var storeConnection = await _context.StoreConnections
                .FirstOrDefaultAsync(sc => sc.Id == storeId && sc.UserId == userId);

            if (storeConnection == null)
                return false;

            _context.StoreConnections.Remove(storeConnection);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted store connection {StoreId} for user {UserId}", storeId, userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting store connection {StoreId} for user {UserId}", storeId, userId);
            return false;
        }
    }

    public async Task<StoreConnectionDto?> GetStoreConnectionAsync(Guid storeId, Guid userId)
    {
        try
        {
            var storeConnection = await _context.StoreConnections
                .FirstOrDefaultAsync(sc => sc.Id == storeId && sc.UserId == userId);

            return storeConnection != null ? MapToDto(storeConnection) : null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting store connection {StoreId} for user {UserId}", storeId, userId);
            return null;
        }
    }

    public async Task<StoreConnectionListResponse> GetUserStoreConnectionsAsync(Guid userId)
    {
        try
        {
            var storeConnections = await _context.StoreConnections
                .Where(sc => sc.UserId == userId)
                .OrderByDescending(sc => sc.IsDefault)
                .ThenByDescending(sc => sc.CreatedAt)
                .ToListAsync();

            var defaultStore = storeConnections.FirstOrDefault(sc => sc.IsDefault);

            return new StoreConnectionListResponse
            {
                Stores = storeConnections.Select(MapToDto).ToList(),
                TotalCount = storeConnections.Count,
                DefaultStore = defaultStore != null ? MapToDto(defaultStore) : null
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting store connections for user {UserId}", userId);
            return new StoreConnectionListResponse();
        }
    }

    public async Task<StoreConnectionDto?> GetDefaultStoreConnectionAsync(Guid userId, string? platform = null)
    {
        try
        {
            var query = _context.StoreConnections
                .Where(sc => sc.UserId == userId && sc.IsActive);

            if (!string.IsNullOrEmpty(platform))
            {
                query = query.Where(sc => sc.Platform.ToLower() == platform.ToLower());
            }

            var defaultStore = await query
                .Where(sc => sc.IsDefault)
                .FirstOrDefaultAsync();

            // If no default found, get the first active store
            if (defaultStore == null)
            {
                defaultStore = await query
                    .OrderByDescending(sc => sc.CreatedAt)
                    .FirstOrDefaultAsync();
            }

            return defaultStore != null ? MapToDto(defaultStore) : null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting default store connection for user {UserId}, platform {Platform}", userId, platform);
            return null;
        }
    }

    public async Task<bool> SetDefaultStoreConnectionAsync(Guid storeId, Guid userId)
    {
        try
        {
            var storeConnection = await _context.StoreConnections
                .FirstOrDefaultAsync(sc => sc.Id == storeId && sc.UserId == userId);

            if (storeConnection == null)
                return false;

            // Unset other defaults for this user
            var existingDefaults = await _context.StoreConnections
                .Where(sc => sc.UserId == userId && sc.IsDefault && sc.Id != storeId)
                .ToListAsync();
            
            foreach (var defaultStore in existingDefaults)
            {
                defaultStore.IsDefault = false;
            }

            storeConnection.IsDefault = true;
            storeConnection.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();

            _logger.LogInformation("Set store connection {StoreId} as default for user {UserId}", storeId, userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting default store connection {StoreId} for user {UserId}", storeId, userId);
            return false;
        }
    }

    public async Task<bool> TestStoreConnectionAsync(Guid storeId, Guid userId)
    {
        try
        {
            var storeConnection = await _context.StoreConnections
                .FirstOrDefaultAsync(sc => sc.Id == storeId && sc.UserId == userId);

            if (storeConnection == null)
                return false;

            // TODO: Implement actual connection testing based on platform
            // For now, just update the last used timestamp
            await UpdateLastUsedAsync(storeId);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing store connection {StoreId} for user {UserId}", storeId, userId);
            return false;
        }
    }

    public async Task<bool> UpdateLastSyncAsync(Guid storeId)
    {
        try
        {
            var storeConnection = await _context.StoreConnections
                .FirstOrDefaultAsync(sc => sc.Id == storeId);

            if (storeConnection == null)
                return false;

            storeConnection.LastSyncAt = DateTime.UtcNow;
            storeConnection.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating last sync for store connection {StoreId}", storeId);
            return false;
        }
    }

    public async Task<bool> UpdateLastUsedAsync(Guid storeId)
    {
        try
        {
            var storeConnection = await _context.StoreConnections
                .FirstOrDefaultAsync(sc => sc.Id == storeId);

            if (storeConnection == null)
                return false;

            storeConnection.LastUsedAt = DateTime.UtcNow;
            storeConnection.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating last used for store connection {StoreId}", storeId);
            return false;
        }
    }

    public async Task<bool> UpdateConnectionStatusAsync(Guid storeId, string status, string? error = null)
    {
        try
        {
            var storeConnection = await _context.StoreConnections
                .FirstOrDefaultAsync(sc => sc.Id == storeId);

            if (storeConnection == null)
                return false;

            storeConnection.Status = status;
            storeConnection.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrEmpty(error))
            {
                storeConnection.LastError = error;
                storeConnection.LastErrorAt = DateTime.UtcNow;
            }
            else if (status == "connected")
            {
                storeConnection.LastError = null;
                storeConnection.LastErrorAt = null;
            }
            
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating connection status for store {StoreId}", storeId);
            return false;
        }
    }

    public async Task<Dictionary<string, string>?> GetDecryptedCredentialsAsync(Guid storeId)
    {
        try
        {
            var storeConnection = await _context.StoreConnections
                .FirstOrDefaultAsync(sc => sc.Id == storeId && sc.IsActive);

            if (storeConnection == null)
                return null;

            return _encryptionService.DecryptCredentials(storeConnection.EncryptedCredentials);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting decrypted credentials for store {StoreId}", storeId);
            return null;
        }
    }

    private async Task<(bool Success, string Message, string? Error)> ValidateCredentialsAsync(string platform, string storeName, Dictionary<string, string> credentials)
    {
        try
        {
            switch (platform.ToLower())
            {
                case "shopify":
                    if (!credentials.ContainsKey("accessToken"))
                    {
                        return (false, "Access token is required for Shopify validation", null);
                    }

                    var shopifyCredentials = new ShopifyCredentials
                    {
                        Store = storeName,
                        AccessToken = credentials["accessToken"]
                    };

                    var isValid = await _shopifyApiService.ValidateCredentialsAsync(shopifyCredentials);
                    
                    if (!isValid)
                    {
                        return (false, "Invalid Shopify credentials. Please check your store name and access token.", "Invalid credentials");
                    }

                    return (true, "Shopify credentials validated successfully", null);

                case "amazon":
                    // TODO: Implement Amazon credential validation when Amazon API service is ready
                    _logger.LogWarning("Amazon credential validation not yet implemented");
                    return (true, "Amazon credential validation skipped (not yet implemented)", null);

                case "flipkart":
                    // TODO: Implement Flipkart credential validation when Flipkart API service is ready
                    _logger.LogWarning("Flipkart credential validation not yet implemented");
                    return (true, "Flipkart credential validation skipped (not yet implemented)", null);

                default:
                    return (false, $"Unsupported platform: {platform}", null);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating credentials for platform {Platform}, store {StoreName}", platform, storeName);
            return (false, "Error validating credentials", ex.Message);
        }
    }

    // Helper methods
    private StoreConnectionDto MapToDto(StoreConnection storeConnection)
    {
        return new StoreConnectionDto
        {
            Id = storeConnection.Id,
            Platform = storeConnection.Platform,
            StoreName = storeConnection.StoreName,
            Status = storeConnection.Status,
            IsActive = storeConnection.IsActive,
            IsDefault = storeConnection.IsDefault,
            CreatedAt = storeConnection.CreatedAt,
            UpdatedAt = storeConnection.UpdatedAt,
            LastSyncAt = storeConnection.LastSyncAt,
            LastUsedAt = storeConnection.LastUsedAt,
            StoreUrl = storeConnection.StoreUrl,
            StoreDomain = storeConnection.StoreDomain,
            StoreEmail = storeConnection.StoreEmail,
            StoreCountry = storeConnection.StoreCountry,
            StoreCurrency = storeConnection.StoreCurrency,
            LastError = storeConnection.LastError,
            LastErrorAt = storeConnection.LastErrorAt
        };
    }
} 