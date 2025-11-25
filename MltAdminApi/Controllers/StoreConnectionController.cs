using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Mlt.Admin.Api.Models.DTOs;
using Mlt.Admin.Api.Services;
using Microsoft.EntityFrameworkCore;
using Mlt.Admin.Api.Data;

namespace Mlt.Admin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StoreConnectionController : ControllerBase
{
    private readonly IStoreConnectionService _storeConnectionService;
    private readonly ILogger<StoreConnectionController> _logger;
    private readonly ApplicationDbContext _context;

    public StoreConnectionController(
        IStoreConnectionService storeConnectionService,
        ILogger<StoreConnectionController> logger,
        ApplicationDbContext context)
    {
        _storeConnectionService = storeConnectionService;
        _logger = logger;
        _context = context;
    }

    [HttpPost]
    public async Task<ActionResult<StoreConnectionResponse>> CreateStoreConnection([FromBody] CreateStoreConnectionRequest request)
    {
        try
        {
            _logger.LogInformation("Creating store connection for platform: {Platform}, store: {StoreName}", 
                request.Platform, request.StoreName);
            
            var userId = GetCurrentUserId();
            _logger.LogInformation("User ID extracted from token: {UserId}", userId);
            
            var result = await _storeConnectionService.CreateStoreConnectionAsync(request, userId);
            
            if (result.Success)
            {
                _logger.LogInformation("Store connection created successfully for user {UserId}", userId);
                return Ok(result);
            }
            
            _logger.LogWarning("Store connection creation failed for user {UserId}: {Message}", 
                userId, result.Message);
            return BadRequest(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogError(ex, "Unauthorized access when creating store connection");
            return Unauthorized(new StoreConnectionResponse
            {
                Success = false,
                Message = "Authentication failed. Please log in again.",
                Error = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating store connection");
            return StatusCode(500, new StoreConnectionResponse
            {
                Success = false,
                Message = "Internal server error",
                Error = ex.Message
            });
        }
    }

    [HttpPut("{storeId}")]
    public async Task<ActionResult<StoreConnectionResponse>> UpdateStoreConnection(Guid storeId, [FromBody] UpdateStoreConnectionRequest request)
    {
        try
        {
            request.Id = storeId; // Ensure the ID matches the route
            var userId = GetCurrentUserId();
            
            var result = await _storeConnectionService.UpdateStoreConnectionAsync(request, userId);
            
            if (result.Success)
            {
                return Ok(result);
            }
            
            return BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating store connection {StoreId}", storeId);
            return StatusCode(500, new StoreConnectionResponse
            {
                Success = false,
                Message = "Internal server error",
                Error = ex.Message
            });
        }
    }

    [HttpDelete("{storeId}")]
    public async Task<ActionResult> DeleteStoreConnection(Guid storeId)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            var success = await _storeConnectionService.DeleteStoreConnectionAsync(storeId, userId);
            
            if (success)
            {
                return Ok(new { success = true, message = "Store connection deleted successfully" });
            }
            
            return NotFound(new { success = false, message = "Store connection not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting store connection {StoreId}", storeId);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    [HttpGet]
    public async Task<ActionResult<StoreConnectionListResponse>> GetStoreConnections()
    {
        try
        {
            var userId = GetCurrentUserId();
            
            var result = await _storeConnectionService.GetUserStoreConnectionsAsync(userId);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting store connections");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("{storeId}")]
    public async Task<ActionResult<StoreConnectionDto>> GetStoreConnection(Guid storeId)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            var store = await _storeConnectionService.GetStoreConnectionAsync(storeId, userId);
            
            if (store == null)
            {
                return NotFound();
            }
            
            return Ok(store);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting store connection {StoreId}", storeId);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("default")]
    public async Task<ActionResult<StoreConnectionDto>> GetDefaultStoreConnection([FromQuery] string? platform = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            var store = await _storeConnectionService.GetDefaultStoreConnectionAsync(userId, platform);
            
            if (store == null)
            {
                return NotFound(new { message = "No default store connection found" });
            }
            
            return Ok(store);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting default store connection");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("{storeId}/set-default")]
    public async Task<ActionResult> SetDefaultStoreConnection(Guid storeId)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            var success = await _storeConnectionService.SetDefaultStoreConnectionAsync(storeId, userId);
            
            if (success)
            {
                return Ok(new { success = true, message = "Default store connection updated successfully" });
            }
            
            return NotFound(new { success = false, message = "Store connection not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting default store connection {StoreId}", storeId);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    [HttpPost("{storeId}/test")]
    public async Task<ActionResult> TestStoreConnection(Guid storeId)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            var success = await _storeConnectionService.TestStoreConnectionAsync(storeId, userId);
            
            if (success)
            {
                return Ok(new { success = true, message = "Store connection test successful" });
            }
            
            return BadRequest(new { success = false, message = "Store connection test failed" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing store connection {StoreId}", storeId);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    [HttpPost("{storeId}/disconnect")]
    public async Task<ActionResult> DisconnectStore(Guid storeId)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            var success = await _storeConnectionService.UpdateConnectionStatusAsync(storeId, "disconnected");
            
            if (success)
            {
                return Ok(new { success = true, message = "Store disconnected successfully" });
            }
            
            return NotFound(new { success = false, message = "Store connection not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error disconnecting store {StoreId}", storeId);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    [HttpPost("{storeId}/reconnect")]
    public async Task<ActionResult> ReconnectStore(Guid storeId)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // Test the connection first
            var testSuccess = await _storeConnectionService.TestStoreConnectionAsync(storeId, userId);
            
            if (testSuccess)
            {
                await _storeConnectionService.UpdateConnectionStatusAsync(storeId, "connected");
                return Ok(new { success = true, message = "Store reconnected successfully" });
            }
            
            await _storeConnectionService.UpdateConnectionStatusAsync(storeId, "error", "Connection test failed");
            return BadRequest(new { success = false, message = "Failed to reconnect store" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reconnecting store {StoreId}", storeId);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    // Helper method to get current user ID
    private Guid GetCurrentUserId()
    {
        try
        {
            // Extract user ID from JWT claims
            var userIdClaim = User.FindFirst("UserId") ?? User.FindFirst("sub") ?? User.FindFirst("user_id");
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            {
                _logger.LogDebug("Successfully extracted user ID from token: {UserId}", userId);
                return userId;
            }

            // If no user ID claim found, log warning and throw exception
            var emailClaim = User.FindFirst("email") ?? User.FindFirst("Email");
            if (emailClaim != null)
            {
                _logger.LogWarning("User ID not found in token for email: {Email}. Available claims: {Claims}", 
                    emailClaim.Value, string.Join(", ", User.Claims.Select(c => $"{c.Type}={c.Value}")));
            }
            else
            {
                _logger.LogWarning("No user ID or email found in token. Available claims: {Claims}", 
                    string.Join(", ", User.Claims.Select(c => $"{c.Type}={c.Value}")));
            }

            throw new UnauthorizedAccessException("User ID not found in authentication token");
        }
        catch (UnauthorizedAccessException)
        {
            // Re-throw UnauthorizedAccessException as-is
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting user ID from token");
            throw new UnauthorizedAccessException("Invalid authentication token");
        }
    }
} 