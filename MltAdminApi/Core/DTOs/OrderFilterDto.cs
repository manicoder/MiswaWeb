namespace Mlt.Admin.Api.Core.DTOs
{
    /// <summary>
    /// DTO for filtering orders across all platforms
    /// </summary>
    public class OrderFilterDto
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? Status { get; set; }
        public string? FulfillmentStatus { get; set; }
        public string? FinancialStatus { get; set; }
        public DateTime? CreatedAfter { get; set; }
        public DateTime? CreatedBefore { get; set; }
        public string? CustomerEmail { get; set; }
        public string? SearchQuery { get; set; }
        public decimal? MinAmount { get; set; }
        public decimal? MaxAmount { get; set; }
    }
} 