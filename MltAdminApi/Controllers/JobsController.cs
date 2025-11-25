using Microsoft.AspNetCore.Mvc;
using Mlt.Admin.Api.Services;
using System.ComponentModel.DataAnnotations;

namespace Mlt.Admin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class JobsController : ControllerBase
{
    private readonly IJobService _jobService;
    private readonly ILogger<JobsController> _logger;

    public JobsController(IJobService jobService, ILogger<JobsController> logger)
    {
        _jobService = jobService;
        _logger = logger;
    }

    [HttpGet("completed")]
    public async Task<IActionResult> GetCompletedJobs()
    {
        try
        {
            var completedJobs = await _jobService.GetCompletedJobsAsync();
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = completedJobs
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching completed jobs");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch completed jobs",
                Error = ex.Message
            });
        }
    }

    [HttpGet("data/{courierName}")]
    public async Task<IActionResult> GetJobData(string courierName)
    {
        try
        {
            var jobData = await _jobService.GetJobDataAsync(courierName);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = jobData
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching job data for courier {CourierName}", courierName);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch job data",
                Error = ex.Message
            });
        }
    }

    [HttpGet("data")]
    public async Task<IActionResult> GetAllJobData()
    {
        try
        {
            var allJobData = await _jobService.GetAllJobDataAsync();
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = allJobData
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching all job data");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch job data",
                Error = ex.Message
            });
        }
    }

    [HttpGet("statuses/{courierName}")]
    public async Task<IActionResult> GetOrderStatuses(string courierName)
    {
        try
        {
            var orderStatuses = await _jobService.GetOrderStatusesAsync(courierName);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = orderStatuses
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching order statuses for courier {CourierName}", courierName);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch order statuses",
                Error = ex.Message
            });
        }
    }

    [HttpGet("statuses")]
    public async Task<IActionResult> GetAllOrderStatuses()
    {
        try
        {
            var allOrderStatuses = await _jobService.GetAllOrderStatusesAsync();
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = allOrderStatuses
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching all order statuses");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch order statuses",
                Error = ex.Message
            });
        }
    }

    [HttpPost("complete")]
    public async Task<IActionResult> CompleteJob([FromBody] CompleteJobRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var result = await _jobService.CompleteJobAsync(
                request.CourierName, 
                request.OrderStatuses, 
                request.JobData, 
                request.CompletedBy);

            if (result)
            {
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "Job completed successfully",
                    Data = new { courierName = request.CourierName }
                });
            }

            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to complete job"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing job for courier {CourierName}", request.CourierName);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to complete job",
                Error = ex.Message
            });
        }
    }

    [HttpPost("create")]
    public async Task<IActionResult> CreateJob([FromBody] CreateJobRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var jobId = await _jobService.CreateJobAsync(request.CourierName, request.CompletedBy);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Job created successfully",
                Data = new { jobId, courierName = request.CourierName }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating job for courier {CourierName}", request.CourierName);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to create job",
                Error = ex.Message
            });
        }
    }

    [HttpGet("health")]
    public IActionResult HealthCheck()
    {
        return Ok(new ApiResponse<object>
        {
            Success = true,
            Message = "Jobs API is running",
            Data = new { timestamp = DateTime.UtcNow }
        });
    }
}

public class CompleteJobRequest
{
    [Required]
    public string CourierName { get; set; } = string.Empty;

    [Required]
    public Dictionary<string, OrderStatusDto> OrderStatuses { get; set; } = new();

    public object? JobData { get; set; }

    public string? CompletedBy { get; set; }
}

public class CreateJobRequest
{
    [Required]
    public string CourierName { get; set; } = string.Empty;

    public string? CompletedBy { get; set; }
}

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }
    public string? Error { get; set; }
} 