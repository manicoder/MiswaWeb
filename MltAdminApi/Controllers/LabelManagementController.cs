using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Mlt.Admin.Api.Services;
using Mlt.Admin.Api.Models.DTOs;
using System.ComponentModel.DataAnnotations;

namespace Mlt.Admin.Api.Controllers;

[ApiController]
[Route("api/labels")]
[Authorize]
public class LabelManagementController : ControllerBase
{
    private readonly ILabelManagementService _labelManagementService;
    private readonly ILogger<LabelManagementController> _logger;

    public LabelManagementController(
        ILabelManagementService labelManagementService,
        ILogger<LabelManagementController> logger)
    {
        _labelManagementService = labelManagementService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetLabels()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "User ID not found"
                });
            }

            var result = await _labelManagementService.GetLabelsGroupedByCourierAsync(userId.Value);
            
            return Ok(new ApiResponse<LabelManagementResponseDto>
            {
                Success = true,
                Data = result,
                Message = "Labels retrieved successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching labels");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch labels",
                Error = ex.Message
            });
        }
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadLabel([FromForm] UploadLabelDto uploadDto)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "User ID not found"
                });
            }

            // Validate file
            if (uploadDto.File == null || uploadDto.File.Length == 0)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "No file provided"
                });
            }

            // Validate file type
            if (uploadDto.File.ContentType != "application/pdf")
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Only PDF files are allowed"
                });
            }

            // Validate file size (10MB limit)
            if (uploadDto.File.Length > 10 * 1024 * 1024)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "File size must be less than 10MB"
                });
            }

            var result = await _labelManagementService.UploadLabelAsync(uploadDto, userId.Value);
            
            return Ok(new ApiResponse<LabelDocumentDto>
            {
                Success = true,
                Data = result,
                Message = "Label uploaded successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading label");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to upload label",
                Error = ex.Message
            });
        }
    }

    [HttpGet("{labelId}/view")]
    public async Task<IActionResult> ViewLabel([FromRoute] Guid labelId)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "User ID not found"
                });
            }

            var (fileStream, fileName, contentType) = await _labelManagementService.GetLabelForDownloadAsync(labelId, userId.Value);
            if (fileStream == null || fileName == null || contentType == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Label not found"
                });
            }

            // Set headers for inline viewing (not download)
            Response.Headers.Append("Content-Disposition", $"inline; filename=\"{fileName}\"");
            return File(fileStream, contentType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error viewing label {LabelId}", labelId);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to view label",
                Error = ex.Message
            });
        }
    }

    [HttpGet("{labelId}/download")]
    public async Task<IActionResult> DownloadLabel([FromRoute] Guid labelId)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "User ID not found"
                });
            }

            var (fileStream, fileName, contentType) = await _labelManagementService.GetLabelForDownloadAsync(labelId, userId.Value);
            if (fileStream == null || fileName == null || contentType == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Label not found"
                });
            }

            return File(fileStream, contentType, fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading label {LabelId}", labelId);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to download label",
                Error = ex.Message
            });
        }
    }

    [HttpDelete("{labelId}")]
    public async Task<IActionResult> DeleteLabel([FromRoute] Guid labelId)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "User ID not found"
                });
            }

            var success = await _labelManagementService.DeleteLabelAsync(labelId, userId.Value);
            if (!success)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Label not found"
                });
            }
            
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Label deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting label {LabelId}", labelId);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to delete label",
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
            Message = "Label Management API is running",
            Data = new { timestamp = DateTime.UtcNow }
        });
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