using Mlt.Admin.Api.Models.DTOs;

namespace Mlt.Admin.Api.Services;

public interface ILabelManagementService
{
    Task<LabelManagementResponseDto> GetLabelsGroupedByCourierAsync(Guid userId);
    Task<LabelDocumentDto> UploadLabelAsync(UploadLabelDto uploadDto, Guid userId);
    Task<(Stream? FileStream, string? FileName, string? ContentType)> GetLabelForDownloadAsync(Guid labelId, Guid userId);
    Task<bool> DeleteLabelAsync(Guid labelId, Guid userId);
} 