using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Mlt.Admin.Api.Services;
using Mlt.Admin.Api.Models.DTOs;
using Mlt.Admin.Api.Models.Shopify;
using System.ComponentModel.DataAnnotations;

namespace Mlt.Admin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class JobManagementController : ControllerBase
{
    private readonly IJobManagementService _jobManagementService;
    private readonly IStoreConnectionService _storeConnectionService;
    private readonly ILogger<JobManagementController> _logger;

    public JobManagementController(
        IJobManagementService jobManagementService, 
        IStoreConnectionService storeConnectionService,
        ILogger<JobManagementController> logger)
    {
        _jobManagementService = jobManagementService;
        _storeConnectionService = storeConnectionService;
        _logger = logger;
    }

    [HttpGet("fulfilled-orders")]
    public async Task<IActionResult> GetFulfilledOrdersGroupedByCourier(
        [FromQuery] int limit = 250, 
        [FromQuery] string? cursor = null,
        [FromQuery] string? dateFilter = null)
    {
        try
        {
            if (limit <= 0 || limit > 250)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Limit must be between 1 and 250"
                });
            }

            // Get user's Shopify credentials (same as ShopifyController)
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "No Shopify store connected for this user"
                });
            }

            var result = await _jobManagementService.GetFulfilledOrdersGroupedByCourierAsync(credentials, limit, cursor, dateFilter);
            
            return Ok(new ApiResponse<JobManagementResponseDto>
            {
                Success = true,
                Data = result,
                Message = "Fulfilled orders retrieved successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching fulfilled orders grouped by courier");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch fulfilled orders",
                Error = ex.Message
            });
        }
    }

    [HttpGet("courier-summary")]
    public async Task<IActionResult> GetCourierSummary()
    {
        try
        {
            // Get user's Shopify credentials (same as other endpoints)
            var credentials = await GetUserShopifyCredentialsAsync();
            if (credentials == null)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "No Shopify store connected for this user"
                });
            }

            var summary = await _jobManagementService.GetCourierSummaryAsync(credentials);
            
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = summary,
                Message = "Courier summary retrieved successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching courier summary");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch courier summary",
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
            Message = "Job Management API is running",
            Data = new { timestamp = DateTime.UtcNow }
        });
    }

    private async Task<ShopifyCredentials?> GetUserShopifyCredentialsAsync()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                _logger.LogWarning("User ID not found in authentication token");
                return null;
            }

            var storeConnection = await _storeConnectionService.GetDefaultStoreConnectionAsync(userId.Value, "shopify");
            if (storeConnection == null)
            {
                _logger.LogWarning("No Shopify store connection found for user {UserId}", userId.Value);
                return null;
            }

            // Decrypt credentials from the store connection
            var credentials = await _storeConnectionService.GetDecryptedCredentialsAsync(storeConnection.Id);
            if (credentials == null || !credentials.ContainsKey("accessToken"))
            {
                _logger.LogWarning("No access token found in store connection {StoreId}", storeConnection.Id);
                return null;
            }

            // Update last used timestamp
            await _storeConnectionService.UpdateLastUsedAsync(storeConnection.Id);

            return new ShopifyCredentials
            {
                Store = storeConnection.StoreName,
                AccessToken = credentials["accessToken"]
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Shopify credentials");
            return null;
        }
    }

    private Guid? GetCurrentUserId()
    {
        try
        {
            var userIdClaim = User.FindFirst("UserId") ?? User.FindFirst("sub") ?? User.FindFirst("user_id");
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return userId;
            }

            var emailClaim = User.FindFirst("email") ?? User.FindFirst("Email");
            if (emailClaim != null)
            {
                _logger.LogWarning("User ID not found in token for email: {Email}", emailClaim.Value);
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current user ID");
            return null;
        }
    }
} 