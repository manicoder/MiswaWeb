using Microsoft.EntityFrameworkCore;
using Mlt.Admin.Api.Data;
using Mlt.Admin.Api.Models;
using Mlt.Admin.Api.Models.DTOs;

namespace Mlt.Admin.Api.Services;

public class LabelManagementService : ILabelManagementService
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _webHostEnvironment;
    private readonly ILogger<LabelManagementService> _logger;
    private readonly string _uploadsPath;

    public LabelManagementService(
        ApplicationDbContext context,
        IWebHostEnvironment webHostEnvironment,
        ILogger<LabelManagementService> logger)
    {
        _context = context;
        _webHostEnvironment = webHostEnvironment;
        _logger = logger;
        
        // Create uploads directory if it doesn't exist
        _uploadsPath = Path.Combine(_webHostEnvironment.ContentRootPath, "uploads", "labels");
        if (!Directory.Exists(_uploadsPath))
        {
            Directory.CreateDirectory(_uploadsPath);
        }
    }

    public async Task<LabelManagementResponseDto> GetLabelsGroupedByCourierAsync(Guid userId)
    {
        try
        {
            var labels = await _context.LabelDocuments
                .Where(l => l.UploadedBy == userId && !l.IsDeleted)
                .OrderByDescending(l => l.UploadedAt)
                .ToListAsync();

            var courierGroups = labels
                .GroupBy(l => l.CourierCompany)
                .Select(g => new CourierLabelGroupDto
                {
                    CourierName = g.Key,
                    LabelCount = g.Count(),
                    TotalSize = g.Sum(l => l.FileSize),
                    Labels = g.Select(l => new LabelDocumentDto
                    {
                        Id = l.Id,
                        FileName = l.FileName,
                        OriginalName = l.OriginalName,
                        FilePath = l.FilePath,
                        FileSize = l.FileSize,
                        MimeType = l.MimeType,
                        CourierCompany = l.CourierCompany,
                        UploadedAt = l.UploadedAt,
                        UploadedBy = l.UploadedBy.ToString(),
                        Description = l.Description
                    }).OrderByDescending(l => l.UploadedAt).ToList()
                })
                .OrderBy(g => g.CourierName)
                .ToList();

            return new LabelManagementResponseDto
            {
                CourierGroups = courierGroups,
                TotalLabels = labels.Count,
                TotalSize = labels.Sum(l => l.FileSize)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting labels grouped by courier for user {UserId}", userId);
            throw;
        }
    }

    public async Task<LabelDocumentDto> UploadLabelAsync(UploadLabelDto uploadDto, Guid userId)
    {
        try
        {
            // Generate unique file name
            var fileExtension = Path.GetExtension(uploadDto.File.FileName);
            var uniqueFileName = $"{Guid.NewGuid()}{fileExtension}";
            var filePath = Path.Combine(_uploadsPath, uniqueFileName);

            // Save file to disk
            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await uploadDto.File.CopyToAsync(fileStream);
            }

            // Create database record
            var labelDocument = new LabelDocument
            {
                Id = Guid.NewGuid(),
                FileName = uniqueFileName,
                OriginalName = uploadDto.File.FileName,
                FilePath = filePath,
                FileSize = uploadDto.File.Length,
                MimeType = uploadDto.File.ContentType,
                CourierCompany = uploadDto.CourierCompany,
                UploadedAt = DateTime.UtcNow,
                UploadedBy = userId,
                Description = uploadDto.Description
            };

            _context.LabelDocuments.Add(labelDocument);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Label uploaded successfully: {FileName} by user {UserId}", 
                labelDocument.OriginalName, userId);

            return new LabelDocumentDto
            {
                Id = labelDocument.Id,
                FileName = labelDocument.FileName,
                OriginalName = labelDocument.OriginalName,
                FilePath = labelDocument.FilePath,
                FileSize = labelDocument.FileSize,
                MimeType = labelDocument.MimeType,
                CourierCompany = labelDocument.CourierCompany,
                UploadedAt = labelDocument.UploadedAt,
                UploadedBy = labelDocument.UploadedBy.ToString(),
                Description = labelDocument.Description
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading label for user {UserId}", userId);
            throw;
        }
    }



    public async Task<(Stream? FileStream, string? FileName, string? ContentType)> GetLabelForDownloadAsync(Guid labelId, Guid userId)
    {
        try
        {
            var label = await _context.LabelDocuments
                .FirstOrDefaultAsync(l => l.Id == labelId && l.UploadedBy == userId && !l.IsDeleted);

            if (label == null || !File.Exists(label.FilePath))
            {
                return (null, null, null);
            }

            var fileStream = new FileStream(label.FilePath, FileMode.Open, FileAccess.Read);
            return (fileStream, label.OriginalName, label.MimeType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting label file for download {LabelId}", labelId);
            throw;
        }
    }

    public async Task<bool> DeleteLabelAsync(Guid labelId, Guid userId)
    {
        try
        {
            var label = await _context.LabelDocuments
                .FirstOrDefaultAsync(l => l.Id == labelId && l.UploadedBy == userId && !l.IsDeleted);

            if (label == null)
            {
                return false;
            }

            // Soft delete - mark as deleted instead of actually removing
            label.IsDeleted = true;
            label.DeletedAt = DateTime.UtcNow;
            label.DeletedBy = userId;

            await _context.SaveChangesAsync();

            // Optionally, delete the physical file
            if (File.Exists(label.FilePath))
            {
                try
                {
                    File.Delete(label.FilePath);
                }
                catch (Exception fileEx)
                {
                    _logger.LogWarning(fileEx, "Failed to delete physical file for label {LabelId}", labelId);
                    // Don't throw here - the database record is already marked as deleted
                }
            }

            _logger.LogInformation("Label deleted successfully: {LabelId} by user {UserId}", labelId, userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting label {LabelId}", labelId);
            throw;
        }
    }
} 