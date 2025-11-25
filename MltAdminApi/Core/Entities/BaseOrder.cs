using Mlt.Admin.Api.Core.Enums;
using Mlt.Admin.Api.Models;

namespace Mlt.Admin.Api.Core.Entities
{
    /// <summary>
    /// Base order entity that all platform-specific orders inherit from
    /// </summary>
    public abstract class BaseOrder
    {
        public Guid Id { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public decimal TotalPrice { get; set; }
        public string Currency { get; set; } = "INR";
        public string Status { get; set; } = string.Empty;
        public Platform Platform { get; set; }
        public Guid StoreConnectionId { get; set; }
        
        // Navigation properties
        public virtual StoreConnection StoreConnection { get; set; } = null!;
    }
} 