using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mlt.Admin.Api.Models.DTOs;
using Mlt.Admin.Api.Services;
using System.Security.Claims;

namespace Mlt.Admin.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class OrderPickupController : ControllerBase
{
    private readonly IOrderPickupService _orderPickupService;
    private readonly ILogger<OrderPickupController> _logger;

    public OrderPickupController(
        IOrderPickupService orderPickupService,
        ILogger<OrderPickupController> logger)
    {
        _orderPickupService = orderPickupService;
        _logger = logger;
    }

    [HttpPost("update-status")]
    public async Task<ActionResult<Mlt.Admin.Api.Models.DTOs.ApiResponse<OrderPickupStatusDto>>> UpdatePickupStatus([FromBody] UpdatePickupStatusDto updateDto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                var response = new Mlt.Admin.Api.Models.DTOs.ApiResponse<OrderPickupStatusDto>
                {
                    Success = false,
                    Message = "Validation failed",
                    Errors = errors
                };
                return BadRequest(response);
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "unknown";
            var result = await _orderPickupService.UpdatePickupStatusAsync(updateDto, userId);

            return Ok(new Mlt.Admin.Api.Models.DTOs.ApiResponse<OrderPickupStatusDto>
            {
                Success = true,
                Message = "Pickup status updated successfully",
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating pickup status for order {OrderName}", updateDto?.OrderName);
            var errorResponse = new Mlt.Admin.Api.Models.DTOs.ApiResponse<OrderPickupStatusDto>
            {
                Success = false,
                Message = "An error occurred while updating pickup status",
                Errors = new List<string> { ex.Message }
            };
            return StatusCode(500, errorResponse);
        }
    }

    [HttpGet("health")]
    [AllowAnonymous]
    public ActionResult<object> Health()
    {
        return Ok(new
        {
            Service = "OrderPickup",
            Status = "Healthy",
            Timestamp = DateTime.UtcNow
        });
    }
} 