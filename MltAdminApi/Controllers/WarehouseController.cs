using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MltAdminApi.Services;
using MltAdminApi.Models.DTOs;
using System.Security.Claims;

namespace MltAdminApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class WarehouseController : ControllerBase
    {
        private readonly IWarehouseService _warehouseService;
        private readonly ILogger<WarehouseController> _logger;

        public WarehouseController(IWarehouseService warehouseService, ILogger<WarehouseController> logger)
        {
            _warehouseService = warehouseService;
            _logger = logger;
        }

        /// <summary>
        /// Get all warehouses
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<WarehouseListResponse>> GetWarehouses()
        {
            try
            {
                var result = await _warehouseService.GetWarehousesAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving warehouses");
                return StatusCode(500, new { error = "Failed to retrieve warehouses" });
            }
        }

        /// <summary>
        /// Get active warehouses only
        /// </summary>
        [HttpGet("active")]
        public async Task<ActionResult<List<WarehouseResponse>>> GetActiveWarehouses()
        {
            try
            {
                var result = await _warehouseService.GetActiveWarehousesAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving active warehouses");
                return StatusCode(500, new { error = "Failed to retrieve active warehouses" });
            }
        }

        /// <summary>
        /// Get warehouse by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<WarehouseResponse>> GetWarehouse(int id)
        {
            try
            {
                var result = await _warehouseService.GetWarehouseByIdAsync(id);
                if (result == null)
                {
                    return NotFound(new { error = "Warehouse not found" });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving warehouse {WarehouseId}", id);
                return StatusCode(500, new { error = "Failed to retrieve warehouse" });
            }
        }

        /// <summary>
        /// Get warehouse by code
        /// </summary>
        [HttpGet("code/{code}")]
        public async Task<ActionResult<WarehouseResponse>> GetWarehouseByCode(string code)
        {
            try
            {
                var result = await _warehouseService.GetWarehouseByCodeAsync(code);
                if (result == null)
                {
                    return NotFound(new { error = "Warehouse not found" });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving warehouse with code {WarehouseCode}", code);
                return StatusCode(500, new { error = "Failed to retrieve warehouse" });
            }
        }

        /// <summary>
        /// Create new warehouse
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<WarehouseResponse>> CreateWarehouse(CreateWarehouseRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _warehouseService.CreateWarehouseAsync(request, userId);
                return CreatedAtAction(nameof(GetWarehouse), new { id = result.Id }, result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating warehouse");
                return StatusCode(500, new { error = "Failed to create warehouse" });
            }
        }

        /// <summary>
        /// Update warehouse
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<WarehouseResponse>> UpdateWarehouse(int id, UpdateWarehouseRequest request)
        {
            try
            {
                var result = await _warehouseService.UpdateWarehouseAsync(id, request);
                if (result == null)
                {
                    return NotFound(new { error = "Warehouse not found" });
                }
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating warehouse {WarehouseId}", id);
                return StatusCode(500, new { error = "Failed to update warehouse" });
            }
        }

        /// <summary>
        /// Delete warehouse
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteWarehouse(int id)
        {
            try
            {
                var result = await _warehouseService.DeleteWarehouseAsync(id);
                if (!result)
                {
                    return NotFound(new { error = "Warehouse not found" });
                }
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting warehouse {WarehouseId}", id);
                return StatusCode(500, new { error = "Failed to delete warehouse" });
            }
        }

        /// <summary>
        /// Set warehouse as default source
        /// </summary>
        [HttpPost("{id}/set-default")]
        public async Task<ActionResult> SetDefaultSourceWarehouse(int id)
        {
            try
            {
                var result = await _warehouseService.SetDefaultSourceWarehouseAsync(id);
                if (!result)
                {
                    return NotFound(new { error = "Warehouse not found or inactive" });
                }
                return Ok(new { message = "Default source warehouse updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting default source warehouse {WarehouseId}", id);
                return StatusCode(500, new { error = "Failed to set default source warehouse" });
            }
        }

        /// <summary>
        /// Validate warehouse transfer
        /// </summary>
        [HttpPost("validate-transfer")]
        public async Task<ActionResult> ValidateWarehouseTransfer([FromBody] ValidateTransferRequest request)
        {
            try
            {
                var result = await _warehouseService.ValidateWarehouseTransferAsync(
                    request.SourceWarehouseId, 
                    request.DestinationWarehouseId);
                
                return Ok(new { isValid = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating warehouse transfer");
                return StatusCode(500, new { error = "Failed to validate warehouse transfer" });
            }
        }

        /// <summary>
        /// Get warehouse transfer reports
        /// </summary>
        [HttpGet("transfer-reports")]
        public async Task<ActionResult<List<WarehouseTransferReportResponse>>> GetTransferReports(
            [FromQuery] int? sourceWarehouseId = null,
            [FromQuery] int? destinationWarehouseId = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var result = await _warehouseService.GetWarehouseTransferReportsAsync(
                    sourceWarehouseId, 
                    destinationWarehouseId, 
                    startDate, 
                    endDate);
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving warehouse transfer reports");
                return StatusCode(500, new { error = "Failed to retrieve transfer reports" });
            }
        }

        private string GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub") ?? User.FindFirst("userId");
            if (userIdClaim?.Value != null)
            {
                return userIdClaim.Value;
            }

            var userEmailClaim = User.FindFirst(ClaimTypes.Email) ?? User.FindFirst("email");
            return userEmailClaim?.Value ?? "system";
        }
    }

    // Additional DTOs for controller
    public class ValidateTransferRequest
    {
        public int SourceWarehouseId { get; set; }
        public int DestinationWarehouseId { get; set; }
    }
} 