using System.Net;
using System.Text.Json;

namespace Mlt.Admin.Api.Middleware;

public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;
    private readonly IWebHostEnvironment _environment;

    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger, IWebHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred during request {RequestId}", 
                context.Items["RequestId"]);
            
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var response = new ErrorResponse
        {
            Success = false,
            Message = "An error occurred while processing your request"
        };

        switch (exception)
        {
            case ArgumentNullException:
            case ArgumentException:
                response.Message = "Invalid request parameters";
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                break;
            
            case UnauthorizedAccessException:
                response.Message = "Unauthorized access";
                context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                break;
            
            case InvalidOperationException when exception.Message.Contains("Rate limited"):
                response.Message = "Too many requests. Please try again later.";
                context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
                break;
            
            default:
                response.Message = "Internal server error";
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                break;
        }

        if (_environment.IsDevelopment())
        {
            response.Error = exception.Message;
            response.StackTrace = exception.StackTrace;
        }

        var jsonResponse = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(jsonResponse);
    }
}

public class ErrorResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Error { get; set; }
    public string? StackTrace { get; set; }
} 