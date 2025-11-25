using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using System.ComponentModel.DataAnnotations;

namespace Mlt.Admin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FileUploadController : ControllerBase
{
    private readonly ILogger<FileUploadController> _logger;
    private readonly IWebHostEnvironment _environment;

    public FileUploadController(ILogger<FileUploadController> logger, IWebHostEnvironment environment)
    {
        _logger = logger;
        _environment = environment;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadFile(IFormFile file, [FromForm] string type = "general")
    {
        try
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "No file provided"
                });
            }

            // Validate file size (10MB limit)
            if (file.Length > 10 * 1024 * 1024)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "File size exceeds 10MB limit"
                });
            }

            // Validate file type
            var allowedExtensions = new[] { ".pdf", ".jpg", ".jpeg", ".png" };
            var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
            
            if (!allowedExtensions.Contains(fileExtension))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed"
                });
            }

            // Create uploads directory if it doesn't exist
            var uploadsPath = Path.Combine(_environment.ContentRootPath, "uploads", type);
            if (!Directory.Exists(uploadsPath))
            {
                Directory.CreateDirectory(uploadsPath);
            }

            // Generate unique filename
            var fileName = $"{Guid.NewGuid()}{fileExtension}";
            var filePath = Path.Combine(uploadsPath, fileName);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Generate URL
            var fileUrl = $"/uploads/{type}/{fileName}";

            _logger.LogInformation("File uploaded successfully: {FileName} -> {FilePath}", file.FileName, filePath);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "File uploaded successfully",
                Data = new
                {
                    url = fileUrl,
                    filename = file.FileName,
                    size = file.Length,
                    type = file.ContentType
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to upload file",
                Error = ex.Message
            });
        }
    }

    [HttpDelete("upload")]
    public Task<IActionResult> DeleteFile([FromQuery] string url)
    {
        return Task.FromResult<IActionResult>(DeleteFileInternal(url));
    }

    private IActionResult DeleteFileInternal(string url)
    {
        try
        {
            if (string.IsNullOrEmpty(url))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "URL is required"
                });
            }

            // Remove leading slash and get file path
            var relativePath = url.TrimStart('/');
            var filePath = Path.Combine(_environment.ContentRootPath, relativePath);

            // Security check: ensure file is within uploads directory
            var uploadsPath = Path.Combine(_environment.ContentRootPath, "uploads");
            if (!filePath.StartsWith(uploadsPath))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid file path"
                });
            }

            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
                _logger.LogInformation("File deleted: {FilePath}", filePath);

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "File deleted successfully"
                });
            }
            else
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "File not found"
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to delete file",
                Error = ex.Message
            });
        }
    }

    [HttpGet("upload/info")]
    public Task<IActionResult> GetFileInfo([FromQuery] string url)
    {
        return Task.FromResult<IActionResult>(GetFileInfoInternal(url));
    }

    private IActionResult GetFileInfoInternal(string url)
    {
        try
        {
            if (string.IsNullOrEmpty(url))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "URL is required"
                });
            }

            // Remove leading slash and get file path
            var relativePath = url.TrimStart('/');
            var filePath = Path.Combine(_environment.ContentRootPath, relativePath);

            // Security check: ensure file is within uploads directory
            var uploadsPath = Path.Combine(_environment.ContentRootPath, "uploads");
            if (!filePath.StartsWith(uploadsPath))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid file path"
                });
            }

            if (System.IO.File.Exists(filePath))
            {
                var fileInfo = new FileInfo(filePath);
                var provider = new FileExtensionContentTypeProvider();
                provider.TryGetContentType(filePath, out string? contentType);

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = new
                    {
                        filename = fileInfo.Name,
                        size = fileInfo.Length,
                        type = contentType ?? "application/octet-stream",
                        created = fileInfo.CreationTime,
                        modified = fileInfo.LastWriteTime
                    }
                });
            }
            else
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "File not found"
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting file info");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to get file info",
                Error = ex.Message
            });
        }
    }
} 