using Microsoft.EntityFrameworkCore;
using Mlt.Admin.Api.Data;
using Mlt.Admin.Api.Models;
using System.Text.Json;

namespace Mlt.Admin.Api.Services;

public class JobService : IJobService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<JobService> _logger;

    public JobService(ApplicationDbContext context, ILogger<JobService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<int> CreateJobAsync(string courierName, string? completedBy = null)
    {
        try
        {
            var job = new Job
            {
                CourierName = courierName,
                CompletedBy = completedBy ?? "User"
            };

            _context.Jobs.Add(job);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created job {JobId} for courier {CourierName}", job.Id, courierName);
            return job.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating job for courier {CourierName}", courierName);
            throw;
        }
    }

    public async Task<bool> CompleteJobAsync(string courierName, Dictionary<string, OrderStatusDto> orderStatuses, object? jobData, string? completedBy = null)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        
        try
        {
            // Find existing job or create new one
            var job = await _context.Jobs
                .Include(j => j.OrderStatuses)
                .Include(j => j.JobData)
                .FirstOrDefaultAsync(j => j.CourierName == courierName);

            if (job == null)
            {
                job = new Job
                {
                    CourierName = courierName,
                    CompletedBy = completedBy ?? "User"
                };
                _context.Jobs.Add(job);
                await _context.SaveChangesAsync(); // Save to get ID
            }

            // Update job completion status
            job.IsCompleted = true;
            job.CompletedAt = DateTime.UtcNow;
            job.CompletedBy = completedBy ?? "User";
            job.UpdatedAt = DateTime.UtcNow;

            // Clear existing order statuses
            _context.OrderStatuses.RemoveRange(job.OrderStatuses);

            // Add new order statuses
            foreach (var orderStatus in orderStatuses)
            {
                var newOrderStatus = new OrderStatus
                {
                    JobId = job.Id,
                    OrderId = orderStatus.Key,
                    IsPickup = orderStatus.Value.IsPickup,
                    IsMissing = orderStatus.Value.IsMissing,
                    Notes = orderStatus.Value.Notes
                };
                _context.OrderStatuses.Add(newOrderStatus);
            }

            // Update or create job data
            if (jobData != null)
            {
                var jsonData = JsonSerializer.Serialize(jobData);
                
                if (job.JobData != null)
                {
                    job.JobData.Data = jsonData;
                    job.JobData.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    var newJobData = new JobData
                    {
                        JobId = job.Id,
                        Data = jsonData
                    };
                    _context.JobData.Add(newJobData);
                }
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            _logger.LogInformation("Completed job for courier {CourierName} with {OrderCount} orders", 
                courierName, orderStatuses.Count);
            
            return true;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Error completing job for courier {CourierName}", courierName);
            throw;
        }
    }

    public async Task<Dictionary<string, CompletedJobDto>> GetCompletedJobsAsync()
    {
        try
        {
            var completedJobs = await _context.Jobs
                .Where(j => j.IsCompleted)
                .Select(j => new { j.CourierName, j.CompletedAt, j.CompletedBy })
                .ToListAsync();

            return completedJobs.ToDictionary(
                j => j.CourierName,
                j => new CompletedJobDto
                {
                    Completed = true,
                    CompletedAt = j.CompletedAt,
                    CompletedBy = j.CompletedBy
                });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching completed jobs");
            throw;
        }
    }

    public async Task<object?> GetJobDataAsync(string courierName)
    {
        try
        {
            var jobData = await _context.Jobs
                .Where(j => j.CourierName == courierName && j.IsCompleted)
                .Include(j => j.JobData)
                .Select(j => new
                {
                    Data = j.JobData != null ? j.JobData.Data : null,
                    j.CompletedAt,
                    j.CompletedBy
                })
                .FirstOrDefaultAsync();

            if (jobData?.Data != null)
            {
                var parsedData = JsonSerializer.Deserialize<object>(jobData.Data);
                return new
                {
                    data = parsedData,
                    completedAt = jobData.CompletedAt,
                    completedBy = jobData.CompletedBy
                };
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching job data for courier {CourierName}", courierName);
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetAllJobDataAsync()
    {
        try
        {
            var allJobData = await _context.Jobs
                .Where(j => j.IsCompleted)
                .Include(j => j.JobData)
                .Select(j => new
                {
                    j.CourierName,
                    Data = j.JobData != null ? j.JobData.Data : null,
                    j.CompletedAt,
                    j.CompletedBy
                })
                .ToListAsync();

            var result = new Dictionary<string, object>();
            
            foreach (var job in allJobData)
            {
                if (job.Data != null)
                {
                    var parsedData = JsonSerializer.Deserialize<object>(job.Data);
                    result[job.CourierName] = new
                    {
                        data = parsedData,
                        completedAt = job.CompletedAt,
                        completedBy = job.CompletedBy
                    };
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching all job data");
            throw;
        }
    }

    public async Task<Dictionary<string, OrderStatusDto>> GetOrderStatusesAsync(string courierName)
    {
        try
        {
            var orderStatuses = await _context.Jobs
                .Where(j => j.CourierName == courierName && j.IsCompleted)
                .Include(j => j.OrderStatuses)
                .SelectMany(j => j.OrderStatuses)
                .ToListAsync();

            return orderStatuses.ToDictionary(
                os => os.OrderId,
                os => new OrderStatusDto
                {
                    IsPickup = os.IsPickup,
                    IsMissing = os.IsMissing,
                    Notes = os.Notes
                });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching order statuses for courier {CourierName}", courierName);
            throw;
        }
    }

    public async Task<Dictionary<string, Dictionary<string, OrderStatusDto>>> GetAllOrderStatusesAsync()
    {
        try
        {
            var allOrderStatuses = await _context.Jobs
                .Where(j => j.IsCompleted)
                .Include(j => j.OrderStatuses)
                .ToListAsync();

            var result = new Dictionary<string, Dictionary<string, OrderStatusDto>>();

            foreach (var job in allOrderStatuses)
            {
                result[job.CourierName] = job.OrderStatuses.ToDictionary(
                    os => os.OrderId,
                    os => new OrderStatusDto
                    {
                        IsPickup = os.IsPickup,
                        IsMissing = os.IsMissing,
                        Notes = os.Notes
                    });
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching all order statuses");
            throw;
        }
    }
} 