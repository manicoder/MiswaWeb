using System.ComponentModel.DataAnnotations;
using Mlt.Admin.Api.Models;

namespace MltAdminApi.Models
{
    public class Warehouse
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [StringLength(20)]
        public string Code { get; set; } = string.Empty; // Short code like "WH001", "MLT-YMN", etc.
        
        public string? Description { get; set; }
        
        [Required]
        public string Address { get; set; } = string.Empty;
        
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
        public string? PostalCode { get; set; }
        
        public string? ContactPerson { get; set; }
        public string? ContactPhone { get; set; }
        public string? ContactEmail { get; set; }
        
        public bool IsActive { get; set; } = true;
        public bool IsDefaultSource { get; set; } = false; // Main warehouse
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public string CreatedBy { get; set; } = string.Empty;
        
        // Navigation properties
        public virtual ICollection<WarehouseShipment> SourceShipments { get; set; } = new List<WarehouseShipment>();
        public virtual ICollection<WarehouseShipment> DestinationShipments { get; set; } = new List<WarehouseShipment>();
    }
} 