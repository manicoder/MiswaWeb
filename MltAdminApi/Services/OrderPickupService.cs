using Microsoft.EntityFrameworkCore;
using Mlt.Admin.Api.Data;
using Mlt.Admin.Api.Models;
using Mlt.Admin.Api.Models.DTOs;

namespace Mlt.Admin.Api.Services;

public class OrderPickupService : IOrderPickupService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<OrderPickupService> _logger;

    public OrderPickupService(ApplicationDbContext context, ILogger<OrderPickupService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<OrderPickupStatusDto?> GetPickupStatusAsync(string shopifyOrderId, string trackingNumber)
    {
        try
        {
            var pickupStatus = await _context.OrderPickupStatuses
                .FirstOrDefaultAsync(x => x.ShopifyOrderId == shopifyOrderId && x.TrackingNumber == trackingNumber);

            if (pickupStatus == null)
                return null;

            return MapToDto(pickupStatus);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pickup status for order {ShopifyOrderId} with tracking {TrackingNumber}", 
                shopifyOrderId, trackingNumber);
            throw;
        }
    }

    public async Task<OrderPickupStatusDto> UpdatePickupStatusAsync(UpdatePickupStatusDto updateDto, string userId)
    {
        try
        {
            // Ensure FulfillmentDate is in UTC
            var fulfillmentDateUtc = updateDto.FulfillmentDate.Kind == DateTimeKind.Utc 
                ? updateDto.FulfillmentDate 
                : DateTime.SpecifyKind(updateDto.FulfillmentDate, DateTimeKind.Utc);

            var existingStatus = await _context.OrderPickupStatuses
                .FirstOrDefaultAsync(x => x.ShopifyOrderId == updateDto.ShopifyOrderId && 
                                        x.TrackingNumber == updateDto.TrackingNumber);

            if (existingStatus != null)
            {
                // Update existing record
                existingStatus.PickupStatus = updateDto.PickupStatus;
                existingStatus.Notes = updateDto.Notes;
                existingStatus.UpdatedBy = userId;
                existingStatus.UpdatedAt = DateTime.UtcNow;

                _logger.LogInformation("Updated pickup status for order {OrderName} to {Status}", 
                    updateDto.OrderName, updateDto.PickupStatus);
            }
            else
            {
                // Create new record
                existingStatus = new OrderPickupStatus
                {
                    ShopifyOrderId = updateDto.ShopifyOrderId,
                    OrderName = updateDto.OrderName,
                    PickupStatus = updateDto.PickupStatus,
                    Notes = updateDto.Notes,
                    FulfillmentDate = fulfillmentDateUtc,
                    CourierCompany = updateDto.CourierCompany,
                    TrackingNumber = updateDto.TrackingNumber,
                    CreatedBy = userId,
                    UpdatedBy = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.OrderPickupStatuses.Add(existingStatus);
                
                _logger.LogInformation("Created new pickup status for order {OrderName} with status {Status}", 
                    updateDto.OrderName, updateDto.PickupStatus);
            }

            await _context.SaveChangesAsync();
            return MapToDto(existingStatus);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating pickup status for order {OrderName}", updateDto.OrderName);
            throw;
        }
    }

    public async Task<List<OrderPickupStatusDto>> GetPickupStatusesByDateRangeAsync(DateTime startDate, DateTime endDate, string? courierCompany = null)
    {
        try
        {
            var query = _context.OrderPickupStatuses
                .Where(x => x.FulfillmentDate >= startDate && x.FulfillmentDate <= endDate);

            if (!string.IsNullOrEmpty(courierCompany))
            {
                query = query.Where(x => x.CourierCompany == courierCompany);
            }

            var pickupStatuses = await query
                .OrderByDescending(x => x.FulfillmentDate)
                .ThenBy(x => x.CourierCompany)
                .ToListAsync();

            return pickupStatuses.Select(MapToDto).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pickup statuses for date range {StartDate} to {EndDate}", 
                startDate, endDate);
            throw;
        }
    }

    public async Task<Dictionary<string, int>> GetPickupStatusSummaryAsync(DateTime startDate, DateTime endDate)
    {
        try
        {
            var summary = await _context.OrderPickupStatuses
                .Where(x => x.FulfillmentDate >= startDate && x.FulfillmentDate <= endDate)
                .GroupBy(x => x.PickupStatus)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Status, x => x.Count);

            // Ensure all statuses are represented
            var result = new Dictionary<string, int>
            {
                ["pickup"] = summary.GetValueOrDefault("pickup", 0),
                ["not_pickup"] = summary.GetValueOrDefault("not_pickup", 0),
                ["missing"] = summary.GetValueOrDefault("missing", 0)
            };

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pickup status summary for date range {StartDate} to {EndDate}", 
                startDate, endDate);
            throw;
        }
    }

    private static OrderPickupStatusDto MapToDto(OrderPickupStatus entity)
    {
        return new OrderPickupStatusDto
        {
            Id = entity.Id,
            ShopifyOrderId = entity.ShopifyOrderId,
            OrderName = entity.OrderName,
            PickupStatus = entity.PickupStatus,
            Notes = entity.Notes,
            FulfillmentDate = entity.FulfillmentDate,
            CourierCompany = entity.CourierCompany,
            TrackingNumber = entity.TrackingNumber,
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt,
            CreatedBy = entity.CreatedBy,
            UpdatedBy = entity.UpdatedBy
        };
    }
} 