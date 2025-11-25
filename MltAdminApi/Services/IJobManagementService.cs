using Mlt.Admin.Api.Models.DTOs;
using Mlt.Admin.Api.Models.Shopify;

namespace Mlt.Admin.Api.Services;

public interface IJobManagementService
{
    Task<JobManagementResponseDto> GetFulfilledOrdersGroupedByCourierAsync(ShopifyCredentials credentials, int limit = 250, string? cursor = null, string? dateFilter = null);
    Task<object> GetCourierSummaryAsync(ShopifyCredentials credentials);
} 