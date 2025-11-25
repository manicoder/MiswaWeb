using Microsoft.AspNetCore.Mvc;
using Mlt.Admin.Api.Core.DTOs;
using Mlt.Admin.Api.Core.Entities;
using Mlt.Admin.Api.Core.Interfaces;

namespace Mlt.Admin.Api.Features.Amazon.Controllers
{
    [ApiController]
    [Route("api/amazon/orders")]
    public class AmazonOrdersController : ControllerBase
    {
        private readonly IOrderService<AmazonOrder> _orderService;
        private readonly ILogger<AmazonOrdersController> _logger;

        public AmazonOrdersController(
            IOrderService<AmazonOrder> orderService,
            ILogger<AmazonOrdersController> logger)
        {
            _orderService = orderService;
            _logger = logger;
        }

        /// <summary>
        /// Get Amazon orders for a specific store
        /// </summary>
        [HttpGet("{storeConnectionId}")]
        public async Task<IActionResult> GetOrders(
            Guid storeConnectionId, 
            [FromQuery] OrderFilterDto filters)
        {
            try
            {
                var orders = await _orderService.GetOrdersAsync(storeConnectionId, filters);
                return Ok(new { success = true, data = orders });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Amazon orders for store {StoreConnectionId}", storeConnectionId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get all Amazon orders (without store filter) - for admin overview
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllOrders([FromQuery] OrderFilterDto filters)
        {
            try
            {
                var orders = await _orderService.GetOrdersAsync(Guid.Empty, filters);
                return Ok(new { success = true, data = orders });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all Amazon orders");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get a specific Amazon order by ID
        /// </summary>
        [HttpGet("order/{orderId}")]
        public async Task<IActionResult> GetOrder(Guid orderId)
        {
            try
            {
                var order = await _orderService.GetOrderByIdAsync(orderId);
                if (order == null)
                    return NotFound(new { success = false, message = "Order not found" });
                
                return Ok(new { success = true, data = order });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Amazon order {OrderId}", orderId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Sync Amazon orders from API
        /// </summary>
        [HttpPost("sync/{storeConnectionId}")]
        public async Task<IActionResult> SyncOrders(Guid storeConnectionId)
        {
            try
            {
                var syncedCount = await _orderService.SyncOrdersAsync(storeConnectionId);
                return Ok(new { 
                    success = true, 
                    message = $"Successfully synced {syncedCount} Amazon orders",
                    data = new { syncedCount }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing Amazon orders for store {StoreConnectionId}", storeConnectionId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Search Amazon orders
        /// </summary>
        [HttpGet("search/{storeConnectionId}")]
        public async Task<IActionResult> SearchOrders(
            Guid storeConnectionId, 
            [FromQuery] string query)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(query))
                {
                    return BadRequest(new { success = false, message = "Search query is required" });
                }

                var orders = await _orderService.SearchOrdersAsync(storeConnectionId, query);
                return Ok(new { success = true, data = orders });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching Amazon orders for store {StoreConnectionId}", storeConnectionId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get order statistics for dashboard
        /// </summary>
        [HttpGet("stats/{storeConnectionId}")]
        public IActionResult GetOrderStats(Guid storeConnectionId)
        {
            try
            {
                // Amazon-specific stats logic would go here
                // For now, return placeholder data
                var stats = new
                {
                    totalOrders = 0,
                    pendingOrders = 0,
                    shippedOrders = 0,
                    totalRevenue = 0m,
                    averageOrderValue = 0m,
                    message = "Amazon order statistics not yet implemented"
                };

                return Ok(new { success = true, data = stats });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Amazon order stats for store {StoreConnectionId}", storeConnectionId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }
    }
} 