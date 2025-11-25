using Mlt.Admin.Api.Models.DTOs;

namespace Mlt.Admin.Api.Services;

public interface IOrderPickupService
{
    Task<OrderPickupStatusDto?> GetPickupStatusAsync(string shopifyOrderId, string trackingNumber);
    Task<OrderPickupStatusDto> UpdatePickupStatusAsync(UpdatePickupStatusDto updateDto, string userId);
    Task<List<OrderPickupStatusDto>> GetPickupStatusesByDateRangeAsync(DateTime startDate, DateTime endDate, string? courierCompany = null);
    Task<Dictionary<string, int>> GetPickupStatusSummaryAsync(DateTime startDate, DateTime endDate);
} 