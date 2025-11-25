using System.ComponentModel.DataAnnotations;
using Mlt.Admin.Api.Models.DTOs;

namespace MltAdminApi.Models.DTOs
{
    // Request DTOs
    public class CreateWarehouseRequest
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [StringLength(20)]
        public string Code { get; set; } = string.Empty;
        
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
        public bool IsDefaultSource { get; set; } = false;
    }
    
    public class UpdateWarehouseRequest
    {
        [StringLength(100)]
        public string? Name { get; set; }
        
        [StringLength(20)]
        public string? Code { get; set; }
        
        public string? Description { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
        public string? PostalCode { get; set; }
        
        public string? ContactPerson { get; set; }
        public string? ContactPhone { get; set; }
        public string? ContactEmail { get; set; }
        
        public bool? IsActive { get; set; }
        public bool? IsDefaultSource { get; set; }
    }
    
    // Response DTOs
    public class WarehouseResponse
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Address { get; set; } = string.Empty;
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
        public string? PostalCode { get; set; }
        public string? ContactPerson { get; set; }
        public string? ContactPhone { get; set; }
        public string? ContactEmail { get; set; }
        public bool IsActive { get; set; }
        public bool IsDefaultSource { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        
        // Stats
        public int TotalOutgoingShipments { get; set; }
        public int TotalIncomingShipments { get; set; }
        public int PendingDispatchShipments { get; set; }
        public int PendingReceiveShipments { get; set; }
    }
    
    public class WarehouseListResponse
    {
        public List<WarehouseResponse> Warehouses { get; set; } = new List<WarehouseResponse>();
        public int TotalCount { get; set; }
    }
    
    // Update existing WarehouseShipmentDTOs to include warehouse information
    public class CreateShipmentWithWarehousesRequest
    {
        [Required]
        public int SourceWarehouseId { get; set; }
        
        [Required]
        public int DestinationWarehouseId { get; set; }
        
        public string? Notes { get; set; }
    }
    
    public class WarehouseShipmentWithWarehousesResponse
    {
        public int Id { get; set; }
        public string ShipmentNumber { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
        
        // Warehouse Information
        public WarehouseResponse SourceWarehouse { get; set; } = null!;
        public WarehouseResponse DestinationWarehouse { get; set; } = null!;
        
        // Timestamps
        public DateTime CreatedAt { get; set; }
        public DateTime? DispatchedAt { get; set; }
        public DateTime? ReceivedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        // User tracking
        public string CreatedBy { get; set; } = string.Empty;
        public string? DispatchedBy { get; set; }
        public string? ReceivedBy { get; set; }
        
        // Items
        public List<WarehouseShipmentItemDto> Items { get; set; } = new List<WarehouseShipmentItemDto>();
        
        // Calculated totals
        public int TotalItemsCount { get; set; }
        public int TotalDispatchedCount { get; set; }
        public int TotalReceivedCount { get; set; }
        public decimal TotalValue { get; set; }
    }
    
    // Warehouse Transfer Report
    public class WarehouseTransferReportResponse
    {
        public int ShipmentId { get; set; }
        public string ShipmentNumber { get; set; } = string.Empty;
        public string SourceWarehouseName { get; set; } = string.Empty;
        public string DestinationWarehouseName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; }
        public DateTime? DispatchedAt { get; set; }
        public DateTime? ReceivedAt { get; set; }
        
        public int TotalItemsPlanned { get; set; }
        public int TotalItemsDispatched { get; set; }
        public int TotalItemsReceived { get; set; }
        public int VarianceCount { get; set; }
        public decimal TotalValue { get; set; }
        
        public List<TransferItemVariance> ItemVariances { get; set; } = new List<TransferItemVariance>();
    }
    
    public class TransferItemVariance
    {
        public string ProductBarcode { get; set; } = string.Empty;
        public string ProductTitle { get; set; } = string.Empty;
        public string? Sku { get; set; }
        public int QuantityPlanned { get; set; }
        public int QuantityDispatched { get; set; }
        public int QuantityReceived { get; set; }
        public int DispatchVariance { get; set; } // Planned vs Dispatched
        public int ReceiveVariance { get; set; } // Dispatched vs Received
    }
} 