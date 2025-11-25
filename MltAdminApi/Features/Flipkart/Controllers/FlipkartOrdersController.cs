using Microsoft.AspNetCore.Mvc;
using Mlt.Admin.Api.Core.DTOs;
using Mlt.Admin.Api.Core.Entities;
using Mlt.Admin.Api.Core.Interfaces;

namespace Mlt.Admin.Api.Features.Flipkart.Controllers
{
    [ApiController]
    [Route("api/flipkart/orders")]
    public class FlipkartOrdersController : ControllerBase
    {
        private readonly IOrderService<FlipkartOrder> _orderService;
        private readonly ILogger<FlipkartOrdersController> _logger;

        public FlipkartOrdersController(
            IOrderService<FlipkartOrder> orderService,
            ILogger<FlipkartOrdersController> logger)
        {
            _orderService = orderService;
            _logger = logger;
        }

        /// <summary>
        /// Get Flipkart orders for a specific store
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
                _logger.LogError(ex, "Error getting Flipkart orders for store {StoreConnectionId}", storeConnectionId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get all Flipkart orders (without store filter) - for admin overview
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
                _logger.LogError(ex, "Error getting all Flipkart orders");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get a specific Flipkart order by ID
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
                _logger.LogError(ex, "Error getting Flipkart order {OrderId}", orderId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Sync Flipkart orders from API
        /// </summary>
        [HttpPost("sync/{storeConnectionId}")]
        public async Task<IActionResult> SyncOrders(Guid storeConnectionId)
        {
            try
            {
                var syncedCount = await _orderService.SyncOrdersAsync(storeConnectionId);
                return Ok(new { 
                    success = true, 
                    message = $"Successfully synced {syncedCount} Flipkart orders",
                    data = new { syncedCount }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing Flipkart orders for store {StoreConnectionId}", storeConnectionId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Search Flipkart orders
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
                _logger.LogError(ex, "Error searching Flipkart orders for store {StoreConnectionId}", storeConnectionId);
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
                // Flipkart-specific stats logic would go here
                // For now, return placeholder data
                var stats = new
                {
                    totalOrders = 0,
                    confirmedOrders = 0,
                    shippedOrders = 0,
                    deliveredOrders = 0,
                    totalRevenue = 0m,
                    averageOrderValue = 0m,
                    message = "Flipkart order statistics not yet implemented"
                };

                return Ok(new { success = true, data = stats });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Flipkart order stats for store {StoreConnectionId}", storeConnectionId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }
    }
} 