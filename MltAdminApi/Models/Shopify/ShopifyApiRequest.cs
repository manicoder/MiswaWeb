using System.ComponentModel.DataAnnotations;

namespace Mlt.Admin.Api.Models.Shopify;

public class ShopifyGraphQLRequest
{
    [Required]
    public string Query { get; set; } = string.Empty;

    public Dictionary<string, object>? Variables { get; set; }
}

public class ShopifyRestRequest
{
    [Required]
    public string Endpoint { get; set; } = string.Empty;

    [Required]
    public string Method { get; set; } = "GET";

    public object? Data { get; set; }

    public Dictionary<string, string>? QueryParameters { get; set; }
}

public class ShopifyCredentials
{
    [Required]
    public string Store { get; set; } = string.Empty;

    [Required]
    public string AccessToken { get; set; } = string.Empty;
}

public class ShopifyApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Error { get; set; }
    public string? Message { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}