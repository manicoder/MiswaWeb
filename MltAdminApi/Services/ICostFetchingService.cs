using System;
using System.Threading.Tasks;

namespace Mlt.Admin.Api.Services
{
    public interface ICostFetchingService
    {
        Task<CostFetchingResult> FetchCostsForStoreAsync(Guid storeConnectionId, string? progressCallbackUrl = null);
        Task<CostFetchingProgress> GetProgressAsync(string jobId);
        Task<bool> CancelJobAsync(string jobId);
    }

    public class CostFetchingResult
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
        public int TotalVariants { get; set; }
        public int UpdatedVariants { get; set; }
        public int FailedVariants { get; set; }
        public TimeSpan Duration { get; set; }
        public string JobId { get; set; } = string.Empty;
    }

    public class CostFetchingProgress
    {
        public string JobId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // "Running", "Completed", "Failed", "Cancelled"
        public int Current { get; set; }
        public int Total { get; set; }
        public int Updated { get; set; }
        public int Failed { get; set; }
        public double Percentage => Total > 0 ? (double)Current / Total * 100 : 0;
        public string CurrentItem { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public TimeSpan? Duration => EndTime?.Subtract(StartTime);
        public string? Error { get; set; }
    }
} 