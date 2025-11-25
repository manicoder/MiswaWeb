using System.Text;
using System.Text.Json;
using Mlt.Admin.Api.Models.Shopify;

namespace Mlt.Admin.Api.Services;

public class ShopifyApiService : IShopifyApiService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ShopifyApiService> _logger;
    private readonly Dictionary<string, DateTime> _lastRequestTimes;
    private readonly SemaphoreSlim _rateLimitSemaphore;
    private const string API_VERSION = "2025-04";

    public ShopifyApiService(HttpClient httpClient, ILogger<ShopifyApiService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _lastRequestTimes = new Dictionary<string, DateTime>();
        _rateLimitSemaphore = new SemaphoreSlim(1, 1);
        
        _httpClient.Timeout = TimeSpan.FromMinutes(2); // 2 minutes for GraphQL queries
    }

    public async Task<ShopifyApiResponse<T>> ExecuteGraphQLQueryAsync<T>(ShopifyCredentials credentials, string query, Dictionary<string, object>? variables = null)
    {
        try
        {
            await EnforceRateLimitAsync(credentials.Store);

            var baseUrl = $"https://{credentials.Store}.myshopify.com/admin/api/{API_VERSION}";
            var url = $"{baseUrl}/graphql.json";

            var graphqlRequest = new
            {
                query = query,
                variables = variables ?? new Dictionary<string, object>()
            };

            var jsonContent = JsonSerializer.Serialize(graphqlRequest);
            using var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Add("X-Shopify-Access-Token", credentials.AccessToken);
            request.Content = content;

            _logger.LogInformation("Executing GraphQL query to: {Url}", url);

            using var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            // Log the actual GraphQL request and response for debugging
            _logger.LogDebug("GraphQL Request: {Query}", query);
            _logger.LogDebug("GraphQL Response Status: {StatusCode}", response.StatusCode);
            _logger.LogDebug("GraphQL Response Content: {Content}", responseContent);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("GraphQL request failed with status {StatusCode}: {Content}", response.StatusCode, responseContent);
                
                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    throw new InvalidOperationException("Rate limited by Shopify API");
                }
                
                return new ShopifyApiResponse<T>
                {
                    Success = false,
                    Error = $"HTTP {response.StatusCode}: {responseContent}"
                };
            }

            // Check if the response contains GraphQL errors
            try
            {
                var responseElement = JsonSerializer.Deserialize<JsonElement>(responseContent);
                if (responseElement.TryGetProperty("errors", out var errors))
                {
                    _logger.LogError("GraphQL query returned errors: {Errors}", errors.ToString());
                    return new ShopifyApiResponse<T>
                    {
                        Success = false,
                        Error = $"GraphQL errors: {errors}"
                    };
                }
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to parse GraphQL response as JSON: {Content}", responseContent);
                return new ShopifyApiResponse<T>
                {
                    Success = false,
                    Error = "Invalid JSON response from Shopify"
                };
            }

            var result = JsonSerializer.Deserialize<T>(responseContent);

            return new ShopifyApiResponse<T>
            {
                Success = true,
                Data = result
            };
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogError(ex, "GraphQL request timeout");
            return new ShopifyApiResponse<T>
            {
                Success = false,
                Error = "Request timeout"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GraphQL request failed");
            return new ShopifyApiResponse<T>
            {
                Success = false,
                Error = ex.Message
            };
        }
    }

    public async Task<bool> ValidateCredentialsAsync(ShopifyCredentials credentials)
    {
        try
        {
            var query = @"
                query {
                    shop {
                        id
                        name
                    }
                }";

            var result = await ExecuteGraphQLQueryAsync<object>(credentials, query);
            
            if (result.Success && result.Data != null)
            {
                var responseJson = JsonSerializer.Serialize(result.Data);
                var responseElement = JsonSerializer.Deserialize<JsonElement>(responseJson);
                
                if (responseElement.TryGetProperty("data", out var dataElement) &&
                    dataElement.TryGetProperty("shop", out var shopElement) &&
                    shopElement.ValueKind != JsonValueKind.Null)
                {
                    _logger.LogInformation("Credentials validated successfully for store: {Store}", credentials.Store);
                    return true;
                }
            }

            _logger.LogWarning("Failed to validate credentials for store: {Store}", credentials.Store);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating credentials for store: {Store}", credentials.Store);
            return false;
        }
    }

    private async Task EnforceRateLimitAsync(string store)
    {
        await _rateLimitSemaphore.WaitAsync();
        try
        {
            if (_lastRequestTimes.TryGetValue(store, out var lastRequestTime))
            {
                var timeSinceLastRequest = DateTime.UtcNow - lastRequestTime;
                var minInterval = TimeSpan.FromMilliseconds(500);
                
                if (timeSinceLastRequest < minInterval)
                {
                    var delayTime = minInterval - timeSinceLastRequest;
                    _logger.LogDebug("Rate limiting: waiting {DelayMs}ms for store {Store}", delayTime.TotalMilliseconds, store);
                    await Task.Delay(delayTime);
                }
            }

            _lastRequestTimes[store] = DateTime.UtcNow;
        }
        finally
        {
            _rateLimitSemaphore.Release();
        }
    }
} 