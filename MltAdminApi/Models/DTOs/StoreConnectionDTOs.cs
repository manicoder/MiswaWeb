namespace Mlt.Admin.Api.Models.DTOs;

public class CreateStoreConnectionRequest
{
    public string Platform { get; set; } = string.Empty; // "shopify", "amazon", "flipkart"
    public string StoreName { get; set; } = string.Empty;
    public string AccessToken { get; set; } = string.Empty; // For Shopify
    public string ApiKey { get; set; } = string.Empty; // For Amazon/Flipkart
    public string SecretKey { get; set; } = string.Empty; // For Amazon/Flipkart
    public bool SetAsDefault { get; set; } = false;
}

public class UpdateStoreConnectionRequest
{
    public Guid Id { get; set; }
    public string? StoreName { get; set; }
    public string? AccessToken { get; set; }
    public string? ApiKey { get; set; }
    public string? SecretKey { get; set; }
    public string? Status { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsDefault { get; set; }
}

public class StoreConnectionDto
{
    public Guid Id { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string StoreName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastSyncAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public string? StoreUrl { get; set; }
    public string? StoreDomain { get; set; }
    public string? StoreEmail { get; set; }
    public string? StoreCountry { get; set; }
    public string? StoreCurrency { get; set; }
    public string? LastError { get; set; }
    public DateTime? LastErrorAt { get; set; }
}

public class StoreConnectionListResponse
{
    public List<StoreConnectionDto> Stores { get; set; } = new();
    public int TotalCount { get; set; }
    public StoreConnectionDto? DefaultStore { get; set; }
}

public class StoreConnectionResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public StoreConnectionDto? Store { get; set; }
    public string? Error { get; set; }
} 