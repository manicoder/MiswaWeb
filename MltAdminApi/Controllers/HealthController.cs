using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Mlt.Admin.Api.Data;

namespace Mlt.Admin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<HealthController> _logger;
    private readonly IConfiguration _configuration;

    public HealthController(
        ApplicationDbContext context, 
        ILogger<HealthController> logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        try
        {
            // Test database connectivity
            await _context.Database.CanConnectAsync();

            return Ok(new
            {
                success = true,
                message = "MLT Admin .NET API is running",
                version = _configuration["AppInfo:ApiVersion"] ?? "1.0.0",
                timestamp = DateTime.UtcNow,
                database = "Connected",
                environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Health check failed");
            return StatusCode(503, new
            {
                success = false,
                message = "Service unhealthy",
                error = ex.Message,
                timestamp = DateTime.UtcNow
            });
        }
    }
    
    [HttpGet("version")]
    public IActionResult GetVersion()
    {
        return Ok(new
        {
            apiVersion = _configuration["AppInfo:ApiVersion"] ?? "1.0.0"
        });
    }
} 