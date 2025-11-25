using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Mlt.Admin.Api.Services;
using Mlt.Admin.Api.Models.DTOs;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Mlt.Admin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WarehouseShipmentController : ControllerBase
{
    private readonly IWarehouseShipmentService _warehouseShipmentService;
    private readonly ILogger<WarehouseShipmentController> _logger;

    public WarehouseShipmentController(
        IWarehouseShipmentService warehouseShipmentService,
        ILogger<WarehouseShipmentController> logger)
    {
        _warehouseShipmentService = warehouseShipmentService;
        _logger = logger;
    }

    /// <summary>
    /// Get all warehouse shipments with pagination and filtering
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetShipments(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null)
    {
        try
        {
            var result = await _warehouseShipmentService.GetShipmentsAsync(pageNumber, pageSize, status);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting warehouse shipments");
            return StatusCode(500, new { message = "Error retrieving shipments" });
        }
    }

    /// <summary>
    /// Get a specific warehouse shipment by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetShipmentById(int id)
    {
        try
        {
            var shipment = await _warehouseShipmentService.GetShipmentByIdAsync(id);
            if (shipment == null)
            {
                return NotFound(new { message = "Shipment not found" });
            }
            return Ok(shipment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting shipment {ShipmentId}", id);
            return StatusCode(500, new { message = "Error retrieving shipment" });
        }
    }

    /// <summary>
    /// Create a new warehouse shipment
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateShipment([FromBody] CreateWarehouseShipmentDto createDto)
    {
        try
        {
            var userId = GetUserId();
            var shipment = await _warehouseShipmentService.CreateShipmentAsync(createDto, userId);
            return CreatedAtAction(nameof(GetShipmentById), new { id = shipment.Id }, shipment);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating warehouse shipment");
            return StatusCode(500, new { message = "Error creating shipment" });
        }
    }

    /// <summary>
    /// Create a new warehouse transfer shipment between warehouses
    /// </summary>
    [HttpPost("transfer")]
    public async Task<IActionResult> CreateWarehouseTransfer([FromBody] CreateWarehouseTransferRequest request)
    {
        try
        {
            var userId = GetUserId();
            var shipment = await _warehouseShipmentService.CreateWarehouseTransferAsync(
                request.SourceWarehouseId, 
                request.DestinationWarehouseId, 
                request.Notes, 
                userId);
            return CreatedAtAction(nameof(GetShipmentById), new { id = shipment.Id }, shipment);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating warehouse transfer shipment");
            return StatusCode(500, new { message = "Error creating warehouse transfer shipment" });
        }
    }

    /// <summary>
    /// Delete a warehouse shipment (only draft shipments)
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteShipment(int id)
    {
        try
        {
            var userId = GetUserId();
            var result = await _warehouseShipmentService.DeleteShipmentAsync(id, userId);
            if (!result)
            {
                return NotFound(new { message = "Shipment not found" });
            }
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting shipment {ShipmentId}", id);
            return StatusCode(500, new { message = "Error deleting shipment" });
        }
    }

    /// <summary>
    /// Get product information by barcode from Shopify
    /// </summary>
    [HttpGet("products/barcode/{barcode}")]
    public async Task<IActionResult> GetProductByBarcode(string barcode)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(barcode))
            {
                return BadRequest(new { message = "Barcode is required" });
            }

            var userId = GetUserId();
            var productInfo = await _warehouseShipmentService.GetProductInfoByBarcodeAsync(barcode, userId);
            return Ok(productInfo);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting product by barcode {Barcode}", barcode);
            return StatusCode(500, new { message = "Error retrieving product information" });
        }
    }

    /// <summary>
    /// Add a product to a shipment by scanning/entering barcode
    /// </summary>
    [HttpPost("items")]
    public async Task<IActionResult> AddProductToShipment([FromBody] AddProductToShipmentDto addProductDto)
    {
        try
        {
            var userId = GetUserId();
            var item = await _warehouseShipmentService.AddProductToShipmentAsync(addProductDto, userId);
            return Ok(item);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding product to shipment");
            return StatusCode(500, new { message = "Error adding product to shipment" });
        }
    }

    /// <summary>
    /// Remove a product from a shipment
    /// </summary>
    [HttpDelete("{shipmentId}/items/{itemId}")]
    public async Task<IActionResult> RemoveProductFromShipment(int shipmentId, int itemId)
    {
        try
        {
            var userId = GetUserId();
            var result = await _warehouseShipmentService.RemoveProductFromShipmentAsync(shipmentId, itemId, userId);
            if (!result)
            {
                return NotFound(new { message = "Item not found" });
            }
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing item {ItemId} from shipment {ShipmentId}", itemId, shipmentId);
            return StatusCode(500, new { message = "Error removing item from shipment" });
        }
    }

    /// <summary>
    /// Update the quantity of an item in a shipment
    /// </summary>
    [HttpPut("items/{itemId}/quantity")]
    public async Task<IActionResult> UpdateItemQuantity(int itemId, [FromBody] UpdateQuantityDto updateDto)
    {
        try
        {
            var userId = GetUserId();
            var item = await _warehouseShipmentService.UpdateShipmentItemQuantityAsync(itemId, updateDto.Quantity, userId);
            return Ok(item);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating item {ItemId} quantity", itemId);
            return StatusCode(500, new { message = "Error updating item quantity" });
        }
    }

    /// <summary>
    /// Dispatch a shipment (move from 'created' to 'dispatched')
    /// </summary>
    [HttpPost("{id}/dispatch")]
    public async Task<IActionResult> DispatchShipment(int id, [FromBody] DispatchShipmentDto dispatchDto)
    {
        try
        {
            if (dispatchDto.ShipmentId != id)
            {
                return BadRequest(new { message = "Shipment ID mismatch" });
            }

            var userId = GetUserId();
            var shipment = await _warehouseShipmentService.DispatchShipmentAsync(dispatchDto, userId);
            return Ok(shipment);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error dispatching shipment {ShipmentId}", id);
            return StatusCode(500, new { message = "Error dispatching shipment" });
        }
    }

    /// <summary>
    /// Receive a shipment (move from 'dispatched' to 'received')
    /// </summary>
    [HttpPost("{id}/receive")]
    public async Task<IActionResult> ReceiveShipment(int id, [FromBody] ReceiveShipmentDto receiveDto)
    {
        try
        {
            if (receiveDto.ShipmentId != id)
            {
                return BadRequest(new { message = "Shipment ID mismatch" });
            }

            var userId = GetUserId();
            var shipment = await _warehouseShipmentService.ReceiveShipmentAsync(receiveDto, userId);
            return Ok(shipment);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error receiving shipment {ShipmentId}", id);
            return StatusCode(500, new { message = "Error receiving shipment" });
        }
    }

    /// <summary>
    /// Complete a shipment (move from 'received' to 'completed')
    /// </summary>
    [HttpPost("{id}/complete")]
    public async Task<IActionResult> CompleteShipment(int id)
    {
        try
        {
            var userId = GetUserId();
            var shipment = await _warehouseShipmentService.CompleteShipmentAsync(id, userId);
            return Ok(shipment);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing shipment {ShipmentId}", id);
            return StatusCode(500, new { message = "Error completing shipment" });
        }
    }

    /// <summary>
    /// Update shipment status
    /// </summary>
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateShipmentStatus(int id, [FromBody] UpdateStatusDto updateDto)
    {
        try
        {
            var userId = GetUserId();
            var shipment = await _warehouseShipmentService.UpdateShipmentStatusAsync(id, updateDto.Status, userId);
            return Ok(shipment);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating shipment {ShipmentId} status", id);
            return StatusCode(500, new { message = "Error updating shipment status" });
        }
    }

    /// <summary>
    /// Update shipment notes
    /// </summary>
    [HttpPut("{id}/notes")]
    public async Task<IActionResult> UpdateShipmentNotes(int id, [FromBody] UpdateNotesDto updateDto)
    {
        try
        {
            var userId = GetUserId();
            var shipment = await _warehouseShipmentService.UpdateShipmentNotesAsync(id, updateDto.Notes, userId);
            return Ok(shipment);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating shipment {ShipmentId} notes", id);
            return StatusCode(500, new { message = "Error updating shipment notes" });
        }
    }

    /// <summary>
    /// Get shipment analytics
    /// </summary>
    [HttpGet("analytics")]
    public async Task<IActionResult> GetShipmentAnalytics(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var analytics = await _warehouseShipmentService.GetShipmentAnalyticsAsync(startDate, endDate);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting shipment analytics");
            return StatusCode(500, new { message = "Error retrieving analytics" });
        }
    }

    /// <summary>
    /// Get shipments pending dispatch
    /// </summary>
    [HttpGet("pending-dispatch")]
    public async Task<IActionResult> GetPendingDispatchShipments()
    {
        try
        {
            var shipments = await _warehouseShipmentService.GetPendingDispatchShipmentsAsync();
            return Ok(shipments);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pending dispatch shipments");
            return StatusCode(500, new { message = "Error retrieving pending dispatch shipments" });
        }
    }

    /// <summary>
    /// Get shipments pending receive
    /// </summary>
    [HttpGet("pending-receive")]
    public async Task<IActionResult> GetPendingReceiveShipments()
    {
        try
        {
            var shipments = await _warehouseShipmentService.GetPendingReceiveShipmentsAsync();
            return Ok(shipments);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pending receive shipments");
            return StatusCode(500, new { message = "Error retrieving pending receive shipments" });
        }
    }

    private string GetUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? 
               User.FindFirst("sub")?.Value ?? 
               User.FindFirst("id")?.Value ?? 
               "system";
    }
}

// Additional DTOs for the controller
public class UpdateQuantityDto
{
    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1")]
    public int Quantity { get; set; }
}

public class UpdateStatusDto
{
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = string.Empty;
}

public class UpdateNotesDto
{
    [MaxLength(500)]
    public string Notes { get; set; } = string.Empty;
}

public class CreateWarehouseTransferRequest
{
    [Required]
    public int SourceWarehouseId { get; set; }
    
    [Required]
    public int DestinationWarehouseId { get; set; }
    
    [MaxLength(500)]
    public string? Notes { get; set; }
} 