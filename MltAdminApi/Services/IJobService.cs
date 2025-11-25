using Mlt.Admin.Api.Models;

namespace Mlt.Admin.Api.Services;

public interface IJobService
{
    Task<int> CreateJobAsync(string courierName, string? completedBy = null);
    
    Task<bool> CompleteJobAsync(string courierName, Dictionary<string, OrderStatusDto> orderStatuses, object? jobData, string? completedBy = null);
    
    Task<Dictionary<string, CompletedJobDto>> GetCompletedJobsAsync();
    
    Task<object?> GetJobDataAsync(string courierName);
    
    Task<Dictionary<string, object>> GetAllJobDataAsync();
    
    Task<Dictionary<string, OrderStatusDto>> GetOrderStatusesAsync(string courierName);
    
    Task<Dictionary<string, Dictionary<string, OrderStatusDto>>> GetAllOrderStatusesAsync();
}

public class OrderStatusDto
{
    public bool IsPickup { get; set; }
    public bool IsMissing { get; set; }
    public string? Notes { get; set; }
}

public class CompletedJobDto
{
    public bool Completed { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? CompletedBy { get; set; }
} 