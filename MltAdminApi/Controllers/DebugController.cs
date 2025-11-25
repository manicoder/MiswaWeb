using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Mlt.Admin.Api.Data;
using Mlt.Admin.Api.Models;

namespace Mlt.Admin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class DebugController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DebugController> _logger;

    public DebugController(ApplicationDbContext context, ILogger<DebugController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet("products")]
    public async Task<IActionResult> DebugProducts()
    {
        try
        {
            // Check if there are any products in the database
            var totalProducts = await _context.ShopifyProducts.CountAsync();
            var totalStoreConnections = await _context.StoreConnections.CountAsync();
            
            // Get some sample products
            var sampleProducts = await _context.ShopifyProducts
                .Take(5)
                .Select(p => new
                {
                    id = p.ShopifyProductId,
                    title = p.Title,
                    status = p.Status,
                    storeConnectionId = p.StoreConnectionId
                })
                .ToListAsync();

            // Get store connections
            var storeConnections = await _context.StoreConnections
                .Take(5)
                .Select(sc => new
                {
                    id = sc.Id,
                    store = sc.StoreName,
                    platform = sc.Platform,
                    isActive = sc.IsActive
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = new
                {
                    totalProducts = totalProducts,
                    totalStoreConnections = totalStoreConnections,
                    sampleProducts = sampleProducts,
                    storeConnections = storeConnections,
                    message = "Debug information retrieved successfully"
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                success = false,
                error = ex.Message,
                stackTrace = ex.StackTrace
            });
        }
    }

    [HttpGet("database")]
    public async Task<IActionResult> DebugDatabase()
    {
        try
        {
            var stats = new
            {
                shopifyProducts = await _context.ShopifyProducts.CountAsync(),
                shopifyProductVariants = await _context.ShopifyProductVariants.CountAsync(),
                shopifyInventoryLevels = await _context.ShopifyInventoryLevels.CountAsync(),
                storeConnections = await _context.StoreConnections.CountAsync(),
                shopifyOrders = await _context.ShopifyOrders.CountAsync(),
                amazonOrders = await _context.AmazonOrders.CountAsync(),
                flipkartOrders = await _context.FlipkartOrders.CountAsync(),
                expenses = await _context.Expenses.CountAsync(),
                users = await _context.Users.CountAsync()
            };

            return Ok(new
            {
                success = true,
                data = stats,
                message = "Database statistics retrieved successfully"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                success = false,
                error = ex.Message,
                stackTrace = ex.StackTrace
            });
        }
    }
} 