using Mlt.Admin.Api.Models.Shopify;

namespace Mlt.Admin.Api.Services;

public interface IShopifyApiService
{
    // GraphQL ONLY - No REST operations
    Task<ShopifyApiResponse<T>> ExecuteGraphQLQueryAsync<T>(ShopifyCredentials credentials, string query, Dictionary<string, object>? variables = null);
    
    // GraphQL credentials validation
    Task<bool> ValidateCredentialsAsync(ShopifyCredentials credentials);
} 